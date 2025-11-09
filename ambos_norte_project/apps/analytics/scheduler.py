import schedule
import time
import subprocess
import os
from pathlib import Path

# Ruta al proyecto
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MANAGE_PY = BASE_DIR / 'manage.py'


def ejecutar_comando(comando):
    """Ejecutar comando de Django"""
    try:
        print(f'Ejecutando: {comando}')
        result = subprocess.run(
            ['python', str(MANAGE_PY), *comando.split()],
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(f'Errores: {result.stderr}')
    except Exception as e:
        print(f'Error ejecutando {comando}: {e}')


def tarea_metricas_diarias():
    """Calcular métricas diarias"""
    print('=== Iniciando cálculo de métricas diarias ===')
    ejecutar_comando('calcular_metricas_diarias')
    print('=== Finalizando cálculo de métricas diarias ===\n')


def tarea_actualizar_productos():
    """Actualizar métricas de productos"""
    print('=== Iniciando actualización de métricas de productos ===')
    ejecutar_comando('actualizar_metricas_productos')
    print('=== Finalizando actualización de métricas de productos ===\n')


def tarea_limpiar_eventos():
    """Limpiar eventos antiguos"""
    print('=== Iniciando limpieza de eventos antiguos ===')
    ejecutar_comando('limpiar_eventos_antiguos --dias 90 --confirmar')
    print('=== Finalizando limpieza de eventos antiguos ===\n')


# Programar tareas
schedule.every().day.at("00:30").do(tarea_metricas_diarias)
schedule.every().day.at("01:00").do(tarea_actualizar_productos)
schedule.every().sunday.at("02:00").do(tarea_limpiar_eventos)

print('Scheduler iniciado. Presiona Ctrl+C para detener.')
print('Tareas programadas:')
print('  - Métricas diarias: 00:30')
print('  - Actualizar productos: 01:00')
print('  - Limpiar eventos: Domingos 02:00')

# Loop principal
while True:
    schedule.run_pending()
    time.sleep(60)  # Verificar cada minuto