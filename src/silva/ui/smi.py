# -*- coding: utf-8 -*-
# Copyright (c) 2010 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from AccessControl import getSecurityManager

from five import grok
from silva.core.interfaces import ISilvaObject
from silva.ui.interfaces import ISMIResources
from silva.core.views.interfaces import IVirtualSite

from zope.publisher.browser import applySkin
from zope.i18n.interfaces import IUserPreferredLanguages


class SMI(grok.View):
    grok.name('edit')
    grok.context(ISilvaObject)
    grok.require('silva.ReadSilvaContent')

    def update(self):
        # XXX Apply the correct SMI skin
        # XXX redirect at the root of VirtualSite + '#content!/'
        # component.getUtility(Interface, root._smi_skin)
        applySkin(self.request, ISMIResources)

        langs = IUserPreferredLanguages(self.request).getPreferredLanguages()
        self.lang = langs[0] if langs else 'en'
        self.root_url = IVirtualSite(self.request).get_root_url()
        self.can_manage = getSecurityManager().checkPermission(
            'View Management Screens', self.context)
