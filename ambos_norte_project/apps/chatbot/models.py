from django.db import models
from django.conf import settings
from apps.catalogo.models import Producto
from django.core.exceptions import ValidationError

# Create your models here.
class ChatbotConversacion(models.Model):
    """
    Conversaciones del chatbot
    """
    session_id = models.CharField(max_length=255)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='conversaciones_chatbot'
    )
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'chatbot_conversaciones'
        verbose_name = 'Conversación de Chatbot'
        verbose_name_plural = 'Conversaciones de Chatbot'
        ordering = ['-fecha_inicio']
    
    def __str__(self):
        if self.usuario:
            return f"Chat de {self.usuario.username}"
        return f"Chat anónimo {self.session_id}"


class ChatbotMensaje(models.Model):
    """
    Mensajes individuales del chatbot
    """
    TIPO_CHOICES = [
        ('usuario', 'Usuario'),
        ('bot', 'Bot'),
    ]
    
    conversacion = models.ForeignKey(
        ChatbotConversacion, 
        on_delete=models.CASCADE, 
        related_name='mensajes'
    )
    tipo_mensaje = models.CharField(max_length=100, choices=TIPO_CHOICES)
    contenido = models.TextField()
    producto_relacionado = models.ForeignKey(
        Producto, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        db_column='producto_relacionado_id'
    )
    fecha_mensaje = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chatbot_mensajes'
        verbose_name = 'Mensaje de Chatbot'
        verbose_name_plural = 'Mensajes de Chatbot'
        ordering = ['fecha_mensaje']
    
    def __str__(self):
        return f"{self.tipo_mensaje}: {self.contenido[:50]}"
