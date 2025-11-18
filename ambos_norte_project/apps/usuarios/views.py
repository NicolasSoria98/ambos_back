from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q, Count

from .models import Usuario, Direccion
from .serializer import (
    UsuarioSerializer, 
    PerfilUpdateSerializer,
    DireccionSerializer,
    LoginSerializer,
    RegistroSerializer
)


def get_tokens_for_user(user):
    """Genera tokens JWT para un usuario"""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    
    def get_queryset(self):
        """
        Filtra usuarios según permisos y parámetros
        Admins solo ven clientes, no otros admins
        """
        queryset = Usuario.objects.all()
        
        # Si es admin, solo mostrar clientes (no otros admins)
        if self.request.user.is_staff:
            queryset = queryset.filter(tipo_usuario='cliente')
        else:
            # Usuarios normales solo ven su propio perfil
            queryset = queryset.filter(id=self.request.user.id)
        
        # Filtros
        tipo = self.request.query_params.get('tipo', None)
        if tipo:
            queryset = queryset.filter(tipo_usuario=tipo)
        
        # Filtro por activos/inactivos
        activo = self.request.query_params.get('activo', None)
        if activo is not None:
            is_active = activo.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
        
        # Búsqueda por nombre, email o username
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(telefono__icontains=search)
            )
        
        return queryset.order_by('-fecha_registro')
    
    def get_permissions(self):
        """
        Permisos según la acción
        """
        if self.action in ['login', 'registro']:
            return [AllowAny()]
        if self.action in ['me']:
            return [IsAuthenticated()]
        if self.action in ['retrieve', 'update', 'partial_update', 'cambiar_password']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]
    
    def retrieve(self, request, *args, **kwargs):
        """
        Override del método GET para permitir que usuarios vean su propio perfil
        """
        instance = self.get_object()
        
        # Verificar que el usuario solo pueda ver su propio perfil o que sea admin
        if instance.id != request.user.id and not request.user.is_staff:
            return Response(
                {'error': 'No tienes permiso para ver este perfil'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """
        Override del método UPDATE/PATCH para permitir que usuarios editen su propio perfil
        """
        instance = self.get_object()
        
        if instance.id != request.user.id and not request.user.is_staff:
            return Response(
                {'error': 'No tienes permiso para editar este perfil'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not request.user.is_staff:
            campos_protegidos = ['tipo_usuario', 'is_staff', 'is_superuser', 'is_active', 'email', 'username']
            for campo in campos_protegidos:
                if campo in request.data:
                    return Response(
                        {'error': f'No tienes permiso para modificar el campo {campo}'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            serializer = PerfilUpdateSerializer(instance, data=request.data, partial=True)
        else:
            serializer = self.get_serializer(instance, data=request.data, partial=True)
        
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(UsuarioSerializer(instance).data)
    
    def partial_update(self, request, *args, **kwargs):
        """
        Override del método PATCH para usar la misma lógica que update
        """
        return self.update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        Override del método DELETE para desactivar en lugar de eliminar
        """
        instance = self.get_object()
        
        # Prevenir que un admin se desactive a sí mismo
        if instance.id == request.user.id:
            return Response(
                {'error': 'No puedes desactivar tu propia cuenta'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prevenir desactivar otros administradores
        if instance.tipo_usuario == 'administrador' or instance.is_staff:
            return Response(
                {'error': 'No puedes desactivar cuentas de administrador'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Desactivar usuario en lugar de eliminar
        instance.is_active = False
        instance.save()
        
        return Response(
            {'mensaje': f'Usuario {instance.username} desactivado correctamente'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        """
        Reactiva un usuario desactivado
        POST /api/usuario/{id}/activar/
        """
        usuario = self.get_object()
        
        if usuario.is_active:
            return Response(
                {'mensaje': 'El usuario ya está activo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        usuario.is_active = True
        usuario.save()
        
        return Response(
            {'mensaje': f'Usuario {usuario.username} activado correctamente'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def cambiar_tipo(self, request, pk=None):
        """
        Cambia el tipo de usuario (cliente/administrador)
        POST /api/usuario/{id}/cambiar_tipo/
        Body: { "nuevo_tipo": "administrador" }
        
        NOTA: Solo super usuarios pueden crear administradores
        """
        usuario = self.get_object()
        nuevo_tipo = request.data.get('nuevo_tipo')
        
        if nuevo_tipo not in ['cliente', 'administrador']:
            return Response(
                {'error': 'Tipo de usuario inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Solo superusuarios pueden crear administradores
        if nuevo_tipo == 'administrador' and not request.user.is_superuser:
            return Response(
                {'error': 'Solo super usuarios pueden crear administradores'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        tipo_anterior = usuario.tipo_usuario
        usuario.tipo_usuario = nuevo_tipo
        
        # Si se convierte en admin, también marcar is_staff
        if nuevo_tipo == 'administrador':
            usuario.is_staff = True
        else:
            usuario.is_staff = False
        
        usuario.save()
        
        return Response({
            'mensaje': f'Tipo de usuario cambiado de "{tipo_anterior}" a "{nuevo_tipo}"',
            'usuario': UsuarioSerializer(usuario).data
        })
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """
        Obtiene estadísticas de usuarios
        GET /api/usuario/estadisticas/
        """
        total_usuarios = Usuario.objects.filter(tipo_usuario='cliente').count()
        usuarios_activos = Usuario.objects.filter(tipo_usuario='cliente', is_active=True).count()
        usuarios_inactivos = Usuario.objects.filter(tipo_usuario='cliente', is_active=False).count()
        
        # Usuarios registrados hoy
        from django.utils import timezone
        hoy = timezone.now().date()
        registros_hoy = Usuario.objects.filter(
            tipo_usuario='cliente',
            fecha_registro__date=hoy
        ).count()
        
        return Response({
            'total_usuarios': total_usuarios,
            'usuarios_activos': usuarios_activos,
            'usuarios_inactivos': usuarios_inactivos,
            'registros_hoy': registros_hoy
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cambiar_password(self, request, pk=None):
        """
        Cambia la contraseña del usuario
        POST /api/usuarios/usuarios/{id}/cambiar_password/
        Body: { "old_password": "...", "new_password": "..." }
        """
        usuario = self.get_object()
        
        # Verificar que el usuario solo pueda cambiar su propia contraseña
        if usuario.id != request.user.id and not request.user.is_staff:
            return Response(
                {'error': 'No tienes permiso para cambiar esta contraseña'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        if not old_password or not new_password:
            return Response(
                {'error': 'Debes proporcionar la contraseña actual y la nueva'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar contraseña actual
        if not usuario.check_password(old_password):
            return Response(
                {'error': 'La contraseña actual es incorrecta'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Establecer nueva contraseña
        usuario.set_password(new_password)
        usuario.save()
        
        return Response({
            'mensaje': 'Contraseña actualizada correctamente'
        })
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """
        Endpoint de login para administradores y clientes
        POST /api/usuario/login/
        Body: { "email": "user@example.com", "password": "password123" }
        """
        serializer = LoginSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            tokens = get_tokens_for_user(user)
            
            return Response({
                'access': tokens['access'],
                'refresh': tokens['refresh'],
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'tipo_usuario': user.tipo_usuario,
                    'is_staff': user.is_staff,
                    'telefono': user.telefono,
                }
            }, status=status.HTTP_200_OK)
        
        return Response(
            {'detail': serializer.errors.get('non_field_errors', ['Credenciales incorrectas'])[0]},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def registro(self, request):
        """
        Endpoint de registro de nuevos usuarios
        POST /api/usuario/registro/
        """
        serializer = RegistroSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            
            return Response({
                'access': tokens['access'],
                'refresh': tokens['refresh'],
                'user': UsuarioSerializer(user).data,
                'message': 'Usuario registrado exitosamente'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Obtener información del usuario autenticado
        GET /api/usuario/me/
        """
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)


class DireccionViewSet(viewsets.ModelViewSet):
    queryset = Direccion.objects.all()
    serializer_class = DireccionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Admin puede ver todas, usuarios solo las suyas
        if self.request.user.is_staff:
            usuario_id = self.request.query_params.get('usuario', None)
            if usuario_id:
                return Direccion.objects.filter(usuario_id=usuario_id)
            return Direccion.objects.all()
        
        # Usuarios normales solo ven sus direcciones
        return Direccion.objects.filter(usuario=self.request.user)
    
    def perform_create(self, serializer):
        # Asignar automáticamente el usuario autenticado
        serializer.save(usuario=self.request.user)
    
    def update(self, request, *args, **kwargs):
        """
        Override para verificar que el usuario solo puede editar sus propias direcciones
        """
        direccion = self.get_object()
        
        # Verificar que la dirección pertenezca al usuario (o sea admin)
        if not request.user.is_staff and direccion.usuario.id != request.user.id:
            return Response(
                {'error': 'No tienes permiso para modificar esta dirección'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """
        Override para verificar que el usuario solo puede editar sus propias direcciones
        """
        direccion = self.get_object()
        
        # Verificar que la dirección pertenezca al usuario (o sea admin)
        if not request.user.is_staff and direccion.usuario.id != request.user.id:
            return Response(
                {'error': 'No tienes permiso para modificar esta dirección'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        Override para verificar que el usuario solo puede eliminar sus propias direcciones
        """
        direccion = self.get_object()
        
        # Verificar que la dirección pertenezca al usuario (o sea admin)
        if not request.user.is_staff and direccion.usuario.id != request.user.id:
            return Response(
                {'error': 'No tienes permiso para eliminar esta dirección'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)