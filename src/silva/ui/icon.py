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
    'Silva Page': 'silva_page',
    'Silva File': 'silva_file',
    'Silva Find': 'silva_find',
    'Silva Folder': 'silva_folder',
    'Silva Ghost Folder': 'silva_ghostfolder',
    'Silva Ghost': 'silva_ghost',
    'Silva Image': 'silva_image',
    'Silva Indexer': 'silva_indexer',
    'Silva Link': 'silva_link',
    'Silva Permanent Redirect Link': 'silva_permanentredirectlink',
    'Silva Publication': 'silva_publication',
    'Silva Root': 'silva_root',
    'Silva Source Asset': 'silva_sourceasset',
    'Silva Agenda Item': 'silva_agendaitem',
    'Silva Agenda Page': 'silva_agendapage',
    'Silva Agenda Filter': 'silva_agendafilter',
    'Silva Agenda Viewer': 'silva_agendaviewer',
    'Silva News Item': 'silva_newsitem',
    'Silva News Page': 'silva_newspage',
    'Silva News Filter': 'silva_newsfilter',
    'Silva News Category Filter': 'silva_newscategoryfilter',
    'Silva News Viewer': 'silva_newsviewer',
    'Silva News Publication': 'silva_newspublication',
    'Silva RSS Aggregator': 'silva_rssaggregator',
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
