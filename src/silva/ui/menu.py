# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok

from silva.translations import translate as _
from silva.core.interfaces import IContent, IContainer
from silva.core.interfaces import ISilvaObject, INonPublishable
from silva.ui.interfaces import IMenuItem
from silva.ui.interfaces import IContentMenuItem, IActionMenuItem
from silva.ui.interfaces import IViewMenuItem, ISettingsMenuItem


class MenuItem(grok.Subscription):
    grok.baseclass()
    grok.implements(IMenuItem)
    grok.provides(IMenuItem)
    name = None
    description = None
    screen = None
    action = None

    def available(self):
        return True

    def describe(self, page):
        data = {'name': page.translate(self.name)}
        if self.screen is not None:
            data['screen'] = self.screen
        if self.action is not None:
            data['action'] = self.action
        if self.description is not None:
            data['description'] = page.translate(self.description)
        return data


class ContentMenuItem(MenuItem):
    grok.baseclass()
    grok.implements(IContentMenuItem)
    grok.provides(IContentMenuItem)


class ActionMenuItem(MenuItem):
    grok.baseclass()
    grok.implements(IActionMenuItem)
    grok.provides(IActionMenuItem)


class ViewMenuItem(MenuItem):
    grok.baseclass()
    grok.implements(IViewMenuItem)
    grok.provides(IViewMenuItem)


class SettingsMenuItem(MenuItem):
    grok.baseclass()
    grok.implements(ISettingsMenuItem)
    grok.provides(ISettingsMenuItem)


class EditMenu(ContentMenuItem):
    grok.context(IContent)
    grok.order(10)
    name = _('Edit')
    screen = 'content'


class EditAssetMenu(ContentMenuItem):
    grok.context(INonPublishable)
    grok.order(10)
    name = _(u'Edit')
    screen = 'content'


class ContainerMenu(ContentMenuItem):
    grok.context(IContainer)
    grok.order(10)
    name = _('Content')
    screen = 'content'


class AddMenu(ContentMenuItem):
    grok.context(IContainer)
    grok.order(15)
    name = _('Add')
    screen = 'adding'

    def describe(self, page):
        data = super(AddMenu, self).describe(page)
        data['entries'] = entries = []
        for addable in self.context.get_silva_addables():
            entries.append({
                    'name': addable['name'],
                    'screen': '/'.join((self.screen, addable['name']))})
        return data


class ViewMenu(ViewMenuItem):
    grok.context(ISilvaObject)
    grok.order(20)
    name = _('View')
    description = _(u'view content in a new window')
    action = 'view'


def get_menu_items(content, menu):
    return filter(
        lambda m: m.available(),
        grok.queryOrderedSubscriptions(content, menu))
