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
from silva.core.interfaces.adapters import IIconResolver
from silva.core.messages.interfaces import IMessageService
from silva.core.views.interfaces import IVirtualSite
from silva.ui.smi import set_smi_skin
from silva.ui.interfaces import IUIScreen
from silva.ui.menu import ContentMenu, ViewMenu, ActionMenu

import fanstatic


class Screen(rest.REST):
    grok.context(ISilvaObject)
    grok.name('silva.ui')


class PageException(Exception):

    def payload(self, caller):
        raise NotImplementedError


class UIHelper(object):

    def __init__(self, context, request):
        super(UIHelper, self).__init__(context, request)
        self.context = context
        self.request = request

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

    @CachedProperty
    def root_path(self):
        root = IVirtualSite(self.request).get_root()
        return root.absolute_url_path()

    def get_content_path(self, content):
        return content.absolute_url_path()[len(self.root_path):] or '/'


class RedirectToPage(PageException):

    def __init__(self, content, tab='content'):
        self.content = content
        self.tab = tab

    def payload(self, caller):
        return {'ifaces': ['redirect'],
                'path': caller.get_content_path(self.content),
                'screen': self.tab}


class RedirectToUrl(PageException):

    def __init__(self, url):
        self.url = url

    def payload(self, caller):
        return {'ifaces': ['view'],
                'url': self.url}


class UIREST(rest.REST, UIHelper):
    grok.require('silva.ReadSilvaContent')
    grok.baseclass()

    def __init__(self, context, request):
        set_smi_skin(context, request)
        super(UIREST, self).__init__(context, request)


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
        data = {}
        try:
            data['content'] = self.get_payload()
        except PageException as error:
            data['content'] = error.payload(self)
        else:
            data['navigation'] = self.get_navigation()
            resources = get_resources(self.request)
            if resources is not None:
                data['resources'] = resources

        notifications =  self.get_notifications()
        if notifications is not None:
            data['notifications'] = notifications
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
        entries = menu.get_entries(self.context).describe(self)
        if not entries:
            return None
        return {'ifaces': ['menu'], 'entries': entries}

    def get_payload(self):
        screen = self.payload()
        metadata = {
            'ifaces': screen.get('ifaces', []),
            'title': {
                'ifaces': ['title'],
                'title': self.context.get_title_or_id(),
                'icon': IIconResolver(self.request).get_content_url(self.context),
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
        return {'rest': self,
                'context': self.context,
                'request': self.request}

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


