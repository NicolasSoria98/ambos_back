from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Count
from django.core.exceptions import ValidationError
from .models import Categoria, Producto, ImagenProducto, Talla, Color, ProductoVariante
from .serializers import (
    CategoriaSerializer,
    TallaSerializer,
    ColorSerializer,
    ProductoListSerializer,
    ProductoDetailSerializer,
    ProductoCreateUpdateSerializer,
    ProductoVarianteSerializer,
    ProductoVarianteCreateUpdateSerializer,
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


class TallaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar tallas
    """
    queryset = Talla.objects.all()
    serializer_class = TallaSerializer
    
    def get_queryset(self):
        """Filtrar solo tallas activas para usuarios no admin"""
        queryset = Talla.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(activo=True)
        con_stock = self.request.query_params.get('con_stock', '').lower() == 'true'
        if con_stock:
            queryset = queryset.filter(
                variantes__stock__gt=0,
                variantes__activo=True,
                variantes__producto__activo=True
            ).distinct()
        return queryset.order_by('orden', 'nombre')
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]


class ColorViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar colores
    """
    queryset = Color.objects.all()
    serializer_class = ColorSerializer
    
    def get_queryset(self):
        """Filtrar solo colores activos para usuarios no admin"""
        queryset = Color.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(activo=True)
        con_stock = self.request.query_params.get('con_stock', '').lower() == 'true'
        if con_stock:
            queryset = queryset.filter(
                variantes__stock__gt=0,
                variantes__activo=True,
                variantes__producto__activo=True
            ).distinct()
        return queryset.order_by('nombre')
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]


class ProductoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar productos con variantes y analytics
    """
    queryset = Producto.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        """Usar serializer apropiado según la acción"""
        if self.action == 'retrieve':
            return ProductoDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductoCreateUpdateSerializer
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
        
        # Filtro por sexo
        sexo = self.request.query_params.get('sexo', None)
        if sexo and sexo in ['M', 'F']:
            queryset = queryset.filter(sexo=sexo)
        
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
        
        # Filtro por stock bajo (usando variantes)
        stock_bajo = self.request.query_params.get('stock_bajo', None)
        if stock_bajo:
            # Productos con stock total menor a X
            try:
                umbral = int(stock_bajo)
                # Filtrar productos donde la suma de stock de variantes sea menor al umbral
                productos_con_stock_bajo = []
                for producto in queryset:
                    if producto.stock_total() < umbral:
                        productos_con_stock_bajo.append(producto.id)
                queryset = queryset.filter(id__in=productos_con_stock_bajo)
            except (TypeError, ValueError):
                pass

        return queryset.select_related('categoria').prefetch_related('imagenes', 'variantes', 'variantes__talla', 'variantes__color', 'variantes__imagenes')
    
    def get_permissions(self):
        """
        GET: Cualquiera puede ver productos
        POST/PUT/DELETE: Solo administradores
        """
        if self.action in ['list', 'retrieve', 'buscar', 'sexos_disponibles']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]

    def create(self, request, *args, **kwargs):
        """Override para debugging y mejor manejo de errores"""
        try:
            print(f"[Producto] Request data recibido: {request.data}")
            print(f"[Producto] Content-Type: {request.content_type}")

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            print(f"[Producto] Datos validados: {serializer.validated_data}")

            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)

            print("[Producto] Producto creado exitosamente")

            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            print(f"[Producto] Error en create: {str(e)}")
            print(f"[Producto] Request data: {request.data}")
            import traceback
            print(f"[Producto] Traceback: {traceback.format_exc()}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path='sexos_disponibles')
    def sexos_disponibles(self, request):
        """Retorna los sexos definidos en el modelo y su cantidad en productos activos"""
        sexos_map = dict(Producto.SEXO_CHOICES)
        queryset = (
            Producto.objects.filter(activo=True, sexo__in=sexos_map.keys())
            .values('sexo')
            .annotate(total=Count('id'))
        )
        disponibles = {item['sexo']: item['total'] for item in queryset}
        data = [
            {
                'codigo': codigo,
                'nombre': sexos_map[codigo],
                'total': disponibles.get(codigo, 0),
            }
            for codigo, _ in Producto.SEXO_CHOICES
        ]
        return Response({'sexos': data})

    def update(self, request, *args, **kwargs):
        """Override para debugging y mejor manejo de errores"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        try:
            print(f"📥 Request data recibido: {request.data}")
            print(f"📝 Content-Type: {request.content_type}")
            
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            
            print(f"✅ Datos validados: {serializer.validated_data}")
            
            self.perform_update(serializer)
            
            if getattr(instance, '_prefetched_objects_cache', None):
                instance._prefetched_objects_cache = {}
            
            print(f"✅ Producto actualizado exitosamente")
                
            return Response(serializer.data)
        except Exception as e:
            print(f"❌ Error en update: {str(e)}")
            print(f"📋 Request data: {request.data}")
            import traceback
            print(f"📋 Traceback: {traceback.format_exc()}")
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


class ProductoVarianteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar variantes de productos individualmente
    """
    queryset = ProductoVariante.objects.all()
    serializer_class = ProductoVarianteCreateUpdateSerializer
    
    def get_queryset(self):
        """Filtrar variantes por producto si se especifica"""
        queryset = ProductoVariante.objects.all()
        
        producto_id = self.request.query_params.get('producto', None)
        if producto_id:
            queryset = queryset.filter(producto_id=producto_id)
        
        # Filtrar solo activas para usuarios no admin
        if not self.request.user.is_staff:
            queryset = queryset.filter(activo=True, producto__activo=True)
        
        return queryset.select_related('producto', 'talla', 'color').prefetch_related('imagenes')
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]
    
    @action(detail=True, methods=['post'])
    def reducir_stock(self, request, pk=None):
        """
        Reduce el stock de una variante específica
        POST /api/catalogo/variante/{id}/reducir_stock/
        Body: { "cantidad": 5 }
        """
        variante = self.get_object()
        cantidad = int(request.data.get('cantidad', 1))
        
        if cantidad <= 0:
            return Response(
                {'error': 'La cantidad debe ser mayor a 0'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            variante.reducir_stock(cantidad)
            return Response({
                'mensaje': 'Stock reducido correctamente',
                'stock_actual': variante.stock
            })
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def aumentar_stock(self, request, pk=None):
        """
        Aumenta el stock de una variante específica
        POST /api/catalogo/variante/{id}/aumentar_stock/
        Body: { "cantidad": 5 }
        """
        variante = self.get_object()
        cantidad = int(request.data.get('cantidad', 1))
        
        if cantidad <= 0:
            return Response(
                {'error': 'La cantidad debe ser mayor a 0'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            variante.aumentar_stock(cantidad)
            return Response({
                'mensaje': 'Stock aumentado correctamente',
                'stock_actual': variante.stock
            })
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def asociar_imagen(self, request, pk=None):
        """
        Asocia una imagen existente a una variante
        POST /api/catalogo/variante/{id}/asociar_imagen/
        Body: { "imagen_id": 123 }
        """
        variante = self.get_object()
        imagen_id = request.data.get('imagen_id')
        
        if not imagen_id:
            return Response(
                {'error': 'Se requiere el ID de la imagen'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            imagen = ImagenProducto.objects.get(
                id=imagen_id,
                producto=variante.producto
            )
            imagen.variante = variante
            imagen.save()
            
            return Response({
                'mensaje': 'Imagen asociada correctamente a la variante',
                'imagen': ImagenProductoSerializer(imagen, context={'request': request}).data
            })
        except ImagenProducto.DoesNotExist:
            return Response(
                {'error': 'Imagen no encontrada o no pertenece a este producto'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def desasociar_imagen(self, request, pk=None):
        """
        Desasocia una imagen de una variante (la hace general del producto)
        POST /api/catalogo/variante/{id}/desasociar_imagen/
        Body: { "imagen_id": 123 }
        """
        variante = self.get_object()
        imagen_id = request.data.get('imagen_id')
        
        if not imagen_id:
            return Response(
                {'error': 'Se requiere el ID de la imagen'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            imagen = ImagenProducto.objects.get(
                id=imagen_id,
                variante=variante
            )
            imagen.variante = None
            imagen.save()
            
            return Response({
                'mensaje': 'Imagen desasociada correctamente',
                'imagen': ImagenProductoSerializer(imagen, context={'request': request}).data
            })
        except ImagenProducto.DoesNotExist:
            return Response(
                {'error': 'Imagen no encontrada o no pertenece a esta variante'},
                status=status.HTTP_404_NOT_FOUND
            )


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
        Filtra imágenes por producto o variante si se proporcionan los parámetros
        """
        queryset = ImagenProducto.objects.all()
        producto_id = self.request.query_params.get('producto', None)
        variante_id = self.request.query_params.get('variante', None)
        
        if producto_id:
            queryset = queryset.filter(producto_id=producto_id)
        
        if variante_id:
            queryset = queryset.filter(variante_id=variante_id)
        
        # Filtrar solo imágenes generales (sin variante)
        solo_generales = self.request.query_params.get('solo_generales', None)
        if solo_generales and solo_generales.lower() == 'true':
            queryset = queryset.filter(variante__isnull=True)
        
        return queryset.select_related('producto', 'variante').order_by('orden')
    
    @action(detail=True, methods=['post'])
    def asociar_variante(self, request, pk=None):
        """
        Asocia esta imagen a una variante específica
        POST /api/catalogo/imagen/{id}/asociar_variante/
        Body: { "variante_id": 123 }
        """
        imagen = self.get_object()
        variante_id = request.data.get('variante_id')
        
        if not variante_id:
            return Response(
                {'error': 'Se requiere el ID de la variante'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            variante = ProductoVariante.objects.get(
                id=variante_id,
                producto=imagen.producto
            )
            imagen.variante = variante
            imagen.save()
            
            return Response({
                'mensaje': 'Imagen asociada correctamente a la variante',
                'imagen': ImagenProductoSerializer(imagen, context={'request': request}).data
            })
        except ProductoVariante.DoesNotExist:
            return Response(
                {'error': 'Variante no encontrada o no pertenece a este producto'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def desasociar_variante(self, request, pk=None):
        """
        Desasocia esta imagen de su variante (la hace general del producto)
        POST /api/catalogo/imagen/{id}/desasociar_variante/
        """
        imagen = self.get_object()
        imagen.variante = None
        imagen.save()
        
        return Response({
            'mensaje': 'Imagen desasociada correctamente',
            'imagen': ImagenProductoSerializer(imagen, context={'request': request}).data
        })
