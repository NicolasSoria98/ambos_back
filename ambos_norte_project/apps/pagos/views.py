from django.shortcuts import render
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal
from datetime import datetime
import mercadopago
import json
import traceback

from .models import Pago
from .serializer import PagoSerializer
from apps.pedidos.models import Pedido, HistorialEstadoPedido

# Inicializar SDK de MercadoPago según documentación oficial
sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)


class PagoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar pagos con integración de MercadoPago Checkout Pro
    """
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer
    
    def get_queryset(self):
        """Filtra pagos según parámetros"""
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
        - crear_preferencia: Usuario autenticado
        - webhook: Sin autenticación (MercadoPago lo llama)
        - resto: Admin o usuario autenticado
        """
        if self.action == 'crear_preferencia':
            return [IsAuthenticated()]
        elif self.action == 'webhook':
            return [AllowAny()]
        elif self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def crear_preferencia(self, request):
        """
        Crea una preferencia de pago según documentación oficial de MercadoPago
        
        POST /api/pagos/pago/crear_preferencia/
        
        Body esperado:
        {
            "pedido_id": 123,
            "items": [
                {
                    "title": "Ambo médico azul - Talle M",
                    "quantity": 2,
                    "unit_price": 15000.00
                }
            ],
            "payer": {
                "name": "Juan",
                "surname": "Pérez", 
                "email": "juan@email.com",
                "phone": "3794123456"
            }
        }
        
        Response:
        {
            "success": true,
            "preference_id": "123456789-abc123",
            "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
            "sandbox_init_point": "https://sandbox.mercadopago.com.ar/checkout/...",
            "pago_id": 1
        }
        """
        try:
            print("🔵 === CREAR PREFERENCIA DE PAGO ===")
            print(f"📦 Data recibida: {request.data}")
            
            # 1. VALIDAR DATOS REQUERIDOS
            pedido_id = request.data.get('pedido_id')
            items_data = request.data.get('items', [])
            payer_data = request.data.get('payer', {})
            
            if not pedido_id:
                return Response(
                    {'success': False, 'error': 'pedido_id es requerido'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not items_data:
                return Response(
                    {'success': False, 'error': 'items es requerido y no puede estar vacío'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 2. VERIFICAR QUE EL PEDIDO EXISTE
            try:
                pedido = Pedido.objects.get(id=pedido_id)
                print(f"✅ Pedido encontrado: {pedido.numero_pedido}")
            except Pedido.DoesNotExist:
                return Response(
                    {'success': False, 'error': 'Pedido no encontrado'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # 3. VERIFICAR PERMISOS (el pedido debe ser del usuario o ser admin)
            if not request.user.is_staff and pedido.usuario != request.user:
                return Response(
                    {'success': False, 'error': 'No tienes permisos para este pedido'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # 4. CONSTRUIR ITEMS PARA MERCADOPAGO
            # Según doc oficial: cada item debe tener title, quantity, unit_price
            preference_items = []
            for item in items_data:
                preference_items.append({
                    "title": str(item.get('title', 'Producto')),
                    "quantity": int(item.get('quantity', 1)),
                    "unit_price": float(item.get('unit_price', 0)),
                    "currency_id": "ARS"  # Pesos argentinos
                })
            
            print(f"📦 Items para MP: {preference_items}")
            
            # 5. CONSTRUIR URLs DE RETORNO - ✅ CORRECCIÓN PRINCIPAL
            # IMPORTANTE: MP requiere que success esté definida si usas auto_return
            frontend_url = request.data.get('frontend_url', 'http://localhost:5173')
            
            back_urls = {
                "success": f"{frontend_url}/compra-exitosa",
                "failure": f"{frontend_url}/pago-fallido",    
                "pending": f"{frontend_url}/pago-pendiente"   
            }
            
            # 6. CONSTRUIR PREFERENCIA SEGÚN DOCUMENTACIÓN OFICIAL
            preference_data = {
                "items": preference_items,
                "back_urls": back_urls,
                # ⚠️ auto_return requiere URLs públicas (no localhost)
                # "auto_return": "approved",  # Deshabilitado en desarrollo con localhost
                "external_reference": str(pedido_id),
                "notification_url": f"{request.scheme}://{request.get_host()}/api/pagos/pago/webhook/",
                "statement_descriptor": "AMBOS NORTE"
            }
            
            # ✅ AGREGAR INFO DEL PAGADOR CORREGIDA
            if payer_data:
                phone_data = {}
                phone = payer_data.get('phone', '').strip()
                
                if phone:
                    # Limpiar el teléfono de caracteres especiales
                    phone = ''.join(filter(str.isdigit, phone))
                    
                    # Si empieza con 54 (código Argentina), removerlo
                    if phone.startswith('54'):
                        phone = phone[2:]
                    
                    # Formato argentino: código de área + número
                    if len(phone) >= 8:
                        if len(phone) == 10 and phone.startswith('11'):
                            # Buenos Aires: 11 + 8 dígitos
                            area_code = phone[:2]
                            number = phone[2:]
                        elif len(phone) == 10:
                            # Otras provincias: 3 dígitos área + 7 dígitos
                            area_code = phone[:3]
                            number = phone[3:]
                        else:
                            # Formato básico
                            area_code = ""
                            number = phone
                        
                        phone_data = {
                            "area_code": area_code,
                            "number": number
                        }
                    else:
                        phone_data = {
                            "area_code": "",
                            "number": phone
                        }
                
                # Agregar información del pagador
                preference_data["payer"] = {
                    "name": str(payer_data.get('name', '')),
                    "surname": str(payer_data.get('surname', '')),
                    "email": str(payer_data.get('email', '')),
                    "phone": phone_data
                }
            
            print("📋 Preferencia a enviar:")
            print(json.dumps(preference_data, indent=2, ensure_ascii=False))
            
            # 7. ✅ CREAR PREFERENCIA CON MANEJO DE ERRORES MEJORADO
            print("🚀 Llamando a MercadoPago SDK...")
            
            try:
                preference_response = sdk.preference().create(preference_data)
                print(f"✅ Respuesta de MP: {preference_response['response']}")
                
                # Verificar el status code de la respuesta
                if preference_response['status'] not in [200, 201]:
                    error_detail = preference_response.get('response', {})
                    error_message = error_detail.get('message', 'Error desconocido de MercadoPago')
                    print(f"❌ Error de MP (status {preference_response['status']}): {error_message}")
                    
                    return Response({
                        'success': False, 
                        'error': f'Error de MercadoPago: {error_message}',
                        'mp_error': error_detail
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                preference = preference_response['response']
                
                # ✅ VERIFICAR QUE LA RESPUESTA TIENE EL ID
                if 'id' not in preference:
                    print(f"❌ Respuesta de MP sin ID: {preference}")
                    return Response({
                        'success': False,
                        'error': 'MercadoPago no devolvió un ID de preferencia válido'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            except Exception as mp_error:
                print(f"❌ Error en SDK de MP: {str(mp_error)}")
                print(f"📋 Traceback: {traceback.format_exc()}")
                return Response({
                    'success': False,
                    'error': f'Error de comunicación con MercadoPago: {str(mp_error)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # 8. CREAR REGISTRO DE PAGO EN LA BASE DE DATOS
            try:
                pago = Pago.objects.create(
                    pedido=pedido,
                    numero_pedido=pedido.numero_pedido,
                    monto=pedido.total,
                    metodo_pago='mercadopago',
                    estado_pago='pendiente',
                    preference_id=preference['id'],
                    payer_email=payer_data.get('email'),
                    payer_nombre=payer_data.get('name'),
                    payer_apellido=payer_data.get('surname')
                )
                print(f"✅ Pago creado en BD: ID {pago.id}")
                
            except Exception as db_error:
                print(f"❌ Error creando pago en BD: {str(db_error)}")
                # No fallar aquí, la preferencia ya se creó
                pago = None
            
            # 9. ✅ RESPUESTA EXITOSA
            response_data = {
                'success': True,
                'data': {
                    'preference_id': preference['id'],
                    'init_point': preference.get('init_point'),
                    'sandbox_init_point': preference.get('sandbox_init_point'),
                }
            }
            
            if pago:
                response_data['data'].update({
                    'pago_id': pago.id,
                    'pedido_id': pedido.id,
                    'monto': float(pedido.total)
                })
            
            print(f"🎉 Preferencia creada exitosamente: {response_data}")
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"❌ Error en crear_preferencia: {str(e)}")
            print(f"📋 Traceback completo:")
            print(traceback.format_exc())
            return Response({
                'success': False,
                'error': str(e),
                'detail': 'Error interno del servidor'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @method_decorator(csrf_exempt, name='dispatch')
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def webhook(self, request):
        """
        Webhook para recibir notificaciones de MercadoPago
        
        POST /api/pagos/pago/webhook/
        
        MercadoPago enviará notificaciones automáticas cuando:
        - Se crea un pago
        - Se actualiza el estado de un pago
        - Se procesa una devolución
        - etc.
        
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