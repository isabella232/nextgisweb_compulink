from datetime import datetime
from nextgisweb import DBSession

import numpy as np
from shapely.geometry import MultiLineString
import transaction

from nextgisweb_compulink.compulink_data_reactor.reactors.abstract_reactor import AbstractReactor
from nextgisweb_compulink.compulink_data_reactor import COMP_ID
from nextgisweb.feature_layer import Feature
from nextgisweb.vector_layer import TableInfo
from nextgisweb_compulink.compulink_admin.model import FoclStruct
from nextgisweb_compulink.compulink_data_reactor.utils import DistanceUtils
from nextgisweb_log.model import LogEntry

try:
    from .rconnector import RSOM1d as SOM1d
    CONNECTOR_NAME = 'R Connector'
except:
    from .connector import SOM1d
    CONNECTOR_NAME = 'Python Connector'

__author__ = 'yellow'

@AbstractReactor.registry.register
class ConstructFoclLineReactor(AbstractReactor):
    identity = 'construct_line'
    priority = 1

    # Max distance of point in segment
    DISTANCE_LIMIT = 350

    log_info = staticmethod(lambda x: LogEntry.info(x, component=COMP_ID, group=ConstructFoclLineReactor.identity, append_dt=datetime.now()))
    log_debug = staticmethod(lambda x: LogEntry.debug(x, component=COMP_ID, group=ConstructFoclLineReactor.identity, append_dt=datetime.now()))
    log_warning = staticmethod(lambda x: LogEntry.warning(x, component=COMP_ID, group=ConstructFoclLineReactor.identity, append_dt=datetime.now()))

    @classmethod
    def run(cls, env):

        db_session = DBSession()
        transaction.manager.begin()

        cls.log_info('ConstructFoclLineReactor started! (%s)' % CONNECTOR_NAME)

        fs_resources = db_session.query(FoclStruct).all()
        for fs in fs_resources:
            cls.construct_line(fs)
            db_session.flush()

        cls.log_info('ConstructFoclLineReactor finished!')
        transaction.manager.commit()


    @classmethod
    def construct_line(cls, focl_struct_resource):
        # Output layer
        lines_lyr = [lyr for lyr in focl_struct_resource.children if lyr.keyname and
                     not lyr.keyname.startswith('actual_real_optical_cable_point') and
                     lyr.keyname.startswith('actual_real_optical_cable')]
        lines_lyr = lines_lyr[0] if len(lines_lyr) else None


        # Collect features for processing
        features = []
        processing_layers_name = ['actual_real_optical_cable_point',
                                  'actual_real_special_transition_point',
                                  'actual_real_fosc',
                                  'actual_real_optical_cross',
                                  'actual_real_access_point']

        for lyr_name in processing_layers_name:
            points_lyr = [lyr for lyr in focl_struct_resource.children if lyr.keyname and lyr.keyname.startswith(lyr_name)]
            points_lyr = points_lyr[0] if len(points_lyr) else None

            if points_lyr:
                query = points_lyr.feature_query()
                query.geom()
                result = query()
                features.extend([feature for feature in result])


        if len(features) > 0:
            cls.log_debug('Construct line for %s started!' % focl_struct_resource.display_name)
        else:
            cls.log_debug('Construct line for %s skeeped (no points)!' % focl_struct_resource.display_name)
            return

        #clear line lyr
        cls.clear_layer(lines_lyr)

        #get clusters
        clusters = cls.get_clusters(features)

        #merge points in clusters
        for cluster in clusters:
            if len(cluster) < 2:
                cls.log_warning('Line %s has unclustered point!')
                continue
            if len(cluster) == 2:
                # construct segment
                points = tuple(feat.geom[0].coords[0] for feat in cluster)
                # write segment
                info = cls.get_segment_info(points, cluster)
                cls.write_segment(lines_lyr, points, cluster, info)
            if len(cluster) > 2:
                line = cls.make_line(cluster)
                # write segments
                for i in range(len(line[0])-1):
                    points = (line[0][i], line[0][i+1])
                    info = cls.get_segment_info(points, cluster)
                    cls.write_segment(lines_lyr, points, cluster, info)



    @classmethod
    def get_clusters(cls, features):

        def get_feats_in_radius(center_feat, all_feats):
            geom_1 = center_feat.geom
            res_feats = []

            # get all in radius
            for m_feat in all_feats:
                geom_2 = m_feat.geom
                real_dist = DistanceUtils.get_spherical_distance(geom_1[0], geom_2[0])
                if real_dist < cls.DISTANCE_LIMIT:
                    res_feats.append(m_feat)

            # remove from common list
            for rem_feat in res_feats:
                all_feats.remove(rem_feat)

            # for all searched points recursive search
            rec_feats = []
            for r_feat in res_feats:
                searched_feats = get_feats_in_radius(r_feat, all_feats)
                rec_feats.extend(searched_feats)

            # add to total list
            res_feats.extend(rec_feats)

            return res_feats

        clusters = []

        while len(features) > 0:
            start_feat = features[0]
            features.remove(start_feat)

            clust = get_feats_in_radius(start_feat, features)
            clust.append(start_feat)  # append self

            clusters.append(clust)


        return clusters

    @classmethod
    def make_line(cls, cluster):
        # NGW geoms to np
        points = [feat.geom[0].coords[0] for feat in cluster]
        data = np.array(points)

        #conn = MST(data)
        #result = conn.connect()

        som = SOM1d(data)
        result = som.connect()

        #np to NGW
        #res_lines = []
        #for line in result:
        #    res_lines.append(LineString(line))
        #return res_lines[0]

        return result

    @classmethod
    def clear_layer(cls, layer):
        tableinfo = TableInfo.from_layer(layer)
        tableinfo.setup_metadata(tablename=layer._tablename)
        DBSession.query(tableinfo.model).delete()

    @classmethod
    def write_segment(cls, layer, segment_points, cluster, info):
        #print 'Write segmet: %s' % str(segment_points)
        feature = Feature(fields=info, geom=MultiLineString([segment_points]))
        feature_id = layer.feature_create(feature)


    @classmethod
    def get_segment_info(cls, segment_points, cluster):
        #print 'Get segmet info: %s' % str(segment_points)

        # get features by coord
        feature_points = []
        for segment_point in segment_points:
            for feature in cluster:
                feat_coords = feature.geom[0].coords[0]
                if segment_point[0] == feat_coords[0] and segment_point[1] == feat_coords[1]:
                    feature_points.append(feature)

        # get laying_method
        laying_methods = []
        field_name = 'laying_method'
        for feat in feature_points:
            if field_name in feat.fields and feat.fields[field_name] and feat.fields[field_name] not in laying_methods:
                laying_methods.append(feat.fields[field_name])

        if laying_methods:
            order = ['transmission_towers', 'ground', 'canalization', 'building', 'other']

            for selected_lay_met in order:
                if selected_lay_met in laying_methods:
                    laying_method = selected_lay_met
                    break
            # set first
            if not laying_method:
                laying_method = laying_methods[0]
        else:
            laying_method = None

        # get built_date
        built_date = feature_points[0].fields['built_date']
        for feat in feature_points:
            if not built_date and feat.fields['built_date']:
                built_date = feat.fields['built_date']
            elif (feat.fields['built_date'] and built_date) and feat.fields['built_date'] > built_date:
                built_date = feat.fields['built_date']

        return {'laying_method': laying_method, 'built_date': built_date}
