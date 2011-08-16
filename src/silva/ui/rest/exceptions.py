# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from silva.core.views.interfaces import ISilvaURL
from zope.component import getMultiAdapter


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
                'screen': self.tab}


class RedirectToUrl(PageException):

    def __init__(self, url):
        self.url = url

    def payload(self, caller):
        return {'ifaces': ['view'],
                'url': self.url}


class RedirectToPreview(PageException):

    def __init__(self, url):
        self.url = url

    def payload(self, caller):
        return {'ifaces': ['screen'],
                'screen': {'ifaces': ['preview'],
                           'html_url': self.url}}


class RedirectToContentPreview(RedirectToPreview):

    def __init__(self, content):
        self.content = content

    def payload(self, caller):
        self.url = getMultiAdapter(
            (self.content, caller.request), ISilvaURL).preview()
        return super(RedirectToContentPreview, self).payload(caller)
