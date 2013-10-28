# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from zope.interface import Interface, Attribute
from zope.publisher.interfaces.browser import IDefaultBrowserLayer
from zope import schema

from js import jquery
from js import jqueryui
from infrae.rest.interfaces import IRESTComponent
from zeam import jsontemplate

from silva.core import conf as silvaconf
from silva.core.interfaces import ISilvaLocalService
from silva.core.interfaces import ISilvaConfigurableService
from silva.core.conf import schema as silvaschema
from silva.translations import translate as _


# Resources configuration for inclusion

class IJSTreeResources(IDefaultBrowserLayer):
    # This is used by other packages
    silvaconf.resource(jquery.jquery)
    silvaconf.resource('js/thirdparty/jquery.jstree.js')
    silvaconf.resource('css/jstree.css')


class ISilvaUIDependencies(IDefaultBrowserLayer):
    """Dependencies required by Silva UI and Silva UI plugins.

    Every Silva UI plugin should depend on those resources.
    """
    silvaconf.resource(jqueryui.jqueryui)
    # This creates bugs in Internet Explorer (due to wrong deps).
    silvaconf.resource(jqueryui.jqueryui_i18n)
    silvaconf.resource(jsontemplate.jsontemplate)
    silvaconf.resource('js/infrae.js')
    silvaconf.resource('js/infrae.deferred.js')
    silvaconf.resource('js/infrae.interfaces.js')
    silvaconf.resource('js/infrae.views.js')
    silvaconf.resource('js/infrae.ui.js')
    silvaconf.resource('js/infrae.keyboard.js')


class ISilvaUI(ISilvaUIDependencies):
    """All required script to get the SMI working, without any CSS.
    """
    silvaconf.resource('js/thirdparty/jquery.jgrowl.js')
    silvaconf.resource('js/thirdparty/jquery.jgrowl.css')
    silvaconf.resource('js/thirdparty/jquery.hotkeys.js')
    silvaconf.resource('js/thirdparty/jquery.observehashchange.js')
    silvaconf.resource('js/thirdparty/jquery.jstree.js')
    silvaconf.resource('js/thirdparty/jquery.tablednd.js')
    silvaconf.resource('js/thirdparty/jquery.tipsy.js')
    silvaconf.resource('js/thirdparty/jquery.tipsy.css')
    silvaconf.resource('js/smi.js')
    silvaconf.resource('js/smi.navigation.js')
    silvaconf.resource('js/smi.workspace.js')
    silvaconf.resource('js/smi.notification.js')
    silvaconf.resource('js/smi.clipboard.js')
    silvaconf.resource('js/smi.ui.js')
    silvaconf.resource('js/smi.form.js')
    silvaconf.resource('js/listing.js')
    silvaconf.resource('js/listing.selection.js')
    silvaconf.resource('js/listing.columns.js')
    silvaconf.resource('js/listing.items.js')
    silvaconf.resource('js/listing.toolbar.js')
    silvaconf.resource('js/listing.footer.js')
    silvaconf.resource('js/listing.preview.js')


class ISilvaUITheme(IDefaultBrowserLayer):
    """Default UI theme.
    """
    silvaconf.resource('jqueryui/jquery-ui-1.8.23.custom.css')
    silvaconf.resource('css/style.css')
    silvaconf.resource('css/smi.css')
    silvaconf.resource('css/jstree.css')
    silvaconf.resource('css/navigation.css')
    silvaconf.resource('css/actions.css')
    silvaconf.resource('css/forms.css')
    silvaconf.resource('css/formwidgets.css')
    silvaconf.resource('css/listing.css')


# Configuration service


class IPreviewResolution(Interface):
    title = schema.TextLine(
        title=_(u'Title'),
        required=True)
    resolution = schema.TextLine(
        title=_(u'Resolution'),
        required=False)


class IUIFolderSettings(Interface):
    """SMI Settings for the folder view.
    """
    folder_icon_link = schema.Bool(
        title=_(u"Clicking on the icon goes to the content/edit view."),
        default=True,
        required=False)
    folder_icon_preview = schema.Bool(
        title=_(u"Enable content preview when hovering over the icon."),
        description=_(u"This can be disabled in case of performance issues."),
        default=True,
        required=False)
    folder_identifier_link = schema.Bool(
        title=_(u"Clicking on the identifier goes to the content/edit view."),
        default=True,
        required=False)
    folder_title_link = schema.Bool(
        title=_(u"Clicking on the title shows the preview."),
        default=True,
        required=False)
    folder_modified_link = schema.Bool(
        title=_(u"Clicking on the modification time goes to properties."),
        default=True,
        required=False)
    folder_author_link = schema.Bool(
        title=_(u"Clicking on the author name goes to settings."),
        default=True,
        required=False)
    folder_goto_menu = schema.Bool(
        title=_(u"Enable goto menu."),
        default=False,
        required=False)


