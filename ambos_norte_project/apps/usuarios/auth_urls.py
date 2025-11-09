from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import UsuarioViewSet

urlpatterns = [
    # Endpoints de autenticación
    path('login/', UsuarioViewSet.as_view({'post': 'login'}), name='login'),
    path('registro/', UsuarioViewSet.as_view({'post': 'registro'}), name='registro'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UsuarioViewSet.as_view({'get': 'me'}), name='user-me'),
]