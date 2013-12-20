# -*- coding: utf-8 -*-
# Copyright (c) 2012-2013 Infrae. All rights reserved.
# See also LICENSE.txt
from setuptools import setup, find_packages
import os

version = '3.0.3'

tests_require = [
    'Products.Silva [test]',
    ]

setup(name='silva.ui',
      version=version,
      description="Components for the user-interface to manage Silva CMS",
      long_description=open("README.txt").read() + "\n" +
                       open(os.path.join("docs", "HISTORY.txt")).read(),
      classifiers=[
        "Programming Language :: Python",
        ],
      keywords='silva management interface SMI',
      author='Infrae',
      author_email='info@infrae.com',
      url='https://github.com/silvacms/silva.ui',
      license='BSD',
      package_dir={'': 'src'},
      packages=find_packages('src'),
      namespace_packages=['silva'],
      include_package_data=True,
      zip_safe=True,
      install_requires=[
        'Products.SilvaMetadata',
        'fanstatic > 0.11',
        'five.grok',
        'grokcore.component',
        'grokcore.layout',
        'grokcore.view',
        'infrae.comethods',
        'infrae.rest >= 1.1',
        'js.jquery',
        'martian',
        'grokcore.chameleon',
        'megrok.pagetemplate',
        'setuptools',
        'silva.core.cache',
        'silva.core.conf',
        'silva.core.interfaces',
        'silva.core.layout',
        'silva.core.messages',
        'silva.core.services',
        'silva.core.views',
        'silva.fanstatic',
        'silva.translations',
        'zeam.component',
        'zeam.jsontemplate',
        'zeam.utils.batch >= 1.0',
        'zope.cachedescriptors',
        'zope.component',
        'zope.i18n',
        'zope.interface',
        'zope.intid',
        'zope.lifecycleevent',
        'zope.publisher',
        'zope.schema',
        'zope.traversing',
        'zope.pagetemplate',
      ],
      entry_points="""
      [silva.ui.resources]
      smi = silva.ui.interfaces:ISilvaUI
      """,
      tests_require = tests_require,
      extras_require = {'test': tests_require},
      )
