# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok

from silva.translations import translate as _
from silva.core.interfaces import IContent, IContainer
from silva.core.interfaces import ISilvaObject, IVersionedContent
from silva.ui.interfaces import IMenuItem, IContentMenuItem
from silva.ui.interfaces import IViewMenuItem, ISettingsMenuItem


class MenuItem(grok.Subscription):
    grok.baseclass()
    grok.implements(IMenuItem)
    grok.provides(IMenuItem)
    name = None
    action = None
    default = False

    def describe(self, page):
        return {'name': page.translate(self.name),
                'action': self.action}


class ContentMenuItem(MenuItem):
    grok.baseclass()
    grok.implements(IContentMenuItem)
    grok.provides(IContentMenuItem)


class ViewMenuItem(MenuItem):
    grok.baseclass()
    grok.implements(IViewMenuItem)
    grok.provides(IViewMenuItem)


class SettingsMenuItem(MenuItem):
    grok.baseclass()
    grok.implements(ISettingsMenuItem)
    grok.provides(ISettingsMenuItem)


class EditTabMenu(ContentMenuItem):
    grok.context(IContent)
    grok.order(10)
    name = _('Edit')
    action = 'content'
    default = True


class ContainerTabMenu(ContentMenuItem):
    grok.context(IContainer)
    grok.order(10)
    name = _('Content')
    action = 'content'
    default = True


class AddTabMenu(ContentMenuItem):
    grok.context(IContainer)
    grok.order(15)
    name = _('Add')
    action = 'adding'

    def describe(self, page):
        data = super(AddTabMenu, self).describe(page)
        data['entries'] = entries = []
        for addable in self.context.get_silva_addables():
            entries.append({
                    'name': addable['name'],
                    'action': '/'.join((self.action, addable['name']))})
        return data


class PropertiesTabMenu(ContentMenuItem):
    grok.context(ISilvaObject)
    grok.order(20)
    name = _('Properties')
    action = 'properties'


class PublishTabMenu(ContentMenuItem):
    grok.context(IVersionedContent)
    grok.order(30)
    name = _('Publish')
    action = 'publish'


class PreviewMenu(ViewMenuItem):
    grok.context(ISilvaObject)
    grok.order(10)
    name = _('Preview')
    action = 'preview'


class ViewMenu(ViewMenuItem):
    grok.context(ISilvaObject)
    grok.order(20)
    name = _('View')
    action = 'view'


class AccessMenu(SettingsMenuItem):
    grok.context(ISilvaObject)
    grok.order(10)
    name = _(u'Access')
    action = 'access'



def get_menu_items(content, menu):
    return grok.queryOrderedSubscriptions(content, menu)
