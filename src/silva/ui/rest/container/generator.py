# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from zope.component import getUtility
from zope.intid.interfaces import IIntIds

from silva.translations import translate as _


class ContentGenerator(object):
    """Generate content out of ids.
    """

    def __init__(self, logger=None):
        self.__logger = logger
        self.__get = getUtility(IIntIds).getObject
        self.__errors = 0

    def __call__(self, ids):
        """Get contents from ids. It can be None, one element or a
        list of elements. Strings are accepted as well.
        """
        if ids is not None:
            if not isinstance(ids, list):
                ids = [ids]
            for id in ids:
                try:
                    content = self.__get(int(id))
                except (KeyError, ValueError):
                    self.__errors += 1
                else:
                    yield content

    def __enter__(self):
        self.__errors = 0
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None and self.__logger is not None:
            if self.__errors:
                self.__logger(
                    _(u'${count} contents could not be found '
                      u'(they probably have been deleted)',
                      mapping={'count': self.__errors}))

