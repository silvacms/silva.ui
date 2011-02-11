# -*- coding: utf-8 -*-
# Copyright (c) 2010 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$


from five import grok
from infrae import rest
from silva.core.interfaces import IContainer, ISilvaObject
from zope.intid.interfaces import IIntIds
from zope.component import getUtility

from silva.ui.icon import get_icon
from silva.ui.menu import get_menu_items
from Products.Silva.ExtensionRegistry import meta_types_for_interface


class NavigationListing(rest.REST):
    grok.context(IContainer)
    grok.name('silva.ui.navigation')
    grok.require('silva.ReadSilvaContent')

    def GET(self):
        root = self.context.get_root()
        root_path = root.absolute_url_path()

        def content_path(content):
            return content.absolute_url_path()[len(root_path):]

        children = []
        service = getUtility(IIntIds)
        interfaces = meta_types_for_interface(IContainer)
        for child in self.context.objectValues(interfaces):
            is_not_empty = len(child.objectValues(interfaces))
            info = {
                'data': {
                    'title': child.get_title_or_id(),
                    'icon': get_icon(child, self.request)},
                'attr': {
                    'id': 'nav' + str(service.register(child)),
                    },
                'metadata': {'path': content_path(child)}}
            if is_not_empty:
                info['state'] = "closed"
            children.append(info)
        return self.json_response(children)


class Content(rest.REST):
    grok.context(ISilvaObject)
    grok.name('silva.ui.content')
    grok.require('silva.ReadSilvaContent')

    def GET(self):
        service = getUtility(IIntIds)
        tabs = []
        default_tab = None
        for tab in get_menu_items(self.context):
            tabs.append({'name': unicode(tab.name),
                         'action': tab.action})
            if tab.default:
                default_tab = tab.action
        data = {
            'ifaces': ['content'],
            'id': str(service.register(self.context)),
            'navigation': 'nav' + str(service.register(self.context.get_container())),
            'metadata': {
                'ifaces': ['metadata'],
                'title': {
                    'ifaces': ['title'],
                    'title': self.context.get_title_or_id(),
                    'icon': get_icon(self.context, self.request),
                    },
                'tabs': {
                    'ifaces': ['tabs'],
                    'active': default_tab,
                    'entries': tabs,
                    }
                }
            }
        return self.json_response(data)


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
