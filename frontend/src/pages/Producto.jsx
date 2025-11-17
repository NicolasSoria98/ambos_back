import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import authService from "../services/auth";

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x400?text=Producto";

const normalizeHexColor = (hex) => {
  if (!hex || typeof hex !== "string") return null;
  let value = hex.trim();
  if (!value) return null;
  if (!value.startsWith("#")) {
    value = `#${value}`;
  }
  return value.length === 7 ? value : null;
};

const getImageSource = (image) => {
  if (!image) return null;
  if (typeof image === "string") return image;
  return image.imagen_url || image.imagen || null;
};

export default function Producto() {
  const { id } = useParams();
  const [producto, setProducto] = useState(null);
  const [otros, setOtros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [talleSeleccionado, setTalleSeleccionado] = useState(null);
  const [colorSeleccionado, setColorSeleccionado] = useState(null);
  const [imagenActiva, setImagenActiva] = useState(0);

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

  const coloresDisponibles = useMemo(() => {
    const map = new Map();
    variantesDisponibles.forEach((variante) => {
      const colorId = variante?.color ?? variante?.color_id ?? variante?.colorId;
      if (!colorId) return;
      const key = String(colorId);
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          nombre: variante?.color_nombre || `Color ${colorId}`,
          codigoHex: normalizeHexColor(variante?.color_codigo_hex || variante?.color_hex),
        });
      }
    });
    return Array.from(map.values());
  }, [variantesDisponibles]);

  useEffect(() => {
    if (!coloresDisponibles.length) {
      setColorSeleccionado(null);
      return;
    }
    setColorSeleccionado((prev) => {
      if (prev && coloresDisponibles.some((color) => color.id === prev)) {
        return prev;
      }
      return null;
    });
  }, [coloresDisponibles]);

  const variantesFiltradasPorColor = useMemo(() => {
    if (!coloresDisponibles.length) {
      return variantesDisponibles;
    }
    if (!colorSeleccionado) {
      return [];
    }
    return variantesDisponibles.filter((variante) => {
      const colorId = variante?.color ?? variante?.color_id ?? variante?.colorId;
      return String(colorId) === String(colorSeleccionado);
    });
  }, [colorSeleccionado, coloresDisponibles, variantesDisponibles]);

  const tallesDisponibles = useMemo(() => {
    const map = new Map();
    variantesFiltradasPorColor.forEach((variante) => {
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
  }, [variantesFiltradasPorColor]);

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

  const requiereSeleccionDeColor = coloresDisponibles.length > 0;

  const varianteSeleccionada = useMemo(() => {
    if (!variantesFiltradasPorColor.length) {
      return null;
    }
    if (!requiereSeleccionDeTalle) {
      return variantesFiltradasPorColor[0] || null;
    }
    if (!talleSeleccionado) return null;
    return (
      variantesFiltradasPorColor.find((variante) => {
        const tallaId = variante?.talla ?? variante?.talla_id ?? variante?.tallaId;
        return String(tallaId) === String(talleSeleccionado);
      }) || null
    );
  }, [variantesFiltradasPorColor, requiereSeleccionDeTalle, talleSeleccionado]);
  useEffect(() => {
    if (!varianteSeleccionada) return;
    const stock = typeof varianteSeleccionada.stock === "number" ? Math.max(1, varianteSeleccionada.stock) : null;
    if (!stock) return;
    setCantidad((prev) => Math.min(Math.max(1, prev || 1), stock));
  }, [varianteSeleccionada]);
  const colorSeleccionadoNombre = useMemo(() => {
    if (!colorSeleccionado) return null;
    const color = coloresDisponibles.find((c) => c.id === colorSeleccionado);
    return color?.nombre ?? null;
  }, [colorSeleccionado, coloresDisponibles]);
  const stockDetalleSeleccion = useMemo(() => {
    const detalles = [];
    if (colorSeleccionadoNombre) {
      detalles.push(colorSeleccionadoNombre);
    }
    if (talleSeleccionado && varianteSeleccionada?.talla_nombre) {
      detalles.push(varianteSeleccionada.talla_nombre);
    }
    return detalles.length ? ` (${detalles.join(" - ")})` : "";
  }, [colorSeleccionadoNombre, talleSeleccionado, varianteSeleccionada]);
  const totalStockProducto = (() => {
    if (typeof producto?.stock_total === "number") {
      return producto.stock_total;
    }
    if (typeof producto?.stock === "number") {
      return producto.stock;
    }
    return null;
  })();
  const stockColorSeleccionado = useMemo(() => {
    if (!colorSeleccionado) {
      return null;
    }
    if (!variantesFiltradasPorColor.length) {
      return 0;
    }
    return variantesFiltradasPorColor.reduce((total, variante) => {
      return total + (typeof variante.stock === "number" ? variante.stock : 0);
    }, 0);
  }, [colorSeleccionado, variantesFiltradasPorColor]);
  const stockDisponible = typeof varianteSeleccionada?.stock === "number"
    ? varianteSeleccionada.stock
    : typeof producto?.stock === "number"
      ? producto.stock
      : undefined;
  const isLoggedIn = typeof authService.isClienteAuthenticated === "function"
    ? authService.isClienteAuthenticated()
    : authService.isAuthenticated();
  const imagenPrincipal = producto?.imagen_principal_url || producto?.imagen_principal || PLACEHOLDER_IMAGE;
  const imagenesGenerales = Array.isArray(producto?.imagenes) ? producto.imagenes : [];

  const galeriaBase = useMemo(() => {
    const unique = [];
    const addUnique = (url) => {
      if (!url) return;
      if (!unique.includes(url)) {
        unique.push(url);
      }
    };
    addUnique(imagenPrincipal);
    imagenesGenerales.forEach((imagen) => addUnique(getImageSource(imagen)));
    return unique.length ? unique : [PLACEHOLDER_IMAGE];
  }, [imagenPrincipal, imagenesGenerales]);

  const imagenesPorColor = useMemo(() => {
    const map = new Map();
    variantesDisponibles.forEach((variante) => {
      const colorId = variante?.color ?? variante?.color_id ?? variante?.colorId;
      if (!colorId) return;
      const key = String(colorId);
      const imagenesVariante = Array.isArray(variante?.imagenes) ? variante.imagenes : [];
      if (!imagenesVariante.length) return;
      if (!map.has(key)) {
        map.set(key, []);
      }
      const bucket = map.get(key);
      imagenesVariante.forEach((imagen) => {
        const url = getImageSource(imagen);
        if (url && !bucket.includes(url)) {
          bucket.push(url);
        }
      });
    });
    return map;
  }, [variantesDisponibles]);

  const todasLasImagenes = useMemo(() => {
    const combined = [...galeriaBase];
    imagenesPorColor.forEach((imagenesColor) => {
      imagenesColor.forEach((url) => {
        if (!combined.includes(url)) {
          combined.push(url);
        }
      });
    });
    return combined;
  }, [galeriaBase, imagenesPorColor]);

  const imagenesParaMostrar = useMemo(() => {
    if (colorSeleccionado && imagenesPorColor.has(String(colorSeleccionado))) {
      const imagenesColor = imagenesPorColor.get(String(colorSeleccionado)) || [];
      if (imagenesColor.length) {
        return imagenesColor;
      }
    }
    return todasLasImagenes;
  }, [colorSeleccionado, imagenesPorColor, todasLasImagenes]);

  useEffect(() => {
    setImagenActiva(0);
  }, [imagenesParaMostrar]);

  const hayMultiplesImagenes = imagenesParaMostrar.length > 1;
  const imagenActivaUrl = imagenesParaMostrar[imagenActiva] || imagenPrincipal;
  const formatStockLabel = (value) => {
    if (value === null || value === undefined) {
      return null;
    }
    return value > 0 ? `Stock disponible: ${value}` : "Sin stock disponible";
  };

  const stockLabel = (() => {
    if (typeof varianteSeleccionada?.stock === "number") {
      return formatStockLabel(varianteSeleccionada.stock);
    }
    if (colorSeleccionado && stockColorSeleccionado !== null) {
      return formatStockLabel(stockColorSeleccionado);
    }
    return formatStockLabel(totalStockProducto);
  })();

  if (loading) return <section className="min-h-screen px-6 md:px-20 py-12">Cargando...</section>;
  if (error) return <section className="min-h-screen px-6 md:px-20 py-12 text-red-600">{error}</section>;
  if (!producto) return null;

  const price = typeof producto.precio === "number" ? `$${producto.precio.toFixed(2)}` : producto.precio;

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      alert("Inicia sesión para agregar productos al carrito");
      return;
    }
    try {
      if (requiereSeleccionDeColor && !colorSeleccionado) {
        alert("Selecciona un color disponible");
        return;
      }
      if (requiereSeleccionDeTalle && !varianteSeleccionada) {
        alert("Selecciona un talle disponible");
        return;
      }
      const varianteParaCarrito = varianteSeleccionada || variantesFiltradasPorColor[0] || null;
      if ((requiereSeleccionDeTalle || requiereSeleccionDeColor) && !varianteParaCarrito) {
        alert("Selecciona una combinación disponible");
        return;
      }
      const raw = localStorage.getItem("cart");
      const cart = raw ? JSON.parse(raw) : [];
      const stock = typeof stockDisponible === "number" ? stockDisponible : undefined;
      if (stock !== undefined && stock <= 0) {
        alert("Sin stock disponible para esta combinación");
        return;
      }
      const variantId = varianteParaCarrito?.id ?? null;
      const selectedImage = imagenActivaUrl || imagenPrincipal;
      const addQty = Math.max(1, Math.min(cantidad || 1, stock ?? Infinity));
      const itemIndex = cart.findIndex((it) => {
        if (variantId) {
          return it.id === producto.id && it.variante_id === variantId;
        }
        return it.id === producto.id && !it.variante_id;
      });
      if (itemIndex >= 0) {
        const current = cart[itemIndex].cantidad || 1;
        const maxQty = stock ?? Infinity;
        cart[itemIndex].cantidad = Math.min(current + addQty, maxQty);
        if (stock !== undefined) {
          cart[itemIndex].stock = stock;
        }
        if (variantId) {
          cart[itemIndex].variante_id = variantId;
        }
        if (requiereSeleccionDeTalle && varianteParaCarrito) {
          cart[itemIndex].talla = varianteParaCarrito.talla_nombre || cart[itemIndex].talla;
          cart[itemIndex].talla_id = varianteParaCarrito.talla ?? cart[itemIndex].talla_id;
        }
        if (requiereSeleccionDeColor && varianteParaCarrito) {
          cart[itemIndex].color = varianteParaCarrito.color_nombre || cart[itemIndex].color;
          cart[itemIndex].color_id = varianteParaCarrito.color ?? cart[itemIndex].color_id;
          cart[itemIndex].color_hex = varianteParaCarrito.color_codigo_hex ?? cart[itemIndex].color_hex;
        }
        if (!cart[itemIndex].imagen) {
          cart[itemIndex].imagen = selectedImage;
        }
      } else {
        cart.push({
          id: producto.id,
          nombre: producto.nombre,
          precio:
            typeof producto.precio === "number" ? producto.precio : parseFloat(producto.precio) || 0,
          imagen: selectedImage,
          cantidad: addQty,
          stock,
          talla: requiereSeleccionDeTalle ? varianteParaCarrito?.talla_nombre || null : producto.talla || null,
          talla_id: requiereSeleccionDeTalle ? varianteParaCarrito?.talla ?? null : null,
          color: requiereSeleccionDeColor ? varianteParaCarrito?.color_nombre || null : producto.color || null,
          color_id: requiereSeleccionDeColor ? varianteParaCarrito?.color ?? null : null,
          color_hex: requiereSeleccionDeColor ? varianteParaCarrito?.color_codigo_hex ?? null : null,
          variante_id: variantId,
        });
      }
      localStorage.setItem("cart", JSON.stringify(cart));
      alert("Producto agregado al carrito");
    } catch {
      alert("No se pudo agregar al carrito");
    }
  };

  const handlePrevImagen = () => {
    if (!hayMultiplesImagenes) return;
    setImagenActiva((prev) => (prev - 1 + imagenesParaMostrar.length) % imagenesParaMostrar.length);
  };

  const handleNextImagen = () => {
    if (!hayMultiplesImagenes) return;
    setImagenActiva((prev) => (prev + 1) % imagenesParaMostrar.length);
  };

  const handleColorSelect = (colorId) => {
    setColorSeleccionado(colorId);
    setTalleSeleccionado(null);
  };

  return (
    <section className="min-h-screen bg-[#F0F6F6] px-6 md:px-20 p-36">
      <div className="flex flex-col md:flex-row gap-10 items-start mb-16">
        <div className="flex-1 flex flex-col items-center gap-4 w-full">
          <div className="w-full max-w-md">
            <div className="relative rounded-2xl bg-white shadow-md overflow-hidden">
              <img
                src={imagenActivaUrl}
                alt={`${producto.nombre} - imagen ${imagenActiva + 1}`}
                className="w-full h-[420px] object-cover"
              />
              {hayMultiplesImagenes && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImagen}
                    className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full w-10 h-10 flex items-center justify-center shadow"
                    aria-label="Imagen anterior"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImagen}
                    className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full w-10 h-10 flex items-center justify-center shadow"
                    aria-label="Imagen siguiente"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>
          {hayMultiplesImagenes && (
            <div className="flex flex-wrap gap-3 justify-center max-w-md">
              {imagenesParaMostrar.map((url, index) => {
                const isActive = imagenActiva === index;
                return (
                  <button
                    key={url + index}
                    type="button"
                    onClick={() => setImagenActiva(index)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition ${isActive ? "border-[#084B83]" : "border-transparent"
                      }`}
                    aria-label={`Ver imagen ${index + 1}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex-1 space-y-6">
          <h1 className="text-3xl font-semibold text-[#2F4858]">{producto.nombre}</h1>
          <p className="text-2xl font-bold">{price}</p>
          {coloresDisponibles.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">COLOR</h3>
              <div className="flex gap-3 flex-wrap">
                {coloresDisponibles.map((color) => {
                  const isActive = colorSeleccionado === color.id;
                  const hex = color.codigoHex || "#E5E7EB";
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => handleColorSelect(color.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition ${isActive ? "border-[#084B83] text-[#084B83] shadow-sm" : "border-gray-300 text-gray-700"
                        }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-gray-300"
                        style={{ backgroundColor: hex }}
                      />
                      {color.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
              {stockLabel}
              {stockDetalleSeleccion}
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
                (requiereSeleccionDeColor && !colorSeleccionado) ||
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
      <div>
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
