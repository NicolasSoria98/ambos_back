from django.db import models
from django.conf import settings
from apps.catalogo.models import Producto
from django.core.exceptions import ValidationError
# Create your models here.
class Carrito(models.Model):
    """
    Carrito de compras
    """
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='carritos'
    )
    session_id = models.CharField(max_length=255, blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'carritos'
        verbose_name = 'Carrito'
        verbose_name_plural = 'Carritos'
    
    def __str__(self):
        if self.usuario:
            return f"Carrito de {self.usuario.username}"
        return f"Carrito anónimo {self.session_id}"
    
    def calcular_subtotal(self):
        """Calcula el subtotal del carrito"""
        return sum(item.subtotal for item in self.items.all())
    
    def total_items(self):
        """Cuenta total de items en el carrito"""
        return sum(item.cantidad for item in self.items.all())


class ItemCarrito(models.Model):
    """
    Items individuales del carrito
    """
    carrito = models.ForeignKey(
        Carrito, 
        on_delete=models.CASCADE, 
        related_name='items'
    )
    producto = models.ForeignKey(
        Producto, 
        on_delete=models.CASCADE
    )
    cantidad = models.IntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_agregado = models.DateTimeField(auto_now_add=True)
    def save(self, *args, **kwargs):
        # Validar stock antes de guardar
        if not self.producto.tiene_stock(self.cantidad):
            raise ValidationError(
                f"Stock insuficiente para {self.producto.nombre}. "
                f"Disponible: {self.producto.stock}"
            )
        super().save(*args, **kwargs)
    
    class Meta:
        db_table = 'items_carrito'
        verbose_name = 'Item de Carrito'
        verbose_name_plural = 'Items de Carrito'
        unique_together = ['carrito', 'producto']  # No duplicar productos

    
    def __str__(self):
        return f"{self.cantidad}x {self.producto.nombre}"
    
    def subtotal(self):
        """Calcula el subtotal del item"""
        return self.cantidad * self.precio_unitario
