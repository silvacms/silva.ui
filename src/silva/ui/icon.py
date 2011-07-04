# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$


from Products.Silva import icon
from five import grok
from silva.ui.interfaces import ISilvaUITheme

ICON_SPRITE = {
    'Silva Folder': 'silvafolder',
    'Silva Root': 'silvalogo',
    'Silva Publication': 'silvapublication',
    'Silva Image': 'silvaimage',
    'Silva Ghost': 'silvaghost',
    'Silva Ghost Folder': 'silvaghostfolder',
    'Silva File': 'silvafile',
    'Silva Find': 'silvafind',
    'Silva Document': 'silvadocument',
    'Silva Link': 'link',
    'Silva Indexer': 'silvaindexer'
    }


class SMIIconResolver(icon.IconResolver):
    grok.context(ISilvaUITheme)

    def get_tag(self, content):
        if content.meta_type in ICON_SPRITE:
            return """<ins class="icon %s"></ins>""" % ICON_SPRITE[content.meta_type]
        return super(SMIIconResolver, self).get_tag(content)

    def get_content_url(self, content):
        if content.meta_type in ICON_SPRITE:
            return ICON_SPRITE[content.meta_type]
        return super(SMIIconResolver, self).get_content_url(content)
