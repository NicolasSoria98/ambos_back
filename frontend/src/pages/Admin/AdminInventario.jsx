import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import productsService from '../../services/products';

export default function AdminInventario() {
  const [loading, setLoading] = useState(true);
  const [stockBajo, setStockBajo] = useState([]);
  const [valorInventario, setValorInventario] = useState(0);
  const [sinStock, setSinStock] = useState(0);

  useEffect(() => {
    loadInventarioData();
  }, []);

  const loadInventarioData = async () => {
    try {
      setLoading(true);

      // Cargar productos con stock bajo
      const productos = await productsService.getLowStockProducts(10);
      setStockBajo(productos);

      // Calcular métricas
      const totalValue = productos.reduce(
        (sum, p) => sum + parseFloat(p.precio || 0) * (p.stock || 0),
        0
      );
      setValorInventario(totalValue);

      const noStock = productos.filter((p) => p.stock === 0).length;
      setSinStock(noStock);

    } catch (error) {
      console.error('Error cargando inventario:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Inventario</h1>
          <p className="mt-1 text-sm text-gray-600">Control y monitoreo del stock de productos</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <div className="bg-white overflow-hidden shadow-lg rounded-lg p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-indigo-500 p-3">
                  <i className="fas fa-dollar-sign text-white text-2xl"></i>
                </div>
              </div>
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-500">Valor Total Inventario</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  ${valorInventario.toLocaleString()}
                </dd>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-lg rounded-lg p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-red-500 p-3">
                  <i className="fas fa-exclamation-triangle text-white text-2xl"></i>
                </div>
              </div>
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-500">Productos Sin Stock</dt>
                <dd className="text-2xl font-semibold text-gray-900">{sinStock}</dd>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-lg rounded-lg p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-yellow-500 p-3">
                  <i className="fas fa-boxes text-white text-2xl"></i>
                </div>
              </div>
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-500">Stock Bajo</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stockBajo.length}</dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              <i className="fas fa-exclamation-circle text-red-500 mr-2"></i>
              Productos con Stock Bajo (≤10 unidades)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockBajo.length > 0 ? (
                  stockBajo.map((producto) => (
                    <tr key={producto.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {producto.nombre}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {producto.categoria?.nombre || 'Sin categoría'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                            producto.stock === 0
                              ? 'bg-red-100 text-red-800'
                              : producto.stock <= 5
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {producto.stock} unid.
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${parseFloat(producto.precio || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            producto.stock === 0
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {producto.stock === 0 ? 'Sin Stock' : 'Crítico'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                      ✅ No hay productos con stock bajo
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}