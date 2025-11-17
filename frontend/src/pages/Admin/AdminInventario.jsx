import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import productsService from '../../services/products';

export default function AdminInventario() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [variantes, setVariantes] = useState([]);
  const [variantesFiltradas, setVariantesFiltradas] = useState([]);
  const [selectedVariante, setSelectedVariante] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Filtros
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroStock, setFiltroStock] = useState('todos');
  const [ordenamiento, setOrdenamiento] = useState('nombre');

  useEffect(() => {
    loadInventarioData();
  }, []);

  useEffect(() => {
    aplicarFiltrosYOrdenamiento();
  }, [variantes, filtroNombre, filtroStock, ordenamiento]);

  const loadInventarioData = async () => {
    try {
      setLoading(true);

      const variantesEnriquecidas = await productsService.getAllVariantesEnriquecidas();

      console.log('✅ Total de variantes cargadas:', variantesEnriquecidas.length);

      const todasVariantes = variantesEnriquecidas.map(variante => ({
        ...variante,
        producto_nombre: variante.producto?.nombre || 'Sin nombre',
        producto_precio: variante.producto?.precio_base || variante.producto?.precio || 0,
        producto_imagen: variante.producto?.imagen_principal_url,
        producto_categoria: variante.producto?.categoria_nombre,
        producto_descripcion: variante.producto?.descripcion,
        producto_obj: variante.producto
      }));

      console.log('📦 Ejemplo de variante:', todasVariantes[0]);

      setVariantes(todasVariantes);
    } catch (error) {
      console.error('Error cargando inventario:', error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltrosYOrdenamiento = () => {
    let resultado = [...variantes];

    if (filtroNombre.trim()) {
      resultado = resultado.filter(v => 
        v.producto_nombre.toLowerCase().includes(filtroNombre.toLowerCase())
      );
    }

    if (filtroStock === 'bajo') {
      resultado = resultado.filter(v => v.stock <= 10);
    } else if (filtroStock === 'normal') {
      resultado = resultado.filter(v => v.stock > 10);
    }

    resultado.sort((a, b) => {
      switch (ordenamiento) {
        case 'nombre':
          return a.producto_nombre.localeCompare(b.producto_nombre);
        case 'precio-mayor':
          return (b.producto_precio || 0) - (a.producto_precio || 0);
        case 'precio-menor':
          return (a.producto_precio || 0) - (b.producto_precio || 0);
        case 'stock':
          return a.stock - b.stock;
        default:
          return 0;
      }
    });

    setVariantesFiltradas(resultado);
  };

  const verDetalles = (variante) => {
    setSelectedVariante(variante);
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setSelectedVariante(null);
  };

  const getStockBadgeColor = (stock) => {
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock <= 5) return 'bg-orange-100 text-orange-800';
    if (stock <= 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 sm:h-24 sm:w-24 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-xs sm:text-sm text-gray-600">Cargando inventario...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Botón hamburguesa para móvil */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-md bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors"
      >
        <i className="fas fa-bars text-lg"></i>
      </button>

      <main className="flex-1 p-3 sm:p-6 lg:p-8 lg:ml-0 overflow-x-hidden">
        {/* Header */}
        <div className="mb-4 sm:mb-6 mt-14 lg:mt-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Gestión de Inventario</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600">
            Listado completo de productos y variantes
          </p>
        </div>

        {/* Filtros y Controles */}
        <div className="bg-white shadow-lg rounded-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Filtro por nombre */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <i className="fas fa-search mr-1"></i>
                Buscar
              </label>
              <input
                type="text"
                placeholder="Nombre del producto..."
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Filtro por stock */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <i className="fas fa-filter mr-1"></i>
                Stock
              </label>
              <select
                value={filtroStock}
                onChange={(e) => setFiltroStock(e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="todos">Todos</option>
                <option value="bajo">Stock bajo (≤10)</option>
                <option value="normal">Stock normal (&gt;10)</option>
              </select>
            </div>

            {/* Ordenamiento */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <i className="fas fa-sort mr-1"></i>
                Ordenar
              </label>
              <select
                value={ordenamiento}
                onChange={(e) => setOrdenamiento(e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="nombre">Nombre (A-Z)</option>
                <option value="precio-menor">Precio (- a +)</option>
                <option value="precio-mayor">Precio (+ a -)</option>
                <option value="stock">Stock (- a +)</option>
              </select>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="mt-3 text-xs text-gray-600">
            Mostrando <span className="font-semibold">{variantesFiltradas.length}</span> de{' '}
            <span className="font-semibold">{variantes.length}</span> variantes
          </div>
        </div>

        {/* Tabla de inventario */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '600px' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Producto
                  </th>
                  <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Talla
                  </th>
                  <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Color
                  </th>
                  <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Stock
                  </th>
                  <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Precio
                  </th>
                  <th className="px-2 sm:px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Acc.
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {variantesFiltradas.length > 0 ? (
                  variantesFiltradas.map((variante, index) => (
                    <tr key={variante.id || index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-4 py-2">
                        <div className="text-xs font-medium text-gray-900 truncate max-w-[150px]">
                          {variante.producto_nombre}
                        </div>
                        {variante.producto_categoria && (
                          <div className="text-xs text-gray-500 truncate max-w-[150px]">
                            {variante.producto_categoria}
                          </div>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                        <span className="text-xs text-gray-700">
                          {variante.talla_nombre || variante.talla?.nombre || 'N/A'}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                        <span className="text-xs text-gray-700">
                          {variante.color_nombre || variante.color?.nombre || 'N/A'}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStockBadgeColor(
                            variante.stock
                          )}`}
                        >
                          {variante.stock}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                        ${parseFloat(variante.producto_precio || 0).toLocaleString()}
                      </td>
                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-center">
                        <button
                          onClick={() => verDetalles(variante)}
                          className="inline-flex items-center px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md transition-colors"
                        >
                          <i className="fas fa-eye"></i>
                          <span className="hidden sm:inline ml-1">Ver</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center">
                      <div className="text-gray-500">
                        <i className="fas fa-inbox text-2xl sm:text-3xl mb-2"></i>
                        <p className="text-xs">No se encontraron variantes</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal de Detalles */}
      {showModal && selectedVariante && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Detalles del Producto
              </h3>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-3 sm:p-4">
              {/* Imagen del Producto */}
              {selectedVariante.producto_imagen && (
                <div className="mb-3 sm:mb-4 flex justify-center">
                  <img
                    src={selectedVariante.producto_imagen}
                    alt={selectedVariante.producto_nombre}
                    className="max-h-32 sm:max-h-48 w-auto object-contain rounded-lg shadow-md"
                  />
                </div>
              )}

              {/* Información Principal */}
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
                    {selectedVariante.producto_nombre}
                  </h4>
                  {selectedVariante.producto_categoria && (
                    <p className="text-xs text-gray-500">
                      <i className="fas fa-tag mr-1"></i>
                      {selectedVariante.producto_categoria}
                    </p>
                  )}
                </div>

                {/* Descripción */}
                {selectedVariante.producto_descripcion && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 mb-1">Descripción:</h5>
                    <p className="text-xs text-gray-600 line-clamp-3">{selectedVariante.producto_descripcion}</p>
                  </div>
                )}

                {/* Grid de Información */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 border-t">
                  <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-0.5">Talla</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">
                      {selectedVariante.talla_nombre || selectedVariante.talla?.nombre || 'N/A'}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-0.5">Color</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">
                      {selectedVariante.color_nombre || selectedVariante.color?.nombre || 'N/A'}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-0.5">Stock</p>
                    <p className={`text-sm sm:text-base font-semibold ${
                      selectedVariante.stock === 0 ? 'text-red-600' :
                      selectedVariante.stock <= 10 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {selectedVariante.stock} unid.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-0.5">Precio</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">
                      ${parseFloat(selectedVariante.producto_precio || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Estado del Stock */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">Estado:</span>
                    <span
                      className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedVariante.stock === 0
                          ? 'bg-red-100 text-red-800'
                          : selectedVariante.stock <= 10
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {selectedVariante.stock === 0
                        ? 'Sin Stock'
                        : selectedVariante.stock <= 10
                        ? 'Stock Bajo'
                        : 'Stock Normal'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="flex justify-end gap-2 p-3 sm:p-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <button
                onClick={cerrarModal}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs sm:text-sm font-medium rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}