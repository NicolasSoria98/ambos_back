from rest_framework.routers import DefaultRouter
from .views import CarritoViewSet, ItemCarritoViewSet

router = DefaultRouter()
router.register(r'carrito', CarritoViewSet, basename='carrito')
router.register(r'item-carrito', ItemCarritoViewSet, basename='item_carrito')

urlpatterns = router.urls