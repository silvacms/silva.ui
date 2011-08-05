# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from infrae import rest
from megrok.chameleon.components import ChameleonPageTemplate
from zope.component import getUtility
from zope.intid.interfaces import IIntIds
from zope.lifecycleevent.interfaces import IObjectModifiedEvent
from zope.lifecycleevent.interfaces import IObjectMovedEvent

from silva.core.cache.memcacheutils import MemcacheSlice
from silva.core.interfaces import IRoot, IContainer, ISilvaObject
from silva.core.interfaces import IPublishable, INonPublishable
from silva.core.interfaces import IVersion, IVersionedContent
from silva.core.interfaces.adapters import IIconResolver, IOrderManager
from silva.core.messages.interfaces import IMessageService
from silva.core.services.utils import walk_silva_tree
from silva.core.views.interfaces import IVirtualSite
from silva.translations import translate as _
from silva.ui.rest.base import ActionREST
from silva.ui.rest.base import UIREST

from AccessControl import getSecurityManager
from Acquisition import aq_parent
from OFS.interfaces import IObjectWillBeMovedEvent
from Products.SilvaMetadata.interfaces import IMetadataService
from Products.SilvaMetadata.interfaces import IMetadataModifiedEvent


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
                             'filterable': True},
                            {'name': 'title',
                             'caption': self.translate(_(u'Title')),
                             'view': 'text',
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
                             'filterable': True},
                            {'name': 'title',
                             'caption': self.translate(_(u'Title')),
                             'view': 'text',
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
                                     'ifaces': ['container', 'versioned']},
                                    {'title': self.translate(_(u'Close')),
                                     'icon': 'close',
                                     'accesskey': ['ctrl+l'],
                                     'order': 15,
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
                                    {'title': self.translate(_(u'New version')),
                                     'icon': 'document',
                                     'accesskey': ['ctrl+n'],
                                     'order': 20,
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
                                    {'title': self.translate(_(u'Approve for future')),
                                     'icon': 'document',
                                     'order': 25,
                                     'action':
                                         {'form':
                                              {'name': 'silva.core.smi.approveforfuture',
                                               'send': 'selected_ids'}},
                                     'available':
                                         {'content_match':
                                              {'access': ['manage', 'publish', 'write']},
                                          'items_match':
                                              {'status': ['draft', 'closed']}},
                                     'ifaces': ['versioned']},
                                    ],
                             'ifaces': ['object']},
                            ]}]})


