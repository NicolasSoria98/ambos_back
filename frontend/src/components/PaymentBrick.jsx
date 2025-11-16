import { Payment } from '@mercadopago/sdk-react';
import { useState } from 'react';
import mercadopagoService from '../services/mercadopago';

export default function PaymentBrick({ 
  pedidoId, 
  amount, 
  description,
  onPaymentSuccess, 
  onPaymentError 
}) {
  const [loading, setLoading] = useState(false);

  const initialization = {
    amount: amount,
    // 🔥 AGREGAR ESTO - Configuración del pagador
    payer: {
      email: ''
    }
  };

  const customization = {
    visual: {
      style: {
        theme: 'default'
      }
    },
    // 🔥 ESTO ES LO IMPORTANTE - Especificar métodos de pago
    paymentMethods: {
      creditCard: 'all',
      debitCard: 'all',
      ticket: 'all',
      bankTransfer: 'all',
      atm: 'all',
      mercadoPago: 'all'
    }
  };

  const onSubmit = async ({ selectedPaymentMethod, formData }) => {
    setLoading(true);
    
    try {
      console.log('💳 Datos del formulario:', formData);

      // Preparar datos para enviar a Express
      const paymentData = {
        ...formData,
        description: description || `Pedido #${pedidoId}`,
        metadata: {
          pedido_id: pedidoId
        }
      };

      // Procesar pago
      const result = await mercadopagoService.procesarPago(paymentData);

      if (result.success && result.status === 'approved') {
        onPaymentSuccess(result);
      } else {
        onPaymentError(result);
      }

    } catch (error) {
      console.error('❌ Error:', error);
      onPaymentError({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const onError = async (error) => {
    console.error('Error del Brick:', error);
    onPaymentError(error);
  };

  const onReady = async () => {
    console.log('✅ Payment Brick listo');
  };

  return (
    <div style={{ opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
      <Payment
        initialization={initialization}
        customization={customization}
        onSubmit={onSubmit}
        onReady={onReady}
        onError={onError}
      />
      {loading && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p>Procesando pago...</p>
        </div>
      )}
    </div>
  );
}