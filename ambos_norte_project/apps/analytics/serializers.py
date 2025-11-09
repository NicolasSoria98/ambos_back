from rest_framework import serializers
from .models import (
    EventoUsuario,
    MetricaProducto,
    MetricaDiaria,
    ConfiguracionGoogleAnalytics,
    DatosGoogleAnalytics
)
# ✅ CORREGIDO: CategoriaSerializer sin alias
from apps.catalogo.serializers import ProductoListSerializer, CategoriaSerializer
from apps.usuarios.serializer import UsuarioSerializer


class EventoUsuarioSerializer(serializers.ModelSerializer):
    """
    Serializer para eventos de usuario
    """
    usuario_detalle = UsuarioSerializer(source='usuario', read_only=True)
    producto_detalle = ProductoListSerializer(source='producto', read_only=True)
    tipo_evento_display = serializers.CharField(source='get_tipo_evento_display', read_only=True)
    
    class Meta:
        model = EventoUsuario
        fields = [
            'id',
            'usuario',
            'usuario_detalle',
            'session_id',
            'tipo_evento',
            'tipo_evento_display',
            'producto',
            'producto_detalle',
            'categoria',
            'pedido',
            'valor_monetario',
            'metadata',
            'ip_address',
            'user_agent',
            'timestamp'
        ]
        read_only_fields = ['timestamp']
    
    def create(self, validated_data):
        # Obtener IP y User-Agent del request si no se proporcionan
        request = self.context.get('request')
        if request:
            if not validated_data.get('ip_address'):
                # Obtener IP del cliente
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    validated_data['ip_address'] = x_forwarded_for.split(',')[0]
                else:
                    validated_data['ip_address'] = request.META.get('REMOTE_ADDR')
            
            if not validated_data.get('user_agent'):
                validated_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')
            
            # Asignar usuario si está autenticado
            if request.user.is_authenticated and not validated_data.get('usuario'):
                validated_data['usuario'] = request.user
        
        return super().create(validated_data)


class EventoUsuarioCreateSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para crear eventos (sin detalles anidados)
    """
    class Meta:
        model = EventoUsuario
        fields = [
            'tipo_evento',
            'producto',
            'categoria',
            'pedido',
            'valor_monetario',
            'metadata',
            'session_id'
        ]
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request:
            # Agregar datos automáticos
            if request.user.is_authenticated:
                validated_data['usuario'] = request.user
            
            # IP
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                validated_data['ip_address'] = x_forwarded_for.split(',')[0]
            else:
                validated_data['ip_address'] = request.META.get('REMOTE_ADDR')
            
            # User Agent
            validated_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')
        
        return super().create(validated_data)


class MetricaProductoSerializer(serializers.ModelSerializer):
    """
    Serializer para métricas de productos
    """
    producto_detalle = ProductoListSerializer(source='producto', read_only=True)
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_precio = serializers.DecimalField(
        source='producto.precio',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    
    class Meta:
        model = MetricaProducto
        fields = [
            'producto',
            'producto_nombre',
            'producto_precio',
            'producto_detalle',
            'vistas_totales',
            'vistas_ultimos_7d',
            'vistas_ultimos_30d',
            'agregados_carrito',
            'compras_completadas',
            'tasa_conversion',
            'ingreso_generado',
            'stock_promedio',
            'ultima_actualizacion'
        ]
        read_only_fields = ['ultima_actualizacion', 'tasa_conversion']


class MetricaDiariaSerializer(serializers.ModelSerializer):
    """
    Serializer para métricas diarias
    """
    producto_mas_vendido_detalle = ProductoListSerializer(
        source='producto_mas_vendido',
        read_only=True
    )
    categoria_mas_vendida_detalle = CategoriaSerializer(
        source='categoria_mas_vendida',
        read_only=True
    )
    
    class Meta:
        model = MetricaDiaria
        fields = [
            'id',
            'fecha',
            # Ventas
            'pedidos_totales',
            'pedidos_completados',
            'ingreso_bruto',
            'ingreso_neto',
            'ticket_promedio',
            # Usuarios
            'usuarios_nuevos',
            'usuarios_activos',
            'sesiones_totales',
            # Conversión
            'carritos_creados',
            'carritos_abandonados',
            'tasa_abandono',
            'tasa_conversion',
            # Productos
            'productos_vendidos',
            'producto_mas_vendido',
            'producto_mas_vendido_detalle',
            'categoria_mas_vendida',
            'categoria_mas_vendida_detalle',
            'fecha_creacion'
        ]
        read_only_fields = ['fecha_creacion']


class ConfiguracionGoogleAnalyticsSerializer(serializers.ModelSerializer):
    """
    Serializer para configuración de Google Analytics
    """
    class Meta:
        model = ConfiguracionGoogleAnalytics
        fields = [
            'id',
            'activo',
            'property_id',
            'ultima_sincronizacion',
            'error_ultimo'
        ]
        read_only_fields = ['ultima_sincronizacion', 'error_ultimo']


class DatosGoogleAnalyticsSerializer(serializers.ModelSerializer):
    """
    Serializer para datos de Google Analytics
    """
    class Meta:
        model = DatosGoogleAnalytics
        fields = [
            'id',
            'fecha',
            # Tráfico
            'sesiones',
            'usuarios',
            'paginas_vistas',
            'tasa_rebote',
            'duracion_promedio',
            # Fuentes
            'trafico_organico',
            'trafico_directo',
            'trafico_social',
            'trafico_referido',
            # Dispositivos
            'desktop',
            'mobile',
            'tablet',
            # Top páginas
            'paginas_populares',
            'fecha_importacion'
        ]
        read_only_fields = ['fecha_importacion']


# Serializers para reportes agregados

class ResumenMetricasSerializer(serializers.Serializer):
    """
    Serializer para resumen de métricas (no vinculado a modelo)
    """
    # KPIs principales
    total_ventas_hoy = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_ventas_ayer = serializers.DecimalField(max_digits=12, decimal_places=2)
    cambio_ventas = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    pedidos_hoy = serializers.IntegerField()
    pedidos_ayer = serializers.IntegerField()
    cambio_pedidos = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    usuarios_activos_hoy = serializers.IntegerField()
    usuarios_activos_ayer = serializers.IntegerField()
    cambio_usuarios = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    ticket_promedio_hoy = serializers.DecimalField(max_digits=10, decimal_places=2)
    ticket_promedio_ayer = serializers.DecimalField(max_digits=10, decimal_places=2)
    cambio_ticket = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    tasa_conversion_hoy = serializers.DecimalField(max_digits=5, decimal_places=2)
    tasa_conversion_ayer = serializers.DecimalField(max_digits=5, decimal_places=2)


class TopProductoSerializer(serializers.Serializer):
    """
    Serializer para top productos
    """
    producto_id = serializers.IntegerField()
    producto_nombre = serializers.CharField()
    producto_precio = serializers.DecimalField(max_digits=10, decimal_places=2)
    vistas = serializers.IntegerField()
    ventas = serializers.IntegerField()
    ingresos = serializers.DecimalField(max_digits=12, decimal_places=2)
    tasa_conversion = serializers.DecimalField(max_digits=5, decimal_places=2)


class EmbudoConversionSerializer(serializers.Serializer):
    """
    Serializer para análisis de embudo de conversión
    """
    periodo = serializers.CharField()
    visitas_totales = serializers.IntegerField()
    productos_vistos = serializers.IntegerField()
    agregados_carrito = serializers.IntegerField()
    inicio_checkout = serializers.IntegerField()
    compras_completadas = serializers.IntegerField()
    
    # Tasas de conversión entre etapas
    tasa_vista_a_carrito = serializers.DecimalField(max_digits=5, decimal_places=2)
    tasa_carrito_a_checkout = serializers.DecimalField(max_digits=5, decimal_places=2)
    tasa_checkout_a_compra = serializers.DecimalField(max_digits=5, decimal_places=2)
    tasa_conversion_total = serializers.DecimalField(max_digits=5, decimal_places=2)