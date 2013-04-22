# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from AccessControl import getSecurityManager
from zExceptions import Unauthorized

from five import grok
from zope.interface.interfaces import IInterface

from silva.ui.interfaces import IUIScreen
from silva.ui.interfaces import IMenuItem, IMenu
from silva.ui.interfaces import IActionMenu, IViewMenu, IContentMenu, IUserMenu
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
        actives = [page]
        active = page.__parent__
        while IRESTComponent.providedBy(active):
            actives.append(active)
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


class UserMenu(Menu):
    grok.implements(IUserMenu)


class MenuItem(grok.MultiSubscription):
    grok.baseclass()
    grok.implements(IMenuItem)
    grok.provides(IMenuItem)
    grok.require('silva.ReadSilvaContent')
    name = None
    description = None
    screen = None
    action = None
    accesskey = None
    interface = None
    icon = None

    def __init__(self, menu, content):
        self.content = content
        self.menu = menu
        # For the security check
        self.__parent__ = content

    def available(self):
        return True

    def identifier(self):
        if IRESTComponent.implementedBy(self.screen):
            return grok.name.bind().get(self.screen)
        if isinstance(self.screen, basestring):
            return self.screen
        return None

    def describe(self, page, path, actives):
        data = {}
        if self.name is not None:
            data['name'] = page.translate(self.name)
        elif self.logo is not None:
            data['logo'] = self.logo
        if self.screen is not None:
            is_screen = False
            if IRESTComponent.implementedBy(self.screen):
                for active in actives:
                    if isinstance(active, self.screen):
                        data['active'] = True
                        break
                is_screen = IUIScreen.implementedBy(self.screen)
            elif self.interface is not None:
                for active in actives:
                    if self.interface.providedBy(active):
                        data['active'] = True
                        break
                is_screen = self.interface.extends(IUIScreen)
            if is_screen:
                screen = self.identifier()
                data['screen'] = '/'.join((path, screen)) if path else screen
        if self.action is not None:
            data['action'] = self.action
        if self.description is not None:
            data['description'] = page.translate(self.description)
        if self.accesskey is not None:
            data['accesskey'] = self.accesskey
        if self.icon is not None:
            data['icon'] = self.icon
        return data


class LinkMenuItem(MenuItem):
    grok.baseclass()
    target = '_blank'
    trigger = None

    def get_url(self, context, request):
        raise NotImplementedError

    def describe(self, page, path, actives):
        data = {'name': page.translate(self.name),
                'url': self.get_url(page.context, page.request)}
        if self.target is not None:
            data['target'] = self.target
        if self.description is not None:
            data['description'] = page.translate(self.description)
        if self.accesskey is not None:
            data['accesskey'] = self.accesskey
        if self.icon is not None:
            data['icon'] = self.icon
        if self.trigger:
            data['trigger'] = self.trigger
        return data


class ExpendableMenuItem(MenuItem):
    grok.baseclass()

    def __init__(self, menu, content):
        super(ExpendableMenuItem, self).__init__(menu, content)
        self.submenu = self.get_submenu_items()

    def get_submenu_items(self):
        return get_menu_items(self, self.content)

    def available(self):
        # We are available if we have sublevel menu or a screen.
        return ((len(self.submenu) != 0) or
                IUIScreen.implementedBy(self.screen) or
                (IInterface.providedBy(self.interface) and
                 self.interface.extends(IUIScreen)))

    def describe(self, page, path, actives):
        data = super(ExpendableMenuItem, self).describe(page, path, actives)
        if self.submenu:
            # If we have a submenu, add it.
            data['entries'] = entries = []
            entry_path = self.identifier()
            if path:
                entry_path = '/'.join((path, entry_path))
            for item in self.submenu:
                if IMenuItem.providedBy(item):
                    item = item.describe(page, entry_path, actives)
                entries.append(item)
        return data
