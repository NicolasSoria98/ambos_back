from django.db import migrations


def forwards(apps, schema_editor):
    ItemPedido = apps.get_model('pedidos', 'ItemPedido')
    for item in ItemPedido.objects.filter(nombre_producto__isnull=True):
        if item.producto_id:
            item.nombre_producto = item.producto.nombre
        else:
            item.nombre_producto = ''
        item.save(update_fields=['nombre_producto'])


def backwards(apps, schema_editor):
    ItemPedido = apps.get_model('pedidos', 'ItemPedido')
    ItemPedido.objects.update(nombre_producto=None)


class Migration(migrations.Migration):

    dependencies = [
        ('pedidos', '0005_itempedido_nombre_producto_nullable'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]

