# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from zope.interface import Interface, Attribute
from silva.core import conf as silvaconf
from silva.core.editor.interfaces import ICKEditorResources
from silva.core.references.widgets import IReferenceUIResources

# CKeditor already contains jquery and json-template
class ISMIResources(ICKEditorResources, IReferenceUIResources):

    silvaconf.resource('css/style.css')
    silvaconf.resource('css/smi.css')

    silvaconf.resource('js/thirdparty/obviel.js')
    silvaconf.resource('js/thirdparty/shortcut.js')
    silvaconf.resource('js/thirdparty/jquery.hotkeys.js')
    silvaconf.resource('js/thirdparty/jquery.observehashchange.js')
    silvaconf.resource('js/thirdparty/jquery.jstree.js')
    silvaconf.resource('js/thirdparty/jquery.tablednd-0.5.min.js')

    silvaconf.resource('js/jquery.smi.utils.js')
    silvaconf.resource('js/jquery.smi.dialog.js')
    silvaconf.resource('js/jquery.smi.selecter.js')
    silvaconf.resource('js/jquery.smi.main.js')
    silvaconf.resource('js/jquery.smi.table.js')
    silvaconf.resource('js/jquery.smi.actionbuttons.js')

    silvaconf.resource('js/content.js')
    silvaconf.resource('js/content.listing.js')
    silvaconf.resource('js/content.editor.js')
    silvaconf.resource('js/navigation.js')
    silvaconf.resource('js/smi.js')


class ITabMenuItem(Interface):
    """A displayed tab.
    """
    name = Attribute('Name of the tab')
    action = Attribute('Action of the tab')
