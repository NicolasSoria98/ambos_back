import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/auth';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // ✅ FIX: Calcular isAdminArea dinámicamente desde currentPath
  const isAdminArea = currentPath.startsWith('/admin');

  // Calcular isAdmin basado en el user actual
  const isAdmin = user?.tipo_usuario === 'administrador' || user?.is_staff === true;

  // ✅ FIX: Listener para detectar cambios de ruta
  useEffect(() => {
    // Función que actualiza el path actual
    const handleLocationChange = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        setCurrentPath(newPath);
      }
    };

    // Escuchar navegación del navegador (botones adelante/atrás)
    window.addEventListener('popstate', handleLocationChange);
    
    // Escuchar cambios de ruta (para React Router)
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleLocationChange();
    };

    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      handleLocationChange();
    };

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [currentPath]);

  // ✅ FIX: Recargar autenticación cuando cambia currentPath
  useEffect(() => {
    checkAuth();
  }, [currentPath]);

  const checkAuth = async () => {
    const adminArea = currentPath.startsWith('/admin');
    
    if (adminArea) {
      // Área de admin - cargar sesión de admin
      const authenticated = authService.isAdminAuthenticated();
      const currentUser = authService.getAdminUser();
      
      setIsAuthenticated(authenticated);
      setUser(currentUser);
      setLoading(false);

      if (authenticated && !currentUser) {
        try {
          const profile = await authService.getProfile(true);
          if (profile) {
            setUser(profile);
          }
        } catch (error) {
          console.error('Error al cargar perfil de admin:', error);
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    } else {
      // Área de cliente - cargar sesión de cliente
      const authenticated = authService.isClienteAuthenticated();
      const currentUser = authService.getClienteUser();
      
      setIsAuthenticated(authenticated);
      setUser(currentUser);
      setLoading(false);

      if (authenticated && !currentUser) {
        try {
          const profile = await authService.getProfile(false);
          if (profile) {
            setUser(profile);
          }
        } catch (error) {
          console.error('Error al cargar perfil de cliente:', error);
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    }
  };

  // Login de administrador
  const loginAdmin = async (email, password) => {
    const result = await authService.loginAdmin(email, password);
    
    if (result.success) {
      setUser(result.user);
      setIsAuthenticated(true);
      
      // Verificar que sea admin
      if (result.user.tipo_usuario !== 'administrador' && !result.user.is_staff) {
        await logoutAdmin();
        return {
          success: false,
          message: 'No tienes permisos de administrador',
        };
      }
    }
    
    return result;
  };

  // Login de cliente
  const loginCliente = async (email, password) => {
    const result = await authService.loginCliente(email, password);
    
    if (result.success) {
      setUser(result.user);
      setIsAuthenticated(true);
    }
    
    return result;
  };

  // Registro
  const register = async (userData) => {
    const result = await authService.register(userData);
    
    if (result.success) {
      setUser(result.user);
      setIsAuthenticated(true);
    }
    
    return result;
  };

  // Logout de administrador
  const logoutAdmin = () => {
    authService.logoutAdmin();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Logout de cliente
  const logoutCliente = () => {
    authService.logoutCliente();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Logout genérico (usa el apropiado según el área)
  const logout = () => {
    if (isAdminArea) {
      logoutAdmin();
    } else {
      logoutCliente();
    }
  };

  // Actualizar perfil
  const updateProfile = async (userData) => {
    const result = await authService.updateProfile(userData, isAdminArea);
    
    if (result.success) {
      setUser(result.user);
    }
    
    return result;
  };

  // Refrescar datos de usuario
  const refreshUser = async () => {
    const updatedUser = await authService.getProfile(isAdminArea);
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    isAdmin,
    isAdminArea,
    loginAdmin,
    loginCliente,
    register,
    logout,
    logoutAdmin,
    logoutCliente,
    updateProfile,
    refreshUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};