import { initMercadoPago } from '@mercadopago/sdk-react';
import PaymentBrick from '../components/PaymentBrick';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth';

initMercadoPago('TEST-4aa13959-24eb-4a20-8858-fbc57f97deb1');

const COSTO_ENVIO = 2000;

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

const getAuthUser = () => {
  const clientUser = authService.getClienteUser();
  if (clientUser) return clientUser;

  const adminUser = authService.getAdminUser();
  if (adminUser) return adminUser;

  try {
    const userStr = localStorage.getItem('client_user') || localStorage.getItem('admin_user') || localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : {};
  } catch {
    return {};
  }
};

export default function EnvioPago() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tipoEntrega, setTipoEntrega] = useState('retiro');
  const [cart, setCart] = useState([]);
  const [pedidoCreado, setPedidoCreado] = useState(null);

  const [direccion, setDireccion] = useState({
    calle: '',
    numero: '',
    piso_depto: '',
    ciudad: 'Corrientes'
  });

  useEffect(() => {
    const cartRaw = localStorage.getItem('cart');
    const cartData = cartRaw ? JSON.parse(cartRaw) : [];
    
    if (cartData.length === 0) {
      alert('Tu carrito está vacío');
      navigate('/carrito');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      alert('Debes iniciar sesión para realizar una compra');
      navigate('/registro');
      return;
    }

    setCart(cartData);
  }, [navigate]);

  const crearPedidoConMetodoPago = async (metodoPago) => {
    try {
      setLoading(true);

      if (cart.length === 0) {
        alert('Tu carrito está vacío');
        navigate('/carrito');
        return null;
      }

      const token = getAuthToken();
      const user = getAuthUser();

      if (!token) {
        alert('Debes iniciar sesión para realizar una compra');
        navigate('/registro');
        return null;
      }

      if (tipoEntrega === 'envio') {
        if (!direccion.calle.trim()) {
          alert('Por favor ingresa la calle');
          setLoading(false);
          return null;
        }
        if (!direccion.numero.trim()) {
          alert('Por favor ingresa el número');
          setLoading(false);
          return null;
        }
      }

      const items = cart.map(item => ({
        producto_id: item.id,
        variante_id: item.variante_id || null,
        cantidad: item.cantidad || 1,
        precio_unitario: item.precio
      }));

      const subtotal = cart.reduce((sum, it) => {
        const precio = Number(it.precio) || 0;
        const cantidad = Number(it.cantidad) || 1;
        return sum + (precio * cantidad);
      }, 0);

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
        notas: tipoEntrega === 'retiro' ? 'Retiro en local' : '',
        metodo_pago: metodoPago,
        estado_pago: 'pendiente'
      };

      if (tipoEntrega === 'envio') {
        pedidoPayload.direccion = {
          calle: direccion.calle,
          numero: direccion.numero,
          piso_depto: direccion.piso_depto || '',
          ciudad: direccion.ciudad
        };
      }

      console.log('📤 Creando pedido:', pedidoPayload);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/pedidos/pedido/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pedidoPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear pedido');
      }

      const pedido = await response.json();
      console.log('✅ Pedido creado:', pedido);

      localStorage.setItem('last_order', JSON.stringify(pedido));
      setLoading(false);
      return pedido;

    } catch (error) {
      console.error('❌ Error creando pedido:', error);
      setError(error.message);
      setLoading(false);
      return null;
    }
  };

  const handlePagoEnLocal = async () => {
    if (tipoEntrega !== 'retiro') {
      alert('El pago en efectivo solo está disponible para retiro en local');
      return;
    }

    const pedido = await crearPedidoConMetodoPago('efectivo');
    
    if (!pedido) return;

    localStorage.setItem('ultimo_pago', JSON.stringify({
      payment_id: `LOCAL-${pedido.id}`,
      status: 'pending',
      payment_method_id: 'efectivo_local'
    }));

    localStorage.removeItem('cart');
    navigate(`/pago-pendiente?payment_id=LOCAL-${pedido.id}&external_reference=${pedido.id}&type=local`);
  };

  const handlePagoOnline = async () => {
    const pedido = await crearPedidoConMetodoPago('mercadopago');
    
    if (!pedido) return;

    setPedidoCreado(pedido);
  };

  const handlePaymentSuccess = async (result) => {
    console.log('✅ Pago exitoso de MercadoPago:', result);

    if (!pedidoCreado) {
      console.error('❌ No hay pedido creado');
      return;
    }

    try {
      const token = getAuthToken();
      
      // Mapear estados de MercadoPago a estados del modelo Pedido
      let estadoPago = 'pendiente';
      if (result.status === 'approved') {
        estadoPago = 'pagado';  // ✅ Cambio de 'aprobado' a 'pagado'
      } else if (result.status === 'rejected') {
        estadoPago = 'rechazado';
      }

      console.log(`🔄 Actualizando estado_pago del pedido ${pedidoCreado.id} a: ${estadoPago}`);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/pedidos/pedido/${pedidoCreado.id}/actualizar_pago/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          estado_pago: estadoPago,
          payment_id: result.payment_id || result.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error en respuesta del servidor:', errorData);
      } else {
        const data = await response.json();
        console.log('✅ Pago actualizado correctamente:', data);
      }
    } catch (error) {
      console.error('❌ Error al actualizar estado del pago:', error);
    }

    localStorage.setItem('ultimo_pago', JSON.stringify(result));
    localStorage.removeItem('cart');

    if (result.status === 'approved') {
      navigate(`/compra-exitosa?payment_id=${result.payment_id || result.id}&external_reference=${pedidoCreado.id}`);
    } else if (result.status === 'pending' || result.status === 'in_process') {
      navigate(`/pago-pendiente?payment_id=${result.payment_id || result.id}&external_reference=${pedidoCreado.id}`);
    } else {
      navigate(`/pago-fallido?payment_id=${result.payment_id || result.id}&external_reference=${pedidoCreado.id}`);
    }
  };

  const handlePaymentError = (error) => {
    console.error('❌ Error en pago:', error);
    alert('Hubo un error al procesar el pago. Intenta de nuevo.');
    setLoading(false);
    setPedidoCreado(null);
  };

  const handleDireccionChange = (e) => {
    const { name, value } = e.target;
    setDireccion(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (cart.length === 0 && !loading) {
    return null;
  }

  const subtotal = cart.reduce((sum, it) => {
    const precio = Number(it.precio) || 0;
    const cantidad = Number(it.cantidad) || 1;
    return sum + (precio * cantidad);
  }, 0);

  const costoEnvio = tipoEntrega === 'envio' ? COSTO_ENVIO : 0;
  const total = subtotal + costoEnvio;

  return (
    <section className="min-h-screen bg-[#F0F6F6] px-6 md:px-20 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#084B83] mb-8">Finalizar Compra</h1>

        {error && (
          <div className="bg-red-50 p-4 rounded-lg mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-[#2F4858]">Resumen del pedido</h3>

            <div className="mb-6 border rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold mb-3">Tipo de entrega:</h4>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="entrega"
                    value="retiro"
                    checked={tipoEntrega === 'retiro'}
                    onChange={(e) => setTipoEntrega(e.target.value)}
                    disabled={loading || pedidoCreado}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">Retiro en el local (Gratis)</div>
                    <div className="text-xs text-gray-600">Pasá a buscar tu pedido</div>
                  </div>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="entrega"
                    value="envio"
                    checked={tipoEntrega === 'envio'}
                    onChange={(e) => setTipoEntrega(e.target.value)}
                    disabled={loading || pedidoCreado}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">Envío a domicilio (+${COSTO_ENVIO.toLocaleString()})</div>
                    <div className="text-xs text-gray-600">Recibilo en tu casa</div>
                  </div>
                </label>
              </div>
            </div>

            {tipoEntrega === 'envio' && (
              <div className="mb-6 border rounded-lg p-4 bg-yellow-50">
                <h4 className="font-semibold mb-3">Dirección de envío:</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Calle *</label>
                    <input
                      type="text"
                      name="calle"
                      value={direccion.calle}
                      onChange={handleDireccionChange}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: San Martín"
                      required
                      disabled={loading || pedidoCreado}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Número *</label>
                      <input
                        type="text"
                        name="numero"
                        value={direccion.numero}
                        onChange={handleDireccionChange}
                        className="w-full border rounded px-3 py-2"
                        placeholder="1234"
                        required
                        disabled={loading || pedidoCreado}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Piso/Depto</label>
                      <input
                        type="text"
                        name="piso_depto"
                        value={direccion.piso_depto}
                        onChange={handleDireccionChange}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Opcional"
                        disabled={loading || pedidoCreado}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Ciudad *</label>
                    <select
                      name="ciudad"
                      value={direccion.ciudad}
                      onChange={handleDireccionChange}
                      className="w-full border rounded px-3 py-2"
                      required
                      disabled={loading || pedidoCreado}
                    >
                      <option value="Corrientes">Corrientes (CP: 3400)</option>
                      <option value="Resistencia">Resistencia (CP: 3500)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 text-gray-700">Productos:</h4>
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.cantidad}x {item.nombre}
                      {item.talla && item.color && (
                        <span className="text-xs text-gray-500 ml-1">
                          ({item.talla} - {item.color})
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">
                      ${(Number(item.precio) * Number(item.cantidad)).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

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
                  ${total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-[#2F4858]">Método de pago</h3>

            {!pedidoCreado ? (
              <>
                {tipoEntrega === 'retiro' && (
                  <div className="mb-6 border-2 border-[#084B83] rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-bold text-[#084B83]">💵 Pagar en el local</div>
                        <div className="text-sm text-gray-600">Abonás en efectivo cuando retirás</div>
                      </div>
                    </div>
                    <button
                      onClick={handlePagoEnLocal}
                      disabled={loading}
                      className="w-full bg-[#084B83] text-white px-6 py-3 rounded-full hover:bg-[#063d6b] transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Procesando...' : 'Confirmar - Pago en efectivo'}
                    </button>
                  </div>
                )}

                {tipoEntrega === 'retiro' && (
                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">o</span>
                    </div>
                  </div>
                )}

                <div className="border-2 border-green-600 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-bold text-green-700">💳 Mercado Pago</div>
                      <div className="text-sm text-gray-600">
                        {tipoEntrega === 'envio' ? 'Única opción para envío a domicilio' : 'Paga online de forma segura'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handlePagoOnline}
                    disabled={loading}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Procesando...' : 'Pagar con Mercado Pago'}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-4 text-center">
                  Al confirmar se creará tu pedido
                </p>
              </>
            ) : (
              <div>
                <p className="text-green-600 font-semibold mb-4">
                  ✅ Pedido #{pedidoCreado.numero_pedido} creado
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Completa el pago para confirmar tu compra
                </p>
                <PaymentBrick
                  pedidoId={pedidoCreado.id}
                  amount={pedidoCreado.total}
                  description={`Pedido ${pedidoCreado.numero_pedido} - Ambos Norte`}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}