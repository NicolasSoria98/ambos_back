from rest_framework import serializers
from .models import Categoria, Producto, ImagenProducto


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ["id", "nombre"]


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
    categoria = CategoriaSerializer(read_only=True)
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
    categoria = CategoriaSerializer(read_only=True)
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
    class Meta:
        model = Producto
        fields = "__all__"

