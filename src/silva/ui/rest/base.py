# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from infrae import rest
from zope.cachedescriptors.property import CachedProperty
from zope.component import getUtility
from zope.intid.interfaces import IIntIds

from silva.core.messages.interfaces import IMessageService
from silva.core.views.interfaces import IVirtualSite
from silva.ui.icon import get_icon
from silva.ui.menu import get_menu_items


class UIREST(rest.REST):
    grok.require('silva.ReadSilvaContent')
    grok.baseclass()

    @CachedProperty
    def root_path(self):
        root = IVirtualSite(self.request).get_root()
        return root.absolute_url_path()

    def get_content_path(self, content):
            return content.absolute_url_path()[len(self.root_path):]

    def get_notifications(self):
        messages = []
        service = getUtility(IMessageService)
        for message in service.receive_all(self.request):
            data = {'message': unicode(message),
                    'category': message.namespace}
            if message.namespace != 'error':
                data['autoclose'] = 4000
            messages.append(data)
        return messages



class PageREST(UIREST):
    grok.baseclass()
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

        return self.json_response({
            'ifaces': ['content'],
            'content': self.payload(),
            'navigation': 'nav' + str(service.register(self.context.get_container())),
            'notifications': self.get_notifications(),
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
                    },
                'path': self.get_content_path(self.context)
                },
            })

    POST = GET
