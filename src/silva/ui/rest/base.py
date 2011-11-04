# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from collections import defaultdict

from five import grok
from infrae import rest
from zope.cachedescriptors.property import CachedProperty
from zope.component import getUtility, getMultiAdapter
from zope.i18n import translate
from zope.i18n.interfaces import IUserPreferredLanguages
from zope.intid.interfaces import IIntIds
from grokcore.layout.interfaces import ILayout

from Acquisition import aq_parent

from silva.core.interfaces import IRoot, ISilvaObject
from silva.core.interfaces.adapters import IIconResolver
from silva.core.messages.interfaces import IMessageService
from silva.core.views.interfaces import IVirtualSite
from silva.ui.interfaces import IUIScreen
from silva.ui.menu import ContentMenu, ViewMenu, ActionMenu
from silva.ui.rest.exceptions import PageResult, ActionResult, RESTResult
from silva.ui.rest.invalidation import Invalidation
from silva.ui.smi import set_smi_skin

import fanstatic


class Screen(rest.REST):
    grok.context(ISilvaObject)
    grok.name('silva.ui')


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


class UIREST(rest.REST, UIHelper):
    grok.require('silva.ReadSilvaContent')
    grok.baseclass()


@grok.subscribe(UIREST, rest.IRESTMethodPublishedEvent)
def apply_smi_skin(view, event):
    set_smi_skin(view.context, view.request)


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


def get_navigation_changes(request):
    nav_id = lambda id: 'nav' + str(id)
    for change in Invalidation(request).get_changes(
        filter_func=lambda change: change['listing'] == 'container'):
        if change['action'] == 'remove':
            yield {
                'action': 'remove',
                'info': {'target': nav_id(change['content'])}}
        else:
            # Action add or update
            yield {
                'action': change['action'],
                'info': {
                    'parent': nav_id(change['container']),
                    'target': nav_id(change['content']),
                    'position': change['position']}}


class ActionREST(UIREST):
    grok.baseclass()
    grok.require('silva.ReadSilvaContent')

    def get_navigation(self):
        return {'invalidation': list(get_navigation_changes(self.request))}

    def GET(self):
        data = {}
        try:
            data['content'] = self.get_payload()
        except ActionResult as error:
            data['content'] = error.get_payload(self)
        except RESTResult as error:
            return error.get_payload(self)
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
        try:
            screen = self.payload()
        except PageResult as error:
            screen = error.get_payload(self)
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


class PageWithLayoutREST(rest.REST):

    def content(self):
        raise NotImplementedError

    def GET(self):
        self.response.setHeader('Content-Type', 'text/html;charset=utf-8')
        self.layout = getMultiAdapter((self.request, self.context), ILayout)
        return self.layout(self)

    POST = GET
