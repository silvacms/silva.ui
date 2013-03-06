# -*- coding: utf-8 -*-
# Copyright (c) 2012-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from five import grok
from grokcore.chameleon.components import ChameleonPageTemplate
from infrae import rest
from zope.interface import Interface
from zope.component import getUtility

from silva.core.interfaces import IContainer
from silva.core.interfaces import IPublishable, INonPublishable
from silva.translations import translate as _
from silva.ui.interfaces import IJSView, IContainerJSListing
from silva.ui.interfaces import IUIService
from silva.ui.rest.container.serializer import ContentSerializer
from zeam.component import Component, getAllComponents

from Products.Silva.ExtensionRegistry import meta_types_for_interface

ICON_WIDTH = 26
PUBLIC_STATE_WIDTH = 16
NEXT_STATE_WIDTH = 16
GOTO_WIDTH = 88
MOVE_WIDTH = 26


class ContainerJSView(grok.MultiAdapter):
    grok.provides(IJSView)
    grok.adapts(IContainer, Interface)
    grok.name('container')

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def __call__(self, screen):
        serializer = ContentSerializer(screen, self.request)
        items = {}
        for name, listing in getAllComponents(provided=IContainerJSListing):
            items[name] = {
                "ifaces": ["listing-items"],
                "items": map(
                    serializer,
                    listing.list(self.context))}

        return {
            "ifaces": ["listing"],
            "content": serializer(self.context),
            "items": items}


class TemplateContainerListing(rest.REST):
    grok.context(IContainer)
    grok.name('silva.ui.listing.template')
    grok.require('silva.ReadSilvaContent')

    template = ChameleonPageTemplate(filename="templates/listing.cpt")

    def default_namespace(self):
        return {}

    def namespace(self):
        return {'rest': self,
                'request': self.request}

    def GET(self):
        return self.template.render(self)


class FolderConfigurationGenerator(object):
    """Helper object to build the JSON folder configuration.
    """

    def __init__(self, name, title):
        self.name = name
        self.title = title
        self._columns = []
        self._layout = {}

    def add(self, column, width=None):
        if width is not None:
            self._layout[len(self._columns)] = width
        self._columns.append(column)

    def generate(self):
        return {
            'name': self.name,
            'title': self.title,
            'layout': {'fixed': self._layout},
            'collapsed': True,
            'columns': self._columns}


def icon_column(settings, screen, cfg):
    info = {'name': 'icon', 'view': 'icon'}
    if settings.folder_icon_link:
        info.update({'action': 'content'})
    cfg.add(info, ICON_WIDTH)

def workflow_column(settings, screen, cfg):
    status = {'published': screen.translate(
            _(u"Published: this item is published and viewable by the public.")),
              'closed': screen.translate(
            _(u"Closed: this item is no longer accessible to the public.")),
              'pending': screen.translate(
            _(u"Pending: this item is waiting for approval.")),
              'draft': screen.translate(
            _(u"Draft: this item is a working copy.")),
              'approved': screen.translate(
            _(u"Approved: this item is approved for publication at a later time."))}
    info = {'name': 'status_public', 'view': 'workflow', 'status': status}
    cfg.add(info, PUBLIC_STATE_WIDTH)
    info = {'name': 'status_next', 'view': 'workflow', 'status': status}
    cfg.add(info, NEXT_STATE_WIDTH)

def identifier_column(settings, screen, cfg):
    info = {'name': 'identifier',
            'caption': screen.translate(_(u'Identifier')),
            'view': 'text',
            'renameable':
                {'item_match':
                     ['not',
                      ['and',
                       ['equal', 'access', 'write'],
                       ['or',
                        ['equal', 'status_public', 'published'],
                        ['equal', 'status_next', 'approved']]]]},
            'filterable': True}
    if settings.folder_identifier_link:
        info.update({'action': 'content'})
    cfg.add(info)

