import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: 'fas fa-chart-line',
    },
    {
      name: 'Ventas',
      path: '/admin/ventas',
      icon: 'fas fa-dollar-sign',
    },
    {
      name: 'Inventario',
      path: '/admin/inventario',
      icon: 'fas fa-boxes',
    },
    {
      name: 'Productos',
      path: '/admin/productos',
      icon: 'fas fa-shopping-bag',
    },
    {
      name: 'Pedidos',
      path: '/admin/pedidos',
      icon: 'fas fa-shopping-cart',
    },
    {
      name: 'Usuarios',
      path: '/admin/usuarios',
      icon: 'fas fa-users',
    },
  ];

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
      logout();
    }
  };

  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen flex flex-col">
      {/* Header con info de usuario */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <i className="fas fa-star text-yellow-400 text-xl"></i>
          <h2 className="text-xl font-bold">Ambos Norte</h2>
        </div>
        <p className="text-xs text-gray-400">Panel Admin</p>
        
        {/* Info del usuario */}
        {user && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <i className="fas fa-user"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.first_name || user.username}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <i className={item.icon}></i>
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Footer con acciones */}
      <div className="p-4 border-t border-gray-700 space-y-2">
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 rounded-lg transition w-full"
        >
          <i className="fas fa-arrow-left"></i>
          <span>Volver al Sitio</span>
        </Link>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 hover:bg-red-600 rounded-lg transition w-full text-left"
        >
          <i className="fas fa-sign-out-alt"></i>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}