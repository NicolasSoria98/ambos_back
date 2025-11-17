from rest_framework import serializers
from decimal import Decimal
from django.db import transaction
from .models import Pedido, ItemPedido, HistorialEstadoPedido
from apps.catalogo.models import Producto, ProductoVariante
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
    variante_info = serializers.SerializerMethodField()
    
    class Meta:
        model = ItemPedido
        fields = [
            'id', 'producto', 'variante', 'nombre_producto',
            'cantidad', 'precio_unitario', 'subtotal', 'producto_info', 'variante_info'
        ]
        read_only_fields = ['id', 'nombre_producto', 'subtotal']
    
    def get_producto_info(self, obj):
        if obj.producto:
            return ProductoInfoSerializer(obj.producto, context=self.context).data
        return None
    
    def get_variante_info(self, obj):
        """Retorna información de la variante del pedido"""
        if obj.variante:
            return {
                'id': obj.variante.id,
                'talla': obj.variante.talla.nombre,
                'color': obj.variante.color.nombre,
            }
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
            'notas', 'fecha_pedido', 'activo', 'items', 'direccion_info', 'total_items',
            'metodo_pago', 'estado_pago'
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
    variante_id = serializers.IntegerField(required=False, allow_null=True)
    cantidad = serializers.IntegerField(min_value=1)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=2)


class CrearPedidoSerializer(serializers.Serializer):
    items = CrearItemInputSerializer(many=True)
    contacto = serializers.DictField(child=serializers.CharField(), required=False)
    notas = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    envio = serializers.DictField(required=False)
    direccion = serializers.DictField(required=False, allow_null=True)
    metodo_pago = serializers.ChoiceField(
        choices=['efectivo', 'mercadopago', 'transferencia'],
        default='mercadopago',
        required=False
    )
    estado_pago = serializers.ChoiceField(
        choices=['pendiente', 'pagado', 'rechazado'],
        default='pendiente',
        required=False
    )

    def validate(self, attrs):
        if not attrs.get('items'):
            raise serializers.ValidationError('items es requerido')

        # Validar que si es envío, debe haber dirección
        envio = attrs.get('envio') or {}
        if envio.get('tipo') == 'envio' and not attrs.get('direccion'):
            raise serializers.ValidationError('direccion es requerida para envío a domicilio')

        return attrs

    def create(self, validated_data):
        request = self.context['request']
        user = request.user if request.user and request.user.is_authenticated else None
        items_data = validated_data['items']
        contacto = validated_data.get('contacto') or {}
        notas = validated_data.get('notas') or ''
        envio = validated_data.get('envio') or {}
        direccion_data = validated_data.get('direccion')
        metodo_pago = validated_data.get('metodo_pago', 'mercadopago')
        estado_pago = validated_data.get('estado_pago', 'pendiente')

        with transaction.atomic():
            # Crear o buscar dirección si es envío a domicilio
            direccion_obj = None
            if envio.get('tipo') == 'envio' and direccion_data and user:
                # Mapeo de ciudad a código postal y provincia
                ciudad_map = {
                    'Corrientes': {'codigo_postal': '3400', 'provincia': 'Corrientes'},
                    'Resistencia': {'codigo_postal': '3500', 'provincia': 'Chaco'}
                }

                ciudad = direccion_data.get('ciudad', '')
                ciudad_info = ciudad_map.get(ciudad, {})

                # Crear nueva dirección
                direccion_obj = Direccion.objects.create(
                    usuario=user,
                    calle=direccion_data.get('calle', ''),
                    numero=direccion_data.get('numero', ''),
                    piso_depto=direccion_data.get('piso_depto', ''),
                    ciudad=ciudad,
                    provincia=ciudad_info.get('provincia', ''),
                    codigo_postal=ciudad_info.get('codigo_postal', ''),
                    es_predeterminada=False
                )
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
                
                # Validar variante si se especifica
                variante = None
                if it.get('variante_id'):
                    try:
                        variante = ProductoVariante.objects.select_for_update().get(
                            id=it['variante_id'],
                            producto=producto
                        )
                        # Validar stock de la variante específica
                        if not variante.tiene_stock(cantidad):
                            raise serializers.ValidationError({
                                'items': [
                                    f"Stock insuficiente para '{producto.nombre}' "
                                    f"({variante.talla.nombre} - {variante.color.nombre}). "
                                    f"Disponible: {variante.stock}"
                                ]
                            })
                    except ProductoVariante.DoesNotExist:
                        raise serializers.ValidationError({
                            'items': [f"Variante con id {it['variante_id']} no existe para este producto"]
                        })
                else:
                    # Si no se especifica variante, validar stock total
                    stock_disponible = producto.stock_total()
                    if stock_disponible < cantidad:
                        raise serializers.ValidationError({
                            'items': [f"Stock insuficiente para '{producto.nombre}'. Disponible: {stock_disponible}"]
                        })

                precio_unitario = Decimal(str(producto.precio_base))
                sub = Decimal(cantidad) * precio_unitario
                detalles_items.append((producto, variante, cantidad, precio_unitario, sub))
                subtotal += sub

            envio_costo = Decimal(str(envio.get('costo') or 0))
            total = subtotal + envio_costo

            from datetime import datetime
            numero_pedido = datetime.utcnow().strftime('PN%Y%m%d%H%M%S')

            pedido = Pedido.objects.create(
                numero_pedido=numero_pedido,
                usuario=user,
                direccion=direccion_obj,
                email_contacto=contacto.get('email') or (user.email if user else ''),
                telefono_contacto=contacto.get('telefono') or '',
                subtotal=subtotal,
                total=total,
                notas=notas,
                metodo_pago=metodo_pago,
                estado_pago=estado_pago,
            )

            # Crear items del pedido
            for producto, variante, cantidad, precio_unitario, sub in detalles_items:
                ItemPedido.objects.create(
                    pedido=pedido,
                    producto=producto,
                    variante=variante,
                    nombre_producto=producto.nombre,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    subtotal=sub,
                )
                
                # Reducir stock de la variante específica o de variantes disponibles
                if variante:
                    # Si hay variante específica, reducir su stock
                    variante.reducir_stock(cantidad)
                else:
                    # Si no hay variante, reducir de las variantes disponibles
                    variantes_disponibles = producto.variantes.filter(
                        stock__gt=0, activo=True
                    ).order_by('-stock')
                    
                    cantidad_restante = cantidad
                    for var in variantes_disponibles:
                        if cantidad_restante <= 0:
                            break
                        
                        cantidad_a_reducir = min(cantidad_restante, var.stock)
                        var.stock -= cantidad_a_reducir
                        var.save(update_fields=['stock'])
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