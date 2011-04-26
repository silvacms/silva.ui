# -*- coding: utf-8 -*-
# Copyright (c) 2010 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from zope.component import getUtility
from zope.intid.interfaces import IIntIds

from silva.ui.icon import get_icon
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

    def get_node_info(self, node, interfaces, service=None):
        if service is None:
            service = getUtility(IIntIds)
        is_not_empty = len(node.objectValues(interfaces))
        info = {
            'data': {
                'title': node.get_title_or_id(),
                'icon': get_icon(node, self.request)},
            'attr': {
                'id': 'nav' + str(service.register(node)),
                },
            'metadata': {'path': self.get_content_path(node)}}
        if is_not_empty:
            info['state'] = "closed"
        return info

    def GET(self):
        service = getUtility(IIntIds)
        interfaces = meta_types_for_interface(IContainer)
        children = []
        for child in self.context.objectValues(interfaces):
            children.append(self.get_node_info(child, interfaces, service))

        return self.json_response(children)


class RootNavigationListing(NavigationListing):
    grok.context(IRoot)
    grok.name('silva.ui.navigation.root')

    def GET(self):
        service = getUtility(IIntIds)
        interfaces = meta_types_for_interface(IContainer)
        root_info = self.get_node_info(self.context, interfaces, service)
        return self.json_response(root_info)


