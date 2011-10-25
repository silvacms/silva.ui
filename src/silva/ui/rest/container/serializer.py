# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from zope.intid.interfaces import IIntIds
from zope.component import getUtility

from silva.core.interfaces import IContainer, ISilvaObject
from silva.core.interfaces import IPublishable, INonPublishable
from silva.core.interfaces import IVersionedContent
from silva.core.interfaces.adapters import IIconResolver

from AccessControl import getSecurityManager
from Products.SilvaMetadata.interfaces import IMetadataService


def get_content_status(content):
    public_version_status = None
    next_version_status = None

    if IVersionedContent.providedBy(content):
        public = content.get_public_version_status()
        if public == 'published':
            public_version_status = 'published'
        elif public == 'closed':
            public_version_status = 'closed'

        next_status = content.get_next_version_status()
        if next_status == 'not_approved':
            next_version_status = 'draft'
        elif next_status == 'request_pending':
            next_version_status = 'pending'
        elif next_status == 'approved':
            next_version_status = 'approved'

    # XXX: define behavior for Folders
    # elif IFolder.providedBy(content):
    #     if content.is_published():
    #         status[0] = 'published'
    #     if content.is_approved():
    #         status[1] = 'approved'
    return (public_version_status, next_version_status)

CONTENT_IFACES = [
    (IVersionedContent, 'versioned'),
    (IContainer, 'container'),
    (INonPublishable, 'asset'),
    (ISilvaObject, 'content')]

def content_ifaces(content):
    for interface, iface in CONTENT_IFACES:
        if interface.providedBy(content):
            return [iface]
    return []


class ContentSerializer(object):
    """Serialize content information into to be JSON.
    """

    def __init__(self, rest, request):
        self.rest = rest
        self.request = request
        service = getUtility(IIntIds)
        self.get_id = service.register
        self.get_content = service.getObject
        self.get_metadata = getUtility(IMetadataService).getMetadataValue
        self.get_icon = IIconResolver(self.request).get_content_url
        self.check_permission = getSecurityManager().checkPermission
        locale = self.request.locale
        formatter = locale.dates.getFormatter('dateTime', 'short')
        self.format_date = lambda d: formatter.format(d.asdatetime())

    def get_access(self, content):
        for access, permission in [
            ('manage', 'Manage Silva content settings'),
            ('publish', 'Approve Silva content'),
            ('write', 'Change Silva content')]:
            if self.check_permission(permission, content):
                return access
        return None

    def __call__(self, content=None, id=None):
        if content is None:
            # XXX Need to handle case where the object
            # disappeared. This can happen in case of conflict error
            # with the invalidation code.
            content = self.get_content(id)
        elif id is None:
            id = self.get_id(content)
        previewable = content.get_previewable()
        author = self.get_metadata(
            previewable, 'silva-extra', 'lastauthor')
        if author is None:
            author = u'-'
        modified = self.get_metadata(
            previewable, 'silva-extra', 'modificationtime')
        if modified is None:
            modified = u'-'
        else:
            modified = self.format_date(modified)
        data = {
            'ifaces': content_ifaces(content),
            'id': id,
            'identifier': content.getId(),
            'path': self.rest.get_content_path(content),
            'icon': self.get_icon(content),
            'title': previewable.get_title_or_id(),
            'author': author,
            'modified': modified,
            'access': self.get_access(content),
            'position': -1}
        if IPublishable.providedBy(content):
            data['status'] = get_content_status(content)
            data['moveable'] = not content.is_default()
        return data

