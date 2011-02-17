# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$


from five import grok
from megrok import pagetemplate as pt

from zeam.form.base.actions import Actions, action
from zeam.form.base.fields import Fields
from zeam.form.base.form import FormCanvas
from zeam.form.base.markers import SUCCESS, FAILURE, NO_VALUE
from zeam.form.silva import interfaces
from zeam.form.silva.actions import CancelEditAction
from zeam.form.silva.actions import EditAction, ExtractedDecoratedAction
from zeam.form.silva.form import SilvaDataManager
from zeam.form.silva.form import SilvaFormData
from zeam.form.silva.utils import convert_request_form_to_unicode
from zeam.form.ztk import validation
from zope.configuration.name import resolve

from silva.ui.rest.base import PageREST, RedirectToPage
from silva.core.interfaces import IVersionedContent
from silva.core.conf.interfaces import ITitledContent
from silva.core.conf.utils import getFactoryName
from silva.translations import translate as _


from Products.Silva.ExtensionRegistry import extensionRegistry


REST_ACTIONS_TO_TOKEN = [
    (interfaces.IRESTCloseOnSuccessAction, 'close on success'),
    (interfaces.IRESTCloseAction, 'close'),
    (interfaces.IAction, 'send')]


class FormREST(SilvaFormData, PageREST, FormCanvas):
    grok.baseclass()
    grok.name('silva.ui.content')
    grok.require('silva.ChangeSilvaContent')

    dataValidators = [validation.InvariantsValidation]
    dataManager = SilvaDataManager

    def __init__(self, context, request):
        PageREST.__init__(self, context, request)
        FormCanvas.__init__(self, context, request)

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
        actions = self.renderActions()
        return {'ifaces': ['form'],
                'success': status == SUCCESS,
                'form': self.render(),
                'actions': actions,
                'default': actions[0]['name'] if actions else None}


class FormRESTTemplate(pt.PageTemplate):
    pt.view(FormREST)


class AddFormREST(FormREST):
    grok.baseclass()

    prefix = 'addform'

    fields = Fields(ITitledContent)
    dataManager = SilvaDataManager
    ignoreContent = True
    actions = Actions()

    def _add(self, parent, data):
        """Purely create the object. This method can be overriden to
        support custom creation needs.
        """
        # Search for an addable and a factory
        addable = extensionRegistry.get_addable(self.__name__)
        if not addable:
            raise ValueError(u"Content factory cannot be found. ")

        factory = getattr(
            resolve(addable['instance'].__module__),
            getFactoryName(addable['instance']))

        # Build the content
        identifier = str(data.getWithDefault('id'))
        factory(parent, identifier, data.getWithDefault('title'))
        content = getattr(parent, identifier)

        self._edit(parent, content, data)
        return content

    def _edit(self, parent, content, data):
        """Edit the newly created content with the form data.
        """
        # Set from value
        editable_content = self.dataManager(content.get_editable())
        for key, value in data.iteritems():
            if key not in ITitledContent and value is not NO_VALUE:
                editable_content.set(key, value)

    @action(
        _(u'save'),
        description=_(u"create the content"),
        factory=ExtractedDecoratedAction)
    def save(self, data):
        try:
            content = self._add(self.context, data)
        except ValueError, error:
            self.send_message(error.args[0], type=u"error")
            return FAILURE
        self.send_message(
            _(u'Added ${meta_type}.', mapping={'meta_type': self.__name__}),
            type="feedback")
        raise RedirectToPage(content)


class EditFormREST(FormREST):
    grok.baseclass()

    prefix = 'editform'
    ignoreContent = False
    actions = Actions(
        EditAction(),
        CancelEditAction())

    def setContentData(self, content):
        original_content = content
        if IVersionedContent.providedBy(original_content):
            content = original_content.get_editable()
            if content is None:
                content = original_content.get_previewable()
        super(EditFormREST, self).setContentData(content)
