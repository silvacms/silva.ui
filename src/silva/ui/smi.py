# -*- coding: utf-8 -*-
# Copyright (c) 2010 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from silva.core.interfaces import ISilvaObject
from silva.ui.interfaces import ISMIResources

from zope.publisher.browser import applySkin


class SMI(grok.View):
    grok.name('smi.html')
    grok.context(ISilvaObject)
    grok.require('silva.ReadSilvaContent')

    def update(self):
        applySkin(self.request, ISMIResources)
