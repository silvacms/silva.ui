# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

import cgi

from zope.intid.interfaces import IIntIds
from zope.component import getUtility

from silva.core.interfaces import IContainer, ISilvaObject
from silva.core.interfaces import IPublishable, INonPublishable
from silva.core.interfaces import IVersionedObject
from silva.core.interfaces.adapters import IIconResolver
from silva.core.services.interfaces import IMemberService
from silva.translations import translate as _

from AccessControl import getSecurityManager
from Products.SilvaMetadata.interfaces import IMetadataService


def get_content_status(content):
    public_status = None
    next_status = None

    if IVersionedObject.providedBy(content):
        if content.get_public_version() is not None:
            public_status = 'published'
        elif content.get_previous_versions():
            public_status = 'closed'

        if content.get_unapproved_version() is not None:
            if content.is_approval_requested():
                next_status = "pending"
            else:
                next_status = "draft"
        elif content.get_approved_version() is not None:
            next_status = "approved"

    # XXX: define behavior for Folders
    # elif IFolder.providedBy(content):
    #     if content.is_published():
    #         status[0] = 'published'
    #     if content.is_approved():
    #         status[1] = 'approved'
    return {'status_public': public_status, 'status_next': next_status}


CONTENT_IFACES = [
    (IVersionedObject, 'versioned'),
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
        self.format_author = lambda a: a.userid()
        if getUtility(IMemberService).get_display_usernames():
            self.format_author = lambda a: a.fullname()

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
        if previewable is not None:
            icon = self.get_icon(content)
            title = cgi.escape(previewable.get_title_or_id_editable())
            author = self.format_author(previewable.get_last_author_info())
            modified = self.get_metadata(
                previewable, 'silva-extra', 'modificationtime')
            if modified is None:
                modified = u'-'
            else:
                modified = self.format_date(modified)
        else:
            icon = self.get_icon(None)
            title = '<i>{0}</i>'.format(self.rest.translate(_('Broken content')))
            author = u'-'
            modified = u'-'
        data = {
            'ifaces': content_ifaces(content),
            'id': id,
            'identifier': content.getId(),
            'path': self.rest.get_content_path(content),
            'icon': icon,
            'title': title,
            'author': author,
            'modified': modified,
            'access': self.get_access(content),
            'position': -1}
        data.update(get_content_status(content))
        if IPublishable.providedBy(content):
            data['moveable'] = not content.is_default()
        return data

