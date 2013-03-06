# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

import operator
import threading

from five import grok
from grokcore.component.util import sort_components
from zope.component import getUtility
from zope.interface.interfaces import ISpecification
from zope.intid.interfaces import IIntIds
from zope.lifecycleevent.interfaces import IObjectModifiedEvent
from zope.lifecycleevent.interfaces import IObjectMovedEvent
from transaction.interfaces import ISavepointDataManager, IDataManagerSavepoint
import transaction

from silva.ui.interfaces import IContainerJSListing
from silva.core.cache.memcacheutils import MemcacheSlice
from silva.core.interfaces import IRoot, IContainer, ISilvaObject
from silva.core.interfaces import IPublishable, IVersion
from silva.core.interfaces import IUpgradeTransaction
from silva.core.interfaces.adapters import IOrderManager
from silva.core.views.interfaces import IVirtualSite
from zeam.component import getAllComponents

from Acquisition import aq_parent
from OFS.interfaces import IObjectWillBeMovedEvent
from Products.SilvaMetadata.interfaces import IMetadataModifiedEvent


NAMESPACE = 'silva.listing.invalidation'


def get_interfaces():
    """This collect all the listing interfaces available.
    """

    def get_interface((name, listing)):
        identifier = grok.name.bind().get(listing)
        if not ISpecification.providedBy(listing.interface):
            return map(
                lambda (name, interface): (name, interface, identifier),
                listing.interface)
        return [(str(name), listing.interface, identifier)]

    return reduce(
        operator.add,
        map(
            get_interface,
            sort_components(
                getAllComponents(provided=IContainerJSListing),
                key=operator.itemgetter(1))),
        [])


class InvalidationTransactionSavepoint(object):
    grok.implements(IDataManagerSavepoint)

    def __init__(self, manager, entries):
        self._entries = entries
        self._manager = manager

    def rollback(self):
        self._manager.set_entries(self._entries)


class InvalidationTransaction(threading.local):
    """Push invalidation data when the transaction is committed.
    """
    grok.implements(ISavepointDataManager)

    def __init__(self, manager):
        self.transaction_manager = manager
        self.clear_entries()

    def _follow(self):
        if not self._followed:
            transaction = self.transaction_manager.get()
            transaction.join(self)
            if self._active:
                self._get_id = getUtility(IIntIds).register
                # We could get the interfaces after configuration and
                # cache them forever
                self._interfaces = get_interfaces()
            self._followed = True

    def disable(self):
        self._active = False
        self._follow()

    def add_entry(self, entry):
        self._entries.append(entry)
        self._follow()

    def set_entries(self, entries):
        self._entries = list(entries)

    def clear_entries(self):
        self._entries = []
        self._get_id = None
        self._followed = False
        self._active = True

    def register_entry(self, target, action):
        if not self._active:
            return
        container = aq_parent(target)
        if container is None:
            # The object is not yet in the content tree.
            return
        self._follow()
        listing = None
        interface = None
        for name, interface, identifier in self._interfaces:
            if interface.providedBy(target):
                listing = identifier
                interface = name
                break
        data = {
            'action': action,
            'listing': listing,
            'interface': interface,
            'container': self._get_id(container),
            'content': self._get_id(target)}
        if action != 'remove':
            order = IOrderManager(container, None)
            if order is not None:
                position = order.get_position(target) + 1
                if not position:
                    if not (IPublishable.providedBy(target) and
                            target.is_default()):
                        position = -1
            else:
                position = -1
            data['position'] = position
        self.add_entry(data)

    def sortKey(self):
        # This should let us appear after the Data.fs ...
        return 'z' * 50

    def savepoint(self):
        return InvalidationTransactionSavepoint(self, list(self._entries))

    def commit(self, transaction):
        pass

    def abort(self, transaction):
        self.clear_entries()

    def tpc_begin(self, transaction):
        pass

    def tpc_vote(self, transaction):
        pass

    def tpc_finish(self, transaction):
        memcache = MemcacheSlice(NAMESPACE)
        for entry in self._entries:
            memcache.push(entry)
        self.clear_entries()

    def tpc_abort(self, transaction):
        self.clear_entries()


invalidation_transaction = InvalidationTransaction(transaction.manager)


@grok.subscribe(IUpgradeTransaction)
def disable_upgrade(event):
    invalidation_transaction.disable()


class Invalidation(object):

    def __init__(self, request):
        self.request = request

    def get_cookie_path(self):
        return IVirtualSite(self.request).get_top_level_path()

    def get_client_version(self):
        try:
            cookies = self.request.cookies
            return int(cookies.get(NAMESPACE, None))
        except TypeError:
            return -1

    def set_client_version(self, version):
        response = self.request.response
        response.setCookie(NAMESPACE, str(version), path=self.get_cookie_path())

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


@grok.subscribe(ISilvaObject, IObjectModifiedEvent)
def register_update(target, event):
    invalidation_transaction.register_entry(target, 'update')


@grok.subscribe(IVersion, IObjectModifiedEvent)
def register_version_update(target, event):
    invalidation_transaction.register_entry(
        target.get_silva_object(), 'update')


@grok.subscribe(ISilvaObject, IMetadataModifiedEvent)
def register_title_update(target, event):
    if 'maintitle' in event.changes:
        invalidation_transaction.register_entry(
            target, 'update')


@grok.subscribe(IVersion, IMetadataModifiedEvent)
def register_version_title_update(target, event):
    if 'maintitle' in event.changes:
        invalidation_transaction.register_entry(
            target.get_silva_object(), 'update')


@grok.subscribe(ISilvaObject, IObjectMovedEvent)
def register_move(target, event):
    if event.object != target or not IContainer.providedBy(aq_parent(target)):
        return
    if event.newParent is not None:
        # That was not a delete
        if event.oldParent is event.newParent:
            # This was a rename.
            invalidation_transaction.register_entry(
                target, 'update')
        else:
            # This was an add.
            invalidation_transaction.register_entry(
                target, 'add')


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
                invalidation_transaction.register_entry(
                    target, 'remove')
        elif event.newParent is None:
            # This was a recursive delete
            invalidation_transaction.register_entry(
                target, 'remove')
