from rest_framework.routers import DefaultRouter
from .views import (
    CategoriaViewSet, 
    TallaViewSet,
    ColorViewSet,
    ProductoViewSet, 
    ProductoVarianteViewSet,
    ImagenProductoViewSet
)

router = DefaultRouter()

# Endpoints existentes
router.register(r'categoria', CategoriaViewSet, basename='categoria')
router.register(r'producto', ProductoViewSet, basename='producto')
router.register(r'imagen-producto', ImagenProductoViewSet, basename='imagen_producto')

# Nuevos endpoints para el sistema de variantes
router.register(r'talla', TallaViewSet, basename='talla')
router.register(r'color', ColorViewSet, basename='color')
router.register(r'variante', ProductoVarianteViewSet, basename='variante')

urlpatterns = router.urls