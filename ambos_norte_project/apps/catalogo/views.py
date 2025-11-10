from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.exceptions import ValidationError
from .models import Categoria, Producto, ImagenProducto
from .serializers import (
    CategoriaSerializer, 
    ProductoListSerializer, 
    ProductoDetailSerializer, 
    ProductoSerializer,
    ImagenProductoSerializer
)
from apps.analytics.utils import AnalyticsTracker


class CategoriaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar categorías de productos
    """
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    
    def get_permissions(self):
        """
        GET: Cualquiera puede ver categorías
        POST/PUT/DELETE: Solo administradores
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]


class ProductoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar productos con analytics
    """
    queryset = Producto.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]  # ⬅️ AGREGAR ESTA LÍNEA
    
    def get_serializer_class(self):
        """Usar serializer apropiado según la acción"""
        if self.action == 'retrieve':
            return ProductoDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductoSerializer
        return ProductoListSerializer
    
    def get_queryset(self):
        """
        Filtra productos según los parámetros de búsqueda
        """
        queryset = Producto.objects.all()
        
        # Filtro por categoría
        categoria = self.request.query_params.get('categoria', None)
        if categoria:
            queryset = queryset.filter(categoria_id=categoria)
        
        # Filtro por búsqueda en nombre
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                nombre__icontains=search
            ) | queryset.filter(
                descripcion__icontains=search
            )
        
        # Filtro por activos (solo para usuarios no admin)
        if not self.request.user.is_staff:
            queryset = queryset.filter(activo=True)
        
        # Filtro por destacados
        destacado = self.request.query_params.get('destacado', None)
        if destacado:
            queryset = queryset.filter(destacado=True)
        
        # Filtro por stock máximo (para listar productos con poco stock)
        stock_max = self.request.query_params.get('stock_max', None)
        if stock_max is not None:
            try:
                stock_max_int = int(stock_max)
                queryset = queryset.filter(stock__lte=stock_max_int)
            except (TypeError, ValueError):
                pass

        return queryset.select_related('categoria').prefetch_related('imagenes')
    
    def get_permissions(self):
        """
        GET: Cualquiera puede ver productos
        POST/PUT/DELETE: Solo administradores
        """
        if self.action in ['list', 'retrieve', 'buscar']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]

    def create(self, request, *args, **kwargs):
        """Override para debugging y mejor manejo de errores"""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            print(f"❌ Error en create: {str(e)}")
            print(f"📋 Request data: {request.data}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def update(self, request, *args, **kwargs):
        """Override para debugging y mejor manejo de errores"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        try:
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            if getattr(instance, '_prefetched_objects_cache', None):
                instance._prefetched_objects_cache = {}
                
            return Response(serializer.data)
        except Exception as e:
            print(f"❌ Error en update: {str(e)}")
            print(f"📋 Request data: {request.data}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def retrieve(self, request, *args, **kwargs):
        """Override para trackear vista de producto"""
        instance = self.get_object()
        
        # Track analytics
        try:
            AnalyticsTracker.track_vista_producto(
                producto=instance,
                usuario=request.user if request.user.is_authenticated else None,
                session_id=request.session.session_key,
                request=request
            )
        except:
            pass  # No fallar si hay error en analytics
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def buscar(self, request):
        """
        Búsqueda de productos con tracking
        GET /api/catalogo/producto/buscar/?q=remera
        """
        query = request.query_params.get('q', '')
        
        if not query:
            return Response({'error': 'Parámetro "q" requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Buscar productos
        productos = Producto.objects.filter(
            nombre__icontains=query,
            activo=True
        ) | Producto.objects.filter(
            descripcion__icontains=query,
            activo=True
        )
        
        # Registrar búsqueda
        try:
            AnalyticsTracker.track_busqueda(
                query=query,
                usuario=request.user if request.user.is_authenticated else None,
                session_id=request.session.session_key,
                resultados_count=productos.count()
            )
        except:
            pass
        
        serializer = self.get_serializer(productos, many=True)
        return Response({
            'query': query,
            'count': productos.count(),
            'resultados': serializer.data
        })

    @action(detail=True, methods=['post'])
    def reducir_stock(self, request, pk=None):
        """
        Reduce el stock de un producto
        POST /api/catalogo/producto/{id}/reducir_stock/
        Body: { "cantidad": 5 }
        """
        producto = self.get_object()
        cantidad = int(request.data.get('cantidad', 1))
        
        if cantidad <= 0:
            return Response(
                {'error': 'La cantidad debe ser mayor a 0'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            producto.reducir_stock(cantidad)
            return Response({
                'mensaje': 'Stock reducido correctamente',
                'stock_actual': producto.stock
            })
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def aumentar_stock(self, request, pk=None):
        """
        Aumenta el stock de un producto
        POST /api/catalogo/producto/{id}/aumentar_stock/
        Body: { "cantidad": 5 }
        """
        producto = self.get_object()
        cantidad = int(request.data.get('cantidad', 1))
        
        if cantidad <= 0:
            return Response(
                {'error': 'La cantidad debe ser mayor a 0'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            producto.aumentar_stock(cantidad)
            return Response({
                'mensaje': 'Stock aumentado correctamente',
                'stock_actual': producto.stock
            })
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def toggle_destacado(self, request, pk=None):
        """
        Alterna el estado destacado de un producto
        POST /api/catalogo/producto/{id}/toggle_destacado/
        """
        producto = self.get_object()
        producto.destacado = not producto.destacado
        producto.save()
        
        return Response({
            'mensaje': f'Producto {"destacado" if producto.destacado else "no destacado"}',
            'destacado': producto.destacado
        })
    
    @action(detail=True, methods=['post'])
    def toggle_activo(self, request, pk=None):
        """
        Alterna el estado activo de un producto
        POST /api/catalogo/producto/{id}/toggle_activo/
        """
        producto = self.get_object()
        producto.activo = not producto.activo
        producto.save()
        
        return Response({
            'mensaje': f'Producto {"activado" if producto.activo else "desactivado"}',
            'activo': producto.activo
        })
    
    def destroy(self, request, *args, **kwargs):
        """
        Sobrescribe el método destroy para desactivar en lugar de eliminar
        DELETE /api/catalogo/producto/{id}/
        """
        producto = self.get_object()
        producto.activo = False
        producto.save()
        
        return Response({
            'mensaje': 'Producto desactivado correctamente',
            'activo': False
        }, status=status.HTTP_200_OK)


class ImagenProductoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar imágenes adicionales de productos
    """
    queryset = ImagenProducto.objects.all()
    serializer_class = ImagenProductoSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def get_permissions(self):
        """
        GET: Cualquiera puede ver imágenes
        POST/PUT/DELETE: Solo administradores
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]
    
    def get_queryset(self):
        """
        Filtra imágenes por producto si se proporciona el parámetro
        """
        queryset = ImagenProducto.objects.all()
        producto_id = self.request.query_params.get('producto', None)
        
        if producto_id:
            queryset = queryset.filter(producto_id=producto_id)
        
        return queryset.order_by('orden')