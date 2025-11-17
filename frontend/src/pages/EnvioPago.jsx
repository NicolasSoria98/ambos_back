import { initMercadoPago } from '@mercadopago/sdk-react';
import PaymentBrick from '../components/PaymentBrick';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ✅ Inicializar MercadoPago con tu PUBLIC KEY
initMercadoPago('TEST-4aa13959-24eb-4a20-8858-fbc57f97deb1');

export default function EnvioPago() {
  const navigate = useNavigate();
  const [pedidoData, setPedidoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    crearPedido();
  }, []);

  const crearPedido = async () => {
    try {
      // 1. Obtener items del carrito
      const cartRaw = localStorage.getItem('cart');
      const cart = cartRaw ? JSON.parse(cartRaw) : [];
      
      if (cart.length === 0) {
        alert('Tu carrito está vacío');
        navigate('/carrito');
        return;
      }

      // 2. Preparar datos del pedido
      const token = localStorage.getItem('authToken');
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : {};
      
      // Mapear items del carrito al formato que espera Django
      const items = cart.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad || 1,
        precio_unitario: item.precio
      }));

      // Calcular total
      const total = cart.reduce((sum, it) => {
        const precio = Number(it.precio) || 0;
        const cantidad = Number(it.cantidad) || 1;
        return sum + (precio * cantidad);
      }, 0);

      const pedidoPayload = {
        items: items,
        contacto: {
          email: user.email || 'cliente@example.com',
          telefono: user.telefono || '3794000000'
        },
        total: total,
        notas: ''
      };

      console.log('📤 Creando pedido en Django:', pedidoPayload);

      // 3. Crear pedido en Django
      const response = await fetch(`${import.meta.env.VITE_API_URL}/pedidos/pedido/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(pedidoPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error del servidor:', errorData);
        throw new Error(errorData.detail || 'Error al crear el pedido');
      }

      const pedido = await response.json();
      console.log('✅ Pedido creado exitosamente:', pedido);

      // 4. Guardar pedido para uso posterior
      setPedidoData(pedido);
      localStorage.setItem('last_order', JSON.stringify(pedido));
      
      setLoading(false);

    } catch (error) {
      console.error('❌ Error creando pedido:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (result) => {
    console.log('✅ Pago exitoso:', result);
    
    // Guardar info del pago en localStorage
    localStorage.setItem('ultimo_pago', JSON.stringify(result));
    
    // Limpiar carrito después del pago exitoso
    localStorage.removeItem('cart');
    
    // Redirigir según el estado del pago
    if (result.status === 'approved') {
      navigate(`/compra-exitosa?payment_id=${result.payment_id}&external_reference=${pedidoData.id}`);
    } else if (result.status === 'pending' || result.status === 'in_process') {
      navigate(`/pago-pendiente?payment_id=${result.payment_id}&external_reference=${pedidoData.id}`);
    } else {
      // Por si acaso hay algún otro estado
      navigate(`/pago-fallido?payment_id=${result.payment_id}&external_reference=${pedidoData.id}`);
    }
  };

  const handlePaymentError = (error) => {
    console.error('❌ Error en el pago:', error);
    
    // Redirigir a página de fallo con información del pedido
    navigate(`/pago-fallido?external_reference=${pedidoData?.id}`);
  };

  // Estado de carga
  if (loading) {
    return (
      <div className="container min-h-screen flex items-center justify-center bg-[#F0F6F6]">
        <div className="text-center bg-white p-10 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#084B83] mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Preparando tu pedido...</p>
        </div>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="container min-h-screen flex items-center justify-center bg-[#F0F6F6]">
        <div className="bg-red-50 p-8 rounded-lg max-w-md shadow-lg">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-800 mb-4 text-center">Error al crear el pedido</h2>
          <p className="text-red-600 mb-6 text-center">{error}</p>
          <button 
            onClick={() => navigate('/carrito')}
            className="w-full bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700 transition font-semibold"
          >
            Volver al carrito
          </button>
        </div>
      </div>
    );
  }

  // Si no hay pedido (no debería pasar)
  if (!pedidoData) {
    return null;
  }

  // Render principal
  return (
    <section className="min-h-screen bg-[#F0F6F6] px-6 md:px-20 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#084B83] mb-8">Finalizar Compra</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Columna izquierda - Resumen del pedido */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-[#2F4858]">Resumen del pedido</h3>
            
            <div className="bg-gray-50 rounded p-3 mb-4">
              <p className="text-sm text-gray-600">Número de pedido:</p>
              <p className="font-semibold text-[#084B83]">{pedidoData.numero_pedido}</p>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3 text-gray-700">Productos:</h4>
              <div className="space-y-2">
                {pedidoData.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.cantidad}x {item.nombre_producto}
                    </span>
                    <span className="font-semibold text-gray-800">
                      ${Number(item.subtotal).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-700">Total:</span>
                <span className="text-2xl font-bold text-[#084B83]">
                  ${Number(pedidoData.total).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Información adicional */}
            <div className="mt-6 pt-6 border-t">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs text-blue-800">
                  <strong>🔒 Pago seguro</strong> - Tu información está protegida por MercadoPago
                </p>
              </div>
            </div>
          </div>

          {/* Columna derecha - Payment Brick */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-[#2F4858]">Datos de pago</h3>
            <PaymentBrick
              pedidoId={pedidoData.id}
              amount={pedidoData.total}
              description={`Pedido ${pedidoData.numero_pedido} - Ambos Norte`}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          </div>
        </div>
      </div>
    </section>
  );
}