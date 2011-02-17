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
    grok.order(5)
    name = _('Add')
    action = 'add'


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
