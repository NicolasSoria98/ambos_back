import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
    const rawToken = localStorage.getItem("authToken");
    const token = rawToken && rawToken !== "undefined" && rawToken !== "null" ? rawToken : null;
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          nombre: prev.nombre || data.first_name || "",
          apellido: prev.apellido || data.last_name || "",
          email: prev.email || data.email || "",
          telefono: prev.telefono || data.telefono || "",
        }));
      } catch { }
    })();
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
    if (!form.nombre || !form.apellido || !form.telefono) return false;
    if (metodoEnvio === "envio") {
      if (!form.direccion || !form.ciudad) return false;
    }
    return true;
  };

  const finalizarCompra = async () => {
    if (!validar()) {
      alert("Completá los datos requeridos");
      return;
    }
    try {
      const rawToken = localStorage.getItem("authToken");
      const token = rawToken && rawToken !== "undefined" && rawToken !== "null" ? rawToken : null;
      const metodoPago = "efectivo";
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
          metodo: metodoPago,
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
          alert("Inicia sesion para finalizar la compra");
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
          try { const err = await res.json(); msg = err.detail || JSON.stringify(err); } catch { }
          alert(msg);
          return;
        }
      } catch { }
      localStorage.setItem("last_order", JSON.stringify(storedOrder));
      try {
        const rawList = localStorage.getItem("orders_local");
        const list = rawList ? JSON.parse(rawList) : [];
        const next = [storedOrder, ...Array.isArray(list) ? list : []];
        localStorage.setItem("orders_local", JSON.stringify(next));
      } catch { }
      localStorage.removeItem("cart");
      navigate("/compra-exitosa");
    } catch {
      alert("No se pudo finalizar la compra");
    }
  };

  return (
    <section className="h-full min-h-[calc(100vh-6rem)] md:min-h-[calc(100vh-8rem)] bg-[#F0F6F6] px-8 md:px-96 py-8 md:flex md:flex-col md:justify-center">
      <h1 className="text-2xl md:text-4xl font-bold text-[#084B83] mb-4">
        Checkout
      </h1>
      <div className="md:grid md:grid-cols-3 md:gap-12">
        <div className="md:col-span-2">
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
          <form className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-[#084B83] mb-1">
                  Nombre(s)
                </label>
                <input
                  name="nombre"
                  placeholder="Ingresá tu nombre"
                  value={form.nombre}
                  onChange={onChange}
                  type="text"
                  className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-[#084B83] mb-1">
                  Apellido
                </label>
                <input
                  name="apellido"
                  placeholder="Ingresá tu apellido"
                  value={form.apellido}
                  onChange={onChange}
                  type="text"
                  className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  required
                />
              </div>
            </div>
            {metodoEnvio === "envio" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-[#084B83] mb-1">
                    Ciudad{" "}
                    <span className="text-xs font-light text-gray-500">
                      (Sólo Resistencia y Corrientes)
                    </span>
                  </label>
                  <select
                    name="ciudad"
                    value={form.ciudad}
                    onChange={onChange}
                    className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    required
                  >
                    <option value="">Seleccionar ciudad</option>
                    <option value="Resistencia">Resistencia</option>
                    <option value="Corrientes">Corrientes</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-[#084B83] mb-1">
                    Dirección
                  </label>
                  <input
                    name="direccion"
                    placeholder="¿A dónde te lo enviamos?"
                    value={form.direccion}
                    onChange={onChange}
                    type="text"
                    className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    required
                  />
                </div>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-[#084B83] mb-1">
                  Teléfono
                </label>
                <input
                  name="telefono"
                  placeholder="Ingresá tu número telefónico"
                  value={form.telefono}
                  onChange={onChange}
                  type="text"
                  className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-[#084B83] mb-1">
                  Correo electrónico
                </label>
                <input
                  name="email"
                  placeholder="Ingresá tu e-mail"
                  value={form.email}
                  onChange={onChange}
                  type="email"
                  className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
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
                  className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
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
                    <tr key={it.id} className="border-t">
                      <td className="py-2 max-w-[8rem] truncate overflow-hidden text-ellipsis">{it.nombre}</td>

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
          <button
            onClick={finalizarCompra}
            className="w-full mt-6 uppercase bg-[#084B83] text-white px-8 py-3 rounded-full font-semibold text-sm hover:scale-[1.02] transition-transform duration-200"
          >
            Finalizar compra
          </button>
        </aside>
      </div>
    </section>
  );
}