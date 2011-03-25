# -*- coding: utf-8 -*-
# Copyright (c) 2010 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from pkg_resources import iter_entry_points

from five import grok
from silva.core.interfaces import ISilvaObject
from silva.core.views.interfaces import IVirtualSite
from silva.ui.interfaces import IUIService
from silva.fanstatic import need

from zope.component import getUtility
from zope.i18n.interfaces import IUserPreferredLanguages
from zope.interface import Interface
from zope.publisher.browser import applySkin
from zope.traversing.browser import absoluteURL

from zExceptions import Redirect


class SMI(grok.View):
    grok.name('edit')
    grok.context(ISilvaObject)
    grok.require('silva.ReadSilvaContent')

    def update(self):
        # Redirect to the root of the SMI if we are not already
        root = IVirtualSite(self.request).get_root()
        root_url = absoluteURL(root, self.request)
        if root != self.context:
            # Relative path of the content from the root.
            path = self.context.absolute_url_path()[
                len(root.absolute_url_path()):]

            raise Redirect('/'.join((root_url, 'edit')) + '#!' + path)

        # Set the proper SMI skin
        smi_skin_name = self.context.get_root()._smi_skin
        smi_skin = getUtility(Interface, smi_skin_name)
        applySkin(self.request, smi_skin)

        for load_entry in iter_entry_points('silva.ui.resources'):
            resource = load_entry.load()
            need(resource)

        # Customization from service.
        ui_service = getUtility(IUIService)
        if ui_service.logo != None:
            self.logo_url = '/'.join((absoluteURL(ui_service, self.request), 'logo'))
        else:
            self.logo_url = self.static['img']['silva.png']()
        self.background = ui_service.background if ui_service.background else '#7996ac'

        # Prepare values for template
        languages = IUserPreferredLanguages(self.request).getPreferredLanguages()

        self.lang = languages[0] if languages else 'en'
        self.root_url = root_url
