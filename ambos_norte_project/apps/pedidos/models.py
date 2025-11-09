from django.db import models
from django.conf import settings
from apps.usuarios.models import Direccion
from apps.catalogo.models import Producto

# Create your models here.
class Pedido(models.Model):
    """
    Pedidos realizados
    """
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('pagado', 'Pagado'),
        ('en_preparacion', 'En Preparación'),
        ('enviado', 'Enviado'),
        ('entregado', 'Entregado'),
        ('cancelado', 'Cancelado'),
    ]
    
    numero_pedido = models.CharField(max_length=50)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='pedidos'
    )

    direccion = models.ForeignKey(
        Direccion,
        on_delete=models.PROTECT,
        null=True,
        blank=True
    )
    
    email_contacto = models.EmailField()
    telefono_contacto = models.CharField(max_length=50)
    
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    
    estado = models.CharField(
        max_length=20, 
        choices=ESTADO_CHOICES, 
        default='pendiente'
    )
    notas = models.TextField(blank=True, null=True)
    
    # Campo para soft delete
    activo = models.BooleanField(default=True)
    
    fecha_pedido = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pedidos'
        verbose_name = 'Pedido'
        verbose_name_plural = 'Pedidos'
        ordering = ['-fecha_pedido']
    
    def __str__(self):
        return f"Pedido {self.numero_pedido}"


class ItemPedido(models.Model):
    """
    Items de cada pedido
    """
    pedido = models.ForeignKey(
        Pedido, 
        on_delete=models.CASCADE, 
        related_name='items'
    )
    producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT
    )
    nombre_producto = models.CharField(max_length=255)  # Guardar nombre por si el producto cambia
    cantidad = models.IntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        db_table = 'items_pedido'
        verbose_name = 'Item de Pedido'
        verbose_name_plural = 'Items de Pedido'
    
    def __str__(self):
        return f"{self.cantidad}x {self.producto}"


class HistorialEstadoPedido(models.Model):
    """
    Historial de cambios de estado de pedidos
    """
    pedido = models.ForeignKey(
        Pedido, 
        on_delete=models.CASCADE, 
        related_name='historial'
    )
    estado_anterior = models.CharField(max_length=50, blank=True, null=True)
    estado_nuevo = models.CharField(max_length=50)
    usuario_modificador = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    comentario = models.TextField(blank=True, null=True)
    fecha_cambio = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'historial_estados_pedido'
        verbose_name = 'Historial de Estado'
        verbose_name_plural = 'Historial de Estados'
        ordering = ['-fecha_cambio']
    
    def __str__(self):
        return f"{self.pedido.numero_pedido} - {self.estado_nuevo}"
