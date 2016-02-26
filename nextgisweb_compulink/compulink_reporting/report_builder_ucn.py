import itertools

import transaction

from nextgisweb import DBSession as NgwSession
from nextgisweb_compulink.compulink_admin.model import FoclStruct
from nextgisweb_compulink.compulink_reporting.model import BuiltAccessPoint, BuiltCable, BuiltFosc, BuiltOpticalCross, BuiltSpecTransition, \
    FoscType, CableLayingMethod, SpecLayingMethod, OpticalCrossType, AccessPointType, Calendar


class ReportBuilderUcn():

    @classmethod
    def run(cls):
        db_session = NgwSession()
        transaction.manager.begin()

        # clear all data from tables
        for table in [BuiltFosc, BuiltCable, BuiltOpticalCross, BuiltAccessPoint, BuiltSpecTransition]:
            db_session.query(table).delete()
        db_session.flush()

        # get dicts
        fosc_types = {x.type: x for x in db_session.query(FoscType).all()}
        cable_laying_methods = {x.method: x for x in db_session.query(CableLayingMethod).all()}
        optical_cross_types = {x.type: x for x in db_session.query(OpticalCrossType).all()}
        ap_types = {x.type: x for x in db_session.query(AccessPointType).all()}
        spec_laying_methods = {x.method: x for x in db_session.query(SpecLayingMethod).all()}


        # get all focls
        fs_resources = db_session.query(FoclStruct).all()

        for fs in fs_resources:

            # fosc handler
            fact_lyr = cls.get_layer_by_type(fs, 'actual_real_fosc')
            if fact_lyr:
                # get all rows and aggregate
                fosc_values = []
                query = fact_lyr.feature_query()
                for feat in query():
                    if feat.fields['built_date']:
                        fosc_values.append((feat.fields['built_date'].date(), feat.fields['type_fosc']))

                fosc_aggregation = {k: len(list(g)) for k, g in itertools.groupby(sorted(fosc_values))}

                # save to table
                for (build_dt, fs_type), count in fosc_aggregation.iteritems():
                    row = BuiltFosc()
                    row.resource_id = fs.id
                    row.fosc_count = count

                    if fs_type:
                        if fs_type not in fosc_types.keys():
                            ot = FoscType()
                            ot.type = fs_type
                            ot.persist()
                            fosc_types[fs_type] = ot
                        row.fosc_type = fosc_types[fs_type]

                    row.build_date = db_session.query(Calendar).filter(Calendar.full_date==build_dt).one()
                    row.persist()

                db_session.flush()


            # cross handler
            fact_lyr = cls.get_layer_by_type(fs, 'actual_real_optical_cross')
            if fact_lyr:
                # get all rows and aggregate
                cross_values = []
                query = fact_lyr.feature_query()
                for feat in query():
                    if feat.fields['built_date']:
                        cross_values.append((feat.fields['built_date'].date(), feat.fields['type_optical_cross']))

                cross_aggregation = {k: len(list(g)) for k, g in itertools.groupby(sorted(cross_values))}

                # save to table
                for (build_dt, cross_type), count in cross_aggregation.iteritems():
                    row = BuiltOpticalCross()
                    row.resource_id = fs.id
                    row.optical_cross_count = count

                    if cross_type:
                        if cross_type not in optical_cross_types.keys():
                            ot = OpticalCrossType()
                            ot.type = cross_type
                            ot.persist()
                            optical_cross_types[cross_type] = ot
                        row.optical_cross_type = optical_cross_types[cross_type]

                    row.build_date = db_session.query(Calendar).filter(Calendar.full_date==build_dt).one()
                    row.persist()

                db_session.flush()

            # ap handler
            fact_lyr = cls.get_layer_by_type(fs, 'actual_real_access_point')
            if fact_lyr:
                # get all rows and aggregate
                ap_values = []
                query = fact_lyr.feature_query()
                for feat in query():
                    if feat.fields['built_date']:
                        ap_values.append((feat.fields['built_date'].date(), None))

                ap_aggregation = {k: len(list(g)) for k, g in itertools.groupby(sorted(ap_values))}

                # save to table
                for (build_dt, ap_type), count in ap_aggregation.iteritems():
                    row = BuiltAccessPoint()
                    row.resource_id = fs.id
                    row.access_point_count = count

                    if ap_type:
                        if ap_type not in ap_types.keys():
                            apt = AccessPointType()
                            apt.type = ap_type
                            apt.persist()
                            ap_types[ap_type] = apt
                        row.access_point_type = ap_types[ap_type]

                    row.build_date = db_session.query(Calendar).filter(Calendar.full_date==build_dt).one()
                    row.persist()

                db_session.flush()

            # cabling handler
            fact_lyr = cls.get_layer_by_type(fs, 'actual_real_optical_cable')
            if fact_lyr:
                # get all rows and aggregate
                cable_values = []
                query = fact_lyr.feature_query()
                query.geom_length()
                for feat in query():
                    if feat.fields['built_date']:
                        cable_values.append((feat.fields['built_date'].date(), feat.fields['laying_method'], feat.calculations['geom_len']))

                cable_aggregation = {k: sum(x[2] for x in list(g)) for k, g in itertools.groupby(sorted(cable_values), key=lambda x: (x[0], x[1]))}

                # save to table
                for (build_dt, lay_meth), cable_len in cable_aggregation.iteritems():
                    row = BuiltCable()
                    row.resource_id = fs.id
                    row.cable_length = round(cable_len/1000.0, 3) if cable_len else 0

                    if lay_meth:
                        if lay_meth not in cable_laying_methods.keys():
                            lm = CableLayingMethod()
                            lm.method = lay_meth
                            lm.persist()
                            cable_laying_methods[lay_meth] = lm
                        row.laying_method = cable_laying_methods[lay_meth]

                    row.build_date = db_session.query(Calendar).filter(Calendar.full_date==build_dt).one()
                    row.persist()

                db_session.flush()

            # spec trans handler
            fact_lyr = cls.get_layer_by_type(fs, 'actual_real_special_transition')
            if fact_lyr:
                # get all rows and aggregate
                spec_trans_values = []
                query = fact_lyr.feature_query()
                query.geom_length()
                for feat in query():
                    if feat.fields['built_date']:
                        spec_trans_values.append((feat.fields['built_date'].date(), feat.fields['special_laying_method'], feat.calculations['geom_len']))

                spec_trans_aggregation = {k: list(g) for k, g in itertools.groupby(sorted(spec_trans_values), key=lambda x: (x[0], x[1]))}

                # save to table
                for (build_dt, spec_lay_meth), specs in spec_trans_aggregation.iteritems():
                    row = BuiltSpecTransition()
                    row.resource_id = fs.id
                    length = sum(x[2] for x in specs)
                    row.spec_trans_length = round(length/1000.0, 3) if length else 0
                    row.spec_trans_count = len(specs)

                    if spec_lay_meth:
                        if spec_lay_meth not in spec_laying_methods.keys():
                            slm = SpecLayingMethod()
                            slm.method = spec_lay_meth
                            slm.persist()
                            spec_laying_methods[spec_lay_meth] = slm
                        row.spec_laying_method = spec_laying_methods[spec_lay_meth]

                    row.build_date = db_session.query(Calendar).filter(Calendar.full_date==build_dt).one()
                    row.persist()

                db_session.flush()

        transaction.manager.commit()

    @classmethod
    def get_layer_by_type(cls, focl_struct, lyr_type):
        lyrs = [lyr for lyr in focl_struct.children if lyr.keyname and '_'.join(lyr.keyname.rsplit('_')[:-1]) == lyr_type]
        lyr = lyrs[0] if len(lyrs) else None
        return lyr
