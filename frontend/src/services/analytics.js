import api from './api';

const analyticsService = {
  // ==================== EVENTOS ====================
  
  // Crear evento de usuario
  createEvent: async (eventData) => {
    const response = await api.post('/analytics/eventos/', eventData);
    return response.data;
  },

  // Obtener eventos con filtros
  getEvents: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/analytics/eventos/?${params}`);
    return response.data;
  },

  // ==================== MÉTRICAS DE PRODUCTOS ====================
  
  // Obtener métricas de todos los productos
  getProductMetrics: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/analytics/metricas-productos/?${params}`);
    return response.data;
  },

  // Top productos por criterio
  getTopProducts: async (criterio = 'vistas', limite = 10) => {
    const response = await api.get('/analytics/metricas-productos/top_productos/', {
      params: { criterio, limite }
    });
    return response.data;
  },

  // Alias para compatibilidad con Admin.jsx
  getTopProductos: async (criterio = 'ventas', limite = 5) => {
    const response = await api.get('/analytics/metricas-productos/top_productos/', {
      params: { criterio, limite }
    });
    return response.data;
  },

  // ==================== MÉTRICAS DIARIAS ====================
  
  // Obtener métricas diarias
  getDailyMetrics: async (fechaDesde, fechaHasta) => {
    const params = {};
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    
    const response = await api.get('/analytics/metricas-diarias/', { params });
    return response.data;
  },

  // Alias para compatibilidad con Admin.jsx
  getMetricasDiarias: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/analytics/metricas-diarias/?${params}`);
    return response.data;
  },

  // Resumen de métricas (hoy vs ayer)
  getMetricsSummary: async () => {
    const response = await api.get('/analytics/metricas-diarias/resumen/');
    return response.data;
  },

  // Alias para compatibilidad con Admin.jsx
  getResumenMetricas: async () => {
    const response = await api.get('/analytics/metricas-diarias/resumen/');
    return response.data;
  },

  // ==================== REPORTES ====================
  
  // Embudo de conversión
  getConversionFunnel: async (dias = 30) => {
    const response = await api.get('/analytics/reportes/embudo_conversion/', {
      params: { dias }
    });
    return response.data;
  },

  // Performance de productos
  getProductsPerformance: async (limite = 20) => {
    const response = await api.get('/analytics/reportes/productos_performance/', {
      params: { limite }
    });
    return response.data;
  },

  // Alias para compatibilidad: embudo de conversión
  getEmbudoConversion: async (dias = 30) => {
    return analyticsService.getConversionFunnel(dias);
  },

  // ==================== TRACKING HELPERS ====================
  
  // Track vista de producto
  trackProductView: async (productoId, sessionId) => {
    return analyticsService.createEvent({
      tipo_evento: 'vista_producto',
      producto: productoId,
      session_id: sessionId
    });
  },

  // Track agregar al carrito
  trackAddToCart: async (productoId, sessionId) => {
    return analyticsService.createEvent({
      tipo_evento: 'agregar_carrito',
      producto: productoId,
      session_id: sessionId
    });
  },

  // Track búsqueda
  trackSearch: async (query, sessionId, resultados = 0) => {
    return analyticsService.createEvent({
      tipo_evento: 'busqueda',
      session_id: sessionId,
      metadata: { query, resultados }
    });
  },

  // Track inicio de checkout
  trackCheckoutStart: async (pedidoId, valorMonetario, sessionId) => {
    return analyticsService.createEvent({
      tipo_evento: 'inicio_checkout',
      pedido: pedidoId,
      valor_monetario: valorMonetario,
      session_id: sessionId
    });
  },

  // Track compra completada
  trackPurchase: async (pedidoId, valorMonetario, sessionId) => {
    return analyticsService.createEvent({
      tipo_evento: 'compra_completada',
      pedido: pedidoId,
      valor_monetario: valorMonetario,
      session_id: sessionId
    });
  }
};

export default analyticsService;
