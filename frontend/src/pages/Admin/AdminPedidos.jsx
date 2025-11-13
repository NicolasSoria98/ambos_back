import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import ordersService from '../../services/orders';

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [comentario, setComentario] = useState('');

  const estados = ordersService.getEstados();

  useEffect(() => {
    cargarPedidos();
  }, [filterEstado]);

  const cargarPedidos = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (filterEstado) filters.estado = filterEstado;
      
      const data = await ordersService.getAll(filters);
      setPedidos(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los pedidos: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = async (pedido) => {
    try {
      const detalle = await ordersService.getById(pedido.id);
      setSelectedPedido(detalle);
      setShowModal(true);
    } catch (err) {
      alert('Error al cargar el detalle: ' + err.message);
    }
  };

  const handleCambiarEstado = (pedido) => {
    setSelectedPedido(pedido);
    setNuevoEstado(pedido.estado_pedido);
    setComentario('');
    setShowEstadoModal(true);
  };

  const handleSubmitCambioEstado = async (e) => {
    e.preventDefault();
    
    if (!nuevoEstado) {
      alert('Selecciona un nuevo estado');
      return;
    }

    try {
      await ordersService.cambiarEstado(selectedPedido.id, nuevoEstado, comentario);
      alert('Estado actualizado correctamente');
      setShowEstadoModal(false);
      setSelectedPedido(null);
      setNuevoEstado('');
      setComentario('');
      cargarPedidos();
    } catch (err) {
      alert('Error al cambiar el estado: ' + err.message);
      console.error(err);
    }
  };

  const handleEliminar = async (pedido) => {
    // Validar si ya está inactivo
    if (!pedido.activo) {
      alert('Este pedido ya está inactivo');
      return;
    }

    if (!window.confirm('¿Estás seguro de cancelar y desactivar este pedido? Esta acción cambiará el estado a "Cancelado".')) return;

    try {
      await ordersService.delete(pedido.id);
      alert('Pedido cancelado y desactivado correctamente');
      cargarPedidos();
    } catch (err) {
      alert('Error al desactivar el pedido: ' + err.message);
    }
  };

  const handleToggleActivo = async (pedido) => {
    if (pedido.activo) {
      // Si está activo, se va a desactivar y cancelar
      if (!window.confirm('¿Estás seguro de cancelar y desactivar este pedido?')) return;
    }

    try {
      const response = await ordersService.toggleActivo(pedido.id);
      if (pedido.activo) {
        alert('Pedido cancelado y desactivado correctamente');
      } else {
        alert('Pedido reactivado correctamente');
      }
      cargarPedidos();
    } catch (err) {
      alert('Error al cambiar estado del pedido: ' + err.message);
      console.error(err);
    }
  };

  const getEstadoColor = (estado) => {
    const estadoObj = estados.find(e => e.value === estado);
    return estadoObj ? estadoObj.color : 'gray';
  };

  const getEstadoLabel = (estado) => {
    const estadoObj = estados.find(e => e.value === estado);
    return estadoObj ? estadoObj.label : estado;
  };

  const pedidosFiltrados = pedidos.filter(pedido => {
    const matchSearch = 
      pedido.numero_pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.email_contacto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.telefono_contacto.includes(searchTerm) ||
      (pedido.usuario_nombre && pedido.usuario_nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchSearch;
  });

  const estadoColors = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-indigo-600 mb-4"></i>
            <p className="text-gray-600">Cargando pedidos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              <i className="fas fa-shopping-cart mr-3"></i>
              Gestión de Pedidos
            </h1>
            <p className="text-gray-600">Administra y monitorea todos los pedidos</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          {/* Filtros y búsqueda */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="Buscar por número, email, teléfono o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Todos los estados</option>
                {estados.map(estado => (
                  <option key={estado.value} value={estado.value}>
                    {estado.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Resumen rápido - ACTUALIZADO */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Pedidos</p>
                <p className="text-2xl font-bold text-gray-800">{pedidos.length}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-600">En Preparación</p>
                <p className="text-2xl font-bold text-yellow-800">
                  {pedidos.filter(p => p.estado_pedido === 'en_preparacion').length}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600">Enviados</p>
                <p className="text-2xl font-bold text-purple-800">
                  {pedidos.filter(p => p.estado_pedido === 'enviado').length}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">Entregados</p>
                <p className="text-2xl font-bold text-green-800">
                  {pedidos.filter(p => p.estado_pedido === 'entregado').length}
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de pedidos */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Pedido</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pedidosFiltrados.map(pedido => (
                    <tr key={pedido.id} className={`hover:bg-gray-50 ${!pedido.activo ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{pedido.numero_pedido}</div>
                        <div className="text-sm text-gray-500">{pedido.total_items} items</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900">{pedido.usuario_nombre || 'Cliente'}</div>
                        <div className="text-sm text-gray-500">{pedido.email_contacto}</div>
                        <div className="text-sm text-gray-500">{pedido.telefono_contacto}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div>{new Date(pedido.fecha_pedido).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(pedido.fecha_pedido).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        ${parseFloat(pedido.total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          estadoColors[getEstadoColor(pedido.estado_pedido)]
                        }`}>
                          {getEstadoLabel(pedido.estado_pedido)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActivo(pedido)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition ${
                            pedido.activo 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                          title={`Click para ${pedido.activo ? 'desactivar' : 'activar'}`}
                        >
                          {pedido.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerDetalle(pedido)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver detalle"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            onClick={() => handleCambiarEstado(pedido)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Cambiar estado"
                            disabled={!pedido.activo}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => handleEliminar(pedido)}
                            className={`${
                              pedido.activo 
                                ? 'text-red-600 hover:text-red-900' 
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                            title={pedido.activo ? 'Cancelar y desactivar' : 'Ya está inactivo'}
                            disabled={!pedido.activo}
                          >
                            <i className="fas fa-ban"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pedidosFiltrados.length === 0 && (
                <div className="text-center py-12">
                  <i className="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500">No se encontraron pedidos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de detalle */}
      {showModal && selectedPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Detalle del Pedido {selectedPedido.numero_pedido}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>

              <div className="space-y-6">
                {/* Información del cliente */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Información del Cliente</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Nombre</p>
                      <p className="font-medium">{selectedPedido.usuario_nombre || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedPedido.email_contacto}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Teléfono</p>
                      <p className="font-medium">{selectedPedido.telefono_contacto}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estado</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        estadoColors[getEstadoColor(selectedPedido.estado_pedido)]
                      }`}>
                        {getEstadoLabel(selectedPedido.estado_pedido)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Activo</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedPedido.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedPedido.activo ? 'Sí' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dirección de envío */}
                {selectedPedido.direccion_info && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Dirección de Envío</h3>
                    <p className="text-gray-700">
                      {selectedPedido.direccion_info.calle} {selectedPedido.direccion_info.numero}
                      {selectedPedido.direccion_info.piso_depto && `, ${selectedPedido.direccion_info.piso_depto}`}
                      <br />
                      {selectedPedido.direccion_info.ciudad}, {selectedPedido.direccion_info.provincia}
                      <br />
                      CP: {selectedPedido.direccion_info.codigo_postal}
                    </p>
                  </div>
                )}

                {/* Items del pedido */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Productos</h3>
                  <div className="space-y-3">
                    {selectedPedido.items && selectedPedido.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                        <div className="flex items-center gap-3">
                          {item.producto_info?.imagen_principal && (
                            <img
                              src={item.producto_info.imagen_principal}
                              alt={item.nombre_producto}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{item.nombre_producto}</p>
                            <p className="text-sm text-gray-600">
                              Cantidad: {item.cantidad} x ${parseFloat(item.precio_unitario).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold">${parseFloat(item.subtotal).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totales */}
                <div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${parseFloat(selectedPedido.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Costo de Envío:</span>
                    <span className="font-medium">${parseFloat(selectedPedido.costo_envio).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t-2 border-gray-300 text-lg font-bold">
                    <span>TOTAL:</span>
                    <span className="text-indigo-600">${parseFloat(selectedPedido.total).toFixed(2)}</span>
                  </div>
                </div>

                {/* Notas */}
                {selectedPedido.notas && (
                  <div className="bg-yellow-50 p-4 rounded">
                    <h3 className="font-semibold mb-2">Notas del Pedido</h3>
                    <p className="text-gray-700">{selectedPedido.notas}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-4">
                {selectedPedido.activo && (
                  <button
                    onClick={() => handleCambiarEstado(selectedPedido)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition"
                  >
                    Cambiar Estado
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cambio de estado */}
      {showEstadoModal && selectedPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Cambiar Estado
                </h2>
                <button
                  onClick={() => setShowEstadoModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>

              <form onSubmit={handleSubmitCambioEstado} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pedido
                  </label>
                  <p className="text-gray-900 font-medium">{selectedPedido.numero_pedido}</p>
                  <p className="text-sm text-gray-500">
                    Estado actual: <span className="font-medium">{getEstadoLabel(selectedPedido.estado_pedido)}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nuevo Estado *
                  </label>
                  <select
                    value={nuevoEstado}
                    onChange={(e) => setNuevoEstado(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {estados.map(estado => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentario (opcional)
                  </label>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={3}
                    placeholder="Agrega un comentario sobre el cambio de estado..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition"
                  >
                    Actualizar Estado
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEstadoModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}