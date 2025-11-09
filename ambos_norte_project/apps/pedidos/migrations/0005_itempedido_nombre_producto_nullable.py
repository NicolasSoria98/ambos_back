from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pedidos', '0004_pedido_activo'),
    ]

    operations = [
        migrations.AddField(
            model_name='itempedido',
            name='nombre_producto',
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
    ]

