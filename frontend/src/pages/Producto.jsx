import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import authService from "../services/auth";

export default function Producto() {
  const { id } = useParams();
  const [producto, setProducto] = useState(null);
  const [otros, setOtros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [talleSeleccionado, setTalleSeleccionado] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [resProd, resLista] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/catalogo/producto/${id}/`),
          fetch(`${import.meta.env.VITE_API_URL}/catalogo/producto/`),
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

  const variantesDisponibles = useMemo(() => {
    if (!Array.isArray(producto?.variantes)) return [];
    return producto.variantes.filter((variante) => {
      if (!variante) return false;
      if (variante.activo === false) return false;
      if (typeof variante.stock === "number") return variante.stock > 0;
      return false;
    });
  }, [producto]);
  const tallesDisponibles = useMemo(() => {
    const map = new Map();
    variantesDisponibles.forEach((variante) => {
      const tallaId = variante?.talla ?? variante?.talla_id ?? variante?.tallaId;
      if (!tallaId) return;
      const key = String(tallaId);
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          nombre: variante?.talla_nombre || `Talle ${tallaId}`,
        });
      }
    });
    return Array.from(map.values());
  }, [variantesDisponibles]);
  const requiereSeleccionDeTalle = tallesDisponibles.length > 0;
  useEffect(() => {
    if (!requiereSeleccionDeTalle) {
      setTalleSeleccionado(null);
      return;
    }
    setTalleSeleccionado((prev) => {
      if (prev && tallesDisponibles.some((t) => t.id === prev)) {
        return prev;
      }
      return null;
    });
  }, [requiereSeleccionDeTalle, tallesDisponibles]);
  const varianteSeleccionada = useMemo(() => {
    if (!talleSeleccionado) return null;
    return variantesDisponibles.find((variante) => {
      const tallaId = variante?.talla ?? variante?.talla_id ?? variante?.tallaId;
      return String(tallaId) === String(talleSeleccionado);
    }) || null;
  }, [talleSeleccionado, variantesDisponibles]);
  useEffect(() => {
    if (!varianteSeleccionada) return;
    const stock = typeof varianteSeleccionada.stock === "number" ? Math.max(1, varianteSeleccionada.stock) : null;
    if (!stock) return;
    setCantidad((prev) => Math.min(Math.max(1, prev || 1), stock));
  }, [varianteSeleccionada]);
  const stockDisponible = typeof varianteSeleccionada?.stock === "number"
    ? varianteSeleccionada.stock
    : typeof producto?.stock === "number"
      ? producto.stock
      : undefined;
  const isLoggedIn = authService.isAuthenticated();

  if (loading) return <section className="min-h-screen px-6 md:px-20 py-12">Cargando...</section>;
  if (error) return <section className="min-h-screen px-6 md:px-20 py-12 text-red-600">{error}</section>;
  if (!producto) return null;

  const img = producto.imagen_principal_url || producto.imagen_principal || "https://via.placeholder.com/400x400?text=Producto";
  const price = typeof producto.precio === "number" ? `$${producto.precio.toFixed(2)}` : producto.precio;
  const stockLabel = (() => {
    if (typeof stockDisponible === "number") {
      return stockDisponible > 0 ? `Stock disponible: ${stockDisponible}` : "Sin stock disponible";
    }
    if (typeof producto?.stock_total === "number") {
      return producto.stock_total > 0 ? `Stock disponible: ${producto.stock_total}` : "Sin stock disponible";
    }
    if (typeof producto?.stock === "number") {
      return producto.stock > 0 ? `Stock disponible: ${producto.stock}` : "Sin stock disponible";
    }
    return null;
  })();

  const handleAddToCart = () => {
    try {
      if (!authService.isAuthenticated()) {
        alert("Inicia sesión para agregar productos al carrito");
        return;
      }
      if (requiereSeleccionDeTalle && !varianteSeleccionada) {
        alert("Selecciona un talle disponible");
        return;
      }
      const raw = localStorage.getItem("cart");
      const cart = raw ? JSON.parse(raw) : [];
      const itemIndex = cart.findIndex((it) => it.id === producto.id);
      const img = producto.imagen_principal_url || producto.imagen_principal;
      const stock = typeof stockDisponible === 'number' ? stockDisponible : undefined;
      if (stock !== undefined && stock <= 0) {
        alert("Sin stock disponible para este talle");
        return;
      }
      const addQty = Math.max(1, Math.min(cantidad || 1, stock ?? Infinity));
      if (itemIndex >= 0) {
        const current = cart[itemIndex].cantidad || 1;
        const maxQty = stock ?? Infinity;
        cart[itemIndex].cantidad = Math.min(current + addQty, maxQty);
        if (stock !== undefined) cart[itemIndex].stock = stock;
        if (requiereSeleccionDeTalle && varianteSeleccionada) {
          cart[itemIndex].talla = varianteSeleccionada.talla_nombre || cart[itemIndex].talla;
          cart[itemIndex].talla_id = varianteSeleccionada.talla ?? cart[itemIndex].talla_id;
          cart[itemIndex].variante_id = varianteSeleccionada.id ?? cart[itemIndex].variante_id;
        }
      } else {
        cart.push({
          id: producto.id,
          nombre: producto.nombre,
          precio: typeof producto.precio === "number" ? producto.precio : parseFloat(producto.precio) || 0,
          imagen: img,
          cantidad: addQty,
          stock: stock,
          talla: requiereSeleccionDeTalle ? (varianteSeleccionada?.talla_nombre || null) : producto.talla || null,
          talla_id: requiereSeleccionDeTalle ? (varianteSeleccionada?.talla ?? null) : null,
          variante_id: requiereSeleccionDeTalle ? (varianteSeleccionada?.id ?? null) : null,
        });
      }
      localStorage.setItem("cart", JSON.stringify(cart));
      alert("Producto agregado al carrito");
    } catch {
      alert("No se pudo agregar al carrito");
    }
  };

  return (
    <section className="min-h-screen bg-[#F0F6F6] px-6 md:px-20 py-12 mt-12 md:mt-24">
      <div className="flex flex-col md:flex-row gap-10 items-start mb-16">
        <div className="flex-1 flex justify-center">
          <img src={img} alt={producto.nombre} className="rounded-lg shadow-md w-full max-w-md object-cover" />
        </div>
        <div className="flex-1 space-y-6">
          <h1 className="text-3xl font-semibold text-[#2F4858]">{producto.nombre}</h1>
          <p className="text-2xl font-bold">{price}</p>
          {tallesDisponibles.length > 0 ? (
            <div>
              <h3 className="font-medium mb-2">TALLE</h3>
              <div className="flex gap-2 flex-wrap">
                {tallesDisponibles.map((talle) => {
                  const isActive = talleSeleccionado === talle.id;
                  return (
                    <button
                      key={talle.id}
                      type="button"
                      onClick={() => setTalleSeleccionado(talle.id)}
                      className={`px-3 py-1 rounded border ${isActive ? "bg-black text-white border-black" : "bg-white text-gray-800 border-gray-300"
                        }`}
                    >
                      {talle.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : producto.talla ? (
            <div>
              <h3 className="font-medium mb-2">TALLE</h3>
              <div className="flex gap-2 flex-wrap">
                <span className="border px-3 py-1 rounded">{producto.talla}</span>
              </div>
            </div>
          ) : null}
          
          {stockLabel && (
            <p className="text-sm text-gray-600">
              {talleSeleccionado && varianteSeleccionada?.talla_nombre
                ? `${stockLabel} (${varianteSeleccionada.talla_nombre})`
                : stockLabel}
            </p>
          )}
          {!isLoggedIn && (
            <p className="text-sm text-red-600">
              Inicia sesión para agregar productos al carrito.
            </p>
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
                max={typeof stockDisponible === 'number' ? Math.max(1, stockDisponible) : undefined}
                value={cantidad}
                onChange={(e) => {
                  const val = Number(e.target.value) || 1;
                  const capped = typeof stockDisponible === 'number'
                    ? Math.min(Math.max(1, val), Math.max(1, stockDisponible))
                    : Math.max(1, val);
                  setCantidad(capped);
                }}
                className="w-14 text-center border rounded-md py-1"
              />
              <button
                type="button"
                onClick={() => setCantidad((c) => {
                  const next = (c || 1) + 1;
                  if (typeof stockDisponible === 'number') {
                    return Math.min(next, Math.max(1, stockDisponible));
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
              disabled={
                !isLoggedIn ||
                (typeof stockDisponible === 'number' && stockDisponible <= 0) ||
                (requiereSeleccionDeTalle && !varianteSeleccionada)
              }
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
