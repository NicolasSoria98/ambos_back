import api from './api';

const usersService = {
  // Obtener todos los usuarios (solo clientes para admin)
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/usuario/?${params}`);
    return response.data;
  },

  // Obtener un usuario por ID
  getById: async (id) => {
    const response = await api.get(`/usuario/${id}/`);
    return response.data;
  },

  // Crear un nuevo usuario (admin)
  create: async (userData) => {
    const response = await api.post('/usuario/', userData);
    return response.data;
  },

  // Actualizar un usuario
  update: async (id, userData) => {
    const response = await api.put(`/usuario/${id}/`, userData);
    return response.data;
  },

  // Actualizar parcialmente un usuario
  partialUpdate: async (id, userData) => {
    const response = await api.patch(`/usuario/${id}/`, userData);
    return response.data;
  },

  // Desactivar usuario (soft delete)
  delete: async (id) => {
    const response = await api.delete(`/usuario/${id}/`);
    return response.data;
  },

  // Activar usuario desactivado
  activar: async (id) => {
    const response = await api.post(`/usuario/${id}/activar/`);
    return response.data;
  },

  // Cambiar tipo de usuario
  cambiarTipo: async (id, nuevoTipo) => {
    const response = await api.post(`/usuario/${id}/cambiar_tipo/`, {
      nuevo_tipo: nuevoTipo
    });
    return response.data;
  },

  // Obtener estadísticas
  getEstadisticas: async () => {
    const response = await api.get('/usuario/estadisticas/');
    return response.data;
  },

  // Obtener direcciones de un usuario
  getDirecciones: async (usuarioId) => {
    const response = await api.get(`/direccion/?usuario=${usuarioId}`);
    return response.data;
  },

  // Tipos de usuario disponibles
  getTipos: () => [
    { value: 'cliente', label: 'Cliente' },
    { value: 'administrador', label: 'Administrador' },
  ]
};

export default usersService;
