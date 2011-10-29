# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok

from silva.ui.rest.base import UIREST
from silva.translations import translate as _
from silva.core.interfaces import IContainer

icon_width = 26
public_state_width = 16
next_state_width = 16
goto_width = 88
move_width = 26


class ColumnsContainerListing(UIREST):
    grok.context(IContainer)
    grok.name('silva.ui.listing.configuration')
    grok.require('silva.ReadSilvaContent')

    def GET(self):
        cfg = {
            'ifaces': {
                'content': ['object'],
                'asset': ['content', 'object'],
                'container': ['content', 'object'],
                'versioned': ['content', 'object']
                },
            'listing': [{
                    'name': 'publishables',
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
                            'caption': self.translate(_(u'Identifier')),
                            'view': 'text',
                            'renameable': {
                                'item_match': [
                                    'not', [
                                        'and',
                                        ['equal', 'access', 'write'],
                                        ['equal', 'status_public', 'published']]
                                    ]},
                            'filterable': True
                            }, {
                            'name': 'title',
                            'caption': self.translate(_(u'Title')),
                            'view': 'text',
                            'renameable': {
                                'item_match': [
                                    'not', [
                                        'and',
                                        ['equal', 'access', 'write'],
                                        ['equal', 'status_public', 'published']]
                                    ]},
                            'filterable': True
                            }, {
                            'name': 'modified',
                            'caption': self.translate(_(u'Modified')),
                            'view': 'text'
                            }, {
                            'name': 'author',
                            'caption': self.translate(_(u'Author')),
                            'view': 'text'
                            }, {
                            'view': 'goto',
                            'index': {
                                'screen': 'content',
                                'caption': self.translate(_(u"Go to"))
                                },
                            'menu': [{
                                    'screen': 'preview',
                                    'caption': self.translate(_(u"Preview"))
                                    }, {
                                    'screen': 'properties',
                                    'caption': self.translate(_(u"Properties")),
                                    'item_match': [
                                        'not', ['equal', 'access', None]]
                                    }, {
                                    'screen': 'publish',
                                    'caption': self.translate(_(u"Publish")),
                                    'item_match': [
                                        'and',
                                        ['not', ['equal', 'access', None]],
                                        ['provides', 'versioned']]
                                    }, {
                                    'screen': 'settings/access',
                                    'caption': self.translate(_(u"Access")),
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
                    }, {
                    'name': 'assets',
                    'layout': {
                        'fixed': {
                            0:icon_width,
                            1:public_state_width,
                            2:next_state_width,
                            7:goto_width,
                            8:move_width}},
                    'columns': [{
                            'name': 'icon',
                            'view': 'action-icon',
                            'action': 'content'
                            }, {
                            'view': None
                            }, {
                            'view': None
                            }, {
                            'name': 'identifier',
                            'caption': self.translate(_(u'Identifier')),
                            'view': 'text',
                            'renameable': True,
                            'filterable': True
                            }, {
                            'name': 'title',
                            'caption': self.translate(_(u'Title')),
                            'view': 'text',
                            'renameable': True,
                            'filterable': True
                            }, {
                            'name': 'modified',
                            'caption': self.translate(_(u'Modified')),
                            'view': 'text'
                            }, {
                            'name': 'author',
                            'caption': self.translate(_(u'Author')),
                            'view': 'text'
                            }, {
                            'view': 'goto',
                            'index': {
                                'screen': 'content',
                                'caption': self.translate(_(u"Go to"))},
                            'menu': [{
                                    'screen': 'preview',
                                    'caption': self.translate(_(u"Preview"))
                                    }, {
                                    'screen': 'properties',
                                    'caption': self.translate(_(u"Properties")),
                                    'item_match': [
                                        'not', ['equal', 'access', None]]
                                    }]
                            }, {
                            'view': None
                            }],
                    'collapsed': True
                    }],
            'actions': [{
                    'available': {'input_mode': True},
                    'actions': [{
                            'title': self.translate(_(u'Cancel')),
                            'icon': 'close',
                            'order': 5,
                            'action': {'input_mode': False},
                            'accesskey': ['ctrl+z', 'esc'],
                            'iface': ['content']
                            }, {
                            'title': self.translate(_(u'Save')),
                            'icon': 'check',
                            'order': 10,
                            'action': {'input_mode': True},
                            'accesskey': ['ctrl+s',],
                            'iface': ['content']
                            }]
                    }, {
                    'available': {'input_mode': False},
                    'actions': [{
                            'title': self.translate(_(u'Cut')),
                            'icon': 'scissors',
                            'accesskey': ['ctrl+x'],
                            'order': 5,
                            'action': {'cut': True},
                            'available': {
                                'content_match': [
                                    'not', ['equal', 'access', None]],
                                'min_items': 1},
                            'ifaces': ['content']
                            }, {
                            'title': self.translate(_(u'Copy')),
                            'icon': 'copy',
                            'accesskey': ['ctrl+c'],
                            'order': 6,
                            'action': {'copy': True},
                            'available': {'min_items': 1},
                            'ifaces': ['content']
                            }, {
                            'title': None,
                            'order': 7,
                            'available': {
                                'content_match': [
                                    'not', ['equal', 'access', None]],
                                'clipboard_min_items': 1},
                            'actions': [{
                                    'title': self.translate(_(u'Paste')),
                                    'icon': 'clipboard',
                                    'accesskey': ['ctrl+v'],
                                    'order': 10,
                                    'action': {
                                        'rest': {
                                            'action': 'paste',
                                            'send': 'clipboard_ids'}},
                                    'ifaces': ['object']
                                    }, {
                                    'title': self.translate(_(u'Paste as Ghost')),
                                    'icon': 'link',
                                    'accesskey': ['ctrl+g'],
                                    'order': 20,
                                    'action': {
                                        'rest': {
                                            'action': 'pasteasghost',
                                            'send': 'clipboard_ids'}},
                                    'ifaces': ['object']
                                    }],
                            'ifaces': ['object']
                            }, {
                            'title': self.translate(_(u'Delete')),
                            'icon': 'trash',
                            'accesskey': ['ctrl+d'],
                            'order': 9,
                            'action': {
                                'rest': {
                                    'action': 'delete',
                                    'send': 'selected_ids',}},
                            'confirmation': {
                                'title': self.translate(_(u"Confirm deletion")),
                                'message': self.translate(_(u'Do you want to delete the selected content(s) ?'))},
                            'available': {
                                'content_match': [
                                    'not', ['equal', 'access', None]],
                                'min_items': 1},
                            'ifaces': ['content']
                            }, {
                            'title': self.translate(_(u'Rename')),
                            'icon': 'pencil',
                            'accesskey': ['ctrl+r'],
                            'order': 10,
                            'action': {
                                'input': {
                                    'action': 'rename',
                                    'values': ['identifier', 'title']}},
                            'available': {
                                'content_match': [
                                    'not', ['equal', 'access', None]],
                                'min_items': 1},
                            'ifaces': ['content']
                            }]
                    }, {
                    'available': {'input_mode': False},
                    'actions': [{
                            'title': None,
                            'available': {'min_items': 1},
                            'actions': [{
                                    'title': self.translate(_(u'Publish')),
                                    'icon': 'check',
                                    'accesskey': ['ctrl+p'],
                                    'order': 10,
                                    'action': {
                                        'rest': {
                                            'action': 'publish',
                                            'send': 'selected_ids'}},
                                    'available': {
                                        'content_match': [
                                            'equal', 'access', 'manage', 'publish'],
                                        'items_match': [
                                            'or',
                                            ['provides', 'container'],
                                            ['equal', 'status_next', 'draft']
                                            ]},
                                    'ifaces': ['container', 'versioned']
                                    }, {
                                    'title': self.translate(_(u'New version')),
                                    'icon': 'document',
                                    'accesskey': ['ctrl+n'],
                                    'order': 15,
                                    'action': {
                                        'rest': {
                                            'action': 'newversion',
                                            'send': 'selected_ids'}},
                                    'active': {},
                                    'available': {
                                        'content_match': [
                                            'not', ['equal', 'access', None]],
                                        'items_match': [
                                            'and',
                                            ['equal', 'status_next', None],
                                            ['equal', 'status_public', 'published', 'closed']
                                            ]},
                                    'ifaces': ['versioned']
                                    }, {
                                    'title': self.translate(_(u'Close')),
                                    'icon': 'close',
                                    'accesskey': ['ctrl+l'],
                                    'order': 20,
                                    'action': {
                                        'rest': {
                                            'action': 'close',
                                            'send': 'selected_ids'}},
                                    'available': {
                                        'content_match': [
                                            'equal', 'access', 'manage', 'publish'],
                                        'items_match': [
                                            'or',
                                            ['provides', 'container'],
                                            ['equal', 'status_public', 'published']
                                            ]},
                                    'ifaces': ['container', 'versioned']
                                    }, {
                                    'title': self.translate(_(u'Approve for future')),
                                    'icon': 'document',
                                    'order': 25,
                                    'action': {
                                        'form': {
                                            'name': 'silva.core.smi.approveforfuture',
                                            'identifier': 'form.prefix.contents'}},
                                    'available': {
                                        'content_match': [
                                            'equal', 'access', 'manage', 'publish'],
                                        'items_match': [
                                            'equal', 'status_next', 'draft']},
                                    'ifaces': ['versioned']
                                    }],
                            'ifaces': ['object']
                            }]}
                        ]}
        return self.json_response(cfg)
