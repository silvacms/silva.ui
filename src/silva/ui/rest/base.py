# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from five import grok
from zope.component import getUtility, getMultiAdapter
from zope.intid.interfaces import IIntIds
from grokcore.layout.interfaces import IPage
from grokcore.layout.interfaces import ILayout
from grokcore.component.interfaces import IContext

from Acquisition import aq_parent
from AccessControl import getSecurityManager

from infrae import rest
from infrae.rest.interfaces import IRESTComponent
from silva.core.interfaces import IRoot, ISilvaObject, IVersion
from silva.core.interfaces.adapters import IIconResolver
from silva.core.services import CatalogingTask

from ..interfaces import IUIScreen
from ..menu import ContentMenu, ViewMenu, ActionMenu, UserMenu
from ..smi import set_smi_skin
from .exceptions import PageResult, ActionResult, RESTResult
from .exceptions import RESTRedirectHandler
from silva.ui.rest import helper as helper

import transaction


class SMITransaction(object):

    def __init__(self, screen):
        # Follow Zope 2 information to appear in the undo log.
        note = []
        if (ISilvaObject.providedBy(screen.context) or
                IVersion.providedBy(screen.context)):
            note.append('/'.join(screen.context.getPhysicalPath()))
        else:
            note.append('/')
        names = []
        while IRESTComponent.providedBy(screen):
            names.append(screen.__name__)
            screen = screen.__parent__
        if names:
            note.extend(['SMI action:', '/'.join(reversed(names))])
        self.note = ' '.join(note)
        self.user = getSecurityManager().getUser()
        self.user_path = ''
        auth_folder = aq_parent(self.user)
        if auth_folder is not None:
            self.user_path = '/'.join(auth_folder.getPhysicalPath()[1:-1])

    def __enter__(self):
        # Note: this will abort any previous changes.
        transaction.get().abort()
        self.transaction = transaction.begin()
        CatalogingTask.get().activate()

    def __exit__(self, t, v, tb):
        if v is None and not self.transaction.isDoomed():
            self.transaction.note(self.note)
            self.transaction.setUser(self.user, self.user_path)
            self.transaction.commit()
        else:
            self.transaction.abort()


class Screen(rest.REST):
    grok.context(IContext)
    grok.name('silva.ui')


class UIREST(helper.UIHelper, rest.REST):
    grok.require('silva.ReadSilvaContent')
    grok.baseclass()


@grok.subscribe(UIREST, rest.IRESTMethodPublishedEvent)
def apply_smi_skin(view, event):
    set_smi_skin(view.context, view.request)


class ActionREST(UIREST):
    grok.baseclass()
    grok.require('silva.ReadSilvaContent')

    def GET(self):
        with SMITransaction(self):
            try:
                data = self.get_payload()
            except ActionResult as error:
                data = error.get_payload(self)
            except RESTResult as error:
                return error.get_payload(self)
            except RESTRedirectHandler as handler:
                return handler.publish(self)

        for provider in self.needed():
            provider(self, data)

        return self.json_response(data)

    POST = GET


class PageREST(ActionREST):
    grok.baseclass()
    grok.implements(IUIScreen)
    grok.require('silva.ReadSilvaContent')

    def get_navigation(self):
        service = getUtility(IIntIds)
        parents = []
        content = self.context.get_container()

        def identifier(content):
            return 'nav' + str(service.register(content))

        while content:
            parents.append(identifier(content))
            if IRoot.providedBy(content):
                break
            content = aq_parent(content)

        parents.reverse()
        return {'current': parents}

    def get_menu_title(self):
        return self.context.get_title_or_id_editable()

    def get_menu_parent(self):
        return {'path': self.get_content_path(aq_parent(self.context))}

    def get_menu_entries(self, menu):
        entries = menu.get_entries(self.context).describe(self)
        if not entries:
            return None
        return {'ifaces': ['menu'], 'entries': entries}

    def get_payload(self):
        try:
            screen = self.payload()
        except PageResult as error:
            screen = error.get_payload(self)
        navigation = self.get_navigation()
        metadata = {
            'ifaces': screen.get('ifaces', []),
            'title': {
                'ifaces': ['title'],
                'title': self.get_menu_title(),
                'icon': IIconResolver(
                    self.request).get_content_url(self.context),
            },
            'menu': {
                'content': self.get_menu_entries(ContentMenu),
                'view': self.get_menu_entries(ViewMenu),
                'actions': self.get_menu_entries(ActionMenu),
                'user': self.get_menu_entries(UserMenu),
            },
            'path': self.get_content_path(self.context),
        }
        if not IRoot.providedBy(self.context):
            metadata['up'] = self.get_menu_parent()
            navigation['screen'] = metadata['up'].get('screen')
        return {'content': {'ifaces': ['screen'],
                            'metadata': metadata,
                            'screen': screen},
                'navigation': navigation}


class PageWithTemplateREST(PageREST):
    grok.baseclass()


    def default_namespace(self):
        return {}

    def namespace(self):
        return {'rest': self,
                'context': self.context,
                'request': self.request,
                'target_language': self.language}

    def update(self):
        pass

    def payload(self):
        self.update()
        return {'ifaces': ['form'],
                'html': self.template.render(self)}


class FormWithTemplateREST(PageREST):
    grok.baseclass()

    def default_namespace(self):
        return {}

    def namespace(self):
        return {'rest': self,
                'context': self.context,
                'request': self.request,
                'target_language': self.language}

    def update(self):
        pass

    def payload(self):
        self.update()
        return {'ifaces': ['form'],
                'forms': self.template.render(self)}


class PageWithLayoutREST(rest.REST):
    grok.implements(IPage)

    def content(self):
        raise NotImplementedError

    def GET(self):
        self.response.setHeader('Content-Type', 'text/html;charset=utf-8')
        self.layout = getMultiAdapter((self.request, self.context), ILayout)
        return self.layout(self)

    POST = GET
