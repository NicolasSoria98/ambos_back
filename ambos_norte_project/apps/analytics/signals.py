from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in
from apps.carrito.models import ItemCarrito, Carrito
from apps.pedidos.models import Pedido
from apps.usuarios.models import Usuario
from .models import EventoUsuario


@receiver(user_logged_in)
def registrar_login(sender, request, user, **kwargs):
    """
    Registrar cuando un usuario hace login
    """
    try:
        EventoUsuario.objects.create(
            usuario=user,
            tipo_evento='login',
            session_id=request.session.session_key,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
    except Exception as e:
        print(f"Error registrando login: {e}")


@receiver(post_save, sender=Usuario)
def registrar_registro(sender, instance, created, **kwargs):
    """
    Registrar cuando se crea un nuevo usuario
    """
    if created:
        try:
            EventoUsuario.objects.create(
                usuario=instance,
                tipo_evento='registro',
                metadata={'tipo_usuario': instance.tipo_usuario}
            )
        except Exception as e:
            print(f"Error registrando nuevo usuario: {e}")


@receiver(post_save, sender=ItemCarrito)
def registrar_item_carrito(sender, instance, created, **kwargs):
    """
    Registrar cuando se agrega un producto al carrito
    """
    if created:
        try:
            EventoUsuario.objects.create(
                usuario=instance.carrito.usuario,
                tipo_evento='agregar_carrito',
                producto=instance.producto,
                categoria=instance.producto.categoria,
                session_id=instance.carrito.session_id,
                metadata={
                    'cantidad': instance.cantidad,
                    'precio_unitario': float(instance.precio_unitario)
                }
            )
        except Exception as e:
            print(f"Error registrando item al carrito: {e}")


@receiver(pre_delete, sender=ItemCarrito)
def registrar_remover_carrito(sender, instance, **kwargs):
    """
    Registrar cuando se remueve un producto del carrito
    """
    try:
        EventoUsuario.objects.create(
            usuario=instance.carrito.usuario,
            tipo_evento='remover_carrito',
            producto=instance.producto,
            categoria=instance.producto.categoria,
            session_id=instance.carrito.session_id,
            metadata={
                'cantidad': instance.cantidad,
            }
        )
    except Exception as e:
        print(f"Error registrando remoción del carrito: {e}")


@receiver(post_save, sender=Pedido)
def registrar_pedido(sender, instance, created, **kwargs):
    """
    Registrar eventos relacionados con pedidos
    """
    if created:
        # Registrar inicio de checkout
        try:
            EventoUsuario.objects.create(
                usuario=instance.usuario,
                tipo_evento='inicio_checkout',
                pedido=instance,
                valor_monetario=instance.total,
                metadata={
                    'numero_pedido': instance.numero_pedido,
                    'items_count': instance.items.count()
                }
            )
        except Exception as e:
            print(f"Error registrando inicio checkout: {e}")
    
    # Registrar compra completada cuando el estado cambia a 'pagado'
    if not created and instance.estado_pedido == 'pagado':
        try:
            # Verificar si ya existe un evento de compra para este pedido
            existe = EventoUsuario.objects.filter(
                pedido=instance,
                tipo_evento='compra_completada'
            ).exists()
            
            if not existe:
                EventoUsuario.objects.create(
                    usuario=instance.usuario,
                    tipo_evento='compra_completada',
                    pedido=instance,
                    valor_monetario=instance.total,
                    metadata={
                        'numero_pedido': instance.numero_pedido,
                        'items_count': instance.items.count(),
                        'metodo_pago': getattr(instance.pago, 'metodo_pago', None) if hasattr(instance, 'pago') else None
                    }
                )
        except Exception as e:
            print(f"Error registrando compra completada: {e}")


def get_client_ip(request):
    """Obtener IP del cliente"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
