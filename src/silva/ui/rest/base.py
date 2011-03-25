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

from zope.lifecycleevent.interfaces import IObjectAddedEvent
from OFS.interfaces import IObjectWillBeRemovedEvent

from Acquisition import aq_parent

from silva.core.cache.memcacheutils import MemcacheSlice
from silva.core.interfaces import IRoot, IContainer, ISilvaObject
from silva.core.messages.interfaces import IMessageService
from silva.core.views.interfaces import IVirtualSite
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
        parents = []
        content = self.context.get_container()

        def identifier(content):
            return 'nav' + str(service.register(content))

        while content and not IRoot.providedBy(content):
            parents.append(identifier(content))
            content = aq_parent(content)
        parents.reverse()
        return {'selected': identifier(self.context.get_container()),
                'parents': parents,
                'invalidation': 
                    NavigationSynchronizer(self.request).get_changes()}

    def get_metadata_menu(self, menu):
        return {'ifaces': ['menu'],
                'entries': menu.get_entries(self.context).describe(self)}

    def GET(self):
        try:
            payload = self.payload()
        except PageException as error:
            return self.json_response(error.payload(self))

        data = {
            'ifaces': ['content'],
            'content': payload,
            'navigation': self.get_navigation(),
            'metadata': {
                'ifaces': ['metadata'],
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
                }}
        notifications =  self.get_notifications()
        if notifications is not None:
            data['notifications'] = notifications
        resources = get_resources(self.request)
        if resources is not None:
            data['html_resources'] = resources
        if not IRoot.providedBy(self.context):
            data['metadata']['up'] = self.get_content_path(aq_parent(self.context))
        return self.json_response(data)

    POST = GET


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
            return 1

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


@grok.subscribe(ISilvaObject, IObjectAddedEvent)
def register_add(target, event):
    if IContainer.providedBy(target):
        intids = getUtility(IIntIds)
        def nav_id(ob):
            return 'nav' + str(intids.register(ob))

        mem_slice = MemcacheSlice(NavigationSynchronizer.namespace)
        mem_slice.push({'action': 'add',
                        'info': {'parent': nav_id(event.newParent),
                                 'target': nav_id(target),
                                 'position': -1}})


# TODO: add ContentPositionChangedEvent handler

# don't use zope.lifecycleevent.IObjectRemovedEvent because the object
# as no more int id
@grok.subscribe(ISilvaObject, IObjectWillBeRemovedEvent)
def register_remove(target, event):
    if target == event.object and IContainer.providedBy(event.object):
        intids = getUtility(IIntIds)
        def nav_id(ob):
            return 'nav' + str(intids.register(ob))
        mem_slice = MemcacheSlice(NavigationSynchronizer.namespace)
        mem_slice.push({'action': 'remove',
                        'info': {'target': nav_id(target)}})


