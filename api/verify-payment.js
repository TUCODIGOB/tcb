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

    // Comprobar si ya fue procesado (Stripe como fuente de verdad)
    const paymentIntentId = session.payment_intent;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata?.informe_generado === 'si') {
      return res.status(403).json({ ok: false, error: 'Este informe ya fue generado.' });
    }

    // Marcar inmediatamente como usado en Stripe
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: { informe_generado: 'si' }
    });

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
