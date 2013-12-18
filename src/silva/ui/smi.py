# -*- coding: utf-8 -*-
# Copyright (c) 2010-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from pkg_resources import iter_entry_points
from megrok.pagetemplate import PageTemplate

from five import grok
from silva.core.interfaces import ISilvaObject, IVersion
from silva.core.views import views as silvaviews
from silva.core.views.interfaces import IVirtualSite, IContentURL
from silva.core.views.httpheaders import ResponseHeaders
from silva.fanstatic import need
from silva.ui.interfaces import IUIService
from silva.core.references.utils import relative_path

from zope.component import getUtility, getMultiAdapter
from zope.i18n.interfaces import IUserPreferredLanguages
from zope.publisher.interfaces.browser import IBrowserRequest
from zope.interface import Interface
from zope.publisher.browser import applySkin
from zope.pagetemplate.interfaces import IPageTemplate

from AccessControl import getSecurityManager
from AccessControl.security import checkPermission
from zExceptions import Redirect


def set_smi_skin(context, request, default='silva.ui.interfaces.ISilvaUITheme'):
    """Set the SMI skin.
    """
    if ISilvaObject.providedBy(context) or IVersion.providedBy(context):
        skin_name = context.get_root()._smi_skin
        if not skin_name:
            skin_name = default
        applySkin(request, getUtility(Interface, skin_name))


class SMI(grok.View):
    grok.name('edit')
    grok.context(ISilvaObject)
    grok.require('silva.ReadSilvaContent')

    def update(self):
        # Redirect to the root of the SMI if we are not already
        site = IVirtualSite(self.request)
        settings = getUtility(IUIService)
        if settings.smi_access_root:
            top_level = site.get_silva_root()
        else:
            top_level = site.get_root()

        # We lookup for the highest container where we have access
        root = self.context.get_container()
        while root != top_level:
            parent = root.get_real_container()
            if (parent is None or
                    not checkPermission('silva.ReadSilvaContent', parent)):
                # We don't have access at that level
                break
            root = parent

        root_content_url = getMultiAdapter((root, self.request), IContentURL)
        root_url = root_content_url.url()
        if root != self.context:
            # Relative path of the content from the root.
            content_url = getMultiAdapter(
                (self.context, self.request), IContentURL)
            root_path = root_content_url.url(relative=True).split('/')
            content_path = content_url.url(relative=True).split('/')
            path = '/'.join(relative_path(root_path, content_path))

            raise Redirect('/'.join((root_url, 'edit')) + '#!' + path)

        # Set the proper SMI skin
        set_smi_skin(self.context, self.request)

        # Load the extensions
        for load_entry in iter_entry_points('silva.ui.resources'):
            resource = load_entry.load()
            need(resource)

        # Customization from service
        if settings.logo is not None:
            settings_content_url = getMultiAdapter(
                (settings, self.request), IContentURL)
            self.logo_url = '/'.join((settings_content_url.url(), 'logo'))
        else:
            self.logo_url = self.static['img']['silva.png']()
        self.background = '#7996ac'
        self.name = settings.name
        self.listing_preview = settings.folder_icon_preview
        self.maintenance_message = settings.maintenance_message
        self.test_mode = settings.test_mode
        self.preview_resolutions = []
        self.notifications_life = settings.notifications_life
        if settings.preview_use_resolutions:
            self.preview_resolutions = list(settings.preview_resolutions)
        if settings.background:
            self.background = settings.background

        # Prepare values for template
        languages = IUserPreferredLanguages(
            self.request).getPreferredLanguages()

        self.language = languages[0] if languages else 'en'
        self.root_url = root_url
        self.can_manage = getSecurityManager().checkPermission(
            'View Management Screens', self.context)

    def render(self):
        template = getMultiAdapter((self, self.request), IPageTemplate)
        return template()


class SMITemplate(PageTemplate):
    """Default SMI template.
    """
    grok.view(SMI)


class SMIResponseHeaders(ResponseHeaders):
    grok.adapts(IBrowserRequest, SMI)

    def cachable(self):
        return False


class SMIConfiguration(silvaviews.ViewletManager):
    grok.view(SMI)
