import api from './api';

const ordersService = {
  // Obtener todos los pedidos (con filtros opcionales)
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/pedidos/pedido/?${params}`);
    return response.data;
  },

  // Obtener un pedido por ID
  getById: async (id) => {
    const response = await api.get(`/pedidos/pedido/${id}/`); 
    return response.data;
  },

  // Crear un nuevo pedido
  create: async (orderData) => {
    const response = await api.post('/pedidos/pedido/', orderData); 
    return response.data;
  },

  // Actualizar un pedido
  update: async (id, orderData) => {
    const response = await api.put(`/pedidos/pedido/${id}/`, orderData); 
    return response.data;
  },

  // Actualizar parcialmente un pedido
  partialUpdate: async (id, orderData) => {
    const response = await api.patch(`/pedidos/pedido/${id}/`, orderData); 
    return response.data;
  },

  // Eliminar un pedido (soft delete)
  delete: async (id) => {
    const response = await api.delete(`/pedidos/pedido/${id}/`);
    return response.data;
  },

  // Toggle estado activo
  toggleActivo: async (id) => {
    const response = await api.post(`/pedidos/pedido/${id}/toggle_activo/`); 
    return response.data;
  },

  // Cambiar estado de un pedido
  cambiarEstado: async (id, nuevoEstado, comentario = '') => {
    const response = await api.post(`/pedidos/pedido/${id}/cambiar_estado/`, { 
      nuevo_estado: nuevoEstado,
      comentario: comentario
    });
    return response.data;
  },

  // Obtener historial de un pedido
  getHistorial: async (id) => {
    const response = await api.get(`/pedidos/pedido/${id}/historial/`); 
    return response.data;
  },

  // Obtener estadísticas de pedidos
  getEstadisticas: async (fecha = null) => {
    const params = fecha ? `?fecha=${fecha}` : '';
    const response = await api.get(`/pedidos/pedido/estadisticas/${params}`); 
    return response.data;
  },

  // Obtener items de un pedido
  getItems: async (pedidoId) => {
    const response = await api.get(`/pedidos/item-pedido/?pedido=${pedidoId}`); 
    return response.data;
  },

  // Estados disponibles (ACTUALIZADO - sin 'pendiente' y 'pagado')
  getEstados: () => [
    { value: 'en_preparacion', label: 'En Preparación', color: 'yellow' },
    { value: 'enviado', label: 'Enviado', color: 'purple' },
    { value: 'entregado', label: 'Entregado', color: 'green' },
    { value: 'cancelado', label: 'Cancelado', color: 'red' },
  ]
};

export default ordersService;
