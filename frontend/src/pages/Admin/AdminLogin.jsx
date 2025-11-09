import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Limpiar error al escribir
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validaciones básicas
    if (!formData.email || !formData.password) {
      setError('Por favor completa todos los campos');
      setLoading(false);
      return;
    }

    try {
      const result = await loginAdmin(formData.email, formData.password);
      
      if (result.success) {
        // Login exitoso, redirigir al dashboard
        navigate('/admin/dashboard');
      } else {
        setError(result.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-12 flex-col justify-between">
        <div>
          <Link to="/" className="inline-flex items-center text-white hover:text-indigo-200 transition">
            <i className="fas fa-arrow-left mr-2"></i>
            Volver al sitio
          </Link>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <i className="fas fa-star text-yellow-400 text-2xl"></i>
              <h1 className="text-3xl font-bold">Ambos Norte</h1>
            </div>
            <h2 className="text-4xl font-bold">Panel de Administración</h2>
            <p className="text-indigo-200 text-lg">
              Gestiona tu e-commerce de manera eficiente
            </p>
          </div>
          
          <div className="space-y-4 pt-8">
            <div className="flex items-start gap-3">
              <div className="bg-indigo-500 rounded-lg p-2">
                <i className="fas fa-chart-line text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Analytics en Tiempo Real</h3>
                <p className="text-indigo-200 text-sm">
                  Monitorea tus ventas y métricas clave
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-indigo-500 rounded-lg p-2">
                <i className="fas fa-boxes text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Gestión de Inventario</h3>
                <p className="text-indigo-200 text-sm">
                  Control total de tu stock y productos
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-indigo-500 rounded-lg p-2">
                <i className="fas fa-users text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Gestión de Clientes</h3>
                <p className="text-indigo-200 text-sm">
                  Administra usuarios y pedidos fácilmente
                </p>
              </div>
            </div>
          </div>
        </motion.div>
        
        <div className="text-sm text-indigo-200">
          © 2025 Ambos Norte. Todos los derechos reservados.
        </div>
      </div>

      {/* Panel derecho - Formulario de login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                <i className="fas fa-shield-alt text-indigo-600 text-2xl"></i>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Iniciar Sesión
              </h2>
              <p className="text-gray-600">
                Panel de Administración
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
              >
                <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
                <div className="flex-1">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700"
                >
                  <i className="fas fa-times"></i>
                </button>
              </motion.div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-envelope text-gray-400"></i>
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="admin@ambosnorte.com"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-lock text-gray-400"></i>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Recordarme</span>
                </label>
                <a
                  href="#"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt"></i>
                    Iniciar Sesión
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                ¿No tienes cuenta de administrador?{' '}
                <a
                  href="#"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Contacta al administrador principal
                </a>
              </p>
            </div>

            {/* Link al login de clientes */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Link
                to="/registro"
                className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
              >
                <i className="fas fa-user"></i>
                Iniciar sesión como cliente
              </Link>
            </div>
          </div>

          {/* Demo credentials (remover en producción) */}
          <div className="mt-6 text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-yellow-800 mb-2">
                <i className="fas fa-info-circle mr-1"></i>
                Credenciales de prueba
              </p>
              <p className="text-yellow-700">
                Email: <code className="bg-yellow-100 px-2 py-1 rounded">admin@test.com</code>
              </p>
              <p className="text-yellow-700">
                Pass: <code className="bg-yellow-100 px-2 py-1 rounded">admin123</code>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}