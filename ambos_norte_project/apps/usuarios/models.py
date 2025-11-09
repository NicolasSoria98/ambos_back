from django.db import models
from django.contrib.auth.models import AbstractUser
# Create your models here.

class Usuario(AbstractUser):
    TIPO_CHOICES = [
        ('cliente', 'Cliente'),
        ('administrador', 'Administrador'),
    ]

    telefono = models.CharField(max_length=20, blank=True, null=True)
    tipo_usuario = models.CharField(max_length=50, choices=TIPO_CHOICES, default='cliente')
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'usuarios'
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
    
    def __str__(self):
        return self.email or self.username

class Direccion(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='direcciones')
    calle = models.CharField(max_length=255)
    numero = models.CharField(max_length=10)
    piso_depto = models.CharField(max_length=20, blank=True, null=True)
    ciudad = models.CharField(max_length=100)
    provincia = models.CharField(max_length=100)
    codigo_postal = models.CharField(max_length=20)
    es_predeterminada = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'direcciones'
        verbose_name = 'Dirección'
        verbose_name_plural = 'Direcciones'
    
    def __str__(self):
        return f"{self.calle} {self.numero}, {self.ciudad}"
