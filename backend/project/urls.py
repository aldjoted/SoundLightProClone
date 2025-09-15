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
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Custom 404 handler
handler404 = 'api.views.custom_404_view'

urlpatterns = [
    # Django's built-in admin site
    path('admin/', admin.site.urls),

    # Include the URLs from our 'api' app
    # We are namespacing them under 'api/v1/' which is a good practice for versioning
    path('api/v1/', include('api.urls')),
]

# This is a standard pattern for serving media files (like product images)
# during development. This is NOT for production use.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)