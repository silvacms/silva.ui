# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from infrae import rest
from grokcore.chameleon.components import ChameleonPageTemplate

from silva.core.interfaces import IContainer
from silva.core.services.utils import walk_silva_tree
from silva.ui.rest.base import ActionREST
from silva.ui.rest.invalidation import Invalidation
from silva.ui.rest.container.serializer import ContentSerializer
from silva.ui.rest.container.notifier import ContentNotifier
from silva.ui.rest.container.generator import ContentGenerator


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


class ListingPreview(rest.REST):
    grok.baseclass()
    grok.name('silva.ui.listing.preview')
    grok.require('silva.ReadSilvaContent')

    def preview(self):
        raise NotImplementedError

    def GET(self):
        return self.json_response({
            'title': self.context.get_title_or_id(),
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
        return {'rest': self}

    def GET(self):
        return self.template.render(self)


def get_container_changes(helper, data):
    serializer = ContentSerializer(helper, helper.request)
    container = serializer.get_id(helper.context)
    invalidations = Invalidation(helper.request)

    changes = {}
    updated = []
    removed = []
    added_publishables = []
    added_assets = []
    for info in invalidations.get_changes(
        filter_func=lambda change: change['container'] == container):
        if info['action'] == 'remove':
            removed.append(info['content'])
        else:
            content_data = serializer(id=info['content'])
            content_data['position'] = info['position']
            if info['action'] == 'add':
                if info['listing'] == 'assets':
                    added_assets.append(content_data)
                else:
                    added_publishables.append(content_data)
            else:
                updated.append(content_data)

    if removed:
        changes['remove'] = removed
    if updated:
        changes['update'] = updated
    if added_publishables or added_assets:
        changes['add'] = {}
        if added_publishables:
            changes['add']['publishables'] = added_publishables
        else:
            changes['add']['assets'] = added_assets

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


