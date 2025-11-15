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

  /**
   * NUEVO: Obtener variantes con stock bajo
   * Retorna todas las variantes que tengan stock <= umbral
   * @param {number} umbral - Stock máximo para considerar bajo (default: 10)
   * @returns {Array} Array de variantes con stock bajo
   */
  getVariantesStockBajo: async (umbral = 10) => {
    try {
      // Obtener todas las variantes activas
      const response = await api.get('/catalogo/variante/');
      let variantes = response.data.results || response.data || [];

      console.log('📦 Total variantes obtenidas:', variantes.length);
      console.log('📦 Ejemplo de variante:', variantes[0]);

      // Filtrar variantes con stock <= umbral y activas
      const variantesStockBajo = variantes.filter(variante => {
        return variante.stock <= umbral && variante.activo;
      });

      console.log('⚠️ Variantes con stock bajo:', variantesStockBajo.length);

      // Enriquecer con información del producto, talla y color si no viene completa
      const variantesEnriquecidas = await Promise.all(
        variantesStockBajo.map(async (variante) => {
          try {
            // Enriquecer producto si viene como ID
            if (!variante.producto || typeof variante.producto === 'number') {
              const productoId = variante.producto;
              const productoResponse = await api.get(`/catalogo/producto/${productoId}/`);
              variante.producto = productoResponse.data;
            }

            // Enriquecer talla si viene como ID
            if (typeof variante.talla === 'number' && !variante.talla_nombre) {
              const tallaResponse = await api.get(`/catalogo/talla/${variante.talla}/`);
              variante.talla_nombre = tallaResponse.data.nombre;
              variante.talla_obj = tallaResponse.data;
            }

            // Enriquecer color si viene como ID
            if (typeof variante.color === 'number' && !variante.color_nombre) {
              const colorResponse = await api.get(`/catalogo/color/${variante.color}/`);
              variante.color_nombre = colorResponse.data.nombre;
              variante.color_obj = colorResponse.data;
            }

            console.log('✅ Variante enriquecida:', {
              id: variante.id,
              producto: variante.producto?.nombre,
              talla: variante.talla_nombre,
              color: variante.color_nombre,
              stock: variante.stock
            });

            return variante;
          } catch (error) {
            console.error(`❌ Error enriqueciendo variante ${variante.id}:`, error);
            return variante;
          }
        })
      );

      return variantesEnriquecidas;
    } catch (error) {
      console.error('❌ Error obteniendo variantes con stock bajo:', error);
      return [];
    }
  },
  getAllVariantesEnriquecidas: async () => {
    try {
      // Obtener todas las variantes
      const response = await api.get('/catalogo/variante/');
      let variantes = response.data.results || response.data || [];

      console.log('📦 Total variantes obtenidas:', variantes.length);

      // Enriquecer con información del producto, talla y color
      const variantesEnriquecidas = await Promise.all(
        variantes.map(async (variante) => {
          try {
            // Enriquecer producto si viene como ID
            if (!variante.producto || typeof variante.producto === 'number') {
              const productoId = variante.producto;
              const productoResponse = await api.get(`/catalogo/producto/${productoId}/`);
              variante.producto = productoResponse.data;
            }

            // Enriquecer talla si viene como ID
            if (typeof variante.talla === 'number' && !variante.talla_nombre) {
              const tallaResponse = await api.get(`/catalogo/talla/${variante.talla}/`);
              variante.talla_nombre = tallaResponse.data.nombre;
              variante.talla_obj = tallaResponse.data;
            } else if (variante.talla && variante.talla.nombre) {
              // Si ya viene como objeto
              variante.talla_nombre = variante.talla.nombre;
              variante.talla_obj = variante.talla;
            }

            // Enriquecer color si viene como ID
            if (typeof variante.color === 'number' && !variante.color_nombre) {
              const colorResponse = await api.get(`/catalogo/color/${variante.color}/`);
              variante.color_nombre = colorResponse.data.nombre;
              variante.color_obj = colorResponse.data;
            } else if (variante.color && variante.color.nombre) {
              // Si ya viene como objeto
              variante.color_nombre = variante.color.nombre;
              variante.color_obj = variante.color;
            }

            return variante;
          } catch (error) {
            console.error(`❌ Error enriqueciendo variante ${variante.id}:`, error);
            return variante;
          }
        })
      );

      console.log('✅ Variantes enriquecidas:', variantesEnriquecidas.length);
      return variantesEnriquecidas;
    } catch (error) {
      console.error('❌ Error obteniendo variantes enriquecidas:', error);
      return [];
    }
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

  // Asociar imagen existente a variante
  asociarImagenAVariante: async (varianteId, imagenId) => {
    const response = await api.post(`/catalogo/variante/${varianteId}/asociar_imagen/`, { imagen_id: imagenId });
    return response.data;
  },

  // Desasociar imagen de variante
  desasociarImagenDeVariante: async (varianteId, imagenId) => {
    const response = await api.post(`/catalogo/variante/${varianteId}/desasociar_imagen/`, { imagen_id: imagenId });
    return response.data;
  },

  // ============ IMÁGENES ============
  
  // Obtener imágenes de un producto
  getImagenes: async (productoId, soloGenerales = false) => {
    const params = { producto: productoId };
    if (soloGenerales) {
      params.solo_generales = 'true';
    }
    const response = await api.get('/catalogo/imagen-producto/', { params });
    return response.data;
  },

  // Subir imagen (general o de variante)
  uploadImagen: async (imagenData) => {
    const formData = new FormData();
    
    // IMPORTANTE: Convertir a string si es necesario
    formData.append('producto', String(imagenData.producto));
    formData.append('imagen', imagenData.imagen);
    formData.append('orden', imagenData.orden || 0);
    
    if (imagenData.variante) {
      formData.append('variante', String(imagenData.variante));
    }

    console.log('📤 Subiendo imagen con datos:', {
      producto: imagenData.producto,
      variante: imagenData.variante,
      orden: imagenData.orden,
      imagen: imagenData.imagen.name
    });

    const response = await api.post('/catalogo/imagen-producto/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Eliminar imagen
  deleteImagen: async (imagenId) => {
    const response = await api.delete(`/catalogo/imagen-producto/${imagenId}/`);
    return response.data;
  },

  // Asociar imagen a variante
  asociarImagenVariante: async (imagenId, varianteId) => {
    const response = await api.post(`/catalogo/imagen-producto/${imagenId}/asociar_variante/`, { variante_id: varianteId });
    return response.data;
  },

  // Desasociar imagen de variante
  desasociarImagenVariante: async (imagenId) => {
    const response = await api.post(`/catalogo/imagen-producto/${imagenId}/desasociar_variante/`);
    return response.data;
  },
};

export default productsService;

