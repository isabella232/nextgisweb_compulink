import uuid
from sqlalchemy import Column
import transaction
from nextgisweb import DBSession
from nextgisweb.feature_layer import FIELD_TYPE
from nextgisweb.vector_layer.model import VectorLayerField, VectorLayer, _FIELD_TYPE_2_DB

__author__ = 'yellow'


class VectorLayerUpdater(object):

    @staticmethod
    def change_field_display_name(resource, field_keyname, new_displayname, make_transaction=False):

        if not isinstance(resource, VectorLayer):
            raise Exception('Unsupported resource type!')

        if field_keyname not in [field.keyname for field in resource.fields]:
            raise Exception('Field does not exists in the table!')

        #start transaction
        if make_transaction:
            transaction.manager.begin()

        for field in resource.fields:
            if field.keyname == field_keyname:
                field.display_name = new_displayname

        #close transaction
        if make_transaction:
            transaction.manager.commit()
        else:
            db_session = DBSession()
            db_session.flush()


    @staticmethod
    def append_field(resource, field_keyname, field_type, field_display_name, field_grid_vis=True, make_transaction=False):

        if not isinstance(resource, VectorLayer):
            raise Exception('Unsupported resource type!')

        if field_type not in FIELD_TYPE.enum:
            raise Exception('Unsupported field type!')

        if field_keyname in [field.keyname for field in resource.fields]:
            raise Exception('Field already exists in the table!')

        #start transaction
        if make_transaction:
            transaction.manager.begin()

        #create uuid for field
        uid = str(uuid.uuid4().hex)

        #create column
        VectorLayerUpdater.__create_column(resource.tbl_uuid, uid, _FIELD_TYPE_2_DB[field_type])

        #add field to register
        vfl = VectorLayerField()
        vfl.keyname = field_keyname
        vfl.datatype = field_type
        vfl.display_name = field_display_name
        vfl.grid_visibility = field_grid_vis
        vfl.fld_uuid = uid

        resource.fields.append(vfl)

        #close transaction
        if make_transaction:
            transaction.manager.commit()
        else:
            db_session = DBSession()
            db_session.flush()



    @staticmethod
    def __create_column(table_uid, field_uid, field_type):
        db_session = DBSession()
        engine = db_session.get_bind()

        column = Column('fld_%s' % field_uid, field_type)
        column_name = column.compile(dialect=engine.dialect)
        column_type = column.type.compile(engine.dialect)
        engine.execute('ALTER TABLE "vector_layer"."layer_%s" ADD COLUMN %s %s' % (table_uid, column_name, column_type))
