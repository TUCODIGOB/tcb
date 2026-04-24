// ═════════════════════════════════════════════════════════════════
// /api/verify-payment.js
// Verifica que un session_id es real y el pago está confirmado.
// Se llama desde generando-informe.html al cargar la página.
// ═════════════════════════════════════════════════════════════════

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { session_id } = req.body;

    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({ ok: false, error: 'Falta session_id' });
    }

    // Consultar sesión en Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session) {
      return res.status(404).json({ ok: false, error: 'Sesión no encontrada' });
    }

    // Comprobar que el pago está confirmado
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ ok: false, error: 'El pago no está confirmado' });
    }

    // Devolver los metadata (datos del formulario) para que generando-informe
    // los use para generar el PDF (aunque el usuario haya borrado localStorage)
    const email = session.customer_email;
    const BREVO_API_KEY = process.env.BREVO_API_KEY;

    // Comprobar si ya fue procesado
    try {
      const brevoResp = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
        headers: { 'accept': 'application/json', 'api-key': BREVO_API_KEY },
      });
      if (brevoResp.ok) {
        const contacto = await brevoResp.json();
        if (contacto.attributes?.P1_COMPRADO === 'si') {
          return res.status(403).json({ ok: false, error: 'Este informe ya fue generado.' });
        }
      }
    } catch(e) {}

    // Marcar inmediatamente como usado
    try {
      await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': BREVO_API_KEY },
        body: JSON.stringify({ attributes: { P1_COMPRADO: 'si' } }),
      });
    } catch(e) {}

    return res.status(200).json({
      ok: true,
      email,
      metadata: session.metadata || {},
    });

  } catch (error) {
    console.error('Error verificando pago:', error);
    return res.status(500).json({ ok: false, error: 'No se pudo verificar el pago' });
  }
}
