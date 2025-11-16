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
    // Detectar si la petición es para área de admin basado en la URL y ruta actual
    const isAdminUrl = config.url?.includes('/admin');
    const isAdminPath = window.location.pathname.startsWith('/admin');
    
    // Obtener tokens disponibles
    const adminToken = localStorage.getItem('admin_authToken');
    const clientToken = localStorage.getItem('client_authToken');
    
    // ✅ FIX: Lógica mejorada para seleccionar el token correcto
    let token = null;
    
    if (isAdminUrl || isAdminPath) {
      // Área de admin - usar token de admin si existe
      token = adminToken;
    } else {
      // Área de cliente - priorizar token de cliente, pero permitir admin si no hay cliente
      token = clientToken || adminToken;
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
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido - detectar área y limpiar sesión apropiada
      const isAdminArea = window.location.pathname.startsWith('/admin');
      
      if (isAdminArea) {
        // Limpiar sesión de admin
        localStorage.removeItem('admin_authToken');
        localStorage.removeItem('admin_refreshToken');
        localStorage.removeItem('admin_user');
        
        // Solo redirigir si NO estamos ya en la página de login
        if (!window.location.pathname.includes('/admin/login')) {
          window.location.href = '/admin/login';
        }
      } else {
        // Limpiar sesión de cliente
        localStorage.removeItem('client_authToken');
        localStorage.removeItem('client_refreshToken');
        localStorage.removeItem('client_user');
        
        // NO redirigir automáticamente para evitar loops
        // El componente que reciba el error 401 manejará la redirección
      }
    }
    return Promise.reject(error);
  }
);

export default api;
