from django.contrib import admin
from .models import (
    EventoUsuario,
    MetricaProducto,
    MetricaDiaria,
    ConfiguracionGoogleAnalytics,
    DatosGoogleAnalytics
)

@admin.register(EventoUsuario)
class EventoUsuarioAdmin(admin.ModelAdmin):
    list_display = ['id', 'tipo_evento', 'usuario', 'producto', 'valor_monetario', 'timestamp']
    list_filter = ['tipo_evento', 'timestamp']
    search_fields = ['usuario__username', 'session_id', 'producto__nombre']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Información del Evento', {
            'fields': ('tipo_evento', 'timestamp')
        }),
        ('Usuario', {
            'fields': ('usuario', 'session_id', 'ip_address', 'user_agent')
        }),
        ('Referencias', {
            'fields': ('producto', 'categoria', 'pedido')
        }),
        ('Datos Adicionales', {
            'fields': ('valor_monetario', 'metadata')
        }),
    )


@admin.register(MetricaProducto)
class MetricaProductoAdmin(admin.ModelAdmin):
    list_display = [
        'producto',
        'vistas_totales',
        'vistas_ultimos_7d',
        'agregados_carrito',
        'compras_completadas',
        'tasa_conversion',
        'ingreso_generado',
        'ultima_actualizacion'
    ]
    list_filter = ['ultima_actualizacion']
    search_fields = ['producto__nombre']
    readonly_fields = ['ultima_actualizacion']
    
    fieldsets = (
        ('Producto', {
            'fields': ('producto',)
        }),
        ('Vistas', {
            'fields': ('vistas_totales', 'vistas_ultimos_7d', 'vistas_ultimos_30d')
        }),
        ('Conversión', {
            'fields': ('agregados_carrito', 'compras_completadas', 'tasa_conversion')
        }),
        ('Financiero', {
            'fields': ('ingreso_generado', 'stock_promedio')
        }),
        ('Sistema', {
            'fields': ('ultima_actualizacion',)
        }),
    )


@admin.register(MetricaDiaria)
class MetricaDiariaAdmin(admin.ModelAdmin):
    list_display = [
        'fecha',
        'pedidos_totales',
        'ingreso_bruto',
        'ticket_promedio',
        'usuarios_nuevos',
        'tasa_conversion',
        'productos_vendidos'
    ]
    list_filter = ['fecha']
    search_fields = ['fecha']
    date_hierarchy = 'fecha'
    readonly_fields = ['fecha_creacion']
    
    fieldsets = (
        ('Fecha', {
            'fields': ('fecha',)
        }),
        ('Ventas', {
            'fields': (
                'pedidos_totales',
                'pedidos_completados',
                'ingreso_bruto',
                'ingreso_neto',
                'ticket_promedio'
            )
        }),
        ('Usuarios', {
            'fields': ('usuarios_nuevos', 'usuarios_activos', 'sesiones_totales')
        }),
        ('Conversión', {
            'fields': (
                'carritos_creados',
                'carritos_abandonados',
                'tasa_abandono',
                'tasa_conversion'
            )
        }),
        ('Productos', {
            'fields': (
                'productos_vendidos',
                'producto_mas_vendido',
                'categoria_mas_vendida'
            )
        }),
    )


@admin.register(ConfiguracionGoogleAnalytics)
class ConfiguracionGoogleAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['activo', 'property_id', 'ultima_sincronizacion']
    readonly_fields = ['ultima_sincronizacion']
    
    fieldsets = (
        ('Configuración', {
            'fields': ('activo', 'property_id')
        }),
        ('Credenciales', {
            'fields': ('credenciales_json',),
            'classes': ('collapse',),
            'description': 'JSON de credenciales de servicio de Google Cloud'
        }),
        ('Estado', {
            'fields': ('ultima_sincronizacion', 'error_ultimo'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        # Solo permitir una configuración
        return not ConfiguracionGoogleAnalytics.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # No permitir eliminar la configuración
        return False


@admin.register(DatosGoogleAnalytics)
class DatosGoogleAnalyticsAdmin(admin.ModelAdmin):
    list_display = [
        'fecha',
        'sesiones',
        'usuarios',
        'paginas_vistas',
        'tasa_rebote',
        'fecha_importacion'
    ]
    list_filter = ['fecha', 'fecha_importacion']
    search_fields = ['fecha']
    date_hierarchy = 'fecha'
    readonly_fields = ['fecha_importacion']
    
    fieldsets = (
        ('Fecha', {
            'fields': ('fecha', 'fecha_importacion')
        }),
        ('Tráfico General', {
            'fields': ('sesiones', 'usuarios', 'paginas_vistas', 'tasa_rebote', 'duracion_promedio')
        }),
        ('Fuentes de Tráfico', {
            'fields': ('trafico_organico', 'trafico_directo', 'trafico_social', 'trafico_referido')
        }),
        ('Dispositivos', {
            'fields': ('desktop', 'mobile', 'tablet')
        }),
        ('Páginas Populares', {
            'fields': ('paginas_populares',),
            'classes': ('collapse',)
        }),
    )
