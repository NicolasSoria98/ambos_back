
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import paymentsService from "../services/payments";
import authService from "../services/auth";

const getAuthToken = () => {
  // Intentar obtener token de cliente primero
  const clientToken = authService.getClienteToken();
  if (clientToken) return clientToken;
  
  // Si no hay token de cliente, intentar con admin
  const adminToken = authService.getAdminToken();
  if (adminToken) return adminToken;
  
  // Fallback: buscar en localStorage con nombres alternativos
  return (
    localStorage.getItem("client_authToken") ||
    localStorage.getItem("admin_authToken") ||
    localStorage.getItem("clientAuthToken") ||
    localStorage.getItem("authToken") ||
    null
  );
};

export default function EnvioPago() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    direccion: "",
    ciudad: "",
    telefono: "",
    email: "",
    notas: "",
  });
  const [metodoEnvio, setMetodoEnvio] = useState("envio");
  const [metodoPago, setMetodoPago] = useState("mercadopago");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cart");
      const cart = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cart) || cart.length === 0) {
        alert("Tu carrito está vacío");
        navigate("/carrito");
        return;
      }
      setItems(cart);
    } catch {
      navigate("/carrito");
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    const mergeUserData = (data) => {
      if (!data || !active) return;
      const perfil = data.perfil || data.profile || {};
      setForm((prev) => ({
        ...prev,
        nombre:
          prev.nombre ||
          data.first_name ||
          data.nombre ||
          perfil.nombre ||
          data.username ||
          "",
        apellido:
          prev.apellido ||
          data.last_name ||
          data.apellido ||
          perfil.apellido ||
          "",
        email: prev.email || data.email || perfil.email || "",
        telefono: prev.telefono || data.telefono || perfil.telefono || "",
        direccion: prev.direccion || data.direccion || perfil.direccion || "",
        ciudad: prev.ciudad || data.ciudad || perfil.ciudad || "",
      }));
    };

    const storedUser =
      (typeof authService.getClienteUser === "function" && authService.getClienteUser()) || null;
    if (storedUser) {
      mergeUserData(storedUser);
    }

    (async () => {
      try {
        if (typeof authService.getProfile === "function") {
          const profile = await authService.getProfile(false);
          mergeUserData(profile);
          return;
        }
      } catch (error) {
        console.warn("No se pudo obtener perfil (authService):", error);
      }

      // ✅ FIX: Usar getAuthToken()
      const token = getAuthToken();
      if (!token) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        mergeUserData(data);
      } catch (error) {
        console.warn("No se pudo obtener perfil (fetch):", error);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const total = useMemo(
    () => items.reduce((s, it) => s + (it.precio || 0) * (it.cantidad || 1), 0),
    [items]
  );
  const costoEnvio = useMemo(
    () => (metodoEnvio === "envio" ? 2000 : 0),
    [metodoEnvio]
  );
  const totalConEnvio = total + costoEnvio;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validar = () => {
    if (!form.nombre || !form.apellido || !form.telefono || !form.email) {
      setError("Completá todos los datos requeridos");
      return false;
    }
    if (metodoEnvio === "envio") {
      if (!form.direccion || !form.ciudad) {
        setError("Completá la dirección de envío");
        return false;
      }
    }
    setError(null);
    return true;
  };

  const finalizarConEfectivo = async () => {
    if (!validar()) return;

    try {
      setLoading(true);
      // ✅ FIX: Usar getAuthToken()
      const token = getAuthToken();

      const pedido = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        items,
        envio: {
          metodo: metodoEnvio,
          datos: { ...form },
          costo: costoEnvio,
        },
        pago: {
          metodo: "efectivo",
          estado: "pendiente",
        },
        total: totalConEnvio,
      };

      let storedOrder = pedido;

      try {
        const payload = {
          items: (items || []).map((it) => ({
            producto_id: it.id,
            cantidad: it.cantidad || 1,
            precio_unitario: it.precio || 0,
          })),
          envio: {
            metodo: metodoEnvio,
            costo: costoEnvio,
            direccion: form.direccion || null,
            ciudad: form.ciudad || null,
          },
          contacto: {
            nombre: form.nombre,
            apellido: form.apellido,
            telefono: form.telefono,
            email: form.email,
          },
          notas: form.notas || "",
          total: totalConEnvio,
        };

        if (!token) {
          alert("Inicia sesión para finalizar la compra");
          setLoading(false);
          return;
        }

        const res = await fetch(`${import.meta.env.VITE_API_URL}/pedidos/pedido/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const created = await res.json();
          storedOrder = created || storedOrder;
        } else {
          let msg = "No se pudo registrar el pedido";
          try { 
            const err = await res.json(); 
            msg = err.detail || JSON.stringify(err); 
          } catch { 
            throw new Error("Error al procesar respuesta del servidor");
          }
          alert(msg);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error:", err);
        alert("Error al procesar el pedido");
        setLoading(false);
        return;
      }

      localStorage.setItem("last_order", JSON.stringify(storedOrder));
      try {
        const rawList = localStorage.getItem("orders_local");
        const list = rawList ? JSON.parse(rawList) : [];
        const next = [storedOrder, ...Array.isArray(list) ? list : []];
        localStorage.setItem("orders_local", JSON.stringify(next));
      } catch { 
        console.error("Error al guardar orden local");
      }
      
      localStorage.removeItem("cart");
      navigate("/compra-exitosa");
    } catch (err) {
      console.error("Error:", err);
      alert("No se pudo finalizar la compra");
    } finally {
      setLoading(false);
    }
  };

  const finalizarConMercadoPago = async () => {
    if (!validar()) return;

    try {
      setLoading(true);
      setError(null);

      // ✅ FIX: Usar getAuthToken()
      const token = getAuthToken();

      if (!token) {
        alert("Inicia sesión para finalizar la compra");
        setLoading(false);
        return;
      }

      // 1. Primero crear el pedido en el backend
      const payload = {
        items: (items || []).map((it) => ({
          producto_id: it.id,
          cantidad: it.cantidad || 1,
          precio_unitario: it.precio || 0,
        })),
        envio: {
          metodo: metodoEnvio,
          costo: costoEnvio,
          direccion: form.direccion || null,
          ciudad: form.ciudad || null,
        },
        contacto: {
          nombre: form.nombre,
          apellido: form.apellido,
          telefono: form.telefono,
          email: form.email,
        },
        notas: form.notas || "",
        total: totalConEnvio,
      };

      console.log("📦 Creando pedido...", payload);

      const resPedido = await fetch(`${import.meta.env.VITE_API_URL}/pedidos/pedido/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resPedido.ok) {
        let msg = "No se pudo registrar el pedido";
        try {
          const err = await resPedido.json();
          msg = err.detail || JSON.stringify(err);
        } catch { 
          throw new Error("Error al procesar respuesta del servidor");
        }
        throw new Error(msg);
      }

      const pedido = await resPedido.json();
      console.log("✅ Pedido creado:", pedido);

      // 2. Crear preferencia de pago en MercadoPago
      const preferenceData = {
        pedido_id: pedido.id,
        items: items.map((it) => ({
          title: `${it.nombre}`,
          quantity: it.cantidad || 1,
          unit_price: it.precio || 0,
        })),
        payer: {
          name: form.nombre,
          surname: form.apellido,
          email: form.email,
          phone: form.telefono,
        },
        frontend_url: import.meta.env.DEV 
                ? "http://127.0.0.1:5173"
                : window.location.origin,
      };

      console.log("💳 Creando preferencia de pago...", preferenceData);

      const result = await paymentsService.crearPreferencia(preferenceData);

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log("✅ Preferencia creada:", result.data);

      // 3. Guardar info del pedido en localStorage
      localStorage.setItem("last_order", JSON.stringify(pedido));
      localStorage.setItem("last_preference_id", result.data.preference_id);

      // 4. Limpiar carrito
      localStorage.removeItem("cart");

      // 5. Redirigir a MercadoPago
      const checkoutUrl = result.data.init_point || result.data.sandbox_init_point;

      if (!checkoutUrl) {
        throw new Error("No se recibió URL de pago");
      }

      console.log("🚀 Redirigiendo a MercadoPago:", checkoutUrl);

      // Redirigir al usuario a MercadoPago
      window.location.href = checkoutUrl;

    } catch (err) {
      console.error("❌ Error al procesar pago:", err);
      setError(err.message || "Error al procesar el pago");
      setLoading(false);
    }
  };

  const handleFinalizarCompra = () => {
    if (metodoPago === "efectivo") {
      finalizarConEfectivo();
    } else if (metodoPago === "mercadopago") {
      finalizarConMercadoPago();
    }
  };

  return (
    <section className="h-full min-h-[calc(100vh-6rem)] md:min-h-[calc(100vh-8rem)] bg-[#F0F6F6] px-8 md:px-96 py-8 md:flex md:flex-col md:justify-center">
      <h1 className="text-2xl md:text-4xl font-bold text-[#084B83] mb-4 mt-12">
        Checkout
      </h1>

      {/* Mostrar errores */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="md:grid md:grid-cols-3 md:gap-12">
        <div className="md:col-span-2">
          {/* Método de envío */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm bg-white rounded-lg p-4 py-3 border border-gray-200">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="metodoEnvio"
                value="envio"
                checked={metodoEnvio === "envio"}
                onChange={() => setMetodoEnvio("envio")}
              />
              Envío a domicilio (+$2.000)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="metodoEnvio"
                value="retiro"
                checked={metodoEnvio === "retiro"}
                onChange={() => setMetodoEnvio("retiro")}
              />
              Retiro en local (Sin costo)
            </label>
          </div>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-[#084B83] mb-1">
                  Nombre(s) *
                </label>
                <input
                  name="nombre"
                  placeholder="Ingresá tu nombre"
                  value={form.nombre}
                  onChange={onChange}
                  type="text"
                  className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#084B83]"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-[#084B83] mb-1">
                  Apellido *
                </label>
                <input
                  name="apellido"
                  placeholder="Ingresá tu apellido"
                  value={form.apellido}
                  onChange={onChange}
                  type="text"
                  className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#084B83]"
                  required
                />
              </div>
            </div>
            {metodoEnvio === "envio" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-[#084B83] mb-1">
                    Ciudad *{" "}
                    <span className="text-xs font-light text-gray-500">
                      (Sólo Resistencia y Corrientes)
                    </span>
                  </label>
                  <select
                    name="ciudad"
                    value={form.ciudad}
                    onChange={onChange}
                    className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#084B83]"
                    required
                  >
                    <option value="">Seleccionar ciudad</option>
                    <option value="Resistencia">Resistencia</option>
                    <option value="Corrientes">Corrientes</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-[#084B83] mb-1">
                    Dirección *
                  </label>
                  <input
                    name="direccion"
                    placeholder="¿A dónde te lo enviamos?"
                    value={form.direccion}
                    onChange={onChange}
                    type="text"
                    className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#084B83]"
                    required
                  />
                </div>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-[#084B83] mb-1">
                  Teléfono *
                </label>
                <input
                  name="telefono"
                  placeholder="Ingresá tu número telefónico"
                  value={form.telefono}
                  onChange={onChange}
                  type="text"
                  className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#084B83]"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-[#084B83] mb-1">
                  Correo electrónico *
                </label>
                <input
                  name="email"
                  placeholder="Ingresá tu e-mail"
                  value={form.email}
                  onChange={onChange}
                  type="email"
                  className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#084B83]"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-[#084B83] mb-1">
                Notas
              </label>
              <input
                placeholder="(Opcional)"
                name="notas"
                value={form.notas}
                onChange={onChange}
                type="text"
                className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#084B83]"
              />
            </div>
          </form>
        </div>

        <aside className="md:col-span-1 md:flex md:flex-col md:justify-center mb-8 md:mb-0">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 mt-8 md:mt-0 text-[#084B83]">
            Resumen del pedido
          </h2>
          <div className="border rounded-lg p-4 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-auto whitespace-nowrap md:whitespace-normal">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left pb-2">Producto</th>
                    <th className="text-right pb-2">Cant.</th>
                    <th className="text-right pb-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={`${it.id}-${it.variante_id || ""}`} className="border-t">
                      <td className="py-2 max-w-[10rem]">
                        <div className="truncate font-medium">{it.nombre}</div>
                        {(it.color || it.talla) && (
                          <div className="text-xs text-gray-500 flex flex-col">
                            {it.color ? <span>Color: {it.color}</span> : null}
                            {it.talla ? <span>Talle: {it.talla}</span> : null}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-right">{it.cantidad || 1}</td>
                      <td className="py-2 text-right">
                        ${Number((it.precio || 0) * (it.cantidad || 1)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td className="pt-3 text-gray-600">Productos</td>
                    <td></td>
                    <td className="pt-3 text-right font-semibold">
                      ${Number(total).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="pt-1 text-gray-600">Envío</td>
                    <td></td>
                    <td className="pt-1 text-right font-semibold">
                      ${Number(costoEnvio).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="pt-2 font-semibold">Total</td>
                    <td></td>
                    <td className="pt-2 text-right text-lg font-bold">
                      ${Number(totalConEnvio).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className="mb-4 bg-white rounded-lg p-4 border border-gray-200 mt-4">
            <h3 className="font-semibold text-[#084B83] mb-3">Método de pago</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="metodoPago"
                  value="mercadopago"
                  checked={metodoPago === "mercadopago"}
                  onChange={() => setMetodoPago("mercadopago")}
                  className="w-4 h-4"
                />
                <div className="flex items-center gap-2">
                  <img
                    src="https://logowik.com/content/uploads/images/mercado-pago3162.logowik.com.webp"
                    alt="MercadoPago"
                    className="h-6"
                  />
                  <div>
                    <p className="font-medium">Mercado Pago</p>
                  </div>
                </div>
              </label>
            </div>
          </div>
          <button
            onClick={handleFinalizarCompra}
            disabled={loading}
            className={`w-full uppercase bg-[#084B83] text-white px-8 py-3 rounded-full font-semibold text-sm hover:scale-[1.02] transition-transform duration-200 ${loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            {loading ? "Procesando..." : "Finalizar compra"}
          </button>
        </aside>
      </div>
    </section>
  );
}