class IUIGenericSettings(Interface):
    """Generic SMI Settings.
    """
    name = schema.TextLine(
        title=_(u"Site name"),
        description=_(u"Appears in the HTML title tag of the SMI."),
        default=u"Silva",
        required=True)
    logo = silvaschema.Bytes(
        title=_(u"Logo"),
        description=_(u"Logo that appears at the top left of the SMI."),
        required=False)
    background = schema.TextLine(
        title=_(u"Background color"),
        description=_(u"Defines the color behind the SMI workspace."),
        required=False)
    public_url = schema.URI(
        title=_(u"Public site URL"),
        description=_(u"Public site URL to use for view mode in the SMI."),
        required=False)
    preview_url = schema.URI(
        title=_(u"Preview site URL"),
        description=_(
            u"Preview site URL to use for preview mode in the SMI."
            u"Authentication is required to access the preview mode, "
            u"so users must be able to authenticate on this URL."),
        required=False)
    preview_use_resolutions = schema.Bool(
        title=_(u"Preview can be changed to different resolutions"),
        default=True,
        required=True)
    preview_resolutions = schema.List(
        title=_(u"Resolutions available for preview"),
        description=_(u"List of resolutions to which the preview area can be "
                      u"resized to."),
        value_type=schema.Object(IPreviewResolution),
        required=True)
    notifications_life = schema.Int(
        title=_(u"Time notifications last"),
        description=_(
            u"Defines the time notifications messages last (in milliseconds). "
            u"A SMI page refresh is needed after changing this."),
        min=0,
        required=False)
    smi_access_root = schema.Bool(
        title=_(u"SMI access Silva root"),
        description=_(
            u"By default the SMI is loaded so you can only edit content in the "
            u"current virtual host root. You might choose to load it so you "
            u"can edit content in the Silva root instead."),
        required=False,
        default=False)
    smi_link_zmi = schema.Bool(
        title=_(u"SMI provides links to ZMI for manager"),
        description=_(u"The user settings provides links to access the"
                      u"underlying ZMI interface and services."),
        required=False,
        default=True)
    maintenance_message = schema.Text(
        title=_(u"Maintenance UI message"),
        description=_(
            u"Disable access to the UI and display the specified HTML."),
        default=u'',
        required=False)


class IUIService(IUIGenericSettings, IUIFolderSettings,
                 ISilvaLocalService, ISilvaConfigurableService):
    """Configuration settings for the UI.
    """
    test_mode = Attribute("Activate test mode.")


# Menu items

class IMenuItem(Interface):
    """A displayed tab.
    """
    name = Attribute('Name of the menu')

    def available():
        """Should return true if the item is available.
        """

    def describe(page, path, actives):
        """Should return a JSON dictionnary describing the menu item.
        """


class IMenu(Interface):
    """Represent a menu.
    """

    def get_menu_items(content):
        """Class method that return the menu items for the given
        content.
        """


class IContentMenu(IMenu):
    """Menu to work on content.
    """


class IActionMenu(IMenu):
    """Menu that contains action on the content.
    """


class IViewMenu(IMenu):
    """Menu to work on content (right).
    """


class IUserMenu(IMenu):
    """Menu that contains links useful for the user.
    """

# Screens


class IUIPlugin(Interface):
    """Plugin on screens. This is a subcriber called with a given
    screen, that can be used to include more data into the response.
    """

    def __call__(screen, data):
        """Include extra information in the response data of the given
        screen.
        """


class IUIScreen(IRESTComponent):
    """Represent a screen in the interface.
    """


class IJSView(Interface):
    """Provides a JSON view to render the content view in the JS UI.
    """

    def __call__(screen):
        """Return the JSON as a Python dictionnary for the given screen.
        """


class IContainerJSListing(Interface):
    """List items from a container.
    """
    name = Attribute(u"Unique name used to refer to listed items")
    title = Attribute(u"User friendly title")
    interface = Attribute(u"Unique interface that the listed items implements")

    def configuration(screen):
        """Return column configuration.
        """

    def list(container):
        """List items (to be serialized) in the container
        """
