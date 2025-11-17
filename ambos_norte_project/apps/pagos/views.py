from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.utils import timezone
from .models import Pago
from .serializer import PagoSerializer
from apps.pedidos.models import Pedido, HistorialEstadoPedido

class PagoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para manejar pagos
    Los pagos se crean desde el servicio de Express/MercadoPago
    """
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer
    
    def get_queryset(self):
        queryset = Pago.objects.all()
        
        # Filtros opcionales
        pedido_id = self.request.query_params.get('pedido', None)
        estado = self.request.query_params.get('estado', None)
        payment_id = self.request.query_params.get('payment_id', None)
        
        if pedido_id:
            queryset = queryset.filter(pedido_id=pedido_id)
        if estado:
            queryset = queryset.filter(estado_pago=estado)
        if payment_id:
            queryset = queryset.filter(payment_id=payment_id)
            
        return queryset


@api_view(['POST'])
def confirmar_pago_mp(request):
    """
    Endpoint para que Express notifique cuando un pago fue procesado
    
    Esperamos recibir:
    {
        "pedido_id": 123,
        "payment_id": "123456789",
        "status": "approved",
        "status_detail": "accredited",
        "transaction_amount": 5000,
        "payment_method_id": "visa",
        "payer_email": "test@test.com",
        "installments": 1
    }
    """
    try:
        pedido_id = request.data.get('pedido_id')
        payment_id = request.data.get('payment_id')
        mp_status = request.data.get('status')
        
        print(f"📥 Recibido pago de Express: pedido_id={pedido_id}, payment_id={payment_id}, status={mp_status}")
        
        # Validar datos requeridos
        if not all([pedido_id, payment_id, mp_status]):
            return Response({
                'success': False,
                'error': 'Faltan datos requeridos (pedido_id, payment_id, status)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Buscar el pedido
        try:
            pedido = Pedido.objects.get(id=pedido_id)
            print(f"✅ Pedido encontrado: {pedido.numero_pedido}")
        except Pedido.DoesNotExist:
            print(f"❌ Pedido {pedido_id} no encontrado")
            return Response({
                'success': False,
                'error': f'Pedido con ID {pedido_id} no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Mapear estados de MercadoPago a nuestros estados
        estado_mapping = {
            'approved': 'aprobado',
            'pending': 'pendiente',
            'in_process': 'en_proceso',
            'rejected': 'rechazado',
            'cancelled': 'cancelado',
            'refunded': 'devuelto'
        }
        
        estado_pago = estado_mapping.get(mp_status, 'pendiente')
        
        # 🔥 CAMBIO CRÍTICO: Buscar el pago existente asociado al pedido
        try:
            pago = Pago.objects.get(pedido=pedido)
            print(f"✅ Pago existente encontrado: ID={pago.id}")
            
            # Actualizar el pago existente
            pago.payment_id = payment_id
            pago.estado_pago = estado_pago
            pago.monto = request.data.get('transaction_amount', pedido.total)
            pago.status_detail = request.data.get('status_detail')
            pago.payer_email = request.data.get('payer_email')
            pago.tipo_pago = request.data.get('payment_method_id')
            pago.cuotas = request.data.get('installments', 1)
            
            if mp_status == 'approved':
                pago.fecha_pago = timezone.now()
            
            pago.save()
            print(f"✅ Pago actualizado: ID={pago.id}, Estado={estado_pago}")
            created = False
            
        except Pago.DoesNotExist:
            # Si no existe (caso raro), crear uno nuevo
            print(f"⚠️ No se encontró pago para el pedido {pedido.numero_pedido}, creando uno nuevo")
            pago = Pago.objects.create(
                pedido=pedido,
                numero_pedido=pedido.numero_pedido,
                payment_id=payment_id,
                monto=request.data.get('transaction_amount', pedido.total),
                metodo_pago='mercadopago',
                estado_pago=estado_pago,
                status_detail=request.data.get('status_detail'),
                payer_email=request.data.get('payer_email'),
                tipo_pago=request.data.get('payment_method_id'),
                cuotas=request.data.get('installments', 1),
                fecha_pago=timezone.now() if mp_status == 'approved' else None
            )
            print(f"✅ Pago creado: ID={pago.id}, Estado={estado_pago}")
            created = True
        
        # Si el pago fue aprobado, actualizar estado del pedido y su estado_pago
        if estado_pago == 'aprobado':
            estado_anterior = pedido.estado
            pedido.estado_pago = 'pagado'  # ✅ Actualizar estado_pago del pedido
            pedido.save()
            
            print(f"✅ Pedido actualizado: estado={pedido.estado}, estado_pago={pedido.estado_pago}")
            
            # Registrar en historial
            HistorialEstadoPedido.objects.create(
                pedido=pedido,
                estado_anterior=estado_anterior,
                estado_nuevo=pedido.estado,
                usuario_modificador=None,  # Sistema automático
                comentario=f'Pago aprobado automáticamente - Payment ID: {payment_id}'
            )
        
        return Response({
            'success': True,
            'pago_id': pago.id,
            'created': created,
            'estado': estado_pago,
            'pedido_actualizado': pedido.estado if estado_pago == 'aprobado' else None,
            'estado_pago_pedido': pedido.estado_pago
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ Error en confirmar_pago_mp: {str(e)}")
        import traceback
        print(f"📋 Traceback:\n{traceback.format_exc()}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def verificar_pago(request, payment_id):
    """
    Verificar el estado de un pago por payment_id
    GET /api/pagos/verificar/{payment_id}/
    """
    try:
        pago = Pago.objects.get(payment_id=payment_id)
        serializer = PagoSerializer(pago)
        return Response({
            'success': True,
            'pago': serializer.data
        })
    except Pago.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Pago no encontrado'
        }, status=status.HTTP_404_NOT_FOUND)