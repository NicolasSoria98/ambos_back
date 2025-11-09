from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('carrito', '0004_backfill_itemcarrito_fecha_agregado'),
    ]

    operations = [
        migrations.AlterField(
            model_name='itemcarrito',
            name='fecha_agregado',
            field=models.DateTimeField(auto_now_add=True, null=False, blank=False),
        ),
    ]

