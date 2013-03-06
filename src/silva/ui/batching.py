# -*- coding: utf-8 -*-
# Copyright (c) 2012-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from five import grok
from silva.ui.interfaces import IUIScreen
from silva.ui.rest import Screen
from zeam.utils.batch.interfaces import IBatch, IDateBatch
from zeam.utils.batch.views import Batching
from zeam.utils.batch.date.views import DateBatching
from zope.publisher.interfaces.http import IHTTPRequest
import megrok.pagetemplate as pt


class RESTBatching(Batching):
    grok.adapts(IUIScreen, IBatch, IHTTPRequest)
    keep_query_string = False

    @property
    def url(self):
        component = self.context
        segments = []
        while not isinstance(component, Screen):
            segments.insert(0, component.__name__)
            component = component.__parent__
        return '/'.join(segments)


class RESTBatchView(pt.PageTemplate):
    pt.view(RESTBatching)


class RESTDateBatching(DateBatching):
    grok.adapts(IUIScreen, IDateBatch, IHTTPRequest)
    keep_query_string = False

    @property
    def url(self):
        component = self.context
        segments = []
        while not isinstance(component, Screen):
            segments.insert(0, component.__name__)
            component = component.__parent__
        return '/'.join(segments)


class RESTDateBatchView(pt.PageTemplate):
    pt.view(RESTDateBatching)

