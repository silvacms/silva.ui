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

from zope.lifecycleevent.interfaces import IObjectMovedEvent
from OFS.interfaces import IObjectWillBeMovedEvent

from Acquisition import aq_parent

from silva.core.cache.memcacheutils import MemcacheSlice
from silva.core.interfaces import IRoot, IContainer, ISilvaObject
from silva.core.messages.interfaces import IMessageService
from silva.core.views.interfaces import IVirtualSite
from silva.ui.interfaces import IUIScreen
from silva.ui.icon import get_icon
from silva.ui.menu import ContentMenu, ViewMenu, ActionMenu


import fanstatic


class Screen(rest.REST):
    grok.context(ISilvaObject)
    grok.name('silva.ui')


class PageException(Exception):

    def payload(self, caller):
        raise NotImplementedError


class RedirectToPage(PageException):

    def __init__(self, content, tab='content'):
        self.content = content
        self.tab = tab

    def payload(self, caller):
        return {'content': {'ifaces': ['redirect'],
                            'path': caller.get_content_path(self.content),
                            'tab': self.tab}}


class RedirectToUrl(PageException):

    def __init__(self, url):
        self.url = url

    def payload(self, caller):
        return {'content': {'ifaces': ['view'],
                            'url': self.url}}


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
        return content.absolute_url_path()[len(self.root_path):] or '/'

    def get_notifications(self):
        messages = []
        service = getUtility(IMessageService)
        for message in service.receive_all(self.request):
            data = {'message': self.translate(message.content),
                    'category': message.namespace}
            if message.namespace != 'error':
                data['autoclose'] = 4000
            messages.append(data)
        if not messages:
            return None
        return messages


def get_resources(request):
    needed = fanstatic.get_needed()
    if not needed.has_resources():
        return None
    if not needed.has_base_url():
        needed.set_base_url(IVirtualSite(request).get_root_url())
    data = defaultdict(list)
    url_cache = {}
    for resource in needed.resources():
        library = resource.library
        library_url = url_cache.get(library.name)
        if library_url is None:
            library_url = url_cache[library.name] = needed.library_url(library)
        resource_url =  '/'.join((library_url, resource.relpath))
        data[resource.ext[1:]].append(resource_url)

    return data


class ActionREST(UIREST):
    grok.baseclass()
    grok.require('silva.ReadSilvaContent')

    def get_navigation(self):
        return {'invalidation': NavigationSynchronizer(self.request).get_changes()}

    def GET(self):
        try:
            payload = self.get_payload()
        except PageException as error:
            return self.json_response(error.payload(self))

        data = {
            'content': payload,
            'navigation': self.get_navigation()}
        notifications =  self.get_notifications()
        if notifications is not None:
            data['notifications'] = notifications
        resources = get_resources(self.request)
        if resources is not None:
            data['resources'] = resources
        return self.json_response(data)

    POST = GET


class PageREST(ActionREST):
    grok.baseclass()
    grok.implements(IUIScreen)
    grok.require('silva.ReadSilvaContent')

    def get_navigation(self):
        service = getUtility(IIntIds)
        parents = []
        content = self.context.get_container()

        def identifier(content):
            return 'nav' + str(service.register(content))

        while content:
            parents.append(identifier(content))
            if IRoot.providedBy(content):
                break
            content = aq_parent(content)

        parents.reverse()
        navigation = {'current': parents}
        navigation.update(super(PageREST, self).get_navigation())
        return navigation

    def get_metadata_menu(self, menu):
        return {'ifaces': ['menu'],
                'entries': menu.get_entries(self.context).describe(self)}

    def get_payload(self):
        screen = self.payload()
        metadata = {
            'ifaces': screen.get('ifaces', []),
            'title': {
                'ifaces': ['title'],
                'title': self.context.get_title_or_id(),
                'icon': get_icon(self.context, self.request),
                },
            'menu': {
                'content': self.get_metadata_menu(ContentMenu),
                'view': self.get_metadata_menu(ViewMenu),
                'actions': self.get_metadata_menu(ActionMenu),
                },
            'path': self.get_content_path(self.context),
            }
        if not IRoot.providedBy(self.context):
            metadata['up'] = self.get_content_path(aq_parent(self.context))
        return {'ifaces': ['screen'],
                'metadata': metadata,
                'screen': screen}


class PageWithTemplateREST(PageREST):
    grok.baseclass()

    def default_namespace(self):
        return {}

    def namespace(self):
        return {'rest': self}

    def update(self):
        pass

    def payload(self):
        self.update()
        return {'ifaces': ['form'],
                'html': self.template.render(self)}


class NavigationSynchronizer(object):

    namespace = 'silva.navigation.invalidation'

    def __init__(self, request):
        self.request = request
        self._storage = MemcacheSlice(self.namespace)

    def get_path(self):
        return IVirtualSite(self.request).get_root().absolute_url_path()

    def get_client_version(self):
        try:
            return int(
                self.request.cookies.get(self.namespace, None))
        except TypeError:
            return None

    def set_client_version(self, version):
        self.request.response.setCookie(
            self.namespace, str(version), path=self.get_path())

    def get_changes(self):
        storage_version = self._storage.get_index()
        client_version = self.get_client_version()

        if client_version != storage_version:
            self.set_client_version(storage_version)

        if client_version is not None and client_version < storage_version:
            return self._storage[client_version+1:storage_version+1]

        return []


@grok.subscribe(ISilvaObject, IObjectMovedEvent)
def register_add(target, event):
    if event.object != target:
        return
    if not IContainer.providedBy(target):
        return
    if event.newParent is None:
        return
    if event.oldParent is event.newParent:
        return

    service = getUtility(IIntIds)

    def nav_id(ob):
        return 'nav' + str(service.register(ob))

    mem_slice = MemcacheSlice(NavigationSynchronizer.namespace)
    mem_slice.push({'action': 'add',
                    'info': {'parent': nav_id(event.newParent),
                             'target': nav_id(target),
                             'position': -1}})


@grok.subscribe(ISilvaObject, IObjectWillBeMovedEvent)
def register_remove(target, event):
    if event.object != target:
        return
    if not IContainer.providedBy(target):
        return
    if IRoot.providedBy(target):
        return
    if event.oldParent is None:
        return
    if event.newParent is event.oldParent:
        return

    service = getUtility(IIntIds)

    def nav_id(ob):
        return 'nav' + str(service.register(ob))

    mem_slice = MemcacheSlice(NavigationSynchronizer.namespace)
    mem_slice.push({'action': 'remove',
                    'info': {'target': nav_id(target)}})


