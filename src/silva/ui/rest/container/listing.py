# -*- coding: utf-8 -*-
# Copyright (c) 2012 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from grokcore.chameleon.components import ChameleonPageTemplate
from infrae import rest
from zope.interface import Interface

from silva.core.interfaces import IContainer
from silva.core.interfaces import IPublishable, INonPublishable
from silva.translations import translate as _
from silva.ui.interfaces import IJSView, IContainerJSListing
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
        return {'rest': self}

    def GET(self):
        return self.template.render(self)


class ContainerListing(Component):
    grok.implements(IContainerJSListing)
    grok.provides(IContainerJSListing)
    grok.baseclass()
    title = None
    interface = None

    @classmethod
    def configuration(cls, screen):
        return {
            'name': grok.name.bind().get(cls),
            'title': screen.translate(cls.title),
            'layout': {
                'fixed': {
                    0: ICON_WIDTH,
                    1: PUBLIC_STATE_WIDTH,
                    2: NEXT_STATE_WIDTH,
                    7: GOTO_WIDTH,
                    8: MOVE_WIDTH
                    }},
            'collapsed': True,
            'columns': [{
                    'name': 'icon',
                    'view': 'action-icon',
                    'action': 'content'
                    }, {
                    'name': 'status_public',
                    'view': 'workflow'
                    }, {
                    'name': 'status_next',
                    'view': 'workflow'
                    }, {
                    'name': 'identifier',
                    'caption': screen.translate(_(u'Identifier')),
                    'view': 'text',
                    'renameable': {
                        'item_match': [
                            'not', [
                                'and',
                                ['equal', 'access', 'write'],
                                ['or',
                                 ['equal', 'status_public', 'published'],
                                 ['equal', 'status_next', 'approved']]]
                            ]},
                    'filterable': True
                    }, {
                    'name': 'title',
                    'caption': screen.translate(_(u'Title')),
                    'view': 'text',
                    'renameable': {
                        'item_match': [
                            'or',
                            ['not', ['provides', 'versioned']],
                            ['and',
                             ['equal', 'access', 'write'],
                             ['equal', 'status_next', 'draft']],
                            ['and',
                             ['not', ['equal', 'access', 'write']],
                             ['equal', 'status_next', 'draft', 'pending']],
                            ]},
                    'filterable': True
                    }, {
                    'name': 'modified',
                    'caption': screen.translate(_(u'Modified')),
                    'view': 'text'
                    }, {
                    'name': 'author',
                    'caption': screen.translate(_(u'Author')),
                    'view': 'text'
                    }, {
                    'view': 'goto',
                    'index': {
                        'screen': 'content',
                        'caption': screen.translate(_(u"Go to"))
                        },
                    'menu': [{
                            'screen': 'preview',
                            'caption': screen.translate(_(u"Preview"))
                            }, {
                            'screen': 'properties',
                            'caption': screen.translate(_(u"Properties")),
                            'item_match': [
                                'not', ['equal', 'access', None]]
                            }, {
                            'screen': 'publish',
                            'caption': screen.translate(_(u"Publish")),
                            'item_match': [
                                'and',
                                ['not', ['equal', 'access', None]],
                                ['provides', 'versioned']]
                            }, {
                            'screen': 'settings/access',
                            'caption': screen.translate(_(u"Access")),
                            'item_match': [
                                'and',
                                ['equal', 'access', 'manage'],
                                ['provides', 'container']]
                            }]
                    },{
                    'view': 'move',
                    'name': 'moveable'
                    }],
            }

    @classmethod
    def list(cls, container):
        return sorted(
            container.objectValues(meta_types_for_interface(cls.interface)),
            key=lambda content: content.getId())


class PublishableContainerListing(ContainerListing):
    grok.name('publishables')
    grok.order(10)
    title = _(u'Structual content(s)')
    interface = IPublishable

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
    title = _(u'Asset(s)')
    interface = INonPublishable

    @classmethod
    def list(cls, container):
        for content in container.get_non_publishables():
            yield content

