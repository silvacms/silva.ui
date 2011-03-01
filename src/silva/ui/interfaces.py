# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from zope.interface import Interface, Attribute
from silva.core import conf as silvaconf
from silva.core.editor.interfaces import ICKEditorResources
from silva.core.references.widgets import IReferenceUIResources

# CKeditor already contains jquery and json-template
class ISMIScripts(ICKEditorResources, IReferenceUIResources):

    silvaconf.resource('js/thirdparty/obviel.js')
    silvaconf.resource('js/thirdparty/shortcut.js')
    silvaconf.resource('js/thirdparty/jquery.hotkeys.js')
    silvaconf.resource('js/thirdparty/jquery.observehashchange.js')
    silvaconf.resource('js/thirdparty/jquery.jstree.js')
    silvaconf.resource('js/thirdparty/jquery.tablednd-0.5.min.js')

    silvaconf.resource('js/utils.js')
    silvaconf.resource('js/content.js')
    silvaconf.resource('js/content.listing.js')
    silvaconf.resource('js/content.editor.js')
    silvaconf.resource('js/content.form.js')
    silvaconf.resource('js/navigation.js')
    silvaconf.resource('js/smi.js')


class ISMIResources(ISMIScripts):

    silvaconf.resource('css/style.css')
    silvaconf.resource('css/smi.css')


class IMenuItem(Interface):
    """A displayed tab.
    """
    name = Attribute('Name of the menu')
    action = Attribute('Action trigger by the menu')


class IContentMenuItem(IMenuItem):
    """Menu to work on content (left).
    """


class IViewMenuItem(IMenuItem):
    """Menu to work on content (right).
    """


class ISettingsMenuItem(IMenuItem):
    """Menu to work on settings.
    """
