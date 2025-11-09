from django.shortcuts import render
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.views.generic import TemplateView
from django.db.models import Sum, Count, Avg, F, Q
from django.utils import timezone
from datetime import timedelta, date
from decimal import Decimal

from apps.analytics.models import MetricaDiaria, MetricaProducto, EventoUsuario, DatosGoogleAnalytics
from apps.pedidos.models import Pedido, ItemPedido
from apps.usuarios.models import Usuario
from apps.catalogo.models import Producto, Categoria
from apps.carrito.models import Carrito


@method_decorator(staff_member_required, name='dispatch')
class DashboardView(TemplateView):
    """
    Vista principal del dashboard
    """
    template_name = 'panel_admin/dashboard.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # KPIs principales
        context['kpis'] = self.calcular_kpis()
        
        # Gráfico de ventas (últimos 30 días)
        context['grafico_ventas'] = self.datos_grafico_ventas()
        
        # Top productos
        context['top_productos'] = self.obtener_top_productos(limite=5)
        
        # Productos con stock bajo
        context['stock_bajo'] = self.productos_stock_bajo(limite=10)
        
        # Pedidos pendientes
        context['pedidos_pendientes'] = self.obtener_pedidos_pendientes(limite=5)
        
        # Alertas
        context['alertas'] = self.obtener_alertas()
        
        # Resumen de categorías
        context['categorias_resumen'] = self.resumen_categorias()
        
        return context
    
    def calcular_kpis(self):
        """Calcular KPIs principales (hoy vs ayer)"""
        hoy = date.today()
        ayer = hoy - timedelta(days=1)
        
        try:
            metrica_hoy = MetricaDiaria.objects.get(fecha=hoy)
        except MetricaDiaria.DoesNotExist:
            # Calcular en tiempo real si no existe
            metrica_hoy = self.calcular_metricas_tiempo_real(hoy)
        
        try:
            metrica_ayer = MetricaDiaria.objects.get(fecha=ayer)
        except MetricaDiaria.DoesNotExist:
            metrica_ayer = None
        
        def calcular_cambio(hoy_val, ayer_val):
            if ayer_val and ayer_val != 0:
                cambio = ((hoy_val - ayer_val) / ayer_val) * 100
                return {
                    'valor': round(cambio, 1),
                    'positivo': cambio >= 0
                }
            return {'valor': 0, 'positivo': True}
        
        ventas_hoy = float(metrica_hoy.ingreso_bruto) if metrica_hoy else 0
        ventas_ayer = float(metrica_ayer.ingreso_bruto) if metrica_ayer else 0
        
        pedidos_hoy = metrica_hoy.pedidos_totales if metrica_hoy else 0
        pedidos_ayer = metrica_ayer.pedidos_totales if metrica_ayer else 0
        
        usuarios_hoy = metrica_hoy.usuarios_activos if metrica_hoy else 0
        usuarios_ayer = metrica_ayer.usuarios_activos if metrica_ayer else 0
        
        ticket_hoy = float(metrica_hoy.ticket_promedio) if metrica_hoy else 0
        ticket_ayer = float(metrica_ayer.ticket_promedio) if metrica_ayer else 0
        
        return {
            'ventas': {
                'hoy': ventas_hoy,
                'cambio': calcular_cambio(ventas_hoy, ventas_ayer)
            },
            'pedidos': {
                'hoy': pedidos_hoy,
                'cambio': calcular_cambio(pedidos_hoy, pedidos_ayer)
            },
            'usuarios': {
                'hoy': usuarios_hoy,
                'cambio': calcular_cambio(usuarios_hoy, usuarios_ayer)
            },
            'ticket': {
                'hoy': ticket_hoy,
                'cambio': calcular_cambio(ticket_hoy, ticket_ayer)
            }
        }
    
    def calcular_metricas_tiempo_real(self, fecha):
        """Calcular métricas en tiempo real para hoy"""
        class MetricaTemporal:
            def __init__(self):
                self.ingreso_bruto = 0
                self.pedidos_totales = 0
                self.usuarios_activos = 0
                self.ticket_promedio = 0
        
        metrica = MetricaTemporal()
        
        inicio_dia = timezone.datetime.combine(fecha, timezone.datetime.min.time())
        inicio_dia = timezone.make_aware(inicio_dia)
        
        pedidos = Pedido.objects.filter(fecha_pedido__gte=inicio_dia)
        metrica.pedidos_totales = pedidos.count()
        
        ingresos = pedidos.filter(
            estado_pedido__in=['pagado', 'entregado']
        ).aggregate(total=Sum('total'))
        
        metrica.ingreso_bruto = ingresos['total'] or 0
        
        if metrica.pedidos_totales > 0:
            metrica.ticket_promedio = metrica.ingreso_bruto / metrica.pedidos_totales
        
        metrica.usuarios_activos = EventoUsuario.objects.filter(
            timestamp__gte=inicio_dia,
            usuario__isnull=False
        ).values('usuario').distinct().count()
        
        return metrica
    
    def datos_grafico_ventas(self, dias=30):
        """Obtener datos para gráfico de ventas de últimos 30 días"""
        fecha_inicio = date.today() - timedelta(days=dias)
        
        metricas = MetricaDiaria.objects.filter(
            fecha__gte=fecha_inicio
        ).order_by('fecha')
        
        fechas = []
        ventas = []
        pedidos = []
        
        for metrica in metricas:
            fechas.append(metrica.fecha.strftime('%d/%m'))
            ventas.append(float(metrica.ingreso_bruto))
            pedidos.append(metrica.pedidos_totales)
        
        return {
            'labels': fechas,
            'ventas': ventas,
            'pedidos': pedidos
        }
    
    def obtener_top_productos(self, limite=5):
        """Obtener top productos por ventas"""
        return MetricaProducto.objects.select_related('producto').order_by(
            '-compras_completadas'
        )[:limite]
    
    def productos_stock_bajo(self, limite=10, umbral=10):
        """Productos con stock bajo"""
        return Producto.objects.filter(
            stock__lte=umbral,
            activo=True
        ).select_related('categoria').order_by('stock')[:limite]
    
    def obtener_pedidos_pendientes(self, limite=5):
        """Pedidos pendientes de procesar"""
        return Pedido.objects.filter(
            estado_pedido__in=['pendiente', 'pagado']
        ).select_related('usuario', 'direccion').order_by('-fecha_pedido')[:limite]
    
    def obtener_alertas(self):
        """Generar alertas del sistema"""
        alertas = []
        
        # Stock bajo
        productos_bajo_stock = Producto.objects.filter(stock__lte=5, activo=True).count()
        if productos_bajo_stock > 0:
            alertas.append({
                'tipo': 'warning',
                'icono': '⚠️',
                'mensaje': f'{productos_bajo_stock} producto(s) con stock crítico',
                'url': '/admin/catalogo/producto/?stock__lte=5'
            })
        
        # Pagos pendientes
        pagos_pendientes = Pedido.objects.filter(estado_pedido='pendiente').count()
        if pagos_pendientes > 0:
            alertas.append({
                'tipo': 'info',
                'icono': '💳',
                'mensaje': f'{pagos_pendientes} pago(s) pendiente(s)',
                'url': '/admin/pedidos/pedido/?estado_pedido=pendiente'
            })
        
        # Pedidos sin enviar
        pedidos_sin_enviar = Pedido.objects.filter(
            estado_pedido='pagado',
            envio__isnull=True
        ).count()
        if pedidos_sin_enviar > 0:
            alertas.append({
                'tipo': 'warning',
                'icono': '📦',
                'mensaje': f'{pedidos_sin_enviar} pedido(s) pagado(s) sin envío',
                'url': '/admin/pedidos/pedido/?estado_pedido=pagado'
            })
        
        return alertas
    
    def resumen_categorias(self):
        """Resumen de ventas por categoría (últimos 30 días)"""
        fecha_inicio = timezone.now() - timedelta(days=30)
        
        categorias = Categoria.objects.annotate(
            total_vendido=Sum(
                'productos__itempedido__cantidad',
                filter=Q(
                    productos__itempedido__pedido__fecha_pedido__gte=fecha_inicio,
                    productos__itempedido__pedido__estado_pedido__in=['pagado', 'entregado']
                )
            ),
            ingresos=Sum(
                'productos__itempedido__subtotal',
                filter=Q(
                    productos__itempedido__pedido__fecha_pedido__gte=fecha_inicio,
                    productos__itempedido__pedido__estado_pedido__in=['pagado', 'entregado']
                )
            )
        ).filter(total_vendido__isnull=False).order_by('-total_vendido')[:5]
        
        return categorias


