import api from './api';

const productsService = {
  // Obtener todos los productos
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/producto/?${params}`);
    return response.data;
  },

  // Obtener un producto por ID
  getById: async (id) => {
    const response = await api.get(`/producto/${id}/`);
    return response.data;
  },

  // Buscar productos
  search: async (query) => {
    const response = await api.get(`/producto/buscar/?q=${query}`);
    return response.data;
  },

  // Obtener categorías
  getCategories: async () => {
    const response = await api.get('/categoria/');
    return response.data;
  },

  // Crear producto (admin) - con soporte para FormData
  create: async (productData) => {
    const config = productData instanceof FormData 
      ? { 
          headers: { 
            'Content-Type': 'multipart/form-data' 
          } 
        }
      : {};
    
    const response = await api.post('/producto/', productData, config);
    return response.data;
  },

  // Actualizar producto (admin) - con soporte para FormData
  update: async (id, productData) => {
    const config = productData instanceof FormData 
      ? { 
          headers: { 
            'Content-Type': 'multipart/form-data' 
          } 
        }
      : {};
    
    const response = await api.put(`/producto/${id}/`, productData, config);
    return response.data;
  },

  // Eliminar producto (admin)
  delete: async (id) => {
    const response = await api.delete(`/producto/${id}/`);
    return response.data;
  },

  // Reducir stock
  reduceStock: async (id, cantidad) => {
    const response = await api.post(`/producto/${id}/reducir_stock/`, { cantidad });
    return response.data;
  },

  // Aumentar stock
  increaseStock: async (id, cantidad) => {
    const response = await api.post(`/producto/${id}/aumentar_stock/`, { cantidad });
    return response.data;
  },

  // Toggle destacado
  toggleDestacado: async (id) => {
    const response = await api.post(`/producto/${id}/toggle_destacado/`);
    return response.data;
  },

  // Toggle activo
  toggleActivo: async (id) => {
    const response = await api.post(`/producto/${id}/toggle_activo/`);
    return response.data;
  },

  // Productos con poco stock (para panel admin)
  getLowStockProducts: async (umbral = 10) => {
    const response = await api.get('/producto/', { params: { stock_max: umbral } });
    return response.data;
  }
};

export default productsService;
