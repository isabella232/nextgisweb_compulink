def initialize(config):
    config.add_route(
        'compulink_admin.reference_books.get_page',
        'compulink/admin/reference_books/{reference_book_type}')
    config.add_route(
        'compulink_admin.services.reference_books.get_items',
        'compulink/services/reference_books/{reference_book_type}/')
    config.add_route(
        'compulink_admin.services.reference_books.item_handler',
        'compulink/services/reference_books/{reference_book_type}/{id}')
    config.scan('nextgisweb_compulink.compulink_admin.reference_books.views.ReferenceBooksView')