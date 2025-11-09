from rest_framework.routers import DefaultRouter
from .views import (
    EventoUsuarioViewSet,
    MetricaProductoViewSet,
    MetricaDiariaViewSet,
    ConfiguracionGoogleAnalyticsViewSet,
    DatosGoogleAnalyticsViewSet,
    ReportesViewSet
)

router = DefaultRouter()

router.register(r'eventos', EventoUsuarioViewSet, basename='evento_usuario')
router.register(r'metricas-productos', MetricaProductoViewSet, basename='metrica_producto')
router.register(r'metricas-diarias', MetricaDiariaViewSet, basename='metrica_diaria')
router.register(r'config-google', ConfiguracionGoogleAnalyticsViewSet, basename='config_google')
router.register(r'datos-google', DatosGoogleAnalyticsViewSet, basename='datos_google')
router.register(r'reportes', ReportesViewSet, basename='reportes') #reportes no anda

urlpatterns = router.urls