

from five import grok
from silva.ui.interfaces import IUIScreen
from silva.ui.rest import Screen
from zeam.utils.batch.interfaces import IBatch
from zeam.utils.batch.views import Batching
from zope.publisher.browser import BrowserView
from zope.publisher.interfaces.http import IHTTPRequest
import megrok.pagetemplate as pt


class RESTAbsoluteURL(BrowserView):
    """Return the rel path for UIScreen elements.
    """

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def __str__(self):
        component = self.context
        segments = []
        while not isinstance(component, Screen):
            segments.insert(0, component.__name__)
            component = component.__parent__
        return '/'.join(segments)

    __call__ = __repr__ = __unicode__ = __str__


class RESTBatching(Batching):
    grok.adapts(IUIScreen, IBatch, IHTTPRequest)
    keep_query_string = False


class RESTBatchView(pt.PageTemplate):
    pt.view(RESTBatching)

