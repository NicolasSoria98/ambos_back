from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import UsuarioViewSet

router = DefaultRouter()
router.register(r'usuario', UsuarioViewSet, basename='usuario')

# Rutas de compatibilidad para auth bajo /api/usuarios/
auth_patterns = [
    path('login/', UsuarioViewSet.as_view({'post': 'login'}), name='usuarios-login'),
    path('registro/', UsuarioViewSet.as_view({'post': 'registro'}), name='usuarios-registro'),
    path('me/', UsuarioViewSet.as_view({'get': 'me'}), name='usuarios-me'),
]

urlpatterns = router.urls + auth_patterns
