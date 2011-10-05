# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from infrae import rest
from megrok.chameleon.components import ChameleonPageTemplate
from zope.component import getUtility
from zope.intid.interfaces import IIntIds

from silva.core.interfaces import IContainer, ISilvaObject
from silva.core.interfaces import IPublishable, INonPublishable
from silva.core.interfaces import IVersionedContent
from silva.core.interfaces.adapters import IIconResolver
from silva.core.messages.interfaces import IMessageService
from silva.core.services.utils import walk_silva_tree
from silva.translations import translate as _
from silva.ui.rest.base import ActionREST
from silva.ui.rest.base import UIREST
from silva.ui.rest.invalidation import Invalidation
from silva.ui.rest.helpers import ContentNotifier, ContentGenerator

from AccessControl import getSecurityManager
from Products.SilvaMetadata.interfaces import IMetadataService


CONTENT_IFACES = [
    (IVersionedContent, 'versioned'),
    (IContainer, 'container'),
    (INonPublishable, 'asset'),
    (ISilvaObject, 'content')]



class TemplateContainerListing(rest.REST):
    grok.context(IContainer)
    grok.name('silva.ui.listing.template')
    grok.require('silva.ReadSilvaContent')

    template = ChameleonPageTemplate(filename="templates/listing.cpt")

    def default_namespace(self):
        return {}

    def namespace(self):
        return {'rest': self}

    def GET(self):
        return self.template.render(self)


class ListingPreview(rest.REST):
    grok.baseclass()
    grok.name('silva.ui.listing.preview')
    grok.require('silva.ReadSilvaContent')

    def preview(self):
        raise NotImplementedError

    def GET(self):
        return self.json_response({
            'title': self.context.get_title_or_id(),
            'preview': self.preview()
            })


class TemplateToolbarContainerListing(rest.REST):
    grok.context(IContainer)
    grok.name('silva.ui.listing.template.toolbar')
    grok.require('silva.ReadSilvaContent')

    template = ChameleonPageTemplate(filename="templates/listingtoolbar.cpt")

    def default_namespace(self):
        return {}

    def namespace(self):
        return {'rest': self}

    def GET(self):
        return self.template.render(self)


icon_width = 26
pubstate_width = 32
goto_width = 88
move_width = 26


