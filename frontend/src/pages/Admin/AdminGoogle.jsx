import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import searchInsightsService from '../../services/searchInsightsService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const AdminGoogle = () => {
  const [loading, setLoading] = useState(false);
  const [geoCodes, setGeoCodes] = useState({ paises: [], regiones: {} });
  const [selectedPais, setSelectedPais] = useState('AR');
  const [selectedRegion, setSelectedRegion] = useState('');
  
  // Keywords
  const [keywords, setKeywords] = useState(['']);
  const [keywordInput, setKeywordInput] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  
  // Fechas
  const hoy = new Date().toISOString().split('T')[0];
  const hace90Dias = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(hace90Dias);
  const [fechaFin, setFechaFin] = useState(hoy);
  
  // Resultados
  const [resultados, setResultados] = useState(null);
  const [showRegionalMap, setShowRegionalMap] = useState(false);

  useEffect(() => {
    cargarGeoCodes();
  }, []);

  useEffect(() => {
    // Resetear región al cambiar país
    setSelectedRegion('');
  }, [selectedPais]);

  const cargarGeoCodes = async () => {
    try {
      const data = await searchInsightsService.getGeoCodes();
      setGeoCodes(data);
    } catch (error) {
      console.error('Error cargando códigos geográficos:', error);
    }
  };

  const handleAgregarKeyword = () => {
    if (keywordInput.trim() && keywords.length < 5) {
      setKeywords([...keywords.filter(k => k.trim()), keywordInput.trim()]);
      setKeywordInput('');
      setSugerencias([]);
    }
  };

  const handleEliminarKeyword = (index) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleBuscarSugerencias = async (texto) => {
    setKeywordInput(texto);
    
    if (texto.length >= 2) {
      try {
        const data = await searchInsightsService.getSuggestions(texto, selectedPais);
        setSugerencias(data.sugerencias || []);
      } catch (error) {
        console.error('Error buscando sugerencias:', error);
        setSugerencias([]);
      }
    } else {
      setSugerencias([]);
    }
  };

  const handleSeleccionarSugerencia = (sugerencia) => {
    setKeywordInput(sugerencia.title);
    setSugerencias([]);
  };

  const handleConsultar = async () => {
    const keywordsLimpiadas = keywords.filter(k => k.trim());
    
    if (keywordsLimpiadas.length === 0) {
      alert('Debe agregar al menos una palabra clave');
      return;
    }

    if (!fechaInicio || !fechaFin) {
      alert('Debe seleccionar fechas de inicio y fin');
      return;
    }

    setLoading(true);
    try {
      const data = await searchInsightsService.getTrends({
        keywords: keywordsLimpiadas,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        geo: selectedPais,
        ciudad: selectedRegion
      });

      setResultados(data);
      
    } catch (error) {
      console.error('Error consultando tendencias:', error);
      alert('Error al consultar tendencias: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Preparar datos para gráfico de tendencia temporal
  const getTendenciaChart = () => {
    if (!resultados?.tendencia_temporal || resultados.tendencia_temporal.length === 0) {
      return null;
    }

    const labels = resultados.tendencia_temporal.map(d => d.date);
    const datasets = keywords.filter(k => k.trim()).map((kw, index) => {
      const colores = [
        'rgb(59, 130, 246)',
        'rgb(16, 185, 129)',
        'rgb(251, 146, 60)',
        'rgb(239, 68, 68)',
        'rgb(168, 85, 247)',
      ];
      
      return {
        label: kw,
        data: resultados.tendencia_temporal.map(d => d[kw] || 0),
        borderColor: colores[index % colores.length],
        backgroundColor: colores[index % colores.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
        tension: 0.3,
        fill: true
      };
    });

    return { labels, datasets };
  };

  // Preparar datos para gráfico regional (mapa de calor)
  const getRegionalChart = () => {
    if (!resultados?.datos_regionales || resultados.datos_regionales.length === 0) {
      return null;
    }

    // Tomar la primera keyword para el mapa
    const primeraKeyword = keywords.filter(k => k.trim())[0];
    
    // Ordenar por valor y tomar top 15
    const datosOrdenados = [...resultados.datos_regionales]
      .sort((a, b) => (b[primeraKeyword] || 0) - (a[primeraKeyword] || 0))
      .slice(0, 15);

    const labels = datosOrdenados.map(d => d.geoName || d.geoCode);
    const values = datosOrdenados.map(d => d[primeraKeyword] || 0);

    // Generar colores en gradiente (azul a rojo según intensidad)
    const maxValue = Math.max(...values);
    const backgroundColors = values.map(val => {
      const intensity = maxValue > 0 ? val / maxValue : 0;
      const r = Math.round(255 * intensity);
      const b = Math.round(255 * (1 - intensity));
      return `rgba(${r}, 100, ${b}, 0.8)`;
    });

    return {
      labels,
      datasets: [{
        label: `Interés de "${primeraKeyword}" por región`,
        data: values,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(c => c.replace('0.8', '1')),
        borderWidth: 1
      }]
    };
  };

  const regionesDisponibles = selectedPais === 'AR' ? geoCodes.regiones.argentina || [] : [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <i className="fas fa-search mr-3"></i>
            Análisis de Búsquedas en Google
          </h1>
          <p className="text-gray-600">
            Descubre qué están buscando los usuarios en Google - Datos en tiempo real
          </p>
        </div>

        {/* Panel de Configuración */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            <i className="fas fa-cog mr-2"></i>
            Configurar Búsqueda
          </h2>

          {/* Keywords */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Palabras Clave (máximo 5)
            </label>
            
            {/* Keywords actuales */}
            <div className="flex flex-wrap gap-2 mb-3">
              {keywords.filter(k => k.trim()).map((kw, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
                >
                  <span>{kw}</span>
                  <button
                    onClick={() => handleEliminarKeyword(index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>

            {/* Input para nueva keyword */}
            {keywords.filter(k => k.trim()).length < 5 && (
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => handleBuscarSugerencias(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAgregarKeyword();
                      }
                    }}
                    placeholder="Escribe una palabra clave..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAgregarKeyword}
                    disabled={!keywordInput.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Agregar
                  </button>
                </div>

                {/* Sugerencias */}
                {sugerencias.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {sugerencias.map((sug, index) => (
                      <div
                        key={index}
                        onClick={() => handleSeleccionarSugerencia(sug)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      >
                        <div className="font-medium">{sug.title}</div>
                        {sug.type && (
                          <div className="text-xs text-gray-500">{sug.type}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filtros de Ubicación y Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* País */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                País
              </label>
              <select
                value={selectedPais}
                onChange={(e) => setSelectedPais(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {geoCodes.paises.map(pais => (
                  <option key={pais.codigo} value={pais.codigo}>
                    {pais.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Región/Ciudad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Región/Provincia (opcional)
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={regionesDisponibles.length === 0}
              >
                <option value="">Todo el país</option>
                {regionesDisponibles.map(region => (
                  <option key={region.codigo} value={region.codigo}>
                    {region.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha Inicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                max={fechaFin}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Fecha Fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                min={fechaInicio}
                max={hoy}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Botón Consultar */}
          <div className="flex justify-end">
            <button
              onClick={handleConsultar}
              disabled={loading || keywords.filter(k => k.trim()).length === 0}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Consultando...
                </>
              ) : (
                <>
                  <i className="fas fa-search mr-2"></i>
                  Consultar Google Trends
                </>
              )}
            </button>
          </div>
        </div>

        {/* Resultados */}
        {resultados && (
          <>
            {/* Resumen */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                <i className="fas fa-info-circle mr-2"></i>
                Resumen de Consulta
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {resultados.resumen.keywords_analizadas}
                  </div>
                  <div className="text-sm text-gray-600">Keywords</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {resultados.resumen.regiones_con_datos}
                  </div>
                  <div className="text-sm text-gray-600">Regiones</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-700">
                    {resultados.resumen.periodo}
                  </div>
                  <div className="text-xs text-gray-600">Período</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-700">
                    {resultados.resumen.region}
                  </div>
                  <div className="text-xs text-gray-600">Ubicación</div>
                </div>
              </div>
            </div>

            {/* Métricas por Keyword */}
            {resultados.resumen.promedios && Object.keys(resultados.resumen.promedios).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {Object.entries(resultados.resumen.promedios).map(([kw, metricas]) => (
                  <div key={kw} className="bg-white rounded-lg shadow-md p-6">
                    <h4 className="font-semibold text-gray-800 mb-3 truncate" title={kw}>
                      "{kw}"
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Promedio:</span>
                        <span className="font-semibold text-blue-600">
                          {metricas.promedio.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Máximo:</span>
                        <span className="font-semibold text-green-600">
                          {metricas.maximo}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Mínimo:</span>
                        <span className="font-semibold text-orange-600">
                          {metricas.minimo}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Gráfico de Tendencia Temporal */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                <i className="fas fa-chart-line mr-2"></i>
                Tendencia de Búsquedas en el Tiempo
              </h3>
              {getTendenciaChart() ? (
                <div className="h-96">
                  <Line
                    data={getTendenciaChart()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Interés (0-100)'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Fecha'
                          }
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay datos de tendencia disponibles</p>
              )}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <i className="fas fa-info-circle mr-2"></i>
                  Los valores representan el interés de búsqueda relativo al punto más alto del gráfico (100).
                  Un valor de 50 significa que el término es la mitad de popular.
                </p>
              </div>
            </div>

            {/* Mapa de Calor Regional */}
            {resultados.datos_regionales && resultados.datos_regionales.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    <i className="fas fa-map-marked-alt mr-2"></i>
                    Mapa de Calor - Interés por Región
                  </h3>
                  <button
                    onClick={() => setShowRegionalMap(!showRegionalMap)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <i className={`fas fa-${showRegionalMap ? 'chart-bar' : 'table'} mr-2`}></i>
                    {showRegionalMap ? 'Ver Gráfico' : 'Ver Tabla'}
                  </button>
                </div>

                {showRegionalMap ? (
                  /* Tabla de datos regionales */
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Región
                          </th>
                          {keywords.filter(k => k.trim()).map(kw => (
                            <th key={kw} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              {kw}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {resultados.datos_regionales.slice(0, 20).map((region, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {region.geoName || region.geoCode}
                            </td>
                            {keywords.filter(k => k.trim()).map(kw => {
                              const valor = region[kw] || 0;
                              const intensidad = valor / 100;
                              const bgColor = `rgba(${Math.round(255 * intensidad)}, 100, ${Math.round(255 * (1 - intensidad))}, 0.3)`;
                              
                              return (
                                <td 
                                  key={kw} 
                                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                  style={{ backgroundColor: bgColor }}
                                >
                                  <span className="font-semibold">{valor}</span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Gráfico de barras */
                  getRegionalChart() && (
                    <div className="h-96">
                      <Bar
                        data={getRegionalChart()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          indexAxis: 'y',
                          plugins: {
                            legend: {
                              display: false
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  return `Interés: ${context.parsed.x}`;
                                }
                              }
                            }
                          },
                          scales: {
                            x: {
                              beginAtZero: true,
                              max: 100,
                              title: {
                                display: true,
                                text: 'Interés Relativo (0-100)'
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  )
                )}

                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <i className="fas fa-fire mr-2"></i>
                    Los colores más rojos indican mayor intensidad de búsqueda en esa región.
                    Los valores van de 0 a 100, donde 100 representa la región con mayor interés.
                  </p>
                </div>
              </div>
            )}

            {/* Consultas Relacionadas */}
            {resultados.consultas_relacionadas && Object.keys(resultados.consultas_relacionadas).length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(resultados.consultas_relacionadas).map(([kw, queries]) => (
                  <div key={kw} className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      <i className="fas fa-link mr-2"></i>
                      Consultas Relacionadas: "{kw}"
                    </h3>

                    {/* Top queries */}
                    {queries.top && queries.top.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Más populares:</h4>
                        <div className="space-y-2">
                          {queries.top.slice(0, 5).map((q, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700">{q.query}</span>
                              <span className="text-blue-600 font-semibold">{q.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rising queries */}
                    {queries.rising && queries.rising.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          En ascenso: <i className="fas fa-arrow-up text-green-600"></i>
                        </h4>
                        <div className="space-y-2">
                          {queries.rising.slice(0, 5).map((q, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700">{q.query}</span>
                              <span className="text-green-600 font-semibold">
                                {q.value === 'Breakout' ? '🔥 Breakout' : `+${q.value}%`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Estado vacío */}
        {!resultados && !loading && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <i className="fas fa-chart-line text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Comienza tu Análisis
            </h3>
            <p className="text-gray-600">
              Agrega palabras clave, selecciona ubicación y fechas, luego presiona "Consultar Google Trends"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGoogle;