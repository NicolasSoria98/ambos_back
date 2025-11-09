from rest_framework.routers import DefaultRouter
from .views import CategoriaViewSet, ProductoViewSet, ImagenProductoViewSet

router = DefaultRouter()

router.register(r'categoria', CategoriaViewSet, basename='categoria')
router.register(r'producto', ProductoViewSet, basename='producto')
router.register(r'imagen-producto', ImagenProductoViewSet, basename='imagen_producto')

urlpatterns = router.urls