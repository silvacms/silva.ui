# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$


from Products.Silva import icon
from five import grok
from silva.ui.interfaces import ISilvaUITheme

ICON_SPRITE = {
    'Silva AutoTOC': 'silva_autotoc',
    'Silva CSV Source': 'silva_csvsource',
    'Silva Document': 'silva_document',
    'Silva File': 'silva_file',
    'Silva Find': 'silva_find',
    'Silva Folder': 'silva_folder',
    'Silva Ghost Folder': 'silva_ghostfolder',
    'Silva Ghost': 'silva_ghost',
    'Silva Image': 'silva_image',
    'Silva Indexer': 'silva_indexer',
    'Silva Link': 'silva_link',
    'Silva Publication': 'silva_publication',
    'Silva Root': 'silva_root',
    }


class SMIIconResolver(icon.IconResolver):
    grok.context(ISilvaUITheme)

    def get_tag(self, content):
        meta_type = getattr(content, 'meta_type', None)
        if meta_type in ICON_SPRITE:
            return """<ins class="icon %s"></ins>""" % ICON_SPRITE[meta_type]
        return super(SMIIconResolver, self).get_tag(content)

    def get_content_url(self, content):
        meta_type = getattr(content, 'meta_type', None)
        if meta_type in ICON_SPRITE:
            return ICON_SPRITE[meta_type]
        return super(SMIIconResolver, self).get_content_url(content)
