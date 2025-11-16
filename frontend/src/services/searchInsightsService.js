import api from './api';

const BASE_URL = '/search-insights';

const searchInsightsService = {
  // Consultar tendencias de búsqueda
  getTrends: async (data) => {
    const response = await api.post(`${BASE_URL}/trends/`, data);
    return response.data;
  },

  // Obtener códigos geográficos
  getGeoCodes: async () => {
    const response = await api.get(`${BASE_URL}/geocodes/`);
    return response.data;
  },

  // Obtener sugerencias de keywords
  getSuggestions: async (keyword, geo = 'AR') => {
    try {
      const response = await api.post(`${BASE_URL}/suggestions/`, { 
        keyword: keyword.trim(), 
        geo 
      });
      return response.data;
    } catch (error) {
      // Manejo mejorado de errores
      console.error('Error en getSuggestions:', error);
      
      // Si hay respuesta del servidor pero con error
      if (error.response?.data) {
        return {
          success: false,
          sugerencias: [],
          error: error.response.data.error || 'Error desconocido'
        };
      }
      
      // Si no hay respuesta (error de red, timeout, etc.)
      return {
        success: false,
        sugerencias: [],
        error: 'Error de conexión con el servidor'
      };
    }
  },
};

export default searchInsightsService;