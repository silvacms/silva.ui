from setuptools import setup, find_packages
import os

version = '1.0dev'

tests_require = [
    'Products.Silva [test]',
    ]

setup(name='silva.ui',
      version=version,
      description="Management interface for Silva",
      long_description=open("README.txt").read() + "\n" +
                       open(os.path.join("docs", "HISTORY.txt")).read(),
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
          'fanstatic > 0.11',
          'js.jquery_jgrowl',
          'five.grok',
          'infrae.comethods',
          'infrae.rest',
          'megrok.chameleon',
          'setuptools',
          'silva.core.conf',
          'silva.core.interfaces',
          'silva.core.services',
          'silva.core.views',
          'silva.translations',
          'zope.component',
          'zope.i18n',
          'zope.interface',
      ],
      entry_points="""
      [silva.ui.resources]
      smi = silva.ui.interfaces:ISilvaUI
      """,
      tests_require = tests_require,
      extras_require = {'test': tests_require},
      )
