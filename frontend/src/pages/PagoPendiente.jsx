/**
 * PagoPendiente.jsx - Página para pagos pendientes (efectivo, transferencia, etc.)
 * Ubicación: src/pages/PagoPendiente.jsx
 * 
 * Muestra instrucciones para completar pagos offline (Rapipago, Pago Fácil, etc.)
 */
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function PagoPendiente() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [detalles, setDetalles] = useState({
    paymentId: null,
    status: null,
    paymentType: null,
    externalReference: null,
    merchantOrderId: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const procesarPagoPendiente = async () => {
      try {
        // Capturar parámetros de la URL
        const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
        const status = searchParams.get('status') || searchParams.get('collection_status');
        const paymentType = searchParams.get('payment_type');
        const externalReference = searchParams.get('external_reference');
        const merchantOrderId = searchParams.get('merchant_order_id');

        console.log('⏳ Pago pendiente - Parámetros:', {
          paymentId,
          status,
          paymentType,
          externalReference,
          merchantOrderId
        });

        setDetalles({
          paymentId,
          status,
          paymentType,
          externalReference,
          merchantOrderId
        });

      } catch (error) {
        console.error('Error al procesar pago pendiente:', error);
      } finally {
        setLoading(false);
      }
    };

    procesarPagoPendiente();
  }, [searchParams]);

  const verPedido = () => {
    navigate("/perfil?tab=pedidos");
  };

  const irAlInicio = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <section className="h-full md:min-h-[calc(100vh-8rem)] bg-[#F0F6F6] px-6 md:px-20 py-20 flex flex-col items-center justify-center">
        <div className="bg-white shadow rounded-lg p-10 max-w-xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#084B83] mx-auto mb-4"></div>
          <p className="text-center text-gray-600">Procesando información...</p>
        </div>
      </section>
    );
  }

  // Determinar el tipo de pago
  const esPagoEfectivo = detalles.paymentType === 'ticket' || detalles.paymentType === 'atm';
  const esPagoTransferencia = detalles.paymentType === 'bank_transfer';

  return (
    <section className="h-full md:min-h-[calc(100vh-8rem)] bg-[#F0F6F6] px-6 md:px-20 py-20 flex flex-col items-center text-center">
      <div className="bg-white shadow rounded-lg p-10 max-w-2xl w-full">
        {/* Ícono de pendiente */}
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-yellow-100">
            <svg
              className="h-12 w-12 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold mb-2 text-[#2F4858]">
          ¡Pago pendiente!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Tu pedido está registrado y esperando confirmación del pago
        </p>

        {/* Información del pedido */}
        {detalles.externalReference && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Número de pedido:</span>
                <span className="font-semibold text-[#084B83]">{detalles.externalReference}</span>
              </div>
              {detalles.paymentId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">ID de pago:</span>
                  <span className="font-mono text-gray-700">{detalles.paymentId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instrucciones según tipo de pago */}
        {esPagoEfectivo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-bold text-blue-900 mb-4 text-lg">
              📋 Cómo completar tu pago en efectivo
            </h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">1. Guardá estos datos</h4>
                <p className="text-sm text-blue-700">
                  Te enviamos un email con el comprobante y código de pago
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-blue-800 mb-2">2. Acercate a un punto de pago</h4>
                <div className="bg-white rounded p-3 text-sm">
                  <p className="text-blue-700 mb-2">Podés pagar en:</p>
                  <ul className="space-y-1 text-blue-600">
                    <li>• Rapipago</li>
                    <li>• Pago Fácil</li>
                    <li>• Otros puntos habilitados</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-blue-800 mb-2">3. Presentá el comprobante</h4>
                <p className="text-sm text-blue-700">
                  Mostrá el código de pago en el punto de cobro. Podés usar el comprobante impreso o desde tu celular.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-blue-800 mb-2">4. Confirmación automática</h4>
                <p className="text-sm text-blue-700">
                  Una vez que pagues, recibirás un email de confirmación y tu pedido pasará a preparación.
                </p>
              </div>
            </div>
          </div>
        )}

        {esPagoTransferencia && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-bold text-blue-900 mb-4 text-lg">
              🏦 Cómo completar tu transferencia
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              Te enviamos un email con los datos bancarios para realizar la transferencia.
            </p>
            <p className="text-sm text-blue-700">
              Una vez acreditado el pago, tu pedido será procesado automáticamente.
            </p>
          </div>
        )}

        {/* Advertencia de vencimiento */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-orange-800">
            <strong>⚠️ Importante:</strong> Debes pasar por alguna sucursal a retirar tu pedido y efectuar el pago, recuerda que tienes tu reserva por 48hs. En caso que no retires tu pedido, perderás la reserva del producto
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={verPedido} 
            className="bg-[#084B83] text-white px-6 py-3 rounded-full hover:bg-[#063d6b] transition font-semibold"
          >
            Ver mi pedido
          </button>
          <button 
            onClick={irAlInicio} 
            className="border-2 border-[#084B83] text-[#084B83] px-6 py-3 rounded-full hover:bg-[#084B83] hover:text-white transition font-semibold"
          >
            Volver al inicio
          </button>
        </div>

        {/* Información adicional */}
        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-gray-600">
            ¿Tenés dudas? <a href="/contacto" className="text-[#084B83] hover:underline font-semibold">Contactanos</a>
          </p>
        </div>
      </div>
    </section>
  );
}