import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import AdminSidebar from '../../components/admin/AdminSidebar';
import KPICard from '../../components/admin/KpiCard';
import ChartCard from '../../components/admin/Chartcard';
import analyticsService from '../../services/analytics';

export default function AdminVentas() {
  const [loading, setLoading] = useState(true);
  const [diasSeleccionados, setDiasSeleccionados] = useState(30);
  const [metricas, setMetricas] = useState({});
  const [embudo, setEmbudo] = useState({});
  const [metricasDiarias, setMetricasDiarias] = useState([]);

  useEffect(() => {
    loadVentasData();
  }, [diasSeleccionados]);

  const loadVentasData = async () => {
    try {
      setLoading(true);
      
      const hoy = new Date();
      const fechaInicio = new Date();
      fechaInicio.setDate(hoy.getDate() - diasSeleccionados);

      // Cargar métricas del período
      const metricasData = await analyticsService.getMetricasDiarias({
        fecha_desde: fechaInicio.toISOString().split('T')[0],
        fecha_hasta: hoy.toISOString().split('T')[0],
      });
      
      const results = metricasData.results || metricasData || [];
      setMetricasDiarias(results);

      // Calcular totales
      const totalVentas = results.reduce((sum, m) => sum + parseFloat(m.ingreso_bruto || 0), 0);
      const totalPedidos = results.reduce((sum, m) => sum + (m.pedidos_totales || 0), 0);
      const totalProductos = results.reduce((sum, m) => sum + (m.productos_vendidos || 0), 0);
      const promedioTicket = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

      setMetricas({
        total_ventas: totalVentas,
        total_pedidos: totalPedidos,
        total_productos: totalProductos,
        promedio_ticket: promedioTicket,
      });

      // Cargar embudo de conversión
      const embudoData = await analyticsService.getEmbudoConversion(diasSeleccionados);
      setEmbudo(embudoData);

    } catch (error) {
      console.error('Error cargando datos de ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
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
        yAxisID: 'y',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Conversión (%)',
        data: metricasDiarias.map((m) => parseFloat(m.tasa_conversion) || 0),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        yAxisID: 'y1',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'top' } },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'Ventas ($)' },
        ticks: { callback: (value) => `$${value.toLocaleString()}` },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: { display: true, text: 'Conversión (%)' },
        grid: { drawOnChartArea: false },
        ticks: { callback: (value) => `${value}%` },
      },
    },
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Análisis de Ventas</h1>
            <p className="mt-1 text-sm text-gray-600">Análisis detallado del desempeño de ventas</p>
          </div>
          <select
            value={diasSeleccionados}
            onChange={(e) => setDiasSeleccionados(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="365">Último año</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <KPICard
            title="Ventas Totales"
            value={`$${metricas.total_ventas?.toLocaleString() || 0}`}
            icon="fas fa-dollar-sign"
            color="indigo"
          />
          <KPICard
            title="Total Pedidos"
            value={metricas.total_pedidos || 0}
            icon="fas fa-shopping-bag"
            color="green"
          />
          <KPICard
            title="Ticket Promedio"
            value={`$${metricas.promedio_ticket?.toLocaleString() || 0}`}
            icon="fas fa-receipt"
            color="purple"
          />
          <KPICard
            title="Productos Vendidos"
            value={metricas.total_productos || 0}
            icon="fas fa-box"
            color="orange"
          />
        </div>

        <div className="mb-8">
          <ChartCard title="Tendencia de Ventas" icon="fas fa-chart-area">
            <div style={{ height: '400px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </ChartCard>
        </div>

        <ChartCard title="Embudo de Conversión" icon="fas fa-filter" iconColor="purple">
          <div className="space-y-6">
            {[
              { label: 'Vistas de Producto', value: embudo.visitas_totales || 0, color: 'blue', width: 100 },
              { label: 'Agregados al Carrito', value: embudo.agregados_carrito || 0, color: 'green', width: embudo.tasa_vista_a_carrito || 0 },
              { label: 'Inicio de Checkout', value: embudo.inicio_checkout || 0, color: 'yellow', width: embudo.tasa_carrito_a_checkout || 0 },
              { label: 'Compras Completadas', value: embudo.compras_completadas || 0, color: 'indigo', width: embudo.tasa_checkout_a_compra || 0 },
            ].map((etapa) => (
              <div key={etapa.label}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{etapa.label}</span>
                  <span className="text-lg font-bold text-gray-900">{etapa.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`bg-${etapa.color}-500 h-3 rounded-full`}
                    style={{ width: `${etapa.width}%` }}
                  ></div>
                </div>
              </div>
            ))}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">Conversión Total</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {embudo.tasa_conversion_total?.toFixed(1) || 0}%
                </span>
              </div>
            </div>
          </div>
        </ChartCard>
      </main>
    </div>
  );
}