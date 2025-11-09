from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone
from django.db.models import Sum, Count, Avg, Q, F
from datetime import timedelta, date
from .models import (
    EventoUsuario,
    MetricaProducto,
    MetricaDiaria,
    ConfiguracionGoogleAnalytics,
    DatosGoogleAnalytics
)
from .serializers import (
    EventoUsuarioSerializer,
    EventoUsuarioCreateSerializer,
    MetricaProductoSerializer,
    MetricaDiariaSerializer,
    ConfiguracionGoogleAnalyticsSerializer,
    DatosGoogleAnalyticsSerializer,
    ResumenMetricasSerializer,
    TopProductoSerializer,
    EmbudoConversionSerializer
)


class EventoUsuarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar eventos de usuario
    """
    queryset = EventoUsuario.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'bulk_create':
            return EventoUsuarioCreateSerializer
        return EventoUsuarioSerializer
    
    def get_queryset(self):
        queryset = EventoUsuario.objects.select_related(
            'usuario', 'producto', 'categoria', 'pedido'
        )
        
        # Filtros opcionales
        tipo_evento = self.request.query_params.get('tipo_evento', None)
        fecha_desde = self.request.query_params.get('fecha_desde', None)
        fecha_hasta = self.request.query_params.get('fecha_hasta', None)
        producto_id = self.request.query_params.get('producto_id', None)
        
        if tipo_evento:
            queryset = queryset.filter(tipo_evento=tipo_evento)
        
        if fecha_desde:
            queryset = queryset.filter(timestamp__gte=fecha_desde)
        
        if fecha_hasta:
            queryset = queryset.filter(timestamp__lte=fecha_hasta)
        
        if producto_id:
            queryset = queryset.filter(producto_id=producto_id)
        
        # Admin ve todo, usuarios normales solo sus eventos
        if not self.request.user.is_staff:
            queryset = queryset.filter(
                Q(usuario=self.request.user) | Q(session_id=self.request.session.session_key)
            )
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Crear múltiples eventos de una vez
        POST /api/analytics/eventos/bulk_create/
        Body: { "eventos": [{...}, {...}] }
        """
        eventos_data = request.data.get('eventos', [])
        
        if not eventos_data:
            return Response(
                {'error': 'Se requiere una lista de eventos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = EventoUsuarioCreateSerializer(
            data=eventos_data,
            many=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'mensaje': f'{len(eventos_data)} eventos creados exitosamente'},
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MetricaProductoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consultar métricas de productos (solo lectura para usuarios)
    """
    queryset = MetricaProducto.objects.select_related('producto', 'producto__categoria')
    serializer_class = MetricaProductoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros
        min_vistas = self.request.query_params.get('min_vistas', None)
        min_conversion = self.request.query_params.get('min_conversion', None)
        ordenar_por = self.request.query_params.get('ordenar_por', None)
        
        if min_vistas:
            queryset = queryset.filter(vistas_totales__gte=min_vistas)
        
        if min_conversion:
            queryset = queryset.filter(tasa_conversion__gte=min_conversion)
        
        if ordenar_por:
            # Ejemplos: -vistas_totales, -ingreso_generado, -tasa_conversion
            queryset = queryset.order_by(ordenar_por)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def top_productos(self, request):
        """
        Obtener top productos por diferentes criterios
        GET /api/analytics/metricas-productos/top_productos/?criterio=vistas&limite=10
        """
        criterio = request.query_params.get('criterio', 'vistas')  # vistas, ventas, ingresos
        limite = int(request.query_params.get('limite', 10))
        
        if criterio == 'vistas':
            queryset = self.get_queryset().order_by('-vistas_totales')[:limite]
        elif criterio == 'ventas':
            queryset = self.get_queryset().order_by('-compras_completadas')[:limite]
        elif criterio == 'ingresos':
            queryset = self.get_queryset().order_by('-ingreso_generado')[:limite]
        elif criterio == 'conversion':
            queryset = self.get_queryset().order_by('-tasa_conversion')[:limite]
        else:
            return Response(
                {'error': 'Criterio inválido. Opciones: vistas, ventas, ingresos, conversion'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class MetricaDiariaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consultar métricas diarias (solo lectura)
    """
    queryset = MetricaDiaria.objects.select_related(
        'producto_mas_vendido',
        'categoria_mas_vendida'
    )
    serializer_class = MetricaDiariaSerializer
    permission_classes = [IsAdminUser]  # Solo admin
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros por fecha
        fecha_desde = self.request.query_params.get('fecha_desde', None)
        fecha_hasta = self.request.query_params.get('fecha_hasta', None)
        
        if fecha_desde:
            queryset = queryset.filter(fecha__gte=fecha_desde)
        
        if fecha_hasta:
            queryset = queryset.filter(fecha__lte=fecha_hasta)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """
        Obtener resumen de métricas principales (hoy vs ayer)
        GET /api/analytics/metricas-diarias/resumen/
        """
        hoy = date.today()
        ayer = hoy - timedelta(days=1)
        
        try:
            metrica_hoy = MetricaDiaria.objects.get(fecha=hoy)
        except MetricaDiaria.DoesNotExist:
            metrica_hoy = None
        
        try:
            metrica_ayer = MetricaDiaria.objects.get(fecha=ayer)
        except MetricaDiaria.DoesNotExist:
            metrica_ayer = None
        
        def calcular_cambio(hoy_val, ayer_val):
            if ayer_val and ayer_val != 0:
                return ((hoy_val - ayer_val) / ayer_val) * 100
            return 0
        
        # Preparar datos
        ventas_hoy = float(metrica_hoy.ingreso_bruto) if metrica_hoy else 0
        ventas_ayer = float(metrica_ayer.ingreso_bruto) if metrica_ayer else 0
        
        pedidos_hoy = metrica_hoy.pedidos_totales if metrica_hoy else 0
        pedidos_ayer = metrica_ayer.pedidos_totales if metrica_ayer else 0
        
        usuarios_hoy = metrica_hoy.usuarios_activos if metrica_hoy else 0
        usuarios_ayer = metrica_ayer.usuarios_activos if metrica_ayer else 0
        
        ticket_hoy = float(metrica_hoy.ticket_promedio) if metrica_hoy else 0
        ticket_ayer = float(metrica_ayer.ticket_promedio) if metrica_ayer else 0
        
        conversion_hoy = float(metrica_hoy.tasa_conversion) if metrica_hoy else 0
        conversion_ayer = float(metrica_ayer.tasa_conversion) if metrica_ayer else 0
        
        data = {
            'total_ventas_hoy': ventas_hoy,
            'total_ventas_ayer': ventas_ayer,
            'cambio_ventas': calcular_cambio(ventas_hoy, ventas_ayer),
            'pedidos_hoy': pedidos_hoy,
            'pedidos_ayer': pedidos_ayer,
            'cambio_pedidos': calcular_cambio(pedidos_hoy, pedidos_ayer),
            'usuarios_activos_hoy': usuarios_hoy,
            'usuarios_activos_ayer': usuarios_ayer,
            'cambio_usuarios': calcular_cambio(usuarios_hoy, usuarios_ayer),
            'ticket_promedio_hoy': ticket_hoy,
            'ticket_promedio_ayer': ticket_ayer,
            'cambio_ticket': calcular_cambio(ticket_hoy, ticket_ayer),
            'tasa_conversion_hoy': conversion_hoy,
            'tasa_conversion_ayer': conversion_ayer,
        }
        
        serializer = ResumenMetricasSerializer(data=data)
        serializer.is_valid()
        return Response(serializer.data)


class ConfiguracionGoogleAnalyticsViewSet(viewsets.ModelViewSet):
    """
    ViewSet para configuración de Google Analytics (solo admin)
    """
    queryset = ConfiguracionGoogleAnalytics.objects.all()
    serializer_class = ConfiguracionGoogleAnalyticsSerializer
    permission_classes = [IsAdminUser]


class DatosGoogleAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para datos de Google Analytics (solo lectura, solo admin)
    """
    queryset = DatosGoogleAnalytics.objects.all()
    serializer_class = DatosGoogleAnalyticsSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros por fecha
        fecha_desde = self.request.query_params.get('fecha_desde', None)
        fecha_hasta = self.request.query_params.get('fecha_hasta', None)
        
        if fecha_desde:
            queryset = queryset.filter(fecha__gte=fecha_desde)
        
        if fecha_hasta:
            queryset = queryset.filter(fecha__lte=fecha_hasta)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def sincronizar(self, request):
        """
        Forzar sincronización con Google Analytics
        POST /api/analytics/datos-google/sincronizar/
        """
        # TODO: Implementar lógica de sincronización en Fase 3
        return Response(
            {'mensaje': 'Funcionalidad de sincronización pendiente de implementación'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )


class ReportesViewSet(viewsets.ViewSet):
    """
    ViewSet para generar reportes personalizados
    """
    permission_classes = [IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def embudo_conversion(self, request):
        """
        Análisis del embudo de conversión
        GET /api/analytics/reportes/embudo_conversion/?dias=30
        """
        dias = int(request.query_params.get('dias', 30))
        fecha_desde = timezone.now() - timedelta(days=dias)
        
        # Contar eventos por tipo
        eventos = EventoUsuario.objects.filter(timestamp__gte=fecha_desde)
        
        visitas = eventos.filter(tipo_evento='vista_producto').count()
        agregados = eventos.filter(tipo_evento='agregar_carrito').count()
        checkouts = eventos.filter(tipo_evento='inicio_checkout').count()
        compras = eventos.filter(tipo_evento='compra_completada').count()
        
        # Calcular tasas
        tasa_vista_carrito = (agregados / visitas * 100) if visitas > 0 else 0
        tasa_carrito_checkout = (checkouts / agregados * 100) if agregados > 0 else 0
        tasa_checkout_compra = (compras / checkouts * 100) if checkouts > 0 else 0
        tasa_total = (compras / visitas * 100) if visitas > 0 else 0
        
        data = {
            'periodo': f'Últimos {dias} días',
            'visitas_totales': visitas,
            'productos_vistos': visitas,
            'agregados_carrito': agregados,
            'inicio_checkout': checkouts,
            'compras_completadas': compras,
            'tasa_vista_a_carrito': round(tasa_vista_carrito, 2),
            'tasa_carrito_a_checkout': round(tasa_carrito_checkout, 2),
            'tasa_checkout_a_compra': round(tasa_checkout_compra, 2),
            'tasa_conversion_total': round(tasa_total, 2),
        }
        
        serializer = EmbudoConversionSerializer(data=data)
        serializer.is_valid()
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def productos_performance(self, request):
        """
        Performance detallado de productos
        GET /api/analytics/reportes/productos_performance/?limite=20
        """
        limite = int(request.query_params.get('limite', 20))
        
        metricas = MetricaProducto.objects.select_related('producto').order_by(
            '-ingreso_generado'
        )[:limite]
        
        serializer = MetricaProductoSerializer(metricas, many=True)
        return Response(serializer.data)