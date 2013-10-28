# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from five import grok
from zope.component import IFactory

from silva.core import conf as silvaconf
from silva.core.services.base import SilvaService
from silva.ui.interfaces import IUIService, IPreviewResolution
from silva.ui.interfaces import IUIGenericSettings, IUIFolderSettings
from silva.ui.menu import MenuItem, ContentMenu
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
    meta_type = 'Silva SMI Service'
    grok.implements(IUIService)
    grok.name('service_ui')
    silvaconf.default_service()
    silvaconf.icon('service.png')

    manage_options = (
        {'label': 'SMI Generic settings',
         'action': 'manage_settings'},
        {'label': 'SMI Folder settings',
         'action': 'manage_folder_settings'},
        ) + SilvaService.manage_options

    # Default settings
    name = u"Silva"
    logo = None
    background = None
    public_url = None
    preview_url = None
    preview_use_resolutions = True
    notifications_life = 4000
    preview_resolutions = [
        PreviewResolution(
            'Fullscreen', None),
        PreviewResolution(
            'Monitor SVGA 4:3 width (800)', '800x600'),
        PreviewResolution(
            'Monitor XGA 4:3 width (1024)', '1024x768'),
        PreviewResolution(
            'Monitor WXGA 16:10 width (1280)', '1280x800'),
        PreviewResolution(
            'Monitor WXGA+ 16:10 width (1440)', '1440x900'),
        PreviewResolution(
            'Monitor WSXGA+ 16:10 width (1680)', '1680x1050'),
        PreviewResolution(
            'Monitor Full HD 16:9 width (1920)', '1920x1080'),
        PreviewResolution(
            'Monitor WQHD 16:9 width (2560)', '2560x1440'),
        PreviewResolution(
            'Apple iPhone 3GS portrait width (320)', '320x480'),
        PreviewResolution(
            'Apple iPhone 4/4S portrait width (640)', '640x960'),
        PreviewResolution(
            'Apple iPhone 5/5C/5S portrait width (640)', '640x1136'),
        PreviewResolution(
            'Samsung Galaxy S2 portrait width (480)', '480x800'),
        PreviewResolution(
            'Samsung Galaxy S3/Nexus portrait width (720)', '720x1280'),
        PreviewResolution(
            'Samsung Galaxy S4/Note 3 portrait width (1080)', '1080x1920'),
        PreviewResolution(
            'Samsung Galaxy Note portrait width (800)', '800x1280'),
        PreviewResolution(
            'Samsung Google Nexus S portrait width (480)', '480x800'),
        PreviewResolution(
            'Sony Xperia P portrait width (540)', '540x960'),
        PreviewResolution(
            'Sony Xperia S Nexus portrait width (720)', '720x1280'),
        PreviewResolution(
            'Sony Xperia Z Nexus portrait width (1080)', '1080x1920'),
        PreviewResolution(
            'LG Nexus 4 portrait width (768)', '768x1280'),
        PreviewResolution(
            'LG Optimus L5 portrait width (320)', '320x480'),
        PreviewResolution(
            'LG Optimus L7 portrait width (480)', '480x800'),
        PreviewResolution(
            'HTC Desire Z portrait width (480)', '480x800'),
        PreviewResolution(
            'HTC Google Nexus One portrait width (480)', '480x800'),
        PreviewResolution(
            'HTC One portrait width (1080)', '1080x1920'),
        PreviewResolution(
            'Nokia Lumia 620/720/820 portrait width (480)', '480x800'),
        PreviewResolution(
            'Nokia Lumia 920 portrait width (768)', '768x1280'),
        PreviewResolution(
            'Apple iPad2/Mini landscape width (1024)', '1024x768'),
        PreviewResolution(
            'Apple iPad 3/4/Air/Mini 2 landscape width (2048)', '2048x1536'),
        PreviewResolution(
            'Sony Xperia Tablet Z landscape width (1920)', '1920x1200'),
        PreviewResolution(
            'Asus Google Nexus 7 landscape width (1280)', '1280x800'),
        PreviewResolution(
            'Asus Google Nexus 7 II landscape width (1920)', '1920x1200'),
        PreviewResolution(
            'Samsung Galaxy Tab 2/3 7.0 landscape width (1024)', '1024x600'),
        PreviewResolution(
            'Samsung Galaxy Tab 2/3 10.1 landscape width (1280)', '1280x800')]

    maintenance_message = None
    test_mode = False
    smi_access_root = False
    smi_link_zmi = True

    # Default folder settings
    folder_icon_link = True
    folder_icon_preview = True
    folder_identifier_link = True
    folder_title_link = True
    folder_modified_link = True
    folder_author_link = True
    folder_goto_menu = False


