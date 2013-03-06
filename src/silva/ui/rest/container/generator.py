# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

from zope.component import getUtility
from zope.intid.interfaces import IIntIds

from silva.translations import translate as _


class ContentGenerator(object):
    """Generate content out of ids.
    """

    def __init__(self, logger=None):
        self._logger = logger
        self._get = getUtility(IIntIds).getObject
        self._errors = 0

    def __call__(self, ids):
        """Get contents from ids. It can be None, one element or a
        list of elements. Strings are accepted as well.
        """
        if ids is not None:
            if not isinstance(ids, list):
                ids = [ids]
            for id in ids:
                try:
                    content = self._get(int(id))
                except (KeyError, ValueError):
                    self._errors += 1
                else:
                    yield content

    def __enter__(self):
        self._errors = 0
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None and self._logger is not None:
            if self._errors:
                self._logger(
                    _(u'${count} contents could not be found '
                      u'(they probably have been deleted).',
                      mapping={'count': self._errors}),
                    type='error')

