/**
 * PagoFallido.jsx - Página para pagos rechazados
 * Ubicación: src/pages/PagoFallido.jsx
 * 
 * Captura parámetros de MercadoPago cuando el pago falla
 */
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import paymentsService from "../services/payments";

export default function PagoFallido() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [detalles, setDetalles] = useState({
    paymentId: null,
    status: null,
    statusDetail: null,
    externalReference: null
  });

  useEffect(() => {
    // Capturar parámetros de la URL
    const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
    const status = searchParams.get('status') || searchParams.get('collection_status');
    const statusDetail = searchParams.get('status_detail');
    const externalReference = searchParams.get('external_reference');

    console.log('❌ Pago rechazado - Parámetros:', {
      paymentId,
      status,
      statusDetail,
      externalReference
    });

    setDetalles({
      paymentId,
      status,
      statusDetail,
      externalReference
    });
  }, [searchParams]);

  const volverAlCheckout = () => {
    // Restaurar el carrito si tenemos el pedido guardado
    const lastOrder = localStorage.getItem("last_order");
    if (lastOrder) {
      try {
        const order = JSON.parse(lastOrder);
        if (order.items) {
          localStorage.setItem("cart", JSON.stringify(order.items));
        }
      } catch (error) {
        console.error('Error al restaurar carrito:', error);
      }
    }
    
    navigate("/enviopago");
  };

  const irAlInicio = () => {
    navigate("/");
  };

  // Obtener mensaje de error según el status_detail
  const mensajeError = detalles.statusDetail 
    ? paymentsService.obtenerMensajeError(detalles.statusDetail)
    : 'El pago no pudo ser procesado';

  return (
    <section className="h-full md:min-h-[calc(100vh-8rem)] bg-[#F0F6F6] px-6 md:px-20 py-20 flex flex-col items-center text-center">
      <div className="bg-white shadow rounded-lg p-10 max-w-xl w-full">
        {/* Ícono de error */}
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100">
            <svg
              className="h-12 w-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold mb-2 text-[#2F4858]">
          Pago rechazado
        </h1>
        
        <p className="text-gray-600 mb-6">
          {mensajeError}
        </p>

        {/* Detalles del error */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-red-800 mb-2">¿Qué puedo hacer?</h3>
          <ul className="text-sm text-red-700 space-y-1">
            <li>• Verificá que los datos de tu tarjeta sean correctos</li>
            <li>• Asegurate de tener fondos suficientes</li>
            <li>• Contactá a tu banco para autorizar la compra</li>
            <li>• Intentá con otro medio de pago</li>
          </ul>
        </div>

        {/* Información adicional */}
        {detalles.paymentId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID de intento:</span>
                <span className="font-mono text-gray-700">{detalles.paymentId}</span>
              </div>
              {detalles.externalReference && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Número de pedido:</span>
                  <span className="font-semibold text-gray-700">{detalles.externalReference}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={volverAlCheckout} 
            className="bg-[#084B83] text-white px-6 py-3 rounded-full hover:bg-[#063d6b] transition font-semibold"
          >
            Reintentar pago
          </button>
          <button 
            onClick={irAlInicio} 
            className="border-2 border-gray-400 text-gray-700 px-6 py-3 rounded-full hover:bg-gray-100 transition font-semibold"
          >
            Volver al inicio
          </button>
        </div>

        {/* Ayuda adicional */}
        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-gray-600">
            ¿Necesitás ayuda? <a href="/contacto" className="text-[#084B83] hover:underline font-semibold">Contactanos</a>
          </p>
        </div>
      </div>
    </section>
  );
}