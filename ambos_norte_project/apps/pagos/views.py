from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Pago
from .serializer import PagoSerializer

class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer
    
    def get_queryset(self):
        """
        Filtra pagos según parámetros
        """
        queryset = Pago.objects.select_related('pedido')
        
        # Filtro por pedido
        pedido_id = self.request.query_params.get('pedido', None)
        if pedido_id:
            queryset = queryset.filter(pedido_id=pedido_id)
        
        # Filtro por estado
        estado = self.request.query_params.get('estado', None)
        if estado:
            queryset = queryset.filter(estado_pago=estado)
        
        return queryset.order_by('-fecha_creacion')
    
    def get_permissions(self):
        """
        Define permisos según la acción
        """
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]
