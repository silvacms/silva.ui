# -*- coding: utf-8 -*-
# Copyright (c) 2010 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$


from five import grok
from infrae import rest
from silva.core.interfaces import IContainer
from zope.traversing.browser import absoluteURL
from zope.intid.interfaces import IIntIds
from zope.component import getUtility

from Products.Silva.ExtensionRegistry import meta_types_for_interface


class TreeContentListing(rest.REST):
    grok.context(IContainer)
    grok.name('silva.ui.listing.tree')
    grok.require('silva.ReadSilvaContent')

    def GET(self, identifier=None):
        children = []
        service = getUtility(IIntIds)
        container = self.context
        if identifier is not None:
            container = service.getObject(int(identifier))
        interfaces = meta_types_for_interface(IContainer)
        for child in container.objectValues(interfaces):
            is_not_empty = len(child.objectValues(interfaces))
            info = {
                'data': {
                    'title': child.get_title_or_id(),
                    'icon': 'silvafolder'},
                'metadata': {'url': absoluteURL(child, self.request)}}
            if is_not_empty:
                info['state'] = "closed"
            children.append(info)
        return self.json_response(children)


class ColumnsContainerListing(rest.REST):
    grok.context(IContainer)
    grok.name('silva.ui.listing.columns')
    grok.require('silva.ReadSilvaContent')

    def GET(self):
        return self.json_response([
                {"name": "title", "caption": "Title",},
                {"name": "author", "caption": "Author",},
                {"name": "modified", "caption": "Modified",}])


class ContainerListing(rest.REST):
    grok.context(IContainer)
    grok.name('silva.ui.listing.publishable')
    grok.require('silva.ReadSilvaContent')

    def GET(self):
        contents = []
        for content in self.context.get_ordered_publishables():
            contents.append(
                {"title": {"caption": content.get_title_or_id()}})
        return self.json_response(contents)
