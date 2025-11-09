import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import usersService from '../../services/users';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    telefono: '',
    password: '',
    password_confirm: '',
  });

  useEffect(() => {
    cargarUsuarios();
  }, [filterActivo]);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (filterActivo) filters.activo = filterActivo;
      
      const data = await usersService.getAll(filters);
      setUsuarios(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los usuarios: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = async (usuario) => {
    setSelectedUsuario(usuario);
    setShowModal(true);
  };

  const handleEdit = (usuario) => {
    setSelectedUsuario(usuario);
    setFormData({
      username: usuario.username,
      email: usuario.email,
      first_name: usuario.first_name || '',
      last_name: usuario.last_name || '',
      telefono: usuario.telefono || '',
      password: '', // No mostrar password
    });
    setShowEditModal(true);
  };

  const handleDesactivar = async (id) => {
    if (!window.confirm('¿Estás seguro de desactivar este usuario? No se eliminarán sus datos.')) return;

    try {
      await usersService.delete(id);
      alert('Usuario desactivado correctamente');
      cargarUsuarios();
    } catch (err) {
      alert('Error al desactivar el usuario: ' + err.message);
    }
  };

  const handleActivar = async (id) => {
    if (!window.confirm('¿Estás seguro de activar este usuario?')) return;

    try {
      await usersService.activar(id);
      alert('Usuario activado correctamente');
      cargarUsuarios();
    } catch (err) {
      alert('Error al activar el usuario: ' + err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    
    try {
      // Si no se proporciona password, no enviarlo
      const dataToSend = { ...formData };
      if (!dataToSend.password) {
        delete dataToSend.password;
      }

      await usersService.partialUpdate(selectedUsuario.id, dataToSend);
      alert('Usuario actualizado correctamente');
      setShowEditModal(false);
      setSelectedUsuario(null);
      resetForm();
      cargarUsuarios();
    } catch (err) {
      alert('Error al actualizar el usuario: ' + err.message);
      console.error(err);
    }
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    
    // Validar que las contraseñas coincidan
    if (formData.password !== formData.password_confirm) {
      alert('Las contraseñas no coinciden');
      return;
    }

    // Validar longitud mínima de contraseña
    if (formData.password.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      const dataToSend = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        telefono: formData.telefono,
        password: formData.password,
        tipo_usuario: 'cliente',
        is_active: true
      };

      await usersService.create(dataToSend);
      alert('Usuario creado correctamente');
      setShowCreateModal(false);
      resetForm();
      cargarUsuarios();
    } catch (err) {
      const errorMsg = err.response?.data ? 
        JSON.stringify(err.response.data) : 
        err.message;
      alert('Error al crear el usuario: ' + errorMsg);
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      telefono: '',
      password: '',
      password_confirm: '',
    });
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    const matchSearch = 
      usuario.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (usuario.first_name && usuario.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (usuario.last_name && usuario.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (usuario.telefono && usuario.telefono.includes(searchTerm));
    
    return matchSearch;
  });

  if (loading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-indigo-600 mb-4"></i>
            <p className="text-gray-600">Cargando usuarios...</p>
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
              <i className="fas fa-users mr-3"></i>
              Gestión de Usuarios
            </h1>
            <p className="text-gray-600">Administra los clientes del sistema</p>
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
                    placeholder="Buscar por nombre, email, teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <select
                value={filterActivo}
                onChange={(e) => setFilterActivo(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Todos los usuarios</option>
                <option value="true">Solo activos</option>
                <option value="false">Solo inactivos</option>
              </select>
            </div>

            {/* Resumen rápido */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Usuarios</p>
                <p className="text-2xl font-bold text-gray-800">{usuarios.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">Activos</p>
                <p className="text-2xl font-bold text-green-800">
                  {usuarios.filter(u => u.is_active).length}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-600">Inactivos</p>
                <p className="text-2xl font-bold text-red-800">
                  {usuarios.filter(u => !u.is_active).length}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Con Pedidos</p>
                <p className="text-2xl font-bold text-blue-800">
                  {usuarios.filter(u => u.pedidos && u.pedidos.length > 0).length}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition flex items-center gap-2"
              >
                <i className="fas fa-plus"></i>
                Nuevo Cliente
              </button>
            </div>
          </div>

          {/* Tabla de usuarios */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registro</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usuariosFiltrados.map(usuario => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <i className="fas fa-user text-indigo-600"></i>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {usuario.first_name || usuario.last_name 
                                ? `${usuario.first_name} ${usuario.last_name}`.trim()
                                : usuario.username}
                            </div>
                            <div className="text-sm text-gray-500">@{usuario.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {usuario.email}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {usuario.telefono || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div>{new Date(usuario.fecha_registro).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(usuario.fecha_registro).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          usuario.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {usuario.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerDetalle(usuario)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver detalle"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            onClick={() => handleEdit(usuario)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Editar"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {usuario.is_active ? (
                            <button
                              onClick={() => handleDesactivar(usuario.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Desactivar"
                            >
                              <i className="fas fa-user-slash"></i>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivar(usuario.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Activar"
                            >
                              <i className="fas fa-user-check"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {usuariosFiltrados.length === 0 && (
                <div className="text-center py-12">
                  <i className="fas fa-users text-4xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500">No se encontraron usuarios</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de detalle */}
      {showModal && selectedUsuario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Detalle del Usuario
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>

              <div className="space-y-6">
                {/* Avatar */}
                <div className="flex justify-center">
                  <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-indigo-600 text-4xl"></i>
                  </div>
                </div>

                {/* Información básica */}
                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                  <div>
                    <p className="text-sm text-gray-600">Nombre de Usuario</p>
                    <p className="font-medium text-gray-900">{selectedUsuario.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{selectedUsuario.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nombre</p>
                    <p className="font-medium text-gray-900">
                      {selectedUsuario.first_name || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Apellido</p>
                    <p className="font-medium text-gray-900">
                      {selectedUsuario.last_name || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Teléfono</p>
                    <p className="font-medium text-gray-900">
                      {selectedUsuario.telefono || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tipo</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {selectedUsuario.tipo_usuario}
                    </p>
                  </div>
                </div>

                {/* Información de cuenta */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Información de Cuenta</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Estado</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedUsuario.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedUsuario.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fecha de Registro</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedUsuario.fecha_registro).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    handleEdit(selectedUsuario);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition"
                >
                  Editar Usuario
                </button>
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

      {/* Modal de edición */}
      {showEditModal && selectedUsuario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Editar Usuario
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>

              <form onSubmit={handleSubmitEdit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de Usuario *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apellido
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nueva Contraseña (opcional)
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Dejar vacío para no cambiar"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition"
                  >
                    Actualizar Usuario
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                    }}
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

      {/* Modal de crear usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Crear Nuevo Cliente
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>

              <form onSubmit={handleSubmitCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de Usuario *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej: juan_perez"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej: juan@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="Ej: Juan"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apellido
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Ej: Pérez"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      placeholder="Ej: +54 11 1234-5678"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-blue-800">
                        <i className="fas fa-info-circle mr-2"></i>
                        La contraseña debe tener al menos 8 caracteres
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar Contraseña *
                    </label>
                    <input
                      type="password"
                      name="password_confirm"
                      value={formData.password_confirm}
                      onChange={handleInputChange}
                      required
                      minLength={8}
                      placeholder="Repetir contraseña"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition"
                  >
                    Crear Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
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
