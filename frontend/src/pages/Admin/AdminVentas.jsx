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

  useEffect(() => {
    if (fechaDesde && fechaHasta) {
      loadVentasData();
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
            // Obtener información del pedido
            if (pago.pedido) {
              const pedidoId = typeof pago.pedido === 'number' ? pago.pedido : pago.pedido.id;
              const pedido = await ordersService.getById(pedidoId);
              
              // Obtener nombre del usuario del pedido
              let nombreUsuario = 'Sin nombre';
              let emailUsuario = 'Sin email';

              // El pedido tiene usuario como ID o como objeto
              if (pedido.usuario) {
                if (typeof pedido.usuario === 'object') {
                  nombreUsuario = pedido.usuario.nombre || pedido.usuario.first_name || pedido.usuario.username || 'Sin nombre';
                  emailUsuario = pedido.usuario.email || 'Sin email';
                } else {
                  // Si viene como ID, usar los campos del pedido
                  nombreUsuario = pedido.nombre_cliente || 'Sin nombre';
                  emailUsuario = pedido.email_cliente || 'Sin email';
                }
              } else {
                // Usar los campos directos del pedido
                nombreUsuario = pedido.nombre_cliente || 'Sin nombre';
                emailUsuario = pedido.email_cliente || 'Sin email';
              }
              
              return {
                ...pago,
                pedido_obj: pedido,
                cliente_nombre: nombreUsuario,
                cliente_email: emailUsuario,
              };
            }
            return pago;
          } catch (error) {
            console.error(`Error enriqueciendo pago ${pago.id}:`, error);
            return pago;
          }
        })
      );

      console.log('✅ Pagos enriquecidos:', pagosEnriquecidos.length);
      console.log('📦 Ejemplo de pago:', pagosEnriquecidos[0]);

      setPagos(pagosEnriquecidos);
      
      // Calcular ventas por día para el gráfico
      await calcularVentasPorDia(pagosEnriquecidos);
      
      // Calcular categorías vendidas
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

    // Solo pagos aprobados
    const pagosAprobados = pagosData.filter(p => p.estado_pago === 'aprobado');

    for (const pago of pagosAprobados) {
      try {
        if (pago.pedido_obj && pago.pedido_obj.items) {
          for (const item of pago.pedido_obj.items) {
            const cantidad = parseInt(item.cantidad) || 0;
            const precioUnitario = parseFloat(item.precio_unitario) || 0;
            const montoTotal = cantidad * precioUnitario;
            let categoria = 'Sin categoría';

            if (item.producto?.categoria_nombre) {
              categoria = item.producto.categoria_nombre;
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

    // Convertir a array TODAS las categorías (no solo top 5)
    const categoriasArray = Object.entries(categoriasCantidad)
      .map(([nombre, cantidad]) => ({
        nombre,
        cantidad,
        monto: categoriasMontos[nombre]
      }))
      .sort((a, b) => b.monto - a.monto); // Ordenar por monto

    console.log('📊 Todas las categorías vendidas:', categoriasArray);
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

  // Datos del gráfico de categorías (Doughnut - todas las categorías)
  const categoriasChartData = {
    labels: categoriasVendidas.map(c => c.nombre),
    datasets: [
      {
        data: categoriasVendidas.map(c => c.monto),
        backgroundColor: categoriasVendidas.map((_, index) => {
          const colores = [
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
          return colores[index % colores.length];
        }),
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
            return [`${cat.nombre}`, `$${cat.monto.toLocaleString()}`, `${cat.cantidad} unidades`];
          },
        },
      },
    },
  };

  // Datos del gráfico de barras de categorías
  const categoriasBarrasChartData = {
    labels: categoriasVendidas.map(c => c.nombre),
    datasets: [
      {
        label: 'Ventas por Categoría ($)',
        data: categoriasVendidas.map(c => c.monto),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
      },
    ],
  };

  const categoriasBarrasChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
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

        {/* Filtros Avanzados */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

            {/* Pedido */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fas fa-shopping-bag mr-2"></i>
                Pedido ID
              </label>
              <input
                type="text"
                placeholder="Buscar por ID..."
                value={filtroPedido}
                onChange={(e) => setFiltroPedido(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fas fa-user mr-2"></i>
                Cliente
              </label>
              <input
                type="text"
                placeholder="Nombre o email..."
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
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

          {/* Gráfico de Categorías Vendidas */}
          <ChartCard title="Distribución de Ventas por Categoría" icon="fas fa-chart-pie">
            <div className="relative" style={{ height: '300px' }}>
              <Doughnut data={categoriasChartData} options={categoriasChartOptions} />
            </div>
          </ChartCard>
        </div>

        {/* Gráfico de Barras de Categorías */}
        <div className="mb-8">
          <ChartCard title="Ventas por Categoría" icon="fas fa-chart-bar">
            <div className="relative" style={{ height: '350px' }}>
              <Bar data={categoriasBarrasChartData} options={categoriasBarrasChartOptions} />
            </div>
          </ChartCard>
        </div>

        {/* Tabla de Pagos */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              <i className="fas fa-table mr-2 text-indigo-600"></i>
              Detalle de Pagos
            </h3>
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