# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from infrae import rest
from zope.component import getUtility

from silva.core.interfaces import IVersionedContent, IContainer
from silva.ui.icon import get_icon
from silva.ui.rest.base import PageREST, UIREST

from Products.SilvaMetadata.interfaces import IMetadataService


class TemplateContainerListing(rest.REST):
    grok.context(IContainer)
    grok.name('silva.ui.listing.template')
    grok.require('silva.ReadSilvaContent')

    template = grok.PageTemplate(filename="templates/listing.pt")

    def default_namespace(self):
        return {}

    def namespace(self):
        return {'rest': self}

    def GET(self):
        return self.template.render(self)


class ColumnsContainerListing(UIREST):
    grok.context(IContainer)
    grok.name('silva.ui.listing.configuration')
    grok.require('silva.ReadSilvaContent')

    def GET(self):
        return self.json_response([
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
                 'collapsed': True},
                ])



def format_date(date):
    if date is not None:
        return date.ISO()
    return ''

def get_content_status(content):
    if IVersionedContent.providedBy(content):
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


class ContainerListing(PageREST):
    grok.context(IContainer)
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
        publishables = []
        service = getUtility(IMetadataService)
        for entry in self.get_publishable_content():
            path = self.get_content_path(entry)
            content = entry.get_previewable()
            metadata = service.getMetadata(content)
            publishables.append(
                {"status": {
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
                        "value": metadata.get('silva-extra', 'lastauthor'),
                        "path": path,
                        "action": "properties"},
                 "modified": {
                        "ifaces": ["text"],
                        "value": format_date(metadata.get('silva-extra', 'modificationtime'))}
                 })
        assets = []
        for entry in self.get_non_publishable_content():
            path = self.get_content_path(entry)
            metadata = service.getMetadata(entry)
            assets.append(
                {"icon": {
                        "ifaces": ["icon"],
                        "value": get_icon(entry, self.request)},
                 "title": {
                        "ifaces": ["action"],
                        "value": entry.get_title_or_id(),
                        "path": path,
                        "action": "content"},
                 "author": {
                        "ifaces": ["action"],
                        "value": metadata.get('silva-extra', 'lastauthor'),
                        "path": path,
                        "action": "properties"},
                 "modified": {
                        "ifaces": ["text"],
                        "value": format_date(metadata.get('silva-extra', 'modificationtime'))}
                 })
        return {"ifaces": ["listing"],
                "publishables": publishables,
                "assets": assets}
