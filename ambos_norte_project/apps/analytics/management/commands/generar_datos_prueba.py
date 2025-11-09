from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, date
import random
from apps.analytics.models import EventoUsuario, MetricaDiaria, MetricaProducto
from apps.catalogo.models import Producto, Categoria
from apps.usuarios.models import Usuario
from apps.pedidos.models import Pedido
from apps.carrito.models import Carrito


class Command(BaseCommand):
    help = 'Genera datos de prueba para analytics'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dias',
            type=int,
            default=30,
            help='Número de días de datos históricos a generar'
        )

    def handle(self, *args, **options):
        dias = options['dias']
        
        self.stdout.write(f'Generando datos de prueba para los últimos {dias} días...\n')
        
        # Obtener o crear datos necesarios
        productos = list(Producto.objects.all()[:10])
        usuarios = list(Usuario.objects.all()[:5])
        
        if not productos:
            self.stdout.write(self.style.ERROR('No hay productos. Crea algunos primero.'))
            return
        
        if not usuarios:
            self.stdout.write(self.style.ERROR('No hay usuarios. Crea algunos primero.'))
            return
        
        # Generar eventos para cada día
        for dia in range(dias, 0, -1):
            fecha = date.today() - timedelta(days=dia)
            timestamp_base = timezone.make_aware(
                timezone.datetime.combine(fecha, timezone.datetime.min.time())
            )
            
            self.stdout.write(f'Generando datos para {fecha}...')
            
            # Generar eventos aleatorios
            num_eventos = random.randint(50, 200)
            
            for _ in range(num_eventos):
                usuario = random.choice(usuarios) if random.random() > 0.3 else None
                producto = random.choice(productos)
                
                # Timestamp aleatorio durante el día
                hora_aleatoria = random.randint(0, 23)
                minuto_aleatorio = random.randint(0, 59)
                timestamp = timestamp_base + timedelta(hours=hora_aleatoria, minutes=minuto_aleatorio)
                
                # Tipo de evento con probabilidades realistas
                rand = random.random()
                if rand < 0.6:  # 60% vistas
                    tipo = 'vista_producto'
                elif rand < 0.8:  # 20% agregar carrito
                    tipo = 'agregar_carrito'
                elif rand < 0.9:  # 10% checkout
                    tipo = 'inicio_checkout'
                elif rand < 0.95:  # 5% compras
                    tipo = 'compra_completada'
                else:  # 5% búsquedas
                    tipo = 'busqueda'
                
                EventoUsuario.objects.create(
                    usuario=usuario,
                    tipo_evento=tipo,
                    producto=producto if tipo != 'busqueda' else None,
                    categoria=producto.categoria if tipo != 'busqueda' else None,
                    valor_monetario=producto.precio if tipo == 'compra_completada' else None,
                    timestamp=timestamp,
                    session_id=f'test-session-{random.randint(1000, 9999)}'
                )
            
            self.stdout.write(self.style.SUCCESS(f'  ✅ {num_eventos} eventos generados'))
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Datos de prueba generados para {dias} días'))
        self.stdout.write('\nAhora ejecuta:')
        self.stdout.write('  python manage.py calcular_metricas_diarias')
        self.stdout.write('  python manage.py actualizar_metricas_productos')
