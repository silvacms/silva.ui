# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$


from collections import defaultdict

from five import grok
from infrae import rest
from zope.cachedescriptors.property import CachedProperty
from zope.component import getUtility
from zope.i18n import translate
from zope.i18n.interfaces import IUserPreferredLanguages
from zope.intid.interfaces import IIntIds

from Acquisition import aq_parent

from silva.core.interfaces import IRoot
from silva.core.messages.interfaces import IMessageService
from silva.core.views.interfaces import IVirtualSite
from silva.ui.interfaces import IContentMenuItem, IViewMenuItem
from silva.ui.interfaces import ISettingsMenuItem
from silva.ui.icon import get_icon
from silva.ui.menu import get_menu_items

import fanstatic


class PageException(Exception):

    def payload(self, caller):
        raise NotImplementedError


class RedirectToPage(PageException):

    def __init__(self, content, tab='content'):
        self.content = content
        self.tab = tab

    def payload(self, caller):
        return {'ifaces': ['redirect'],
                'path': caller.get_content_path(self.content),
                'tab': self.tab}


class UIREST(rest.REST):
    grok.require('silva.ReadSilvaContent')
    grok.baseclass()

    @CachedProperty
    def root_path(self):
        root = IVirtualSite(self.request).get_root()
        return root.absolute_url_path()

    @CachedProperty
    def language(self):
        adapter = IUserPreferredLanguages(self.request)
        languages = adapter.getPreferredLanguages()
        if languages:
            return languages[0]
        return 'en'

    def translate(self, message):
        return translate(
            message, target_language=self.language, context=self.request)

    def get_content_path(self, content):
            return content.absolute_url_path()[len(self.root_path):]

    def get_notifications(self):
        messages = []
        service = getUtility(IMessageService)
        for message in service.receive_all(self.request):
            data = {'message': self.translate(message.content),
                    'category': message.namespace}
            if message.namespace != 'error':
                data['autoclose'] = 4000
            messages.append(data)
        return messages



def get_resources(request):
    needed = fanstatic.get_needed()
    if not needed.has_resources():
        return None
    if not needed.base_url:
        needed.base_url = IVirtualSite(request).get_root_url()
    data = defaultdict(list)
    url_cache = {}
    for resource in needed.resources():
        library = resource.library
        library_url = url_cache.get(library.name)
        if library_url is None:
            library_url = url_cache[library.name] = needed.library_url(library)
        resource_url =  '/'.join((library_url, resource.relpath))
        data[resource.ext[1:]].append(resource_url)

    data['ifaces'] = ['resources']
    return data



class PageREST(UIREST):
    grok.baseclass()
    grok.require('silva.ReadSilvaContent')

    def get_navigation(self):
        service = getUtility(IIntIds)

        def identifier(content):
            return 'nav' + str(service.register(content))

        parents = []
        content = self.context.get_container()
        while content and not IRoot.providedBy(content):
            parents.append(identifier(content))
            content = aq_parent(content)
        parents.reverse()
        return {'selected': identifier(self.context.get_container()),
                'parents': parents}

    def get_metadata_menu(self, menu):
        tabs = []
        active = None
        current = self.__name__
        if '/' in current:
            current = current.split('/', 1)[0]
        if current.startswith('silva.ui.'):
            current = current[9:]
        for tab in get_menu_items(self.context, menu):
            tabs.append(tab.describe(self))
            if tab.action == current:
                active = tab.action
        return {'ifaces': ['menu'],
                'active': active,
                'entries': tabs}

    def GET(self):
        try:
            payload = self.payload()
        except PageException as error:
            return self.json_response(error.payload(self))

        parent = None
        if not IRoot.providedBy(self.context):
            parent = self.get_content_path(aq_parent(self.context))
        return self.json_response({
            'ifaces': ['content'],
            'content': payload,
            'notifications': self.get_notifications(),
            'navigation': self.get_navigation(),
            'html_resources': get_resources(self.request),
            'metadata': {
                'ifaces': ['metadata'],
                'title': {
                    'ifaces': ['title'],
                    'title': self.context.get_title_or_id(),
                    'icon': get_icon(self.context, self.request),
                    },
                'menu': {
                        'content': self.get_metadata_menu(IContentMenuItem),
                        'view': self.get_metadata_menu(IViewMenuItem),
                        'settings': self.get_metadata_menu(ISettingsMenuItem),
                        },
                'path': self.get_content_path(self.context),
                'up': parent,
                },
            })

    POST = GET
