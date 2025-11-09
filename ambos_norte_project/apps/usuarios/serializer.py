from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Usuario, Direccion


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    
    class Meta:
        model = Usuario
        fields = '__all__'
        read_only_fields = ('fecha_registro',)
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def create(self, validated_data):
        """
        Crea un usuario asegurándose de hashear la contraseña
        """
        password = validated_data.pop('password', None)
        
        # Crear usuario sin contraseña primero
        user = Usuario(**validated_data)
        
        # Si se proporcionó contraseña, hashearla
        if password:
            user.set_password(password)
        else:
            # Si no hay contraseña, generar una aleatoria
            user.set_unusable_password()
        
        user.save()
        return user
    
    def update(self, instance, validated_data):
        """
        Actualiza un usuario asegurándose de hashear la contraseña si se proporciona
        """
        password = validated_data.pop('password', None)
        
        # Actualizar campos normales
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Si se proporcionó una nueva contraseña, hashearla
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


class DireccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Direccion
        fields = '__all__'
        read_only_fields = ('fecha_creacion', 'usuario')


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            raise serializers.ValidationError("Email y contraseña son requeridos")
        
        # Buscar usuario por email
        try:
            user = Usuario.objects.get(email=email)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Credenciales incorrectas")
        
        # Autenticar con username y password (Django usa username por defecto)
        user = authenticate(username=user.username, password=password)
        
        if not user:
            raise serializers.ValidationError("Credenciales incorrectas")
        
        if not user.is_active:
            raise serializers.ValidationError("Usuario inactivo")
        
        data['user'] = user
        return data


class RegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = Usuario
        fields = ('username', 'email', 'password', 'password_confirm', 
                  'first_name', 'last_name', 'telefono')
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Las contraseñas no coinciden")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = Usuario.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            telefono=validated_data.get('telefono', ''),
            tipo_usuario='cliente'
        )
        return user