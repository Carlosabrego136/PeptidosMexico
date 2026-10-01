// Procesa un cobro real con tarjeta a través de Mercado Pago (API de Pagos).
// El número de tarjeta NUNCA llega a este servidor: el navegador lo tokeniza
// directamente con Mercado Pago (vía su SDK, mercadopago.js) y aquí solo
// recibimos ese token (de un solo uso) + el monto a cobrar.

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_API_URL = 'https://api.mercadopago.com/v1/payments';

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  if (!MP_ACCESS_TOKEN) {
    res.status(503).json({ error: 'Los pagos con tarjeta todavía no están configurados.' });
    return;
  }

  try {
    const {
      token,
      payment_method_id,
      issuer_id,
      installments,
      transaction_amount,
      description,
      payer_email,
      external_reference,
    } = req.body || {};

    if (!token || !payment_method_id || !transaction_amount || !payer_email) {
      res.status(400).json({ error: 'Faltan datos para procesar el pago.' });
      return;
    }

    const amount = round2(transaction_amount);
    if (!(amount > 0)) {
      res.status(400).json({ error: 'El monto del pedido no es válido.' });
      return;
    }

    const body = {
      transaction_amount: amount,
      token,
      description: description || 'Pedido Mundo Péptidos México',
      installments: Number(installments) || 1,
      payment_method_id,
      payer: { email: String(payer_email).trim() },
    };
    if (issuer_id) body.issuer_id = String(issuer_id);
    if (external_reference) body.external_reference = String(external_reference);

    // X-Idempotency-Key evita que un doble clic / reintento de red genere un cobro duplicado.
    const idempotencyKey = `mpm-${external_reference || Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const mpRes = await fetch(MP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      console.error('mercado pago payment error', mpRes.status, data);
      res.status(mpRes.status >= 400 && mpRes.status < 500 ? 400 : 502).json({
        error: data?.message || 'Mercado Pago rechazó la solicitud de pago.',
        mp_status: data?.status,
        mp_status_detail: data?.status_detail,
      });
      return;
    }

    res.status(200).json({
      id: data.id,
      status: data.status, // 'approved' | 'in_process' | 'rejected' | ...
      status_detail: data.status_detail,
    });
  } catch (err) {
    console.error('payment process error', err);
    res.status(500).json({ error: 'Error del servidor al procesar el pago.' });
  }
};
