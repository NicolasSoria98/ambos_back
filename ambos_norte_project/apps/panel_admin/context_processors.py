from apps.catalogo.models import Producto
from apps.pedidos.models import Pedido
from apps.usuarios.models import Usuario
from django.utils import timezone
from datetime import date


def admin_stats(request):
    """
    Context processor para agregar estadísticas al admin
    """
    if not request.path.startswith('/admin/'):
        return {}
    
    hoy = date.today()
    inicio_dia = timezone.datetime.combine(hoy, timezone.datetime.min.time())
    inicio_dia = timezone.make_aware(inicio_dia)
    
    return {
        'productos_count': Producto.objects.filter(activo=True).count(),
        'pedidos_hoy': Pedido.objects.filter(fecha_pedido__gte=inicio_dia).count(),
        'usuarios_activos': Usuario.objects.filter(is_active=True, tipo_usuario='cliente').count(),
        'stock_bajo': Producto.objects.filter(stock__lte=10, activo=True).count(),
    }
