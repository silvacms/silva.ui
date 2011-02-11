# -*- coding: utf-8 -*-
# Copyright (c) 2010 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from silva.core import conf as silvaconf
from silva.core.interfaces import ISilvaObject
from silva.core.layout.jquery.interfaces import IJQueryResources

from zope.publisher.browser import applySkin


class ISMIResources(IJQueryResources):

    silvaconf.resource('css/style.css')
    silvaconf.resource('css/smi.css')

    silvaconf.resource('js/json-template.js')
    silvaconf.resource('js/views.js')

    silvaconf.resource('js/obviel.js')
    silvaconf.resource('js/shortcut.js')
    silvaconf.resource('js/jquery.hotkeys.js')
    silvaconf.resource('js/jquery.observehashchange.js')
    silvaconf.resource('js/jquery.jstree.js')
    silvaconf.resource('js/jquery.tablednd-0.5.min.js')

    silvaconf.resource('js/jquery.smi.utils.js')
    silvaconf.resource('js/jquery.smi.dialog.js')
    silvaconf.resource('js/jquery.smi.notification.js')
    silvaconf.resource('js/jquery.smi.selecter.js')
    silvaconf.resource('js/jquery.smi.main.js')
    silvaconf.resource('js/jquery.smi.table.js')
    silvaconf.resource('js/jquery.smi.actionbuttons.js')
    silvaconf.resource('js/jquery.smi.editor.js')
    silvaconf.resource('js/jquery.smi.properties.js')
    silvaconf.resource('js/jquery.smi.history.js')
    silvaconf.resource('js/jquery.smi.access.js')

    silvaconf.resource('js/content.js')
    silvaconf.resource('js/navigation.js')
    silvaconf.resource('js/smi.js')


class SMI(grok.View):
    grok.name('smi.html')
    grok.context(ISilvaObject)
    grok.require('silva.ReadSilvaContent')

    def update(self):
        applySkin(self.request, ISMIResources)