class ColumnsContainerListing(UIREST):
    grok.context(IContainer)
    grok.name('silva.ui.listing.configuration')
    grok.require('silva.ReadSilvaContent')

    def GET(self):
        return self.json_response({
                'ifaces': {'content': ['object'],
                           'asset': ['content', 'object'],
                           'container': ['content', 'object'],
                           'versioned': ['content', 'object']},
                'listing': [
                    {'name': 'publishables',
                     'layout': {'fixed': {0:icon_width, 1:pubstate_width, 6:goto_width, 7:move_width}},
                     'columns': [
                            {'name': 'icon',
                             'view': 'action-icon',
                             'action': 'content'},
                            {'name': 'status',
                             'view': 'workflow'},
                            {'name': 'identifier',
                             'caption': self.translate(_(u'Identifier')),
                             'view': 'text',
                             'renameable': {'item_not_match': {'access': ['write'],
                                                               'status': ['published']}},
                             'filterable': True},
                            {'name': 'title',
                             'caption': self.translate(_(u'Title')),
                             'view': 'text',
                             'renameable': {'item_not_match': {'access': ['write'],
                                                               'status': ['published']}},
                             'filterable': True},
                            {'name': 'modified',
                             'caption': self.translate(_(u'Modified')),
                             'view': 'text'},
                            {'name': 'author',
                             'caption': self.translate(_(u'Author')),
                             'view': 'text'},
                            {'view': 'goto',
                             'index': {'screen': 'content',
                                       'caption': self.translate(_(u"Go to"))},
                             'menu': [{'screen': 'preview',
                                       'caption': self.translate(_(u"Preview"))},
                                      {'screen': 'properties',
                                       'caption': self.translate(_(u"Properties")),
                                       'item_match': {'access': ['manage', 'publish', 'write']}},
                                      {'screen': 'publish',
                                       'caption': self.translate(_(u"Publish")),
                                       'item_implements': 'versioned',
                                       'item_match': {'access': ['manage', 'publish']}},
                                      {'screen': 'settings/access',
                                       'caption': self.translate(_(u"Access")),
                                       'item_implements': 'container',
                                       'item_match': {'access': ['manage']}},
                                      ]},
                            {'view': 'move',
                             'name': 'moveable'}],
                     'sortable':
                         {'content_match': {'access': ['manage', 'publish', 'write']},
                          'action': 'order'},
                     'collapsed': False},
                    {'name': 'assets',
                     'layout': {'fixed': {0:icon_width, 1:pubstate_width, 6:goto_width, 7:move_width}},
                     'columns': [
                            {'name': 'icon',
                             'view': 'action-icon',
                             'action': 'content'},
                            {'view': None},
                            {'name': 'identifier',
                             'caption': self.translate(_(u'Identifier')),
                             'view': 'text',
                             'renameable': True,
                             'filterable': True},
                            {'name': 'title',
                             'caption': self.translate(_(u'Title')),
                             'view': 'text',
                             'renameable': True,
                             'filterable': True},
                            {'name': 'modified',
                             'caption': self.translate(_(u'Modified')),
                             'view': 'text'},
                            {'name': 'author',
                             'caption': self.translate(_(u'Author')),
                             'view': 'text'},
                            {'view': 'goto',
                             'index': {'screen': 'content',
                                       'caption': self.translate(_(u"Go to"))},
                             'menu': [{'screen': 'preview',
                                       'caption': self.translate(_(u"Preview"))},
                                      {'screen': 'properties',
                                       'caption': self.translate(_(u"Properties")),
                                       'item_match': {'access': ['manage', 'publish', 'write']}},
                                      ]},
                            {'view': None}],
                     'collapsed': True},],
                'actions': [
                    {'available': {'input_mode': True},
                     'actions': [
                            {'title': self.translate(_(u'Cancel')),
                             'icon': 'close',
                             'order': 5,
                             'action': {'input_mode': False},
                             'accesskey': ['ctrl+z', 'esc'],
                             'iface': ['content']},
                            {'title': self.translate(_(u'Save')),
                             'icon': 'check',
                             'order': 10,
                             'action': {'input_mode': True},
                             'accesskey': ['ctrl+s',],
                             'iface': ['content']},
                            ]},
                    {'available': {'input_mode': False},
                     'actions': [
                            {'title': self.translate(_(u'Cut')),
                             'icon': 'scissors',
                             'accesskey': ['ctrl+x'],
                             'order': 5,
                             'action':
                                 {'cut': True},
                             'available':
                                 {'content_match':
                                      {'access': ['manage', 'publish', 'write']},
                                  'min_items': 1},
                             'ifaces': ['content']},
                            {'title': self.translate(_(u'Copy')),
                             'icon': 'copy',
                             'accesskey': ['ctrl+c'],
                             'order': 6,
                             'action':
                                 {'copy': True},
                             'available':
                                 {'min_items': 1},
                             'ifaces': ['content']},
                            {'title': None,
                             'order': 7,
                             'available':
                                 {'content_match':
                                      {'access': ['manage', 'publish', 'write']},
                                  'clipboard_min_items': 1},
                             'actions': [
                                    {'title': self.translate(_(u'Paste')),
                                     'icon': 'clipboard',
                                     'accesskey': ['ctrl+v'],
                                     'order': 10,
                                     'action':
                                         {'rest':
                                              {'action': 'paste',
                                               'send': 'clipboard_ids'}},
                                     'ifaces': ['object']},
                                    {'title': self.translate(_(u'Paste as Ghost')),
                                     'icon': 'link',
                                     'accesskey': ['ctrl+g'],
                                     'order': 20,
                                     'action':
                                         {'rest':
                                              {'action': 'pasteasghost',
                                               'send': 'clipboard_ids'}},
                                     'ifaces': ['object']},
                                    ],
                             'ifaces': ['object']},
                            {'title': self.translate(_(u'Delete')),
                             'icon': 'trash',
                             'accesskey': ['ctrl+d'],
                             'order': 9,
                             'action':
                                 {'rest':
                                      {'action': 'delete',
                                       'send': 'selected_ids',}},
                             'confirmation': {
                                    'title': self.translate(_(u"Confirm deletion")),
                                    'message': self.translate(_(u'Do you want to delete the selected content(s) ?'))},
                             'available':
                                 {'content_match':
                                      {'access': ['manage', 'publish', 'write']},
                                  'min_items': 1},
                             'ifaces': ['content']},
                            {'title': self.translate(_(u'Rename')),
                             'icon': 'pencil',
                             'accesskey': ['ctrl+r'],
                             'order': 10,
                             'action':
                                 {'input':
                                      {'action': 'rename',
                                       'values': ['identifier', 'title']}},
                             'available':
                                 {'content_match':
                                      {'access': ['manage', 'publish', 'write']},
                                  'min_items': 1},
                             'ifaces': ['content']},
                            ],},
                    {'available': {'input_mode': False},
                     'actions': [
                            {'title': None,
                             'available':
                                 {'min_items': 1},
                             'actions': [
                                    {'title': self.translate(_(u'Publish')),
                                     'icon': 'check',
                                     'accesskey': ['ctrl+p'],
                                     'order': 10,
                                     'action':
                                         {'rest':
                                              {'action': 'publish',
                                               'send': 'selected_ids'}},
                                     'available':
                                         {'content_match':
                                              {'access': ['manage', 'publish']},
                                          'items_match':
                                              {'status': ['draft', 'approved', 'pending', None]}},
                                     'Ifaces': ['container', 'versioned']},
                                    {'title': self.translate(_(u'New version')),
                                     'icon': 'document',
                                     'accesskey': ['ctrl+n'],
                                     'order': 15,
                                     'action':
                                         {'rest':
                                              {'action': 'newversion',
                                               'send': 'selected_ids'}},
                                     'active': {},
                                     'available':
                                         {'content_match':
                                              {'access': ['manage', 'publish', 'write']},
                                          'items_match':
                                              {'status': ['published', 'closed']}},
                                     'ifaces': ['versioned']},
                                    {'title': self.translate(_(u'Close')),
                                     'icon': 'close',
                                     'accesskey': ['ctrl+l'],
                                     'order': 20,
                                     'action':
                                         {'rest':
                                              {'action': 'close',
                                               'send': 'selected_ids'}},
                                     'available':
                                         {'content_match':
                                              {'access': ['manage', 'publish']},
                                          'items_match':
                                              {'status': ['published', None]}},
                                     'ifaces': ['container', 'versioned']},
                                    {'title': self.translate(_(u'Approve for future')),
                                     'icon': 'document',
                                     'order': 25,
                                     'action':
                                         {'form':
                                              {'name': 'silva.core.smi.approveforfuture',
                                               'identifier': 'form.prefix.contents'}},
                                     'available':
                                         {'content_match':
                                              {'access': ['manage', 'publish']},
                                          'items_match':
                                              {'status': ['draft']}},
                                     'ifaces': ['versioned']},
                                    ],
                             'ifaces': ['object']},
                            ]}]})


