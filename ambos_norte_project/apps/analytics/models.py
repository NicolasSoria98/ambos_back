from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.catalogo.models import Producto, Categoria
from apps.pedidos.models import Pedido

class EventoUsuario(models.Model):
    """
    Registro de eventos de usuario para análisis de comportamiento
    """
    TIPO_EVENTO = [
        ('vista_producto', 'Vista de Producto'),
        ('agregar_carrito', 'Agregado al Carrito'),
        ('remover_carrito', 'Removido del Carrito'),
        ('inicio_checkout', 'Inicio de Checkout'),
        ('compra_completada', 'Compra Completada'),
        ('busqueda', 'Búsqueda'),
        ('registro', 'Registro de Usuario'),
        ('login', 'Inicio de Sesión'),
    ]
    
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='eventos'
    )
    session_id = models.CharField(max_length=255, blank=True, null=True)
    tipo_evento = models.CharField(max_length=50, choices=TIPO_EVENTO)
    
    producto = models.ForeignKey(
        Producto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='eventos'
    )
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='eventos'
    )
    pedido = models.ForeignKey(
        Pedido,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='eventos'
    )
    
    valor_monetario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Valor asociado al evento (ej: monto de compra)'
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Datos adicionales del evento'
    )
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    class Meta:
        db_table = 'analytics_eventos_usuario'
        verbose_name = 'Evento de Usuario'
        verbose_name_plural = 'Eventos de Usuario'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['tipo_evento', '-timestamp']),
            models.Index(fields=['usuario', '-timestamp']),
            models.Index(fields=['producto', '-timestamp']),
        ]
    
    def __str__(self):
        usuario_str = self.usuario.username if self.usuario else f"Anónimo ({self.session_id[:8]})"
        return f"{usuario_str} - {self.get_tipo_evento_display()} - {self.timestamp}"


class MetricaProducto(models.Model):
    """
    Métricas agregadas por producto (actualizado diariamente)
    """
    producto = models.OneToOneField(
        Producto,
        on_delete=models.CASCADE,
        related_name='metricas',
        primary_key=True
    )
    
    vistas_totales = models.IntegerField(default=0)
    vistas_ultimos_7d = models.IntegerField(default=0)
    vistas_ultimos_30d = models.IntegerField(default=0)
    
    agregados_carrito = models.IntegerField(
        default=0,
        help_text='Total de veces agregado al carrito'
    )
    compras_completadas = models.IntegerField(
        default=0,
        help_text='Total de unidades vendidas'
    )
    
    tasa_conversion = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Porcentaje de conversión (compras/vistas)'
    )
    
    ingreso_generado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Ingreso total generado por el producto'
    )
    
    stock_promedio = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Promedio histórico de stock'
    )
    
    ultima_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'analytics_metricas_producto'
        verbose_name = 'Métrica de Producto'
        verbose_name_plural = 'Métricas de Productos'
    
    def __str__(self):
        return f"Métricas: {self.producto.nombre}"
    
    def calcular_tasa_conversion(self):
        """Calcula y actualiza la tasa de conversión"""
        if self.vistas_totales > 0:
            self.tasa_conversion = (self.compras_completadas / self.vistas_totales) * 100
        else:
            self.tasa_conversion = 0
        self.save()


class MetricaDiaria(models.Model):
    """
    Snapshot diario del negocio completo
    """
    fecha = models.DateField(unique=True, db_index=True)
    
    # Ventas
    pedidos_totales = models.IntegerField(default=0)
    pedidos_completados = models.IntegerField(default=0)
    ingreso_bruto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ingreso_neto = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Después de costos de envío'
    )
    ticket_promedio = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Valor promedio por pedido'
    )
    
    # Usuarios
    usuarios_nuevos = models.IntegerField(default=0)
    usuarios_activos = models.IntegerField(
        default=0,
        help_text='Usuarios que realizaron alguna acción'
    )
    sesiones_totales = models.IntegerField(default=0)
    
    # Conversión
    carritos_creados = models.IntegerField(default=0)
    carritos_abandonados = models.IntegerField(default=0)
    tasa_abandono = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Porcentaje de carritos abandonados'
    )
    tasa_conversion = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Porcentaje de conversión de visita a compra'
    )
    
    # Productos
    productos_vendidos = models.IntegerField(
        default=0,
        help_text='Total de unidades vendidas'
    )
    producto_mas_vendido = models.ForeignKey(
        Producto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dias_mas_vendido'
    )
    categoria_mas_vendida = models.ForeignKey(
        Categoria,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dias_mas_vendida'
    )
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'analytics_metricas_diarias'
        verbose_name = 'Métrica Diaria'
        verbose_name_plural = 'Métricas Diarias'
        ordering = ['-fecha']
    
    def __str__(self):
        return f"Métricas del {self.fecha}"


class ConfiguracionGoogleAnalytics(models.Model):
    """
    Configuración para integración con Google Analytics
    """
    activo = models.BooleanField(
        default=False,
        help_text='Activar/desactivar integración con Google Analytics'
    )
    property_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='ID de la propiedad de GA4 (ej: G-XXXXXXXXXX)'
    )
    credenciales_json = models.TextField(
        blank=True,
        null=True,
        help_text='JSON de credenciales de servicio de Google (mantener privado)'
    )
    ultima_sincronizacion = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Última vez que se sincronizaron datos'
    )
    error_ultimo = models.TextField(
        blank=True,
        null=True,
        help_text='Último error en la sincronización'
    )
    
    class Meta:
        db_table = 'analytics_config_google'
        verbose_name = 'Configuración de Google Analytics'
        verbose_name_plural = 'Configuración de Google Analytics'
    
    def __str__(self):
        estado = "Activo" if self.activo else "Inactivo"
        return f"Google Analytics - {estado}"
    
    def save(self, *args, **kwargs):
        # Solo puede haber una configuración
        if not self.pk and ConfiguracionGoogleAnalytics.objects.exists():
            raise ValueError('Solo puede existir una configuración de Google Analytics')
        return super().save(*args, **kwargs)


class DatosGoogleAnalytics(models.Model):
    """
    Datos importados de Google Analytics (cache local)
    """
    fecha = models.DateField(db_index=True)
    
    # Tráfico
    sesiones = models.IntegerField(default=0)
    usuarios = models.IntegerField(default=0)
    paginas_vistas = models.IntegerField(default=0)
    tasa_rebote = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Porcentaje de rebote'
    )
    duracion_promedio = models.IntegerField(
        default=0,
        help_text='Duración promedio de sesión en segundos'
    )
    
    # Fuentes de tráfico
    trafico_organico = models.IntegerField(default=0)
    trafico_directo = models.IntegerField(default=0)
    trafico_social = models.IntegerField(default=0)
    trafico_referido = models.IntegerField(default=0)
    
    # Dispositivos
    desktop = models.IntegerField(default=0)
    mobile = models.IntegerField(default=0)
    tablet = models.IntegerField(default=0)
    
    # Top páginas
    paginas_populares = models.JSONField(
        default=list,
        blank=True,
        help_text='Lista de páginas más visitadas con contadores'
    )
    
    fecha_importacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'analytics_datos_google'
        verbose_name = 'Datos de Google Analytics'
        verbose_name_plural = 'Datos de Google Analytics'
        ordering = ['-fecha']
        unique_together = ['fecha']  # Solo un registro por día
    
    def __str__(self):
        return f"GA Data - {self.fecha} ({self.sesiones} sesiones)"