@method_decorator(staff_member_required, name='dispatch')
class VentasAnalysisView(TemplateView):
    """
    Vista de análisis de ventas detallado
    """
    template_name = 'panel_admin/ventas.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        dias = int(self.request.GET.get('dias', 30))
        fecha_inicio = date.today() - timedelta(days=dias)
        
        # Métricas del período
        context['metricas_periodo'] = self.calcular_metricas_periodo(fecha_inicio)
        
        # Ventas por categoría
        context['ventas_categoria'] = self.ventas_por_categoria(fecha_inicio)
        
        # Embudo de conversión
        context['embudo'] = self.embudo_conversion(fecha_inicio)
        
        # Tendencias
        context['tendencias'] = self.calcular_tendencias(fecha_inicio)
        
        context['dias_seleccionados'] = dias
        
        return context
    
    def calcular_metricas_periodo(self, fecha_inicio):
        """Métricas agregadas del período"""
        metricas = MetricaDiaria.objects.filter(
            fecha__gte=fecha_inicio
        ).aggregate(
            total_ventas=Sum('ingreso_bruto'),
            total_pedidos=Sum('pedidos_totales'),
            total_productos=Sum('productos_vendidos'),
            promedio_ticket=Avg('ticket_promedio')
        )
        
        return metricas
    
    def ventas_por_categoria(self, fecha_inicio):
        """Calcular ventas por categoría"""
        inicio_datetime = timezone.datetime.combine(fecha_inicio, timezone.datetime.min.time())
        inicio_datetime = timezone.make_aware(inicio_datetime)
        
        categorias = Categoria.objects.annotate(
            total_vendido=Sum(
                'productos__itempedido__cantidad',
                filter=Q(
                    productos__itempedido__pedido__fecha_pedido__gte=inicio_datetime,
                    productos__itempedido__pedido__estado_pedido__in=['pagado', 'entregado']
                )
            ),
            ingresos=Sum(
                'productos__itempedido__subtotal',
                filter=Q(
                    productos__itempedido__pedido__fecha_pedido__gte=inicio_datetime,
                    productos__itempedido__pedido__estado_pedido__in=['pagado', 'entregado']
                )
            )
        ).filter(total_vendido__isnull=False).order_by('-ingresos')
        
        return categorias
    
    def embudo_conversion(self, fecha_inicio):
        """Análisis del embudo de conversión"""
        inicio_datetime = timezone.datetime.combine(fecha_inicio, timezone.datetime.min.time())
        inicio_datetime = timezone.make_aware(inicio_datetime)
        
        eventos = EventoUsuario.objects.filter(timestamp__gte=inicio_datetime)
        
        vistas = eventos.filter(tipo_evento='vista_producto').count()
        agregados = eventos.filter(tipo_evento='agregar_carrito').count()
        checkouts = eventos.filter(tipo_evento='inicio_checkout').count()
        compras = eventos.filter(tipo_evento='compra_completada').count()
        
        def calcular_tasa(actual, anterior):
            return (actual / anterior * 100) if anterior > 0 else 0
        
        return {
            'vistas': vistas,
            'agregados_carrito': agregados,
            'checkouts': checkouts,
            'compras': compras,
            'tasa_vista_carrito': calcular_tasa(agregados, vistas),
            'tasa_carrito_checkout': calcular_tasa(checkouts, agregados),
            'tasa_checkout_compra': calcular_tasa(compras, checkouts),
            'tasa_conversion_total': calcular_tasa(compras, vistas)
        }
    
    def calcular_tendencias(self, fecha_inicio):
        """Calcular tendencias de ventas"""
        metricas = MetricaDiaria.objects.filter(
            fecha__gte=fecha_inicio
        ).order_by('fecha')
        
        fechas = []
        ventas = []
        conversion = []
        
        for m in metricas:
            fechas.append(m.fecha.strftime('%d/%m'))
            ventas.append(float(m.ingreso_bruto))
            conversion.append(float(m.tasa_conversion))
        
        return {
            'labels': fechas,
            'ventas': ventas,
            'conversion': conversion
        }


