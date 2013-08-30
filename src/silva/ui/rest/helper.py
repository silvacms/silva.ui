# -*- coding: utf-8 -*-
# Copyright (c) 2012-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from AccessControl.security import checkPermission

from collections import defaultdict

from five import grok
from zope.cachedescriptors.property import Lazy
from zope.component import getUtility, getMultiAdapter
from zope.i18n import translate
from zope.i18n.interfaces import IUserPreferredLanguages
from zope.interface import Interface
from zope.publisher.interfaces.browser import IDefaultBrowserLayer

from silva.fanstatic import get_inclusion, get_needed
from silva.core.messages.interfaces import IMessageService
from silva.core.views.interfaces import IVirtualSite, IContentURL
from silva.core.references.utils import relative_path
from silva.ui.interfaces import IUIService, IUIPlugin

from .invalidation import Invalidation


class UIHelper(object):
    """Generic method used on an UI object.
    """

    def __init__(self, context, request):
        super(UIHelper, self).__init__(context, request)
        self.context = context
        self.request = request
        self._providers = []

    def need(self, provider):
        self._providers.append(provider)

    def needed(self):
        return self._providers + grok.queryMultiSubscriptions(
            (self, self.request), IUIPlugin)

    def _get_root_content_url(self):
        # Redirect to the root of the SMI if we are not already
        site = IVirtualSite(self.request)
        settings = getUtility(IUIService)
        if settings.smi_access_root:
            top_level = site.get_silva_root()
        else:
            top_level = site.get_root()

        # We lookup for the highest container where we have access
        root = self.context.get_container()
        while root != top_level:
            parent = root.get_real_container()
            if (parent is None or
                not checkPermission('silva.ReadSilvaContent', parent)):
                # We don't have access at that level
                break
            root = parent
        return getMultiAdapter((root, self.request), IContentURL)

    @Lazy
    def root_url(self):
        return self._get_root_content_url().url()

    @Lazy
    def root_path(self):
        return self._get_root_content_url().url(relative=True)

    @Lazy
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
        content_url = getMultiAdapter((content, self.request), IContentURL)
        content_path = content_url.url(relative=True).split('/')
        root_path = self.root_path.split('/')
        return '/'.join(relative_path(root_path, content_path))


def get_notifications(helper, data):
    messages = []
    service = getUtility(IMessageService)
    for message in service.receive_all(helper.request):
        info = {'message': helper.translate(message.content),
                'category': message.namespace}
        messages.append(info)
    if not messages:
        return
    data['notifications'] = messages


class NotificationProvider(grok.MultiSubscription):
    grok.implements(IUIPlugin)
    grok.provides(IUIPlugin)
    grok.adapts(Interface, IDefaultBrowserLayer)

    def __init__(self, screen, request):
        self.screen = screen
        self.request = request

    def __call__(self, screen, data):
        return get_notifications(screen, data)


class ResourcesProvider(grok.MultiSubscription):
    grok.implements(IUIPlugin)
    grok.provides(IUIPlugin)
    grok.adapts(Interface, IDefaultBrowserLayer)

    def __init__(self, screen, request):
        self.screen = screen
        self.request = request

    def __call__(self, screen, data):
        needed = get_needed()
        if not needed.has_resources():
            return
        if not needed.has_base_url():
            needed.set_base_url(screen.root_url)
        urls = defaultdict(list)
        for resource in get_inclusion(needed).resources:
            library_url = needed.library_url(resource.library)
            resource_url =  '/'.join((library_url, resource.relpath))
            urls[resource.ext[1:]].append(resource_url)

        data['resources'] = urls


class NavigationProvider(grok.MultiSubscription):
    grok.implements(IUIPlugin)
    grok.provides(IUIPlugin)
    grok.adapts(Interface, IDefaultBrowserLayer)

    def __init__(self, screen, request):
        self.screen = screen
        self.request = request

    def __call__(self, screen, data):
        nav_id = lambda id: 'nav' + str(id)
        invalidation = Invalidation(self.request)

        def collect():
            for change in invalidation.get_changes(
                filter_func=lambda change: change['interface'] == 'containers'):
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

        changes = list(collect())
        if changes:
            if 'navigation' not in data:
                data['navigation'] = {}
            data['navigation']['invalidation'] = changes
