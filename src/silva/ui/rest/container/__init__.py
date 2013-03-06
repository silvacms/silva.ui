# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from five import grok
from infrae import rest
from grokcore.chameleon.components import ChameleonPageTemplate

from silva.core.interfaces import IContainer, ISilvaObject
from silva.core.services.utils import walk_silva_tree
from silva.ui.rest.base import ActionREST
from silva.ui.rest.invalidation import Invalidation
from silva.ui.rest.container.serializer import ContentSerializer
from silva.ui.rest.container.notifier import ContentNotifier
from silva.ui.rest.container.generator import ContentGenerator


class ListingPreview(rest.REST):
    grok.context(ISilvaObject)
    grok.name('silva.ui.listing.preview')
    grok.require('silva.ReadSilvaContent')

    def preview(self):
        return None

    def GET(self):
        return self.json_response({
            'title': self.context.get_title_or_id_editable(),
            'type': self.context.meta_type,
            'preview': self.preview()
            })


class TemplateToolbarContainerListing(rest.REST):
    grok.context(IContainer)
    grok.name('silva.ui.listing.template.toolbar')
    grok.require('silva.ReadSilvaContent')

    template = ChameleonPageTemplate(filename="templates/listingtoolbar.cpt")

    def default_namespace(self):
        return {}

    def namespace(self):
        return {'rest': self,
                'request': self.request}

    def GET(self):
        return self.template.render(self)


def get_container_changes(helper, data):
    serializer = ContentSerializer(helper, helper.request)
    container = serializer.get_id(helper.context)
    invalidations = Invalidation(helper.request)

    added = {}
    changes = {}
    updated = []
    removed = []

    for info in invalidations.get_changes(
        filter_func=lambda change: change['container'] == container):
        if info['action'] == 'remove':
            removed.append(info['content'])
        else:
            if info['listing'] is None:
                continue
            content_data = serializer(id=info['content'])
            content_data['position'] = info['position']
            if info['action'] == 'add':
                added.setdefault(info['listing'], []).append(content_data)
            else:
                updated.append(content_data)

    if removed:
        changes['remove'] = removed
    if updated:
        changes['update'] = updated
    if added:
        changes['add'] = added
    if changes:
        data['content']['actions'].update(changes)


class FolderActionREST(ActionREST):
    """Base class for REST-based listing actions.
    """
    grok.baseclass()
    grok.context(IContainer)
    grok.require('silva.ChangeSilvaContent')

    def get_selected_contents(self, key='content', recursive=False):
        for content in self.get_contents(self.request.form.get(key)):
            if recursive and IContainer.providedBy(content):
                for content in walk_silva_tree(content):
                    yield content
            else:
                yield content

    def payload(self):
        raise NotImplementedError

    def get_payload(self):
        self.notifier = ContentNotifier(self.request)
        self.get_contents = ContentGenerator(self.notifier.notify)

        with self.get_contents:
            actions = self.payload()

        self.need(get_container_changes)
        return {'content': {'ifaces': ['listing-changes'],
                            'actions': actions}}
