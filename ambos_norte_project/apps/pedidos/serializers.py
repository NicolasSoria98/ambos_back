from rest_framework import serializers
from decimal import Decimal
from django.db import transaction
from .models import Pedido, ItemPedido, HistorialEstadoPedido
from apps.catalogo.models import Producto
from apps.usuarios.models import Direccion


class ProductoInfoSerializer(serializers.Serializer):
    """Info básica del producto para items"""
    id = serializers.IntegerField()
    nombre = serializers.CharField()
    imagen_principal = serializers.SerializerMethodField()
    
    def get_imagen_principal(self, obj):
        try:
            request = self.context.get('request')
            if hasattr(obj, 'imagen_principal') and obj.imagen_principal:
                url = obj.imagen_principal.url
                return request.build_absolute_uri(url) if request else url
        except:
            pass
        return None


class ItemPedidoSerializer(serializers.ModelSerializer):
    producto_info = serializers.SerializerMethodField()
    
    class Meta:
        model = ItemPedido
        fields = [
            'id', 'producto', 'nombre_producto', 'cantidad',
            'precio_unitario', 'subtotal', 'producto_info'
        ]
        read_only_fields = ['id', 'nombre_producto', 'subtotal']
    
    def get_producto_info(self, obj):
        if obj.producto:
            return ProductoInfoSerializer(obj.producto, context=self.context).data
        return None


class DireccionInfoSerializer(serializers.ModelSerializer):
    """Info básica de dirección para pedidos"""
    class Meta:
        model = Direccion
        fields = ['id', 'calle', 'numero', 'piso_depto', 'ciudad', 'provincia', 'codigo_postal']


class PedidoSerializer(serializers.ModelSerializer):
    items = ItemPedidoSerializer(many=True, read_only=True)
    usuario_nombre = serializers.SerializerMethodField()
    direccion_info = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()
    estado_pedido = serializers.CharField(source='estado', read_only=True)
    costo_envio = serializers.SerializerMethodField()

    class Meta:
        model = Pedido
        fields = [
            'id', 'numero_pedido', 'usuario', 'usuario_nombre', 'email_contacto', 
            'telefono_contacto', 'subtotal', 'total', 'costo_envio', 'estado', 'estado_pedido',
            'notas', 'fecha_pedido', 'activo', 'items', 'direccion_info', 'total_items'
        ]
        read_only_fields = [
            'id', 'numero_pedido', 'usuario', 'subtotal', 'total', 'estado',
            'fecha_pedido', 'items', 'usuario_nombre', 'total_items'
        ]
    
    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return f"{obj.usuario.first_name} {obj.usuario.last_name}".strip() or obj.usuario.username
        return None
    
    def get_direccion_info(self, obj):
        if obj.direccion:
            return DireccionInfoSerializer(obj.direccion).data
        return None
    
    def get_total_items(self, obj):
        return obj.items.count()
    
    def get_costo_envio(self, obj):
        return float(obj.total - obj.subtotal)


class CrearItemInputSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField()
    cantidad = serializers.IntegerField(min_value=1)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=2)


class CrearPedidoSerializer(serializers.Serializer):
    items = CrearItemInputSerializer(many=True)
    contacto = serializers.DictField(child=serializers.CharField(), required=False)
    notas = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    envio = serializers.DictField(required=False)

    def validate(self, attrs):
        if not attrs.get('items'):
            raise serializers.ValidationError('items es requerido')
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        user = request.user if request.user and request.user.is_authenticated else None
        items_data = validated_data['items']
        contacto = validated_data.get('contacto') or {}
        notas = validated_data.get('notas') or ''
        envio = validated_data.get('envio') or {}

        with transaction.atomic():
            detalles_items = [] 
            subtotal = Decimal('0.00')
            
            for it in items_data:
                try:
                    producto = Producto.objects.select_for_update().get(id=it['producto_id'])
                except Producto.DoesNotExist:
                    raise serializers.ValidationError({
                        'items': [f"Producto con id {it['producto_id']} no existe"]
                    })
                
                cantidad = int(it['cantidad'])
                if cantidad <= 0:
                    raise serializers.ValidationError({
                        'items': [f"Cantidad inválida para producto {producto.id}"]
                    })
                
                # ✅ CORREGIDO: Usar stock_total() en lugar de .stock
                stock_disponible = producto.stock_total()
                if stock_disponible < cantidad:
                    raise serializers.ValidationError({
                        'items': [f"Stock insuficiente para '{producto.nombre}'. Disponible: {stock_disponible}"]
                    })

                precio_unitario = Decimal(str(producto.precio_base))
                sub = Decimal(cantidad) * precio_unitario
                detalles_items.append((producto, cantidad, precio_unitario, sub))
                subtotal += sub

            envio_costo = Decimal(str(envio.get('costo') or 0))
            total = subtotal + envio_costo

            from datetime import datetime
            numero_pedido = datetime.utcnow().strftime('PN%Y%m%d%H%M%S')

            pedido = Pedido.objects.create(
                numero_pedido=numero_pedido,
                usuario=user,
                email_contacto=contacto.get('email') or (user.email if user else ''),
                telefono_contacto=contacto.get('telefono') or '',
                subtotal=subtotal,
                total=total,
                notas=notas,
            )

            # Crear items del pedido
            for producto, cantidad, precio_unitario, sub in detalles_items:
                ItemPedido.objects.create(
                    pedido=pedido,
                    producto=producto,
                    nombre_producto=producto.nombre,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    subtotal=sub,
                )
                
                # ✅ CORREGIDO: Reducir stock de las variantes
                # Como tienes variantes, necesitas decidir de cuál reducir
                # Opción 1: Reducir de la primera variante con stock
                variantes_disponibles = producto.variantes.filter(stock__gt=0, activo=True).order_by('-stock')
                
                cantidad_restante = cantidad
                for variante in variantes_disponibles:
                    if cantidad_restante <= 0:
                        break
                    
                    cantidad_a_reducir = min(cantidad_restante, variante.stock)
                    variante.stock -= cantidad_a_reducir
                    variante.save(update_fields=['stock'])
                    cantidad_restante -= cantidad_a_reducir

            # Crear registro inicial en el historial
            HistorialEstadoPedido.objects.create(
                pedido=pedido,
                estado_anterior=None,
                estado_nuevo='en_preparacion',
                usuario_modificador=user,
                comentario='Pedido creado'
            )

            return pedido


class HistorialEstadoPedidoSerializer(serializers.ModelSerializer):
    usuario_modificador_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = HistorialEstadoPedido
        fields = [
            'id', 'pedido', 'estado_anterior', 'estado_nuevo',
            'usuario_modificador', 'usuario_modificador_nombre', 'comentario', 'fecha_cambio'
        ]
        read_only_fields = ['id', 'fecha_cambio']
    
    def get_usuario_modificador_nombre(self, obj):
        if obj.usuario_modificador:
            return f"{obj.usuario_modificador.first_name} {obj.usuario_modificador.last_name}".strip() or obj.usuario_modificador.username
        return "Sistema"
