from django.utils.deprecation import MiddlewareMixin
from django.urls import resolve
from .models import EventoUsuario
import json


class AnalyticsMiddleware(MiddlewareMixin):
    """
    Middleware para capturar eventos de navegación automáticamente
    """
    
    def process_request(self, request):
        # Guardar información de la request en el objeto para usarla después
        request.analytics_data = {
            'ip_address': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'session_id': request.session.session_key or self.get_or_create_session(request),
        }
    
    def process_response(self, request, response):
        # Solo trackear requests exitosas (200-299)
        if not (200 <= response.status_code < 300):
            return response
        
        # Solo trackear ciertas URLs
        try:
            resolved = resolve(request.path)
            view_name = resolved.view_name
            
            # Registrar vista de producto
            if 'producto' in view_name and request.method == 'GET':
                producto_id = resolved.kwargs.get('pk')
                if producto_id:
                    self.registrar_evento(
                        request,
                        tipo_evento='vista_producto',
                        producto_id=producto_id
                    )
        
        except Exception as e:
            # No bloquear la request si hay error en analytics
            pass
        
        return response
    
    def get_client_ip(self, request):
        """Obtener IP real del cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def get_or_create_session(self, request):
        """Crear sesión si no existe"""
        if not request.session.session_key:
            request.session.create()
        return request.session.session_key
    
    def registrar_evento(self, request, tipo_evento, **kwargs):
        """Registrar evento en segundo plano"""
        try:
            EventoUsuario.objects.create(
                usuario=request.user if request.user.is_authenticated else None,
                tipo_evento=tipo_evento,
                session_id=request.analytics_data.get('session_id'),
                ip_address=request.analytics_data.get('ip_address'),
                user_agent=request.analytics_data.get('user_agent'),
                **kwargs
            )
        except Exception as e:
            # Log el error pero no bloquear la request
            print(f"Error registrando evento: {e}")