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
            return None

    def set_client_version(self, version):
        response = self.request.response
        response.setCookie(NAMESPACE, str(version), path=self.get_path())

    def get_changes(self):
        storage = MemcacheSlice(NAMESPACE)
        storage_version = storage.get_index()
        client_version = self.get_client_version()

        if client_version != storage_version:
            self.set_client_version(storage_version)

        if client_version is not None and client_version < storage_version:
            for entry in storage[client_version+1:storage_version+1]:
                yield entry


# XXX Do position.

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
def register_vesion_title_update(target, event):
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
    if event.object != target or not IContainer.providedBy(aq_parent(target)):
        return
    if IRoot.providedBy(target):
        return
    if event.oldParent is not None:
        if event.newParent is not event.oldParent:
            # That was a move or a delete, but not a rename
            register_change(target, 'remove')