def format_date(date):
    if date is not None:
        return date.ISO()
    return ''

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

    def get_access(self, content):
        for access, permission in [
            ('manage', 'Manage Silva Content Settings'),
            ('publish', 'Approve Silva Content'),
            ('write', 'Change Silva Content')]:
            if self.check_permission(permission, content):
                return access
        return None

    def __call__(self, content=None, id=None):
        if content is None:
            content = self.get_content(id)
        elif id is None:
            id = self.get_id(content)
        previewable = content.get_previewable()
        data = {
            'ifaces': content_ifaces(content),
            'id': id,
            'identifier': content.getId(),
            'path': self.rest.get_content_path(content),
            'icon': self.get_icon(content),
            'title': previewable.get_title_or_id(),
            'author': self.get_metadata(
                previewable, 'silva-extra', 'lastauthor'),
            'modified': format_date(self.get_metadata(
                    previewable, 'silva-extra', 'modificationtime')),
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

    def get_selected_content(self, key='content', recursive=False):
        ids = self.request.form.get(key)
        if ids is not None:
            get_content = getUtility(IIntIds).getObject
            if not isinstance(ids, list):
                # If only one item have been submitted we won't get a list
                ids = [ids]
            for id in ids:
                try:
                    content = get_content(int(id))
                except (KeyError, ValueError):
                    pass
                else:
                    if recursive and IContainer.providedBy(content):
                        for content in walk_silva_tree(content):
                            yield id, content
                            id = None
                    else:
                        yield id, content

    def notify(self, message, type=u""):
        service = getUtility(IMessageService)
        service.send(message, self.request, namespace=type)

    def payload(self):
        raise NotImplementedError

    def get_payload(self):
        data = self.payload()

        serializer = ContentSerializer(self, self.request)
        container = serializer.get_id(self.context)

        listing = ListingSynchronizer()
        updated = []
        removed = []
        added_publishables = []
        added_nonpublishables = []
        for info in listing.get_changes(self.request, container):
            if info['action'] == 'remove':
                removed.append(info['content'])
            else:
                content_data = serializer(id=info['content'])
                content_data['position'] = info.get('position', -1)
                if info['action'] == 'add':
                    if info['listing'] == 'publishables':
                        added_publishables.append(content_data)
                    else:
                        added_nonpublishables.append(content_data)
                else:
                    updated.append(content_data)

        if removed:
            data['remove'] = removed
        if updated:
            data['update'] = updated
        if added_publishables or added_nonpublishables:
            data['add'] = {}
            if added_publishables:
                data['add']['publishables'] = added_publishables
            else:
                data['add']['assets'] = added_nonpublishables
        return {'ifaces': ['action'], 'actions': data}


class ContentCounter(object):
    """Report a sentance a number of content.
    """
    MAX_TITLES = 4

    def __init__(self, rest):
        self.rest = rest
        self.size = 0
        self.titles = []

    def _get_title(self, content):
        previewable = content.get_previewable()
        return previewable.get_title_or_id()

    def append(self, content):
        if not (self.size > self.MAX_TITLES):
            self.titles.append(self._get_title(content))
        self.size += 1

    def extend(self, contents):
        if not ((self.size + len(contents)) > self.MAX_TITLES):
            self.titles.extend(map(self._get_title, contents))
        self.size += len(contents)

    def __len__(self):
        return self.size

    def __unicode__(self):
        if not self.size:
            return u''

        def quotify(element):
            return u'"%s"' % element

        if self.size == 1:
            return quotify(self.titles[0])
        if self.size > 4:
            what = _(
                u'${count} contents',
                mapping={'count': self.size})
        else:
            what = _(
                u'${contents} and ${content}',
                mapping={'contents': ', '.join(map(quotify, self.titles[:-1])),
                         'content': quotify(self.titles[-1])})
        return self.rest.translate(what)



class ListingSynchronizer(object):

    namespace = 'silva.listing.invalidation'

    def initialize_client(self, request):
        # Set version inconditionally. (We are not interested about
        # what happened before).
        storage = MemcacheSlice(self.namespace)
        self.set_client_version(request, storage.get_index())

    def get_path(self, request):
        return IVirtualSite(request).get_root().absolute_url_path()

    def get_client_version(self, request):
        try:
            return int(request.cookies.get(self.namespace, None))
        except TypeError:
            return None

    def set_client_version(self, request, version):
        request.response.setCookie(
            self.namespace, str(version), path=self.get_path(request))

    def get_changes(self, request, container):
        storage = MemcacheSlice(self.namespace)
        storage_version = storage.get_index()
        client_version = self.get_client_version(request)

        if client_version != storage_version:
            self.set_client_version(request, storage_version)

        if client_version is not None and client_version < storage_version:
            return filter(
                lambda r: r['container'] == container,
                storage[client_version+1:storage_version+1])

        return []

# XXX Do position.

def register_change(target, action):
    get_id = getUtility(IIntIds).register
    container = aq_parent(target)
    is_publishable = IPublishable.providedBy(target)
    data = {
        'action': action,
        'listing': 'publishables' if is_publishable else 'assets',
        'container': get_id(container),
        'content': get_id(target)}
    if action != 'remove':
        order = IOrderManager(container, None)
        if order is not None:
            position = order.get_position(target) + 1
            if not position:
                if not (is_publishable and target.is_default()):
                    position = -1
            data['position'] = position
    MemcacheSlice(ListingSynchronizer.namespace).push(data)


@grok.subscribe(ISilvaObject, IObjectModifiedEvent)
def register_update(target, event):
    register_change(target, 'update')


@grok.subscribe(IVersion, IObjectModifiedEvent)
def register_version_update(target, event):
    register_change(target.get_content(), 'update')


@grok.subscribe(ISilvaObject, IMetadataModifiedEvent)
def register_title_update(target, event):
    if 'maintitle' in event.changes:
        register_change(target, 'update')


@grok.subscribe(IVersion, IMetadataModifiedEvent)
def register_vesion_title_update(target, event):
    if 'maintitle' in event.changes:
        register_change(target.get_content(), 'update')


@grok.subscribe(ISilvaObject, IObjectMovedEvent)
def register_move(target, event):
    if event.object != target or not IContainer.providedBy(aq_parent(target)):
        return
    if event.newParent is not None:
        # That was not a delete
        if event.oldParent is event.newParent:
            # This was a rename.
            register_change(target, 'update')
        else:
            # This was an add.
            register_change(target, 'add')


@grok.subscribe(ISilvaObject, IObjectWillBeMovedEvent)
def register_remove(target, event):
    if event.object != target or not IContainer.providedBy(aq_parent(target)):
        return
    if IRoot.providedBy(target):
        return
    if event.oldParent is not None:
        if event.newParent is not event.oldParent:
            # That was a move or a delete, but not a rename
            register_change(target, 'remove')
