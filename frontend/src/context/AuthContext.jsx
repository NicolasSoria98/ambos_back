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

  // Determinar si estamos en área de admin basado en la ruta
  const isAdminArea = currentPath.startsWith('/admin');

  // Calcular isAdmin basado en el user actual
  const isAdmin = user?.tipo_usuario === 'administrador' || user?.is_staff === true;

  // Escuchar cambios en la URL
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    // Escuchar eventos de navegación
    window.addEventListener('popstate', handleLocationChange);
    
    // También crear un observer para detectar cambios de ruta en SPA
    const observer = new MutationObserver(handleLocationChange);
    observer.observe(document.querySelector('body'), { 
      childList: true, 
      subtree: true 
    });

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      observer.disconnect();
    };
  }, []);

  // Cargar usuario al iniciar o cuando cambia la ruta
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
        const profile = await authService.getProfile(true);
        if (profile) {
          setUser(profile);
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
        const profile = await authService.getProfile(false);
        if (profile) {
          setUser(profile);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};