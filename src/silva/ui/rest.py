# -*- coding: utf-8 -*-
# Copyright (c) 2010 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$


from five import grok
from infrae import rest
from silva.core.interfaces import IVersionedContent, IContainer, ISilvaObject
from zope.intid.interfaces import IIntIds
from zope.component import getUtility, getMultiAdapter
from zope.cachedescriptors.property import CachedProperty

from silva.ui.icon import get_icon
from silva.ui.menu import get_menu_items
from silva.core.views.interfaces import IVirtualSite
from silva.core.messages.interfaces import IMessageService

from Products.SilvaMetadata.interfaces import IMetadataService
from Products.Silva.ExtensionRegistry import meta_types_for_interface


class UIREST(rest.REST):
    grok.require('silva.ReadSilvaContent')
    grok.baseclass()

    @CachedProperty
    def root_path(self):
        root = IVirtualSite(self.request).get_root()
        return root.absolute_url_path()

    def get_content_path(self, content):
            return content.absolute_url_path()[len(self.root_path):]

    def get_notifications(self):
        messages = []
        service = getUtility(IMessageService)
        for message in service.receive_all(self.request):
            data = {'message': unicode(message),
                    'category': message.namespace}
            if message.namespace != 'error':
                data['autoclose'] = 4000
            messages.append(data)
        return messages

class NotificationPoll(UIREST):
    grok.name('silva.ui.poll.notifications')
    grok.context(IContainer)

    def GET(self):
        return self.json_response(self.get_notifications())


class NavigationListing(UIREST):
    grok.context(IContainer)
    grok.name('silva.ui.navigation')

    def GET(self):
        children = []
        service = getUtility(IIntIds)
        interfaces = meta_types_for_interface(IContainer)
        for child in self.context.objectValues(interfaces):
            is_not_empty = len(child.objectValues(interfaces))
            info = {
                'data': {
                    'title': child.get_title_or_id(),
                    'icon': get_icon(child, self.request)},
                'attr': {
                    'id': 'nav' + str(service.register(child)),
                    },
                'metadata': {'path': self.get_content_path(child)}}
            if is_not_empty:
                info['state'] = "closed"
            children.append(info)
        return self.json_response(children)


class Content(UIREST):
    grok.context(ISilvaObject)
    grok.name('silva.ui.content')
    grok.require('silva.ReadSilvaContent')

    def GET(self):
        service = getUtility(IIntIds)
        tabs = []
        default_tab = None
        for tab in get_menu_items(self.context):
            tabs.append({'name': unicode(tab.name),
                         'action': tab.action})
            if tab.default:
                default_tab = tab.action
        data = {
            'ifaces': ['content'],
            'id': str(service.register(self.context)),
            'navigation': 'nav' + str(service.register(self.context.get_container())),
            'metadata': {
                'ifaces': ['metadata'],
                'title': {
                    'ifaces': ['title'],
                    'title': self.context.get_title_or_id(),
                    'icon': get_icon(self.context, self.request),
                    },
                'tabs': {
                    'ifaces': ['tabs'],
                    'active': default_tab,
                    'entries': tabs,
                    },
                'path': self.get_content_path(self.context)
                }
            }
        if default_tab:
            view = getMultiAdapter(
                (self.context, self.request), name='silva.ui.' + default_tab)
            data['content'] = view.data()
        else:
            data['content'] = {}
        return self.json_response(data)


class TemplateContainerListing(rest.REST):
    grok.context(IContainer)
    grok.name('silva.ui.listing.template')
    grok.require('silva.ReadSilvaContent')

    template = grok.PageTemplate(filename="rest_templates/listing.pt")

    def default_namespace(self):
        return {}

    def namespace(self):
        return {'rest': self}

    def GET(self):
        return self.template.render(self)



