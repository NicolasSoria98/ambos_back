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
    // Detectar si la petición es para área de admin
    const isAdminRequest = config.url?.includes('/admin') || 
                          window.location.pathname.startsWith('/admin');
    
    // Obtener el token apropiado según el área
    const token = isAdminRequest 
      ? localStorage.getItem('admin_authToken')
      : localStorage.getItem('client_authToken');
    
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
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido - detectar área y limpiar sesión apropiada
      const isAdminArea = window.location.pathname.startsWith('/admin');
      
      if (isAdminArea) {
        localStorage.removeItem('admin_authToken');
        localStorage.removeItem('admin_refreshToken');
        localStorage.removeItem('admin_user');
        window.location.href = '/admin/login';
      } else {
        localStorage.removeItem('client_authToken');
        localStorage.removeItem('client_refreshToken');
        localStorage.removeItem('client_user');
        window.location.href = '/registro';
      }
    }
    return Promise.reject(error);
  }
);

export default api;