def get_content_status(content):
    public_version_status = None
    next_version_status = None

    if IVersionedContent.providedBy(content):
        public = content.get_public_version_status()
        if public == 'published':
            public_version_status = 'published'
        elif public == 'closed':
            public_version_status = 'closed'

        next_status = content.get_next_version_status()
        if next_status == 'not_approved':
            next_version_status = 'draft'
        elif next_status == 'request_pending':
            next_version_status = 'pending'
        elif next_status == 'approved':
            next_version_status = 'approved'

    # XXX: define behavior for Folders
    # elif IFolder.providedBy(content):
    #     if content.is_published():
    #         status[0] = 'published'
    #     if content.is_approved():
    #         status[1] = 'approved'
    return (public_version_status, next_version_status)

def content_ifaces(content):
    for interface, iface in CONTENT_IFACES:
        if interface.providedBy(content):
            return [iface]
    return []


class ContentSerializer(object):
    """Serialize content information into to be JSON.
    """

    def __init__(self, rest, request):
        self.rest = rest
        self.request = request
        service = getUtility(IIntIds)
        self.get_id = service.register
        self.get_content = service.getObject
        self.get_metadata = getUtility(IMetadataService).getMetadataValue
        self.get_icon = IIconResolver(self.request).get_content_url
        self.check_permission = getSecurityManager().checkPermission
        locale = self.request.locale
        formatter = locale.dates.getFormatter('dateTime')
        self.format_date = lambda d: formatter.format(d.asdatetime())

    def get_access(self, content):
        for access, permission in [
            ('manage', 'Manage Silva content settings'),
            ('publish', 'Approve Silva content'),
            ('write', 'Change Silva content')]:
            if self.check_permission(permission, content):
                return access
        return None

    def __call__(self, content=None, id=None):
        if content is None:
            # XXX Need to handle case where the object
            # disappeared. This can happen in case of conflict error
            # with the invalidation code.
            content = self.get_content(id)
        elif id is None:
            id = self.get_id(content)
        previewable = content.get_previewable()
        author = self.get_metadata(
            previewable, 'silva-extra', 'lastauthor')
        if author is None:
            author = u'-'
        modified = self.get_metadata(
            previewable, 'silva-extra', 'modificationtime')
        if modified is None:
            modified = u'-'
        else:
            modified = self.format_date(modified)
        data = {
            'ifaces': content_ifaces(content),
            'id': id,
            'identifier': content.getId(),
            'path': self.rest.get_content_path(content),
            'icon': self.get_icon(content),
            'title': previewable.get_title_or_id(),
            'author': author,
            'modified': modified,
            'access': self.get_access(content),
            'position': -1}
        if IPublishable.providedBy(content):
            data['status'] = get_content_status(content)
            data['moveable'] = not content.is_default()
        return data


