# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from silva.ui.rest.container.generator import ContentGenerator
from zope.component import getUtility
from zope.intid.interfaces import IIntIds
from Products.Silva.testing import FunctionalLayer
import unittest


class GeneratorTestCase(unittest.TestCase):
    layer = FunctionalLayer

    def setUp(self):
        self.root = self.layer.get_application()
        factory = self.root.manage_addProduct['Silva']
        factory.manage_addMockupVersionedContent('document1', 'Document 1')
        factory.manage_addMockupVersionedContent('document2', 'Document 2')
        self.get_id = getUtility(IIntIds).register

    def test_none(self):
        messages = []
        with ContentGenerator(lambda m, **o: messages.append(m)) as generator:
            contents = list(generator(None))
            self.assertEqual(contents, [])
        self.assertEqual(messages, [])

    def test_one(self):
        messages = []
        with ContentGenerator(lambda m, **o: messages.append(m)) as generator:
            contents = list(generator(self.get_id(self.root.document1)))
            self.assertEqual(
                contents,
                [self.root.document1])
        self.assertEqual(messages, [])

    def test_multiple(self):
        messages = []
        with ContentGenerator(lambda m, **o: messages.append(m)) as generator:
            contents = list(generator([
                        self.get_id(self.root.document1),
                        self.get_id(self.root.document2)]))
            self.assertEqual(
                contents,
                [self.root.document1, self.root.document2])
        self.assertEqual(messages, [])

    def test_invalid(self):
        messages = []
        with ContentGenerator(lambda m, **o: messages.append(m)) as generator:
            contents = list(generator([
                        'oups',
                        self.get_id(self.root.document1)]))
            self.assertEqual(contents, [self.root.document1])
        self.assertNotEqual(messages, [])
        self.assertEqual(len(messages), 1)


def test_suite():
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(GeneratorTestCase))
    return suite
