from django.urls import path
from .views import DashboardView, VentasAnalysisView, InventarioView

urlpatterns = [
    path('', DashboardView.as_view(), name='dashboard'),
    path('ventas/', VentasAnalysisView.as_view(), name='ventas_analysis'),
    path('inventario/', InventarioView.as_view(), name='inventario'),
]