from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Sum, Count, Avg, F
from datetime import date, timedelta
from apps.analytics.models import MetricaDiaria, EventoUsuario
from apps.pedidos.models import Pedido
from apps.carrito.models import Carrito
from apps.usuarios.models import Usuario
from apps.catalogo.models import Producto


class Command(BaseCommand):
    help = 'Calcula y guarda las métricas diarias del negocio'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fecha',
            type=str,
            help='Fecha para calcular métricas (formato: YYYY-MM-DD). Por defecto: ayer'
        )

    def handle(self, *args, **options):
        # Determinar fecha a procesar
        if options['fecha']:
            fecha = date.fromisoformat(options['fecha'])
        else:
            # Por defecto, calcular métricas del día anterior
            fecha = date.today() - timedelta(days=1)
        
        self.stdout.write(f'Calculando métricas para: {fecha}')
        
        # Verificar si ya existen métricas para esta fecha
        if MetricaDiaria.objects.filter(fecha=fecha).exists():
            self.stdout.write(
                self.style.WARNING(f'Ya existen métricas para {fecha}. Actualizando...')
            )
            metrica = MetricaDiaria.objects.get(fecha=fecha)
        else:
            metrica = MetricaDiaria(fecha=fecha)
        
        # Definir rango de tiempo para el día
        inicio_dia = timezone.datetime.combine(fecha, timezone.datetime.min.time())
        fin_dia = timezone.datetime.combine(fecha, timezone.datetime.max.time())
        
        # Hacer timezone-aware
        inicio_dia = timezone.make_aware(inicio_dia)
        fin_dia = timezone.make_aware(fin_dia)
        
        # ==================== VENTAS ====================
        pedidos_del_dia = Pedido.objects.filter(
            fecha_pedido__gte=inicio_dia,
            fecha_pedido__lte=fin_dia
        )
        
        metrica.pedidos_totales = pedidos_del_dia.count()
        metrica.pedidos_completados = pedidos_del_dia.filter(
            estado_pedido__in=['pagado', 'entregado']
        ).count()
        
        # Calcular ingresos
        ingresos = pedidos_del_dia.filter(
            estado_pedido__in=['pagado', 'entregado']
        ).aggregate(
            bruto=Sum('total'),
            envio=Sum('costo_envio')
        )
        
        metrica.ingreso_bruto = ingresos['bruto'] or 0
        metrica.ingreso_neto = (ingresos['bruto'] or 0) - (ingresos['envio'] or 0)
        
        # Ticket promedio
        if metrica.pedidos_completados > 0:
            metrica.ticket_promedio = metrica.ingreso_bruto / metrica.pedidos_completados
        else:
            metrica.ticket_promedio = 0
        
        # ==================== USUARIOS ====================
        metrica.usuarios_nuevos = Usuario.objects.filter(
            fecha_registro__gte=inicio_dia,
            fecha_registro__lte=fin_dia
        ).count()
        
        # Usuarios activos (que generaron al menos un evento)
        usuarios_activos = EventoUsuario.objects.filter(
            timestamp__gte=inicio_dia,
            timestamp__lte=fin_dia,
            usuario__isnull=False
        ).values('usuario').distinct().count()
        
        metrica.usuarios_activos = usuarios_activos
        
        # Sesiones totales (sessions únicas)
        sesiones = EventoUsuario.objects.filter(
            timestamp__gte=inicio_dia,
            timestamp__lte=fin_dia
        ).values('session_id').distinct().count()
        
        metrica.sesiones_totales = sesiones
        
        # ==================== CONVERSIÓN ====================
        carritos_del_dia = Carrito.objects.filter(
            fecha_creacion__gte=inicio_dia,
            fecha_creacion__lte=fin_dia
        )
        
        metrica.carritos_creados = carritos_del_dia.count()
        
        # Carritos abandonados (carritos con items pero sin pedido asociado)
        carritos_con_items = carritos_del_dia.filter(items__isnull=False).distinct()
        carritos_con_pedidos = Pedido.objects.filter(
            fecha_pedido__gte=inicio_dia,
            fecha_pedido__lte=fin_dia
        ).values_list('usuario', flat=True)
        
        # Simplificación: carritos que no derivaron en pedido
        metrica.carritos_abandonados = carritos_con_items.exclude(
            usuario__in=carritos_con_pedidos
        ).count()
        
        # Tasa de abandono
        if metrica.carritos_creados > 0:
            metrica.tasa_abandono = (metrica.carritos_abandonados / metrica.carritos_creados) * 100
        else:
            metrica.tasa_abandono = 0
        
        # Tasa de conversión (visitas a compras)
        vistas = EventoUsuario.objects.filter(
            timestamp__gte=inicio_dia,
            timestamp__lte=fin_dia,
            tipo_evento='vista_producto'
        ).count()
        
        compras = EventoUsuario.objects.filter(
            timestamp__gte=inicio_dia,
            timestamp__lte=fin_dia,
            tipo_evento='compra_completada'
        ).count()
        
        if vistas > 0:
            metrica.tasa_conversion = (compras / vistas) * 100
        else:
            metrica.tasa_conversion = 0
        
        # ==================== PRODUCTOS ====================
        # Total de productos vendidos (unidades)
from apps.pedidos.models import ItemPedido
        
        items_vendidos = ItemPedido.objects.filter(
            pedido__in=pedidos_del_dia,
            pedido__estado_pedido__in=['pagado', 'entregado']
        ).aggregate(total=Sum('cantidad'))
        
        metrica.productos_vendidos = items_vendidos['total'] or 0
        
        # Producto más vendido
        if metrica.productos_vendidos > 0:
            producto_top = ItemPedido.objects.filter(
                pedido__in=pedidos_del_dia,
                pedido__estado_pedido__in=['pagado', 'entregado']
            ).values('producto').annotate(
                total_vendido=Sum('cantidad')
            ).order_by('-total_vendido').first()
            
            if producto_top:
                metrica.producto_mas_vendido_id = producto_top['producto']
        
        # Categoría más vendida
        if metrica.productos_vendidos > 0:
            categoria_top = ItemPedido.objects.filter(
                pedido__in=pedidos_del_dia,
                pedido__estado_pedido__in=['pagado', 'entregado']
            ).values('producto__categoria').annotate(
                total_vendido=Sum('cantidad')
            ).order_by('-total_vendido').first()
            
            if categoria_top:
                metrica.categoria_mas_vendida_id = categoria_top['producto__categoria']
        
        # Guardar métricas
        metrica.save()
        
        # Mostrar resumen
        self.stdout.write(self.style.SUCCESS(f'\n✅ Métricas calculadas para {fecha}:'))
        self.stdout.write(f'  📊 Pedidos: {metrica.pedidos_totales} (completados: {metrica.pedidos_completados})')
        self.stdout.write(f'  💰 Ingresos: ${metrica.ingreso_bruto:,.2f}')
        self.stdout.write(f'  🎫 Ticket promedio: ${metrica.ticket_promedio:,.2f}')
        self.stdout.write(f'  👥 Usuarios nuevos: {metrica.usuarios_nuevos}')
        self.stdout.write(f'  👤 Usuarios activos: {metrica.usuarios_activos}')
        self.stdout.write(f'  🛒 Carritos: {metrica.carritos_creados} (abandonados: {metrica.carritos_abandonados})')
        self.stdout.write(f'  📈 Tasa conversión: {metrica.tasa_conversion:.2f}%')
        self.stdout.write(f'  📦 Productos vendidos: {metrica.productos_vendidos}')
