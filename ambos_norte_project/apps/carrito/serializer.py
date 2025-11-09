from rest_framework import serializers
from .models import Carrito, ItemCarrito
from apps.catalogo.serializers import ProductoSerializer

class ItemCarritoSerializer(serializers.ModelSerializer):
    
    producto = ProductoSerializer(read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = ItemCarrito
        fields = '__all__'
        read_only = ('fecha_agregado',)
    
    def get_subtotal(self, obj):
        return obj.subtotal()

class CarritoSerializer(serializers.ModelSerializer):
    
    items = ItemCarritoSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = Carrito
        fields = '__all__'
        read_only = ('fecha_creacion','fecha_modificacion',)

    def get_subtotal(self, obj):
        return obj.calcular_subtotal()

    def get_total_items(self, obj):
        return obj.total_items()
