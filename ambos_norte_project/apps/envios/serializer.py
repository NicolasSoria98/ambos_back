from rest_framework import serializers
from .models import Envio

class EnvioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Envio
        fields = '__all__'
        read_only = ('numero_seguimiento','fecha_envio','fecha_entrega_real','fecha_creacion', 'fecha_actualizacion',)