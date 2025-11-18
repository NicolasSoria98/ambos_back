import axios from 'axios';

// Configuración base de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    // Detectar si es petición de autenticación (login/registro/refresh)
    const isAuthRequest = config.url?.includes('/auth/login') || 
                         config.url?.includes('/auth/registro') ||
                         config.url?.includes('/auth/token/refresh');
    
    // Para peticiones de autenticación NO enviar ningún token
    if (isAuthRequest) {
      return config;
    }
    
    // Detectar área basado en URL y path actual
    const isAdminUrl = config.url?.includes('/admin');
    const isAdminPath = window.location.pathname.startsWith('/admin');
    
    // Obtener tokens disponibles
    const adminToken = localStorage.getItem('admin_authToken');
    const clientToken = localStorage.getItem('client_authToken');
    
    // ✅ FIX CRÍTICO: Seleccionar token correcto SIN fallback
    let token = null;
    
    if (isAdminUrl || isAdminPath) {
      // Área de admin - SOLO usar token de admin
      token = adminToken;
    } else {
      // Área de cliente - SOLO usar token de cliente (SIN fallback)
      token = clientToken;
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // ✅ FIX: Manejar token expirado (401) con refresh automático
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const isAdminArea = window.location.pathname.startsWith('/admin');
      
      if (isAdminArea) {
        // Intentar refrescar token de admin
        const refreshToken = localStorage.getItem('admin_refreshToken');
        
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
              refresh: refreshToken
            });
            
            if (response.data.access) {
              localStorage.setItem('admin_authToken', response.data.access);
              originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
              return api(originalRequest);
            }
          } catch (refreshError) {
            console.error('Error al refrescar token admin:', refreshError);
            // Limpiar sesión de admin
            localStorage.removeItem('admin_authToken');
            localStorage.removeItem('admin_refreshToken');
            localStorage.removeItem('admin_user');
            
            if (!window.location.pathname.includes('/admin/login')) {
              window.location.href = '/admin/login';
            }
            return Promise.reject(refreshError);
          }
        } else {
          // No hay refresh token - limpiar sesión
          localStorage.removeItem('admin_authToken');
          localStorage.removeItem('admin_refreshToken');
          localStorage.removeItem('admin_user');
          
          if (!window.location.pathname.includes('/admin/login')) {
            window.location.href = '/admin/login';
          }
        }
      } else {
        // Intentar refrescar token de cliente
        const refreshToken = localStorage.getItem('client_refreshToken');
        
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
              refresh: refreshToken
            });
            
            if (response.data.access) {
              localStorage.setItem('client_authToken', response.data.access);
              originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
              return api(originalRequest);
            }
          } catch (refreshError) {
            console.error('Error al refrescar token cliente:', refreshError);
            // Limpiar sesión de cliente
            localStorage.removeItem('client_authToken');
            localStorage.removeItem('client_refreshToken');
            localStorage.removeItem('client_user');
            return Promise.reject(refreshError);
          }
        } else {
          // No hay refresh token - limpiar sesión
          localStorage.removeItem('client_authToken');
          localStorage.removeItem('client_refreshToken');
          localStorage.removeItem('client_user');
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;