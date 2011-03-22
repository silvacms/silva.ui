# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from infrae import rest
from megrok.chameleon.components import ChameleonPageTemplate
from zope.component import getUtility
from zope.intid.interfaces import IIntIds

from silva.core import interfaces
from silva.core.messages.interfaces import IMessageService
from silva.ui.icon import get_icon
from silva.ui.rest.base import UIREST
from silva.translations import translate as _
from silva.core.services.utils import walk_silva_tree

from AccessControl import getSecurityManager
from Products.SilvaMetadata.interfaces import IMetadataService


CONTENT_IFACES = [
    (interfaces.IVersionedContent, 'versioned'),
    (interfaces.IContainer, 'container'),
    (interfaces.IAsset, 'asset'),
    (interfaces.ISilvaObject, 'content')]



class TemplateContainerListing(rest.REST):
    grok.context(interfaces.IContainer)
    grok.name('silva.ui.listing.template')
    grok.require('silva.ReadSilvaContent')

    template = ChameleonPageTemplate(filename="templates/listing.cpt")

    def default_namespace(self):
        return {}

    def namespace(self):
        return {'rest': self}

    def GET(self):
        return self.template.render(self)

icon_width = 20
pubstate_width = 16


class ColumnsContainerListing(UIREST):
    grok.context(interfaces.IContainer)
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
                     'layout': {'fixed': {0:icon_width, 1:pubstate_width}},
                     'columns': [
                            {'name': 'icon',
                             'view': 'icon'},
                            {'name': 'status',
                             'view': 'workflow'},
                            {'name': 'identifier',
                             'caption': self.translate(_(u'Identifier')),
                             'view': 'action',
                             'action': 'content',
                             'filterable': True},
                            {'name': 'title',
                             'caption': self.translate(_(u'Title')),
                             'view': 'action',
                             'action': 'preview',
                             'filterable': True},
                            {'name': 'modified',
                             'caption': self.translate(_(u'Modified')),
                             'view': 'text'},
                            {'name': 'author',
                             'caption': self.translate(_(u'Author')),
                             'view': 'action',
                             'action': 'properties'}],
                     'sortable':
                         {'columns': ['icon', 'status'],
                          'available': {'access': ['manage', 'publish', 'write']},
                          'action': 'order'},
                     'collapsed': False},
                    {'name': 'assets',
                     'layout': {'fixed':
                        {0:icon_width+pubstate_width}, 'skip': {1:True}},
                     'columns': [
                            {'name': 'icon',
                             'view': 'icon'},
                            {'name': 'identifier',
                             'caption': self.translate(_(u'Identifier')),
                             'view': 'action',
                             'action': 'content',
                             'filterable': True},
                            {'name': 'title',
                             'caption': self.translate(_(u'Title')),
                             'view': 'action',
                             'action': 'preview',
                             'filterable': True},
                            {'name': 'modified',
                             'caption': self.translate(_(u'Modified')),
                             'view': 'text'},
                            {'name': 'author',
                             'caption': self.translate(_(u'Author')),
                             'view': 'action',
                             'action': 'properties'}],
                     'collapsed': True},],
                'actions': [
                    {'title': self.translate(_(u'Cut')),
                     'icon': 'scissors',
                     'order': 5,
                     'action':
                         {'cut': True},
                     'available':
                         {'content_match':
                              {'access': ['manage', 'publish', 'write']}},
                     'ifaces': ['content']},
                    {'title': self.translate(_(u'Copy')),
                     'icon': 'copy',
                     'order': 6,
                     'action':
                         {'copy': True},
                     'ifaces': ['content']},
                    {'title': self.translate(_(u'Rename')),
                     'icon': 'pencil',
                     'order': 10,
                     'action':
                         {'rest':
                              {'action': 'rename',
                               'send': 'item_values',
                               'values': ['identifier', 'title']}},
                     'available':
                         {'content_match':
                              {'access': ['manage', 'publish', 'write']}},
                     'ifaces': ['content']},
                    {'title': self.translate(_(u'New version')),
                     'icon': 'document',
                     'order': 50,
                     'action':
                         {'rest':
                              {'action': 'newversion',
                               'send': 'selected_ids'}},
                     'available':
                         {'items_match':
                              {'status': ['published', 'closed'],
                               'access': ['manage', 'publish', 'write']}},
                     'ifaces': ['versioned']},
                    {'title': self.translate(_(u'Publish')),
                     'icon': 'check',
                     'order': 51,
                     'action':
                         {'rest':
                              {'action': 'publish',
                               'send': 'selected_ids'}},
                     'available':
                         {'items_match':
                              {'status': ['draft', 'approved', 'pending', None],
                               'access': ['manage', 'publish']}},
                     'ifaces': ['container', 'versioned']},
                    {'title': self.translate(_(u'Close')),
                     'icon': 'close',
                     'order': 52,
                     'action':
                         {'rest':
                              {'action': 'close',
                               'send': 'selected_ids'}},
                     'available':
                         {'items_match':
                              {'status': ['published', None],
                               'access': ['manage', 'publish']}},
                     'ifaces': ['container', 'versioned']},
                    {'title': self.translate(_(u'Delete')),
                     'icon': 'trash',
                     'order': 100,
                     'action':
                         {'rest':
                              {'action': 'delete',
                               'send': 'selected_ids'}},
                     'available':
                         {'content_match':
                              {'access': ['manage', 'publish', 'write']}},
                     'ifaces': ['content']},
                    ],
                'clipboard_actions': [
                    {'title': self.translate(_(u'Paste')),
                     'icon': 'clipboard',
                     'order': 6,
                     'action':
                         {'rest':
                              {'action': 'paste',
                               'send': 'clipboard_ids'}},
                     'available': {'min_items': 1,
                                   'content_match':
                                       {'access': ['manage', 'publish', 'write']}},
                     'ifaces': ['clipboard']},
                    {'title': self.translate(_(u'Paste as Ghost')),
                     'icon': 'link',
                     'order': 7,
                     'action':
                         {'rest':
                              {'action': 'pasteasghost',
                               'send': 'clipboard_ids'}},
                     'available':
                         {'min_items': 1,
                          'content_match':
                              {'access': ['manage', 'publish', 'write']}},
                     'ifaces': ['clipboard']},
                    {'title': self.translate(_(u'Clear clipboard')),
                     'icon': 'trash',
                     'order': 8,
                     'action': {'clear_clipboard': True},
                     'ifaces': ['clipboard']},
                    ]})


