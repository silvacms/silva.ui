# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok

from silva.translations import translate as _
from silva.core.interfaces import IContent, IContainer, ISilvaObject, IVersionedContent
from silva.ui.interfaces import ITabMenuItem


class TabMenuItem(grok.Subscription):
    grok.baseclass()
    grok.implements(ITabMenuItem)
    grok.provides(ITabMenuItem)
    name = None
    action = None
    default = False

    def describe(self, page):
        return {'name': unicode(self.name),
                'action': self.action}


class EditTabMenu(TabMenuItem):
    grok.context(IContent)
    grok.order(10)
    name = _('Edit')
    action = 'content'
    default = True


class ContainerTabMenu(TabMenuItem):
    grok.context(IContainer)
    grok.order(10)
    name = _('Content')
    action = 'content'
    default = True


class AddTabMenu(TabMenuItem):
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


class PropertiesTabMenu(TabMenuItem):
    grok.context(ISilvaObject)
    grok.order(20)
    name = _('Properties')
    action = 'properties'


class PublishTabMenu(TabMenuItem):
    grok.context(IVersionedContent)
    grok.order(30)
    name = _('Publish')
    action = 'publish'


def get_menu_items(content):
    return grok.queryOrderedSubscriptions(content, ITabMenuItem)
