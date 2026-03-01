"""
project URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import logging

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.db import connection
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

logger = logging.getLogger(__name__)

# Custom 404 handler
handler404 = 'api.views.custom_404_view'


def health_check(request):
    """
    Health check endpoint for load balancers and monitoring.
    Returns database connectivity status and basic app health.
    """
    health_status = {
        'status': 'healthy',
        'database': 'connected',
        'version': '1.0.0',
    }
    
    # Check database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
    except Exception as e:
        health_status['status'] = 'unhealthy'
        health_status['database'] = 'disconnected'
        logger.error(f"Health check database connection failed: {e}")
        return JsonResponse(health_status, status=503)
    
    return JsonResponse(health_status, status=200)


urlpatterns = [
    # Django's built-in admin site
    path('admin/', admin.site.urls),

    # ✅ Health check endpoint for monitoring/load balancers
    path('api/health/', health_check, name='health_check'),

    # Include the URLs from our 'api' app
    # All API endpoints are available at /api/
    path('api/', include('api.urls')),
]

# ✅ OpenAPI documentation endpoints — only in development
if settings.DEBUG:
    urlpatterns += [
        path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
        path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
        path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    ]

# This is a standard pattern for serving media files (like product images)
# during development. This is NOT for production use.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)