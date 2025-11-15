import { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
import productsService from '../../services/products';
import ordersService from '../../services/orders';


// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({});
  const [topProductos, setTopProductos] = useState([]);
  const [categoriasVendidas, setCategoriasVendidas] = useState([]);
  const [variantesStockBajo, setVariantesStockBajo] = useState([]);
  const [ventasPorPagos, setVentasPorPagos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [productosInactivos, setProductosInactivos] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fecha de hoy y ayer
      const hoy = new Date();
      const ayer = new Date();
      ayer.setDate(hoy.getDate() - 1);

      const formatoFecha = (fecha) => fecha.toISOString().split('T')[0];

      // ========== VENTAS POR PAGOS APROBADOS ==========
      const ventasHoyData = await analyticsService.getVentasPorPagosAprobados(
        formatoFecha(hoy),
        formatoFecha(hoy)
      );
      const ventasAyerData = await analyticsService.getVentasPorPagosAprobados(
        formatoFecha(ayer),
        formatoFecha(ayer)
      );

      const ventasHoy = ventasHoyData.total || 0;
      const ventasAyer = ventasAyerData.total || 0;
      const cambioVentas = ventasAyer > 0 
        ? ((ventasHoy - ventasAyer) / ventasAyer) * 100 
        : 0;

      const cantidadPagosHoy = ventasHoyData.cantidad_pagos || 0;
      const cantidadPagosAyer = ventasAyerData.cantidad_pagos || 0;
      const cambioPagos = cantidadPagosAyer > 0
        ? ((cantidadPagosHoy - cantidadPagosAyer) / cantidadPagosAyer) * 100
        : 0;

      // ========== PEDIDOS ==========
 const todosPedidosResponse = await ordersService.getAll();
      const todosPedidos = todosPedidosResponse.results || todosPedidosResponse || [];

      console.log('📦 Total de pedidos obtenidos:', todosPedidos.length);

      // Filtrar pedidos de hoy
      const pedidosHoy = todosPedidos.filter(pedido => {
        if (!pedido.fecha_pedido) return false;
        const fechaPedido = pedido.fecha_pedido.split('T')[0];
        return fechaPedido === formatoFecha(hoy);
      });

      // Filtrar pedidos de ayer
      const pedidosAyer = todosPedidos.filter(pedido => {
        if (!pedido.fecha_pedido) return false;
        const fechaPedido = pedido.fecha_pedido.split('T')[0];
        return fechaPedido === formatoFecha(ayer);
      });

      const cantidadPedidosHoy = pedidosHoy.length;
      const cantidadPedidosAyer = pedidosAyer.length;
      const cambioPedidos = cantidadPedidosAyer > 0
        ? ((cantidadPedidosHoy - cantidadPedidosAyer) / cantidadPedidosAyer) * 100
        : 0;

      console.log('📦 Pedidos de hoy:', cantidadPedidosHoy);
      console.log('📦 Pedidos de ayer:', cantidadPedidosAyer);
      console.log('📦 Cambio:', cambioPedidos.toFixed(2) + '%');
      // Obtener resumen de métricas para usuarios
      const resumenData = await analyticsService.getResumenMetricas();
      
      // ========== TOP 5 PRODUCTOS MÁS VENDIDOS ==========
      const productosVendidosData = await analyticsService.getTopProductosVendidos(5);
      setTopProductos(productosVendidosData);

      // ========== VARIANTES CON STOCK BAJO (<=10) ==========
      const variantesStockBajoData = await productsService.getVariantesStockBajo(10);
      setVariantesStockBajo(variantesStockBajoData);

      // ========== VENTAS ÚLTIMOS 30 DÍAS (POR PAGOS APROBADOS) ==========
      const hace30Dias = new Date();
      hace30Dias.setDate(hoy.getDate() - 30);

      // Obtener TODOS los pagos aprobados del mes de una sola vez
      const todosPagosDelMes = await analyticsService.getVentasPorPagosAprobados(
        formatoFecha(hace30Dias),
        formatoFecha(hoy)
      );

      // ========== TICKET PROMEDIO DEL MES (reutilizamos todosPagosDelMes) ==========
      const ticketPromedioMes = todosPagosDelMes.cantidad_pagos > 0 
        ? todosPagosDelMes.total / todosPagosDelMes.cantidad_pagos 
        : 0;
      
      // Para el cambio, calcular ticket promedio del mes anterior
      const hace60Dias = new Date();
      hace60Dias.setDate(hoy.getDate() - 60);
      const hace31Dias = new Date();
      hace31Dias.setDate(hoy.getDate() - 31);
      
      const ventasMesAnteriorData = await analyticsService.getVentasPorPagosAprobados(
        formatoFecha(hace60Dias),
        formatoFecha(hace31Dias)
      );
      
      const ticketPromedioMesAnterior = ventasMesAnteriorData.cantidad_pagos > 0 
        ? ventasMesAnteriorData.total / ventasMesAnteriorData.cantidad_pagos 
        : 0;
      
      const cambioTicket = ticketPromedioMesAnterior > 0
        ? ((ticketPromedioMes - ticketPromedioMesAnterior) / ticketPromedioMesAnterior) * 100
        : 0;

      // ========== KPIs ==========
      setKpis({
        ventas: {
          hoy: ventasHoy,
          cambio: cambioVentas,
        },
        pedidos: {
          hoy: cantidadPedidosHoy,
          cambio: cambioPedidos,
        },
        usuarios: {
          hoy: resumenData.usuarios_activos_hoy || 0,
          cambio: resumenData.cambio_usuarios || 0,
        },
        ticket: {
          hoy: ticketPromedioMes,
          cambio: cambioTicket,
        },
      });

      // Agrupar pagos por fecha
      const ventasPorFecha = {};
      todosPagosDelMes.pagos.forEach(pago => {
        const fechaPago = (pago.fecha_pago || pago.fecha_creacion).split('T')[0];
        if (!ventasPorFecha[fechaPago]) {
          ventasPorFecha[fechaPago] = 0;
        }
        ventasPorFecha[fechaPago] += parseFloat(pago.monto || 0);
      });

      // Crear array con todos los días (incluso si no hay ventas)
      const ventasPorDia = [];
      for (let i = 30; i >= 0; i--) {
        const fecha = new Date();
        fecha.setDate(hoy.getDate() - i);
        const fechaStr = formatoFecha(fecha);
        
        ventasPorDia.push({
          fecha: fechaStr,
          total: ventasPorFecha[fechaStr] || 0
        });
      }
      setVentasPorPagos(ventasPorDia);

// Obtener pedidos de los últimos 30 días a partir de los pagos aprobados
const categoriasCantidad = {};
      let totalUnidadesVendidas = 0;

      console.log('🔍 Procesando pagos para categorías:', todosPagosDelMes.pagos.length);

      // Procesar cada pago aprobado
      for (const pago of todosPagosDelMes.pagos) {
        try {
          // Obtener el pedido asociado al pago
          const pedidoId = pago.pedido;
          if (!pedidoId) continue;

          const pedido = await ordersService.getById(pedidoId);
          
          // Procesar los items del pedido
          if (pedido.items && Array.isArray(pedido.items)) {
            for (const item of pedido.items) {
              const cantidad = parseInt(item.cantidad) || 0;
              let categoria = 'Sin categoría';

              // Intentar obtener categoría del item
              if (item.producto?.categoria_nombre) {
                categoria = item.producto.categoria_nombre;
              } else if (item.categoria_nombre) {
                categoria = item.categoria_nombre;
              } else if (item.producto) {
                // Si el producto viene como objeto pero sin categoria_nombre expandido
                // Obtener el producto completo
                try {
                  const productoId = typeof item.producto === 'number' ? item.producto : item.producto.id;
                  if (productoId) {
                    const productoCompleto = await productsService.getById(productoId);
                    categoria = productoCompleto.categoria_nombre || 'Sin categoría';
                  }
                } catch (error) {
                  console.error(`Error obteniendo producto ${item.producto}:`, error);
                }
              }

              console.log(`📦 Item procesado: ${item.nombre_producto || 'Sin nombre'} - Categoría: ${categoria} - Cantidad: ${cantidad}`);

              if (!categoriasCantidad[categoria]) {
                categoriasCantidad[categoria] = 0;
              }
              
              categoriasCantidad[categoria] += cantidad;
              totalUnidadesVendidas += cantidad;
            }
          }
        } catch (error) {
          console.error(`❌ Error procesando pedido del pago ${pago.id}:`, error);
        }
      }

      console.log('📊 Total de unidades vendidas:', totalUnidadesVendidas);
      console.log('📊 Categorías encontradas:', Object.keys(categoriasCantidad));

      // Convertir a array con porcentajes y ordenar
      const categoriasConPorcentaje = Object.entries(categoriasCantidad)
        .map(([nombre, cantidad]) => ({
          nombre,
          cantidad,
          porcentaje: totalUnidadesVendidas > 0 
            ? ((cantidad / totalUnidadesVendidas) * 100).toFixed(1)
            : 0
        }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5); // Top 5 categorías

      console.log('✅ Categorías vendidas (últimos 30 días):', categoriasConPorcentaje);
      setCategoriasVendidas(categoriasConPorcentaje);
      // ========== PRODUCTOS INACTIVOS ==========
      const todosLosProductos = await productsService.getAll();
      const productos = todosLosProductos.results || todosLosProductos || [];
      const inactivos = productos.filter(p => !p.activo).length;
      setProductosInactivos(inactivos);

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Preparar datos para el gráfico de líneas (ventas por pagos aprobados)
  const ventasChartData = {
    labels: ventasPorPagos.map((v) => {
      const fecha = new Date(v.fecha);
      return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
    }),
    datasets: [
      {
        label: 'Ventas ($)',
        data: ventasPorPagos.map((v) => v.total),
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
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `Ventas: $${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `$${value.toLocaleString()}`,
        },
      },
    },
  };

  // Preparar datos para el gráfico de categorías
  const categoriasChartData = {
    labels: categoriasVendidas.map((c) => `${c.nombre} (${c.porcentaje}%)`),
    datasets: [
      {
        data: categoriasVendidas.map((c) => parseFloat(c.porcentaje)),
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
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
          padding: 10,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const categoria = categoriasVendidas[context.dataIndex];
            return [
              `${context.label}`,
              `Unidades: ${categoria.cantidad}`,
            ];
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando dashboard...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Principal</h1>
          <p className="mt-1 text-sm text-gray-600">
            Resumen general del negocio - {new Date().toLocaleDateString('es-AR')}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <KPICard
            title="Ventas Hoy"
            value={`$${kpis.ventas?.hoy?.toLocaleString() || 0}`}
            change={kpis.ventas?.cambio}
            icon="fas fa-dollar-sign"
            color="indigo"
          />
          <KPICard
            title="Pedidos Hoy"
            value={kpis.pedidos?.hoy || 0}
            change={kpis.pedidos?.cambio}
            icon="fas fa-shopping-cart"
            color="green"
          />
          <KPICard
            title="Usuarios Activos"
            value={kpis.usuarios?.hoy || 0}
            change={kpis.usuarios?.cambio}
            icon="fas fa-users"
            color="yellow"
          />
          <KPICard
            title="Ticket Promedio (Mes)"
            value={`$${kpis.ticket?.hoy?.toLocaleString() || 0}`}
            change={kpis.ticket?.cambio}
            icon="fas fa-receipt"
            color="purple"
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Gráfico de Ventas */}
          <div className="lg:col-span-2">
            <ChartCard title="Ventas Últimos 30 Días (Pagos Aprobados)" icon="fas fa-chart-line">
              <div className="relative" style={{ height: '300px' }}>
                <Line data={ventasChartData} options={ventasChartOptions} />
              </div>
            </ChartCard>
          </div>

          {/* Top 5 Productos Más Vendidos */}
          <ChartCard title="Top 5 Productos Más Vendidos" icon="fas fa-trophy" iconColor="yellow">
            <div className="space-y-4">
              {topProductos.length > 0 ? (
                topProductos.map((producto, index) => (
                  <div key={producto.producto_id || index} className="flex items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {producto.producto_nombre || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {producto.ventas || 0} unidades vendidas
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ${producto.ingresos?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay datos disponibles
                </p>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Widgets adicionales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stock Bajo - VARIANTES */}
          <ChartCard title="Variantes con Stock Bajo (≤10)" icon="fas fa-exclamation-triangle" iconColor="red">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {variantesStockBajo.length > 0 ? (
                variantesStockBajo.map((variante) => {
                  // Obtener talla y color de múltiples fuentes posibles
                  const tallaNombre = variante.talla_nombre || variante.talla_obj?.nombre || variante.talla?.nombre || 'N/A';
                  const colorNombre = variante.color_nombre || variante.color_obj?.nombre || variante.color?.nombre || 'N/A';
                  
                  return (
                    <div
                      key={variante.id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {variante.producto?.nombre || 'Producto sin nombre'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-md font-medium text-gray-700">
                            Talla: {tallaNombre}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-md font-medium text-gray-700">
                            Color: {colorNombre}
                          </span>
                        </div>
                      </div>
                      <span className="ml-2 inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-red-100 text-red-800">
                        {variante.stock}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  ✅ Stock normal en todas las variantes
                </p>
              )}
            </div>
          </ChartCard>

          {/* Ventas por Categoría */}
          <ChartCard title="Categorías vendidas (últimos 30 días)" icon="fas fa-chart-pie">
            <div className="relative" style={{ height: '250px' }}>
              <Doughnut data={categoriasChartData} options={categoriasChartOptions} />
            </div>
          </ChartCard>

          {/* Resumen rápido */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <i className="fas fa-info-circle text-blue-500 mr-2"></i>
              Resumen Rápido
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Productos activos</span>
                <span className="text-lg font-semibold">
                  {categorias.length * 10}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Productos inactivos</span>
                <span className="text-lg font-semibold text-orange-600">
                  {productosInactivos}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Variantes sin stock</span>
                <span className="text-lg font-semibold text-red-600">
                  {variantesStockBajo.filter((v) => v.stock === 0).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ventas del mes</span>
                <span className="text-lg font-semibold text-green-600">
                  ${ventasPorPagos.reduce((sum, v) => sum + v.total, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}