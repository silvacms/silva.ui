# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok

from silva.translations import translate as _
from silva.core.interfaces import IContent, IContainer, ISilvaObject, IVersionedContent
from silva.ui.interfaces import IMenuItem, IContentLeftMenuItem, IContentRightMenuItem


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


class ContentLeftMenuItem(MenuItem):
    grok.baseclass()
    grok.implements(IContentLeftMenuItem)
    grok.provides(IContentLeftMenuItem)


class ContentRightMenuItem(MenuItem):
    grok.baseclass()
    grok.implements(IContentRightMenuItem)
    grok.provides(IContentRightMenuItem)


class EditTabMenu(ContentLeftMenuItem):
    grok.context(IContent)
    grok.order(10)
    name = _('Edit')
    action = 'content'
    default = True


class ContainerTabMenu(ContentLeftMenuItem):
    grok.context(IContainer)
    grok.order(10)
    name = _('Content')
    action = 'content'
    default = True


class AddTabMenu(ContentLeftMenuItem):
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


class PropertiesTabMenu(ContentLeftMenuItem):
    grok.context(ISilvaObject)
    grok.order(20)
    name = _('Properties')
    action = 'properties'


class PublishTabMenu(ContentLeftMenuItem):
    grok.context(IVersionedContent)
    grok.order(30)
    name = _('Publish')
    action = 'publish'


class PreviewMenu(ContentRightMenuItem):
    grok.context(ISilvaObject)
    grok.order(10)
    name = _('Preview')
    action = 'preview'


class ViewMenu(ContentRightMenuItem):
    grok.context(ISilvaObject)
    grok.order(20)
    name = _('View')
    action = 'view'


def get_menu_items(content, menu):
    return grok.queryOrderedSubscriptions(content, menu)
