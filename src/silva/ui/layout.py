
from five import grok

from silva.core.views import views as silvaviews

from .interfaces import ISilvaUITheme
from zope.interface import Interface
from zope.publisher.interfaces.browser import IBrowserRequest


grok.layer(Interface)


class DefaultLayout(silvaviews.Layout):
    """ Layout for smi objects that needs one (e.g. exceptions)
    """
    grok.context(Interface)


