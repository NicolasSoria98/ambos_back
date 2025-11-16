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

  // Determinar si estamos en área de admin basado en la ruta ACTUAL
  const isAdminArea = window.location.pathname.startsWith('/admin');

  // Calcular isAdmin basado en el user actual
  const isAdmin = user?.tipo_usuario === 'administrador' || user?.is_staff === true;

  // Cargar usuario al iniciar - SOLO UNA VEZ al montar
  useEffect(() => {
    checkAuth();
  }, []); // Sin dependencias para evitar re-renders infinitos

  const checkAuth = async () => {
    const adminArea = window.location.pathname.startsWith('/admin');
    
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
    checkAuth, // Exportar para poder refrescar manualmente si es necesario
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};