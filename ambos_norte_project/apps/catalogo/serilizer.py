from rest_framework import serializers
from .models import Categoria, Producto, ImagenProducto

class CategoriaSerializar(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'
        read_only = ('fecha_creacion',)

class ProductoSerializer(serializers.ModelSerializer):
    tiene_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = Producto
        fields = '__all__'

    def get_tiene_stock(self, obj):
        return obj.tiene_stock()

class ImagenProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagenProducto
        fields = '__all__'