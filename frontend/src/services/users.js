import api from './api';

const usersService = {
  // Obtener todos los usuarios (solo clientes para admin)
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/usuarios/usuarios/?${params}`); // ⬅️ Cambio aquí
    return response.data;
  },

  // Obtener un usuario por ID
  getById: async (id) => {
    const response = await api.get(`/usuarios/usuarios/${id}/`); // ⬅️ Cambio aquí
    return response.data;
  },

  // Crear un nuevo usuario (admin)
  create: async (userData) => {
    const response = await api.post('/usuarios/usuarios/', userData); // ⬅️ Cambio aquí
    return response.data;
  },

  // Actualizar un usuario
  update: async (id, userData) => {
    const response = await api.put(`/usuarios/usuarios/${id}/`, userData); // ⬅️ Cambio aquí
    return response.data;
  },

  // Actualizar parcialmente un usuario
  partialUpdate: async (id, userData) => {
    const response = await api.patch(`/usuarios/usuarios/${id}/`, userData); // ⬅️ Cambio aquí
    return response.data;
  },

  // Desactivar usuario (soft delete)
  delete: async (id) => {
    const response = await api.delete(`/usuarios/usuarios/${id}/`); // ⬅️ Cambio aquí
    return response.data;
  },

  // Activar usuario desactivado
  activar: async (id) => {
    const response = await api.post(`/usuarios/usuarios/${id}/activar/`); // ⬅️ Cambio aquí
    return response.data;
  },

  // Cambiar tipo de usuario
  cambiarTipo: async (id, nuevoTipo) => {
    const response = await api.post(`/usuarios/usuarios/${id}/cambiar_tipo/`, { // ⬅️ Cambio aquí
      nuevo_tipo: nuevoTipo
    });
    return response.data;
  },

  // Obtener estadísticas
  getEstadisticas: async () => {
    const response = await api.get('/usuarios/usuarios/estadisticas/'); // ⬅️ Cambio aquí
    return response.data;
  },

  // Obtener direcciones de un usuario
  getDirecciones: async (usuarioId) => {
    const response = await api.get(`/usuarios/direcciones/?usuario=${usuarioId}`); // ⬅️ Cambio aquí
    return response.data;
  },

  // Crear dirección
  createDireccion: async (direccionData) => {
    const response = await api.post('/usuarios/direcciones/', direccionData);
    return response.data;
  },

  // Actualizar dirección
  updateDireccion: async (id, direccionData) => {
    const response = await api.patch(`/usuarios/direcciones/${id}/`, direccionData);
    return response.data;
  },

  // Eliminar dirección
  deleteDireccion: async (id) => {
    const response = await api.delete(`/usuarios/direcciones/${id}/`);
    return response.data;
  },

  // Tipos de usuario disponibles
  getTipos: () => [
    { value: 'cliente', label: 'Cliente' },
    { value: 'administrador', label: 'Administrador' },
  ]
};

export default usersService;