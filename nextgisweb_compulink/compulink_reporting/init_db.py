# coding=utf-8
from datetime import date
import calendar
from dateutil import relativedelta
from nextgisweb import DBSession
from nextgisweb.auth import User
from nextgisweb_compulink.compulink_reporting.common import UCN_GROUP_NAME, UCN_GROUP_ALIAS
from .model import Calendar
from nextgisweb.env import env



def init_calendar():
    print('Fill calendar...')

    db_session = DBSession()
    db_session.autoflush = False

    count = db_session.query(Calendar).count()
    if count != 0:
        print '     Calendar is not empty! Returning...'
        return

    start_date = date(2014, 1, 1)
    max_date = date(2025, 1, 1)

    active_date = start_date

    quarter_names = {
        1: u'1 кв.',
        2: u'2 кв.',
        3: u'3 кв.',
        4: u'4 кв.',
    }

    month_names = {
        1: u'Январь',
        2: u'Февраль',
        3: u'Март',
        4: u'Апрель',
        5: u'Май',
        6: u'Июнь',
        7: u'Июль',
        8: u'Август',
        9: u'Сентябрь',
        10: u'Октябрь',
        11: u'Ноябрь',
        12: u'Декабрь',
    }

    week_day_names = {
        1: u'Понедельник',
        2: u'Вторник',
        3: u'Среда',
        4: u'Четверг',
        5: u'Пятница',
        6: u'Суббота',
        7: u'Воскресенье',
    }

    week_day_short_names = {
        1: u'Пн',
        2: u'Вт',
        3: u'Ср',
        4: u'Чт',
        5: u'Пт',
        6: u'Сб',
        7: u'Вс',
    }

    relat_day = relativedelta.relativedelta(days=+1)

    while active_date < max_date:
        cal = Calendar()
        cal.full_date = active_date
        cal.year_number = active_date.year
        cal.semester_number = 1 if active_date.month<7 else 2
        cal.semester_name = u'1 полугодие'  if active_date.month<7 else u'2 полугодие'
        cal.quarter_number = (active_date.month-1)//3 + 1
        cal.quarter_name = quarter_names[cal.quarter_number]
        cal.month_number = active_date.month
        cal.month_name = month_names[active_date.month]
        cal.year_week_number = active_date.isocalendar()[1]
        cal.month_week_number = get_week_of_month(active_date)
        cal.month_decade_number = (active_date.day < 11) * 1 + \
                                  (11 <= active_date.day <= 20) * 2 + \
                                  (active_date.day > 20) * 3
        cal.year_day_number = active_date.timetuple().tm_yday
        cal.month_day_number = active_date.day
        cal.week_day_number = active_date.weekday() + 1
        cal.week_day_name = week_day_names[cal.week_day_number]
        cal.week_day_short_name = week_day_short_names[cal.week_day_number]
        cal.weekend = cal.week_day_number > 5

        cal.persist()
        active_date = active_date + relat_day

    db_session.flush()


def get_week_of_month(any_date):
    weeks = calendar.monthcalendar(any_date.year, any_date.month)
    for w in weeks:
        if any_date.day in w:
            return weeks.index(w) + 1


def init_ucn_group():
    print('Create user group for UCN reports...')

    db_session = DBSession()


    try:
        adm_user = db_session.query(User).filter(User.keyname == 'administrator').one()
        users = [adm_user]
    except:
        print ('User Administrator not found!')
        users = []

    # create group if not exists
    env.auth.initialize_group(UCN_GROUP_NAME, UCN_GROUP_ALIAS, members=users)

