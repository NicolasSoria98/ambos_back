import { initMercadoPago } from '@mercadopago/sdk-react';
import PaymentBrick from '../components/PaymentBrick';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth';

initMercadoPago('TEST-4aa13959-24eb-4a20-8858-fbc57f97deb1');

const COSTO_ENVIO = 2000;

// ✅ Función para obtener el token correctamente
const getAuthToken = () => {
  const clientToken = authService.getClienteToken();
  if (clientToken) return clientToken;

  const adminToken = authService.getAdminToken();
  if (adminToken) return adminToken;

  return (
    localStorage.getItem("client_authToken") ||
    localStorage.getItem("admin_authToken") ||
    localStorage.getItem("clientAuthToken") ||
    localStorage.getItem("authToken") ||
    null
  );
};

// ✅ Función para obtener el usuario correctamente
const getAuthUser = () => {
  const clientUser = authService.getClienteUser();
  if (clientUser) return clientUser;

  const adminUser = authService.getAdminUser();
  if (adminUser) return adminUser;

  // Fallback manual
  try {
    const userStr = localStorage.getItem('client_user') || localStorage.getItem('admin_user') || localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : {};
  } catch {
    return {};
  }
};

export default function EnvioPago() {
  const navigate = useNavigate();
  const [pedidoData, setPedidoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tipoEntrega, setTipoEntrega] = useState('envio'); // 'envio' o 'retiro'

  useEffect(() => {
    crearPedido();
  }, [tipoEntrega]); // ✅ Recrear pedido cuando cambia tipo de entrega

  const crearPedido = async () => {
    try {
      setLoading(true);
      
      const cartRaw = localStorage.getItem('cart');
      const cart = cartRaw ? JSON.parse(cartRaw) : [];
      
      if (cart.length === 0) {
        alert('Tu carrito está vacío');
        navigate('/carrito');
        return;
      }

      // ✅ Obtener token y usuario usando las funciones correctas
      const token = getAuthToken();
      const user = getAuthUser();
      
      // ✅ Verificar que el usuario esté autenticado
      if (!token) {
        alert('Debes iniciar sesión para realizar una compra');
        navigate('/registro');
        return;
      }
      
      const items = cart.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad || 1,
        precio_unitario: item.precio
      }));

      // ✅ Calcular subtotal (sin envío)
      const subtotal = cart.reduce((sum, it) => {
        const precio = Number(it.precio) || 0;
        const cantidad = Number(it.cantidad) || 1;
        return sum + (precio * cantidad);
      }, 0);

      // ✅ Agregar costo de envío solo si es envío a domicilio
      const costoEnvio = tipoEntrega === 'envio' ? COSTO_ENVIO : 0;
      const total = subtotal + costoEnvio;

      const pedidoPayload = {
        items: items,
        contacto: {
          email: user.email || 'cliente@example.com',
          telefono: user.telefono || '3794000000'
        },
        total: total,
        envio: {
          tipo: tipoEntrega,
          costo: costoEnvio
        },
        notas: tipoEntrega === 'retiro' ? 'Retiro en local' : ''
      };

      console.log('📤 Creando pedido:', pedidoPayload);
      console.log('🔑 Token usado:', token ? 'Token presente' : 'Sin token');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/pedidos/pedido/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ✅ Siempre enviar el token
        },
        body: JSON.stringify(pedidoPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear pedido');
      }

      const pedido = await response.json();
      console.log('✅ Pedido creado:', pedido);

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
    
    localStorage.setItem('ultimo_pago', JSON.stringify(result));
    localStorage.removeItem('cart');
    
    if (result.status === 'approved') {
      navigate(`/compra-exitosa?payment_id=${result.payment_id}&external_reference=${pedidoData.id}`);
    } else if (result.status === 'pending' || result.status === 'in_process') {
      navigate(`/pago-pendiente?payment_id=${result.payment_id}&external_reference=${pedidoData.id}`);
    } else {
      navigate(`/pago-fallido?payment_id=${result.payment_id}&external_reference=${pedidoData.id}`);
    }
  };

  const handlePaymentError = (error) => {
    console.error('❌ Error:', error);
    navigate(`/pago-fallido?external_reference=${pedidoData?.id}`);
  };

  // ✅ Handler para pago en el local
  const handlePagoEnLocal = () => {
    if (!pedidoData) return;
    
    // Guardar que eligió pago en local
    localStorage.setItem('ultimo_pago', JSON.stringify({
      payment_id: `LOCAL-${pedidoData.id}`,
      status: 'pending',
      payment_method_id: 'efectivo_local'
    }));
    
    localStorage.removeItem('cart');
    
    // Redirigir a página de pendiente con mensaje especial
    navigate(`/pago-pendiente?payment_id=LOCAL-${pedidoData.id}&external_reference=${pedidoData.id}&type=local`);
  };

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

  if (error) {
    return (
      <div className="container min-h-screen flex items-center justify-center bg-[#F0F6F6]">
        <div className="bg-red-50 p-8 rounded-lg max-w-md shadow-lg">
          <h2 className="text-xl font-bold text-red-800 mb-4">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/carrito')}
            className="bg-red-600 text-white px-6 py-2 rounded-full"
          >
            Volver al carrito
          </button>
        </div>
      </div>
    );
  }

  if (!pedidoData) return null;

  const subtotal = pedidoData.total - (tipoEntrega === 'envio' ? COSTO_ENVIO : 0);

  return (
    <section className="min-h-screen bg-[#F0F6F6] px-6 md:px-20 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#084B83] mb-8">Finalizar Compra</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Resumen del pedido */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-[#2F4858]">Resumen del pedido</h3>
            
            <div className="bg-gray-50 rounded p-3 mb-4">
              <p className="text-sm text-gray-600">Número de pedido:</p>
              <p className="font-semibold text-[#084B83]">{pedidoData.numero_pedido}</p>
            </div>

            {/* ✅ Selector de tipo de entrega */}
            <div className="mb-6 border rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold mb-3">Tipo de entrega:</h4>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input 
                    type="radio" 
                    name="entrega" 
                    value="envio"
                    checked={tipoEntrega === 'envio'}
                    onChange={(e) => setTipoEntrega(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">Envío a domicilio (+${COSTO_ENVIO.toLocaleString()})</div>
                    <div className="text-xs text-gray-600">Recibilo en tu casa</div>
                  </div>
                </label>
                
                <label className="flex items-center cursor-pointer">
                  <input 
                    type="radio" 
                    name="entrega" 
                    value="retiro"
                    checked={tipoEntrega === 'retiro'}
                    onChange={(e) => setTipoEntrega(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">Retiro en el local (Gratis)</div>
                    <div className="text-xs text-gray-600">Pasá a buscar tu pedido</div>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 text-gray-700">Productos:</h4>
              <div className="space-y-2">
                {pedidoData.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.cantidad}x {item.nombre_producto}
                    </span>
                    <span className="font-semibold">
                      ${Number(item.subtotal).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* ✅ Mostrar desglose de costos */}
            <div className="border-t pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">${subtotal.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Envío:</span>
                <span className="font-semibold">
                  {tipoEntrega === 'retiro' ? 'Gratis' : `$${COSTO_ENVIO.toLocaleString()}`}
                </span>
              </div>
              
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-2xl font-bold text-[#084B83]">
                  ${Number(pedidoData.total).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Brick y opciones de pago */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-[#2F4858]">Método de pago</h3>
            
            {/* ✅ Opción de pago en el local */}
            <div className="mb-6 border-2 border-[#084B83] rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold text-[#084B83]">💵 Pagar en el local</div>
                  <div className="text-sm text-gray-600">Abonás cuando retirás tu pedido</div>
                </div>
              </div>
              <button
                onClick={handlePagoEnLocal}
                className="w-full bg-[#084B83] text-white px-6 py-3 rounded-full hover:bg-[#063d6b] transition font-semibold"
              >
                Confirmar pedido - Pago en local
              </button>
            </div>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">o pagá online</span>
              </div>
            </div>

            {/* Payment Brick */}
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