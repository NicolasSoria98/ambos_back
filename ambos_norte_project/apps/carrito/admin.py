from django.contrib import admin
from .models import Carrito, ItemCarrito
# Register your models here.
class ItemCarritoInline(admin.TabularInline):
    model = ItemCarrito
    extra = 0


@admin.register(Carrito)
class CarritoAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuario', 'session_id', 'fecha_creacion']
    list_filter = []
    search_fields = ['usuario__username', 'session_id']
    inlines = [ItemCarritoInline]
