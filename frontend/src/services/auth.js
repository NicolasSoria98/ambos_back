import api from './api';

const authService = {
  // Login de administrador
  loginAdmin: async (email, password) => {
    try {
      const response = await api.post('/auth/login/', {
        email,
        password
      });

      if (response.data.access) {
        // Guardar tokens y usuario
        localStorage.setItem('authToken', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));

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

  // Login de cliente (usa el mismo endpoint que admin)
  loginCliente: async (email, password) => {
    try {
      const response = await api.post('/auth/login/', {
        email,
        password
      });

      if (response.data.access) {
        localStorage.setItem('authToken', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));

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

  // Registro de nuevo usuario
  register: async (userData) => {
    try {
      const response = await api.post('/auth/registro/', userData);

      if (response.data.access) {
        localStorage.setItem('authToken', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));

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
      
      // Manejar errores específicos de validación
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

  // Obtener perfil del usuario autenticado
  getProfile: async () => {
    try {
      const response = await api.get('/auth/me/');
      
      // Actualizar usuario en localStorage
      localStorage.setItem('user', JSON.stringify(response.data));
      
      return response.data;
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      return null;
    }
  },

  // Actualizar perfil
  updateProfile: async (userData) => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.id) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      const response = await api.patch(`/usuarios/usuarios/${currentUser.id}/`, userData);
      
      // Actualizar usuario en localStorage
      localStorage.setItem('user', JSON.stringify(response.data));

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

  // Refrescar token
  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await api.post('/auth/token/refresh/', {
        refresh: refreshToken
      });

      if (response.data.access) {
        localStorage.setItem('authToken', response.data.access);
        return response.data.access;
      }

      return null;
    } catch (error) {
      console.error('Error al refrescar token:', error);
      authService.logout();
      return null;
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  // Verificar si está autenticado
  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  // Obtener usuario actual
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error al parsear usuario:', error);
        return null;
      }
    }
    return null;
  },

  // Verificar si es administrador
  isAdmin: () => {
    const user = authService.getCurrentUser();
    return user?.tipo_usuario === 'administrador' || user?.is_staff === true;
  },

  // Verificar si es cliente
  isCliente: () => {
    const user = authService.getCurrentUser();
    return user?.tipo_usuario === 'cliente';
  }
};

export default authService;