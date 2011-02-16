# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$


from five import grok
from megrok import pagetemplate as pt

from zeam.form.base.actions import Actions
from zeam.form.base.form import FormCanvas
from zeam.form.base.markers import SUCCESS
from zeam.form.silva import interfaces
from zeam.form.silva.actions import CancelEditAction
from zeam.form.silva.actions import EditAction
from zeam.form.silva.form import SilvaDataManager
from zeam.form.silva.form import SilvaFormData
from zeam.form.silva.utils import convert_request_form_to_unicode
from zeam.form.ztk import validation

from silva.ui.rest.base import PageREST
from silva.core.interfaces import IVersionedContent


REST_ACTIONS_TO_TOKEN = [
    (interfaces.IRESTCloseOnSuccessAction, 'close on success'),
    (interfaces.IRESTCloseAction, 'close'),
    (interfaces.IAction, 'send')]


class EditFormREST(SilvaFormData, PageREST, FormCanvas):
    grok.baseclass()
    grok.name('silva.ui.content')
    grok.require('silva.ChangeSilvaContent')

    prefix = 'editform'
    dataValidators = [validation.InvariantsValidation]
    dataManager = SilvaDataManager
    ignoreContent = False
    actions = Actions(
        EditAction(),
        CancelEditAction())

    def __init__(self, context, request):
        PageREST.__init__(self, context, request)
        FormCanvas.__init__(self, context, request)

    def setContentData(self, content):
        original_content = content
        if IVersionedContent.providedBy(original_content):
            content = original_content.get_editable()
            if content is None:
                content = original_content.get_previewable()
        super(EditFormREST, self).setContentData(content)

    def renderActions(self):
        def renderAction(action):
            for rest_action, action_type in REST_ACTIONS_TO_TOKEN:
                if rest_action.providedBy(action.component):
                    break
            return {'label': action.title,
                    'name': action.identifier,
                    'action': action_type}
        return map(renderAction, self.actionWidgets)

    def payload(self):
        convert_request_form_to_unicode(self.request.form)
        action, status = self.updateActions()
        self.updateWidgets()
        data = {'ifaces': ['form']}
        data['success'] = status == SUCCESS
        if interfaces.IRESTRefreshAction.providedBy(action):
            data['refresh'] = action.refresh
        success_only = interfaces.IRESTSuccessAction.providedBy(action)
        if not (success_only and status == SUCCESS):
            actions = self.renderActions()
            data.update(
                {'form': self.render(),
                 'actions': actions,
                 'default': actions[0]['name'] if actions else None})

        return data


class EditFormRESTTemplate(pt.PageTemplate):
    pt.view(EditFormREST)
