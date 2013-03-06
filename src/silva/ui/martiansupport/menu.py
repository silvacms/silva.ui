# -*- coding: utf-8 -*-
# Copyright (c) 2011-2013 Infrae. All rights reserved.
# See also LICENSE.txt

import martian
from five import grok
from silva.ui.menu import MenuItem

from AccessControl.security import protectClass
from App.class_init import InitializeClass as initializeClass


class MenuSecurityGrokker(martian.ClassGrokker):
    martian.component(MenuItem)
    martian.directive(grok.require, name='permission')

    def execute(self, factory, config, permission, **kw):
        if permission is None:
            permission = 'zope.Public'

        config.action(
            discriminator = ('five:protectClass', factory),
            callable = protectClass,
            args = (factory, permission))

        # Protect the class
        config.action(
            discriminator = ('five:initialize:class', factory),
            callable = initializeClass,
            args = (factory,))

        return True
