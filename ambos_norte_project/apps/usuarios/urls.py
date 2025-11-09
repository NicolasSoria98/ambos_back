from rest_framework.routers import DefaultRouter
from .views import UsuarioViewSet, DireccionViewSet

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'direcciones', DireccionViewSet, basename='direccion')

urlpatterns = router.urls