def title_column(settings, screen, cfg):
    info = {'name': 'title',
            'caption': screen.translate(_(u'Title')),
            'view': 'text',
            'renameable':
                {'item_match':
                     ['or',
                      ['not', ['provides', 'versioned']],
                      ['and',
                       ['equal', 'access', 'write'],
                       ['equal', 'status_next', 'draft']],
                      ['and',
                       ['not', ['equal', 'access', 'write']],
                       ['equal', 'status_next', 'draft', 'pending']],]},
            'filterable': True}
    if settings.folder_title_link:
        info.update({'action': 'preview'})
    cfg.add(info)

def modified_column(settings, screen, cfg):
    info = {'name': 'modified',
            'caption': screen.translate(_(u'Modified')),
            'view': 'text'}
    if settings.folder_modified_link:
        info.update({'action': 'properties',
                     'action_match': ['not', ['equal', 'access', None]]})
    cfg.add(info)

def author_column(settings, screen, cfg):
    info = {'name': 'author',
            'caption': screen.translate(_(u'Author')),
            'view': 'text'}
    if settings.folder_author_link:
        info.update({'action': 'settings',
                     'action_match': ['not', ['equal', 'access', None]]})
    cfg.add(info)

def goto_column(settings, screen, cfg):
    if settings.folder_goto_menu:
        info = {'view': 'goto',
                'index':
                    {'screen': 'content',
                     'caption': screen.translate(_(u"Go to"))},
                'menu':
                    [{'screen': 'preview',
                      'caption': screen.translate(_(u"Preview"))},
                 {'screen': 'properties',
                  'caption': screen.translate(_(u"Properties")),
                  'item_match':
                      ['not', ['equal', 'access', None]]},
                     {'screen': 'publish',
                      'caption': screen.translate(_(u"Publish")),
                      'item_match':
                      ['and',
                       ['not', ['equal', 'access', None]],
                       ['provides', 'versioned']]},
                     {'screen': 'settings/access',
                      'caption': screen.translate(_(u"Access")),
                      'item_match':
                      ['and',
                       ['equal', 'access', 'manage'],
                       ['provides', 'container']]}]}
        cfg.add(info, GOTO_WIDTH)

def move_column(settings, screen, cfg):
    cfg.add({'view': 'move', 'name': 'moveable'}, MOVE_WIDTH)


class ContainerListing(Component):
    grok.implements(IContainerJSListing)
    grok.provides(IContainerJSListing)
    grok.baseclass()
    title = None
    interface = None
    columns = [icon_column,
               workflow_column,
               identifier_column,
               title_column,
               modified_column,
               author_column,
               goto_column,
               move_column]

    @classmethod
    def configuration(cls, screen):
        settings = getUtility(IUIService)
        cfg = FolderConfigurationGenerator(
            name=grok.name.bind().get(cls),
            title=screen.translate(cls.title))
        for column in cls.columns:
            column(settings, screen, cfg)
        return cfg.generate()

    @classmethod
    def list(cls, container):
        return sorted(
            container.objectValues(meta_types_for_interface(cls.interface)),
            key=lambda content: content.getId())


class PublishableContainerListing(ContainerListing):
    grok.name('publishables')
    grok.order(10)
    title = _(u'Structural items')
    interface = [('containers', IContainer), ('publishables', IPublishable)]

    @classmethod
    def configuration(cls, screen):
        cfg = super(PublishableContainerListing, cls).configuration(screen)
        cfg.update({
            'sortable': {
                'content_match': [
                    'not', ['equal', 'access', None]],
                'action': 'order'
                },
            'collapsed': False
            })
        return cfg

    @classmethod
    def list(cls, container):
        default = container.get_default()
        if default is not None:
            yield default
        for content in container.get_ordered_publishables():
            yield content


class NonPublishableContainerListing(ContainerListing):
    grok.name('assets')
    grok.order(100)
    title = _(u'Assets')
    interface = INonPublishable

    @classmethod
    def list(cls, container):
        for content in container.get_non_publishables():
            yield content

