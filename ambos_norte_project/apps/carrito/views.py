from django.shortcuts import render, get_object_or_404
from django.core.exceptions import ValidationError 
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Carrito, ItemCarrito
from apps.catalogo.models import Producto, ProductoVariante
from .serializer import CarritoSerializer, ItemCarritoSerializer

class CarritoViewSet(viewsets.ModelViewSet):
    queryset = Carrito.objects.all()
    serializer_class = CarritoSerializer

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)
    
    @action(detail=True, methods=['post'])
    def agregar_item(self, request, pk=None):
        carrito = self.get_object()
        producto_id = request.data.get('producto_id')
        variante_id = request.data.get('variante_id')  # NUEVO: Recibir variante_id
        cantidad = int(request.data.get('cantidad', 1))
        producto = get_object_or_404(Producto, pk=producto_id)

        try:
            # Si se especifica variante, obtenerla
            variante = None
            if variante_id:
                variante = get_object_or_404(ProductoVariante, pk=variante_id, producto=producto)
                precio_unitario = variante.precio_final
            else:
                precio_unitario = producto.precio_base

            # Intentar obtener o crear el item con la variante
            item, creado = ItemCarrito.objects.get_or_create(
                carrito=carrito,
                producto=producto,
                variante=variante,  # NUEVO: Incluir variante en la búsqueda
                defaults={'cantidad': cantidad, 'precio_unitario': precio_unitario}  
            )

            if not creado:
                item.cantidad += cantidad
                item.save()
            
            return Response(ItemCarritoSerializer(item).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def vaciar(self, request, pk=None):
        carrito = self.get_object()
        carrito.items.all().delete()
        return Response({'mensaje': 'Carrito vaciado correctamente.'}, status=status.HTTP_200_OK)

class ItemCarritoViewSet(viewsets.ModelViewSet):
    queryset = ItemCarrito.objects.all()
    serializer_class = ItemCarritoSerializer

