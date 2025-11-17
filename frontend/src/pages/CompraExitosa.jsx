/**
 * CompraExitosa.jsx - Página de confirmación de compra exitosa
 * Ubicación: src/pages/CompraExitosa.jsx
 * 
 * Captura y procesa los parámetros que MercadoPago envía:
 * - payment_id: ID del pago
 * - status: Estado del pago (approved)
 * - external_reference: ID del pedido
 * - merchant_order_id: ID de orden de MP
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function CompraExitosa() {
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const procesarPago = async () => {
      try {
        // Capturar parámetros de MercadoPago desde la URL
        const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
        const status = searchParams.get('status') || searchParams.get('collection_status');
        const externalReference = searchParams.get('external_reference');
        const merchantOrderId = searchParams.get('merchant_order_id');
        const preferenceId = searchParams.get('preference_id');

        console.log('📋 Parámetros recibidos de MercadoPago:', {
          paymentId,
          status,
          externalReference,
          merchantOrderId,
          preferenceId
        });

        // Intentar obtener pedido desde localStorage
        const raw = localStorage.getItem("last_order");
        let pedidoLocal = raw ? JSON.parse(raw) : null;

        // Si tenemos external_reference (ID del pedido), buscar en el backend
        if (externalReference) {
          try {
            const token = localStorage.getItem("authToken");
            if (token) {
              const response = await fetch(
                `${import.meta.env.VITE_API_URL}/pedidos/pedido/${externalReference}/`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                const pedidoBackend = await response.json();
                console.log('✅ Pedido obtenido del backend:', pedidoBackend);
                setOrden({
                  ...pedidoBackend,
                  paymentId,
                  status,
                  merchantOrderId
                });
                setLoading(false);
                return;
              }
            }
          } catch (error) {
            console.error('Error al obtener pedido del backend:', error);
          }
        }

        // Fallback: usar pedido de localStorage
        if (pedidoLocal) {
          setOrden({
            ...pedidoLocal,
            paymentId,
            status,
            merchantOrderId
          });
        } else {
          // No hay pedido - mostrar info básica
          setOrden({
            id: externalReference || 'N/A',
            numero_pedido: externalReference || 'N/A',
            paymentId,
            status,
            merchantOrderId
          });
        }

      } catch (error) {
        console.error('Error al procesar pago:', error);
        setOrden(null);
      } finally {
        setLoading(false);
      }
    };

    procesarPago();
  }, [searchParams]);

  const verOrden = () => {
    navigate("/perfil?tab=pedidos");
  };

  if (loading) {
    return (
      <section className="h-full md:min-h-[calc(100vh-8rem)] bg-[#F0F6F6] px-6 md:px-20 py-20 flex flex-col items-center justify-center">
        <div className="bg-white shadow rounded-lg p-10 max-w-xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#084B83] mx-auto mb-4"></div>
          <p className="text-center text-gray-600">Procesando tu pago...</p>
        </div>
      </section>
    );
  }

  const numeroPedido = orden?.numero_pedido || orden?.id || 'N/A';
  const paymentId = orden?.paymentId || 'N/A';

  return (
    <section className="h-full md:min-h-[calc(100vh-8rem)] bg-[#F0F6F6] px-6 md:px-20 py-20 flex flex-col items-center text-center">
      <div className="bg-white shadow rounded-lg p-10 max-w-xl w-full">
        {/* Ícono de éxito */}
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100">
            <svg
              className="h-12 w-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold mb-2 text-[#2F4858]">
          ¡Pago exitoso!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Tu compra ha sido confirmada correctamente
        </p>

        {/* Información del pedido */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Número de pedido:</span>
              <span className="font-semibold text-[#084B83]">{numeroPedido}</span>
            </div>
            
            {paymentId !== 'N/A' && (
              <div className="flex justify-between">
                <span className="text-gray-600">ID de pago:</span>
                <span className="font-mono text-sm text-gray-700">{paymentId}</span>
              </div>
            )}

            {orden?.total && (
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-gray-600">Total pagado:</span>
                <span className="font-bold text-lg text-[#084B83]">
                  ${Number(orden.total).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-blue-800">
            <strong>📧 Nuestro equipo te contactará en menos de 24hs habiles</strong> para coordinar el envio y entrega de tu producto. Muchas gracias!
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={verOrden} 
            className="bg-[#084B83] text-white px-6 py-3 rounded-full hover:bg-[#063d6b] transition font-semibold"
          >
            Ver mi pedido
          </button>
          <a 
            href="/" 
            className="border-2 border-[#084B83] text-[#084B83] px-6 py-3 rounded-full hover:bg-[#084B83] hover:text-white transition font-semibold"
          >
            Seguir comprando
          </a>
        </div>

        {/* Estado del pago */}
        <div className="mt-6 pt-6 border-t">
          <p className="text-xs text-gray-500">
            Estado: <span className="text-green-600 font-semibold">✓ Aprobado</span>
          </p>
        </div>
      </div>
    </section>
  );
}