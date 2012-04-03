# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from zope.interface import Interface, Attribute
from zope.publisher.interfaces.browser import IDefaultBrowserLayer
from zope import schema

from js import jquery
from js import jqueryui
from infrae.rest.interfaces import IRESTComponent
from zeam import jsontemplate

from silva.core import conf as silvaconf
from silva.core.interfaces import ISilvaLocalService
from silva.core.conf import schema as silvaschema
from silva.translations import translate as _


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
    silvaconf.resource('js/thirdparty/jquery.qtip.js')
    silvaconf.resource('js/thirdparty/jquery.qtip.css')
    silvaconf.resource('js/support.js')
    silvaconf.resource('js/smi.js')
    silvaconf.resource('js/navigation.js')
    silvaconf.resource('js/workspace.js')
    silvaconf.resource('js/form.js')
    silvaconf.resource('js/listingselection.js')
    silvaconf.resource('js/listing.js')
    silvaconf.resource('js/listingtoolbar.js')
    silvaconf.resource('js/listingutils.js')


class ISilvaUITheme(IDefaultBrowserLayer):
    """Default UI theme.
    """
    silvaconf.resource(jqueryui.smoothness)
    silvaconf.resource('css/style.css')
    silvaconf.resource('css/smi.css')
    silvaconf.resource('css/jstree.css')
    silvaconf.resource('css/navigation.css')
    silvaconf.resource('css/actions.css')
    silvaconf.resource('css/forms.css')
    silvaconf.resource('css/listing.css')


# Configuration service

class IUIService(ISilvaLocalService):
    """Configuration settings for the UI.
    """
    maintenance_message = schema.Text(
        title=_(u"Maintenance SMI message"),
        description=_(
            u"Disable access to the SMI and display the specified text."),
        default=u'',
        required=False)
    logo = silvaschema.Bytes(
        title=_(u"Logo"),
        description=_(u"Logo that appear at the top left of the SMI."),
        required=False)
    background = schema.TextLine(
        title=_(u"Background color"),
        required=False)
    listing_preview = schema.Bool(
        title=_(u"Enable content preview in folder listing"),
        description=_(u"This can be disabled in case of performance issue."),
        default=True,
        required=False)


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


# Screens

class IUIScreen(IRESTComponent):
    """Represent a screen in the interface.
    """
