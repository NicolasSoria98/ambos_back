from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, Direccion


class DireccionInline(admin.TabularInline):
    model = Direccion
    extra = 0


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = [
        'id', 'username', 'email', 'first_name', 'last_name',
        'telefono', 'tipo_usuario', 'is_active', 'is_staff', 'is_superuser'
    ]
    list_filter = ['tipo_usuario', 'is_active', 'is_staff', 'is_superuser']
    search_fields = ['username', 'email', 'telefono']
    ordering = ['id']

    fieldsets = (
        ('Credenciales', {'fields': ('username', 'password')}),
        ('Información personal', {'fields': (
            'first_name', 'last_name', 'email', 'telefono', 'tipo_usuario'
        )}),
        ('Permisos y roles', {'fields': (
            'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'
        )}),
        ('Fechas importantes', {'fields': (
            'last_login', 'fecha_registro', 'date_joined'
        )}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'username', 'email', 'first_name', 'last_name',
                'telefono', 'tipo_usuario',
                'password1', 'password2',
                'is_active', 'is_staff', 'is_superuser'
            ),
        }),
    )

    readonly_fields = ('last_login', 'fecha_registro', 'date_joined')
    inlines = [DireccionInline]
