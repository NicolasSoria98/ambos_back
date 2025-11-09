from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Sum, Count, Avg
from datetime import timedelta
from apps.analytics.models import MetricaProducto, EventoUsuario
from apps.catalogo.models import Producto
from apps.pedidos.models import ItemPedido


class Command(BaseCommand):
    help = 'Actualiza las métricas de todos los productos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--producto-id',
            type=int,
            help='ID de un producto específico a actualizar'
        )

    def handle(self, *args, **options):
        producto_id = options.get('producto_id')
        
        if producto_id:
            productos = Producto.objects.filter(id=producto_id)
            if not productos.exists():
                self.stdout.write(self.style.ERROR(f'Producto con ID {producto_id} no encontrado'))
                return
        else:
            productos = Producto.objects.filter(activo=True)
        
        total = productos.count()
        self.stdout.write(f'Actualizando métricas para {total} producto(s)...\n')
        
        ahora = timezone.now()
        hace_7_dias = ahora - timedelta(days=7)
        hace_30_dias = ahora - timedelta(days=30)
        
        for idx, producto in enumerate(productos, 1):
            self.stdout.write(f'[{idx}/{total}] Procesando: {producto.nombre}')
            
            # Obtener o crear métrica
            metrica, created = MetricaProducto.objects.get_or_create(
                producto=producto
            )
            
            # ==================== VISTAS ====================
            # Vistas totales
            metrica.vistas_totales = EventoUsuario.objects.filter(
                tipo_evento='vista_producto',
                producto=producto
            ).count()
            
            # Vistas últimos 7 días
            metrica.vistas_ultimos_7d = EventoUsuario.objects.filter(
                tipo_evento='vista_producto',
                producto=producto,
                timestamp__gte=hace_7_dias
            ).count()
            
            # Vistas últimos 30 días
            metrica.vistas_ultimos_30d = EventoUsuario.objects.filter(
                tipo_evento='vista_producto',
                producto=producto,
                timestamp__gte=hace_30_dias
            ).count()
            
            # ==================== CARRITO ====================
            metrica.agregados_carrito = EventoUsuario.objects.filter(
                tipo_evento='agregar_carrito',
                producto=producto
            ).count()
            
            # ==================== COMPRAS ====================
            # Total de unidades vendidas
            ventas = ItemPedido.objects.filter(
                producto=producto,
                pedido__estado_pedido__in=['pagado', 'entregado']
            ).aggregate(
                total_unidades=Sum('cantidad'),
                total_ingresos=Sum('subtotal')
            )
            
            metrica.compras_completadas = ventas['total_unidades'] or 0
            metrica.ingreso_generado = ventas['total_ingresos'] or 0
            
            # ==================== TASA DE CONVERSIÓN ====================
            if metrica.vistas_totales > 0:
                metrica.tasa_conversion = (metrica.compras_completadas / metrica.vistas_totales) * 100
            else:
                metrica.tasa_conversion = 0
            
            # ==================== STOCK PROMEDIO ====================
            # Simplificación: usar stock actual
            metrica.stock_promedio = producto.stock
            
            # Guardar
            metrica.save()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✅ Vistas: {metrica.vistas_totales} | '
                    f'Ventas: {metrica.compras_completadas} | '
                    f'Conversión: {metrica.tasa_conversion:.2f}%'
                )
            )
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Métricas actualizadas para {total} producto(s)'))
