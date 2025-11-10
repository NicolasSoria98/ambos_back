import { useEffect, useState } from "react";

export default function Carrito() {
  const [items, setItems] = useState([]);
  const canCheckout = items.length > 0;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cart");
      const cart = raw ? JSON.parse(raw) : [];
      const base = Array.isArray(cart) ? cart : [];
      const normalized = base.map((it) => {
        if (typeof it.stock === 'number') {
          const max = Math.max(1, it.stock);
          const qty = Math.min(Math.max(1, it.cantidad || 1), max);
          return { ...it, cantidad: qty };
        }
        return it;
      });
      setItems(normalized);
      try { localStorage.setItem("cart", JSON.stringify(normalized)); } catch { }
    } catch {
      setItems([]);
    }
  }, []);

  const persist = (next) => {
    setItems(next);
    localStorage.setItem("cart", JSON.stringify(next));
  };

  const inc = (id) => {
    const next = items.map((it) => {
      if (it.id !== id) return it;
      const stock = typeof it.stock === 'number' ? it.stock : Infinity;
      const current = it.cantidad || 1;
      const nueva = Math.min(current + 1, stock);
      if (nueva === current && stock !== Infinity) {
        alert('Alcanzaste el stock disponible');
      }
      return { ...it, cantidad: nueva };
    });
    persist(next);
  };

  const dec = (id) => {
    const next = items.map((it) => (it.id === id ? { ...it, cantidad: Math.max(1, (it.cantidad || 1) - 1) } : it));
    persist(next);
  };

  const removeItem = (id) => {
    const next = items.filter((it) => it.id !== id);
    persist(next);
  };

  const total = items.reduce((sum, it) => sum + (it.precio || 0) * (it.cantidad || 1), 0);

  return (
    <section className="min-h-[calc(100vh-6rem)] md:flex md:flex-col md:justify-center md:min-h-[calc(100vh-8rem)] bg-[#F0F6F6] px-8 py-10 md:px-80">
      <h1 className="text-2xl md:text-4xl font-bold text-[#084B83] mb-4">Carrito de compras</h1>
      <div className="bg-white shadow rounded-lg p-4">
        <div className="overflow-x-auto -mx-4 md:mx-0">
        <table className="min-w-full text-sm table-auto whitespace-nowrap md:whitespace-normal">
          <thead className="border-b text-left text-gray-500">
            <tr>
              <th className="pb-3">Producto</th>
              <th className="pb-3">Cantidad</th>
              <th className="pb-3">Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">Tu carrito está vacío</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b last:border-none">
                  <td className="py-4 flex items-center gap-4 min-w-[220px]">
                    <img src={item.imagen || "https://via.placeholder.com/100"} alt={item.nombre} className="w-8 h-8 md:w-16 md:h-16 rounded-md object-cover" />
                    <span className="font-medium break-words break-all md:break-normal">{item.nombre}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => dec(item.id)} className="border rounded-full w-6 h-6 flex justify-center items-center">-</button>
                      <span>{item.cantidad || 1}</span>
                      <button onClick={() => inc(item.id)} className="border rounded-full w-6 h-6 flex justify-center items-center">+</button>
                    </div>
                  </td>
                  <td>${Number((item.precio || 0) * (item.cantidad || 1)).toLocaleString()}</td>
                  <td>
                    <button onClick={() => removeItem(item.id)} className="text-red-500">Eliminar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        <div className="flex justify-end mt-6 items-center gap-6">
          <p className="text-lg font-semibold">Total: ${Number(total).toLocaleString()}</p>
          <a
            href={canCheckout ? "/enviopago" : "#"}
            onClick={(e) => { if (!canCheckout) { e.preventDefault(); alert("Tu carrito está vacío"); } }}
            className={`bg-[#084B83] text-white px-6 py-2 rounded-full transition ${canCheckout ? "hover:bg-gray-800" : "opacity-50 cursor-not-allowed"}`}
          >
            Checkout
          </a>
        </div>
      </div>
    </section>
  );
}
