import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminSidebar({ isOpen, setIsOpen }) {
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
    {
      name: 'Búsquedas Google',
      path: '/admin/search-insights',
      icon: 'fas fa-search',
    },
  ];

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
      logout();
    }
  };

  const handleLinkClick = () => {
    // Cerrar sidebar en móvil al hacer clic en un enlace
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-gray-800 text-white min-h-screen flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header con info de usuario */}
        <div className="p-4 sm:p-6 border-b border-gray-700">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <i className="fas fa-star text-yellow-400 text-lg sm:text-xl"></i>
              <h2 className="text-lg sm:text-xl font-bold">Ambos Norte</h2>
            </div>
            {/* Botón cerrar en móvil */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          <p className="text-xs text-gray-400">Panel Admin</p>

          {/* Info del usuario */}
          {user && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
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
        <nav className="flex-1 p-3 sm:p-4 overflow-y-auto">
          <ul className="space-y-1 sm:space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition text-sm sm:text-base ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'hover:bg-gray-700'
                    }`}
                  >
                    <i className={`${item.icon} w-5 text-center`}></i>
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer con acciones */}
        <div className="p-3 sm:p-4 border-t border-gray-700 space-y-2">
          <Link
            to="/"
            onClick={handleLinkClick}
            className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-700 rounded-lg transition w-full text-sm sm:text-base"
          >
            <i className="fas fa-arrow-left w-5 text-center"></i>
            <span>Volver al Sitio</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-red-600 rounded-lg transition w-full text-left text-sm sm:text-base"
          >
            <i className="fas fa-sign-out-alt w-5 text-center"></i>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}