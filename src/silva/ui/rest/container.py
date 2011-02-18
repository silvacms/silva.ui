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
from silva.ui.icon import get_icon
from silva.ui.rest.base import PageREST, UIREST

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
                            {'name': 'title', 'caption': 'Title',},
                            {'name': 'author', 'caption': 'Author',},
                            {'name': 'modified', 'caption': 'Modified',}],
                     'sortable': 'icon',
                     'collapsed': False},
                    {'name': 'assets',
                     'columns': [
                            {'name': 'icon',},
                            {'name': 'title', 'caption': 'Title',},
                            {'name': 'author', 'caption': 'Author',},
                            {'name': 'modified', 'caption': 'Modified',}],
                     'collapsed': True},],
                'actions': [
                    {'name': 'cut',
                     'title': 'Cut',
                     'order': 5,
                     'ifaces': ['content']},
                    {'name': 'copy',
                     'title': 'Copy',
                     'order': 6,
                     'ifaces': ['content']},
                    {'name': 'paste',
                     'title': 'Paste',
                     'order': 7,
                     'ifaces': ['content']},
                    {'name': 'delete',
                     'title': 'Delete',
                     'order': 100,
                     'ifaces': ['content']},
                    {'name': 'publish',
                     'title': 'Publish',
                     'order': 51,
                     'ifaces': ['container', 'versioned']},
                    {'name': 'close',
                     'title': 'Close',
                     'order': 52,
                     'ifaces': ['container', 'versioned']},
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
