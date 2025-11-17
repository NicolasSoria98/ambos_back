import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import authService from "../services/auth";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isRegistro = location.pathname.startsWith("/registro");

  const [usuario, setUsuario] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      // IMPORTANTE: En área de cliente, SOLO verificar autenticación de cliente
      // NO usar authService.isAuthenticated() que verifica admin O cliente
      const isClientAuth = authService.isClienteAuthenticated();
      
      if (isClientAuth) {
        setIsLoggedIn(true);
        try {
          // Especificar explícitamente que es cliente (isAdmin = false)
          const data = await authService.getProfile(false);
          setUsuario(data);
        } catch (error) {
          // Si falla, limpiar sesión de cliente
          console.error('Error al cargar perfil de cliente:', error);
          authService.logoutCliente();
          setUsuario(null);
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
        setUsuario(null);
      }
    };

    loadProfile();
  }, [location.pathname]);

  const handleLogout = () => {
    try {
      // En área de cliente, solo hacer logout de cliente
      authService.logoutCliente();
      setUsuario(null);
      setIsLoggedIn(false);
      setMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const isActive = (path) => location.pathname === path;

  const linkClasses = (path) =>
    `relative px-4 py-1 rounded-full text-sm md:text-base transition-colors duration-200 uppercase ${isActive(path)
      ? "font-bold"
      : "font-medium"
    }`;

  return (
    <nav
      className="fixed top-0 left-0 z-50 w-full transition-colors duration-300 bg-[#F0F6F6]/95 backdrop-blur">
      <div className="mx-4 md:mx-12 px-2 sm:px-4 md:px-16">
        <div className="flex items-center justify-between h-16 md:h-20 text-[#084B83]">
          <Link
            to="/"
            className="flex items-center"
            onClick={() => setMenuOpen(false)}
          >
            <img
              src="https://oh-wear.com/wp-content/uploads/2022/03/Logo-header.png.webp"
              alt="oh!"
              className="h-4 w-auto object-contain"
            />
            <span className="font-bold text-sm md:text-base">
              AMBOS NORTE
            </span>
          </Link>
          <ul className="hidden md:flex items-center gap-4 lg:gap-6">
            <li>
              <Link to="/" className={linkClasses("/")}>
                Inicio
              </Link>
            </li>
            <li>
              <Link to="/catalogo" className={linkClasses("/catalogo")}>
                Productos
              </Link>
            </li>
            <li>
              <Link to="/contacto" className={linkClasses("/contacto")}>
                Contacto
              </Link>
            </li>
            {isLoggedIn && (
              <li>
                <Link to="/carrito" className={linkClasses("/carrito")}>
                  Carrito
                </Link>
              </li>
            )}
          </ul>
          <div className="hidden md:flex items-center gap-4">
            {!isRegistro && (
              <>
                {usuario ? (
                  <>
                    <Link
                      to="/perfil"
                      className="text-sm md:text-base font-semibold"
                    >
                      {usuario.first_name ? usuario.first_name : "Mi perfil"}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="text-sm md:text-base font-semibold text-[#084B83] hover:opacity-80 transition-opacity"
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <Link
                    to="/registro"
                    className="px-6 py-3 rounded-xl bg-[#BBE6E4] text-sm md:text-base font-bold uppercase hover:bg-[#A7DCDC] transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                )}
              </>
            )}
          </div>
          <button
            className="md:hidden inline-flex items-center justify-center rounded-md focus:outline-none"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className="sr-only">Abrir menú</span>
            {menuOpen ? (
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden mt-2 rounded-lg bg-[#F0F6F6]/95 border border-[#BBE6E4] shadow">
            <ul className="flex flex-col gap-3 px-4 py-3 text-sm font-semibold text-[#084B83]">
              <li>
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="block py-1"
                >
                  Inicio
                </Link>
              </li>
              <li>
                <Link
                  to="/catalogo"
                  onClick={() => setMenuOpen(false)}
                  className="block py-1"
                >
                  Productos
                </Link>
              </li>
              <li>
                <Link
                  to="/contacto"
                  onClick={() => setMenuOpen(false)}
                  className="block py-1"
                >
                  Contacto
                </Link>
              </li>
              {isLoggedIn && (
                <li>
                  <Link
                    to="/carrito"
                    onClick={() => setMenuOpen(false)}
                    className="block py-1"
                  >
                    Carrito
                  </Link>
                </li>
              )}
              {!isRegistro && (
                <li className="pt-1 border-t border-[#BBE6E4]/60 mt-1">
                  {usuario ? (
                    <div className="flex flex-col items-start gap-1">
                      <Link
                        to="/perfil"
                        onClick={() => setMenuOpen(false)}
                      >
                        {usuario.first_name ? usuario.first_name : "Mi perfil"}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="text-red-500"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  ) : (
                    <Link
                      to="/registro"
                      onClick={() => setMenuOpen(false)}
                    >
                      Iniciar sesión
                    </Link>
                  )}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}