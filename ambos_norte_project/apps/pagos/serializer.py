from rest_framework import serializers
from .models import Pago

class PagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = '__all__'
        read_only_fields = ('id', 'fecha_pago', 'fecha_creacion')
    
    def validate_estado_pago(self, value):
        """Validar que el estado sea válido"""
        estados_validos = ['pendiente', 'aprobado']
        if value not in estados_validos:
            raise serializers.ValidationError(
                f"Estado inválido. Debe ser uno de: {', '.join(estados_validos)}"
            )
        return value