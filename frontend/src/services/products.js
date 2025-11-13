import api from './api';

const productsService = {
  // ============ PRODUCTOS ============
  
  // Obtener todos los productos
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/catalogo/producto/?${params}`);
    return response.data;
  },

  // Obtener un producto por ID (con variantes)
  getById: async (id) => {
    const response = await api.get(`/catalogo/producto/${id}/`); 
    return response.data;
  },

  // Buscar productos
  search: async (query) => {
    const response = await api.get(`/catalogo/producto/buscar/?q=${query}`); 
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
    
    const response = await api.post('/catalogo/producto/', productData, config); 
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
    
    const response = await api.patch(`/catalogo/producto/${id}/`, productData, config); 
    return response.data;
  },

  // Eliminar producto (admin) - lo desactiva
  delete: async (id) => {
    const response = await api.delete(`/catalogo/producto/${id}/`); 
    return response.data;
  },

  // Toggle destacado
  toggleDestacado: async (id) => {
    const response = await api.post(`/catalogo/producto/${id}/toggle_destacado/`); 
    return response.data;
  },

  // Toggle activo
  toggleActivo: async (id) => {
    const response = await api.post(`/catalogo/producto/${id}/toggle_activo/`); 
    return response.data;
  },

  // Productos con poco stock (para panel admin)
  getLowStockProducts: async (umbral = 10) => {
    const response = await api.get('/catalogo/producto/', { params: { stock_bajo: umbral } }); 
    return response.data;
  },

  // ============ CATEGORÍAS ============
  
  getCategories: async () => {
    const response = await api.get('/catalogo/categoria/'); 
    return response.data;
  },

  createCategory: async (categoryData) => {
    const response = await api.post('/catalogo/categoria/', categoryData);
    return response.data;
  },

  updateCategory: async (id, categoryData) => {
    const response = await api.patch(`/catalogo/categoria/${id}/`, categoryData);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await api.delete(`/catalogo/categoria/${id}/`);
    return response.data;
  },

  // ============ TALLAS ============
  
  getTallas: async () => {
    const response = await api.get('/catalogo/talla/');
    return response.data;
  },

  createTalla: async (tallaData) => {
    const response = await api.post('/catalogo/talla/', tallaData);
    return response.data;
  },

  updateTalla: async (id, tallaData) => {
    const response = await api.patch(`/catalogo/talla/${id}/`, tallaData);
    return response.data;
  },

  deleteTalla: async (id) => {
    const response = await api.delete(`/catalogo/talla/${id}/`);
    return response.data;
  },

  // ============ COLORES ============
  
  getColores: async () => {
    const response = await api.get('/catalogo/color/');
    return response.data;
  },

  createColor: async (colorData) => {
    const response = await api.post('/catalogo/color/', colorData);
    return response.data;
  },

  updateColor: async (id, colorData) => {
    const response = await api.patch(`/catalogo/color/${id}/`, colorData);
    return response.data;
  },

  deleteColor: async (id) => {
    const response = await api.delete(`/catalogo/color/${id}/`);
    return response.data;
  },

  // ============ VARIANTES ============
  
  // Obtener variantes de un producto
  getVariantes: async (productoId) => {
    const response = await api.get('/catalogo/variante/', {
      params: { producto: productoId }
    });
    return response.data;
  },

  // Crear variante
  createVariante: async (varianteData) => {
    const response = await api.post('/catalogo/variante/', varianteData);
    return response.data;
  },

  // Actualizar variante
  updateVariante: async (id, varianteData) => {
    const response = await api.patch(`/catalogo/variante/${id}/`, varianteData);
    return response.data;
  },

  // Eliminar variante
  deleteVariante: async (id) => {
    const response = await api.delete(`/catalogo/variante/${id}/`);
    return response.data;
  },

  // Reducir stock de variante específica
  reduceVarianteStock: async (varianteId, cantidad) => {
    const response = await api.post(`/catalogo/variante/${varianteId}/reducir_stock/`, { cantidad });
    return response.data;
  },

  // Aumentar stock de variante específica
  increaseVarianteStock: async (varianteId, cantidad) => {
    const response = await api.post(`/catalogo/variante/${varianteId}/aumentar_stock/`, { cantidad });
    return response.data;
  },
};

export default productsService;