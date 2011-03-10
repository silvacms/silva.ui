# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok

from silva.core import conf as silvaconf
from silva.core.services.base import SilvaService
from silva.ui.interfaces import IUIService
from zeam.form import silva as silvaforms


class UIService(SilvaService):
    grok.implements(IUIService)
    meta_type = 'Silva UI Service'
    default_service_identifier = 'service_ui'
    silvaconf.icon('service.png')

    manage_options = (
        {'label': 'UI settings',
         'action': 'manage_settings'},) + SilvaService.manage_options


class UISettings(silvaforms.ZMIForm):
    """Update the settings.
    """
    grok.name('manage_settings')
    grok.context(IUIService)

    label = u"UI settings"
    description = u"You can from here modify SMI settings."
    ignoreContent = False
    fields = silvaforms.Fields(IUIService)
    actions = silvaforms.Actions(silvaforms.EditAction())
