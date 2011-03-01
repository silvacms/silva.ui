# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from zope.publisher.interfaces import INotFound
from silva.ui.interfaces import ISMIScripts


class ErrorREST(grok.View):
    grok.baseclass()
    grok.layer(ISMIScripts)
    grok.name('error.html')

    def message(self):
        template = getattr(self, 'message_template', None)
        if template is not None:
            return template.render(self)

    def render(self):
        data = {'ifaces': ['dialog'],
                'message': self.message()}
        self.response.setHeader('Content-Type', 'application/json')
        return simplejson.dumps(data)


