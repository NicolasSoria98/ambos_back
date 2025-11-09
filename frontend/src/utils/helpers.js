/**
 * Utilidades y funciones helper para el panel de administración
 */

/**
 * Determina el color según el valor del cambio
 * @param {number} changeValue - Valor del cambio (puede ser positivo o negativo)
 * @returns {string} - Clase de color de Tailwind
 */
export const getChangeColor = (changeValue) => {
  if (changeValue > 0) return 'text-green-600';
  if (changeValue < 0) return 'text-red-600';
  return 'text-gray-600';
};

/**
 * Devuelve el ícono apropiado según el valor del cambio
 * @param {number} changeValue - Valor del cambio
 * @returns {JSX.Element} - Ícono de FontAwesome
 */
export const getChangeIcon = (changeValue) => {
  if (changeValue > 0) return '↑';
  if (changeValue < 0) return '↓';
  return '→';
};

/**
 * Formatea un número como moneda
 * @param {number} amount - Cantidad a formatear
 * @param {string} currency - Código de moneda (default: 'ARS')
 * @returns {string} - Número formateado como moneda
 */
export const formatCurrency = (amount, currency = 'ARS') => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Formatea un número con separadores de miles
 * @param {number} num - Número a formatear
 * @returns {string} - Número formateado
 */
export const formatNumber = (num) => {
  return new Intl.NumberFormat('es-AR').format(num);
};

/**
 * Formatea una fecha
 * @param {string|Date} date - Fecha a formatear
 * @param {string} format - Formato deseado ('short', 'long', 'numeric')
 * @returns {string} - Fecha formateada
 */
export const formatDate = (date, format = 'short') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    numeric: { day: 'numeric', month: 'numeric', year: 'numeric' },
  };
  
  return new Intl.DateFormat('es-AR', options[format]).format(dateObj);
};

/**
 * Calcula el porcentaje de cambio entre dos valores
 * @param {number} current - Valor actual
 * @param {number} previous - Valor anterior
 * @returns {number} - Porcentaje de cambio
 */
export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Trunca un texto a cierta longitud
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto truncado
 */
export const truncateText = (text, maxLength = 50) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Obtiene el color de estado según el nivel de stock
 * @param {number} stock - Cantidad en stock
 * @param {number} lowThreshold - Umbral bajo (default: 10)
 * @param {number} mediumThreshold - Umbral medio (default: 50)
 * @returns {string} - Clase de color de Tailwind
 */
export const getStockColor = (stock, lowThreshold = 10, mediumThreshold = 50) => {
  if (stock === 0) return 'text-red-600 bg-red-100';
  if (stock <= lowThreshold) return 'text-orange-600 bg-orange-100';
  if (stock <= mediumThreshold) return 'text-yellow-600 bg-yellow-100';
  return 'text-green-600 bg-green-100';
};

/**
 * Obtiene el estado del stock como texto
 * @param {number} stock - Cantidad en stock
 * @returns {string} - Estado del stock
 */
export const getStockStatus = (stock) => {
  if (stock === 0) return 'Sin stock';
  if (stock <= 10) return 'Stock bajo';
  if (stock <= 50) return 'Stock medio';
  return 'Stock normal';
};

/**
 * Genera un ID único de sesión
 * @returns {string} - ID de sesión único
 */
export const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Obtiene o crea un ID de sesión del localStorage
 * @returns {string} - ID de sesión
 */
export const getSessionId = () => {
  let sessionId = localStorage.getItem('sessionId');
  
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('sessionId', sessionId);
  }
  
  return sessionId;
};

/**
 * Formatea un rango de fechas
 * @param {Date} startDate - Fecha inicial
 * @param {Date} endDate - Fecha final
 * @returns {string} - Rango formateado
 */
export const formatDateRange = (startDate, endDate) => {
  const start = formatDate(startDate, 'short');
  const end = formatDate(endDate, 'short');
  return `${start} - ${end}`;
};

/**
 * Valida si un email es válido
 * @param {string} email - Email a validar
 * @returns {boolean} - true si es válido
 */
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Obtiene el color de gradiente según la opción
 * @param {string} color - Nombre del color ('indigo', 'green', 'yellow', 'purple', 'red')
 * @returns {string} - Clases de gradiente de Tailwind
 */
export const getGradientColor = (color) => {
  const gradients = {
    indigo: 'from-indigo-500 to-indigo-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600',
    pink: 'from-pink-500 to-pink-600',
    orange: 'from-orange-500 to-orange-600',
  };
  
  return gradients[color] || gradients.indigo;
};

/**
 * Debounce function para optimizar búsquedas
 * @param {Function} func - Función a ejecutar
 * @param {number} delay - Delay en ms
 * @returns {Function} - Función con debounce
 */
export const debounce = (func, delay = 300) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Formatea bytes a tamaño legible
 * @param {number} bytes - Cantidad de bytes
 * @returns {string} - Tamaño formateado
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Copia texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} - true si se copió exitosamente
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Error al copiar:', err);
    return false;
  }
};