def format_date(date):
    if date is not None:
        return date.ISO()
    return ''

def get_content_status(content):
    if interfaces.IVersionedContent.providedBy(content):
        next_status = content.get_next_version_status()

        if next_status == 'not_approved':
            return 'draft'
        elif next_status == 'request_pending':
            return 'pending'
        elif next_status == 'approved':
            return 'approved'
        else:
            public = content.get_public_version_status()
            if public == 'published':
                return 'published'
            elif public == 'closed':
                return 'closed'
    return None

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
        self.get_id = getUtility(IIntIds).register
        self.get_metadata = getUtility(IMetadataService).getMetadataValue
        self.check_permission = getSecurityManager().checkPermission

    def get_access(self, content):
        for access, permission in [
            ('manage', 'Manage Silva Content Settings'),
            ('publish', 'Approve Silva Content'),
            ('write', 'Change Silva Content')]:
            if self.check_permission(permission, content):
                return access
        return None

    def __call__(self, content):
        previewable = content.get_previewable()
        data = {
            'ifaces': content_ifaces(content),
            'id': self.get_id(content),
            'identifier': content.getId(),
            'path': self.rest.get_content_path(content),
            'icon': get_icon(content, self.request),
            'title': previewable.get_title_or_id(),
            'author': self.get_metadata(
               previewable, 'silva-extra', 'lastauthor'),
            'modified': format_date(self.get_metadata(
                   previewable, 'silva-extra', 'modificationtime')),
            'access': self.get_access(content)}
        if interfaces.IPublishable.providedBy(content):
            data['status'] = get_content_status(content)
        return data


class ActionREST(UIREST):
    """Base class for REST-based listing actions.
    """
    grok.baseclass()
    grok.context(interfaces.IContainer)
    grok.require('silva.ChangeSilvaContent')

    def __init__(self, *args):
        super(ActionREST, self).__init__(*args)
        self.__serializer = ContentSerializer(self, self.request)
        self.__removed = []
        self.__added_publishables = []
        self.__added_nonpublishables = []
        self.__updated = []

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
                    if recursive and interfaces.IContainer.providedBy(content):
                        for content in walk_silva_tree(content):
                            yield id, content
                            id = None
                    else:
                        yield id, content

    def add_to_listing(self, content):
        if interfaces.IPublishable.providedBy(content):
            self.__added_publishables.append(self.__serializer(content))
        elif interfaces.INonPublishable.providedBy(content):
            self.__added_nonpublishables.append(self.__serializer(content))

    def update_in_listing(self, content):
        self.__updated.append(self.__serializer(content))

    def remove_from_listing(self, identifier):
        self.__removed.append(identifier)

    def notify(self, message, type=u""):
        service = getUtility(IMessageService)
        service.send(message, self.request, namespace=type)

    def payload(self):
        raise NotImplementedError

    def POST(self):
        data = self.payload()
        if self.__removed:
            data['remove'] = self.__removed
        if self.__updated:
            data['update'] = self.__updated
        if self.__added_publishables or self.__added_nonpublishables:
            data['add'] = {}
            if self.__added_publishables:
                data['add']['publishables'] = self.__added_publishables
            else:
                data['add']['assets'] = self.__added_nonpublishables
        return self.json_response({
                'ifaces': ['actionresult'],
                'post_actions': data,
                'notifications': self.get_notifications()})


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

