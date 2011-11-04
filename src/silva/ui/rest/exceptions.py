# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from silva.core.views.interfaces import ISilvaURL
from zope.component import getMultiAdapter, queryMultiAdapter
from zope.publisher.interfaces.browser import IBrowserPublisher
from infrae.rest import lookupREST


class RESTRedirectHandler(Exception):

    def __init__(self, path, clear=False):
        self.path = path
        self.clear = clear

    def publish(self, origin):
        path = list(self.path.split('/'))
        request = origin.request
        del request.PARENTS[-1] # Remove the current item and traverse
        if self.clear:
            request.form.clear()
        component = lookupREST(origin.context, request, path.pop(0))

        while path:
            while path:
                part = path.pop(0)
                component = request.traverseName(component, part)

            adapter = None
            if IBrowserPublisher.providedBy(component):
                adapter = component
            else:
                adapter = queryMultiAdapter(
                    (component, request), IBrowserPublisher)

            if adapter is not None:
                component, default_path = adapter.browserDefault(request)
                if default_path:
                    path.extend(default_path)

        return component()


class RESTResult(Exception):

    def __init__(self, payload):
        self.__payload = payload

    def get_payload(self, caller):
        return self.__payload(caller)


class ActionResult(RESTResult):
    pass


class PageResult(RESTResult):
    pass


class RedirectToPage(ActionResult):

    def __init__(self, content, tab='content'):
        self.content = content
        self.tab = tab

    def get_payload(self, caller):
        return {'ifaces': ['redirect'],
                'path': caller.get_content_path(self.content),
                'screen': self.tab}


class RedirectToUrl(ActionResult):

    def __init__(self, url):
        self.url = url

    def get_payload(self, caller):
        return {'ifaces': ['view'],
                'url': self.url}


class RedirectToPreview(ActionResult):

    def __init__(self, url):
        self.url = url

    def get_payload(self, caller):
        return {'ifaces': ['screen'],
                'screen': {'ifaces': ['preview'],
                           'html_url': self.url}}


class RedirectToContentPreview(RedirectToPreview):

    def __init__(self, content):
        self.content = content

    def get_payload(self, caller):
        self.url = getMultiAdapter(
            (self.content, caller.request), ISilvaURL).preview()
        return super(RedirectToContentPreview, self).payload(caller)
