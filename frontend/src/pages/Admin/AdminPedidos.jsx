import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import ordersService from '../../services/orders';

export default function AdminPedidos() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const getEstadoColor = (estado) => {
    const estadoObj = estados.find(e => e.value === estado);
    return estadoObj ? estadoObj.color : 'gray';
  };

  const getEstadoLabel = (estado) => {
    const estadoObj = estados.find(e => e.value === estado);
    return estadoObj ? estadoObj.label : estado;
  };

  // ✅ Función para determinar el tipo de envío
  const getTipoEnvio = (pedido) => {
    // Si tiene direccion_info, es envío a domicilio
    if (pedido.direccion_info) {
      return 'envio';
    }
    // Si no tiene dirección, es retiro en local
    return 'retiro';
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
        <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
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
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 w-full lg:w-auto overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Botón hamburguesa para móvil */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            <i className="fas fa-bars text-xl"></i>
          </button>

          {/* Header */}
          <div className="mb-6 sm:mb-8 pt-12 lg:pt-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              <i className="fas fa-shopping-cart mr-2 sm:mr-3"></i>
              Gestión de Pedidos
            </h1>
            <p className="text-sm sm:text-base text-gray-600">Administra y monitorea todos los pedidos</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded mb-4 sm:mb-6 text-sm">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          {/* Filtros y búsqueda */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm sm:text-base"></i>
                  <input
                    type="text"
                    placeholder="Buscar por número, email, teléfono o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Todos los estados</option>
                {estados.map(estado => (
                  <option key={estado.value} value={estado.value}>
                    {estado.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Resumen rápido */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600">Total Pedidos</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800">{pedidos.length}</p>
              </div>
              <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-yellow-600">En Preparación</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-800">
                  {pedidos.filter(p => p.estado_pedido === 'en_preparacion').length}
                </p>
              </div>
              <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-purple-600">Enviados</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-800">
                  {pedidos.filter(p => p.estado_pedido === 'enviado').length}
                </p>
              </div>
              <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-green-600">Entregados</p>
                <p className="text-xl sm:text-2xl font-bold text-green-800">
                  {pedidos.filter(p => p.estado_pedido === 'entregado').length}
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de pedidos */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Pedido</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pedidosFiltrados.map(pedido => (
                    <tr key={pedido.id} className={`hover:bg-gray-50 ${!pedido.activo ? 'opacity-50' : ''}`}>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="font-medium text-gray-900 text-xs sm:text-sm">{pedido.numero_pedido}</div>
                        <div className="text-xs text-gray-500">{pedido.total_items} items</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="text-gray-900 text-xs sm:text-sm">{pedido.usuario_nombre || 'Cliente'}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">{pedido.email_contacto}</div>
                        <div className="text-xs text-gray-500">{pedido.telefono_contacto}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-600 text-xs sm:text-sm">
                        <div>{new Date(pedido.fecha_pedido).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500 hidden sm:block">
                          {new Date(pedido.fecha_pedido).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-gray-900 text-xs sm:text-sm">
                        ${parseFloat(pedido.total).toFixed(2)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          estadoColors[getEstadoColor(pedido.estado_pedido)]
                        }`}>
                          <span className="hidden sm:inline">{getEstadoLabel(pedido.estado_pedido)}</span>
                          <span className="sm:hidden">{getEstadoLabel(pedido.estado_pedido).substring(0, 3)}</span>
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          pedido.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {pedido.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerDetalle(pedido)}
                            className="text-blue-600 hover:text-blue-900 text-sm sm:text-base"
                            title="Ver detalle"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            onClick={() => handleCambiarEstado(pedido)}
                            className="text-indigo-600 hover:text-indigo-900 text-sm sm:text-base"
                            title="Cambiar estado"
                            disabled={!pedido.activo}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => handleEliminar(pedido)}
                            className={`text-sm sm:text-base ${
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
                <div className="text-center py-8 sm:py-12">
                  <i className="fas fa-inbox text-3xl sm:text-4xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500 text-sm sm:text-base">No se encontraron pedidos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de detalle - RESPONSIVE */}
      {showModal && selectedPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-none sm:rounded-lg w-full sm:max-w-4xl sm:max-h-[90vh] sm:overflow-y-auto my-0 sm:my-4">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6 sticky top-0 bg-white z-10 pb-3 border-b sm:border-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                  Pedido {selectedPedido.numero_pedido}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl sm:text-2xl"></i>
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* Información del cliente */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-base sm:text-lg mb-3">
                    <i className="fas fa-user mr-2 text-indigo-600"></i>
                    Información del Cliente
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Nombre</p>
                      <p className="font-medium text-sm sm:text-base">{selectedPedido.usuario_nombre || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Email</p>
                      <p className="font-medium text-sm sm:text-base break-words">{selectedPedido.email_contacto}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Teléfono</p>
                      <p className="font-medium text-sm sm:text-base">{selectedPedido.telefono_contacto}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Estado</p>
                      <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        estadoColors[getEstadoColor(selectedPedido.estado_pedido)]
                      }`}>
                        {getEstadoLabel(selectedPedido.estado_pedido)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Activo</p>
                      <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedPedido.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedPedido.activo ? 'Sí' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Información de envío y dirección */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-base sm:text-lg mb-3">
                    <i className="fas fa-shipping-fast mr-2 text-indigo-600"></i>
                    Información de Envío
                  </h3>
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-3">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">Tipo de Entrega</p>
                      <p className="font-medium text-sm sm:text-base">
                        {/* ✅ Usar getTipoEnvio para determinar el tipo */}
                        {getTipoEnvio(selectedPedido) === 'envio' ? (
                          <span className="text-purple-700">
                            <i className="fas fa-truck mr-1"></i>
                            Envío a Domicilio
                          </span>
                        ) : (
                          <span className="text-blue-700">
                            <i className="fas fa-store mr-1"></i>
                            Retiro en Local
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">Costo de Envío</p>
                      <p className="font-medium text-sm sm:text-base">
                        ${parseFloat(selectedPedido.costo_envio || 0).toFixed(2)}
                      </p>
                    </div>

                    {/* ✅ Mostrar dirección solo si existe direccion_info */}
                    {selectedPedido.direccion_info && (
                      <div className="border-t pt-3">
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 font-semibold">
                          <i className="fas fa-map-marker-alt mr-1"></i>
                          Dirección de Entrega
                        </p>
                        <div className="text-gray-700 text-sm sm:text-base space-y-1">
                          <p className="font-medium">
                            {selectedPedido.direccion_info.calle} {selectedPedido.direccion_info.numero}
                            {selectedPedido.direccion_info.piso_depto && `, ${selectedPedido.direccion_info.piso_depto}`}
                          </p>
                          <p>
                            {selectedPedido.direccion_info.ciudad}, {selectedPedido.direccion_info.provincia}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            Código Postal: {selectedPedido.direccion_info.codigo_postal}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ✅ Mensaje si es retiro en local */}
                    {!selectedPedido.direccion_info && (
                      <div className="border-t pt-3">
                        <p className="text-xs sm:text-sm text-blue-700 font-medium">
                          <i className="fas fa-info-circle mr-1"></i>
                          El cliente retirará el pedido en el local
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items del pedido */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-base sm:text-lg mb-3">
                    <i className="fas fa-box mr-2 text-indigo-600"></i>
                    Productos ({selectedPedido.items?.length || 0})
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    {selectedPedido.items && selectedPedido.items.map((item, index) => (
                      <div key={index} className="flex flex-col sm:flex-row justify-between items-start bg-gray-50 p-2 sm:p-3 rounded gap-2 sm:gap-0">
                        <div className="flex items-start gap-2 sm:gap-3 flex-1 w-full sm:w-auto">
                          {item.producto_info?.imagen_principal && (
                            <img
                              src={item.producto_info.imagen_principal}
                              alt={item.nombre_producto}
                              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{item.nombre_producto}</p>
                            
                            {item.variante_info && (
                              <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                                {item.variante_info.talla && (
                                  <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-medium">
                                    Talla: {item.variante_info.talla}
                                  </span>
                                )}
                                {item.variante_info.color && (
                                  <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md font-medium">
                                    Color: {item.variante_info.color}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              Cantidad: {item.cantidad} x ${parseFloat(item.precio_unitario).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold text-sm sm:text-base sm:ml-4 self-end sm:self-auto">${parseFloat(item.subtotal).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totales */}
                <div>
                  <div className="flex justify-between py-2 text-sm sm:text-base">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${parseFloat(selectedPedido.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm sm:text-base">
                    <span className="text-gray-600">Costo de Envío:</span>
                    <span className="font-medium">${parseFloat(selectedPedido.costo_envio).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t-2 border-gray-300 text-base sm:text-lg font-bold">
                    <span>TOTAL:</span>
                    <span className="text-indigo-600">${parseFloat(selectedPedido.total).toFixed(2)}</span>
                  </div>
                </div>

                {/* Notas */}
                {selectedPedido.notas && (
                  <div className="bg-yellow-50 p-3 sm:p-4 rounded border border-yellow-200">
                    <h3 className="font-semibold text-sm sm:text-base mb-2">
                      <i className="fas fa-sticky-note mr-2 text-yellow-600"></i>
                      Notas del Pedido
                    </h3>
                    <p className="text-gray-700 text-xs sm:text-sm">{selectedPedido.notas}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
                {selectedPedido.activo && (
                  <button
                    onClick={() => {
                      setShowModal(false);
                      handleCambiarEstado(selectedPedido);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition text-sm sm:text-base"
                  >
                    Cambiar Estado
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition text-sm sm:text-base"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cambio de estado - RESPONSIVE */}
      {showEstadoModal && selectedPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                  Cambiar Estado
                </h2>
                <button
                  onClick={() => setShowEstadoModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl sm:text-2xl"></i>
                </button>
              </div>

              <form onSubmit={handleSubmitCambioEstado} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Pedido
                  </label>
                  <p className="text-gray-900 font-medium text-sm sm:text-base">{selectedPedido.numero_pedido}</p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Estado actual: <span className="font-medium">{getEstadoLabel(selectedPedido.estado_pedido)}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Nuevo Estado *
                  </label>
                  <select
                    value={nuevoEstado}
                    onChange={(e) => setNuevoEstado(e.target.value)}
                    required
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {estados.map(estado => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Comentario (opcional)
                  </label>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={3}
                    placeholder="Agrega un comentario sobre el cambio de estado..."
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-3 sm:pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition text-sm sm:text-base"
                  >
                    Actualizar Estado
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEstadoModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition text-sm sm:text-base"
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