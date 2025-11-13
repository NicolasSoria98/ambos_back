from django.contrib import admin
from .models import Categoria, Producto, ImagenProducto, Talla, Color, ProductoVariante

# Register your models here.
@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'activo', 'fecha_creacion']
    list_filter = ['activo']
    search_fields = ['nombre']
    list_editable = ['activo']


@admin.register(Talla)
class TallaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'orden', 'activo']
    list_filter = ['activo']
    search_fields = ['nombre']
    list_editable = ['orden', 'activo']
    ordering = ['orden', 'nombre']


@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'codigo_hex', 'activo']
    list_filter = ['activo']
    search_fields = ['nombre']
    list_editable = ['activo']


class ImagenProductoInline(admin.TabularInline):
    model = ImagenProducto
    extra = 1
    fields = ['imagen', 'orden']


class ProductoVarianteInline(admin.TabularInline):
    model = ProductoVariante
    extra = 1
    fields = ['talla', 'color', 'stock', 'precio_adicional', 'sku', 'activo']
    autocomplete_fields = ['talla', 'color']


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'categoria', 'precio_base', 'get_stock_total', 'activo', 'destacado']
    list_filter = ['categoria', 'activo', 'destacado']
    search_fields = ['nombre', 'descripcion']
    list_editable = ['activo', 'destacado']
    inlines = [ImagenProductoInline, ProductoVarianteInline]
    readonly_fields = ['fecha_creacion', 'fecha_modificacion']
    
    def get_stock_total(self, obj):
        """Muestra el stock total de todas las variantes"""
        return obj.stock_total()
    get_stock_total.short_description = 'Stock Total'


@admin.register(ProductoVariante)
class ProductoVarianteAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'producto', 'talla', 'color', 'stock', 'precio_final', 'activo']
    list_filter = ['activo', 'producto__categoria', 'talla', 'color']
    search_fields = ['producto__nombre', 'sku']
    list_editable = ['stock', 'activo']
    autocomplete_fields = ['producto', 'talla', 'color']
    readonly_fields = ['fecha_creacion', 'fecha_modificacion', 'precio_final']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('producto', 'talla', 'color', 'sku')
        }),
        ('Inventario y Precio', {
            'fields': ('stock', 'precio_adicional', 'precio_final', 'activo')
        }),
        ('Fechas', {
            'fields': ('fecha_creacion', 'fecha_modificacion'),
            'classes': ('collapse',)
        }),
    )