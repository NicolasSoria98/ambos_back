from rest_framework.routers import DefaultRouter
from .views import ChatbotConversacionViewSet, ChatbotMensajeViewSet

router = DefaultRouter()

router.register(r'chatbot-conversacion', ChatbotConversacionViewSet, basename='chatbot_conversacion')
router.register(r'chatbot-mensaje', ChatbotMensajeViewSet, basename='chatbot_mensaje')

urlpatterns = router.urls
