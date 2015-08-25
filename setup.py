from setuptools import setup, find_packages

version = '0.1'

requires = (
    'nextgisweb',
    'nextgisweb_rekod',
    'nextgisweb_lookuptable',
    'nextgisweb_mapserver',
    'nextgisweb_mobile_debug',
    'nextgisweb_log',
    'lxml',
    'shapely',
    'transaction',
    'sqlalchemy',
    'pymssql',
    'openpyxl'
)

entry_points = {
    'nextgisweb.packages': [
        'nextgisweb_compulink = nextgisweb_compulink:pkginfo',
    ],

    'nextgisweb.amd_packages': [
        'nextgisweb_compulink = nextgisweb_compulink:amd_packages',
    ],

}

setup(
    name='nextgisweb_compulink',
    version=version,
    description="",
    long_description="",
    classifiers=[],
    keywords='',
    author='',
    author_email='',
    url='',
    license='',
    packages=find_packages(exclude=['ez_setup', 'examples', 'tests']),
    include_package_data=True,
    zip_safe=False,
    install_requires=requires,
    entry_points=entry_points, requires=requires
)
