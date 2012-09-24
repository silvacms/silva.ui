# -*- coding: utf-8 -*-
# Copyright (c) 2011-2012 Infrae. All rights reserved.
# See also LICENSE.txt

import martian
from grokcore.view.meta.views import TemplateGrokker
from silva.ui.rest.base import PageWithTemplateREST


class PageTemplateGrokker(TemplateGrokker):
    martian.component(PageWithTemplateREST)

    def has_render(self, factory):
        return factory.payload != PageWithTemplateREST.payload

    def has_no_render(self, factory):
        # always has a render method
        return False
