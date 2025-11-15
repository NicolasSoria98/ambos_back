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

  // ==================== NUEVOS MÉTODOS PARA DASHBOARD ====================

  /**
   * Obtener ventas basadas en pagos con estado "aprobado"
   * Calcula las ventas sumando los montos de pagos aprobados
   * Filtra por fecha de pago (fecha_pago) o fecha de creación si no existe
   */
  getVentasPorPagosAprobados: async (fechaDesde, fechaHasta) => {
    try {
      // Obtener TODOS los pagos aprobados (sin filtro de fecha en la API)
      const response = await api.get('/pagos/pago/', {
        params: {
          estado_pago: 'aprobado'
        }
      });

      const todosPagos = response.data.results || response.data || [];
      
      // Filtrar manualmente por fecha en el frontend
      const pagosFiltrados = todosPagos.filter(pago => {
        // Usar fecha_pago si existe, sino fecha_creacion
        const fechaPago = pago.fecha_pago || pago.fecha_creacion;
        if (!fechaPago) return false;

        // Extraer solo la fecha (YYYY-MM-DD) sin la hora
        const fechaPagoStr = fechaPago.split('T')[0];
        
        // Comparar fechas
        return fechaPagoStr >= fechaDesde && fechaPagoStr <= fechaHasta;
      });

      // Calcular total de ventas
      const totalVentas = pagosFiltrados.reduce((sum, pago) => {
        return sum + parseFloat(pago.monto || 0);
      }, 0);

      return {
        total: totalVentas,
        cantidad_pagos: pagosFiltrados.length,
        pagos: pagosFiltrados
      };
    } catch (error) {
      console.error('Error obteniendo ventas por pagos aprobados:', error);
      return { total: 0, cantidad_pagos: 0, pagos: [] };
    }
  },

  /**
   * Obtener los 5 productos más vendidos basados en items de pedidos
   */
  getTopProductosVendidos: async (limite = 5) => {
    try {
      // Obtener todos los pedidos
      const pedidosResponse = await api.get('/pedidos/pedido/');
      const pedidos = pedidosResponse.data.results || pedidosResponse.data || [];

      // Crear un mapa para contar productos vendidos
      const productosVendidos = {};

      // Recorrer todos los pedidos y sus items
      pedidos.forEach(pedido => {
        if (pedido.items && Array.isArray(pedido.items)) {
          pedido.items.forEach(item => {
            const productoId = item.producto?.id || item.producto;
            const productoNombre = item.producto?.nombre || item.nombre_producto;
            const cantidad = parseInt(item.cantidad) || 0;
            const precioUnitario = parseFloat(item.precio_unitario) || 0;

            if (productoId) {
              if (!productosVendidos[productoId]) {
                productosVendidos[productoId] = {
                  producto_id: productoId,
                  producto_nombre: productoNombre,
                  ventas: 0,
                  ingresos: 0,
                  producto: item.producto
                };
              }

              productosVendidos[productoId].ventas += cantidad;
              productosVendidos[productoId].ingresos += (cantidad * precioUnitario);
            }
          });
        }
      });

      // Convertir a array y ordenar por cantidad de ventas
      const productosArray = Object.values(productosVendidos)
        .sort((a, b) => b.ventas - a.ventas)
        .slice(0, limite);

      return productosArray;
    } catch (error) {
      console.error('Error obteniendo top productos vendidos:', error);
      return [];
    }
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
