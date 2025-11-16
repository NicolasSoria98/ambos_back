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
import KPICard from '../../components/admin/KpiCard';
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
  const [loading, setLoading] = useState(true);
  const [pagos, setPagos] = useState([]);
  const [pagosFiltrados, setPagosFiltrados] = useState([]);
  const [categoriasVendidas, setCategoriasVendidas] = useState([]);

  // Estados de filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Filtros de la tabla (movidos de arriba)
  const [filtroPedido, setFiltroPedido] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');

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

  // Debounce para filtros de fecha - espera 1 segundo después del último cambio
  useEffect(() => {
    // Validar que ambas fechas estén completas (formato YYYY-MM-DD tiene 10 caracteres)
    if (fechaDesde && fechaHasta && fechaDesde.length === 10 && fechaHasta.length === 10) {
      const timeoutId = setTimeout(() => {
        loadVentasData();
      }, 1000); // Espera 1 segundo después del último cambio

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

      // Obtener TODOS los pagos
      const pagosResponse = await paymentsService.getAll();
      const todosPagos = pagosResponse.results || pagosResponse || [];

      console.log('💰 Total de pagos obtenidos:', todosPagos.length);

      // Enriquecer pagos con información del pedido y cliente
      const pagosEnriquecidos = await Promise.all(
        todosPagos.map(async (pago) => {
          try {
            let nombreCliente = 'Sin nombre';
            let emailCliente = 'Sin email';

            // Obtener información del pedido (que incluye datos del usuario)
            if (pago.pedido) {
              const pedidoId = typeof pago.pedido === 'number' ? pago.pedido : pago.pedido.id;
              const pedido = await ordersService.getById(pedidoId);

              console.log(`📦 Pedido ${pedidoId}:`, pedido);

              // El serializer del pedido ya trae 'usuario_nombre' calculado
              nombreCliente = pedido.usuario_nombre || 'Cliente sin nombre';
              emailCliente = pedido.email_contacto || 'Sin email';

              console.log(`✅ Cliente del pedido #${pedidoId}: ${nombreCliente} (${emailCliente})`);

              // Guardar objeto del pedido completo para usar en gráficos
              return {
                ...pago,
                pedido_obj: pedido,
                cliente_nombre: nombreCliente,
                cliente_email: emailCliente,
              };
            }

            // Si no hay pedido asociado
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

      console.log('✅ Pagos enriquecidos:', pagosEnriquecidos.length);
      console.log('📦 Muestra de pagos:', pagosEnriquecidos.slice(0, 3));

      setPagos(pagosEnriquecidos);

      // Calcular ventas por día para el gráfico
      await calcularVentasPorDia(pagosEnriquecidos);

      // Calcular categorías vendidas (filtradas por fecha)
      await calcularCategoriasVendidas(pagosEnriquecidos);

    } catch (error) {
      console.error('❌ Error cargando datos de ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...pagos];

    // Filtrar por rango de fechas
    resultado = resultado.filter(pago => {
      const fechaPago = (pago.fecha_pago || pago.fecha_creacion || '').split('T')[0];
      return fechaPago >= fechaDesde && fechaPago <= fechaHasta;
    });

    // Filtrar por estado
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(pago => pago.estado_pago === filtroEstado);
    }

    // Filtrar por pedido
    if (filtroPedido.trim()) {
      resultado = resultado.filter(pago => {
        const pedidoId = typeof pago.pedido === 'number' ? pago.pedido : pago.pedido?.id;
        return pedidoId?.toString().includes(filtroPedido);
      });
    }

    // Filtrar por cliente
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

    // Crear array con todos los días del rango
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

    // Filtrar pagos por fecha ANTES de procesarlos
    const pagosFiltradosPorFecha = pagosData.filter(pago => {
      const fechaPago = (pago.fecha_pago || pago.fecha_creacion || '').split('T')[0];
      return fechaPago >= fechaDesde && fechaPago <= fechaHasta && pago.estado_pago === 'aprobado';
    });

    console.log(`📊 Procesando ${pagosFiltradosPorFecha.length} pagos aprobados en el rango ${fechaDesde} - ${fechaHasta}`);

    for (const pago of pagosFiltradosPorFecha) {
      try {
        if (pago.pedido_obj && pago.pedido_obj.items) {
          for (const item of pago.pedido_obj.items) {
            const cantidad = parseInt(item.cantidad) || 0;
            const precioUnitario = parseFloat(item.precio_unitario) || 0;
            const montoTotal = cantidad * precioUnitario;
            let categoria = 'Sin categoría';

            // Obtener categoría del producto
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

    // Convertir a array TODAS las categorías
    const categoriasArray = Object.entries(categoriasCantidad)
      .map(([nombre, cantidad]) => ({
        nombre,
        cantidad,
        monto: categoriasMontos[nombre]
      }))
      .sort((a, b) => b.monto - a.monto);

    console.log('📊 Categorías vendidas en el período:', categoriasArray);
    setCategoriasVendidas(categoriasArray);
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'aprobado': 'bg-green-100 text-green-800',
      'pendiente': 'bg-yellow-100 text-yellow-800',
    };
    return badges[estado] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      'aprobado': 'Aprobado',
      'pendiente': 'Pendiente',
    };
    return textos[estado] || estado;
  };

  // Array de colores para las categorías
  const coloresCategoria = [
    'rgba(99, 102, 241, 0.8)',   // Indigo
    'rgba(34, 197, 94, 0.8)',    // Green
    'rgba(234, 179, 8, 0.8)',    // Yellow
    'rgba(168, 85, 247, 0.8)',   // Purple
    'rgba(239, 68, 68, 0.8)',    // Red
    'rgba(59, 130, 246, 0.8)',   // Blue
    'rgba(249, 115, 22, 0.8)',   // Orange
    'rgba(236, 72, 153, 0.8)',   // Pink
    'rgba(20, 184, 166, 0.8)',   // Teal
    'rgba(161, 98, 7, 0.8)',     // Brown
  ];

  // Datos del gráfico de líneas (ventas por día)
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
      legend: { display: true, position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => `Ventas: $${context.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (value) => `$${value.toLocaleString()}` },
      },
    },
  };

  // Calcular total para porcentajes
  const totalVentasCategorias = categoriasVendidas.reduce((sum, c) => sum + c.monto, 0);

  // Datos del gráfico de categorías (Doughnut - CON PORCENTAJES)
  const categoriasChartData = {
    labels: categoriasVendidas.map(c => c.nombre),
    datasets: [
      {
        data: categoriasVendidas.map(c => {
          // Calcular porcentaje basado en el total
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
      legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 } } },
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

  // Datos del gráfico de barras de categorías (CON COLORES DIFERENTES)
  const categoriasBarrasChartData = {
    labels: categoriasVendidas.map(c => c.nombre),
    datasets: [
      {
        label: 'Ventas por Categoría ($)',
        data: categoriasVendidas.map(c => c.monto),
        backgroundColor: categoriasVendidas.map((_, index) => coloresCategoria[index % coloresCategoria.length]),
        borderColor: categoriasVendidas.map((_, index) => {
          // Versión más oscura del color para el borde
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
        ticks: { callback: (value) => `$${value.toLocaleString()}` },
      },
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
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando datos de ventas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Ventas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Análisis completo de ventas y pagos
          </p>
        </div>

        {/* Filtros Avanzados (solo fechas y estado) */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              <i className="fas fa-filter mr-2 text-indigo-600"></i>
              Filtros
            </h3>
            <button
              onClick={limpiarFiltros}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <i className="fas fa-redo mr-1"></i>
              Limpiar filtros
            </button>
          </div>

          {/* Rangos predefinidos */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => establecerRangoPredef(7)}
              className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
            >
              Últimos 7 días
            </button>
            <button
              onClick={() => establecerRangoPredef(30)}
              className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
            >
              Últimos 30 días
            </button>
            <button
              onClick={() => establecerRangoPredef(90)}
              className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
            >
              Últimos 90 días
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Fecha Desde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fas fa-calendar mr-2"></i>
                Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fas fa-calendar mr-2"></i>
                Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fas fa-check-circle mr-2"></i>
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="todos">Todos</option>
                <option value="aprobado">Aprobado</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="mt-4 text-sm text-gray-600">
            Mostrando <span className="font-semibold">{pagosFiltrados.length}</span> de{' '}
            <span className="font-semibold">{pagos.length}</span> pagos
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
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

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Gráfico de Ventas por Día */}
          <ChartCard title="Evolución de Ventas" icon="fas fa-chart-line">
            <div className="relative" style={{ height: '300px' }}>
              <Line data={ventasChartData} options={ventasChartOptions} />
            </div>
          </ChartCard>

          {/* Gráfico de Categorías Vendidas (PORCENTAJES) */}
          <ChartCard title="Distribución de Ventas por Categoría (%)" icon="fas fa-chart-pie">
            <div className="relative" style={{ height: '300px' }}>
              {categoriasVendidas.length > 0 ? (
                <Doughnut data={categoriasChartData} options={categoriasChartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <i className="fas fa-chart-pie text-4xl mb-2 opacity-50"></i>
                    <p className="text-sm">No hay datos para mostrar en el período seleccionado</p>
                  </div>
                </div>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Gráfico de Barras de Categorías */}
        <div className="mb-8">
          <ChartCard title="Ventas por Categoría" icon="fas fa-chart-bar">
            <div className="relative" style={{ height: '350px' }}>
              {categoriasVendidas.length > 0 ? (
                <Bar data={categoriasBarrasChartData} options={categoriasBarrasChartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <i className="fas fa-chart-bar text-4xl mb-2 opacity-50"></i>
                    <p className="text-sm">No hay datos para mostrar en el período seleccionado</p>
                  </div>
                </div>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Tabla de Pagos con filtros integrados */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <i className="fas fa-table mr-2 text-indigo-600"></i>
              Detalle de Pagos
            </h3>

            {/* Filtros de la tabla */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pedido */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-shopping-bag mr-2"></i>
                  Buscar por Pedido ID
                </label>
                <input
                  type="text"
                  placeholder="Buscar por ID de pedido..."
                  value={filtroPedido}
                  onChange={(e) => setFiltroPedido(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-user mr-2"></i>
                  Buscar por Cliente
                </label>
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagosFiltrados.length > 0 ? (
                  pagosFiltrados.map((pago) => (
                    <tr key={pago.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{pago.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(pago.fecha_pago || pago.fecha_creacion).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div>
                          <div className="font-medium">{pago.cliente_nombre || 'Sin nombre'}</div>
                          <div className="text-xs text-gray-500">{pago.cliente_email || 'Sin email'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        #{typeof pago.pedido === 'number' ? pago.pedido : pago.pedido?.id || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${parseFloat(pago.monto || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(pago.estado_pago)}`}>
                          {getEstadoTexto(pago.estado_pago)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {pago.metodo_pago || 'MercadoPago'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center">
                      <div className="text-gray-500">
                        <i className="fas fa-inbox text-4xl mb-2"></i>
                        <p className="text-sm">No se encontraron pagos con los filtros aplicados</p>
                      </div>
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