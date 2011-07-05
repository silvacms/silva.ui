# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from silva.core.views.interfaces import IVirtualSite
from zope.cachedescriptors.property import CachedProperty
from zope.i18n import translate
from zope.i18n.interfaces import IUserPreferredLanguages
import simplejson


class ErrorREST(grok.View):
    grok.baseclass()
    grok.name('error.html')

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

    def render(self):
        data = {'ifaces': ['message'],
                'message': self._render_template()}
        if hasattr(self, 'title'):
            data['title'] = self.translate(self.title)
        self.response.setStatus(400)
        self.response.setHeader('Content-Type', 'application/json')
        return simplejson.dumps({'content': data})

    render.base_method = True

    def __call__(self):
        self.update()
        if self.request.response.getStatus() in (302, 303):
            return
        return self.render()
