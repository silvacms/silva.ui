from setuptools import setup, find_packages
import os

version = '1.0dev'

setup(name='silva.ui',
      version=version,
      description="Management interface for Silva",
      long_description=open("README.txt").read() + "\n" +
                       open(os.path.join("docs", "HISTORY.txt")).read(),
      # Get more strings from http://pypi.python.org/pypi?%3Aaction=list_classifiers
      classifiers=[
        "Programming Language :: Python",
        ],
      keywords='silva management interface SMI',
      author='Infrae',
      author_email='info@infrae.com',
      url='',
      license='BSD',
      package_dir={'': 'src'},
      packages=find_packages('src'),
      namespace_packages=['silva'],
      include_package_data=True,
      zip_safe=True,
      install_requires=[
          'fanstatic',
          'five.grok',
          'infrae.rest',
          'setuptools',
          'silva.core.interfaces',
          'silva.core.views',
          'silva.translations',
          'zope.interface',
          'zope.component',
          'zope.i18n',
      ],
      entry_points="""
      # -*- Entry points: -*-
      [silva.ui.resources]
      smi = silva.ui.interfaces:ISilvaUI
      """,
      )
