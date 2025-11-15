import api from './api';

const BASE_URL = '/api/search-insights';

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
    const response = await api.post(`${BASE_URL}/suggestions/`, { keyword, geo });
    return response.data;
  },
};

export default searchInsightsService;