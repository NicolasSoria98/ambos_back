const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Payment } = require('mercadopago');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: 'http://localhost:3000'
}));
app.use(express.json());

// Configurar MP
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN 
});

// ✅ Endpoint principal - Procesar pago con Payment Brick
app.post('/process-payment', async (req, res) => {
  try {
    const { 
      transaction_amount,
      token, 
      description,
      installments,
      payment_method_id,
      payer,
      metadata
    } = req.body;

    const payment = new Payment(client);

    const result = await payment.create({
      body: {
        transaction_amount: Number(transaction_amount),
        token,
        description,
        installments: Number(installments),
        payment_method_id,
        payer: {
          email: payer.email,
          identification: {
            type: payer.identification.type,
            number: payer.identification.number
          }
        },
        metadata: metadata || {}
      }
    });

    console.log('✅ Pago procesado:', result);

    // 🔥 NOTIFICAR A DJANGO
    if (result.status === 'approved') {
      try {
        const djangoResponse = await fetch('http://localhost:8000/api/pagos/confirmar/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pedido_id: metadata?.pedido_id,
            payment_id: result.id,
            status: result.status,
            status_detail: result.status_detail,
            transaction_amount: result.transaction_amount,
            payment_method_id: result.payment_method_id,
            payer_email: payer.email,
            installments: installments
          })
        });

        const djangoData = await djangoResponse.json();
        console.log('✅ Django notificado:', djangoData);
      } catch (djangoError) {
        console.error('❌ Error notificando a Django:', djangoError);
      }
    }

    res.json({
      success: true,
      payment_id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      transaction_amount: result.transaction_amount,
      payment_method_id: result.payment_method_id,
      date_approved: result.date_approved
    });

  } catch (error) {
    console.error('❌ Error procesando pago:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      cause: error.cause
    });
  }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 MercadoPago Service running on http://localhost:${PORT}`);
});