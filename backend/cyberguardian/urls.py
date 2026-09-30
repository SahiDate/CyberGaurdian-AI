from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse, FileResponse
from django.conf import settings
from pathlib import Path

def serve_react_app(request):
    index_file = settings.FRONTEND_DIST / 'index.html'
    if index_file.exists():
        return FileResponse(open(index_file, 'rb'))
    return HttpResponse("CyberGuardian API is online. Frontend build not present.", status=200)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('users.urls')),
    path('api/', include('core_engine.urls')),
    # React SPA catch-all for any frontend routes
    re_path(r'^(?!api/|admin/|static/|media/).*$', serve_react_app, name='react_spa'),
]

