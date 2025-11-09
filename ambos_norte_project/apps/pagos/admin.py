from django.contrib import admin
from .models import Pago
# Register your models here.
@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ['numero_pedido', 'pedido', 'monto', 'estado_pago', 'fecha_pago']
    list_filter = ['estado_pago']
    search_fields = ['numero_pedido', 'pedido__numero_pedido']
