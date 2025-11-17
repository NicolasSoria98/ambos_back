import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import CategoryFilter from "../components/CategoryFilter";
import ProductCard from "../components/ProductCard";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const PRODUCT_ENDPOINT = `${API_BASE_URL}/catalogo/producto`;
const PRICE_KEYS = ["precio", "precio_base"];

const getProductPrice = (product) => {
  for (const key of PRICE_KEYS) {
    const value = product?.[key];
    if (value !== undefined && value !== null) {
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) return numeric;
    }
  }
  return 0;
};

const hasProductStock = (product) => {
  if (!product) return false;
  if (typeof product.stock === "number") return product.stock > 0;
  if (typeof product.stock_total === "number") return product.stock_total > 0;
  if (typeof product.stock_disponible === "boolean") return product.stock_disponible;
  return true;
};

const parseQueryValues = (params, key) => {
  const values = params.getAll(key);
  if (values.length) {
    return values;
  }
  const single = params.get(key);
  if (single) {
    return single.split(",").map((value) => value.trim()).filter(Boolean);
  }
  return [];
};

export default function Catalogo() {
  const location = useLocation();
  const [productos, setProductos] = useState([]);
  const [filteredProductos, setFilteredProductos] = useState([]);
  const [productSizeMap, setProductSizeMap] = useState({});
  const [productColorMap, setProductColorMap] = useState({});
  const [filters, setFilters] = useState({
    categories: [],
    sizes: [],
    colors: [],
    sexos: [],
    order: "asc",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const queryFilters = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const sexoFilters = parseQueryValues(params, "sexo");
    return {
      sexos: sexoFilters.map((value) => value.toUpperCase()),
    };
  }, [location.search]);

  useEffect(() => {
    setFilters((prev) => {
      const prevSexos = Array.isArray(prev.sexos) ? prev.sexos : [];
      const nextSexos = queryFilters.sexos || [];
      const same =
        prevSexos.length === nextSexos.length &&
        prevSexos.every((value, index) => value === nextSexos[index]);
      if (same) {
        return prev;
      }
      return {
        ...prev,
        sexos: nextSexos,
      };
    });
  }, [queryFilters]);

  const fetchProductVariantData = useCallback(async (productIds = []) => {
    if (!productIds.length) return;

    try {
      const details = await Promise.all(
        productIds.map(async (id) => {
          try {
            const res = await fetch(`${PRODUCT_ENDPOINT}/${id}/`);
            if (!res.ok) throw new Error(`Producto ${id} no disponible`);

            const detail = await res.json();
            const variantes = Array.isArray(detail?.variantes)
              ? detail.variantes
              : [];
            const talles = variantes
              .map((variant) => {
                if (variant?.talla?.id) return String(variant.talla.id);
                if (variant?.talla) return String(variant.talla);
                return null;
              })
              .filter(Boolean);
            const colores = variantes
              .map((variant) => {
                if (variant?.color?.id) return String(variant.color.id);
                if (variant?.color) return String(variant.color);
                return null;
              })
              .filter(Boolean);

            return {
              id,
              talles: [...new Set(talles)],
              colores: [...new Set(colores)],
            };
          } catch (detailError) {
            console.error("No se pudo obtener variantes para el producto", id, detailError);
            return { id, talles: [], colores: [] };
          }
        })
      );

      setProductSizeMap((prev) => {
        const nextMap = { ...prev };
        details.forEach(({ id, talles }) => {
          if (!nextMap[id] || talles.length) {
            nextMap[id] = talles;
          }
        });
        return nextMap;
      });

      setProductColorMap((prev) => {
        const nextMap = { ...prev };
        details.forEach(({ id, colores }) => {
          if (!nextMap[id] || colores.length) {
            nextMap[id] = colores;
          }
        });
        return nextMap;
      });
    } catch (err) {
      console.error("Error al cargar variantes de productos", err);
    }
  }, []);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${PRODUCT_ENDPOINT}/`);
      if (!res.ok) throw new Error("No se pudo cargar el catalogo");

      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];

      const listConStock = list.filter(hasProductStock);

      setProductos(listConStock);
      setFilteredProductos(listConStock);
      setError(null);

      const ids = listConStock.map((product) => product.id).filter(Boolean);
      if (ids.length) {
        fetchProductVariantData(ids);
      }
    } catch (e) {
      setError(e.message || "Error inesperado al cargar el catalogo");
      setProductos([]);
      setFilteredProductos([]);
    } finally {
      setLoading(false);
    }
  }, [fetchProductVariantData]);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  useEffect(() => {
    const applyFilters = () => {
      if (!productos.length) {
        setFilteredProductos([]);
        return;
      }

      let result = [...productos];
      const selectedCategories = filters.categories?.map(String) || [];
      const selectedSizes = filters.sizes?.map(String) || [];
      const selectedColors = Array.isArray(filters.colors)
        ? filters.colors.map(String)
        : Array.isArray(filters.colores)
        ? filters.colores.map(String)
        : [];
      const sexoFilters = filters.sexos ?? filters.sexo ?? [];
      const selectedSexos = Array.isArray(sexoFilters)
        ? sexoFilters.map(String)
        : sexoFilters
        ? [String(sexoFilters)]
        : [];

      if (selectedCategories.length) {
        result = result.filter((product) =>
          selectedCategories.includes(String(product.categoria))
        );
      }

      if (selectedSexos.length) {
        result = result.filter((product) =>
          product.sexo ? selectedSexos.includes(String(product.sexo)) : false
        );
      }

      const pendingSizeIds = selectedSizes.length
        ? new Set(
            result
              .filter((product) => !productSizeMap[product.id])
              .map((product) => product.id)
          )
        : new Set();
      const pendingColorIds = selectedColors.length
        ? new Set(
            result
              .filter((product) => !productColorMap[product.id])
              .map((product) => product.id)
          )
        : new Set();

      const idsToFetch = Array.from(
        new Set([...pendingSizeIds, ...pendingColorIds])
      );
      if (idsToFetch.length) {
        fetchProductVariantData(idsToFetch);
      }

      if (selectedSizes.length) {
        result = result.filter((product) => {
          const talles = productSizeMap[product.id] || [];
          if (!talles.length && pendingSizeIds.has(product.id)) {
            return true;
          }
          return selectedSizes.some((size) => talles.includes(size));
        });
      }

      if (selectedColors.length) {
        result = result.filter((product) => {
          const colores = productColorMap[product.id] || [];
          if (!colores.length && pendingColorIds.has(product.id)) {
            return true;
          }
          return selectedColors.some((color) => colores.includes(color));
        });
      }

      result.sort((a, b) => {
        const priceA = getProductPrice(a);
        const priceB = getProductPrice(b);
        return filters.order === "desc" ? priceB - priceA : priceA - priceB;
      });

      setFilteredProductos(result);
    };

    applyFilters();
  }, [
    productos,
    filters,
    productSizeMap,
    productColorMap,
    fetchProductVariantData,
  ]);

  const handleFiltersChange = (newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  return (
    <section className="min-h-screen bg-[#F0F6F6] flex flex-col md:flex-row">
      <aside className="w-full md:w-96 bg-white border-gray-200">
        <CategoryFilter defaultFilters={filters} onFiltersChange={handleFiltersChange} />
      </aside>
      <main className="flex-1 p-8 md:pt-32">
        {loading && <p className="text-gray-600">Cargando productos...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProductos.map((p) => (
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
