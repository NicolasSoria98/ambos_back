import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";

export default function Producto() {
  const { id } = useParams();
  const [producto, setProducto] = useState(null);
  const [otros, setOtros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [resProd, resLista] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/catalogo/productos/${id}/`),
          fetch("http://127.0.0.1:8000/api/catalogo/productos/"),
        ]);
        if (!resProd.ok) throw new Error("No se pudo cargar el producto");
        const prodData = await resProd.json();
        setProducto(prodData);
        const listData = resLista.ok ? await resLista.json() : [];
        const rel = Array.isArray(listData)
          ? listData.filter((p) => p.id !== Number(id)).slice(0, 4)
          : [];
        setOtros(rel);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <section className="min-h-screen px-6 md:px-20 py-12">Cargando...</section>;
  if (error) return <section className="min-h-screen px-6 md:px-20 py-12 text-red-600">{error}</section>;
  if (!producto) return null;

  const img = producto.imagen_principal_url || producto.imagen_principal || "https://via.placeholder.com/400x400?text=Producto";
  const price = typeof producto.precio === "number" ? `$${producto.precio.toFixed(2)}` : producto.precio;

  const handleAddToCart = () => {
    try {
      const raw = localStorage.getItem("cart");
      const cart = raw ? JSON.parse(raw) : [];
      const itemIndex = cart.findIndex((it) => it.id === producto.id);
      const img = producto.imagen_principal_url || producto.imagen_principal;
      const stock = typeof producto.stock === 'number' ? producto.stock : undefined;
      if (stock !== undefined && stock <= 0) {
        alert("Sin stock disponible");
        return;
      }
      const addQty = Math.max(1, Math.min(cantidad || 1, stock ?? Infinity));
      if (itemIndex >= 0) {
        const current = cart[itemIndex].cantidad || 1;
        const maxQty = stock ?? Infinity;
        cart[itemIndex].cantidad = Math.min(current + addQty, maxQty);
        if (stock !== undefined) cart[itemIndex].stock = stock;
      } else {
        cart.push({
          id: producto.id,
          nombre: producto.nombre,
          precio: typeof producto.precio === "number" ? producto.precio : parseFloat(producto.precio) || 0,
          imagen: img,
          cantidad: addQty,
          stock: stock,
        });
      }
      localStorage.setItem("cart", JSON.stringify(cart));
      alert("Producto agregado al carrito");
    } catch {
      alert("No se pudo agregar al carrito");
    }
  };

  return (
    <section className="min-h-screen bg-[#F0F6F6] px-6 md:px-20 py-12">
      <div className="flex flex-col md:flex-row gap-10 items-start mb-16">
        <div className="flex-1 flex justify-center">
          <img src={img} alt={producto.nombre} className="rounded-lg shadow-md w-full max-w-md object-cover" />
        </div>
        <div className="flex-1 space-y-6">
          <h1 className="text-3xl font-semibold text-[#2F4858]">{producto.nombre}</h1>
          <p className="text-2xl font-bold">{price}</p>
          {producto.talla && (
            <div>
              <h3 className="font-medium mb-2">TALLE</h3>
              <div className="flex gap-2 flex-wrap">
                <span className="border px-3 py-1 rounded">{producto.talla}</span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.max(1, (c || 1) - 1))}
                className="border rounded-full w-8 h-8 flex justify-center items-center"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={typeof producto.stock === 'number' ? Math.max(1, producto.stock) : undefined}
                value={cantidad}
                onChange={(e) => {
                  const val = Number(e.target.value) || 1;
                  const capped = typeof producto.stock === 'number' ? Math.min(Math.max(1, val), Math.max(1, producto.stock)) : Math.max(1, val);
                  setCantidad(capped);
                }}
                className="w-14 text-center border rounded-md py-1"
              />
              <button
                type="button"
                onClick={() => setCantidad((c) => {
                  const next = (c || 1) + 1;
                  if (typeof producto.stock === 'number') {
                    return Math.min(next, Math.max(1, producto.stock));
                  }
                  return next;
                })}
                className="border rounded-full w-8 h-8 flex justify-center items-center"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={typeof producto.stock === 'number' && producto.stock <= 0}
              className="bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-full hover:bg-gray-800 transition"
            >
              AGREGAR AL CARRITO
            </button>
          </div>
        </div>
      </div>
      {producto.descripcion && (
        <div className="bg-white border border-gray-200 p-6 rounded-lg mb-16">
          <h2 className="text-xl font-semibold mb-3">Descripción</h2>
          <p className="text-gray-600 leading-relaxed">{producto.descripcion}</p>
        </div>
      )}
      <div className="mb-16">
        <h2 className="text-xl font-semibold mb-6">Otros productos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {otros.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.nombre}
              price={p.precio}
              image={p.imagen_principal_url || p.imagen_principal}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
