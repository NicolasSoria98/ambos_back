from django.contrib import admin
from .models import Envio
# Register your models here.
@admin.register(Envio)
class EnvioAdmin(admin.ModelAdmin):
    list_display = ['pedido', 'numero_envio', 'numero_seguimiento', 'estado_envio', 'direccion', 'fecha_envio', 'fecha_entrega_estimada']
    list_filter = ['estado_envio']
    search_fields = ['numero_envio', 'numero_seguimiento', 'pedido__numero_pedido']
