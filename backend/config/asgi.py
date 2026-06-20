import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# get_asgi_application() must run first -- it populates Django's app
# registry, which documents.routing (and the consumers/models it imports)
# depends on.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

import documents.routing  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": URLRouter(documents.routing.websocket_urlpatterns),
    }
)

