from django.db import models
from django.core.exceptions import ValidationError

# Create your models here.
class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categorias'
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class Talla(models.Model):
    """
    Catálogo de tallas disponibles (XS, S, M, L, XL, etc.)
    """
    nombre = models.CharField(max_length=50, unique=True)
    orden = models.IntegerField(default=0, help_text="Orden de visualización")
    activo = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'tallas'
        verbose_name = 'Talla'
        verbose_name_plural = 'Tallas'
        ordering = ['orden', 'nombre']
    
    def __str__(self):
        return self.nombre


class Color(models.Model):
    """
    Catálogo de colores disponibles
    """
    nombre = models.CharField(max_length=50, unique=True)
    codigo_hex = models.CharField(max_length=7, blank=True, null=True, help_text="Código hexadecimal del color (ej: #FF5733)")
    activo = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'colores'
        verbose_name = 'Color'
        verbose_name_plural = 'Colores'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class Producto(models.Model):
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        related_name='productos'
    )
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    precio_base = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio base del producto")
    material = models.CharField(max_length=100, blank=True, null=True)
    imagen_principal = models.ImageField(upload_to='productos/', blank=True, null=True)
    activo = models.BooleanField(default=True)
    destacado = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    # RelacionesMany-to-Many con tallas y colores
    tallas = models.ManyToManyField(
        Talla,
        through='ProductoVariante',
        related_name='productos'
    )
    colores = models.ManyToManyField(
        Color,
        through='ProductoVariante',
        related_name='productos'
    )

    class Meta:
        db_table = 'productos'
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return self.nombre
    
    def stock_total(self):
        """Retorna el stock total de todas las variantes"""
        return sum(variante.stock for variante in self.variantes.all())
    
    @property
    def stock_disponible(self):
        """Verifica si hay stock disponible en alguna variante"""
        return self.variantes.filter(stock__gt=0, activo=True).exists()
    
    def obtener_variantes_disponibles(self):
        """Retorna las variantes con stock disponible"""
        return self.variantes.filter(stock__gt=0, activo=True)


class ProductoVariante(models.Model):
    """
    Tabla intermedia que representa cada variante de un producto
    (combinación de producto + talla + color) con su propio stock
    """
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name='variantes'
    )
    talla = models.ForeignKey(
        Talla,
        on_delete=models.PROTECT,
        related_name='variantes'
    )
    color = models.ForeignKey(
        Color,
        on_delete=models.PROTECT,
        related_name='variantes'
    )
    stock = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'productos_variantes'
        verbose_name = 'Variante de Producto'
        verbose_name_plural = 'Variantes de Productos'
        ordering = ['producto', 'talla', 'color']
        unique_together = [['producto', 'talla', 'color']]  # Una sola variante por combinación
        indexes = [
            models.Index(fields=['producto', 'talla', 'color']),
        ]
    
    def __str__(self):
        return f"{self.producto.nombre} - {self.talla.nombre} - {self.color.nombre}"
    
    def tiene_stock(self, cantidad=1):
        """Verifica si hay stock suficiente"""
        return self.stock >= cantidad and self.activo
    
    def reducir_stock(self, cantidad):
        """Reduce el stock de forma segura"""
        if not self.tiene_stock(cantidad):
            raise ValidationError(
                f"Stock insuficiente para {self}. Disponible: {self.stock}"
            )
        self.stock -= cantidad
        self.save()
    
    def aumentar_stock(self, cantidad):
        """Aumenta el stock"""
        self.stock += cantidad
        self.save()
    
    @property
    def precio_final(self):
        """Calcula el precio final (precio base del producto)"""
        return self.producto.precio_base
    
    @property
    def stock_disponible(self):
        """Verifica si hay stock disponible"""
        return self.stock > 0 and self.activo


class ImagenProducto(models.Model):
    producto = models.ForeignKey(
        Producto, 
        on_delete=models.CASCADE, 
        related_name='imagenes'
    )
    imagen = models.ImageField(upload_to='productos/galeria/')
    orden = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'imagenes_producto'
        verbose_name = 'Imagen de Producto'
        verbose_name_plural = 'Imágenes de Productos'
        ordering = ['orden']
    
    def __str__(self):
        return f"Imagen {self.orden} - {self.producto.nombre}"