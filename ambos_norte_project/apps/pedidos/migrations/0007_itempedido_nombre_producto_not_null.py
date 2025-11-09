from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pedidos', '0006_backfill_itempedido_nombre_producto'),
    ]

    operations = [
        migrations.AlterField(
            model_name='itempedido',
            name='nombre_producto',
            field=models.CharField(max_length=255, null=False, blank=False),
        ),
    ]

