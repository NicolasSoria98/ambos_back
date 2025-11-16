import { useEffect, useRef, useState } from "react";
import productsService from "../services/products";

const toStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (value === undefined || value === null || value === "") {
    return [];
  }
  return [String(value)];
};

const normalizeHexColor = (hex) => {
  if (!hex || typeof hex !== "string") return null;
  const trimmed = hex.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) {
    return trimmed.length === 7 ? trimmed : null;
  }
  return trimmed.length === 6 ? `#${trimmed}` : null;
};

const getContrastTextColor = (hex) => {
  if (!hex) return "#1f2937";
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  if (Number.isNaN(bigint)) return "#1f2937";
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1f2937" : "#ffffff";
};

const getColorButtonStyle = (hex, isSelected) => {
  if (!hex) return {};
  return {
    backgroundColor: hex,
    color: getContrastTextColor(hex),
    borderColor: isSelected ? "#084B83" : hex,
    boxShadow: isSelected ? "0 0 0 2px rgba(8, 75, 131, 0.35)" : "none",
  };
};

export default function CategoryFilter({ defaultFilters, onFiltersChange }) {
  const [categorias, setCategorias] = useState([]);
  const [tallas, setTallas] = useState([]);
  const [colores, setColores] = useState([]);
  const [sexosDisponibles, setSexosDisponibles] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(
    toStringArray(defaultFilters?.categories)
  );
  const [selectedSizes, setSelectedSizes] = useState(
    toStringArray(defaultFilters?.sizes ?? defaultFilters?.tallas)
  );
  const [selectedColors, setSelectedColors] = useState(
    toStringArray(defaultFilters?.colors ?? defaultFilters?.colores)
  );
  const [selectedSexos, setSelectedSexos] = useState(
    toStringArray(defaultFilters?.sexos ?? defaultFilters?.sexo)
  );
  const [sortOrder, setSortOrder] = useState(defaultFilters?.order ?? "asc");
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [filtersError, setFiltersError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchFilters = async () => {
      setLoadingFilters(true);
      try {
        const [categoriasData, tallasData, coloresData, sexosData] = await Promise.all([
          productsService.getCategories(),
          productsService.getTallas({ con_stock: "true" }),
          productsService.getColores({ con_stock: "true" }),
          productsService.getSexosDisponibles(),
        ]);

        if (!active) {
          return;
        }

        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
        setTallas(Array.isArray(tallasData) ? tallasData : []);
        setColores(Array.isArray(coloresData) ? coloresData : []);
        const sexosList = Array.isArray(sexosData?.sexos)
          ? sexosData.sexos
          : Array.isArray(sexosData)
          ? sexosData
          : [];
        setSexosDisponibles(sexosList);
        setFiltersError("");
      } catch (error) {
        console.error("Error al cargar filtros de catalogo", error);
        if (active) {
          setFiltersError("No pudimos cargar los filtros. Intenta nuevamente.");
        }
      } finally {
        if (active) {
          setLoadingFilters(false);
        }
      }
    };

    fetchFilters();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!defaultFilters) {
      return;
    }

    setSelectedCategories(toStringArray(defaultFilters.categories));
    setSelectedSizes(
      toStringArray(defaultFilters.sizes ?? defaultFilters.tallas)
    );
    setSelectedColors(
      toStringArray(defaultFilters.colors ?? defaultFilters.colores)
    );
    setSelectedSexos(toStringArray(defaultFilters.sexos ?? defaultFilters.sexo));
    setSortOrder(defaultFilters.order ?? "asc");
  }, [defaultFilters]);

  const lastEmittedRef = useRef(null);

  useEffect(() => {
    const payload = {
      order: sortOrder,
      categories: selectedCategories,
      sizes: selectedSizes,
      tallas: selectedSizes,
      colors: selectedColors,
      colores: selectedColors,
      sexos: selectedSexos,
      sexo: selectedSexos,
    };

    if (
      lastEmittedRef.current &&
      JSON.stringify(lastEmittedRef.current) === JSON.stringify(payload)
    ) {
      return;
    }

    lastEmittedRef.current = payload;
    onFiltersChange?.(payload);
  }, [sortOrder, selectedCategories, selectedSizes, selectedColors, selectedSexos, onFiltersChange]);

  const toggleCategory = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((cat) => cat !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSize = (sizeId) => {
    setSelectedSizes((prev) =>
      prev.includes(sizeId)
        ? prev.filter((size) => size !== sizeId)
        : [...prev, sizeId]
    );
  };

  const toggleColor = (colorId) => {
    setSelectedColors((prev) =>
      prev.includes(colorId)
        ? prev.filter((color) => color !== colorId)
        : [...prev, colorId]
    );
  };

  const toggleSexo = (sexoCode) => {
    setSelectedSexos((prev) =>
      prev.includes(sexoCode)
        ? prev.filter((sexo) => sexo !== sexoCode)
        : [...prev, sexoCode]
    );
  };

  return (
    <div className="h-full bg-white">
      <div className="p-8 mt-20">
        <h2 className="text-3xl font-bold text-[#084B83] mb-8 tracking-tight">
          PRODUCTOS
        </h2>
        <div className="space-y-4">
          <section className="pb-6 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Ordenar por
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="orden"
                  value="asc"
                  checked={sortOrder === "asc"}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-4 h-4 text-[#2F4858] focus:ring-[#2F4858] focus:ring-offset-0"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  Menor precio
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="orden"
                  value="desc"
                  checked={sortOrder === "desc"}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-4 h-4 text-[#2F4858] focus:ring-[#2F4858] focus:ring-offset-0"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  Mayor precio
                </span>
              </label>
            </div>
          </section>
          <section className="pb-6 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Categorías
            </h3>
            {loadingFilters && !categorias.length ? (
              <p className="text-sm text-gray-400 italic">Cargando categorías...</p>
            ) : (
              <div className="space-y-3">
                {categorias.map((categoria) => (
                  <label
                    key={categoria.id}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#2F4858] focus:ring-[#2F4858] focus:ring-offset-0 border-gray-300"
                      value={categoria.id}
                      checked={selectedCategories.includes(String(categoria.id))}
                      onChange={(e) => toggleCategory(e.target.value)}
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                      {categoria.nombre}
                    </span>
                  </label>
                ))}
                {!categorias.length && !loadingFilters && (
                  <p className="text-sm text-gray-400 italic">
                    No hay categorías disponibles.
                  </p>
                )}
              </div>
            )}
          </section>
          <section className="pb-6 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Sexo
            </h3>
            {loadingFilters && !sexosDisponibles.length ? (
              <p className="text-sm text-gray-400 italic">Cargando opciones...</p>
            ) : (
              <div className="space-y-3">
                {sexosDisponibles.map((sexo) => {
                  const value = sexo.codigo ?? sexo.id ?? sexo.value ?? "";
                  const stringValue = String(value);
                  const label = sexo.nombre || sexo.label || stringValue;
                  return (
                    <label
                      key={stringValue}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-[#2F4858] focus:ring-[#2F4858] focus:ring-offset-0 border-gray-300"
                        value={stringValue}
                        checked={selectedSexos.includes(stringValue)}
                        onChange={(e) => toggleSexo(e.target.value)}
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                        {label}
                        {typeof sexo.total === "number" ? ` (${sexo.total})` : ""}
                      </span>
                    </label>
                  );
                })}
                {!sexosDisponibles.length && !loadingFilters && (
                  <p className="text-sm text-gray-400 italic">
                    No hay sexos disponibles.
                  </p>
                )}
              </div>
            )}
          </section>
          <section className="pb-6 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Colores
            </h3>
            {loadingFilters && !colores.length ? (
              <p className="text-sm text-gray-400 italic">Cargando colores...</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {colores.map((color) => {
                  const value = String(color.id);
                  const isSelected = selectedColors.includes(value);
                  const hexColor = normalizeHexColor(color.codigo_hex);
                  const buttonStyle = getColorButtonStyle(hexColor, isSelected);
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => toggleColor(value)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                        hexColor
                          ? "bg-transparent"
                          : isSelected
                          ? "border-[#2F4858] bg-[#F0F6F6] text-[#2F4858]"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                      style={hexColor ? buttonStyle : undefined}
                    >
                      {color.nombre}
                    </button>
                  );
                })}
                {!colores.length && !loadingFilters && (
                  <p className="text-sm text-gray-400 italic">
                    No hay colores disponibles.
                  </p>
                )}
              </div>
            )}
          </section>
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Talles
            </h3>
            {loadingFilters && !tallas.length ? (
              <p className="text-sm text-gray-400 italic">Cargando talles...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tallas.map((talla) => {
                  const value = String(talla.id);
                  const isSelected = selectedSizes.includes(value);
                  return (
                    <button
                      key={talla.id}
                      type="button"
                      onClick={() => toggleSize(value)}
                      className={`
                        min-w-[48px] px-4 py-2 rounded-lg text-sm font-medium
                        transition-all duration-200 
                        ${isSelected
                          ? "bg-[#2F4858] text-white shadow-sm"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                        }
                      `}
                    >
                      {talla.nombre}
                    </button>
                  );
                })}
                {!tallas.length && !loadingFilters && (
                  <p className="text-sm text-gray-400 italic">
                    No hay talles cargados todavía.
                  </p>
                )}
              </div>
            )}
          </section>

          {filtersError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-sm text-red-600">{filtersError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
