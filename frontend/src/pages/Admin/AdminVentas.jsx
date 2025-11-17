import { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import AdminSidebar from '../../components/admin/AdminSidebar';
import KPICard from '../../components/admin/Kpicard';
import ChartCard from '../../components/admin/Chartcard';
import analyticsService from '../../services/analytics';
import paymentsService from '../../services/payments';
import ordersService from '../../services/orders';
import productsService from '../../services/products';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminVentas() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pagos, setPagos] = useState([]);
  const [pagosFiltrados, setPagosFiltrados] = useState([]);
  const [categoriasVendidas, setCategoriasVendidas] = useState([]);

  // Estados de filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Filtros de la tabla
  const [filtroPedido, setFiltroPedido] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');

  // Estado para el modal de edición
  const [pagoEditando, setPagoEditando] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');

  // KPIs
  const [kpis, setKpis] = useState({
    totalVentas: 0,
    cantidadPagos: 0,
    ticketPromedio: 0,
    pagosAprobados: 0,
  });

  // Datos de gráficos
  const [ventasPorDia, setVentasPorDia] = useState([]);

  useEffect(() => {
    // Establecer fechas por defecto (últimos 30 días)
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);

    setFechaHasta(hoy.toISOString().split('T')[0]);
    setFechaDesde(hace30Dias.toISOString().split('T')[0]);
  }, []);

  // Debounce para filtros de fecha
  useEffect(() => {
    if (fechaDesde && fechaHasta && fechaDesde.length === 10 && fechaHasta.length === 10) {
      const timeoutId = setTimeout(() => {
        loadVentasData();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    aplicarFiltros();
  }, [pagos, filtroEstado, filtroPedido, filtroCliente]);

  const loadVentasData = async () => {
    try {
      setLoading(true);
      console.log('📊 Cargando datos de ventas...', { fechaDesde, fechaHasta });

      const pagosResponse = await paymentsService.getAll();
      const todosPagos = pagosResponse.results || pagosResponse || [];

      console.log('💰 Total de pagos obtenidos:', todosPagos.length);

      const pagosEnriquecidos = await Promise.all(
        todosPagos.map(async (pago) => {
          try {
            let nombreCliente = 'Sin nombre';
            let emailCliente = 'Sin email';

            if (pago.pedido) {
              const pedidoId = typeof pago.pedido === 'number' ? pago.pedido : pago.pedido.id;
              const pedido = await ordersService.getById(pedidoId);

              nombreCliente = pedido.usuario_nombre || 'Cliente sin nombre';
              emailCliente = pedido.email_contacto || 'Sin email';

              return {
                ...pago,
                pedido_obj: pedido,
                cliente_nombre: nombreCliente,
                cliente_email: emailCliente,
              };
            }

            return {
              ...pago,
              cliente_nombre: 'Sin pedido',
              cliente_email: 'Sin pedido',
            };
          } catch (error) {
            console.error(`❌ Error obteniendo datos del pago ${pago.id}:`, error);
            return {
              ...pago,
              cliente_nombre: 'Error al cargar',
              cliente_email: 'Error al cargar',
            };
          }
        })
      );

      setPagos(pagosEnriquecidos);
      await calcularVentasPorDia(pagosEnriquecidos);
      await calcularCategoriasVendidas(pagosEnriquecidos);

    } catch (error) {
      console.error('❌ Error cargando datos de ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...pagos];

    resultado = resultado.filter(pago => {
      const fechaPago = (pago.fecha_pago || pago.fecha_creacion || '').split('T')[0];
      return fechaPago >= fechaDesde && fechaPago <= fechaHasta;
    });

    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(pago => pago.estado_pago === filtroEstado);
    }

    if (filtroPedido.trim()) {
      resultado = resultado.filter(pago => {
        const pedidoId = typeof pago.pedido === 'number' ? pago.pedido : pago.pedido?.id;
        return pedidoId?.toString().includes(filtroPedido);
      });
    }

    if (filtroCliente.trim()) {
      resultado = resultado.filter(pago => {
        const nombre = pago.cliente_nombre || '';
        const email = pago.cliente_email || '';
        return nombre.toLowerCase().includes(filtroCliente.toLowerCase()) ||
               email.toLowerCase().includes(filtroCliente.toLowerCase());
      });
    }

    setPagosFiltrados(resultado);
    calcularKPIs(resultado);
  };

  const calcularKPIs = (pagosFiltrados) => {
    const totalVentas = pagosFiltrados.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
    const cantidadPagos = pagosFiltrados.length;
    const pagosAprobados = pagosFiltrados.filter(p => p.estado_pago === 'aprobado').length;
    const ticketPromedio = cantidadPagos > 0 ? totalVentas / cantidadPagos : 0;

    setKpis({
      totalVentas,
      cantidadPagos,
      ticketPromedio,
      pagosAprobados,
    });
  };

  const calcularVentasPorDia = async (pagosData) => {
    const ventasPorFecha = {};

    pagosData.forEach(pago => {
      const fechaPago = (pago.fecha_pago || pago.fecha_creacion || '').split('T')[0];

      if (fechaPago >= fechaDesde && fechaPago <= fechaHasta) {
        if (!ventasPorFecha[fechaPago]) {
          ventasPorFecha[fechaPago] = 0;
        }
        if (pago.estado_pago === 'aprobado') {
          ventasPorFecha[fechaPago] += parseFloat(pago.monto || 0);
        }
      }
    });

    const dias = [];
    const inicio = new Date(fechaDesde);
    const fin = new Date(fechaHasta);

    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      const fechaStr = d.toISOString().split('T')[0];
      dias.push({
        fecha: fechaStr,
        total: ventasPorFecha[fechaStr] || 0
      });
    }

    setVentasPorDia(dias);
  };

  const calcularCategoriasVendidas = async (pagosData) => {
    const categoriasCantidad = {};
    const categoriasMontos = {};

    const pagosFiltradosPorFecha = pagosData.filter(pago => {
      const fechaPago = (pago.fecha_pago || pago.fecha_creacion || '').split('T')[0];
      return fechaPago >= fechaDesde && fechaPago <= fechaHasta && pago.estado_pago === 'aprobado';
    });

    for (const pago of pagosFiltradosPorFecha) {
      try {
        if (pago.pedido_obj && pago.pedido_obj.items) {
          for (const item of pago.pedido_obj.items) {
            const cantidad = parseInt(item.cantidad) || 0;
            const precioUnitario = parseFloat(item.precio_unitario) || 0;
            const montoTotal = cantidad * precioUnitario;
            let categoria = 'Sin categoría';

            if (item.producto_info?.categoria_nombre) {
              categoria = item.producto_info.categoria_nombre;
            } else if (item.producto) {
              const productoId = typeof item.producto === 'number' ? item.producto : item.producto.id;
              try {
                const producto = await productsService.getById(productoId);
                categoria = producto.categoria_nombre || 'Sin categoría';
              } catch (error) {
                console.error(`Error obteniendo producto ${productoId}:`, error);
              }
            }

            if (!categoriasCantidad[categoria]) {
              categoriasCantidad[categoria] = 0;
              categoriasMontos[categoria] = 0;
            }

            categoriasCantidad[categoria] += cantidad;
            categoriasMontos[categoria] += montoTotal;
          }
        }
      } catch (error) {
        console.error(`Error procesando pago ${pago.id}:`, error);
      }
    }

    const categoriasArray = Object.entries(categoriasCantidad)
      .map(([nombre, cantidad]) => ({
        nombre,
        cantidad,
        monto: categoriasMontos[nombre]
      }))
      .sort((a, b) => b.monto - a.monto);

    setCategoriasVendidas(categoriasArray);
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'aprobado': 'bg-green-100 text-green-800',
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'cancelado': 'bg-red-100 text-red-800',
    };
    return badges[estado] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      'aprobado': 'Aprobado',
      'pendiente': 'Pendiente',
      'cancelado': 'Cancelado',
    };
    return textos[estado] || estado;
  };

  const abrirModalEdicion = (pago) => {
    setPagoEditando(pago);
    setNuevoEstado(pago.estado_pago);
  };

  const cerrarModalEdicion = () => {
    setPagoEditando(null);
    setNuevoEstado('');
  };

  const cambiarEstadoPago = async () => {
    if (!pagoEditando || !nuevoEstado) return;

    try {
      const result = await paymentsService.cambiarEstado(pagoEditando.id, nuevoEstado);
      
      if (result.success) {
        setPagos(prevPagos => 
          prevPagos.map(pago => 
            pago.id === pagoEditando.id 
              ? { ...pago, estado_pago: nuevoEstado } 
              : pago
          )
        );
        cerrarModalEdicion();
      } else {
        alert(`Error al actualizar estado: ${result.error}`);
      }
    } catch (error) {
      alert('Error al actualizar el estado del pago');
    }
  };

  const coloresCategoria = [
    'rgba(99, 102, 241, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(234, 179, 8, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(249, 115, 22, 0.8)',
    'rgba(236, 72, 153, 0.8)',
    'rgba(20, 184, 166, 0.8)',
    'rgba(161, 98, 7, 0.8)',
  ];

  const ventasChartData = {
    labels: ventasPorDia.map(v => {
      const fecha = new Date(v.fecha);
      return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
    }),
    datasets: [
      {
        label: 'Ventas Aprobadas ($)',
        data: ventasPorDia.map(v => v.total),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 2,
      },
    ],
  };

  const ventasChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true, 
        position: 'top',
        labels: {
          font: { size: window.innerWidth < 640 ? 10 : 12 },
          padding: window.innerWidth < 640 ? 8 : 10
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `Ventas: $${context.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { 
          callback: (value) => `$${value.toLocaleString()}`,
          font: { size: window.innerWidth < 640 ? 9 : 11 }
        },
      },
      x: {
        ticks: {
          font: { size: window.innerWidth < 640 ? 9 : 11 }
        }
      }
    },
  };

  const totalVentasCategorias = categoriasVendidas.reduce((sum, c) => sum + c.monto, 0);

  const categoriasChartData = {
    labels: categoriasVendidas.map(c => c.nombre),
    datasets: [
      {
        data: categoriasVendidas.map(c => {
          return totalVentasCategorias > 0 ? ((c.monto / totalVentasCategorias) * 100) : 0;
        }),
        backgroundColor: categoriasVendidas.map((_, index) => coloresCategoria[index % coloresCategoria.length]),
        borderWidth: 0,
      },
    ],
  };

  const categoriasChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'bottom', 
        labels: { 
          padding: window.innerWidth < 640 ? 6 : 10, 
          font: { size: window.innerWidth < 640 ? 9 : 11 },
          boxWidth: window.innerWidth < 640 ? 12 : 15
        } 
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const cat = categoriasVendidas[context.dataIndex];
            const porcentaje = totalVentasCategorias > 0 ? ((cat.monto / totalVentasCategorias) * 100).toFixed(1) : 0;
            return [
              `${cat.nombre}`,
              `${porcentaje}%`,
              `$${cat.monto.toLocaleString()}`,
              `${cat.cantidad} unidades`
            ];
          },
        },
      },
    },
  };

  const categoriasBarrasChartData = {
    labels: categoriasVendidas.map(c => c.nombre),
    datasets: [
      {
        label: 'Ventas por Categoría ($)',
        data: categoriasVendidas.map(c => c.monto),
        backgroundColor: categoriasVendidas.map((_, index) => coloresCategoria[index % coloresCategoria.length]),
        borderColor: categoriasVendidas.map((_, index) => {
          const color = coloresCategoria[index % coloresCategoria.length];
          return color.replace('0.8)', '1)');
        }),
        borderWidth: 1,
      },
    ],
  };

  const categoriasBarrasChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const cat = categoriasVendidas[context.dataIndex];
            return [`Ventas: $${context.parsed.y.toLocaleString()}`, `Unidades: ${cat.cantidad}`];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { 
          callback: (value) => `$${value.toLocaleString()}`,
          font: { size: window.innerWidth < 640 ? 9 : 11 }
        },
      },
      x: {
        ticks: {
          font: { size: window.innerWidth < 640 ? 9 : 11 },
          maxRotation: window.innerWidth < 640 ? 45 : 0,
          minRotation: window.innerWidth < 640 ? 45 : 0
        }
      }
    },
  };

  const limpiarFiltros = () => {
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);

    setFechaHasta(hoy.toISOString().split('T')[0]);
    setFechaDesde(hace30Dias.toISOString().split('T')[0]);
    setFiltroEstado('todos');
    setFiltroPedido('');
    setFiltroCliente('');
  };

  const establecerRangoPredef = (dias) => {
    const hoy = new Date();
    const inicio = new Date();
    inicio.setDate(hoy.getDate() - dias);

    setFechaHasta(hoy.toISOString().split('T')[0]);
    setFechaDesde(inicio.toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 sm:h-24 sm:w-24 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-xs sm:text-sm text-gray-600">Cargando datos de ventas...</p>
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
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Panel de Ventas</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600">
            Análisis completo de ventas y pagos
          </p>
        </div>

        {/* Filtros Avanzados */}
        <div className="bg-white shadow-lg rounded-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">
              <i className="fas fa-filter mr-2 text-indigo-600"></i>
              Filtros
            </h3>
            <button
              onClick={limpiarFiltros}
              className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <i className="fas fa-redo mr-1"></i>
              Limpiar filtros
            </button>
          </div>

          {/* Rangos predefinidos */}
          <div className="mb-3 sm:mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => establecerRangoPredef(7)}
              className="px-2 sm:px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 whitespace-nowrap"
            >
              7 días
            </button>
            <button
              onClick={() => establecerRangoPredef(30)}
              className="px-2 sm:px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 whitespace-nowrap"
            >
              30 días
            </button>
            <button
              onClick={() => establecerRangoPredef(90)}
              className="px-2 sm:px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 whitespace-nowrap"
            >
              90 días
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {/* Fecha Desde */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <i className="fas fa-calendar mr-1"></i>
                Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <i className="fas fa-calendar mr-1"></i>
                Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <i className="fas fa-check-circle mr-1"></i>
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="todos">Todos</option>
                <option value="aprobado">Aprobado</option>
                <option value="pendiente">Pendiente</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="mt-3 text-xs text-gray-600">
            Mostrando <span className="font-semibold">{pagosFiltrados.length}</span> de{' '}
            <span className="font-semibold">{pagos.length}</span> pagos
          </div>
        </div>

        {/* KPIs - UNA SOLA COLUMNA EN MÓVIL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <KPICard
            title="Ventas Totales"
            value={`$${kpis.totalVentas.toLocaleString()}`}
            icon="fas fa-dollar-sign"
            color="indigo"
          />
          <KPICard
            title="Total Pagos"
            value={kpis.cantidadPagos}
            icon="fas fa-receipt"
            color="green"
          />
          <KPICard
            title="Ticket Promedio"
            value={`$${kpis.ticketPromedio.toLocaleString()}`}
            icon="fas fa-chart-line"
            color="purple"
          />
          <KPICard
            title="Pagos Aprobados"
            value={kpis.pagosAprobados}
            icon="fas fa-check-circle"
            color="blue"
          />
        </div>

        {/* Gráficos - Ancho reducido */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 sm:mb-6 max-w-full">
          {/* Gráfico de Ventas por Día */}
          <div className="w-full">
            <ChartCard title="Evolución de Ventas" icon="fas fa-chart-line">
              <div className="relative w-full" style={{ height: '200px' }}>
                <Line data={ventasChartData} options={ventasChartOptions} />
              </div>
            </ChartCard>
          </div>

          {/* Gráfico de Categorías Vendidas */}
          <div className="w-full">
            <ChartCard title="Distribución por Categoría (%)" icon="fas fa-chart-pie">
              <div className="relative w-full" style={{ height: '200px' }}>
                {categoriasVendidas.length > 0 ? (
                  <Doughnut data={categoriasChartData} options={categoriasChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <i className="fas fa-chart-pie text-2xl sm:text-3xl mb-2 opacity-50"></i>
                      <p className="text-xs">No hay datos</p>
                    </div>
                  </div>
                )}
              </div>
            </ChartCard>
          </div>
        </div>

        {/* Gráfico de Barras de Categorías */}
        <div className="mb-4 sm:mb-6 max-w-full">
          <ChartCard title="Ventas por Categoría" icon="fas fa-chart-bar">
            <div className="relative w-full" style={{ height: '250px' }}>
              {categoriasVendidas.length > 0 ? (
                <Bar data={categoriasBarrasChartData} options={categoriasBarrasChartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <i className="fas fa-chart-bar text-2xl sm:text-3xl mb-2 opacity-50"></i>
                    <p className="text-xs">No hay datos</p>
                  </div>
                </div>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Tabla de Pagos */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-3 sm:px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">
              <i className="fas fa-table mr-2 text-indigo-600"></i>
              Detalle de Pagos
            </h3>

            {/* Filtros de la tabla */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  <i className="fas fa-shopping-bag mr-1"></i>
                  Pedido ID
                </label>
                <input
                  type="text"
                  placeholder="ID..."
                  value={filtroPedido}
                  onChange={(e) => setFiltroPedido(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  <i className="fas fa-user mr-1"></i>
                  Cliente
                </label>
                <input
                  type="text"
                  placeholder="Nombre o email..."
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '600px' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Pedido
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Monto
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                    Método
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Acc.
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagosFiltrados.length > 0 ? (
                  pagosFiltrados.map((pago) => (
                    <tr key={pago.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                        #{pago.id}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-700">
                        {new Date(pago.fecha_pago || pago.fecha_creacion).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-700">
                        <div className="max-w-[120px]">
                          <div className="font-medium truncate">
                            {pago.cliente_nombre || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {pago.cliente_email || 'Sin email'}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-700">
                        #{typeof pago.pedido === 'number' ? pago.pedido : pago.pedido?.id || 'N/A'}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs font-semibold text-gray-900">
                        ${parseFloat(pago.monto || 0).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(pago.estado_pago)}`}>
                          {getEstadoTexto(pago.estado_pago)}
                        </span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-700 hidden sm:table-cell">
                        {pago.metodo_pago || 'MP'}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs">
                        <button
                          onClick={() => abrirModalEdicion(pago)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center">
                      <div className="text-gray-500">
                        <i className="fas fa-inbox text-2xl mb-2"></i>
                        <p className="text-xs">No se encontraron pagos</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal de Edición */}
      {pagoEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Editar Estado del Pago #{pagoEditando.id}
            </h3>
            
            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Estado Actual: <span className={`px-2 py-1 rounded text-xs font-semibold ${getEstadoBadge(pagoEditando.estado_pago)}`}>
                  {getEstadoTexto(pagoEditando.estado_pago)}
                </span>
              </label>
            </div>

            <div className="mb-6">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Nuevo Estado
              </label>
              <select
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="aprobado">Aprobado</option>
                <option value="pendiente">Pendiente</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cambiarEstadoPago}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm"
              >
                Guardar
              </button>
              <button
                onClick={cerrarModalEdicion}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}