# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from zope.component import getUtility

from zope.i18n import translate
from zope.i18n.interfaces import IUserPreferredLanguages

from infrae.comethods import cofunction

from silva.translations import translate as _
from silva.core.interfaces import IError
from silva.core.messages.interfaces import IMessageService

MAX_ENTRIES = 4


class ContentCounter(object):
    """Report a list of content.
    """

    def __init__(self, translate, max_entries=MAX_ENTRIES):
        self.translate = translate
        self.max_entries = max_entries
        self.entries = []
        self.size = 0

    def _get_title(self, content):
        previewable = content.get_previewable()
        if previewable is not None:
            return previewable.get_title_or_id_editable()
        return content.getId()

    def append(self, content):
        if not (self.size > self.max_entries):
            self.entries.append(self._get_title(content))
        self.size += 1

    def __len__(self):
        return self.size

    def __call__(self):
        if self.size:

            def quotify(element):
                return u'"%s"' % element

            if self.size == 1:
                yield quotify(self.entries[0])
            else:
                if self.size > 4:
                    what = _(
                        u'${count} contents',
                        mapping={'count': self.size})
                else:
                    what = _(
                        u'${contents} and ${content}',
                        mapping={'contents': ', '.join(map(quotify,
                                                           self.entries[:-1])),
                                 'content': quotify(self.entries[-1])})
                yield self.translate(what)


class ErrorContentCounter(object):
    """Report a list of errors on contents.
    """

    def __init__(self, translate, max_entries=MAX_ENTRIES):
        self.translate = translate
        self.size = 0
        self.entries = {}
        self.max_entries = max_entries

    def append(self, error):
        if error.reason not in self.entries:
            self.entries[error.reason] = ContentCounter(
                self.translate, self.max_entries)
        self.entries[error.reason].append(error.content)
        self.size += 1

    def __len__(self):
        return self.size

    def __call__(self):
        if self.size:
            for reason, contents in self.entries.iteritems():
                for content in contents():
                    yield self.translate(reason), content


class ContentNotifier(object):
    """Notify status about content actions.
    """

    def __init__(self, request):
        self._send = getUtility(IMessageService).send
        self.request = request

        adapter = IUserPreferredLanguages(self.request)
        languages = adapter.getPreferredLanguages()
        if languages:
            self._language = languages[0]
        else:
            self._language = 'en'

    def translate(self, message):
        return translate(
            message, target_language=self._language, context=self.request)

    def notify(self, message, type=u""):
        self._send(message, self.request, namespace=type)

    @cofunction
    def __call__(self, parent, success_msg, failed_msg):
        success = ContentCounter(self.translate)
        failures = ErrorContentCounter(self.translate)

        content = yield
        while content is not None:
            result = parent(content)
            if IError.providedBy(result):
                failures.append(result)
            else:
                success.append(result)
            content = yield result

        for contents in success():
            self.notify(
                _(success_msg,   mapping={"contents": contents}),
                type="feedback")
        for reason, contents in failures():
            self.notify(
                _(failed_msg, mapping={"contents": contents,
                                       "reason": reason}),
                type="error")
