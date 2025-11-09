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

class Producto(models.Model):
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        related_name = 'productos'
    )
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    talla = models.CharField(max_length=50, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    material = models.CharField(max_length=100, blank=True, null=True)
    imagen_principal = models.ImageField(upload_to='productos/', blank=True, null=True)
    activo = models.BooleanField(default=True)
    destacado = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    def tiene_stock(self, cantidad=1):
        """Verifica si hay stock suficiente"""
        return self.stock >= cantidad
    
    def reducir_stock(self, cantidad):
        """Reduce el stock de forma segura"""
        if not self.tiene_stock(cantidad):
            raise ValidationError(f"Stock insuficiente. Disponible: {self.stock}")
        self.stock -= cantidad
        self.save()
    
    def aumentar_stock(self, cantidad):
        """Aumenta el stock"""
        self.stock += cantidad
        self.save()

    class Meta:
        db_table = 'productos'
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return self.nombre
    
    
    @property
    def stock_disponible(self):
        """Verifica si hay stock disponible"""
        return self.stock > 0
    

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
