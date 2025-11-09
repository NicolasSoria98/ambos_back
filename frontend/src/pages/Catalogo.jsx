import { useEffect, useState } from "react";
import CategoryFilter from "../components/CategoryFilter";
import ProductCard from "../components/ProductCard";

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/catalogo/productos/");
        if (!res.ok) throw new Error("No se pudo cargar el catálogo");
        const data = await res.json();
        setProductos(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <section className="min-h-screen bg-[#F0F6F6] flex flex-col md:flex-row">
      <aside className="w-full md:w-96 bg-white border-gray-200">
        <CategoryFilter />
      </aside>
      <main className="flex-1 p-6">
        {loading && <p className="text-gray-600">Cargando productos...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productos.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.nombre}
                price={p.precio}
                image={p.imagen_principal_url || p.imagen_principal}
              />
            ))}
          </div>
        )}
      </main>
    </section>
  );
}
