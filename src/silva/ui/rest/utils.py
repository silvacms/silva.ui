# -*- coding: utf-8 -*-
# Copyright (c) 2010-2013 Infrae. All rights reserved.
# See also LICENSE.txt

import operator

from five import grok
from zope.component import getUtility
from zope.intid.interfaces import IIntIds

from silva.core.interfaces.adapters import IIconResolver
from silva.core.interfaces import IContainer

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

    def find(self, node, nodes):
        # We should problaby used a catalog here

        def find_(identifier, node):
            children = map(
                lambda node: (self.get_id(node), node),
                node.get_ordered_publishables(IContainer))
            yield identifier, node, children
            if identifier in nodes:
                for identifier, node in children:
                    for entry in find_(identifier, node):
                        yield entry

        for entry in find_(self.get_id(node), node):
            yield entry

    def list(self, node, nodes):
        for identifier, node, children in self.find(node, nodes):
            info = {
                'title': node.get_title_or_id_editable(),
                'id': identifier,
                'state': 'item',
                'loaded': True,
                'path': self.get_content_path(node)}
            icon = self.get_icon(node)
            if '.' in icon:
                info['url'] = icon
            else:
                info['icon'] = icon
            if children:
                loaded = nodes is not None and identifier in nodes
                info['children'] = map(operator.itemgetter(0), children)
                info['state'] = 'open' if loaded else 'closed'
                info['loaded'] = loaded
            yield info

    def GET(self):
        self.update()
        info = list(self.list(self.context, []))
        return self.json_response(info)

    def POST(self):
        self.update()
        nodes = self.request.form.get('recurse', [])
        if not isinstance(nodes, list):
            nodes = [int(nodes)]
        else:
            nodes = map(int, nodes)
        info = list(self.list(self.context, nodes))
        return self.json_response(info)

