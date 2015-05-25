# coding=utf-8
from sqlalchemy import (
    Column,
    Integer,
    Text,
    Float, Date, Boolean, Numeric, and_)

from . import Base
from sqlalchemy.orm import relationship


class Project(Base):
    __tablename__ = 'Projects'
    ProjectID = Column(Integer, primary_key=True)
    ProjectName = Column(Text)
    #ProjectManager = Relation (ProjectManagerId)

class Employer(Base):
    __tablename__ = 'Employees'
    EmployeeID = Column(Integer, primary_key=True)
    EmployeeName = Column(Text)

class Contractor(Base):
    __tablename__ = 'Contractors'
    ContractorID = Column(Integer, primary_key=True)
    ContractorName = Column(Text)

class ObjectWork(Base):
    __tablename__ = 'ObjectWorks'
    ObjectID = Column(Integer, primary_key=True)
    WorkID = Column(Integer, primary_key=True)
    AgreementStartDateWork = Column(Date)
    AgreementFinishDateWork = Column(Date)
    SubcontractorID = Column(Integer)
    SubContractor = relationship(Contractor,
                                 foreign_keys=[SubcontractorID, ],
                                 primaryjoin=SubcontractorID == Contractor.ContractorID,
                                 lazy='joined')


class ConstructObjects(Base):
    __tablename__ = 'ConstructObjects'
    ObjectID = Column(Integer, primary_key=True)
    ProjectID = Column(Integer, primary_key=True)
    ObjectName = Column(Text)
    LocalityName = Column(Text)
    AccessPointAmount = Column(Integer)
    PreliminaryLineLength = Column(Numeric(asdecimal=False))
    DesignLineLength = Column(Numeric(asdecimal=False))
    ActualLineLength = Column(Numeric(asdecimal=False))
    IsLineConstructRequired = Column(Boolean)
    LinePointA = Column(Text)
    LinePointB = Column(Text)

    Work3 = relationship(ObjectWork, foreign_keys=[ObjectID, ], primaryjoin=and_(ObjectID == ObjectWork.ObjectID, ObjectWork.WorkID == 3))
    Work4 = relationship(ObjectWork, foreign_keys=[ObjectID, ], primaryjoin=and_(ObjectID == ObjectWork.ObjectID, ObjectWork.WorkID == 4))