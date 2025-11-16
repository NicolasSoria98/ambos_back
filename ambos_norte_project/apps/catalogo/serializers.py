from rest_framework import serializers
from .models import Categoria, Producto, ImagenProducto, Talla, Color, ProductoVariante
import json


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ["id", "nombre", "descripcion", "activo", "fecha_creacion"]


class TallaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Talla
        fields = ["id", "nombre", "orden", "activo"]


class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = ["id", "nombre", "codigo_hex", "activo"]


class ImagenProductoSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = ImagenProducto
        fields = ["id", "producto", "orden", "imagen", "imagen_url", "variante"]

    def get_imagen_url(self, obj):
        try:
            request = self.context.get("request")
            if obj.imagen and hasattr(obj.imagen, "url"):
                url = obj.imagen.url
                return request.build_absolute_uri(url) if request else url
        except Exception:
            pass
        return None


class ProductoVarianteSerializer(serializers.ModelSerializer):
    talla_nombre = serializers.CharField(source='talla.nombre', read_only=True)
    color_nombre = serializers.CharField(source='color.nombre', read_only=True)
    precio_final = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    imagenes = ImagenProductoSerializer(many=True, read_only=True)
    
    class Meta:
        model = ProductoVariante
        fields = [
            "id",
            "talla",
            "talla_nombre",
            "color",
            "color_nombre",
            "stock",
            "precio_final",
            "activo",
            "fecha_creacion",
            "imagenes"
        ]
        read_only_fields = ['precio_final', 'fecha_creacion']


class ProductoListSerializer(serializers.ModelSerializer):
    """Serializer para listar productos - vista resumida"""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    imagen_principal_url = serializers.SerializerMethodField()
    stock_total = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    stock_disponible = serializers.SerializerMethodField()
    variantes_count = serializers.SerializerMethodField()
    precio = serializers.DecimalField(source='precio_base', max_digits=10, decimal_places=2, read_only=True)
    sexo_display = serializers.CharField(source='get_sexo_display', read_only=True)

    class Meta:
        model = Producto
        fields = [
            "id",
            "nombre",
            "precio_base",
            "precio",
            "sexo",
            "sexo_display",
            "stock_total",
            "stock",
            "stock_disponible",
            "activo",
            "destacado",
            "imagen_principal",
            "imagen_principal_url",
            "categoria",
            "categoria_nombre",
            "variantes_count"
        ]

    def get_imagen_principal_url(self, obj):
        try:
            request = self.context.get("request")
            if obj.imagen_principal and hasattr(obj.imagen_principal, "url"):
                url = obj.imagen_principal.url
                return request.build_absolute_uri(url) if request else url
        except Exception:
            pass
        return None
    
    def get_stock_total(self, obj):
        """Calcula el stock total de todas las variantes"""
        return obj.stock_total()
    
    def get_stock(self, obj):
        """Alias de stock_total para compatibilidad con frontend"""
        return obj.stock_total()
    
    def get_stock_disponible(self, obj):
        """Verifica si hay stock disponible"""
        return obj.stock_disponible
    
    def get_variantes_count(self, obj):
        return obj.variantes.filter(activo=True).count()


class ProductoDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle de producto - vista completa con variantes"""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    imagen_principal_url = serializers.SerializerMethodField()
    imagenes = serializers.SerializerMethodField()
    variantes = ProductoVarianteSerializer(many=True, read_only=True)
    stock_total = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    stock_disponible = serializers.SerializerMethodField()
    precio = serializers.DecimalField(source='precio_base', max_digits=10, decimal_places=2, read_only=True)
    sexo_display = serializers.CharField(source='get_sexo_display', read_only=True)

    class Meta:
        model = Producto
        fields = [
            "id",
            "nombre",
            "descripcion",
            "precio_base",
            "precio",
            "sexo",
            "sexo_display",
            "stock_total",
            "stock",
            "stock_disponible",
            "material",
            "activo",
            "destacado",
            "imagen_principal",
            "imagen_principal_url",
            "categoria",
            "categoria_nombre",
            "imagenes",
            "variantes",
            "fecha_creacion",
        ]

    def get_imagen_principal_url(self, obj):
        try:
            request = self.context.get("request")
            if obj.imagen_principal and hasattr(obj.imagen_principal, "url"):
                url = obj.imagen_principal.url
                return request.build_absolute_uri(url) if request else url
        except Exception:
            pass
        return None
    
    def get_imagenes(self, obj):
        """Retorna solo las imágenes generales (sin variante asignada)"""
        request = self.context.get("request")
        imagenes_generales = obj.imagenes.filter(variante__isnull=True)
        return ImagenProductoSerializer(imagenes_generales, many=True, context={'request': request}).data
    
    def get_stock_total(self, obj):
        """Calcula el stock total de todas las variantes"""
        return obj.stock_total()
    
    def get_stock(self, obj):
        """Alias de stock_total para compatibilidad con frontend"""
        return obj.stock_total()
    
    def get_stock_disponible(self, obj):
        """Verifica si hay stock disponible"""
        return obj.stock_disponible


class ProductoCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear y actualizar productos con sus variantes"""
    
    class Meta:
        model = Producto
        fields = [
            "id",
            "nombre",
            "descripcion",
            "precio_base",
            "sexo",
            "material",
            "categoria",
            "activo",
            "destacado",
            "imagen_principal",
            "fecha_creacion",
            "fecha_modificacion"
        ]
        read_only_fields = ['fecha_creacion', 'fecha_modificacion']
    
    def validate_precio_base(self, value):
        """Validar que el precio sea positivo"""
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor a 0")
        return value
    
    def to_internal_value(self, data):
        """Convertir valores de FormData correctamente"""
        if hasattr(data, 'copy'):
            data = data.copy()
        else:
            data = dict(data)
        
        if isinstance(data.get('activo'), str):
            data['activo'] = data.get('activo', 'true').lower() == 'true'
        
        if isinstance(data.get('destacado'), str):
            data['destacado'] = data.get('destacado', 'false').lower() == 'true'
        
        variantes_json = None
        if 'variantes' in data:
            if isinstance(data['variantes'], str):
                try:
                    variantes_json = json.loads(data['variantes'])
                except json.JSONDecodeError as e:
                    print(f"❌ Error al parsear variantes: {e}")
            elif isinstance(data['variantes'], list):
                variantes_json = data['variantes']
        
        if 'variantes' in data:
            del data['variantes']
        
        if variantes_json:
            self._variantes_data = variantes_json
        
        return super().to_internal_value(data)
    
    def create(self, validated_data):
        """Crear producto con sus variantes"""
        variantes_data = getattr(self, '_variantes_data', [])
        producto = Producto.objects.create(**validated_data)
        
        for variante_data in variantes_data:
            imagenes_data = variante_data.pop('imagenes', [])
            talla_id = variante_data.pop('talla')
            color_id = variante_data.pop('color')
            talla = Talla.objects.get(id=talla_id)
            color = Color.objects.get(id=color_id)
            
            variante = ProductoVariante.objects.create(
                producto=producto,
                talla=talla,
                color=color,
                **variante_data
            )
            
            for imagen_data in imagenes_data:
                if isinstance(imagen_data, dict) and 'id' in imagen_data:
                    try:
                        imagen = ImagenProducto.objects.get(id=imagen_data['id'], producto=producto)
                        imagen.variante = variante
                        imagen.save()
                    except ImagenProducto.DoesNotExist:
                        pass
        
        return producto

    def update(self, instance, validated_data):
        """Actualizar producto y sus variantes"""
        variantes_data = getattr(self, '_variantes_data', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if variantes_data is not None:
            instance.variantes.all().delete()
            
            for variante_data in variantes_data:
                imagenes_data = variante_data.pop('imagenes', [])
                talla_id = variante_data.pop('talla')
                color_id = variante_data.pop('color')
                talla = Talla.objects.get(id=talla_id)
                color = Color.objects.get(id=color_id)
                
                variante = ProductoVariante.objects.create(
                    producto=instance,
                    talla=talla,
                    color=color,
                    **variante_data
                )
                
                for imagen_data in imagenes_data:
                    if isinstance(imagen_data, dict) and 'id' in imagen_data:
                        try:
                            imagen = ImagenProducto.objects.get(id=imagen_data['id'], producto=instance)
                            imagen.variante = variante
                            imagen.save()
                        except ImagenProducto.DoesNotExist:
                            pass
        
        return instance


class ProductoVarianteCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer específico para crear/actualizar variantes individualmente"""
    
    class Meta:
        model = ProductoVariante
        fields = [
            "id",
            "producto",
            "talla",
            "color",
            "stock",
            "activo"
        ]
    
    def validate_stock(self, value):
        """Validar que el stock no sea negativo"""
        if value < 0:
            raise serializers.ValidationError("El stock no puede ser negativo")
        return value
    
    def validate(self, data):
        """Validar que no exista una variante duplicada"""
        producto = data.get('producto')
        talla = data.get('talla')
        color = data.get('color')
        
        queryset = ProductoVariante.objects.filter(
            producto=producto,
            talla=talla,
            color=color
        )
        
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        
        if queryset.exists():
            raise serializers.ValidationError(
                "Ya existe una variante con esta combinación de talla y color para este producto"
            )
        
        return data

# Alias para compatibilidad
ProductoSerializer = ProductoCreateUpdateSerializer