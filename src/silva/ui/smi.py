# -*- coding: utf-8 -*-
# Copyright (c) 2010 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from pkg_resources import iter_entry_points

from five import grok
from silva.core.interfaces import ISilvaObject, IVersion
from silva.core.views import views as silvaviews
from silva.core.views.interfaces import IVirtualSite, IContentURL
from silva.core.views.httpheaders import ResponseHeaders
from silva.fanstatic import need
from silva.ui.interfaces import IUIService

from zope.component import getUtility, getMultiAdapter
from zope.i18n.interfaces import IUserPreferredLanguages
from zope.publisher.interfaces.browser import IBrowserRequest
from zope.interface import Interface
from zope.publisher.browser import applySkin
from zope.traversing.browser import absoluteURL

from AccessControl import getSecurityManager
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
        root = site.get_root()
        root_url = site.get_root_url()
        if root != self.context:
            # Relative path of the content from the root.
            content_path = getMultiAdapter(
                (self.context, self.request), IContentURL).url(relative=True)
            path = content_path[len(site.get_root_path()):]

            raise Redirect('/'.join((root_url, 'edit')) + '#!' + path)

        # Set the proper SMI skin
        set_smi_skin(self.context, self.request)

        # Load the extensions
        for load_entry in iter_entry_points('silva.ui.resources'):
            resource = load_entry.load()
            need(resource)

        # Customization from service.
        service = getUtility(IUIService)
        if service.logo != None:
            self.logo_url = '/'.join(
                (absoluteURL(service, self.request), 'logo'))
        else:
            self.logo_url = self.static['img']['silva.png']()
        self.background =  '#7996ac'
        self.name = service.name
        self.listing_preview = service.listing_preview
        self.maintenance_message = service.maintenance_message
        if service.background:
            self.background = service.background

        # Prepare values for template
        languages = IUserPreferredLanguages(
            self.request).getPreferredLanguages()

        self.language = languages[0] if languages else 'en'
        self.root_url = root_url
        self.can_manage = getSecurityManager().checkPermission(
            'View Management Screens', self.context)


class SMIResponseHeaders(ResponseHeaders):
    grok.adapts(IBrowserRequest, SMI)

    def cachable(self):
        return False


class SMIConfiguration(silvaviews.ViewletManager):
    grok.view(SMI)