class ColumnsContainerListing(rest.REST):
    grok.context(IContainer)
    grok.name('silva.ui.listing.configuration')
    grok.require('silva.ReadSilvaContent')

    def GET(self):
        return self.json_response([
                {'name': 'publishables',
                 'columns': [
                        {'name': 'icon'},
                        {'name': 'status'},
                        {'name': 'title', 'caption': 'Title',},
                        {'name': 'author', 'caption': 'Author',},
                        {'name': 'modified', 'caption': 'Modified',}],
                 'sortable': 'icon',
                 'collapsed': False},
                {'name': 'assets',
                 'columns': [
                        {'name': 'icon',},
                        {'name': 'title', 'caption': 'Title',},
                        {'name': 'author', 'caption': 'Author',},
                        {'name': 'modified', 'caption': 'Modified',}],
                 'collapsed': True},
                ])



def format_date(date):
    if date is not None:
        return date.ISO()
    return ''

def get_content_status(content):
    if IVersionedContent.providedBy(content):
        next_status = content.get_next_version_status()

        if next_status == 'not_approved':
            return 'draft'
        elif next_status == 'request_pending':
            return 'pending'
        elif next_status == 'approved':
            return 'approved'
        else:
            public = content.get_public_version_status()
            if public == 'published':
                return 'published'
            elif public == 'closed':
                return 'closed'
    return None


class ContainerListing(UIREST):
    grok.context(IContainer)
    grok.name('silva.ui.edit')
    grok.require('silva.ReadSilvaContent')

    def get_publishable_content(self):
        """Return all the publishable content of the container.
        """
        default = self.context.get_default()
        if default is not None:
            yield default
        for content in self.context.get_ordered_publishables():
            yield content

    def get_non_publishable_content(self):
        """Return all the non-publishable content of the container.
        """
        for content in self.context.get_non_publishables():
            yield content

    def data(self):
        publishables = []
        service = getUtility(IMetadataService)
        for entry in self.get_publishable_content():
            path = self.get_content_path(entry)
            content = entry.get_previewable()
            metadata = service.getMetadata(content)
            publishables.append(
                {"status": {
                        "ifaces": ["workflow"],
                        "value": get_content_status(entry)},
                 "icon": {
                        "ifaces": ["icon"],
                        "value": get_icon(entry, self.request)},
                 "title": {
                        "ifaces": ["action"],
                        "value": entry.get_title_or_id(),
                        "path": path,
                        "action": "content"},
                 "author": {
                        "ifaces": ["action"],
                        "value": metadata.get('silva-extra', 'lastauthor'),
                        "path": path,
                        "action": "properties"},
                 "modified": {
                        "ifaces": ["text"],
                        "value": format_date(metadata.get('silva-extra', 'modificationtime'))}
                 })
        assets = []
        for entry in self.get_non_publishable_content():
            path = self.get_content_path(entry)
            metadata = service.getMetadata(entry)
            assets.append(
                {"icon": {
                        "ifaces": ["icon"],
                        "value": get_icon(entry, self.request)},
                 "title": {
                        "ifaces": ["action"],
                        "value": entry.get_title_or_id(),
                        "path": path,
                        "action": "content"},
                 "author": {
                        "ifaces": ["action"],
                        "value": metadata.get('silva-extra', 'lastauthor'),
                        "path": path,
                        "action": "properties"},
                 "modified": {
                        "ifaces": ["text"],
                        "value": format_date(metadata.get('silva-extra', 'modificationtime'))}
                 })
        return {"ifaces": ["listing"],
                "publishables": publishables,
                "assets": assets}

    def GET(self):
        return self.json_response(self.data())



from silva.app.document.interfaces import IDocument
from silva.core.editor.transform.interfaces import ITransformer
from silva.core.editor.transform.interfaces import IInputEditorFilter

class DocumentEdit(rest.REST):
    grok.context(IDocument)
    grok.name('silva.ui.edit')
    grok.require('silva.ReadSilvaContent')

    def data(self):
        version = self.context.get_editable()
        transformer = getMultiAdapter((version, self.request), ITransformer)
        text = transformer.attribute('body', IInputEditorFilter)

        return {"ifaces": ["editor"],
                "name": "body",
                "text": text}

    def GET(self):
        return self.json_response(self.data())
