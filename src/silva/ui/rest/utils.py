# -*- coding: utf-8 -*-
# Copyright (c) 2010 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from zope.component import getUtility
from zope.intid.interfaces import IIntIds

from silva.core.interfaces.adapters import IIconResolver
from silva.ui.rest.base import UIREST
from silva.core.interfaces import IContainer, IRoot

from Products.Silva.ExtensionRegistry import meta_types_for_interface




class NotificationPoll(UIREST):
    grok.name('silva.ui.poll.notifications')
    grok.context(IContainer)

    def GET(self):
        return self.json_response(self.get_notifications())


class NavigationListing(UIREST):
    grok.context(IContainer)
    grok.name('silva.ui.navigation')

    def __init__(self, context, request):
        super(NavigationListing, self).__init__(context, request)
        self.get_icon = IIconResolver(self.request).get_content_url
        self.get_id = getUtility(IIntIds).register

    def get_node_info(self, node, interfaces):
        is_not_empty = len(node.objectValues(interfaces))
        info = {
            'data': {
                'title': node.get_title_or_id(),
                'icon': self.get_icon(node)
                },
            'attr': {
                'id': 'nav' + str(self.get_id(node)),
                },
            'metadata': {'path': self.get_content_path(node)}}
        if is_not_empty:
            info['state'] = "closed"
        return info

    def GET(self):
        interfaces = meta_types_for_interface(IContainer)
        children = []
        for child in self.context.objectValues(interfaces):
            children.append(self.get_node_info(child, interfaces))

        return self.json_response(children)


class RootNavigationListing(NavigationListing):
    grok.context(IRoot)
    grok.name('silva.ui.navigation.root')

    def GET(self):
        interfaces = meta_types_for_interface(IContainer)
        root_info = self.get_node_info(self.context, interfaces)
        return self.json_response(root_info)


