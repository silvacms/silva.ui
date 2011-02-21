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

from Products.SilvaMetadata.interfaces import IMetadataService
from zExceptions import NotFound


CONTENT_IFACES = [
    (interfaces.ISilvaObject, 'content'),
    (interfaces.IAsset, 'asset'),
    (interfaces.IContainer, 'container'),
    (interfaces.IVersionedContent, 'versioned')]


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


class ColumnsContainerListing(UIREST):
    grok.context(interfaces.IContainer)
    grok.name('silva.ui.listing.configuration')
    grok.require('silva.ReadSilvaContent')

    def GET(self):
        return self.json_response({
                'listing': [
                    {'name': 'publishables',
                     'columns': [
                            {'name': 'icon'},
                            {'name': 'status'},
                            {'name': 'title',
                             'caption': self.translate(_(u'Title')),},
                            {'name': 'author',
                             'caption': self.translate(_(u'Author')),},
                            {'name': 'modified',
                             'caption': self.translate(_(u'Modified')),}],
                     'sortable': 'icon',
                     'collapsed': False},
                    {'name': 'assets',
                     'columns': [
                            {'name': 'icon',},
                            {'name': 'title',
                             'caption': self.translate(_(u'Title')),},
                            {'name': 'author',
                             'caption': self.translate(_(u'Author')),},
                            {'name': 'modified',
                             'caption': self.translate(_(u'Modified')),}],
                     'collapsed': True},],
                'actions': [
                    {'name': 'cut',
                     'title': self.translate(_(u'Cut')),
                     'order': 5,
                     'ifaces': ['content']},
                    {'name': 'copy',
                     'title': self.translate(_(u'Copy')),
                     'order': 6,
                     'ifaces': ['content']},
                    {'name': 'paste',
                     'title': self.translate(_(u'Paste')),
                     'order': 7,
                     'ifaces': ['content']},
                    {'name': 'rename',
                     'title': self.translate(_(u'Rename')),
                     'order': 10,
                     'available': {'max_selected': 1},
                     'ifaces': ['content']},
                    {'name': 'publish',
                     'title': self.translate(_(u'Publish')),
                     'order': 51,
                     'action': {'rest': 'publish'},
                     'ifaces': ['container', 'versioned']},
                    {'name': 'close',
                     'title': self.translate(_(u'Close')),
                     'order': 52,
                     'action': {'rest': 'close'},
                     'ifaces': ['container', 'versioned']},
                    {'name': 'delete',
                     'title': self.translate(_(u'Delete')),
                     'order': 100,
                     'action': {'rest': 'delete'},
                     'ifaces': ['content']},
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
    ifaces = []
    for interface, iface in CONTENT_IFACES:
        if interface.providedBy(content):
            ifaces.append(iface)
    return ifaces


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

    def get_content_data(self, intids, content):
        return {
            'ifaces': content_ifaces(content),
            'id': intids.register(content)}

    def payload(self):
        publishables = []
        intids = getUtility(IIntIds)
        metadata = getUtility(IMetadataService)
        for entry in self.get_publishable_content():
            path = self.get_content_path(entry)
            content = entry.get_previewable()
            content_metadata = metadata.getMetadata(content)
            publishables.append({
                    "data": self.get_content_data(intids, entry),
                    "columns": {
                        "status": {
                            "ifaces": ["workflow"],
                            "value": get_content_status(entry)},
                        "icon": {
                            "ifaces": ["icon"],
                            "value": get_icon(entry, self.request)},
                        "title": {
                            "ifaces": ["action"],
                            "value": entry.get_title_or_id(),
                            "path": path,
                            "action": "content"},
                        "author": {
                            "ifaces": ["action"],
                            "value": content_metadata.get(
                                'silva-extra', 'lastauthor'),
                            "path": path,
                            "action": "properties"},
                        "modified": {
                            "ifaces": ["text"],
                            "value": format_date(content_metadata.get(
                                    'silva-extra', 'modificationtime'))}
                        }})
        assets = []
        for entry in self.get_non_publishable_content():
            path = self.get_content_path(entry)
            asset_metadata = metadata.getMetadata(entry)
            assets.append({
                    "data": self.get_content_data(intids, entry),
                    "columns": {
                        "icon": {
                            "ifaces": ["icon"],
                            "value": get_icon(entry, self.request)},
                        "title": {
                            "ifaces": ["action"],
                            "value": entry.get_title_or_id(),
                            "path": path,
                            "action": "content"},
                        "author": {
                            "ifaces": ["action"],
                            "value": asset_metadata.get('silva-extra', 'lastauthor'),
                            "path": path,
                            "action": "properties"},
                        "modified": {
                            "ifaces": ["text"],
                            "value": format_date(asset_metadata.get(
                                    'silva-extra', 'modificationtime'))}
                        }})
        return {"ifaces": ["listing"],
                "publishables": publishables,
                "assets": assets}


class ActionREST(UIREST):
    """Base class for REST-based listing actions.
    """
    grok.baseclass()
    grok.context(interfaces.IContainer)
    grok.require('silva.ChangeSilvaContent')

    def get_selected_content(self):
        content = self.request.form.get('content')
        if content is not None:
            intids = getUtility(IIntIds)
            if not isinstance(content, list):
                # If only one item have been submitted we won't get a list
                content = [content]
            for intid in content:
                try:
                    yield intid, intids.getObject(int(intid))
                except (KeyError, ValueError):
                    pass

    def payload(self):
        raise NotImplementedError

    def get_notification_elements(self, elements):

        def quotify(element):
            return '"%s"' % element

        count = len(elements)
        if count == 1:
            return quotify(elements[0])
        if count > 4:
            what = _(
                '${count} contents',
                mapping={'count': count})
        else:
            what = _(
                '${contents} and ${content}',
                mapping={'contents': ', '.join(map(quotify, elements[:-1])),
                         'content': quotify(elements[-1])})
        return self.translate(what)

    def notify(self, message, type=u""):
        service = getUtility(IMessageService)
        service.send(message, self.request, namespace=type)

    def POST(self):
        data = self.payload()
        return self.json_response({
                'ifaces': ['result_action'],
                'post_actions': data,
                'notifications': self.get_notifications()})


class DeleteActionREST(ActionREST):
    grok.name('silva.ui.listing.delete')

    def payload(self):
        removed = []
        removed_titles = []
        kept = []
        kept_titles = []
        for intid, content in self.get_selected_content():
            if content.is_deletable():
                removed.append(intid)
                removed_titles.append(content.get_title_or_id())
                self.context.manage_delObjects([content.getId()])
            else:
                kept.append(intid)
                kept_titles.append(content.get_title_or_id())

        elements = self.get_notification_elements
        if removed_titles:
            if kept_titles:
                self.notify(
                    _(u'Deleted ${deleted} but could not delete ${not_deleted}',
                      mapping={'deleted': elements(removed_titles),
                               'not_deleted': elements(kept_titles)}))
            else:
                self.notify(
                    _(u'Deleted ${deleted}',
                      mapping={'deleted': elements(removed_titles)}))
        else:
            self.notify(
                _(u'Could not delete ${not_deleted}',
                  mapping={'not_deleted': elements(kept_titles)}))
        return {'remove': removed}
