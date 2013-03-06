# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from infrae.rest import lookupREST
from infrae.rest.interfaces import IRESTComponent
from zope.component import getMultiAdapter, queryMultiAdapter
from zope.publisher.interfaces.browser import IBrowserPublisher

from silva.core.views.interfaces import IContentURL

clean_path = lambda p: filter(None, p.split('/'))
reversed_clean_path = lambda p: filter(None, reversed(p.split('/')))

def get_tab_path(tab):
    path = []
    while IRESTComponent.providedBy(tab):
        path.extend(reversed_clean_path(tab.__name__))
        tab = tab.__parent__
    return path


class RESTRedirectHandler(Exception):

    def __init__(self, path, clear=False, relative=None):
        path = reversed_clean_path(path)
        path.extend(get_tab_path(relative))
        self.path = path
        self.clear = clear

    def publish(self, origin):
        path = self.path
        request = origin.request
        del request.PARENTS[-1] # Remove the current item and traverse
        if self.clear:
            request.form.clear()
        component = lookupREST(origin.context, request, path.pop())

        while path:
            while path:
                part = path.pop()
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
                    path.extend(reversed(default_path))

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
    DEFAULT_TAB = 'content'

    def __init__(self, content=None, tab=None, sub_tab=None):
        self.content = content
        self.tab = tab
        self.sub_tab = sub_tab

    def get_payload(self, caller):
        content = self.content
        if content is None:
            content = caller.context
        tab = []
        if self.tab is not None:
            tab = clean_path(self.tab)
        if self.sub_tab is not None:
            if self.tab is None:
                tab.extend(reversed(get_tab_path(caller)[:-1]))
            tab.extend(clean_path(self.sub_tab))
        elif self.tab is None:
            tab.extend(clean_path(self.DEFAULT_TAB))
        return {'content': {'ifaces': ['redirect'],
                            'path': caller.get_content_path(content),
                            'screen': '/'.join(tab)}}


class RedirectToUrl(ActionResult):

    def __init__(self, url):
        self.url = url

    def get_payload(self, caller):
        return {'content': {'ifaces': ['view'],
                            'url': self.url}}


class RedirectToPreview(ActionResult):

    def __init__(self, url):
        self.url = url

    def get_payload(self, caller):
        return {'content': {'ifaces': ['screen'],
                            'screen': {'ifaces': ['preview'],
                                       'html_url': self.url}}}


class RedirectToContentPreview(RedirectToPreview):

    def __init__(self, content):
        self.content = content

    def get_payload(self, caller):
        self.url = getMultiAdapter(
            (self.content, caller.request), IContentURL).preview()
        return super(RedirectToContentPreview, self).payload(caller)
