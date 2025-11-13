"""
Modelo actualizado de Pago para apps/pagos/models.py
REEMPLAZA el contenido actual de apps/pagos/models.py con este código
"""
from django.db import models
from apps.pedidos.models import Pedido

class Pago(models.Model):
    """
    Modelo de Pago con integración de MercadoPago
    """
    
    # Estados de pago ampliados
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
        ('cancelado', 'Cancelado'),
        ('en_proceso', 'En Proceso'),
        ('en_mediacion', 'En Mediación'),
        ('devuelto', 'Devuelto'),
    ]
    
    # Métodos de pago
    METODO_PAGO_CHOICES = [
        ('mercadopago', 'MercadoPago'),
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia Bancaria'),
    ]
    
    # Relación con pedido
    pedido = models.ForeignKey(
        Pedido, 
        on_delete=models.CASCADE, 
        related_name='pagos'
    )
    numero_pedido = models.CharField(max_length=50, blank=True, null=True)
    
    # Información básica del pago
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    metodo_pago = models.CharField(
        max_length=100, 
        choices=METODO_PAGO_CHOICES,
        default='mercadopago'
    )
    estado_pago = models.CharField(
        max_length=20, 
        choices=ESTADO_CHOICES, 
        default='pendiente'
    )
    
    # Campos específicos de MercadoPago
    preference_id = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text='ID de preferencia de MercadoPago'
    )
    payment_id = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text='ID de pago de MercadoPago'
    )
    merchant_order_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='ID de orden del comerciante'
    )
    
    # Información del pagador
    payer_email = models.EmailField(blank=True, null=True)
    payer_nombre = models.CharField(max_length=100, blank=True, null=True)
    payer_apellido = models.CharField(max_length=100, blank=True, null=True)
    
    # Información adicional
    tipo_pago = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text='Tipo de pago (credit_card, debit_card, ticket, etc.)'
    )
    cuotas = models.IntegerField(
        default=1,
        help_text='Cantidad de cuotas'
    )
    
    # Status detallado de MercadoPago
    status_detail = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Detalle del estado del pago'
    )
    
    # Fechas
    fecha_pago = models.DateTimeField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pagos'
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['preference_id']),
            models.Index(fields=['payment_id']),
            models.Index(fields=['estado_pago']),
        ]
    
    def __str__(self):
        return f"Pago {self.id} - {self.pedido.numero_pedido} - ${self.monto} ({self.estado_pago})"
    
    def esta_aprobado(self):
        """Verifica si el pago está aprobado"""
        return self.estado_pago == 'aprobado'
    
    def esta_pendiente(self):
        """Verifica si el pago está pendiente"""
        return self.estado_pago in ['pendiente', 'en_proceso']