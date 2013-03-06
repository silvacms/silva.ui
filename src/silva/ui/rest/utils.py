# -*- coding: utf-8 -*-
# Copyright (c) 2010-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from five import grok
from zope.component import getUtility
from zope.intid.interfaces import IIntIds

from silva.core.interfaces.adapters import IIconResolver
from silva.core.interfaces import IContainer

from Products.Silva.ExtensionRegistry import meta_types_for_interface

from .base import UIREST
from .helper import get_notifications


class NotificationPoll(UIREST):
    grok.name('silva.ui.poll.notifications')
    grok.context(IContainer)

    def GET(self):
        data = {}
        get_notifications(self, data)
        return self.json_response(data)


class NavigationListing(UIREST):
    grok.context(IContainer)
    grok.name('silva.ui.navigation')

    def update(self):
        self.get_icon = IIconResolver(self.request).get_content_url
        self.get_id = getUtility(IIntIds).register

    def get_node_info(self, node, meta_types):
        is_not_empty = len(node.objectValues(meta_types))
        info = {
            'data': {
                'title': node.get_title_or_id_editable(),
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
        self.update()

        meta_types = meta_types_for_interface(IContainer)
        children = []
        for child in self.context.get_ordered_publishables(IContainer):
            children.append(self.get_node_info(child, meta_types))

        return self.json_response(children)


class RootNavigationListing(NavigationListing):
    grok.context(IContainer)
    grok.name('silva.ui.navigation.root')

    def GET(self):
        self.update()

        interfaces = meta_types_for_interface(IContainer)
        root_info = self.get_node_info(self.context, interfaces)
        return self.json_response(root_info)