@method_decorator(staff_member_required, name='dispatch')
class InventarioView(TemplateView):
    """
    Vista de gestión de inventario
    """
    template_name = 'panel_admin/inventario.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Productos con stock bajo
        context['stock_bajo'] = Producto.objects.filter(
            stock__lte=10,
            activo=True
        ).select_related('categoria').order_by('stock')
        
        # Valor total del inventario
        context['valor_inventario'] = Producto.objects.filter(
            activo=True
        ).aggregate(
            total=Sum(F('stock') * F('precio'))
        )['total'] or 0
        
        # Productos sin stock
        context['sin_stock'] = Producto.objects.filter(
            stock=0,
            activo=True
        ).count()
        
        # Top productos por rotación (últimos 30 días)
        context['top_rotacion'] = self.productos_mas_vendidos()
        
        return context
    
    def productos_mas_vendidos(self, dias=30):
        """Productos más vendidos en el período"""
        fecha_inicio = timezone.now() - timedelta(days=dias)
        
        productos = Producto.objects.annotate(
            unidades_vendidas=Sum(
                'itempedido__cantidad',
                filter=Q(
                    itempedido__pedido__fecha_pedido__gte=fecha_inicio,
                    itempedido__pedido__estado_pedido__in=['pagado', 'entregado']
                )
            )
        ).filter(
            unidades_vendidas__isnull=False
        ).order_by('-unidades_vendidas')[:10]
        
        return productos
