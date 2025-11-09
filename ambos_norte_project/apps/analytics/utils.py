from .models import EventoUsuario
from django.db.models import Count, Sum, Avg
from datetime import datetime, timedelta


class AnalyticsTracker:
    """
    Clase helper para registrar eventos de forma sencilla desde cualquier lugar
    """
    
    @staticmethod
    def track_busqueda(query, usuario=None, session_id=None, resultados_count=0):
        """
        Registrar búsqueda de usuario
        
        Uso:
        AnalyticsTracker.track_busqueda(
            query="remera negra",
            usuario=request.user,
            resultados_count=15
        )
        """
        EventoUsuario.objects.create(
            usuario=usuario,
            tipo_evento='busqueda',
            session_id=session_id,
            metadata={
                'query': query,
                'resultados': resultados_count
            }
        )
    
    @staticmethod
    def track_vista_producto(producto, usuario=None, session_id=None, request=None):
        """
        Registrar vista de producto
        
        Uso:
        AnalyticsTracker.track_vista_producto(
            producto=producto_obj,
            usuario=request.user,
            session_id=request.session.session_key
        )
        """
        kwargs = {
            'usuario': usuario,
            'tipo_evento': 'vista_producto',
            'producto': producto,
            'categoria': producto.categoria,
            'session_id': session_id,
        }
        
        if request:
            kwargs['ip_address'] = get_client_ip(request)
            kwargs['user_agent'] = request.META.get('HTTP_USER_AGENT', '')
        
        EventoUsuario.objects.create(**kwargs)
    
    @staticmethod
    def track_agregar_carrito(producto, cantidad, usuario=None, session_id=None):
        """
        Registrar producto agregado al carrito
        """
        EventoUsuario.objects.create(
            usuario=usuario,
            tipo_evento='agregar_carrito',
            producto=producto,
            categoria=producto.categoria,
            session_id=session_id,
            metadata={
                'cantidad': cantidad,
                'precio': float(producto.precio)
            }
        )
    
    @staticmethod
    def track_inicio_checkout(pedido, usuario=None, session_id=None):
        """
        Registrar inicio de proceso de checkout
        """
        EventoUsuario.objects.create(
            usuario=usuario,
            tipo_evento='inicio_checkout',
            pedido=pedido,
            valor_monetario=pedido.total,
            session_id=session_id,
            metadata={
                'numero_pedido': pedido.numero_pedido,
                'items': pedido.items.count()
            }
        )
    
    @staticmethod
    def track_compra_completada(pedido, usuario=None, session_id=None):
        """
        Registrar compra completada
        """
        EventoUsuario.objects.create(
            usuario=usuario,
            tipo_evento='compra_completada',
            pedido=pedido,
            valor_monetario=pedido.total,
            session_id=session_id,
            metadata={
                'numero_pedido': pedido.numero_pedido,
                'items': pedido.items.count(),
                'subtotal': float(pedido.subtotal),
                'envio': float(pedido.costo_envio)
            }
        )
    
    @staticmethod
    def obtener_eventos_usuario(usuario, dias=30):
        """
        Obtener eventos de un usuario en los últimos X días
        """
        fecha_desde = datetime.now() - timedelta(days=dias)
        return EventoUsuario.objects.filter(
            usuario=usuario,
            timestamp__gte=fecha_desde
        ).order_by('-timestamp')
    
    @staticmethod
    def obtener_productos_mas_vistos(dias=7, limite=10):
        """
        Obtener productos más vistos en los últimos X días
        """
        fecha_desde = datetime.now() - timedelta(days=dias)
        return EventoUsuario.objects.filter(
            tipo_evento='vista_producto',
            timestamp__gte=fecha_desde,
            producto__isnull=False
        ).values('producto', 'producto__nombre').annotate(
            vistas=Count('id')
        ).order_by('-vistas')[:limite]
    
    @staticmethod
    def calcular_tasa_conversion(dias=30):
        """
        Calcular tasa de conversión general
        """
        fecha_desde = datetime.now() - timedelta(days=dias)
        eventos = EventoUsuario.objects.filter(timestamp__gte=fecha_desde)
        
        vistas = eventos.filter(tipo_evento='vista_producto').count()
        compras = eventos.filter(tipo_evento='compra_completada').count()
        
        if vistas > 0:
            return (compras / vistas) * 100
        return 0


def get_client_ip(request):
    """Helper para obtener IP del cliente"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip