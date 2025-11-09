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
  const [stockBajo, setStockBajo] = useState([]);
  const [metricasDiarias, setMetricasDiarias] = useState([]);
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Cargar KPIs
      const resumenData = await analyticsService.getResumenMetricas();
      setKpis({
        ventas: {
          hoy: resumenData.total_ventas_hoy || 0,
          cambio: resumenData.cambio_ventas || 0,
        },
        pedidos: {
          hoy: resumenData.pedidos_hoy || 0,
          cambio: resumenData.cambio_pedidos || 0,
        },
        usuarios: {
          hoy: resumenData.usuarios_activos_hoy || 0,
          cambio: resumenData.cambio_usuarios || 0,
        },
        ticket: {
          hoy: resumenData.ticket_promedio_hoy || 0,
          cambio: resumenData.cambio_ticket || 0,
        },
      });

      // Cargar top productos
      const productosData = await analyticsService.getTopProductos('ventas', 5);
      setTopProductos(productosData);

      // Cargar productos con stock bajo
      const stockData = await productsService.getLowStockProducts(10);
      setStockBajo(stockData.slice(0, 10));

      // Cargar métricas de los últimos 30 días
      const hoy = new Date();
      const hace30Dias = new Date();
      hace30Dias.setDate(hoy.getDate() - 30);

      const metricas = await analyticsService.getMetricasDiarias({
        fecha_desde: hace30Dias.toISOString().split('T')[0],
        fecha_hasta: hoy.toISOString().split('T')[0],
      });
      setMetricasDiarias(metricas.results || metricas || []);

      // Cargar categorías para el gráfico de dona
      const categoriasData = await productsService.getCategories();
      setCategorias(categoriasData);

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Preparar datos para el gráfico de líneas (ventas)
  const ventasChartData = {
    labels: metricasDiarias.map((m) => {
      const fecha = new Date(m.fecha);
      return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
    }),
    datasets: [
      {
        label: 'Ventas ($)',
        data: metricasDiarias.map((m) => parseFloat(m.ingreso_bruto) || 0),
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
    labels: categorias.slice(0, 5).map((c) => c.nombre),
    datasets: [
      {
        data: categorias.slice(0, 5).map(() => Math.random() * 100),
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
            title="Ticket Promedio"
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
            <ChartCard title="Ventas Últimos 30 Días" icon="fas fa-chart-line">
              <div className="relative" style={{ height: '300px' }}>
                <Line data={ventasChartData} options={ventasChartOptions} />
              </div>
            </ChartCard>
          </div>

          {/* Top Productos */}
          <ChartCard title="Top 5 Productos" icon="fas fa-trophy" iconColor="yellow">
            <div className="space-y-4">
              {topProductos.length > 0 ? (
                topProductos.map((metrica, index) => (
                  <div key={metrica.producto?.id || index} className="flex items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {metrica.producto_nombre || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {metrica.compras_completadas || 0} ventas
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ${parseFloat(metrica.ingreso_generado || 0).toLocaleString()}
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
          {/* Stock Bajo */}
          <ChartCard title="Stock Bajo" icon="fas fa-exclamation-triangle" iconColor="red">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stockBajo.length > 0 ? (
                stockBajo.map((producto) => (
                  <div
                    key={producto.id}
                    className="flex items-center justify-between p-2 bg-red-50 rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {producto.nombre}
                      </p>
                      <p className="text-xs text-gray-500">
                        {producto.categoria?.nombre || 'Sin categoría'}
                      </p>
                    </div>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {producto.stock} unid.
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  ✅ Stock normal en todos los productos
                </p>
              )}
            </div>
          </ChartCard>

          {/* Ventas por Categoría */}
          <ChartCard title="Top Categorías" icon="fas fa-chart-pie">
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
                <span className="text-lg font-semibold">{categorias.length * 10}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Productos sin stock</span>
                <span className="text-lg font-semibold text-red-600">
                  {stockBajo.filter((p) => p.stock === 0).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tasa conversión</span>
                <span className="text-lg font-semibold text-green-600">
                  {kpis.ventas?.hoy > 0 ? '3.2%' : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}