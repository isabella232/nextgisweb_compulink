from geoalchemy import GeometryColumn, Point, MultiLineString, functions
from sqlalchemy import create_engine, Column, Unicode, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import (
    scoped_session,
    sessionmaker,
)

Base = declarative_base()

class Adm(Base):
    __tablename__ = 'boundary_polygon'
    ogc_fid = Column(Integer, primary_key=True)
    osm_id = Column(Integer)
    name = Column(Unicode)
    adm_lvl = Column(Unicode)
    geom = GeometryColumn(Point(2))

class Road(Base):
    __tablename__ = 'highway_line'
    ogc_fid = Column(Integer, primary_key=True)
    osm_id = Column(Integer)
    name = Column(Unicode)
    geom = GeometryColumn(MultiLineString(2))

    ref = Column(Unicode)
    highway = Column(Unicode)
    oneway = Column(Unicode)
    bridge = Column(Unicode)
    tunnel = Column(Unicode)
    maxspeed = Column(Unicode)
    lanes = Column(Unicode)
    width = Column(Unicode)
    surface = Column(Unicode)



class OsmDataSource():

    def __init__(self, conn_str):
        '''
        :param conn_str: 'postgresql://gis:password@localhost/gis'
        :return:
        '''
        engine = create_engine(conn_str)
        Base.metadata.bind = engine
        Session = sessionmaker(bind=engine)
        self.session = Session()

    def GetRegions(self, country_id):
        russia_select = self.session.query(Adm.geom).filter(Adm.ogc_fid == country_id)
        regions = self.session.query(Adm).filter(Adm.adm_lvl == '4').filter(Adm.geom.within(russia_select)).all()
        return regions

    def GetDistricts(self, region_id):
        region_select = self.session.query(Adm.geom).filter(Adm.ogc_fid == region_id)
        districts = self.session.query(Adm).filter(Adm.adm_lvl == '6').filter(Adm.geom.within(region_select)).all()
        return districts

    def GetRoads(self, district_id):
        district_select = self.session.query(Adm.geom).filter(Adm.ogc_fid == district_id)
        roads = self.session.query(Road).filter(Road.geom.within(district_select)).all()
        return roads

    def GetPoints(self, district_id):
        district_select = self.session.query(Adm.geom).filter(Adm.ogc_fid == district_id)
        points = self.session.query(functions.centroid(Adm.geom)).filter(Adm.adm_lvl == '10').filter(functions.centroid(Adm.geom).within(district_select)).all()
        return points

