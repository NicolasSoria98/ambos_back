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
        
        # Crear o actualizar el pago
        pago, created = Pago.objects.update_or_create(
            payment_id=payment_id,
            defaults={
                'pedido': pedido,
                'numero_pedido': pedido.numero_pedido,
                'monto': request.data.get('transaction_amount', pedido.total),
                'metodo_pago': 'mercadopago',
                'estado_pago': estado_pago,
                'status_detail': request.data.get('status_detail'),
                'payer_email': request.data.get('payer_email'),
                'tipo_pago': request.data.get('payment_method_id'),
                'cuotas': request.data.get('installments', 1),
                'fecha_pago': timezone.now() if mp_status == 'approved' else None
            }
        )
        
        action_text = "creado" if created else "actualizado"
        print(f"✅ Pago {action_text}: ID={pago.id}, Estado={estado_pago}")
        
        # Si el pago fue aprobado, actualizar estado del pedido
        if estado_pago == 'aprobado':
            estado_anterior = pedido.estado
            pedido.estado = 'en_preparacion'
            pedido.save()
            
            print(f"✅ Pedido actualizado: {estado_anterior} → en_preparacion")
            
            # Registrar en historial
            HistorialEstadoPedido.objects.create(
                pedido=pedido,
                estado_anterior=estado_anterior,
                estado_nuevo='en_preparacion',
                usuario_modificador=None,  # Sistema automático
                comentario=f'Pago aprobado automáticamente - Payment ID: {payment_id}'
            )
        
        return Response({
            'success': True,
            'pago_id': pago.id,
            'created': created,
            'estado': estado_pago,
            'pedido_actualizado': pedido.estado if estado_pago == 'aprobado' else None
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
        Documentación: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
        """
        try:
            print("\n🔔 === WEBHOOK RECIBIDO DE MERCADOPAGO ===")
            print(f"📦 Body: {request.body.decode('utf-8')}")
            print(f"📋 Query params: {request.query_params}")
            print(f"📨 Headers: {dict(request.headers)}")
            
            # MercadoPago puede enviar notificaciones de dos formas:
            # 1. Como query params: ?topic=payment&id=123456
            # 2. Como body JSON: {"action": "payment.created", "data": {"id": "123456"}}
            
            # Intentar obtener datos desde query params
            topic = request.query_params.get('topic') or request.query_params.get('type')
            resource_id = request.query_params.get('id')
            
            # Si no están en query params, buscar en el body
            if not topic or not resource_id:
                try:
                    data = json.loads(request.body.decode('utf-8'))
                    topic = data.get('type') or data.get('topic')
                    resource_id = data.get('data', {}).get('id')
                except:
                    pass
            
            print(f"🔍 Topic: {topic}, Resource ID: {resource_id}")
            
            # Solo procesamos notificaciones de tipo 'payment'
            if topic == 'payment' and resource_id:
                print(f"💳 Procesando pago con ID: {resource_id}")
                
                # ✅ OBTENER INFO DEL PAGO CON MANEJO DE ERRORES
                try:
                    payment_info = sdk.payment().get(resource_id)
                    
                    if payment_info.get('status') != 200:
                        print(f"❌ Error obteniendo pago de MP: {payment_info}")
                        return Response({'status': 'error getting payment'}, status=status.HTTP_200_OK)
                    
                    payment = payment_info["response"]
                    print(f"📄 Info del pago: {json.dumps(payment, indent=2, default=str)}")
                    
                except Exception as sdk_error:
                    print(f"❌ Error en SDK al obtener pago: {str(sdk_error)}")
                    return Response({'status': 'sdk error'}, status=status.HTTP_200_OK)
                
                # Obtener el pedido desde external_reference
                external_reference = payment.get('external_reference')
                
                if not external_reference:
                    print("⚠️ No se encontró external_reference en el pago")
                    return Response({'status': 'no external reference'}, status=status.HTTP_200_OK)
                
                try:
                    pedido = Pedido.objects.get(id=external_reference)
                    print(f"✅ Pedido encontrado: {pedido.numero_pedido}")
                except Pedido.DoesNotExist:
                    print(f"❌ Pedido {external_reference} no encontrado")
                    return Response({'status': 'pedido not found'}, status=status.HTTP_404_NOT_FOUND)
                
                # Buscar o crear el registro de pago
                pago, created = Pago.objects.get_or_create(
                    payment_id=str(resource_id),
                    defaults={
                        'pedido': pedido,
                        'numero_pedido': pedido.numero_pedido,
                        'monto': Decimal(str(payment.get('transaction_amount', 0))),
                        'metodo_pago': 'mercadopago',
                        'estado_pago': 'pendiente'
                    }
                )
                
                if created:
                    print(f"✨ Nuevo pago creado: ID {pago.id}")
                else:
                    print(f"📝 Actualizando pago existente: ID {pago.id}")
                
                # Mapear estado de MercadoPago a nuestro sistema
                mp_status = payment.get('status')
                estado_map = {
                    'approved': 'aprobado',
                    'pending': 'pendiente',
                    'in_process': 'en_proceso',
                    'rejected': 'rechazado',
                    'cancelled': 'cancelado',
                    'refunded': 'devuelto',
                    'in_mediation': 'en_mediacion'
                }
                
                nuevo_estado = estado_map.get(mp_status, 'pendiente')
                print(f"🔄 Estado MP: {mp_status} -> Nuestro estado: {nuevo_estado}")
                
                # Actualizar información del pago
                estado_anterior = pago.estado_pago
                pago.estado_pago = nuevo_estado
                pago.payment_id = str(resource_id)
                pago.merchant_order_id = str(payment.get('order', {}).get('id', ''))
                pago.tipo_pago = payment.get('payment_type_id', '')
                pago.status_detail = payment.get('status_detail', '')
                pago.cuotas = payment.get('installments', 1)
                
                if mp_status == 'approved':
                    pago.fecha_pago = datetime.now()
                
                pago.save()
                print(f"💾 Pago actualizado: {estado_anterior} -> {nuevo_estado}")
                
                # Actualizar estado del pedido según el pago
                if nuevo_estado == 'aprobado':
                    # Pago aprobado -> cambiar pedido a "en_preparacion" si no lo está
                    if pedido.estado != 'en_preparacion':
                        pedido.estado = 'en_preparacion'
                        pedido.save()
                        
                        # Registrar en historial
                        HistorialEstadoPedido.objects.create(
                            pedido=pedido,
                            estado_anterior='pendiente',
                            estado_nuevo='en_preparacion',
                            comentario=f'Pago aprobado - ID: {resource_id}'
                        )
                        print(f"✅ Pedido actualizado a 'en_preparacion'")
                
                elif nuevo_estado in ['rechazado', 'cancelado']:
                    # Pago rechazado/cancelado -> marcar pedido como cancelado
                    if pedido.estado != 'cancelado':
                        pedido.estado = 'cancelado'
                        pedido.activo = False
                        pedido.save()
                        
                        # Registrar en historial
                        HistorialEstadoPedido.objects.create(
                            pedido=pedido,
                            estado_anterior=estado_anterior,
                            estado_nuevo='cancelado',
                            comentario=f'Pago {nuevo_estado} - ID: {resource_id}'
                        )
                        print(f"❌ Pedido cancelado por pago {nuevo_estado}")
                
                print("✅ Webhook procesado exitosamente")
                return Response({'status': 'success'}, status=status.HTTP_200_OK)
            
            else:
                print(f"ℹ️ Notificación ignorada. Topic: {topic}")
                return Response({'status': 'ignored'}, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"❌ Error en webhook: {str(e)}")
            print(f"📋 Traceback completo:")
            print(traceback.format_exc())
            # Devolver 200 para que MP no reintente la notificación
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_200_OK)
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsAdminUser])
    def cambiar_estado(self, request, pk=None):
        """
        Permite al admin cambiar manualmente el estado de un pago
        SOLO entre: aprobado, pendiente, cancelado
        
        PATCH /api/pagos/pago/{id}/cambiar_estado/
        
        Body:
        {
            "estado": "aprobado" | "pendiente" | "cancelado"
        }
        """
        try:
            pago = self.get_object()
            nuevo_estado = request.data.get('estado')
            
            # Validar que el estado sea válido - SOLO aprobado, pendiente, cancelado
            estados_validos = ['aprobado', 'pendiente', 'cancelado']
            
            if not nuevo_estado:
                return Response({
                    'success': False,
                    'error': 'El campo estado es requerido'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if nuevo_estado not in estados_validos:
                return Response({
                    'success': False,
                    'error': f'Estado inválido. Opciones válidas: {", ".join(estados_validos)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Guardar estado anterior
            estado_anterior = pago.estado_pago
            
            # Actualizar estado
            pago.estado_pago = nuevo_estado
            
            # Si se aprueba manualmente, registrar fecha de pago
            if nuevo_estado == 'aprobado' and not pago.fecha_pago:
                pago.fecha_pago = datetime.now()
            
            pago.save()
            
            print(f"✅ Estado de pago #{pago.id} cambiado: {estado_anterior} -> {nuevo_estado} (por admin)")
            
            # Actualizar estado del pedido si es necesario
            if pago.pedido:
                pedido = pago.pedido
                
                if nuevo_estado == 'aprobado' and pedido.estado == 'pendiente':
                    pedido.estado = 'en_preparacion'
                    pedido.save()
                    
                    HistorialEstadoPedido.objects.create(
                        pedido=pedido,
                        estado_anterior='pendiente',
                        estado_nuevo='en_preparacion',
                        comentario=f'Pago aprobado manualmente por admin - Pago ID: {pago.id}'
                    )
                    print(f"✅ Pedido #{pedido.id} actualizado a 'en_preparacion'")
                
                elif nuevo_estado == 'cancelado':
                    if pedido.estado != 'cancelado':
                        pedido.estado = 'cancelado'
                        pedido.activo = False
                        pedido.save()
                        
                        HistorialEstadoPedido.objects.create(
                            pedido=pedido,
                            estado_anterior=estado_anterior,
                            estado_nuevo='cancelado',
                            comentario=f'Pago cancelado manualmente por admin - Pago ID: {pago.id}'
                        )
                        print(f"❌ Pedido #{pedido.id} cancelado")
            
            serializer = self.get_serializer(pago)
            return Response({
                'success': True,
                'message': f'Estado actualizado de {estado_anterior} a {nuevo_estado}',
                'pago': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"❌ Error cambiando estado de pago: {str(e)}")
            print(traceback.format_exc())
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
