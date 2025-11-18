import api from './api';

const authService = {
  // ============ FUNCIONES DE ADMINISTRADOR ============
  
  // ============ FUNCIONES DE ADMINISTRADOR ============
  
  loginAdmin: async (email, password) => {
    try {
      // ✅ FIX: Limpiar TODAS las sesiones antes de login
      authService.logoutCliente();
      authService.logoutAdmin();
      
      const response = await api.post('/auth/login/', {
        email,
        password
      });

      if (response.data.access) {
        // Guardar tokens y usuario CON PREFIJO ADMIN
        localStorage.setItem('admin_authToken', response.data.access);
        localStorage.setItem('admin_refreshToken', response.data.refresh);
        localStorage.setItem('admin_user', JSON.stringify(response.data.user));

        return {
          success: true,
          user: response.data.user,
          message: 'Login exitoso'
        };
      }

      return {
        success: false,
        message: 'Error al iniciar sesión'
      };
    } catch (error) {
      console.error('Error en loginAdmin:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Credenciales incorrectas'
      };
    }
  },

  logoutAdmin: () => {
    localStorage.removeItem('admin_authToken');
    localStorage.removeItem('admin_refreshToken');
    localStorage.removeItem('admin_user');
  },

  isAdminAuthenticated: () => {
    const token = localStorage.getItem('admin_authToken');
    const user = localStorage.getItem('admin_user');
    return !!(token && user);
  },

  getAdminUser: () => {
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error al parsear usuario admin:', error);
        return null;
      }
    }
    return null;
  },

  getAdminToken: () => {
    return localStorage.getItem('admin_authToken');
  },

  refreshAdminToken: async () => {
    try {
      const refreshToken = localStorage.getItem('admin_refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await api.post('/auth/token/refresh/', {
        refresh: refreshToken
      });

      if (response.data.access) {
        localStorage.setItem('admin_authToken', response.data.access);
        return response.data.access;
      }

      return null;
    } catch (error) {
      console.error('Error al refrescar token admin:', error);
      authService.logoutAdmin();
      return null;
    }
  },

  // ============ FUNCIONES DE CLIENTE ============
  
  loginCliente: async (email, password) => {
    try {
      // ✅ FIX: Limpiar TODAS las sesiones antes de login
      authService.logoutAdmin();
      authService.logoutCliente();
      
      const response = await api.post('/auth/login/', {
        email,
        password
      });

      if (response.data.access) {
        // Guardar tokens y usuario CON PREFIJO CLIENT
        localStorage.setItem('client_authToken', response.data.access);
        localStorage.setItem('client_refreshToken', response.data.refresh);
        localStorage.setItem('client_user', JSON.stringify(response.data.user));

        return {
          success: true,
          user: response.data.user,
          message: 'Login exitoso'
        };
      }

      return {
        success: false,
        message: 'Error al iniciar sesión'
      };
    } catch (error) {
      console.error('Error en loginCliente:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Credenciales incorrectas'
      };
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/registro/', userData);

      if (response.data.access) {
        // Guardar como CLIENTE
        localStorage.setItem('client_authToken', response.data.access);
        localStorage.setItem('client_refreshToken', response.data.refresh);
        localStorage.setItem('client_user', JSON.stringify(response.data.user));

        return {
          success: true,
          user: response.data.user,
          message: response.data.message || 'Registro exitoso'
        };
      }

      return {
        success: false,
        message: 'Error al registrar usuario'
      };
    } catch (error) {
      console.error('Error en register:', error);
      
      const errors = error.response?.data;
      let message = 'Error al registrar usuario';
      
      if (errors) {
        if (errors.email) message = 'El email ya está registrado';
        else if (errors.username) message = 'El nombre de usuario ya existe';
        else if (errors.password) message = errors.password[0];
        else if (typeof errors === 'object') {
          message = Object.values(errors).flat().join('. ');
        }
      }

      return {
        success: false,
        message
      };
    }
  },

  logoutCliente: () => {
    localStorage.removeItem('client_authToken');
    localStorage.removeItem('client_refreshToken');
    localStorage.removeItem('client_user');
  },

  isClienteAuthenticated: () => {
    const token = localStorage.getItem('client_authToken');
    const user = localStorage.getItem('client_user');
    return !!(token && user);
  },

  getClienteUser: () => {
    const userStr = localStorage.getItem('client_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error al parsear usuario cliente:', error);
        return null;
      }
    }
    return null;
  },

  getClienteToken: () => {
    return localStorage.getItem('client_authToken');
  },

  refreshClienteToken: async () => {
    try {
      const refreshToken = localStorage.getItem('client_refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await api.post('/auth/token/refresh/', {
        refresh: refreshToken
      });

      if (response.data.access) {
        localStorage.setItem('client_authToken', response.data.access);
        return response.data.access;
      }

      return null;
    } catch (error) {
      console.error('Error al refrescar token cliente:', error);
      authService.logoutCliente();
      return null;
    }
  },

  // ============ FUNCIONES GENÉRICAS (para compatibilidad) ============
  
  // Obtener perfil del usuario autenticado (detecta automáticamente si es admin o cliente)
  getProfile: async (isAdmin = false) => {
    try {
      const response = await api.get('/auth/me/');
      
      // Actualizar usuario en localStorage según el tipo
      if (isAdmin) {
        localStorage.setItem('admin_user', JSON.stringify(response.data));
      } else {
        localStorage.setItem('client_user', JSON.stringify(response.data));
      }
      
      return response.data;
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      return null;
    }
  },

  // Actualizar perfil
  updateProfile: async (userData, isAdmin = false) => {
    try {
      const currentUser = isAdmin ? authService.getAdminUser() : authService.getClienteUser();
      
      if (!currentUser?.id) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      const response = await api.patch(`/usuarios/usuarios/${currentUser.id}/`, userData);
      
      // Actualizar usuario en localStorage según el tipo
      if (isAdmin) {
        localStorage.setItem('admin_user', JSON.stringify(response.data));
      } else {
        localStorage.setItem('client_user', JSON.stringify(response.data));
      }

      return {
        success: true,
        user: response.data,
        message: 'Perfil actualizado exitosamente'
      };
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Error al actualizar perfil'
      };
    }
  },

  // DEPRECATED - Usar logoutAdmin o logoutCliente
  logout: () => {
    authService.logoutAdmin();
    authService.logoutCliente();
  },

  // DEPRECATED - Usar isAdminAuthenticated o isClienteAuthenticated
  isAuthenticated: () => {
    return authService.isAdminAuthenticated() || authService.isClienteAuthenticated();
  },

  // DEPRECATED - Usar getAdminUser o getClienteUser
  getCurrentUser: () => {
    return authService.getAdminUser() || authService.getClienteUser();
  },

  // Verificar si es administrador
  isAdmin: () => {
    const user = authService.getAdminUser();
    return user?.tipo_usuario === 'administrador' || user?.is_staff === true;
  },

  // Verificar si es cliente
  isCliente: () => {
    const user = authService.getClienteUser();
    return user?.tipo_usuario === 'cliente';
  }
};

export default authService;