class FolderActionREST(ActionREST):
    """Base class for REST-based listing actions.
    """
    grok.baseclass()
    grok.context(IContainer)
    grok.require('silva.ChangeSilvaContent')

    def get_selected_contents(self, key='content', recursive=False):
        for content in self.get_contents(self.request.form.get(key)):
            if recursive and IContainer.providedBy(content):
                for content in walk_silva_tree(content):
                    yield content
            else:
                yield content

    def notify(self, message, type=u""):
        service = getUtility(IMessageService)
        service.send(message, self.request, namespace=type)

    def payload(self):
        raise NotImplementedError

    def get_payload(self):
        content_getter = ContentGenerator(self.notify)
        self.get_contents = content_getter.get_contents
        self.notifier = ContentNotifier(self.request).notifier
        with content_getter:
            data = self.payload()

        serializer = ContentSerializer(self, self.request)
        container = serializer.get_id(self.context)

        updated = []
        removed = []
        added_publishables = []
        added_assets = []
        for info in Invalidation(self.request).get_changes(
            filter_func=lambda change: change['container'] == container):
            if info['action'] == 'remove':
                removed.append(info['content'])
            else:
                content_data = serializer(id=info['content'])
                content_data['position'] = info['position']
                if info['action'] == 'add':
                    if info['listing'] == 'assets':
                        added_assets.append(content_data)
                    else:
                        added_publishables.append(content_data)
                else:
                    updated.append(content_data)

        if removed:
            data['remove'] = removed
        if updated:
            data['update'] = updated
        if added_publishables or added_assets:
            data['add'] = {}
            if added_publishables:
                data['add']['publishables'] = added_publishables
            else:
                data['add']['assets'] = added_assets
        return {'ifaces': ['action'], 'actions': data}


