from django.contrib import admin
from .models import Pedido, ItemPedido, HistorialEstadoPedido
# Register your models here.
class ItemPedidoInline(admin.TabularInline):
    model = ItemPedido
    extra = 0


class HistorialEstadoInline(admin.TabularInline):
    model = HistorialEstadoPedido
    extra = 0


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ['numero_pedido', 'usuario', 'estado', 'total', 'fecha_pedido']
    list_filter = ['estado', 'fecha_pedido']
    search_fields = ['numero_pedido', 'usuario__username', 'email_contacto']
    inlines = [ItemPedidoInline, HistorialEstadoInline]
