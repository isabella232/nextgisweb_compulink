from datetime import datetime
from nextgisweb import DBSession

from shapely.geometry import MultiLineString
import transaction

from nextgisweb_compulink.compulink_data_reactor.reactors.abstract_reactor import AbstractReactor
from nextgisweb_compulink.compulink_data_reactor import COMP_ID
from nextgisweb.feature_layer import Feature
from nextgisweb.vector_layer import TableInfo
from nextgisweb_compulink.compulink_admin.model import FoclStruct
from ...utils import DistanceUtils
from nextgisweb_log.model import LogEntry
__author__ = 'yellow'

@AbstractReactor.registry.register
class ConstructSpecTransitionLineReactor(AbstractReactor):
    identity = 'construct_spec_transition_line'
    priority = 2

    # Max len of spec transition
    DISTANCE_LIMIT = 300

    @classmethod
    def run(cls, env):

        log_info = lambda x: LogEntry.info(x, component=COMP_ID, group=ConstructSpecTransitionLineReactor.identity, append_dt=datetime.now())
        log_debug = lambda x: LogEntry.debug(x, component=COMP_ID, group=ConstructSpecTransitionLineReactor.identity, append_dt=datetime.now())
        log_warning = lambda x: LogEntry.warning(x, component=COMP_ID, group=ConstructSpecTransitionLineReactor.identity, append_dt=datetime.now())

        db_session = DBSession()
        transaction.manager.begin()

        log_info('ConstructSpecTransitionLineReactor started!')

        fs_resources = db_session.query(FoclStruct).all()
        for fs in fs_resources:
            points_lyr = [lyr for lyr in fs.children if lyr.keyname and lyr.keyname.startswith('actual_real_special_transition_point')]
            points_lyr = points_lyr[0] if len(points_lyr) else None

            lines_lyr = [lyr for lyr in fs.children if lyr.keyname and
                         not lyr.keyname.startswith('actual_real_special_transition_point') and
                         lyr.keyname.startswith('actual_real_special_transition')]
            lines_lyr = lines_lyr[0] if len(lines_lyr) else None

            query = points_lyr.feature_query()
            query.geom()
            result = query()

            if result.total_count > 0:
                log_debug('Construct spec_trans line for %s started!' % fs.display_name)
            else:
                log_debug('Construct spec_trans line for %s skeeped (no points)!' % fs.display_name)
                continue

            starts = []
            ends = []
            for feature in result:
                if feature.fields['special_laying_number'] == 'entrance':
                    starts.append(feature)
                else:
                    ends.append(feature)

            if len(starts) != len(ends):
                log_warning('Line %s has unpaired count of start\end points! (%s\%s)' % (fs.display_name, len(starts), len(ends)))

            #clear line lyr
            cls.clear_layer(lines_lyr)

            #merge points in two mass
            for start_point_feat in starts:
                if len(ends) < 1:
                    continue

                # get near point
                near_point_feat = ends[0]
                near_len = start_point_feat.geom.distance(near_point_feat.geom)
                for end_point_feat in ends:
                    if start_point_feat.geom.distance(end_point_feat.geom) < near_len:
                        near_point_feat = end_point_feat
                        near_len = start_point_feat.geom.distance(end_point_feat.geom)

                # check distance limit
                real_dist = DistanceUtils.get_spherical_distance(start_point_feat.geom[0], near_point_feat.geom[0])
                if real_dist > cls.DISTANCE_LIMIT:
                    log_warning('Point %s has no paired points near that maximum distance!' % start_point_feat.id)
                    continue

                # construct line
                line_feats = [start_point_feat, near_point_feat]
                info = cls.get_segment_info(line_feats)
                cls.write_segment(lines_lyr, line_feats, info)

                # remove from ends
                ends.remove(near_point_feat)

            db_session.flush()

        log_info('ConstructSpecTransitionLineReactor finished!')

        transaction.manager.commit()
  
    @classmethod
    def clear_layer(cls, layer):
        tableinfo = TableInfo.from_layer(layer)
        tableinfo.setup_metadata(tablename=layer._tablename)
        DBSession.query(tableinfo.model).delete()

    @classmethod
    def write_segment(cls, layer, line_feats, info):
        points = [feat.geom[0].coords[0] for feat in line_feats]
        feature = Feature(fields=info, geom=MultiLineString([points]))
        feature_id = layer.feature_create(feature)


    @classmethod
    def get_segment_info(cls, features):

        # get laying_method
        laying_methods = []
        for feat in features:
            if feat.fields['special_laying_method'] and feat.fields['special_laying_method'] not in laying_methods:
                laying_methods.append(feat.fields['special_laying_method'])

        if laying_methods:
            order = ['hdd', 'towers', 'bottom']

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
        built_date = features[0].fields['built_date']
        for feat in features:
            if feat.fields['built_date'] > built_date:
                built_date = feat.fields['built_date']

        return {'special_laying_method': laying_method, 'built_date': built_date}