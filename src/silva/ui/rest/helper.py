# -*- coding: utf-8 -*-
# Copyright (c) 2012 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from collections import defaultdict

from zope.component import getUtility, getMultiAdapter
from zope.cachedescriptors.property import CachedProperty
from zope.i18n import translate
from zope.i18n.interfaces import IUserPreferredLanguages

import fanstatic

from silva.core.messages.interfaces import IMessageService
from silva.core.views.interfaces import IVirtualSite, IContentURL

from .invalidation import Invalidation


class UIHelper(object):

    def __init__(self, context, request):
        super(UIHelper, self).__init__(context, request)
        self.context = context
        self.request = request
        site = IVirtualSite(request)
        self.root_path = site.get_root_path()
        self.root_url = site.get_root_url()
        self._providers = []

    def need(self, provider):
        self._providers.append(provider)

    def needed(self):
        return self._providers

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
        adapter = getMultiAdapter((content, self.request), IContentURL)
        path = adapter.url(relative=True)
        return path[len(self.root_path):] or '/'


def get_notifications(helper, data):
    messages = []
    service = getUtility(IMessageService)
    for message in service.receive_all(helper.request):
        info = {'message': helper.translate(message.content),
                'category': message.namespace}
        if message.namespace != 'error':
           info['autoclose'] = 4000
        messages.append(info)
    if not messages:
        return
    data['notifications'] = messages


def get_resources(helper, data):
    needed = fanstatic.get_needed()
    if not needed.has_resources():
        return
    if not needed.has_base_url():
        needed.set_base_url(helper.root_url)
    resources = defaultdict(list)
    url_cache = {}
    for resource in needed.resources():
        library = resource.library
        library_url = url_cache.get(library.name)
        if library_url is None:
            library_url = url_cache[library.name] = needed.library_url(library)
        resource_url =  '/'.join((library_url, resource.relpath))
        resources[resource.ext[1:]].append(resource_url)

    data['resources'] = resources


def get_navigation(helper, data):
    nav_id = lambda id: 'nav' + str(id)
    invalidation = Invalidation(helper.request)

    def collect():
        for change in invalidation.get_changes(
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

    changes = list(collect())
    if changes:
        if 'navigation' not in data:
            data['navigation'] = {}
        data['navigation']['invalidation'] = changes

