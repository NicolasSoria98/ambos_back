from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('carrito', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='itemcarrito',
            name='fecha_agregado',
            field=models.DateTimeField(auto_now_add=True, null=True, blank=True),
        ),
    ]

