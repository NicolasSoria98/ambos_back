from django.db import migrations
from django.utils import timezone


def forwards(apps, schema_editor):
    ItemCarrito = apps.get_model('carrito', 'ItemCarrito')
    ItemCarrito.objects.filter(fecha_agregado__isnull=True).update(fecha_agregado=timezone.now())


def backwards(apps, schema_editor):
    # No-op: allow nulls if reversing
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('carrito', '0003_itemcarrito_fecha_agregado_nullable'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]

