from rest_framework.routers import DefaultRouter
from .views import PedidoViewSet, ItemPedidoSetView, HistorialEstadoPedidoViewSet

router = DefaultRouter()

router.register(r'pedido', PedidoViewSet, basename='pedido')
router.register(r'item-pedido', ItemPedidoSetView, basename='item_pedido')
router.register(r'historial-estado-pedido', HistorialEstadoPedidoViewSet, basename='historial_estado_pedido')

urlpatterns = router.urls