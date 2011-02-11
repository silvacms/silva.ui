# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$


from Products.Silva import icon

ICON_SPRITE = {
    'Silva Folder': 'silvafolder',
    'Silva Publication': 'silvapublication',
    'Silva Image': 'silvaimage',
    'Silva Ghost': 'silvaghost',
    'Silva Ghost Folder': 'silvaghostfolder',
    'Silva File': 'silvafile',
    'Silva Find': 'silvafind',
    'Silva Document': 'silvadoc',
    'Silva Link': 'link',
    'Silva Indexer': 'silvaindexer'
    }

def get_icon(content, request):
    if content.meta_type in ICON_SPRITE:
        return ICON_SPRITE[content.meta_type]
    return icon.get_icon_url(content, request)
