from django.contrib import admin
from .models import ChatbotConversacion, ChatbotMensaje
# Register your models here.
class ChatbotMensajeInline(admin.TabularInline):
    model = ChatbotMensaje
    extra = 0


@admin.register(ChatbotConversacion)
class ChatbotConversacionAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuario', 'session_id', 'fecha_inicio']
    list_filter = []
    search_fields = ['usuario__username', 'session_id']
    inlines = [ChatbotMensajeInline]
