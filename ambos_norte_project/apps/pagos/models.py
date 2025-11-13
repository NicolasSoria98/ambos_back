from django.db import models
from apps.pedidos.models import Pedido

# Create your models here.
class Pago(models.Model):
    
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
    ]
    
    pedido = models.ForeignKey(
        Pedido, 
        on_delete=models.CASCADE, 
        related_name='pagos'
    )
    numero_pedido = models.CharField(max_length=50, blank=True, null=True)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    metodo_pago = models.CharField(max_length=100, blank=True, null=True)
    estado_pago = models.CharField(
        max_length=20, 
        choices=ESTADO_CHOICES, 
        default='pendiente'
    )
    fecha_pago = models.DateTimeField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'pagos'
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"Pago de {self.pedido.numero_pedido} - {self.monto}"