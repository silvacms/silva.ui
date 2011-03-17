# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from AccessControl import getSecurityManager
from zExceptions import Unauthorized

from five import grok

from silva.translations import translate as _
from silva.core.interfaces import IContent, IContainer
from silva.core.interfaces import ISilvaObject, INonPublishable
from silva.core.interfaces import IAddableContents
from silva.ui.interfaces import IMenuItem
from silva.ui.interfaces import IContentMenuItem, IActionMenuItem
from silva.ui.interfaces import IViewMenuItem, ISettingsMenuItem


class MenuItem(grok.Subscription):
    grok.baseclass()
    grok.implements(IMenuItem)
    grok.provides(IMenuItem)
    grok.require('silva.ReadSilvaContent')
    name = None
    description = None
    screen = None
    action = None

    def __init__(self, content):
        super(MenuItem, self).__init__(content)
        # For the security check
        self.__parent__ = content

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


class ExpendableMenuItem(MenuItem):
    grok.baseclass()

    def __init__(self, content):
        super(ExpendableMenuItem, self).__init__(content)
        self.submenu = self.get_submenu_items()

    def get_submenu_items(self):
        provides = grok.provides.bind().get(self)
        return get_menu_items(self, provides)

    def available(self):
        return len(self.submenu) != 0

    def describe(self, page):
        data = super(ExpendableMenuItem, self).describe(page)
        data['entries'] = entries = []
        for item in self.submenu:
            if IMenuItem.providedBy(item):
                entries.append(item.describe(page))
            else:
                entries.append(item)
        return data


class ExpendableContentMenuItem(ExpendableMenuItem):
    grok.baseclass()
    grok.implements(IContentMenuItem)
    grok.provides(IContentMenuItem)


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


class AddMenu(ExpendableContentMenuItem):
    grok.context(IContainer)
    grok.order(15)
    name = _('Add')
    screen = 'adding'

    def get_submenu_items(self):
        entries = []
        for addable in IAddableContents(self.context).get_authorized_addables():
            entries.append({
                    'name': addable,
                    'screen': '/'.join((self.screen, addable))})
        return entries


class ViewMenu(ViewMenuItem):
    grok.context(ISilvaObject)
    grok.order(20)
    name = _('View')
    description = _(u'view content in a new window')
    action = 'view'


def get_menu_items(content, menu):
    security = getSecurityManager()

    def validate(menu):
        try:
            security.validate(content, content, None, menu)
            return True
        except Unauthorized:
            return False

    return filter(
        lambda m: validate(m) and m.available(),
        grok.queryOrderedSubscriptions(content, menu))
