# -*- coding: utf-8 -*-
# Copyright (c) 2011 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from zope.interface import Interface, Attribute


class ITabMenuItem(Interface):
    """A displayed tab.
    """
    name = Attribute('Name of the tab')
    action = Attribute('Action of the tab')
