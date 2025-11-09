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

  // Cargar usuario al iniciar
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const authenticated = authService.isAuthenticated();
    const currentUser = authService.getCurrentUser();
    
    setIsAuthenticated(authenticated);
    setUser(currentUser);
    setLoading(false);
  };

  // Login de administrador
  const loginAdmin = async (email, password) => {
    const result = await authService.loginAdmin(email, password);
    
    if (result.success) {
      setUser(result.user);
      setIsAuthenticated(true);
      
      // Verificar que sea admin
      if (!authService.isAdmin()) {
        await logout();
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
      // Después de registrarse, hacer login automático
      const loginResult = await loginCliente(userData.email, userData.password);
      return loginResult;
    }
    
    return result;
  };

  // Logout
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Actualizar perfil
  const updateProfile = async (userData) => {
    const result = await authService.updateProfile(userData);
    
    if (result.success) {
      setUser(result.user);
    }
    
    return result;
  };

  // Refrescar datos de usuario
  const refreshUser = async () => {
    const updatedUser = await authService.getProfile();
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    isAdmin: authService.isAdmin(),
    loginAdmin,
    loginCliente,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};