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
    const rawToken = localStorage.getItem("token");
    const token = rawToken && rawToken !== "undefined" && rawToken !== "null" ? rawToken : null;
    if (!token) return;
    (async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/usuarios/perfil/", {
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
      const rawToken = localStorage.getItem("token");
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
        const res = await fetch("http://127.0.0.1:8000/api/pedidos/", {
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
          try { const err = await res.json(); msg = err.detail || JSON.stringify(err); } catch {}
          alert(msg);
          return;
        }
      } catch {}
      localStorage.setItem("last_order", JSON.stringify(storedOrder));
      try {
        const rawList = localStorage.getItem("orders_local");
        const list = rawList ? JSON.parse(rawList) : [];
        const next = [storedOrder, ...Array.isArray(list) ? list : []];
        localStorage.setItem("orders_local", JSON.stringify(next));
      } catch {}
      localStorage.removeItem("cart");
      navigate("/compra-exitosa");
    } catch {
      alert("No se pudo finalizar la compra");
    }
  };

  return (
    <section className="h-full md:flex md:flex-col md:justify-center md:min-h-[calc(100vh-8rem)] bg-[#F0F6F6] px-8 py-10 md:px-80">
      <h1 className="text-2xl md:text-4xl font-bold text-[#084B83] mb-6">
        Finalizar compra
      </h1>
      <div className="bg-white shadow rounded-lg p-4 md:p-8 grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <div className="flex items-center mb-4 text-sm">
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
            <label className="flex items-center gap-2 md:ml-8">
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
                  Nombre *
                </label>
                <input
                  name="nombre"
                  placeholder="Ingresá tu nombre"
                  value={form.nombre}
                  onChange={onChange}
                  type="text"
                  className="w-full border px-4 py-2 rounded-md"
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
                  className="w-full border px-4 py-2 rounded-md"
                  required
                />
              </div>
            </div>

            {metodoEnvio === "envio" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-[#084B83] mb-1">
                    Ciudad * <span className="text-xs font-light text-gray-500">(Sólo Resistencia y Corrientes)</span>
                  </label>
                  <select
                    name="ciudad"
                    value={form.ciudad}
                    onChange={onChange}
                    className="border px-2 py-2 rounded-md"
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
                    className="w-full border px-4 py-2 rounded-md"
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
                  className="w-full border px-4 py-2 rounded-md"
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
                  className="w-full border px-4 py-2 rounded-md"
                  required
                />
              </div>
            </div>



            <div className="flex flex-col">
              <label className="text-sm font-medium text-[#084B83] mb-1">
                Notas
              </label>
              <textarea
                placeholder="(Opcional)"
                name="notas"
                value={form.notas}
                onChange={onChange}
                className="w-full border px-4 py-2 rounded-md"
              />
            </div>
          </form>
        </div>

        <aside className="md:col-span-1">
          <h2 className="text-2xl font-semibold mb-4">Resumen del pedido</h2>
          <div className="border rounded-lg p-4 bg-white">
            <table className="w-full text-sm">
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
                    <td className="py-2">{it.nombre}</td>
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
            <button
              onClick={finalizarCompra}
              className="mt-6 w-full bg-black text-white px-6 py-3 rounded-full hover:bg-gray-800 transition"
            >
              Finalizar compra
            </button>
          </div>
        </aside>
      </div>
    </section>

  );
}
