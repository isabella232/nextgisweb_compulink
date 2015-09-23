__author__ = 'yellow'
import pyproj
from functools import partial
from shapely.ops import transform


class TransformUtils:
    lonlat = pyproj.Proj(init="epsg:4326")
    sphmerc = pyproj.Proj(init="epsg:3857")

    _project_wgs_spher = partial(pyproj.transform, lonlat, sphmerc)
    _project_spher_wgs = partial(pyproj.transform, sphmerc, lonlat)

    @classmethod
    def to_wgs84(cls, geom_3857):
        return transform(cls._project_spher_wgs, geom_3857)

    @classmethod
    def to_spher(cls, geom_wgs84):
        return transform(cls._project_wgs_spher, geom_wgs84)


class DistanceUtils:
    geod_wgs84 = pyproj.Geod(ellps="WGS84")

    @classmethod
    def get_spherical_distance(cls, point_1, point_2):
        '''
        Get real distance on the sphere for coordinates in EPSG:3857 projection
        :param point_1: first point
        :param point_2: second point
        :return: distance in meters
        '''
        wgs_pt1 = TransformUtils.to_wgs84(point_1)
        wgs_pt2 = TransformUtils.to_wgs84(point_2)

        az, raz, dist = cls.geod_wgs84.inv(*(wgs_pt1.x, wgs_pt1.y, wgs_pt2.x, wgs_pt2.y))

        return dist




