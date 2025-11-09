import api from './api';

const authService = {
  // Login de administrador
  loginAdmin: async (email, password) => {
    try {
      const response = await api.post('/usuario/login/', {  // ⬅️ Cambio aquí
        email,
        password,
      });
      
      const { access, refresh, user } = response.data;
      
      // Guardar tokens y datos de usuario
      localStorage.setItem('authToken', access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.detail || 'Error al iniciar sesión',
      };
    }
  },

  // Login de cliente (usuario normal)
  loginCliente: async (email, password) => {
    try {
      const response = await api.post('/usuario/login/', {  // ⬅️ Cambio aquí
        email,
        password,
      });
      
      const { access, refresh, user } = response.data;
      
      localStorage.setItem('authToken', access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.detail || 'Error al iniciar sesión',
      };
    }
  },

  // Registro de usuario
  register: async (userData) => {
    try {
      const response = await api.post('/usuario/registro/', userData);  // ⬅️ Cambio aquí
      return { success: true, user: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.detail || 'Error al registrarse',
        errors: error.response?.data,
      };
    }
  },

  // Cerrar sesión
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/admin/login';
  },

  // Verificar si el usuario está autenticado
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  // Obtener usuario actual
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Verificar si el usuario es administrador
  isAdmin: () => {
    const user = authService.getCurrentUser();
    return user?.tipo_usuario === 'administrador' || user?.is_staff;
  },

  // Refrescar token
  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/token/refresh/', {  // ⬅️ O '/usuario/token/refresh/'
        refresh: refreshToken,
      });

      const { access } = response.data;
      localStorage.setItem('authToken', access);
      
      return access;
    } catch (error) {
      authService.logout();
      throw error;
    }
  },

  // Obtener perfil de usuario
  getProfile: async () => {
    try {
      const response = await api.get('/usuario/me/');
      const user = response.data;
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      return null;
    }
  },

  // Actualizar perfil
  updateProfile: async (userData) => {
    try {
      const user = authService.getCurrentUser();
      const response = await api.patch(`/usuario/${user.id}/`, userData);
      localStorage.setItem('user', JSON.stringify(response.data));
      return { success: true, user: response.data };
    } catch (error) {
      return {
        success: false,
        message: 'Error al actualizar perfil',
        errors: error.response?.data,
      };
    }
  },

  // Cambiar contraseña
  changePassword: async (oldPassword, newPassword) => {
    try {
      await api.post('/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      return { success: true, message: 'Contraseña actualizada correctamente' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.detail || 'Error al cambiar contraseña',
      };
    }
  },
};

export default authService;