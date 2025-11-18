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
    
    class Meta:
        model = ItemPedido
        fields = [
            'id', 'producto', 'variante', 'nombre_producto', 'cantidad',
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
    pago_id = serializers.SerializerMethodField()

    class Meta:
        model = Pedido
        fields = [
            'id', 'numero_pedido', 'usuario', 'usuario_nombre', 'email_contacto', 
            'telefono_contacto', 'subtotal', 'total', 'costo_envio', 'estado', 'estado_pedido',
            'estado_pago', 'metodo_pago', 'notas', 'fecha_pedido', 'activo', 'items', 
            'direccion_info', 'total_items', 'pago_id'
        ]
        read_only_fields = [
            'id', 'numero_pedido', 'usuario', 'subtotal', 'total', 'estado',
            'fecha_pedido', 'items', 'usuario_nombre', 'total_items', 'pago_id'
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
    
    def get_pago_id(self, obj):
        """Devuelve el ID del pago asociado al pedido"""
        pago = obj.pagos.first()
        return pago.id if pago else None


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
    metodo_pago = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    estado_pago = serializers.CharField(required=False, default='pendiente')
    direccion_id = serializers.IntegerField(required=False, allow_null=True)  # ✅ NUEVO

    def validate(self, attrs):
        if not attrs.get('items'):
            raise serializers.ValidationError('items es requerido')
        
        # ✅ Validar que la dirección existe si se proporciona
        direccion_id = attrs.get('direccion_id')
        if direccion_id:
            try:
                Direccion.objects.get(id=direccion_id)
            except Direccion.DoesNotExist:
                raise serializers.ValidationError({
                    'direccion_id': f'Dirección con id {direccion_id} no existe'
                })
        
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        user = request.user if request.user and request.user.is_authenticated else None
        items_data = validated_data['items']
        contacto = validated_data.get('contacto') or {}
        notas = validated_data.get('notas') or ''
        envio = validated_data.get('envio') or {}
        metodo_pago = validated_data.get('metodo_pago', 'mercadopago')
        estado_pago = validated_data.get('estado_pago', 'pendiente')
        direccion_id = validated_data.get('direccion_id')  # ✅ NUEVO

        print(f"📤 Creando pedido con método: {metodo_pago}, estado_pago: {estado_pago}")
        if direccion_id:
            print(f"📍 Con direccion_id: {direccion_id}")

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
                
                # Verificar si tiene variante_id
                variante = None
                if it.get('variante_id'):
                    try:
                        variante = ProductoVariante.objects.select_for_update().get(
                            id=it['variante_id'],
                            producto=producto
                        )
                    except ProductoVariante.DoesNotExist:
                        raise serializers.ValidationError({
                            'items': [f"Variante con id {it['variante_id']} no existe para el producto {producto.nombre}"]
                        })
                    
                    # Validar stock de la variante
                    if not variante.tiene_stock(cantidad):
                        raise serializers.ValidationError({
                            'items': [f"Stock insuficiente para '{producto.nombre}' ({variante.talla.nombre} - {variante.color.nombre}). Disponible: {variante.stock}"]
                        })
                    
                    precio_unitario = Decimal(str(variante.precio_final))
                else:
                    # Sin variante, usar precio base del producto
                    precio_unitario = Decimal(str(producto.precio_base))
                
                sub = Decimal(cantidad) * precio_unitario
                detalles_items.append((producto, variante, cantidad, precio_unitario, sub))
                subtotal += sub

            envio_costo = Decimal(str(envio.get('costo') or 0))
            total = subtotal + envio_costo

            from datetime import datetime
            numero_pedido = datetime.utcnow().strftime('PN%Y%m%d%H%M%S')

            # ✅ Obtener la instancia de Direccion si se proporcionó direccion_id
            direccion_obj = None
            if direccion_id:
                try:
                    direccion_obj = Direccion.objects.get(id=direccion_id)
                    print(f"✅ Dirección encontrada: {direccion_obj}")
                except Direccion.DoesNotExist:
                    print(f"⚠️ Dirección con ID {direccion_id} no encontrada")

            # Crear pedido con estado='en_preparacion', estado_pago='pendiente', metodo_pago
            pedido = Pedido.objects.create(
                numero_pedido=numero_pedido,
                usuario=user,
                direccion=direccion_obj,  # ✅ NUEVO: Asignar la dirección
                email_contacto=contacto.get('email') or (user.email if user else ''),
                telefono_contacto=contacto.get('telefono') or '',
                subtotal=subtotal,
                total=total,
                notas=notas,
                estado='en_preparacion',  # Siempre en_preparacion
                estado_pago=estado_pago,  # pendiente
                metodo_pago=metodo_pago   # efectivo o mercadopago
            )

            print(f"✅ Pedido creado: ID={pedido.id}, estado={pedido.estado}, estado_pago={pedido.estado_pago}, método={pedido.metodo_pago}, direccion_id={pedido.direccion_id if pedido.direccion else None}")

            # Crear items y reducir stock
            for producto, variante, cantidad, precio_unitario, sub in detalles_items:
                # Construir nombre del producto con variante si existe
                if variante:
                    nombre_producto = f"{producto.nombre} ({variante.talla.nombre} - {variante.color.nombre})"
                else:
                    nombre_producto = producto.nombre
                
                ItemPedido.objects.create(
                    pedido=pedido,
                    producto=producto,
                    variante=variante,
                    nombre_producto=nombre_producto,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    subtotal=sub,
                )
                
                # Reducir stock de la variante si existe
                if variante:
                    variante.reducir_stock(cantidad)

            # Crear registro de Pago en la tabla de pagos
            if metodo_pago:
                from apps.pagos.models import Pago
                pago = Pago.objects.create(
                    pedido=pedido,
                    numero_pedido=pedido.numero_pedido,
                    monto=pedido.total,
                    metodo_pago=metodo_pago,
                    estado_pago=estado_pago,
                    fecha_pago=None if estado_pago == 'pendiente' else datetime.utcnow()
                )
                print(f"✅ Pago creado en tabla pagos: ID={pago.id}, método={pago.metodo_pago}, estado={pago.estado_pago}")

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