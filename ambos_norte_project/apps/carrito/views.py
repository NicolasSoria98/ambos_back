from django.shortcuts import render, get_object_or_404
from django.core.exceptions import ValidationError 
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Carrito, ItemCarrito
from apps.catalogo.models import Producto
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
        cantidad = int(request.data.get('cantidad', 1))
        producto = get_object_or_404(Producto, pk=producto_id)

        try:
            item, creado = ItemCarrito.objects.get_or_create(
                carrito=carrito,
                producto=producto,
                defaults={'cantidad': cantidad, 'precio_unitario': producto.precio}  
            )

            if not creado:
                item.cantidad += cantidad
                item.save()
            
            # ✅ CORREGIDO: status (era statu)
            return Response(ItemCarritoSerializer(item).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def vaciar(self, request, pk=None):
        carrito = self.get_object()
        # ✅ CORREGIDO: items.all() (era item,all())
        carrito.items.all().delete()
        return Response({'mensaje': 'Carrito vaciado correctamente.'}, status=status.HTTP_200_OK)

class ItemCarritoViewSet(viewsets.ModelViewSet):
    queryset = ItemCarrito.objects.all()
    serializer_class = ItemCarritoSerializer


