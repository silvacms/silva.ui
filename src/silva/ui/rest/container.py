# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$


from five import grok
from infrae import rest
from megrok.chameleon.components import ChameleonPageTemplate
from zope.component import getUtility
from zope.component import queryUtility
from zope.component.interfaces import IFactory
from zope.intid.interfaces import IIntIds

from silva.core import interfaces
from silva.core.messages.interfaces import IMessageService
from silva.ui.icon import get_icon
from silva.ui.rest.base import PageREST, UIREST
from silva.translations import translate as _
from silva.core.services.utils import walk_silva_tree

from Acquisition import aq_parent
from AccessControl import getSecurityManager
from Products.SilvaMetadata.interfaces import IMetadataService
from zExceptions import NotFound


CONTENT_IFACES = [
    (interfaces.IVersionedContent, 'versioned'),
    (interfaces.IContainer, 'container'),
    (interfaces.IAsset, 'asset'),
    (interfaces.ISilvaObject, 'content')]


class Adding(rest.REST):
    grok.context(interfaces.IContainer)
    grok.name('silva.ui.adding')
    grok.require('silva.ChangeSilvaContent')

    def publishTraverse(self, request, name):
        if name in self.context.get_silva_addables_allowed_in_container():
            factory = queryUtility(IFactory, name=name)
            if factory is not None:
                factory = factory(self.context, request)
                # Set parent for security check.
                factory.__name__ = '/'.join((self.__name__, name))
                factory.__parent__ = self
                return factory
        raise NotFound(name)


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
                             'action': 'content'},
                            {'name': 'title',
                             'caption': self.translate(_(u'Title')),
                             'view': 'action',
                             'action': 'preview'},
                            {'name': 'modified',
                             'caption': self.translate(_(u'Modified')),
                             'view': 'text'},
                            {'name': 'author',
                             'caption': self.translate(_(u'Author')),
                             'view': 'action',
                             'action': 'properties'}],
                     'sortable':
                         {'columns': ['icon', 'status'],
                          'available':
                              {'content_match':
                                   {'access': ['manage', 'publish', 'write']}}},
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
                             'action': 'content'},
                            {'name': 'title',
                             'caption': self.translate(_(u'Title')),
                             'view': 'action',
                             'action': 'preview'},
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
                     'available':
                         {'max_items': 1,
                          'content_match':
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


class ContainerListing(PageREST):
    grok.context(interfaces.IContainer)
    grok.name('silva.ui.content')
    grok.require('silva.ReadSilvaContent')

    def get_publishable_content(self):
        """Return all the publishable content of the container.
        """
        default = self.context.get_default()
        if default is not None:
            yield default
        for content in self.context.get_ordered_publishables():
            yield content

    def get_non_publishable_content(self):
        """Return all the non-publishable content of the container.
        """
        for content in self.context.get_non_publishables():
            yield content

    def payload(self):
        serializer = ContentSerializer(self, self.request)
        return {"ifaces": ["listing"],
                "content": serializer(self.context),
                "items": {"publishables": map(serializer, self.get_publishable_content()),
                          "assets": map(serializer, self.get_non_publishable_content())}}


class ActionREST(UIREST):
    """Base class for REST-based listing actions.
    """
    grok.baseclass()
    grok.context(interfaces.IContainer)
    grok.require('silva.ChangeSilvaContent')

    def get_selected_content(self, key='content', recursive=False):
        ids = self.request.form.get(key)
        if ids is not None:
            intids = getUtility(IIntIds)
            if not isinstance(ids, list):
                # If only one item have been submitted we won't get a list
                ids = [ids]
            for id in ids:
                try:
                    content = intids.getObject(int(id))
                except (KeyError, ValueError):
                    pass
                else:
                    if recursive and interfaces.IContainer.providedBy(content):
                        for content in walk_silva_tree(content):
                            yield id, content
                            id = None
                    else:
                        yield id, content

    def payload(self):
        raise NotImplementedError

    def notify(self, message, type=u""):
        service = getUtility(IMessageService)
        service.send(message, self.request, namespace=type)

    def POST(self):
        data = self.payload()
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

    def append(self, content):
        if not (self.size > self.MAX_TITLES):
            previewable = content.get_previewable()
            self.titles.append(previewable.get_title_or_id())
        self.size += 1

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


class DeleteActionREST(ActionREST):
    grok.name('silva.ui.listing.delete')

    def payload(self):
        removed = []
        to_remove = []
        removed_titles = ContentCounter(self)
        kept = []
        kept_titles = ContentCounter(self)

        # Collect information
        for intid, content in self.get_selected_content():
            if content.is_deletable():
                removed.append(intid)
                removed_titles.append(content)
                to_remove.append(content.getId())
            else:
                kept.append(intid)
                kept_titles.append(content)

        # Remove objects
        self.context.manage_delObjects(to_remove)

        # Compute notification message
        if removed_titles:
            if kept_titles:
                self.notify(
                    _(u'Deleted ${deleted} but could not delete ${not_deleted}.',
                      mapping={'deleted': removed_titles,
                               'not_deleted': kept_titles}))
            else:
                self.notify(
                    _(u'Deleted ${deleted}.',
                      mapping={'deleted': removed_titles}))
        else:
            self.notify(
                _(u'Could not delete ${not_deleted}.',
                  mapping={'not_deleted': kept_titles}))
        return {'remove': removed}


class PasteActionREST(ActionREST):
    grok.name('silva.ui.listing.paste')

    def payload(self):
        target = self.context
        tokens = []
        copied_titles = ContentCounter(self)
        moved_titles = ContentCounter(self)
        pasted_publishables = []
        pasted_assets = []
        serializer = ContentSerializer(self, self.request)

        # Zope 2 API to copy and paster is not really great for this
        for intid, content in self.get_selected_content('copied'):
            parent = aq_parent(content)
            tokens.append(parent.manage_copyObjects([content.getId()]))
            copied_titles.append(content)
        for intid, content in self.get_selected_content('cutted'):
            parent = aq_parent(content)
            tokens.append(parent.manage_cutObjects([content.getId()]))
            moved_titles.append(content)
        for token in tokens:
            for id_info in target.manage_pasteObjects(token):
                content = target[id_info['new_id']]
                if interfaces.IPublishable.providedBy(content):
                    pasted_publishables.append(serializer(content))
                elif interfaces.INonPublishable.providedBy(content):
                    pasted_assets.append(serializer(content))

        # Notifications
        if copied_titles:
            self.notify(
                _(u'Pasted as a copy ${copied}.',
                  mapping={'copied': copied_titles}))
        if moved_titles:
            self.notify(
                _(u'Moved ${moved}.',
                  mapping={'moved': moved_titles}))

        # Response
        data = {'clear_clipboard': True}
        append = {}
        if pasted_publishables:
            append['publishables'] = pasted_publishables
        if pasted_assets:
            append['assets'] = pasted_assets
        if append:
            data['new_data'] = append
        return data


class PublishActionREST(ActionREST):
    grok.name('silva.ui.listing.publish')

    def payload(self):
        published = []
        published_titles = ContentCounter(self)
        not_published_titles = ContentCounter(self)
        serializer = ContentSerializer(self, self.request)

        for identifier, content in self.get_selected_content(recursive=True):
            workflow = interfaces.IPublicationWorkflow(content, None)
            if workflow is not None:
                try:
                    workflow.approve()
                except interfaces.PublicationWorkflowError:
                    not_published_titles.append(content)
                else:
                    if identifier is not None:
                        published.append(serializer(content))
                    published_titles.append(content)
            else:
                not_published_titles.append(content)

        # Notifications
        if published_titles:
            if not_published_titles:
                self.notify(
                    _(u'Published ${published}, but could not publish ${not_published}.',
                      mapping={'published': published_titles,
                               'not_published': not_published_titles}))
            else:
                self.notify(
                    _(u'Published ${published}.',
                      mapping={'published': published_titles}))
        elif not_published_titles:
            self.notify(
                _(u'Could not publish ${not_published}.',
                  mapping={'not_published': not_published_titles}))

        return {'update': published}


class CloseActionREST(ActionREST):
    grok.name('silva.ui.listing.close')

    def payload(self):
        closed = []
        closed_titles = ContentCounter(self)
        not_closed_titles = ContentCounter(self)
        serializer = ContentSerializer(self, self.request)

        for identifier, content in self.get_selected_content(recursive=True):
            workflow = interfaces.IPublicationWorkflow(content, None)
            if workflow is not None:
                try:
                    workflow.close()
                except interfaces.PublicationWorkflowError:
                    not_closed_titles.append(content)
                else:
                    if identifier is not None:
                        closed.append(serializer(content))
                    closed_titles.append(content)
            else:
                not_closed_titles.append(content)

        # Notifications
        if closed_titles:
            if not_closed_titles:
                self.notify(
                    _(u'Closed ${closed}, but could not close ${not_closed}.',
                      mapping={'closed': closed_titles,
                               'not_closed': not_closed_titles}))
            else:
                self.notify(
                    _(u'Closed ${closed}.',
                      mapping={'closed': closed_titles}))
        elif not_closed_titles:
            self.notify(
                _(u'Could not close ${not_closed}.',
                  mapping={'not_closed': not_closed_titles}))

        return {'update': closed}


class NewVersionActionREST(ActionREST):
    grok.name('silva.ui.listing.newversion')

    def payload(self):
        newversion = []
        newversion_titles = ContentCounter(self)
        not_newversion_titles = ContentCounter(self)
        serializer = ContentSerializer(self, self.request)

        for ignored, content in self.get_selected_content():
            workflow = interfaces.IPublicationWorkflow(content, None)
            if workflow is not None:
                try:
                    workflow.new_version()
                except interfaces.PublicationWorkflowError:
                    not_newversion_titles.append(content)
                else:
                    newversion.append(serializer(content))
                    newversion_titles.append(content)
            else:
                not_newversion_titles.append(content)

        # Notifications
        if newversion_titles:
            if not_newversion_titles:
                self.notify(
                    _(u'New version(s) created for ${newversion}, '
                      u'but could do it for ${not_newversion}.',
                      mapping={'newversion': newversion_titles,
                               'not_newversion': not_newversion_titles}))
            else:
                self.notify(
                    _(u'New version(s) created for ${newversion}.',
                      mapping={'newversion': newversion_titles}))
        elif not_newversion_titles:
            self.notify(
                _(u'Could not create new version(s) for ${not_newversion}.',
                  mapping={'not_newversion': not_newversion_titles}))

        return {'update': newversion}

