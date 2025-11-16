import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import productsService from '../../services/products';

export default function AdminProductos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [tallas, setTallas] = useState([]);
  const [colores, setColores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  
  // Estado del formulario de producto
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio_base: '',
    sexo: '',
    material: '',
    categoria: '',
    activo: true,
    destacado: false,
    imagen_principal: null
  });

  // Estado para nueva categoría
  const [nuevaCategoria, setNuevaCategoria] = useState({
    nombre: '',
    descripcion: ''
  });

  // Estado para las variantes con imágenes
  const [variantes, setVariantes] = useState([
    { 
      talla: '', 
      color: '', 
      stock: 0, 
      activo: true,
      imagenes: [],
      imagenesExistentes: []
    }
  ]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [productosData, categoriasData, tallasData, coloresData] = await Promise.all([
        productsService.getAll(),
        productsService.getCategories(),
        productsService.getTallas(),
        productsService.getColores()
      ]);
      setProductos(productosData);
      setCategorias(categoriasData);
      setTallas(tallasData);
      setColores(coloresData);
      setError(null);
    } catch (err) {
      setError('Error al cargar los datos: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Crear nueva categoría
  const handleCrearCategoria = async (e) => {
    e.preventDefault();
    
    if (!nuevaCategoria.nombre.trim()) {
      alert('El nombre de la categoría es obligatorio');
      return;
    }

    try {
      const categoriaCreada = await productsService.createCategory({
        nombre: nuevaCategoria.nombre,
        descripcion: nuevaCategoria.descripcion || ''
      });

      // Actualizar lista de categorías
      setCategorias([...categorias, categoriaCreada]);
      
      // Seleccionar automáticamente la nueva categoría
      setFormData(prev => ({
        ...prev,
        categoria: categoriaCreada.id
      }));

      // Limpiar y cerrar modal
      setNuevaCategoria({ nombre: '', descripcion: '' });
      setShowCategoriaModal(false);
      
      alert('Categoría creada exitosamente');
    } catch (err) {
      alert('Error al crear la categoría: ' + err.message);
      console.error(err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        imagen_principal: file
      }));
    }
  };

  // ============ GESTIÓN DE VARIANTES ============

  const handleVarianteChange = (index, field, value) => {
    const nuevasVariantes = [...variantes];
    nuevasVariantes[index][field] = value;
    setVariantes(nuevasVariantes);
  };

  const handleVarianteImagenesChange = (index, files) => {
    const nuevasVariantes = [...variantes];
    const nuevasImagenes = Array.from(files);
    nuevasVariantes[index].imagenes = [...nuevasVariantes[index].imagenes, ...nuevasImagenes];
    setVariantes(nuevasVariantes);
  };

  const eliminarImagenVariante = (varianteIndex, imagenIndex) => {
    const nuevasVariantes = [...variantes];
    nuevasVariantes[varianteIndex].imagenes.splice(imagenIndex, 1);
    setVariantes(nuevasVariantes);
  };

  const eliminarImagenExistenteVariante = async (varianteIndex, imagenId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta imagen?')) return;
    
    try {
      await productsService.deleteImagen(imagenId);
      const nuevasVariantes = [...variantes];
      nuevasVariantes[varianteIndex].imagenesExistentes = 
        nuevasVariantes[varianteIndex].imagenesExistentes.filter(img => img.id !== imagenId);
      setVariantes(nuevasVariantes);
      alert('Imagen eliminada correctamente');
    } catch (err) {
      alert('Error al eliminar la imagen: ' + err.message);
    }
  };

  const agregarVariante = () => {
    setVariantes([...variantes, { 
      talla: '', 
      color: '', 
      stock: 0,
      activo: true,
      imagenes: [],
      imagenesExistentes: []
    }]);
  };

  const eliminarVariante = (index) => {
    if (variantes.length > 1) {
      const nuevasVariantes = variantes.filter((_, i) => i !== index);
      setVariantes(nuevasVariantes);
    } else {
      alert('Debe haber al menos una variante');
    }
  };

  // ============ SUBMIT DEL FORMULARIO ============

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const variantesValidas = variantes.filter(v => v.talla && v.color);
      
      if (variantesValidas.length === 0) {
        alert('Debes agregar al menos una variante con talla y color');
        return;
      }

      const dataToSend = {
        nombre: formData.nombre,
        precio_base: formData.precio_base,
        sexo: formData.sexo || null,
        categoria: formData.categoria,
        activo: formData.activo,
        destacado: formData.destacado,
        descripcion: formData.descripcion || '',
        material: formData.material || '',
      };

      console.log('📤 Paso 1: Guardando producto...');

      let productoId;
      
      if (formData.imagen_principal instanceof File) {
        const formDataToSend = new FormData();
        
        Object.keys(dataToSend).forEach(key => {
          formDataToSend.append(key, dataToSend[key]);
        });
        
        formDataToSend.append('imagen_principal', formData.imagen_principal);
        formDataToSend.append('variantes', JSON.stringify(
          variantesValidas.map(v => ({
            talla: parseInt(v.talla),
            color: parseInt(v.color),
            stock: parseInt(v.stock) || 0,
            activo: v.activo !== false
          }))
        ));

        const productoCreado = editingProduct 
          ? await productsService.update(editingProduct.id, formDataToSend)
          : await productsService.create(formDataToSend);
        
        productoId = productoCreado.id;
      } else {
        dataToSend.variantes = variantesValidas.map(v => ({
          talla: parseInt(v.talla),
          color: parseInt(v.color),
          stock: parseInt(v.stock) || 0,
          activo: v.activo !== false
        }));

        const productoCreado = editingProduct 
          ? await productsService.update(editingProduct.id, dataToSend)
          : await productsService.create(dataToSend);
        
        productoId = productoCreado.id;
      }

      console.log('✅ Producto guardado:', productoId);

      console.log('📤 Paso 2: Obteniendo variantes creadas...');
      const productoCompleto = await productsService.getById(productoId);
      const variantesCreadas = productoCompleto.variantes;

      console.log('✅ Variantes obtenidas:', variantesCreadas);

      console.log('📤 Paso 3: Subiendo imágenes de variantes...');
      
      for (let i = 0; i < variantesValidas.length; i++) {
        const varianteLocal = variantesValidas[i];
        
        const varianteCreada = variantesCreadas.find(vc => 
          vc.talla === parseInt(varianteLocal.talla) && 
          vc.color === parseInt(varianteLocal.color)
        );

        if (!varianteCreada) {
          console.warn(`⚠️ No se encontró variante creada para talla ${varianteLocal.talla} y color ${varianteLocal.color}`);
          continue;
        }

        console.log(`🔍 Variante encontrada:`, {
          id: varianteCreada.id,
          talla: varianteLocal.talla,
          color: varianteLocal.color,
          imagenes: varianteLocal.imagenes.length
        });

        if (varianteLocal.imagenes && varianteLocal.imagenes.length > 0) {
          for (let j = 0; j < varianteLocal.imagenes.length; j++) {
            const imagenFile = varianteLocal.imagenes[j];
            
            console.log(`📷 Subiendo imagen ${j + 1}/${varianteLocal.imagenes.length} para variante ${varianteCreada.id}...`);
            
            try {
              const resultado = await productsService.uploadImagen({
                producto: productoId,
                variante: varianteCreada.id,
                imagen: imagenFile,
                orden: j + 1
              });
              
              console.log(`✅ Imagen ${j + 1} subida correctamente:`, resultado);
            } catch (imgErr) {
              console.error(`❌ Error al subir imagen ${j + 1}:`, imgErr);
              console.error(`❌ Response:`, imgErr.response?.data);
            }
          }
        } else {
          console.log(`ℹ️ Variante ${varianteCreada.id} no tiene imágenes para subir`);
        }
      }

      alert(editingProduct ? 'Producto actualizado correctamente' : 'Producto creado correctamente');
      setShowModal(false);
      resetForm();
      cargarDatos();
    } catch (err) {
      console.error('❌ Error completo:', err);
      console.error('❌ Response:', err.response?.data);
      alert('Error al guardar el producto: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = async (producto) => {
    setEditingProduct(producto);
    
    try {
      const productoCompleto = await productsService.getById(producto.id);
      
      setFormData({
        nombre: productoCompleto.nombre,
        descripcion: productoCompleto.descripcion || '',
        precio_base: productoCompleto.precio_base,
        sexo: productoCompleto.sexo || '',
        material: productoCompleto.material || '',
        categoria: productoCompleto.categoria,
        activo: productoCompleto.activo,
        destacado: productoCompleto.destacado,
        imagen_principal: null
      });

      if (productoCompleto.variantes && productoCompleto.variantes.length > 0) {
        setVariantes(productoCompleto.variantes.map(v => ({
          id: v.id,
          talla: v.talla,
          color: v.color,
          stock: v.stock,
          activo: v.activo,
          imagenes: [],
          imagenesExistentes: v.imagenes || []
        })));
      } else {
        setVariantes([{ 
          talla: '', 
          color: '', 
          stock: 0, 
          activo: true, 
          imagenes: [], 
          imagenesExistentes: [] 
        }]);
      }
      
      setShowModal(true);
    } catch (err) {
      alert('Error al cargar los datos del producto: ' + err.message);
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de desactivar este producto? El producto no se eliminará, solo se marcará como inactivo.')) return;

    try {
      await productsService.delete(id);
      alert('Producto desactivado correctamente');
      cargarDatos();
    } catch (err) {
      alert('Error al desactivar el producto: ' + err.message);
      console.error(err);
    }
  };

  const handleToggleActivo = async (producto) => {
    try {
      await productsService.toggleActivo(producto.id);
      alert(`Producto ${producto.activo ? 'desactivado' : 'activado'} correctamente`);
      cargarDatos();
    } catch (err) {
      alert('Error al cambiar estado del producto: ' + err.message);
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio_base: '',
      sexo: '',
      material: '',
      categoria: '',
      activo: true,
      destacado: false,
      imagen_principal: null
    });
    setVariantes([{ 
      talla: '', 
      color: '', 
      stock: 0, 
      activo: true, 
      imagenes: [], 
      imagenesExistentes: [] 
    }]);
    setEditingProduct(null);
  };

  const productosFiltrados = productos.filter(producto => {
    const matchSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       producto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = !filterCategoria || producto.categoria === parseInt(filterCategoria);
    return matchSearch && matchCategoria;
  });

  if (loading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-indigo-600 mb-4"></i>
            <p className="text-gray-600">Cargando productos...</p>
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
              <i className="fas fa-shopping-bag mr-3"></i>
              Gestión de Productos
            </h1>
            <p className="text-gray-600">Administra el catálogo de productos con variantes e imágenes</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          {/* Filtros y búsqueda */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <select
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition flex items-center gap-2"
              >
                <i className="fas fa-plus"></i>
                Nuevo Producto
              </button>
            </div>
          </div>

          {/* Tabla de productos */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Imagen</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sexo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variantes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productosFiltrados.map(producto => {
                    const categoria = categorias.find(c => c.id === producto.categoria);
                    return (
                      <tr key={producto.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          {producto.imagen_principal ? (
                            <img
                              src={producto.imagen_principal}
                              alt={producto.nombre}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                              <i className="fas fa-image text-gray-400"></i>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{producto.nombre}</div>
                          {producto.destacado && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                              <i className="fas fa-star mr-1"></i>Destacado
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {categoria?.nombre || 'Sin categoría'}
                        </td>
                        <td className="px-6 py-4">
                          {producto.sexo ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              producto.sexo === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                            }`}>
                              {producto.sexo === 'M' ? '👨 Masculino' : '👩 Femenino'}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          ${parseFloat(producto.precio_base).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            producto.stock_total > 10 ? 'bg-green-100 text-green-800' :
                            producto.stock_total > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {producto.stock_total || 0} unidades
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {producto.variantes_count || 0} variantes
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActivo(producto)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition ${
                              producto.activo 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                            title={`Click para ${producto.activo ? 'desactivar' : 'activar'}`}
                          >
                            {producto.activo ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(producto)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Editar"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(producto.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Desactivar"
                            >
                              <i className="fas fa-ban"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {productosFiltrados.length === 0 && (
                <div className="text-center py-12">
                  <i className="fas fa-box-open text-4xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500">No se encontraron productos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de crear/editar producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* INFORMACIÓN BÁSICA */}
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Información Básica</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción
                      </label>
                      <textarea
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categoría *
                      </label>
                      <div className="flex gap-2">
                        <select
                          name="categoria"
                          value={formData.categoria}
                          onChange={handleInputChange}
                          required
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Seleccionar categoría</option>
                          {categorias.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCategoriaModal(true)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2"
                          title="Crear nueva categoría"
                        >
                          <i className="fas fa-plus"></i>
                          Nueva
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio *
                      </label>
                      <input
                        type="number"
                        name="precio_base"
                        value={formData.precio_base}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sexo
                      </label>
                      <select
                        name="sexo"
                        value={formData.sexo}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar sexo</option>
                        <option value="M">👨 Masculino</option>
                        <option value="F">👩 Femenino</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Todas las variantes serán del mismo sexo
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Material
                      </label>
                      <input
                        type="text"
                        name="material"
                        value={formData.material}
                        onChange={handleInputChange}
                        placeholder="Ej: Algodón, Poliéster"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Imagen Principal
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      {editingProduct?.imagen_principal && (
                        <p className="text-sm text-gray-500 mt-2">
                          Imagen actual: {editingProduct.imagen_principal.split('/').pop()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="activo"
                          checked={formData.activo}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Activo</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="destacado"
                          checked={formData.destacado}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Destacado</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* VARIANTES */}
                <div className="border-b pb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">
                      Variantes (Tallas, Colores e Imágenes)
                    </h3>
                    <button
                      type="button"
                      onClick={agregarVariante}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                    >
                      <i className="fas fa-plus"></i>
                      Agregar Variante
                    </button>
                  </div>

                  <div className="space-y-6">
                    {variantes.map((variante, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-sm font-semibold text-gray-700 bg-indigo-100 px-3 py-1 rounded-full">
                            Variante #{index + 1}
                          </span>
                          {variantes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => eliminarVariante(index)}
                              className="text-red-600 hover:text-red-800 bg-red-50 px-3 py-1 rounded-lg"
                              title="Eliminar variante"
                            >
                              <i className="fas fa-trash mr-1"></i>
                              Eliminar
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Talla *
                            </label>
                            <select
                              value={variante.talla}
                              onChange={(e) => handleVarianteChange(index, 'talla', e.target.value)}
                              required
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                              <option value="">Seleccionar</option>
                              {tallas.map(t => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Color *
                            </label>
                            <select
                              value={variante.color}
                              onChange={(e) => handleVarianteChange(index, 'color', e.target.value)}
                              required
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                              <option value="">Seleccionar</option>
                              {colores.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Stock *
                            </label>
                            <input
                              type="number"
                              value={variante.stock}
                              onChange={(e) => handleVarianteChange(index, 'stock', e.target.value)}
                              min="0"
                              required
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        {/* IMÁGENES DE LA VARIANTE */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <i className="fas fa-images mr-2"></i>
                            Imágenes de esta variante
                          </label>
                          
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleVarianteImagenesChange(index, e.target.files)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3"
                          />

                          {/* Preview de imágenes existentes */}
                          {variante.imagenesExistentes && variante.imagenesExistentes.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-600 mb-2">Imágenes actuales:</p>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {variante.imagenesExistentes.map((img, imgIndex) => (
                                  <div key={imgIndex} className="relative group">
                                    <img
                                      src={img.imagen_url}
                                      alt={`Variante ${index + 1} - Imagen ${imgIndex + 1}`}
                                      className="w-full h-20 object-cover rounded border"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => eliminarImagenExistenteVariante(index, img.id)}
                                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                                      title="Eliminar"
                                    >
                                      <i className="fas fa-times"></i>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Preview de nuevas imágenes */}
                          {variante.imagenes && variante.imagenes.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-600 mb-2">Nuevas imágenes a subir:</p>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {variante.imagenes.map((imagen, imgIndex) => (
                                  <div key={imgIndex} className="relative group">
                                    <img
                                      src={URL.createObjectURL(imagen)}
                                      alt={`Preview ${imgIndex + 1}`}
                                      className="w-full h-20 object-cover rounded border border-green-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => eliminarImagenVariante(index, imgIndex)}
                                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                                      title="Quitar"
                                    >
                                      <i className="fas fa-times"></i>
                                    </button>
                                    <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs px-1 rounded">
                                      Nuevo
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!variante.imagenes?.length && !variante.imagenesExistentes?.length && (
                            <p className="text-xs text-gray-500 text-center py-4">
                              No hay imágenes para esta variante
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {variantes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-box-open text-3xl mb-2"></i>
                      <p>No hay variantes agregadas</p>
                      <p className="text-sm">Haz clic en "Agregar Variante" para comenzar</p>
                    </div>
                  )}
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg transition font-medium"
                  >
                    <i className="fas fa-save mr-2"></i>
                    {editingProduct ? 'Actualizar' : 'Crear'} Producto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg transition font-medium"
                  >
                    <i className="fas fa-times mr-2"></i>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de crear nueva categoría */}
      {showCategoriaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  <i className="fas fa-folder-plus mr-2 text-green-600"></i>
                  Nueva Categoría
                </h3>
                <button
                  onClick={() => {
                    setShowCategoriaModal(false);
                    setNuevaCategoria({ nombre: '', descripcion: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleCrearCategoria} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la categoría *
                  </label>
                  <input
                    type="text"
                    value={nuevaCategoria.nombre}
                    onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, nombre: e.target.value })}
                    placeholder="Ej: Remeras, Pantalones, etc."
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={nuevaCategoria.descripcion}
                    onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, descripcion: e.target.value })}
                    placeholder="Descripción de la categoría"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition font-medium"
                  >
                    <i className="fas fa-check mr-2"></i>
                    Crear Categoría
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoriaModal(false);
                      setNuevaCategoria({ nombre: '', descripcion: '' });
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition font-medium"
                  >
                    <i className="fas fa-times mr-2"></i>
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