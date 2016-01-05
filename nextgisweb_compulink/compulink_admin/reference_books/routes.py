from views import pages, regions, districts


def initialize(config):
    config.add_route(
        'compulink_admin.reference_books.region',
        '/compulink/admin/reference_books/region').add_view(pages.get_region_page)
    config.add_route(
        'compulink_admin.services.reference_books.region.get',
        'compulink/services/reference_books/region/').add_view(regions.get_regions)
    config.add_route(
        'compulink_admin.services.reference_books.region.get_one',
        'compulink/services/reference_books/region/{id}').add_view(regions.get_region)
    config.add_route(
        'compulink_admin.reference_books.district',
        '/compulink/admin/reference_books/district').add_view(pages.get_district_page)
    config.add_route(
        'compulink_admin.services.reference_books.district.get',
        'compulink/services/reference_books/district/').add_view(districts.get_districts)
    config.add_route(
        'compulink_admin.reference_books.project',
        '/compulink/admin/reference_books/project').add_view(pages.get_project_page)
    config.add_route(
        'compulink_admin.reference_books.construct_object',
        '/compulink/admin/reference_books/construct_object').add_view(pages.get_construct_object_page)