# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from five import grok
import json

from .helper import UIHelper


class ErrorREST(grok.View, UIHelper):
    grok.baseclass()
    grok.name('error.html')

    def render(self):
        data = {'ifaces': ['message'],
                'message': self._render_template()}
        if hasattr(self, 'title'):
            data['title'] = self.translate(self.title)
        self.response.setStatus(400)
        self.response.setHeader('Content-Type', 'application/json')
        return json.dumps({'content': data})

    render.base_method = True

    def __call__(self):
        self.update()
        if self.request.response.getStatus() in (302, 303):
            return
        return self.render()
