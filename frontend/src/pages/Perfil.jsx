import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User, Lock, Package } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import authService from "../services/auth";

const getAuthToken = () => {
  const clientToken = authService.getClienteToken();
  if (clientToken) return clientToken;

  const adminToken = authService.getAdminToken();
  if (adminToken) return adminToken;

  return (
    localStorage.getItem("client_authToken") ||
    localStorage.getItem("admin_authToken") ||
    localStorage.getItem("clientAuthToken") ||
    localStorage.getItem("authToken") ||
    null
  );
};

export default function Perfil() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, refreshUser } = useAuth();

  const [seccion, setSeccion] = useState("datos");
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    telefono: "",
    email: "",
  });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    if (!isAuthenticated) {
      alert("Debes iniciar sesión");
      navigate("/registro");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tab = params.get("tab");
      if (tab === "pedidos" || tab === "seguridad" || tab === "datos") {
        setSeccion(tab);
      }
    } catch { }
  }, [location.search]);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        telefono: user.telefono || "",
        email: user.email || "",
      });
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const cargarPedidos = async () => {
      try {
        const token = getAuthToken();
        if (!token) throw new Error("Sin token");
        const response = await fetch(`${import.meta.env.VITE_API_URL}/pedidos/pedido/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const serverOrders = await response.json();
          const ordersArray = Array.isArray(serverOrders) ? serverOrders : [];

          let localOrders = [];
          try {
            const rawList = localStorage.getItem("orders_local");
            if (rawList) {
              const arr = JSON.parse(rawList);
              if (Array.isArray(arr)) localOrders = arr;
            }
          } catch { }

          const byId = new Map();
          for (const so of ordersArray) byId.set(String(so.id), so);
          for (const lo of localOrders) {
            if (!byId.has(String(lo.id))) byId.set(String(lo.id), lo);
          }

          setPedidos(Array.from(byId.values()));
        }
      } catch (error) {
        console.error("Error cargando pedidos:", error);
      }
    };

    if (isAuthenticated) {
      cargarPedidos();
    }
  }, [isAuthenticated]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuardar = async (e) => {
    e.preventDefault();

    try {
      const token = getAuthToken();
      if (!token) {
        alert("Tu sesión expiró. Iniciá nuevamente.");
        logout();
        return;
      }
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/usuarios/usuarios/${user.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            first_name: formData.first_name,
            last_name: formData.last_name,
            telefono: formData.telefono,
          }),
        }
      );

      if (response.ok) {
        alert("Datos actualizados correctamente");
        await refreshUser();
      } else {
        const error = await response.json();
        alert(error.detail || "Error al actualizar datos");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión con el servidor");
    }
  };

  const handlePwdField = (e) => {
    const { name, value } = e.target;
    setPwd((prev) => ({ ...prev, [name]: value }));
  };

  const handleCambiarContrasena = async (e) => {
    e.preventDefault();

    if (!pwd.current || !pwd.next || !pwd.confirm) {
      alert("Completa todos los campos de contraseña");
      return;
    }

    if (pwd.next !== pwd.confirm) {
      alert("La nueva contraseña y la confirmación no coinciden");
      return;
    }

    if (pwd.next.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        alert("Tu sesión expiró. Iniciá nuevamente.");
        logout();
        return;
      }
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/usuarios/usuarios/${user.id}/cambiar_password/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            old_password: pwd.current,
            new_password: pwd.next,
          }),
        }
      );

      if (response.ok) {
        alert("Contraseña actualizada correctamente");
        setPwd({ current: "", next: "", confirm: "" });
      } else {
        const error = await response.json();
        alert(error.detail || error.error || "No se pudo actualizar la contraseña");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión con el servidor");
    }
  };

  const fechaMostrar = (o) => {
    const f = o?.fecha_pedido || o?.fecha_creacion || o?.fecha || o?.created_at;
    try {
      return f ? new Date(f).toLocaleDateString("es-AR") : "-";
    } catch {
      return "-";
    }
  };

  if (loading) {
    return (
      <p className="text-center text-gray-500 mt-20 text-lg">
        Cargando perfil...
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F6F6] flex flex-col md:flex-row py-10 px-8 md:px-16 md:items-center md:justify-center">
      <aside className="md:w-1/6 w-full md:mr-12 mb-8 md:mb-0">
        <div className="bg-white rounded-2xl shadow-lg p-0 flex flex-col">
          <button
            onClick={() => setSeccion("datos")}
            className={`flex items-center gap-3 text-sm md:text-base p-3 rounded-lg transition-all ${seccion === "datos"
              ? "bg-[#084B83] text-white"
              : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            <User size={18} />
            Mi cuenta
          </button>
          <button
            onClick={() => setSeccion("seguridad")}
            className={`flex items-center gap-3 text-sm md:text-base p-3 rounded-lg transition-all ${seccion === "seguridad"
              ? "bg-[#084B83] text-white"
              : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            <Lock size={18} />
            Seguridad
          </button>
          <button
            onClick={() => setSeccion("pedidos")}
            className={`flex items-center gap-3 text-sm md:text-base p-3 rounded-lg transition-all ${seccion === "pedidos"
              ? "bg-[#084B83] text-white"
              : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            <Package size={18} />
            Mis pedidos
          </button>
          <button onClick={() => { logout(); navigate("/registro"); }} className="flex items-center gap-3 text-sm md:text-base p-3 rounded-lg transition-all text-red-600 hover:bg-red-50">
            <i className="fas fa-sign-out-alt"></i>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 max-w-3xl">
        {seccion === "datos" && (
          <>
            <h1 className="text-2xl md:text-4xl font-bold text-[#084B83] mb-4">
              Datos personales
            </h1>
            <form onSubmit={handleGuardar} className="flex flex-col md:gap-6 gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#084B83] mb-1">
                    Nombre(s)
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Ingresá tu nombre"
                    className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#084B83] mb-1">
                    Apellido
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Ingresá tu apellido"
                    className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#084B83] mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="Número de teléfono"
                    className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#084B83] mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    readOnly
                    className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full md:max-w-fit uppercase bg-[#084B83] text-white px-8 py-3 rounded-full font-semibold text-sm hover:scale-[1.02] transition-transform duration-200"
              >
                Guardar
              </button>
            </form>
          </>
        )}
        {seccion === "seguridad" && (
          <div className="max-w-3xl">
            <h1 className="text-2xl md:text-4xl font-bold text-[#084B83] mb-4">
              Cambiá tu contraseña
            </h1>
            <form onSubmit={handleCambiarContrasena} className="flex flex-col space-y-4 md:space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#084B83] mb-1">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  name="current"
                  value={pwd.current}
                  onChange={handlePwdField}
                  className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  placeholder="Ingresá tu contraseña actual"
                  required
                />
              </div>
              <div className="md:grid md:grid-cols-2 gap-4 space-y-4 md:space-y-0">
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-[#084B83] mb-1">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    name="next"
                    value={pwd.next}
                    onChange={handlePwdField}
                    className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-[#084B83] mb-1">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    name="confirm"
                    value={pwd.confirm}
                    onChange={handlePwdField}
                    className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    placeholder="Repetí la nueva contraseña"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full md:max-w-fit uppercase bg-[#084B83] text-white px-8 py-3 rounded-full font-semibold text-sm hover:scale-[1.02] transition-transform duration-200"
              >
                Cambiar
              </button>
            </form>
          </div>
        )}

        {seccion === "pedidos" && (
          <div className="w-full">
            <h1 className="text-2xl md:text-4xl font-bold text-[#084B83] mb-4">
              Mis pedidos
            </h1>
            <div className="bg-white rounded-2xl shadow-lg overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-6 py-3">
                      Pedido ID
                    </th>
                    <th className="text-left font-semibold px-6 py-3">Fecha</th>
                    <th className="text-left font-semibold px-6 py-3">Estado</th>
                    <th className="text-left font-semibold px-6 py-3">
                      Total pagado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-gray-500" colSpan={4}>
                        No tenés pedidos aún.
                      </td>
                    </tr>
                  ) : (
                    pedidos.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-gray-50">
                        <td className="px-6 py-4">#{p.id}</td>
                        <td className="px-6 py-4">{fechaMostrar(p)}</td>
                        <td className="px-6 py-4">
                          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs">
                            {p.estado || "En proceso"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          ${p.total ?? p.total_pagado ?? 0}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}