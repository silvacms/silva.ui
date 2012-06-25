
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
            '<img height="16" width="16" src="http://localhost/root/++static++/silva.icons/silvageneric.gif" alt="default" />')
        self.assertEqual(
            resolver.get_tag(),
            '<img height="16" width="16" src="http://localhost/root/++static++/silva.icons/missing.png" alt="Missing" />')


def test_suite():
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(IconTestCase))
    return suite
