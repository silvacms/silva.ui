# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from AccessControl import getSecurityManager
from zExceptions import Unauthorized

from five import grok

from silva.ui.interfaces import IMenuItem, IMenu
from silva.ui.interfaces import IActionMenu, IViewMenu, IContentMenu
from infrae.rest.interfaces import IRESTComponent

def get_menu_items(menu, content):
    security = getSecurityManager()

    def validate(menu):
        try:
            security.validate(content, content, None, menu)
            return True
        except Unauthorized:
            return False

    return filter(
        lambda m: validate(m) and m.available(),
        grok.queryOrderedMultiSubscriptions((menu, content), IMenuItem))


class MenuEntries(list):

    def describe(self, page):
        actives = set([page.__class__])
        active  = page.__parent__
        while IRESTComponent.providedBy(active):
            actives.add(active.__class__)
            active = active.__parent__

        return map(lambda e: e.describe(page, None, actives), self)


class Menu(object):
    grok.implements(IMenu)

    @classmethod
    def get_entries(cls, content):
        return MenuEntries(get_menu_items(cls(), content))


class ContentMenu(Menu):
    grok.implements(IContentMenu)


class ViewMenu(Menu):
    grok.implements(IViewMenu)


class ActionMenu(Menu):
    grok.implements(IActionMenu)


class MenuItem(grok.MultiSubscription):
    grok.baseclass()
    grok.implements(IMenuItem)
    grok.provides(IMenuItem)
    grok.require('silva.ReadSilvaContent')
    name = None
    description = None
    screen = None
    action = None

    def __init__(self, menu, content):
        self.content = content
        self.menu = menu
        # For the security check
        self.__parent__ = content

    def available(self):
        return True

    def describe(self, page, path, actives):
        data = {'name': page.translate(self.name)}
        if self.screen is not None:
            screen = self.screen
            if IRESTComponent.implementedBy(self.screen):
                if screen in actives:
                    data['active'] = True
                screen = grok.name.bind().get(self.screen)
            data['screen'] = '/'.join((path, screen)) if path else screen
        if self.action is not None:
            data['action'] = self.action
        if self.description is not None:
            data['description'] = page.translate(self.description)
        return data


class ExpendableMenuItem(MenuItem):
    grok.baseclass()

    def __init__(self, menu, content):
        super(ExpendableMenuItem, self).__init__(menu, content)
        self.submenu = self.get_submenu_items()

    def get_submenu_items(self):
        return get_menu_items(self, self.content)

    def available(self):
        return len(self.submenu) != 0

    def describe(self, page, path, actives):
        data = super(ExpendableMenuItem, self).describe(page, path, actives)
        data['entries'] = entries = []
        entry_path = data.get('screen')
        if path:
            entry_path = '/'.join((path, entry_path))
        for item in self.submenu:
            if IMenuItem.providedBy(item):
                item = item.describe(page, entry_path, actives)
            entries.append(item)
        return data
