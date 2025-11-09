from django.shortcuts import render
from rest_framework import viewsets
from .models import Envio
from .serializer import EnvioSerializer

class EnvioViewSet(viewsets.ModelViewSet):
    queryset = Envio.objects.all()
    serializer_class = EnvioSerializer


# Create your views here.
