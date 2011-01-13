# -*- coding: utf-8 -*-
# Copyright (c) 2010 Infrae. All rights reserved.
# See also LICENSE.txt
# $Id$

from five import grok
from silva.core.interfaces import ISilvaObject

class SMI(grok.View):
    grok.name('smi.html')
    grok.context(ISilvaObject)
