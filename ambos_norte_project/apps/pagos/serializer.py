from rest_framework import serializers
from .models import Pago

class PagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = '__all__'
        read_only = ('id_mercadopago','fecha_pago','fecha_creacion','fecha_actualizacion')