# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from Acquisition import aq_parent
from Products.Silva.testing import FunctionalLayer, assertTriggersEvents
from Products.Silva.testing import TestRequest
from zope.component import getUtility
from zope.intid.interfaces import IIntIds

from silva.core.cache.memcacheutils import Reset
from silva.core.interfaces import IContainer
from silva.core.interfaces import IPublishable, INonPublishable
from silva.ui.rest.invalidation import Invalidation, get_interfaces

import unittest
import transaction


class SimpleTransaction(object):

    def __enter__(self):
        transaction.abort()
        transaction.begin()

    def __exit__(self, t, v, tb):
        if v is None and not transaction.isDoomed():
            transaction.commit()
        else:
            transaction.abort()


class InvalidationTestCase(unittest.TestCase):
    layer = FunctionalLayer
    maxDiff = None

    def setUp(self):
        with Reset():
            with SimpleTransaction():
                self.root = self.layer.get_application()
                self.layer.login('editor')
                self.get_id = getUtility(IIntIds).register

    def test_listing_interfaces(self):
        self.assertEqual(
            get_interfaces(),
            [('containers', IContainer, 'publishables'),
             ('publishables', IPublishable, 'publishables'),
             ('assets', INonPublishable, 'assets')])

    def test_nothing(self):
        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(invalidation.get_cookie_path(), '/root')
        self.assertEqual(list(invalidation.get_changes()), [])
        self.assertEqual(request.response.cookies, {})

        # This didn't change.
        self.assertEqual(list(invalidation.get_changes()), [])

    def test_transaction_failed(self):
        with self.assertRaises(ValueError):
            with SimpleTransaction():
                factory = self.root.manage_addProduct['Silva']
                factory.manage_addFolder('folder', 'Folder')
                raise ValueError

        # No changes where recorded since the transaction failed.
        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(invalidation.get_cookie_path(), '/root')
        self.assertEqual(list(invalidation.get_changes()), [])
        self.assertEqual(request.response.cookies, {})

        # This didn't change.
        self.assertEqual(list(invalidation.get_changes()), [])

    def test_delete_content(self):
        with Reset():
            with SimpleTransaction():
                factory = self.root.manage_addProduct['Silva']
                factory.manage_addFolder('folder', 'Folder')
                factory = self.root.folder.manage_addProduct['Silva']
                factory.manage_addMockupVersionedContent('document', 'Document')

        with SimpleTransaction():
            document_id = self.get_id(self.root.folder.document)
            self.root.folder.manage_delObjects(['document'])

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        self.assertEqual(
            list(invalidation.get_changes()),
            [{'action': 'remove',
              'container': self.get_id(self.root.folder),
              'content': document_id,
              'listing': 'publishables',
              'interface': 'publishables',
              },
             {'action': 'update',
              'container': self.get_id(self.root),
              'content': self.get_id(self.root.folder),
              'listing': 'publishables',
              'interface': 'containers',
              'position': 1}])
        # A cookie is set (still)
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '1'}})

    def test_delete_asset(self):
        with Reset():
            with SimpleTransaction():
                factory = self.root.manage_addProduct['Silva']
                factory.manage_addFolder('folder', 'Folder')
                factory = self.root.folder.manage_addProduct['Silva']
                factory.manage_addFile('data_file', 'Data File')

        with SimpleTransaction():
            file_id = self.get_id(self.root.folder.data_file)
            self.root.folder.manage_delObjects(['data_file'])

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        self.assertEqual(
            list(invalidation.get_changes()),
            [{'action': 'remove',
              'container': self.get_id(self.root.folder),
              'content': file_id,
              'listing': 'assets',
              'interface': 'assets'},
             {'action': 'update',
              'container': self.get_id(self.root),
              'content': self.get_id(self.root.folder),
              'listing': 'publishables',
              'interface': 'containers',
              'position': 1}])
        # A cookie is set (still)
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '1'}})

    def test_rename_content(self):
        with Reset():
            with SimpleTransaction():
                factory = self.root.manage_addProduct['Silva']
                factory.manage_addFolder('folder', 'Folder')
                factory = self.root.folder.manage_addProduct['Silva']
                factory.manage_addMockupVersionedContent('padding', 'Padding')
                factory.manage_addMockupVersionedContent('document', 'Document')

        with SimpleTransaction():
            self.root.folder.manage_renameObject('document', 'stuff')

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        # We should have two update changes
        self.assertEqual(
            list(invalidation.get_changes()),
            [{'action': 'update',
              'container': self.get_id(self.root.folder),
              'content': self.get_id(self.root.folder.stuff),
              'listing': 'publishables',
              'interface': 'publishables',
              'position': 2},
             {'action': 'update',
              'container': self.get_id(self.root),
              'content': self.get_id(self.root.folder),
              'listing': 'publishables',
              'interface': 'containers',
              'position': 1}])
        # A cookie is set (still)
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '1'}})

    def test_add_content(self):
        with SimpleTransaction():
            factory = self.root.manage_addProduct['Silva']
            factory.manage_addFolder('folder', 'Folder')

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        self.assertEqual(
            list(invalidation.get_changes()),
            [{'action': 'add',
              'listing': 'publishables',
              'interface': 'containers',
              'container': self.get_id(self.root),
              'content': self.get_id(self.root.folder),
              'position': -1},  # XXX Position should 1
             {'action': 'update',
              'listing': 'publishables',
              'interface': 'containers',
              'container': self.get_id(aq_parent(self.root)),
              'content': self.get_id(self.root),
              'position': -1}])
        # A cookie is set
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '2'}})

        # Now if we ask the next changes, there are none
        request = TestRequest()
        request.cookies = {'silva.listing.invalidation': '2'}
        invalidation = Invalidation(request)
        self.assertEqual(list(invalidation.get_changes()), [])

    def test_add_asset(self):
        with SimpleTransaction():
            factory = self.root.manage_addProduct['Silva']
            factory.manage_addFile('examples_txt', 'Examples')

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        self.assertEqual(
            list(invalidation.get_changes()),
            [{'action': 'add',
              'interface': 'assets',
              'listing': 'assets',
              'container': self.get_id(self.root),
              'content': self.get_id(self.root.examples_txt),
              'position': -1},
             {'action': 'update',
              'interface': 'containers',
              'listing': 'publishables',
              'container': self.get_id(aq_parent(self.root)),
              'content': self.get_id(self.root),
              'position': -1}])
        # A cookie is set
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '2'}})

        # Now if we ask the next changes, there are none
        request = TestRequest()
        request.cookies = {'silva.listing.invalidation': '2'}
        invalidation = Invalidation(request)
        self.assertEqual(list(invalidation.get_changes()), [])

    def test_add_modify_content(self):
        with Reset():
            with SimpleTransaction():
                factory = self.root.manage_addProduct['Silva']
                factory.manage_addFolder('padding', 'Padding Folder')
                factory.manage_addFolder('folder', 'Folder')

        with SimpleTransaction():
            factory = self.root.folder.manage_addProduct['Silva']
            factory.manage_addMockupVersionedContent('document', 'Document')

            content = self.root.folder.document

            with assertTriggersEvents('MetadataModifiedEvent'):
                content.set_title('New document')

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        self.assertEqual(
            list(invalidation.get_changes()),
            [{'action': 'add',
              'listing': 'publishables',
              'interface': 'publishables',
              'container': self.get_id(self.root.folder),
              'content': self.get_id(content),
              'position': -1},
             {'action': 'update',
              'container': self.get_id(self.root),
              'content': self.get_id(self.root.folder),
              'listing': 'publishables',
              'interface': 'containers',
              'position': 2}])
        # A cookie is set
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '4'}})

    def test_add_delete_content(self):
        with Reset():
            with SimpleTransaction():
                factory = self.root.manage_addProduct['Silva']
                factory.manage_addFolder('padding', 'Padding Folder')
                factory.manage_addFolder('folder', 'Folder')

        with SimpleTransaction():
            factory = self.root.folder.manage_addProduct['Silva']
            factory.manage_addMockupVersionedContent('document', 'Document')
            self.root.folder.manage_delObjects(['document'])

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        # Since the document have added and deleted, we only see an
        # update in the folder
        self.assertEqual(list(invalidation.get_changes()), [
                {'action': 'update',
                 'container': self.get_id(self.root),
                 'content': self.get_id(self.root.folder),
                 'listing': 'publishables',
                 'interface': 'containers',
                 'position': 2}])
        # A cookie is set (still)
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '5'}})

    def test_modify_delete_content(self):
        with Reset():
            with SimpleTransaction():
                factory = self.root.manage_addProduct['Silva']
                factory.manage_addFolder('folder', 'Folder')
                factory = self.root.folder.manage_addProduct['Silva']
                factory.manage_addMockupVersionedContent('document', 'Document')

        with SimpleTransaction():
            content = self.root.folder.document
            content_id = self.get_id(content)

            with assertTriggersEvents('MetadataModifiedEvent'):
                content.set_title('New document')
            self.root.folder.manage_delObjects(['document'])

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        self.assertEqual(
            list(invalidation.get_changes()),
            [{'action': 'remove',
              'listing': 'publishables',
              'interface': 'publishables',
              'container': self.get_id(self.root.folder),
              'content': content_id},
             {'action': 'update',
              'container': self.get_id(self.root),
              'content': self.get_id(self.root.folder),
              'listing': 'publishables',
              'interface': 'containers',
              'position': 1},])
        # A cookie is set
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '2'}})

    def test_modify_delete_asset(self):
        with Reset():
            with SimpleTransaction():
                factory = self.root.manage_addProduct['Silva']
                factory.manage_addFolder('folder', 'Folder')
                factory = self.root.folder.manage_addProduct['Silva']
                factory.manage_addImage('image', 'Data Image')

        with SimpleTransaction():
            image = self.root.folder.image
            image_id = self.get_id(image)

            with assertTriggersEvents('MetadataModifiedEvent'):
                image.set_title('New Image')
            self.root.folder.manage_delObjects(['image'])

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        self.assertEqual(
            list(invalidation.get_changes()),
            [{'action': 'remove',
              'listing': 'assets',
              'interface': 'assets',
              'container': self.get_id(self.root.folder),
              'content': image_id},
             {'action': 'update',
              'container': self.get_id(self.root),
              'content': self.get_id(self.root.folder),
              'listing': 'publishables',
              'interface': 'containers',
              'position': 1},])
        # A cookie is set
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '2'}})

    def test_modify_delete_folder(self):
        with Reset():
            with SimpleTransaction():
                factory = self.root.manage_addProduct['Silva']
                factory.manage_addFolder('folder', 'Folder')
                factory = self.root.folder.manage_addProduct['Silva']
                factory.manage_addMockupVersionedContent('document', 'Document')

        with SimpleTransaction():
            factory.manage_addImage('image', 'Image')
            with assertTriggersEvents('MetadataModifiedEvent'):
                self.root.folder.document.set_title('New document')

            folder_id = self.get_id(self.root.folder)
            document_id = self.get_id(self.root.folder.document)
            self.root.manage_delObjects(['folder'])

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        # In case of a container delete, all event inside the
        # containers must not appear, except delete of previous content.
        self.assertEqual(
            list(invalidation.get_changes()),
            [{'action': 'remove',
              'listing': 'publishables',
              'interface': 'publishables',
              'container': folder_id,
              'content': document_id},
             {'action': 'remove',
              'listing': 'publishables',
              'interface': 'containers',
              'container': self.get_id(self.root),
              'content': folder_id},
             {'action': 'update',
              'listing': 'publishables',
              'interface': 'containers',
              'container': self.get_id(aq_parent(self.root)),
              'content': self.get_id(self.root),
              'position': -1}])
        # A cookie is set
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '7'}})

    def test_title_title_content(self):
        with Reset():
            with SimpleTransaction():
                factory = self.root.manage_addProduct['Silva']
                factory.manage_addFolder('folder', 'Folder')
                factory = self.root.folder.manage_addProduct['Silva']
                factory.manage_addMockupVersionedContent('document', 'Document')

        with SimpleTransaction():
            content = self.root.folder.document

            with assertTriggersEvents('MetadataModifiedEvent'):
                content.set_title('New document')
            with assertTriggersEvents('MetadataModifiedEvent'):
                content.get_editable().set_title('Outdated Document')

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        self.assertEqual(
            list(invalidation.get_changes()),
            [{'action': 'update',
              'listing': 'publishables',
              'interface': 'publishables',
              'container': self.get_id(self.root.folder),
              'content': self.get_id(content),
              'position': 1}])
        # A cookie is set
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '1'}})

    def test_title_title_asset(self):
        with Reset():
            with SimpleTransaction():
                factory = self.root.manage_addProduct['Silva']
                factory.manage_addFolder('folder', 'Folder')
                factory = self.root.folder.manage_addProduct['Silva']
                factory.manage_addFile('data_file', 'Data file')

        with SimpleTransaction():
            data_file = self.root.folder.data_file

            with assertTriggersEvents('MetadataModifiedEvent'):
                data_file.set_title('New Data File')
            with assertTriggersEvents('MetadataModifiedEvent'):
                data_file.set_title('New File')

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        self.assertEqual(
            list(invalidation.get_changes()),
            [{'action': 'update',
              'listing': 'assets',
              'interface': 'assets',
              'container': self.get_id(self.root.folder),
              'content': self.get_id(data_file),
              'position': -1}])
        # A cookie is set
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '1'}})

    def test_modify_modify_asset(self):
        with Reset():
            with SimpleTransaction():
                factory = self.root.manage_addProduct['Silva']
                factory.manage_addFolder('folder', 'Folder')
                factory = self.root.folder.manage_addProduct['Silva']
                factory.manage_addFile('data_file', 'Data file')

        with SimpleTransaction():
            data_file = self.root.folder.data_file

            with assertTriggersEvents('ObjectModifiedEvent'):
                data_file.set_text('Edit content')
            with assertTriggersEvents('ObjectModifiedEvent'):
                data_file.set_text('Actually, edit again the content')
            with assertTriggersEvents('ObjectModifiedEvent'):
                data_file.set_text('I am not sure at all')

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        self.assertEqual(
            list(invalidation.get_changes()),
            [{'action': 'update',
              'listing': 'assets',
              'interface': 'assets',
              'container': self.get_id(self.root.folder),
              'content': self.get_id(data_file),
              'position': -1}])
        # A cookie is set
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '2'}})

    def test_filter_func(self):
        with Reset():
            with SimpleTransaction():
                factory = self.root.manage_addProduct['Silva']
                factory.manage_addFolder('folder', 'Folder')
                factory = self.root.folder.manage_addProduct['Silva']
                factory.manage_addImage('image', 'Image')

        with SimpleTransaction():
            factory.manage_addMockupVersionedContent('document', 'Document')
            factory.manage_addFolder('images', 'Image Folder')
            factory.manage_addPublication('publication', 'Publication')
            self.root.folder.publication.set_title('Maybe not')
            self.root.folder.manage_delObjects(['image', 'publication'])

        request = TestRequest()
        invalidation = Invalidation(request)
        self.assertEqual(request.cookies, {})
        # We ask only changes about container.
        self.assertEqual(
            list(invalidation.get_changes(
                    filter_func=lambda c: c['interface'] == 'containers')),
            [{'action': 'update',
              'listing': 'publishables',
              'interface': 'containers',
              'container': self.get_id(self.root),
              'content': self.get_id(self.root.folder),
              'position': 1},
             {'action': 'add',
              'listing': 'publishables',
              'interface': 'containers',
              'container': self.get_id(self.root.folder),
              'content': self.get_id(self.root.folder.images),
              'position': -1}])
        # A cookie is set
        self.assertEqual(
            request.response.cookies,
            {'silva.listing.invalidation': {'path': '/root', 'value': '13'}})


def test_suite():
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(InvalidationTestCase))
    return suite
