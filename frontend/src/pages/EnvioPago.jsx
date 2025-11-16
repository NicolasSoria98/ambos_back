import { initMercadoPago } from '@mercadopago/sdk-react';
import PaymentBrick from '../components/PaymentBrick';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ⚠️ IMPORTANTE: Poné tu PUBLIC KEY acá
initMercadoPago('TEST-4aa13959-24eb-4a20-8858-fbc57f97deb1');

export default function EnvioPago() {
  const navigate = useNavigate();
  const [pedidoData, setPedidoData] = useState(null);

  useEffect(() => {
    // Obtener datos del pedido (desde props, context, localStorage, etc)
    const pedido = {
      id: 123,
      total: 5000,
      items: [
        { nombre: 'Producto 1', cantidad: 2, precio: 2500 }
      ]
    };
    setPedidoData(pedido);
  }, []);

  const handlePaymentSuccess = async (result) => {
    console.log('✅ Pago exitoso:', result);
    
    // Acá avisás a Django que el pedido fue pagado
    try {
      await fetch('http://localhost:8000/api/pedidos/confirmar-pago/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedido_id: pedidoData.id,
          payment_id: result.payment_id,
          status: result.status,
          transaction_amount: result.transaction_amount
        })
      });
    } catch (error) {
      console.error('Error notificando a Django:', error);
    }
    
    // Redirigir
    navigate(`/pago-exitoso?payment=${result.payment_id}`);
  };

  const handlePaymentError = (error) => {
    console.error('❌ Error:', error);
    alert(`Error al procesar el pago: ${error.error || 'Intentá nuevamente'}`);
  };

  if (!pedidoData) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="container">
      <h1>Finalizar Compra</h1>
      
      <div className="resumen">
        <h3>Resumen del pedido</h3>
        <p>Pedido #{pedidoData.id}</p>
        <p>Total: ${pedidoData.total}</p>
      </div>

      <div className="payment-section">
        <h3>Datos de pago</h3>
        <PaymentBrick
          pedidoId={pedidoData.id}
          amount={pedidoData.total}
          description={`Pedido #${pedidoData.id} - Ambos Norte`}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      </div>
    </div>
  );
}