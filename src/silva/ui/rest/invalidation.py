# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from zope.component import getUtility
from zope.intid.interfaces import IIntIds
from zope.lifecycleevent.interfaces import IObjectModifiedEvent
from zope.lifecycleevent.interfaces import IObjectMovedEvent

from silva.core.cache.memcacheutils import MemcacheSlice
from silva.core.interfaces import IRoot, IContainer, ISilvaObject
from silva.core.interfaces import IPublishable
from silva.core.interfaces import IVersion
from silva.core.interfaces.adapters import IOrderManager
from silva.core.views.interfaces import IVirtualSite

from Acquisition import aq_parent
from OFS.interfaces import IObjectWillBeMovedEvent
from Products.SilvaMetadata.interfaces import IMetadataModifiedEvent


NAMESPACE = 'silva.listing.invalidation'


class Invalidation(object):

    def __init__(self, request):
        self.request = request

    def get_path(self):
        return IVirtualSite(self.request).get_root().absolute_url_path()

    def get_client_version(self):
        try:
            cookies = self.request.cookies
            return int(cookies.get(NAMESPACE, None))
        except TypeError:
            return -1

    def set_client_version(self, version):
        response = self.request.response
        response.setCookie(NAMESPACE, str(version), path=self.get_path())

    def get_changes(self, filter_func=lambda x: True):
        storage = MemcacheSlice(NAMESPACE)
        storage_version = storage.get_index()
        client_version = self.get_client_version()

        if client_version != storage_version:
            self.set_client_version(storage_version)

        pass_two = []
        if client_version < storage_version:
            # Generate entries without duplicate add or update event
            pass_one = []
            updated_entries = set()
            added_entries = set()
            for entry in storage[client_version+1:storage_version+1]:
                if not filter_func(entry):
                    continue
                if entry['action'] != 'remove':
                    if entry['content'] in updated_entries:
                        continue
                    updated_entries.add(entry['content'])
                    if entry['action'] == 'add':
                        added_entries.add(entry['content'])
                pass_one.append(entry)
            # Remove add and update that have a delete event, and
            # delete that have an add.
            deleted_entries = set()
            for entry in reversed(pass_one):
                if entry['action'] != 'remove':
                    if entry['content'] in deleted_entries:
                        continue
                else:
                    deleted_entries.add(entry['content'])
                    if entry['content'] in added_entries:
                        continue
                pass_two.append(entry)
        # Return result in the correct order
        return reversed(pass_two)


def register_change(target, action):
    get_id = getUtility(IIntIds).register
    container = aq_parent(target)
    is_publishable = IPublishable.providedBy(target)
    is_container = False
    listing = 'assets'
    if is_publishable:
        is_container = IContainer.providedBy(target)
        listing = 'publishables'
        if is_container:
            listing = 'container'
    data = {
        'action': action,
        'listing': listing,
        'container': get_id(container),
        'content': get_id(target)}
    if action != 'remove':
        order = IOrderManager(container, None)
        if order is not None:
            position = order.get_position(target) + 1
            if not position:
                if not (is_publishable and target.is_default()):
                    position = -1
        else:
            position = -1
        data['position'] = position
    MemcacheSlice(NAMESPACE).push(data)


@grok.subscribe(ISilvaObject, IObjectModifiedEvent)
def register_update(target, event):
    register_change(target, 'update')


@grok.subscribe(IVersion, IObjectModifiedEvent)
def register_version_update(target, event):
    register_change(target.get_content(), 'update')


@grok.subscribe(ISilvaObject, IMetadataModifiedEvent)
def register_title_update(target, event):
    if 'maintitle' in event.changes:
        register_change(target, 'update')


@grok.subscribe(IVersion, IMetadataModifiedEvent)
def register_version_title_update(target, event):
    if 'maintitle' in event.changes:
        register_change(target.get_content(), 'update')


@grok.subscribe(ISilvaObject, IObjectMovedEvent)
def register_move(target, event):
    if event.object != target or not IContainer.providedBy(aq_parent(target)):
        return
    if event.newParent is not None:
        # That was not a delete
        if event.oldParent is event.newParent:
            # This was a rename.
            register_change(target, 'update')
        else:
            # This was an add.
            register_change(target, 'add')


@grok.subscribe(ISilvaObject, IObjectWillBeMovedEvent)
def register_remove(target, event):
    if not IContainer.providedBy(aq_parent(target)):
        return
    if IRoot.providedBy(event.object):
        # If you delete your Silva root, we don't care about anything.
        return
    if event.oldParent is not None:
        if event.object is target:
            if event.newParent is not event.oldParent:
                # That was a move or a delete, but not a rename
                register_change(target, 'remove')
        elif event.newParent is None:
            # This was a recursive delete
            register_change(target, 'remove')
