from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from datetime import datetime, timedelta
import logging
import time

# Pytrends para Google Trends
try:
    from pytrends.request import TrendReq
    PYTRENDS_AVAILABLE = True
except ImportError:
    PYTRENDS_AVAILABLE = False

logger = logging.getLogger(__name__)


class SearchTrendsView(APIView):
    """
    Vista para consultar tendencias de búsqueda en Google Trends
    No guarda datos en BD - consulta en tiempo real
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Consultar tendencias de búsqueda
        
        Body:
        {
            "keywords": ["palabra1", "palabra2"],  # Array de keywords
            "fecha_inicio": "2024-01-01",  # Opcional
            "fecha_fin": "2024-12-31",  # Opcional
            "geo": "AR",  # Código país ISO (AR, US, ES, etc.)
            "ciudad": "AR-C"  # Código región/ciudad (opcional, ej: AR-C para CABA)
        }
        """
        if not PYTRENDS_AVAILABLE:
            return Response(
                {
                    'error': 'pytrends no está instalado. Ejecutar: pip install pytrends',
                    'install_command': 'pip install pytrends'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            # Obtener parámetros
            keywords = request.data.get('keywords', [])
            fecha_inicio = request.data.get('fecha_inicio')
            fecha_fin = request.data.get('fecha_fin')
            geo = request.data.get('geo', 'AR')  # Default Argentina
            ciudad = request.data.get('ciudad', '')  # Región/ciudad específica
            
            # Validaciones
            if not keywords or len(keywords) == 0:
                return Response(
                    {'error': 'Debe proporcionar al menos una keyword'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if len(keywords) > 5:
                return Response(
                    {'error': 'Máximo 5 keywords por consulta'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Construir timeframe
            if fecha_inicio and fecha_fin:
                timeframe = f'{fecha_inicio} {fecha_fin}'
            else:
                # Por defecto últimos 90 días
                fecha_fin = datetime.now().strftime('%Y-%m-%d')
                fecha_inicio = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
                timeframe = f'{fecha_inicio} {fecha_fin}'
            
            # DESPUÉS (sin retries):
            pytrends = TrendReq(
                hl='es-AR', 
                tz=360, 
                timeout=(10, 30)  # (connect timeout, read timeout)
            )
            
            # Si hay ciudad específica, usarla; sino usar país
            geo_param = ciudad if ciudad else geo
            
            # Construir payload
            pytrends.build_payload(
                kw_list=keywords,
                cat=0,
                timeframe=timeframe,
                geo=geo_param,
                gprop=''
            )
            
            # Obtener interés a lo largo del tiempo
            interest_over_time = pytrends.interest_over_time()
            
            # Convertir a formato JSON serializable
            tendencia_temporal = []
            if not interest_over_time.empty:
                interest_over_time = interest_over_time.drop(columns=['isPartial'], errors='ignore')
                tendencia_temporal = interest_over_time.reset_index().to_dict('records')
                
                # Convertir fechas a string
                for item in tendencia_temporal:
                    if 'date' in item:
                        item['date'] = item['date'].strftime('%Y-%m-%d')
            
            # Obtener interés por región
            interest_by_region = pytrends.interest_by_region(
                resolution='REGION' if not ciudad else 'CITY',
                inc_low_vol=True,
                inc_geo_code=True
            )
            
            datos_regionales = []
            if not interest_by_region.empty:
                interest_by_region_reset = interest_by_region.reset_index()
                datos_regionales = interest_by_region_reset.to_dict('records')
            
            # Obtener consultas relacionadas
            related_queries = {}
            try:
                related_queries_data = pytrends.related_queries()
                # Convertir DataFrames a dict
                for kw in keywords:
                    if kw in related_queries_data:
                        related_queries[kw] = {
                            'top': related_queries_data[kw]['top'].to_dict('records') if related_queries_data[kw]['top'] is not None else [],
                            'rising': related_queries_data[kw]['rising'].to_dict('records') if related_queries_data[kw]['rising'] is not None else []
                        }
            except Exception as e:
                logger.warning(f"No se pudieron obtener consultas relacionadas: {str(e)}")
                related_queries = {}
            
            # Calcular resumen
            resumen = {
                'keywords_analizadas': len(keywords),
                'periodo': f'{fecha_inicio} a {fecha_fin}',
                'pais': geo,
                'region': ciudad if ciudad else 'Nacional',
                'regiones_con_datos': len(datos_regionales)
            }
            
            # Agregar promedios por keyword
            promedios = {}
            if not interest_over_time.empty:
                for kw in keywords:
                    if kw in interest_over_time.columns:
                        promedios[kw] = {
                            'promedio': float(interest_over_time[kw].mean()),
                            'maximo': int(interest_over_time[kw].max()),
                            'minimo': int(interest_over_time[kw].min())
                        }
            
            resumen['promedios'] = promedios
            
            return Response({
                'success': True,
                'resumen': resumen,
                'tendencia_temporal': tendencia_temporal,
                'datos_regionales': datos_regionales,
                'consultas_relacionadas': related_queries,
                'parametros_consulta': {
                    'keywords': keywords,
                    'timeframe': timeframe,
                    'geo': geo_param
                }
            })
            
        except Exception as e:
            logger.error(f"Error consultando Google Trends: {str(e)}")
            return Response(
                {
                    'error': 'Error al consultar Google Trends',
                    'detalle': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GeoCodesView(APIView):
    """
    Vista para obtener códigos geográficos disponibles
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Retorna lista de países y regiones con sus códigos
        """
        # Códigos más comunes de países latinoamericanos
        paises = [
            {'codigo': 'AR', 'nombre': 'Argentina'},
            {'codigo': 'BR', 'nombre': 'Brasil'},
            {'codigo': 'CL', 'nombre': 'Chile'},
            {'codigo': 'CO', 'nombre': 'Colombia'},
            {'codigo': 'MX', 'nombre': 'México'},
            {'codigo': 'PE', 'nombre': 'Perú'},
            {'codigo': 'UY', 'nombre': 'Uruguay'},
            {'codigo': 'PY', 'nombre': 'Paraguay'},
            {'codigo': 'VE', 'nombre': 'Venezuela'},
            {'codigo': 'EC', 'nombre': 'Ecuador'},
            {'codigo': 'BO', 'nombre': 'Bolivia'},
            {'codigo': 'US', 'nombre': 'Estados Unidos'},
            {'codigo': 'ES', 'nombre': 'España'},
        ]
        
        # Regiones de Argentina (ejemplo)
        regiones_argentina = [
            {'codigo': 'AR-C', 'nombre': 'Ciudad Autónoma de Buenos Aires', 'pais': 'AR'},
            {'codigo': 'AR-B', 'nombre': 'Buenos Aires', 'pais': 'AR'},
            {'codigo': 'AR-K', 'nombre': 'Catamarca', 'pais': 'AR'},
            {'codigo': 'AR-H', 'nombre': 'Chaco', 'pais': 'AR'},
            {'codigo': 'AR-U', 'nombre': 'Chubut', 'pais': 'AR'},
            {'codigo': 'AR-X', 'nombre': 'Córdoba', 'pais': 'AR'},
            {'codigo': 'AR-W', 'nombre': 'Corrientes', 'pais': 'AR'},
            {'codigo': 'AR-E', 'nombre': 'Entre Ríos', 'pais': 'AR'},
            {'codigo': 'AR-P', 'nombre': 'Formosa', 'pais': 'AR'},
            {'codigo': 'AR-Y', 'nombre': 'Jujuy', 'pais': 'AR'},
            {'codigo': 'AR-L', 'nombre': 'La Pampa', 'pais': 'AR'},
            {'codigo': 'AR-F', 'nombre': 'La Rioja', 'pais': 'AR'},
            {'codigo': 'AR-M', 'nombre': 'Mendoza', 'pais': 'AR'},
            {'codigo': 'AR-N', 'nombre': 'Misiones', 'pais': 'AR'},
            {'codigo': 'AR-Q', 'nombre': 'Neuquén', 'pais': 'AR'},
            {'codigo': 'AR-R', 'nombre': 'Río Negro', 'pais': 'AR'},
            {'codigo': 'AR-A', 'nombre': 'Salta', 'pais': 'AR'},
            {'codigo': 'AR-J', 'nombre': 'San Juan', 'pais': 'AR'},
            {'codigo': 'AR-D', 'nombre': 'San Luis', 'pais': 'AR'},
            {'codigo': 'AR-Z', 'nombre': 'Santa Cruz', 'pais': 'AR'},
            {'codigo': 'AR-S', 'nombre': 'Santa Fe', 'pais': 'AR'},
            {'codigo': 'AR-G', 'nombre': 'Santiago del Estero', 'pais': 'AR'},
            {'codigo': 'AR-V', 'nombre': 'Tierra del Fuego', 'pais': 'AR'},
            {'codigo': 'AR-T', 'nombre': 'Tucumán', 'pais': 'AR'},
        ]
        
        return Response({
            'paises': paises,
            'regiones': {
                'argentina': regiones_argentina
            }
        })


class SuggestionsView(APIView):
    """
    Vista para obtener sugerencias de búsqueda de Google
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Obtener sugerencias basadas en keyword parcial
        
        Body:
        {
            "keyword": "depor",
            "geo": "AR"
        }
        """
        if not PYTRENDS_AVAILABLE:
            return Response(
                {'error': 'pytrends no está instalado'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            keyword = request.data.get('keyword', '').strip()
            geo = request.data.get('geo', 'AR')
            
            # Validación mejorada
            if not keyword:
                return Response({
                    'success': True,
                    'sugerencias': []
                })
            
            if len(keyword) < 2:
                return Response({
                    'success': True,
                    'sugerencias': []
                })
            
            # Inicializar pytrends SIN retries para evitar el error de urllib3
            # El problema es que pytrends usa 'method_whitelist' que fue deprecado en urllib3 2.0+
            pytrends = TrendReq(
                hl='es-AR', 
                tz=360,
                timeout=(5, 15)
                # NO usar retries ni backoff_factor aquí
            )
            
            # Obtener sugerencias con manejo de errores robusto
            try:
                suggestions = pytrends.suggestions(keyword=keyword)
                
                # Validar que suggestions sea una lista
                if not isinstance(suggestions, list):
                    suggestions = []
                
                # Limitar a 10 sugerencias máximo
                suggestions = suggestions[:10]
                
                return Response({
                    'success': True,
                    'sugerencias': suggestions,
                    'keyword': keyword
                })
                
            except ConnectionError as e:
                logger.error(f"Error de conexión obteniendo sugerencias: {str(e)}")
                return Response({
                    'success': True,  # Cambiar a True para que el frontend no muestre error
                    'sugerencias': [],
                    'mensaje': 'No se pudieron obtener sugerencias en este momento'
                })
                
            except Exception as e:
                logger.error(f"Error en pytrends.suggestions: {str(e)}")
                return Response({
                    'success': True,  # Cambiar a True para que el frontend no muestre error
                    'sugerencias': [],
                    'mensaje': 'No se pudieron obtener sugerencias en este momento'
                })
                
        except Exception as e:
            logger.error(f"Error inesperado obteniendo sugerencias: {str(e)}", exc_info=True)
            return Response({
                'success': True,  # Cambiar a True para evitar errores en el frontend
                'sugerencias': [],
                'mensaje': 'Error temporal obteniendo sugerencias'
            })