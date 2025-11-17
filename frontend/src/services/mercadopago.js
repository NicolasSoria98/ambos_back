const MP_SERVICE_URL = 'http://localhost:3001';

const mercadopagoService = {
  /**
   * Procesa un pago con los datos del Payment Brick
   */
  procesarPago: async (paymentData) => {
    try {
      console.log('🚀 Procesando pago:', paymentData);
      
      const response = await fetch(`${MP_SERVICE_URL}/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();
      
      console.log('✅ Respuesta:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Obtiene información de un pago
   */
  obtenerPago: async (paymentId) => {
    try {
      const response = await fetch(`${MP_SERVICE_URL}/payment/${paymentId}`);
      return await response.json();
    } catch (error) {
      console.error('Error obteniendo pago:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Mapea estados de MP a español
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
      }
    };

    return estados[status] || { 
      texto: 'Desconocido', 
      color: 'gray',
      icono: '❓',
      descripcion: 'Estado desconocido'
    };
  }
};

export default mercadopagoService;