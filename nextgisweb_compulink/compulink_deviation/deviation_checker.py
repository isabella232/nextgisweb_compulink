# coding=utf-8
import transaction

from nextgisweb import DBSession
from nextgisweb.env import env

from nextgisweb_compulink.compulink_admin.model import FoclStruct
from nextgisweb_compulink.compulink_deviation.model import ConstructDeviation

__author__ = 'yellow'

PROCESSING_LAYER_TYPES = {
    'special_transition': u'Спецпереход',
    'optical_cable': u'Трасса ВОЛС',
    'fosc': u'Оптическая муфта',
    'optical_cross': u'Оптический кросс',
    'access_point': u'Точка доступа'
}

class DeviationChecker:


    @classmethod
    def run(cls):

        ngw_session = DBSession()
        transaction.manager.begin()

        deviation_distance = env.compulink_deviation.settings.get('deviation_distance')

        if not deviation_distance:
            raise AssertionError('Set deviation_distance in config!')
        try:
            deviation_distance = int(deviation_distance)
        except:
            raise AssertionError('Set correct value for deviation_distance in config ! (Need int)')

        # get all focls
        fs_resources = ngw_session.query(FoclStruct).all()

        for fs in fs_resources:
            # get counts features in project layers
            project_layers = {}
            for layer in fs.children:
                layer_type = cls.get_layer_type(layer)
                if layer_type in PROCESSING_LAYER_TYPES.keys():
                    obj_count = cls.get_feat_count(layer)
                    if obj_count > 0:
                        project_layers[layer_type] = obj_count

            if sum(project_layers.values()) > 0:
                # real check
                for layer_type, count in project_layers.items():
                    proj_layer = cls.get_layer_by_type(fs.children, layer_type)
                    actual_layer = cls.get_layer_by_type(fs.children, 'actual_real_' + layer_type)

                    #proj_features = cls.get_features(proj_layer)
                    actual_features = cls.get_features(actual_layer)

                    for feat in actual_features:
                        #if feat.fields['is_deviation'] == 1:
                        #    continue

                        min_dist = cls.nearest_feat_dist(feat, proj_layer)
                        if min_dist > deviation_distance:
                            # write to layer
                            feat.fields['is_deviation'] = 1
                            feat.fields['deviation_distance'] = min_dist
                            feat.layer.feature_put(feat)

                            # write to table
                            deviation = ConstructDeviation()
                            deviation.deviation_distance = min_dist
                            deviation.focl_res_id = fs.id
                            deviation.focl_name = fs.display_name
                            deviation.focl_proj = cls.get_proj_name(fs)
                            deviation.object_type = layer_type
                            deviation.object_num = feat.id
                            ngw_session.add(deviation)

        transaction.manager.commit()

    @classmethod
    def get_proj_name(cls, fs):
        names = []
        res = fs.parent
        while res:
            names.append(res.display_name)
            res = res.parent
        names.reverse()
        names = names[1:]
        return '\\'.join(names)

    @classmethod
    def get_layer_type(cls, layer):
        if layer.keyname and '_' in layer.keyname:
            return '_'.join(layer.keyname.rsplit('_')[:-1])
        else:
            return None

    @classmethod
    def get_layer_by_type(cls, focl_struct, lyr_type):
        lyrs = [lyr for lyr in focl_struct if lyr.keyname and '_'.join(lyr.keyname.rsplit('_')[:-1]) == lyr_type]
        lyr = lyrs[0] if len(lyrs) else None
        return lyr

    @classmethod
    def get_feat_count(cls, layer):
        return layer.feature_query()().total_count

    @classmethod
    def get_features(cls, layer):
        q = layer.feature_query()
        q.geom()
        return list(q())

    @classmethod
    def nearest_feat_dist(cls, feat, feat_lyr):
        orig_dist = feat.geom
        q = feat_lyr.feature_query()
        q.distance_to(orig_dist)
        features = q()

        return min([f.calculations['distance_to'] for f in features])

