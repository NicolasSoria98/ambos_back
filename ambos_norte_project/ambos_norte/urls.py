"""
URL configuration for ambos_norte project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
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
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/usuarios/', include('apps.usuarios.urls')),
    path('api/catalogo/', include('apps.catalogo.urls')),
    path('api/pedidos/', include('apps.pedidos.urls')),
    path('api/envios/', include('apps.envios.urls')),
    path('api/pagos/', include('apps.pagos.urls')),
    path('api/carrito/', include('apps.carrito.urls')),
    path('dashboard/', include('apps.panel_admin.urls')),
    path('api/auth/', include('apps.usuarios.auth_urls')),
    path('api/analytics/', include('apps.analytics.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
