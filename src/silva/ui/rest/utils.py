# -*- coding: utf-8 -*-
# Copyright (c) 2010 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from zope.component import getUtility
from zope.intid.interfaces import IIntIds

from silva.ui.icon import get_icon
from silva.ui.rest.base import UIREST
from silva.core.interfaces import IContainer

from Products.Silva.ExtensionRegistry import meta_types_for_interface


class NotificationPoll(UIREST):
    grok.name('silva.ui.poll.notifications')
    grok.context(IContainer)

    def GET(self):
        return self.json_response(self.get_notifications())


class NavigationListing(UIREST):
    grok.context(IContainer)
    grok.name('silva.ui.navigation')

    def GET(self):
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
                'metadata': {'path': self.get_content_path(child)}}
            if is_not_empty:
                info['state'] = "closed"
            children.append(info)
        return self.json_response(children)


