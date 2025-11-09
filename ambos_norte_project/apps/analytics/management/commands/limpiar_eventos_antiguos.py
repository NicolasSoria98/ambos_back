from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.analytics.models import EventoUsuario


class Command(BaseCommand):
    help = 'Elimina eventos de usuario más antiguos que X días'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dias',
            type=int,
            default=90,
            help='Número de días a mantener (por defecto: 90)'
        )
        parser.add_argument(
            '--confirmar',
            action='store_true',
            help='Confirmar eliminación sin preguntar'
        )

    def handle(self, *args, **options):
        dias = options['dias']
        confirmar = options['confirmar']
        
        fecha_limite = timezone.now() - timedelta(days=dias)
        
        eventos_antiguos = EventoUsuario.objects.filter(
            timestamp__lt=fecha_limite
        )
        
        total = eventos_antiguos.count()
        
        if total == 0:
            self.stdout.write(
                self.style.SUCCESS(f'✅ No hay eventos anteriores a {dias} días para eliminar')
            )
            return
        
        self.stdout.write(
            self.style.WARNING(
                f'⚠️  Se encontraron {total} eventos anteriores a {fecha_limite.date()}'
            )
        )
        
        if not confirmar:
            respuesta = input('¿Desea eliminarlos? (s/n): ')
            if respuesta.lower() != 's':
                self.stdout.write('Operación cancelada')
                return
        
        eventos_antiguos.delete()
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ {total} eventos eliminados correctamente')
        )
