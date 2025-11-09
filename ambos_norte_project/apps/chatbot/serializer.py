from rest_framework import serializers
from .models import ChatbotConversacion, ChatbotMensaje

class ChatbotConversacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotConversacion
        fields = '__all__'
        read_only = ('fecha_inicio','fecha_fin','session_id',)

class ChatbotMensajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotMensaje
        fields = '__all__'
        read_only = ('contenido','fecha_mensaje',)