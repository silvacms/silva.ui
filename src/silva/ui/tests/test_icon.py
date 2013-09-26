# -*- coding: utf-8 -*-
# Copyright (c) 2012-2013 Infrae. All rights reserved.
# See also LICENSE.txt

import unittest

from zope.component import queryAdapter
from zope.interface.verify import verifyObject

from silva.core.interfaces.adapters import IIconResolver
from silva.ui.interfaces import ISilvaUITheme

from Products.Silva.testing import FunctionalLayer, TestRequest


class IconTestCase(unittest.TestCase):
    layer = FunctionalLayer

    def setUp(self):
        self.root = self.layer.get_application()
        self.layer.login('author')

    def test_icon_resolver(self):
        """Test adapter to retrieve icon urls'.
        """
        request = TestRequest(layers=[ISilvaUITheme])
        resolver = queryAdapter(request, IIconResolver)
        self.assertTrue(verifyObject(IIconResolver, resolver))

        # Class are return instead of URLs for a direct access to the sprite.
        self.assertEqual(
            resolver.get_content_url(self.root),
            'silva_root')
        self.assertEqual(
            resolver.get_content_url(None),
            'http://localhost/root/++static++/silva.icons/missing.png')
        self.assertEqual(
            resolver.get_identifier_url('Silva Root'),
            'silva_root')
        self.assertEqual(
            resolver.get_identifier_url(None),
            'http://localhost/root/++static++/silva.icons/missing.png')
        self.assertEqual(
            resolver.get_identifier_url('best content in the world'),
            'http://localhost/root/++static++/silva.icons/generic.png')

    def test_icon_tag(self):
        """SMI skin define a custom policy for icon.
        """
        request = TestRequest(layers=[ISilvaUITheme])
        resolver = queryAdapter(request, IIconResolver)
        self.assertTrue(verifyObject(IIconResolver, resolver))

        self.assertEqual(
            resolver.get_tag(self.root),
            '<ins class="icon silva_root"></ins>')
        self.assertEqual(
            resolver.get_tag(content=self.root),
            '<ins class="icon silva_root"></ins>')
        self.assertEqual(
            resolver.get_tag(identifier='Silva Root'),
            '<ins class="icon silva_root"></ins>')
        self.assertEqual(
            resolver.get_tag(identifier='default'),
            '<img height="16" width="16" src="http://localhost/root/++static++/silva.icons/generic.png" alt="default" />')
        self.assertEqual(
            resolver.get_tag(),
            '<img height="16" width="16" src="http://localhost/root/++static++/silva.icons/missing.png" alt="Missing" />')


def test_suite():
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(IconTestCase))
    return suite
