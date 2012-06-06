# -*- coding: utf-8 -*-
# Copyright (c) 2012 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from zeam import component
from silva.translations import translate as _
from silva.ui.interfaces import IContainerJSListing
from silva.core.interfaces import IPublishable, INonPublishable

from Products.Silva.ExtensionRegistry import meta_types_for_interface

icon_width = 26
public_state_width = 16
next_state_width = 16
goto_width = 88
move_width = 26


class ContainerListing(component.Component):
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
                    0:icon_width,
                    1:public_state_width,
                    2:next_state_width,
                    7:goto_width,
                    8:move_width
                    }},
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
            'sortable': {
                'content_match': [
                    'not', ['equal', 'access', None]],
                'action': 'order'
                },
            'collapsed': False
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

