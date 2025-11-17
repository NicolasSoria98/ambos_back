/**
 * Servicio de Pagos con MercadoPago
 * Ubicación: src/services/payments.js
 */
import api from './api';

const paymentsService = {
  /**
   * Crea una preferencia de pago en MercadoPago
   * 
   * @param {Object} data - Datos del pago
   * @param {number} data.pedido_id - ID del pedido
   * @param {Array} data.items - Items del pedido
   * @param {Object} data.payer - Información del pagador
   * @param {string} data.frontend_url - URL base del frontend
   * 
   * @returns {Promise<Object>} Respuesta con preference_id e init_point
   */
  crearPreferencia: async (data) => {
    try {
      console.log('🚀 Creando preferencia de pago:', data);
      
      const response = await api.post('/pagos/pago/crear_preferencia/', data);
      
      console.log('✅ Respuesta del backend:', response.data);
      
      // El backend ya devuelve { success: true, data: {...} }
      // NO necesitamos envolverlo de nuevo
      return response.data;
      
    } catch (error) {
      console.error('❌ Error al crear preferencia:', error);
      
      // En caso de error, mantener la misma estructura
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al crear preferencia de pago'
      };
    }
  },

  /**
   * Obtiene todos los pagos (con filtros opcionales)
   * 
   * @param {Object} filters - Filtros opcionales (pedido, estado)
   * @returns {Promise<Array>} Lista de pagos
   */
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/pagos/pago/?${params}`);
    return response.data;
  },

  /**
   * Obtiene un pago por ID
   * 
   * @param {number} id - ID del pago
   * @returns {Promise<Object>} Datos del pago
   */
  getById: async (id) => {
    const response = await api.get(`/pagos/pago/${id}/`);
    return response.data;
  },

  /**
   * Obtiene los pagos de un pedido específico
   * 
   * @param {number} pedidoId - ID del pedido
   * @returns {Promise<Array>} Pagos del pedido
   */
  getByPedido: async (pedidoId) => {
    const response = await api.get(`/pagos/pago/?pedido=${pedidoId}`);
    return response.data;
  },

  /**
   * Verifica el estado de un pago usando el payment_id de MercadoPago
   * 
   * @param {string} paymentId - ID del pago en MercadoPago
   * @returns {Promise<Object>} Estado del pago
   */
  verificarEstado: async (paymentId) => {
    try {
      // Buscar el pago en nuestra BD usando el payment_id
      const response = await api.get(`/pagos/pago/?payment_id=${paymentId}`);
      
      if (response.data && response.data.length > 0) {
        return {
          success: true,
          pago: response.data[0]
        };
      }
      
      return {
        success: false,
        error: 'Pago no encontrado'
      };
    } catch (error) {
      console.error('Error al verificar estado:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Mapea el estado de MercadoPago a un estado legible en español
   * 
   * @param {string} status - Estado de MP (approved, pending, rejected, etc.)
   * @returns {Object} Objeto con estado traducido y color
   */
  mapearEstado: (status) => {
    const estados = {
      'approved': { 
        texto: 'Aprobado', 
        color: 'green',
        icono: '✅',
        descripcion: 'Tu pago fue aprobado exitosamente'
      },
      'pending': { 
        texto: 'Pendiente', 
        color: 'yellow',
        icono: '⏳',
        descripcion: 'Tu pago está pendiente de confirmación'
      },
      'in_process': { 
        texto: 'En Proceso', 
        color: 'blue',
        icono: '🔄',
        descripcion: 'Estamos procesando tu pago'
      },
      'rejected': { 
        texto: 'Rechazado', 
        color: 'red',
        icono: '❌',
        descripcion: 'Tu pago fue rechazado'
      },
      'cancelled': { 
        texto: 'Cancelado', 
        color: 'gray',
        icono: '🚫',
        descripcion: 'El pago fue cancelado'
      },
      'refunded': { 
        texto: 'Reembolsado', 
        color: 'purple',
        icono: '↩️',
        descripcion: 'El pago fue reembolsado'
      }
    };

    return estados[status] || { 
      texto: 'Desconocido', 
      color: 'gray',
      icono: '❓',
      descripcion: 'Estado desconocido'
    };
  },

  /**
   * Obtiene mensaje de error según el status_detail de MercadoPago
   * 
   * @param {string} statusDetail - Detalle del estado de MP
   * @returns {string} Mensaje de error en español
   */
  obtenerMensajeError: (statusDetail) => {
    const mensajes = {
      'cc_rejected_bad_filled_card_number': 'Número de tarjeta inválido',
      'cc_rejected_bad_filled_date': 'Fecha de vencimiento inválida',
      'cc_rejected_bad_filled_other': 'Verifica los datos ingresados',
      'cc_rejected_bad_filled_security_code': 'Código de seguridad inválido',
      'cc_rejected_blacklist': 'Tarjeta no habilitada',
      'cc_rejected_call_for_authorize': 'Debes autorizar el pago con tu banco',
      'cc_rejected_card_disabled': 'Tarjeta deshabilitada',
      'cc_rejected_card_error': 'Error en la tarjeta',
      'cc_rejected_duplicated_payment': 'Pago duplicado',
      'cc_rejected_high_risk': 'Pago rechazado por seguridad',
      'cc_rejected_insufficient_amount': 'Fondos insuficientes',
      'cc_rejected_invalid_installments': 'Cuotas no válidas',
      'cc_rejected_max_attempts': 'Superaste el límite de intentos',
      'cc_rejected_other_reason': 'Pago rechazado por el banco'
    };

    return mensajes[statusDetail] || 'El pago no pudo ser procesado';
  },
  /**
   * Cambia el estado de un pago (solo admin)
   * 
   * @param {number} pagoId - ID del pago
   * @param {string} nuevoEstado - Nuevo estado (aprobado, cancelado, pendiente)
   * @returns {Promise<Object>} Resultado de la operación
   */
  cambiarEstado: async (pagoId, nuevoEstado) => {
    try {
      console.log(`🔄 Cambiando estado del pago ${pagoId} a ${nuevoEstado}`);
      
      const response = await api.patch(`/pagos/pago/${pagoId}/cambiar_estado/`, {
        estado: nuevoEstado
      });
      
      console.log('✅ Estado actualizado:', response.data);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al actualizar estado'
      };
    }
  }
};
export default paymentsService;
