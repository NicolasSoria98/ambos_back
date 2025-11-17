from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PagoViewSet, confirmar_pago_mp, verificar_pago

router = DefaultRouter()
router.register(r'pago', PagoViewSet, basename='pago')

urlpatterns = [
    path('', include(router.urls)),
    path('confirmar/', confirmar_pago_mp, name='confirmar-pago-mp'),
    path('verificar/<str:payment_id>/', verificar_pago, name='verificar-pago'),
]