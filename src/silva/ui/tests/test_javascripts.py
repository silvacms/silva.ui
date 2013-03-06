# -*- coding: utf-8 -*-
# Copyright (c) 2012-2013 Infrae. All rights reserved.
# See also LICENSE.txt

import unittest

from ..interfaces import ISilvaUIDependencies
from Products.Silva.testing import FunctionalLayer, suite_from_package


def create_test(build_test_suite, name):
    test = build_test_suite(name)
    test.sources = ISilvaUIDependencies
    test.layer = FunctionalLayer
    return test


def test_suite():
    suite = unittest.TestSuite()
    suite.addTest(suite_from_package('silva.ui.tests.javascripts', create_test))
    return suite

