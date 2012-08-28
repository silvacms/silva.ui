
import unittest
import os

from . import BusterTestCase
from ..interfaces import ISilvaUIDependencies
from Products.Silva.testing import FunctionalLayer

PATH = os.path.join(os.path.dirname(__file__), 'javascripts')


def test_suite():
    suite = unittest.TestSuite()
    test = BusterTestCase(
        filename=os.path.join(PATH, 'infrae.interfaces.js'),
        layer=ISilvaUIDependencies)
    test.layer = FunctionalLayer
    suite.addTest(test)
    return suite

