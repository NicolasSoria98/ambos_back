from django.shortcuts import render
from rest_framework import viewsets
from .models import ChatbotConversacion, ChatbotMensaje
from .serializer import ChatbotConversacionSerializer, ChatbotMensajeSerializer

class ChatbotConversacionViewSet(viewsets.ModelViewSet):
    queryset = ChatbotConversacion.objects.all()
    serializer_class = ChatbotConversacionSerializer

class ChatbotMensajeViewSet(viewsets.ModelViewSet):
    queryset = ChatbotMensaje.objects.all()
    serializer_class = ChatbotMensajeSerializer

# Create your views here.
