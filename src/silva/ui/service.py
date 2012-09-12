# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok

from silva.core import conf as silvaconf
from silva.core.services.base import SilvaService
from silva.ui.interfaces import IUIService
from silva.translations import translate as _
from zeam.form import silva as silvaforms

from OFS.Image import Image as ZopeImage


class UIService(SilvaService):
    meta_type = 'Silva UI Service'
    grok.implements(IUIService)
    grok.name('service_ui')
    silvaconf.default_service()
    silvaconf.icon('service.png')

    manage_options = (
        {'label': 'UI settings',
         'action': 'manage_settings'},) + SilvaService.manage_options

    # Default values
    name = u"Silva"
    logo = None
    background = None
    public_url = None
    preview_url = None
    listing_preview = True
    maintenance_message = None
    test_mode = False


class UISettings(silvaforms.ZMIForm):
    """Update the settings.
    """
    grok.name('manage_settings')
    grok.context(IUIService)

    label = u"UI settings"
    description = u"You can from here modify SMI settings."
    ignoreContent = False
    fields = silvaforms.Fields(IUIService)

    @silvaforms.action(u'Save')
    def save(self):
        data, errors = self.extractData()
        if errors:
            self.status = _(u"There were errors.")
            return silvaforms.FAILURE
        background = data['background']
        name = data['name']
        logo = data['logo']
        listing_preview = data['listing_preview']
        maintenance_message = data['maintenance_message']
        public_url = data['public_url']
        preview_url = data['preview_url']
        if background != silvaforms.NO_VALUE:
            self.context.background = background
        else:
            self.context.background = None
        if logo != silvaforms.NO_VALUE:
            if logo != silvaforms.NO_CHANGE:
                self.context.logo = ZopeImage('logo', 'SMI Logo', logo)
        else:
            self.context.logo = None
        if maintenance_message != silvaforms.NO_VALUE:
            self.context.maintenance_message = maintenance_message
        else:
            self.context.maintenance_message = None
        if public_url != silvaforms.NO_VALUE:
            self.context.public_url = public_url
        else:
            self.context.public_url = None
        if preview_url != silvaforms.NO_VALUE:
            self.context.preview_url = preview_url
        else:
            self.context.preview_url = None
        self.context.name = name
        self.context.listing_preview = listing_preview
        self.status = u"Modification saved."
        return silvaforms.SUCCESS

