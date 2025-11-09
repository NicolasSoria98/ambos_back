import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { User, Lock, Package } from "lucide-react";

export default function Perfil() {
  const location = useLocation();
  const [usuario, setUsuario] = useState(null);
  const [seccion, setSeccion] = useState("datos");
  const [pedidos, setPedidos] = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });

  const rawToken = localStorage.getItem("token");
  const token = rawToken && rawToken !== "undefined" && rawToken !== "null" ? rawToken : null;

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
    if (!token) {
      alert("Debes iniciar sesión");
      window.location.href = "/registro";
      return;
    }

    fetch("http://127.0.0.1:8000/api/usuarios/perfil/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          let detail = "Error al obtener el perfil";
          try { const err = await res.json(); detail = err.detail || err.error || JSON.stringify(err); } catch { }
          throw new Error(detail);
        }
        return res.json();
      })
      .then((data) => setUsuario(data))
      .catch(() => {
        alert("Sesión inválida o expirada. Iniciá sesión nuevamente.");
        localStorage.removeItem("token");
        window.location.href = "/registro";
      });

    fetch("http://127.0.0.1:8000/api/pedidos/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const serverOrders = Array.isArray(data) ? data : [];
        let localOrders = [];
        try {
          const rawList = localStorage.getItem("orders_local");
          if (rawList) {
            const arr = JSON.parse(rawList);
            if (Array.isArray(arr)) localOrders = arr;
          } else {
            const rawLast = localStorage.getItem("last_order");
            if (rawLast) {
              const o = JSON.parse(rawLast);
              if (o) localOrders = [o];
            }
          }
        } catch { }

        const normalizedLocal = localOrders.map((o) => ({
          ...o,
          fecha_creacion: o.fecha || o.fecha_creacion || o.created_at || null,
        }));

        const byId = new Map();
        for (const so of serverOrders) byId.set(String(so.id), so);
        for (const lo of normalizedLocal) if (!byId.has(String(lo.id))) byId.set(String(lo.id), lo);
        setPedidos(Array.from(byId.values()));
      })
      .catch(() => console.error("Error cargando pedidos"));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUsuario((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://127.0.0.1:8000/api/usuarios/perfil/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(usuario),
      });

      if (res.ok) {
        alert("Datos actualizados correctamente");
      } else {
        alert("Error al actualizar datos");
      }
    } catch {
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
      alert("Completa todos los campos de contrasena");
      return;
    }
    if (pwd.next !== pwd.confirm) {
      alert("La nueva contrasena y la confirmacion no coinciden");
      return;
    }
    try {
      const res = await fetch("http://127.0.0.1:8000/api/usuarios/perfil/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current_password: pwd.current, new_password: pwd.next }),
      });
      if (res.ok) {
        alert("Contrasena actualizada correctamente");
        setPwd({ current: "", next: "", confirm: "" });
      } else {
        let msg = "No se pudo actualizar la contrasena";
        try {
          const err = await res.json();
          msg = err.detail || err.error || JSON.stringify(err);
        } catch { }
        alert(msg);
      }
    } catch {
      alert("Error de conexion con el servidor");
    }
  };

  if (!usuario)
    return (
      <p className="text-center text-gray-500 mt-20 text-lg">
        Cargando perfil...
      </p>
    );

  const fechaMostrar = (o) => {
    const f = o?.fecha_pedido || o?.fecha_creacion || o?.fecha || o?.created_at;
    try { return f ? new Date(f).toLocaleDateString() : "-"; } catch { return "-"; }
  };

  return (
    <div className="h-full min-h-[calc(100vh-6rem)] md:min-h-[calc(100vh-8rem)] bg-[#F0F6F6] flex flex-col md:flex-row py-10 px-8 md:px-16 md:items-center md:justify-center">
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
        </div>
      </aside>
      <main className="flex-1 max-w-3xl">
        {seccion === "datos" && (
          <>
            <h1 className="text-2xl md:text-4xl font-bold text-[#084B83] mb-6">
              Datos personales
            </h1>
            <form onSubmit={handleGuardar} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Nombre(s)
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={usuario.first_name || ""}
                    onChange={handleChange}
                    placeholder="Ingresá tu nombre"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Apellido
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={usuario.last_name || ""}
                    onChange={handleChange}
                    placeholder="Ingresá tu apellido"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={usuario.telefono || ""}
                    onChange={handleChange}
                    placeholder="Número de teléfono"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={usuario.email || ""}
                    readOnly
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <button type="submit" className="w-full md:max-w-fit uppercase bg-[#084B83] text-white px-8 py-3 rounded-full font-semibold text-sm hover:scale-[1.02] transition-transform duration-200">
                Guardar
              </button>
            </form>
          </>
        )}
        {seccion === "seguridad" && (
          <div className="max-w-3xl">
            <h1 className="text-2xl md:text-4xl font-bold text-[#084B83] mb-6">
              Cambiá tu contraseña
            </h1>
            <form onSubmit={handleCambiarContrasena} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  name="current"
                  value={pwd.current}
                  onChange={handlePwdField}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  placeholder="Ingresá tu contraseña actual"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    name="next"
                    value={pwd.next}
                    onChange={handlePwdField}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    placeholder="Mínimo 8 caracteres"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    name="confirm"
                    value={pwd.confirm}
                    onChange={handlePwdField}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm"
                    placeholder="Repetí la nueva contraseña"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="w-full md:max-w-fit uppercase bg-[#084B83] text-white px-8 py-3 rounded-full font-semibold text-sm hover:scale-[1.02] transition-transform duration-200">
                Cambiar
              </button>
            </form>
          </div>
        )}
        {seccion === "pedidos" && (
          <div className="w-full">
            <h1 className="text-2xl md:text-4xl font-bold text-[#084B83] mb-6">
              Mis pedidos
            </h1>
            <div className="bg-white rounded-2xl shadow-lg overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-6 py-3">Pedido ID</th>
                    <th className="text-left font-semibold px-6 py-3">Fecha</th>
                    <th className="text-left font-semibold px-6 py-3">Estado</th>
                    <th className="text-left font-semibold px-6 py-3">Total pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-gray-500" colSpan={4}>No tenes pedidos aun.</td>
                    </tr>
                  ) : (
                    pedidos.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="px-6 py-4">#{p.id}</td>
                        <td className="px-6 py-4">{fechaMostrar(p)}</td>
                        <td className="px-6 py-4"><span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs">{p.estado || "En proceso"}</span></td>
                        <td className="px-6 py-4">${p.total ?? p.total_pagado ?? 0}</td>
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