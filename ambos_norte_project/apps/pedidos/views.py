from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.db.models import Q, Sum, Count
from .models import Pedido, ItemPedido, HistorialEstadoPedido
from .serializers import PedidoSerializer, ItemPedidoSerializer, HistorialEstadoPedidoSerializer


class PedidoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar pedidos
    """
    queryset = Pedido.objects.all()
    serializer_class = PedidoSerializer
    
    def get_queryset(self):
        """
        Filtra pedidos según permisos y parámetros
        """
        queryset = Pedido.objects.select_related(
            'usuario', 
            'direccion'
        ).prefetch_related(
            'items__producto',
            'historial'
        )
        
        # Filtrar pedidos activos (solo admin puede ver inactivos)
        if not self.request.user.is_staff:
            queryset = queryset.filter(activo=True)
        
        # Si no es admin, solo ve sus propios pedidos
        if not self.request.user.is_staff:
            queryset = queryset.filter(usuario=self.request.user)
        
        # Filtros
        estado = self.request.query_params.get('estado', None)
        if estado:
            queryset = queryset.filter(estado=estado)
        
        usuario_id = self.request.query_params.get('usuario', None)
        if usuario_id and self.request.user.is_staff:
            queryset = queryset.filter(usuario_id=usuario_id)
        
        # Búsqueda por número de pedido o email
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(numero_pedido__icontains=search) |
                Q(email_contacto__icontains=search) |
                Q(telefono_contacto__icontains=search)
            )
        
        # Filtro por rango de fechas
        fecha_desde = self.request.query_params.get('fecha_desde', None)
        fecha_hasta = self.request.query_params.get('fecha_hasta', None)
        if fecha_desde:
            queryset = queryset.filter(fecha_pedido__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_pedido__lte=fecha_hasta)
        
        return queryset.order_by('-fecha_pedido')
    
    def get_permissions(self):
        """
        GET: Solo usuarios autenticados pueden ver sus pedidos
        POST/PUT/DELETE: Solo administradores
        """
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]
    
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """
        Cambia el estado de un pedido y registra en historial
        POST /api/pedidos/pedido/{id}/cambiar_estado/
        Body: { "nuevo_estado": "enviado", "comentario": "Pedido despachado" }
        """
        pedido = self.get_object()
        nuevo_estado = request.data.get('nuevo_estado')
        comentario = request.data.get('comentario', '')
        
        # Validar que el estado sea válido
        estados_validos = [choice[0] for choice in Pedido.ESTADO_CHOICES]
        if nuevo_estado not in estados_validos:
            return Response(
                {'error': f'Estado inválido. Opciones: {estados_validos}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Guardar estado anterior
        estado_anterior = pedido.estado
        
        # Actualizar pedido
        pedido.estado = nuevo_estado
        
        # Si el nuevo estado es "cancelado", desactivar el pedido
        if nuevo_estado == 'cancelado':
            pedido.activo = False
            if not comentario:
                comentario = 'Pedido cancelado automáticamente'
        
        pedido.save()
        
        # Crear registro en historial
        HistorialEstadoPedido.objects.create(
            pedido=pedido,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            usuario_modificador=request.user,
            comentario=comentario
        )
        
        return Response({
            'mensaje': f'Estado cambiado de "{estado_anterior}" a "{nuevo_estado}"',
            'pedido': PedidoSerializer(pedido).data
        })
    
    @action(detail=True, methods=['post'])
    def toggle_activo(self, request, pk=None):
        """
        Alterna el estado activo de un pedido
        POST /api/pedido/{id}/toggle_activo/
        """
        pedido = self.get_object()
        
        # Si se está desactivando, cambiar estado a cancelado
        if pedido.activo:
            estado_anterior = pedido.estado
            pedido.activo = False
            pedido.estado = 'cancelado'
            pedido.save()
            
            # Registrar en historial
            HistorialEstadoPedido.objects.create(
                pedido=pedido,
                estado_anterior=estado_anterior,
                estado_nuevo='cancelado',
                usuario_modificador=request.user,
                comentario='Pedido cancelado y desactivado'
            )
            
            return Response({
                'mensaje': 'Pedido cancelado y desactivado',
                'activo': False,
                'estado': 'cancelado'
            })
        else:
            # Si se está reactivando, solo cambiar activo (mantener estado cancelado)
            pedido.activo = True
            pedido.save()
            
            # Registrar en historial
            HistorialEstadoPedido.objects.create(
                pedido=pedido,
                estado_anterior='cancelado',
                estado_nuevo=pedido.estado,
                usuario_modificador=request.user,
                comentario='Pedido reactivado'
            )
            
            return Response({
                'mensaje': 'Pedido reactivado',
                'activo': True,
                'estado': pedido.estado
            })
    
    def destroy(self, request, *args, **kwargs):
        """
        Sobrescribe el método destroy para desactivar en lugar de eliminar
        DELETE /api/pedido/{id}/
        """
        pedido = self.get_object()
        
        # Si ya está inactivo, no hacer nada
        if not pedido.activo:
            return Response({
                'error': 'El pedido ya está inactivo'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Guardar estado anterior para el historial
        estado_anterior = pedido.estado
        
        # Desactivar el pedido y cambiar estado a cancelado
        pedido.activo = False
        pedido.estado = 'cancelado'
        pedido.save()
        
        # Registrar en historial
        HistorialEstadoPedido.objects.create(
            pedido=pedido,
            estado_anterior=estado_anterior,
            estado_nuevo='cancelado',
            usuario_modificador=request.user,
            comentario='Pedido cancelado y desactivado (eliminación lógica)'
        )
        
        return Response({
            'mensaje': 'Pedido cancelado y desactivado correctamente',
            'activo': False,
            'estado': 'cancelado'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """
        Obtiene estadísticas de pedidos
        GET /api/pedidos/pedido/estadisticas/
        """
        # Solo contar pedidos activos
        total_pedidos = Pedido.objects.filter(activo=True).count()
        
        # Pedidos por estado (solo activos)
        por_estado = {}
        for estado_code, nombre in Pedido.ESTADO_CHOICES:
            por_estado[estado_code] = Pedido.objects.filter(
                estado=estado_code,
                activo=True
            ).count()
        
        # Total vendido (solo pedidos activos)
        total_vendido = Pedido.objects.filter(
            estado__in=['pagado', 'en_preparacion', 'enviado', 'entregado'],
            activo=True
        ).aggregate(total=Sum('total'))['total'] or 0
        
        # Pedidos recientes
        pedidos_hoy = Pedido.objects.filter(
            fecha_pedido__date=request.query_params.get('fecha', None),
            activo=True
        ).count() if request.query_params.get('fecha') else 0
        
        return Response({
            'total_pedidos': total_pedidos,
            'por_estado': por_estado,
            'total_vendido': float(total_vendido),
            'pedidos_hoy': pedidos_hoy
        })
    
    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        """
        Obtiene el historial de cambios de estado de un pedido
        GET /api/pedidos/pedido/{id}/historial/
        """
        pedido = self.get_object()
        historial = pedido.historial.all()
        serializer = HistorialEstadoPedidoSerializer(historial, many=True)
        return Response(serializer.data)


class ItemPedidoSetView(viewsets.ModelViewSet):
    """
    ViewSet para gestionar items de pedidos
    """
    queryset = ItemPedido.objects.all()
    serializer_class = ItemPedidoSerializer
    
    def get_queryset(self):
        """
        Filtra items por pedido si se proporciona el parámetro
        """
        queryset = ItemPedido.objects.select_related('pedido', 'producto')
        pedido_id = self.request.query_params.get('pedido', None)
        
        if pedido_id:
            queryset = queryset.filter(pedido_id=pedido_id)
        
        return queryset
    
    def get_permissions(self):
        """
        GET: Solo usuarios autenticados
        POST/PUT/DELETE: Solo administradores
        """
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]


class HistorialEstadoPedidoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar historial de estados
    """
    queryset = HistorialEstadoPedido.objects.all()
    serializer_class = HistorialEstadoPedidoSerializer
    
    def get_queryset(self):
        """
        Filtra historial por pedido si se proporciona el parámetro
        """
        queryset = HistorialEstadoPedido.objects.select_related(
            'pedido', 
            'usuario_modificador'
        )
        
        pedido_id = self.request.query_params.get('pedido', None)
        if pedido_id:
            queryset = queryset.filter(pedido_id=pedido_id)
        
        return queryset.order_by('-fecha_cambio')
    
    def get_permissions(self):
        """
        GET: Solo usuarios autenticados
        POST/PUT/DELETE: Solo administradores
        """
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]
