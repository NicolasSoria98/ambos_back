import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import authService from "../services/auth";

export default function Navbar() {
  const location = useLocation();
  const isRegistro = location.pathname.startsWith("/registro");

  const [usuario, setUsuario] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (authService.isAuthenticated()) {
      authService
        .getProfile()
        .then((data) => setUsuario(data))
        .catch(() => setUsuario({ nombre: "Usuario" }));
    }
  }, []);

  const handleLogout = () => {
    try {
      authService.logout();
      setUsuario(null);
      setMenuOpen(false);
      navigate("/");
    } catch (_) {
      // noop
    }
  };

  return (
    <nav className="fixed top-0 left-0 z-50 w-full bg-[#BBE6E4]">
      <div className="mx-4 md:mx-12 px-2 sm:px-4 md:px-16">
        <div className="text-[#084B83] flex h-12 md:h-16 items-center justify-between">
          <Link to="/" className="text-sm md:text-lg font-bold rounded-xl bg-white py-1 px-4" onClick={() => setMenuOpen(false)}>
            <span>★ AMBOS NORTE</span>
          </Link>
          <ul className="hidden md:flex items-center gap-4 md:gap-8 text-sm md:text-base">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/catalogo">Productos</Link>
            </li>
            <li>
              <Link to="/contacto">Contacto</Link>
            </li>
            <li>
              <Link to="/carrito">Carrito</Link>
            </li>
            {!isRegistro && (
              <>
                {usuario ? (
                  <Link to="/perfil" className="hidden md:inline-flex items-center text-sm md:text-base font-semibold">
                    {usuario.first_name ? usuario.first_name : "Mi perfil"}
                  </Link>
                ) : (
                  <Link to="/registro" className="hidden md:inline-flex items-center text-sm md:text-base font-semibold">
                    Iniciar sesión
                  </Link>
                )}
              </>
            )}
            {usuario && (
              <li>
                <button onClick={handleLogout} className="hidden md:inline-flex items-center text-sm md:text-base font-semibold text-[#084B83]">
                  Cerrar sesión
                </button>
              </li>
            )}
          </ul>
          <button
            className="md:hidden text-[#084B83] text-2xl p-2"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
        <div className={`md:hidden ${menuOpen ? "block" : "hidden"} pb-4`}>
          <ul className="flex flex-col gap-3 text-[#084B83] text-base">
            <li>
              <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
            </li>
            <li>
              <Link to="/catalogo" onClick={() => setMenuOpen(false)}>Productos</Link>
            </li>
            <li>
              <Link to="/contacto" onClick={() => setMenuOpen(false)}>Contacto</Link>
            </li>
            <li>
              <Link to="/carrito" onClick={() => setMenuOpen(false)}>Carrito</Link>
            </li>
            {!isRegistro && (
              <li>
                {usuario ? (
                  <div className="flex flex-col items-start">
                    <Link to="/perfil" onClick={() => setMenuOpen(false)} className="font-semibold">
                      Mi perfil
                    </Link>
                    <button onClick={handleLogout} className="font-semibold text-red-500">
                      Cerrar sesión
                    </button>
                  </div>
                ) : (
                  <Link to="/registro" onClick={() => setMenuOpen(false)} className="font-semibold">
                    Iniciar sesión
                  </Link>
                )}
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}