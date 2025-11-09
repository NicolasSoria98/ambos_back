from django.apps import AppConfig


class PanelAdminConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.panel_admin'
    label = 'panel_admin'
    verbose_name = 'Panel de Administración'

