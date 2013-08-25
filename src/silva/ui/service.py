# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from five import grok
from zope.component import IFactory

from silva.core import conf as silvaconf
from silva.core.services.base import SilvaService
from silva.ui.interfaces import IUIService, IPreviewResolution
from silva.ui.interfaces import IUIGenericSettings, IUIFolderSettings
from silva.translations import translate as _
from zeam.form import silva as silvaforms

from OFS.Image import Image as ZopeImage


class PreviewResolution(object):
    grok.implements(IPreviewResolution)

    def __init__(self, title, resolution):
        self.title = title
        self.resolution = resolution

grok.global_utility(
    PreviewResolution,
    provides=IFactory,
    name=IPreviewResolution.__identifier__,
    direct=True)


class UIService(SilvaService):
    meta_type = 'Silva UI Service'
    grok.implements(IUIService)
    grok.name('service_ui')
    silvaconf.default_service()
    silvaconf.icon('service.png')

    manage_options = (
        {'label': 'UI Generic settings',
         'action': 'manage_settings'},
        {'label': 'UI Folder settings',
         'action': 'manage_folder_settings'},
        ) + SilvaService.manage_options

    # Default settings
    name = u"Silva"
    logo = None
    background = None
    public_url = None
    preview_url = None
    preview_use_resolutions = True
    preview_resolutions = [
        PreviewResolution('Fullscreen', None),
        PreviewResolution('Small', '800x600'),
        PreviewResolution('Regular', '1024x768')]
    maintenance_message = None
    test_mode = False
    smi_access_root = False

    # Default folder settings
    folder_icon_link = True
    folder_icon_preview = True
    folder_identifier_link = True
    folder_title_link = True
    folder_modified_link = True
    folder_author_link = True
    folder_goto_menu = False


class UIGenericSettings(silvaforms.ZMIForm):
    """Update the settings.
    """
    grok.name('manage_settings')
    grok.context(IUIService)

    label = _(u"UI Generic Settings")
    description = _(u"Here you can modify the generic SMI settings.")
    ignoreContent = False
    fields = silvaforms.Fields(IUIGenericSettings)

    @silvaforms.action(u'Save')
    def save(self):
        data, errors = self.extractData()
        if errors:
            self.status = _(u"Sorry, there were errors.")
            return silvaforms.FAILURE
        background = data['background']
        name = data['name']
        logo = data['logo']
        maintenance_message = data['maintenance_message']
        public_url = data['public_url']
        preview_url = data['preview_url']
        preview_use_resolutions = data['preview_use_resolutions']
        preview_resolutions = data['preview_resolutions']
        smi_access_root = data['smi_access_root']
        if background != silvaforms.NO_VALUE:
            self.context.background = background
        else:
            self.context.background = None
        if logo != silvaforms.NO_VALUE:
            if logo != silvaforms.NO_CHANGE:
                self.context.logo = ZopeImage('logo', 'SMI Logo', logo)
        else:
            self.context.logo = None
        if maintenance_message is not silvaforms.NO_VALUE:
            self.context.maintenance_message = maintenance_message
        else:
            self.context.maintenance_message = None
        if public_url is not silvaforms.NO_VALUE:
            self.context.public_url = public_url
        else:
            self.context.public_url = None
        if preview_url is not silvaforms.NO_VALUE:
            self.context.preview_url = preview_url
        else:
            self.context.preview_url = None
        self.context.preview_use_resolutions = preview_use_resolutions
        if preview_resolutions is silvaforms.NO_VALUE:
            preview_resolutions = []
        self.context.preview_resolutions = preview_resolutions
        self.context.smi_access_root = smi_access_root
        self.context.name = name
        self.status = _(u"Modification saved.")
        return silvaforms.SUCCESS


class UIFolderSettings(silvaforms.ZMIForm):
    """Update the settings.
    """
    grok.name('manage_folder_settings')
    grok.context(IUIService)

    label = _(u"UI Folder Settings")
    description = _(u"Here you can modify the settings for folder listings.")
    ignoreContent = False
    fields = silvaforms.Fields(IUIFolderSettings)
    actions = silvaforms.Actions(silvaforms.EditAction())