class SaveUIGenericSettingsAction(silvaforms.Action):
    identifier = 'save'
    title = _('Save')

    def __call__(self, form):
        data, errors = form.extractData()
        if errors:
            form.status = _(u"Sorry, there were errors.")
            return silvaforms.FAILURE
        background = data['background']
        name = data['name']
        logo = data['logo']
        maintenance_message = data['maintenance_message']
        public_url = data['public_url']
        preview_url = data['preview_url']
        preview_use_resolutions = data['preview_use_resolutions']
        preview_resolutions = data['preview_resolutions']
        notifications_life = data['notifications_life']
        smi_access_root = data['smi_access_root']
        smi_link_zmi = data['smi_link_zmi']
        if notifications_life is not silvaforms.NO_VALUE:
            form.context.notifications_life = notifications_life
        else:
            form.context.notifications_life = 4000
        if background != silvaforms.NO_VALUE:
            form.context.background = background
        else:
            form.context.background = None
        if logo != silvaforms.NO_VALUE:
            if logo != silvaforms.NO_CHANGE:
                form.context.logo = ZopeImage('logo', 'SMI Logo', logo)
        else:
            form.context.logo = None
        if maintenance_message is not silvaforms.NO_VALUE:
            form.context.maintenance_message = maintenance_message
        else:
            form.context.maintenance_message = None
        if public_url is not silvaforms.NO_VALUE:
            form.context.public_url = public_url
        else:
            form.context.public_url = None
        if preview_url is not silvaforms.NO_VALUE:
            form.context.preview_url = preview_url
        else:
            form.context.preview_url = None
        form.context.preview_use_resolutions = preview_use_resolutions
        if preview_resolutions is silvaforms.NO_VALUE:
            preview_resolutions = []
        form.context.smi_link_zmi = smi_link_zmi
        form.context.preview_resolutions = preview_resolutions
        form.context.smi_access_root = smi_access_root
        form.context.name = name
        form.status = _(u"Modification saved.")
        return silvaforms.SUCCESS


class UIGenericSettings(silvaforms.ZMIForm):
    """Update the settings.
    """
    grok.name('manage_settings')
    grok.context(IUIService)

    label = _(u"Generic SMI Settings")
    description = _(u"Here you can modify the generic SMI settings.")
    ignoreContent = False
    fields = silvaforms.Fields(IUIGenericSettings)
    actions = silvaforms.Actions(SaveUIGenericSettingsAction())


class UIFolderSettings(silvaforms.ZMIForm):
    """Update the settings.
    """
    grok.name('manage_folder_settings')
    grok.context(IUIService)

    label = _(u"Folder SMI Settings")
    description = _(u"Here you can modify the settings for folder listings.")
    ignoreContent = False
    fields = silvaforms.Fields(IUIFolderSettings)
    actions = silvaforms.Actions(silvaforms.EditAction())


class UIGenericConfiguration(silvaforms.ConfigurationForm):
    """Update the settings.
    """
    grok.name('admin')
    grok.context(IUIService)

    label = _(u"Generic SMI Settings")
    description = _(u"Here you can modify the generic SMI settings.")
    fields = silvaforms.Fields(IUIGenericSettings)
    actions = silvaforms.Actions(
        silvaforms.CancelConfigurationAction(),
        SaveUIGenericSettingsAction())


class UIGenericSettingsMenu(MenuItem):
    grok.adapts(ContentMenu, IUIService)
    grok.order(10)
    name = _('Generic SMI Settings')
    screen = UIGenericConfiguration


class UIFolderConfiguration(silvaforms.ConfigurationForm):
    """Update the settings.
    """
    grok.name('admin-folder')
    grok.context(IUIService)

    label = _(u"SMI Folder Settings")
    description = _(u"Here you can modify the settings for folder listings.")
    fields = silvaforms.Fields(IUIFolderSettings)
    actions = silvaforms.Actions(
        silvaforms.CancelConfigurationAction(),
        silvaforms.EditAction())


class UIFolderSettingsMenu(MenuItem):
    grok.adapts(ContentMenu, IUIService)
    grok.order(15)
    name = _('Folder SMI Settings')
    screen = UIFolderConfiguration
