from rest_framework import serializers
from .models import Categoria, Producto, ImagenProducto


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ["id", "nombre", "descripcion", "activo", "fecha_creacion"]


class ImagenProductoSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = ImagenProducto
        fields = ["id", "orden", "imagen", "imagen_url"]

    def get_imagen_url(self, obj):
        try:
            request = self.context.get("request")
            if obj.imagen and hasattr(obj.imagen, "url"):
                url = obj.imagen.url
                return request.build_absolute_uri(url) if request else url
        except Exception:
            pass
        return None


class ProductoListSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    imagen_principal_url = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = [
            "id",
            "nombre",
            "precio",
            "stock",
            "activo",
            "destacado",
            "imagen_principal",
            "imagen_principal_url",
            "categoria",
            "categoria_nombre",
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


class ProductoDetailSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    imagen_principal_url = serializers.SerializerMethodField()
    imagenes = ImagenProductoSerializer(many=True, read_only=True)

    class Meta:
        model = Producto
        fields = [
            "id",
            "nombre",
            "descripcion",
            "precio",
            "stock",
            "talla",
            "color",
            "material",
            "activo",
            "destacado",
            "imagen_principal",
            "imagen_principal_url",
            "categoria",
            "categoria_nombre",
            "imagenes",
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


class ProductoSerializer(serializers.ModelSerializer):
    """Serializer para crear y actualizar productos"""
    
    class Meta:
        model = Producto
        fields = [
            "id",
            "nombre",
            "descripcion",
            "precio",
            "stock",
            "talla",
            "color",
            "material",
            "categoria",
            "activo",
            "destacado",
            "imagen_principal",
            "fecha_creacion",
            "fecha_modificacion"
        ]
        read_only_fields = ['fecha_creacion', 'fecha_modificacion']
    
    def validate_precio(self, value):
        """Validar que el precio sea positivo"""
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor a 0")
        return value
    
    def validate_stock(self, value):
        """Validar que el stock no sea negativo"""
        if value < 0:
            raise serializers.ValidationError("El stock no puede ser negativo")
        return value
    
    def to_internal_value(self, data):
        """Convertir valores de FormData correctamente"""
        # FormData envía booleanos como strings "true" o "false"
        if isinstance(data.get('activo'), str):
            data = data.copy() if hasattr(data, 'copy') else dict(data)
            data['activo'] = data.get('activo', 'true').lower() == 'true'
        
        if isinstance(data.get('destacado'), str):
            if not hasattr(data, 'copy'):
                data = dict(data)
            data['destacado'] = data.get('destacado', 'false').lower() == 'true'
        
        return super().to_internal_value(data)