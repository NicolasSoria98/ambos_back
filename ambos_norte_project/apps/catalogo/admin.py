from django.contrib import admin
from .models import Categoria, Talla, Color, Producto, ProductoVariante, ImagenProducto


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'activo', 'fecha_creacion']
    list_filter = ['activo']
    search_fields = ['nombre', 'descripcion']
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
    fields = ['imagen', 'orden', 'variante']
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filtrar variantes para mostrar solo las del producto actual"""
        if db_field.name == "variante":
            # Obtener el producto del contexto si existe
            if request._obj_ is not None:
                kwargs["queryset"] = ProductoVariante.objects.filter(
                    producto=request._obj_
                )
            else:
                kwargs["queryset"] = ProductoVariante.objects.none()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class ProductoVarianteInline(admin.TabularInline):
    model = ProductoVariante
    extra = 1
    fields = ['talla', 'color', 'stock', 'activo']
    autocomplete_fields = ['talla', 'color']


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'categoria', 'precio_base', 'get_stock_total', 'activo', 'destacado']
    list_filter = ['categoria', 'activo', 'destacado']
    search_fields = ['nombre', 'descripcion']
    list_editable = ['activo', 'destacado']
    inlines = [ProductoVarianteInline, ImagenProductoInline]
    readonly_fields = ['fecha_creacion', 'fecha_modificacion']
    
    def get_stock_total(self, obj):
        """Muestra el stock total de todas las variantes"""
        return obj.stock_total()
    get_stock_total.short_description = 'Stock Total'
    
    def get_form(self, request, obj=None, **kwargs):
        """Guardar el objeto en el request para usarlo en los inlines"""
        request._obj_ = obj
        return super().get_form(request, obj, **kwargs)


@admin.register(ProductoVariante)
class ProductoVarianteAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'producto', 'talla', 'color', 'stock', 'precio_final', 'activo', 'contar_imagenes']
    list_filter = ['activo', 'producto__categoria', 'talla', 'color']
    search_fields = ['producto__nombre']
    list_editable = ['stock', 'activo']
    autocomplete_fields = ['producto', 'talla', 'color']
    readonly_fields = ['fecha_creacion', 'fecha_modificacion', 'precio_final']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('producto', 'talla', 'color')
        }),
        ('Inventario y Precio', {
            'fields': ('stock', 'precio_final', 'activo')
        }),
        ('Fechas', {
            'fields': ('fecha_creacion', 'fecha_modificacion'),
            'classes': ('collapse',)
        }),
    )
    
    def contar_imagenes(self, obj):
        """Mostrar cantidad de imágenes asociadas"""
        count = obj.imagenes.count()
        if count > 0:
            return f'📷 {count}'
        return '-'
    contar_imagenes.short_description = 'Imágenes'


@admin.register(ImagenProducto)
class ImagenProductoAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'producto', 'variante', 'orden']
    list_filter = ['producto']
    search_fields = ['producto__nombre']
    list_editable = ['orden']
    autocomplete_fields = ['producto', 'variante']
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filtrar variantes para mostrar solo las del producto seleccionado"""
        if db_field.name == "variante":
            # Si hay un producto en el GET (al editar)
            if 'producto' in request.GET:
                try:
                    producto_id = int(request.GET['producto'])
                    kwargs["queryset"] = ProductoVariante.objects.filter(
                        producto_id=producto_id
                    )
                except (ValueError, TypeError):
                    pass
        return super().formfield_for_foreignkey(db_field, request, **kwargs)