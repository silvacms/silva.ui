# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from zope.interface import Interface, Attribute
from zope import schema

from js import jqueryui

from silva.core import conf as silvaconf
from silva.core.editor.interfaces import ICKEditorResources
from silva.core.references.widgets import IReferenceUIResources
from silva.core.interfaces import ISilvaLocalService
from silva.core.conf import schema as silvaschema
from silva.translations import translate as _


# CKeditor already contains jquery and json-template
class ISMIScripts(ICKEditorResources, IReferenceUIResources):
    """All required script to get the SMI working, without any CSS.
    """
    silvaconf.resource('js/thirdparty/obviel.js')
    silvaconf.resource('js/thirdparty/jquery.hotkeys.js')
    silvaconf.resource('js/thirdparty/jquery.observehashchange.js')
    silvaconf.resource('js/thirdparty/jquery.jstree.js')
    silvaconf.resource('js/thirdparty/jquery.tablednd-0.5.min.js')

    silvaconf.resource('js/shortcut.js')
    silvaconf.resource('js/utils.js')
    silvaconf.resource('js/content.js')
    silvaconf.resource('js/content.listing.js')
    silvaconf.resource('js/content.editor.js')
    silvaconf.resource('js/content.form.js')
    silvaconf.resource('js/navigation.js')
    silvaconf.resource('js/smi.js')


class ISMIResources(ISMIScripts):
    """Full SMI resources.
    """
    silvaconf.resource(jqueryui.smoothness)
    silvaconf.resource('css/style.css')
    silvaconf.resource('css/smi.css')
    silvaconf.resource('css/forms.css')


# Configuration service

class IUIService(ISilvaLocalService):
    """Configuration settings for the UI.
    """
    logo = silvaschema.Bytes(
        title=_(u"Logo"),
        description=_(u"Logo that appear at the top left of the SMI"),
        required=False)
    background = schema.TextLine(
        title=_(u"Background color"),
        required=False)


# Menu items

class IMenuItem(Interface):
    """A displayed tab.
    """
    name = Attribute('Name of the menu')
    action = Attribute('Action trigger by the menu')

    def available():
        """Should return true if the item is available.
        """

    def describe():
        """Should return a JSON dictionnary describing the menu item.
        """


class IContentMenuItem(IMenuItem):
    """Menu to work on content (left).
    """


class IActionMenuItem(IMenuItem):
    """Menu that contains action on the content.
    """


class IViewMenuItem(IMenuItem):
    """Menu to work on content (right).
    """


class ISettingsMenuItem(IMenuItem):
    """Menu to work on settings.
    """
