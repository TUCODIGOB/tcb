// ═════════════════════════════════════════════════════════════════
// /api/verify-payment.js
// Verifica que un session_id es real y el pago está confirmado.
// Se llama desde generando-informe.html al cargar la página.
// ═════════════════════════════════════════════════════════════════

import Stripe from 'stripe';
import { compraValida, estado } from '../lib/reserva.js';

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

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session) {
      return res.status(404).json({ ok: false, error: 'Sesión no encontrada' });
    }

    if (!compraValida(session)) {
      return res.status(402).json({ ok: false, error: 'El pago no está confirmado' });
    }

    const email = session.customer_email || session.customer_details?.email;
    const BREVO_API_KEY = process.env.BREVO_API_KEY;

    // Actualizar Brevo
    try {
      await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': BREVO_API_KEY },
        body: JSON.stringify({ attributes: { P1_COMPRADO: 'si' } }),
      });
    } catch(e) {
      console.error('Error actualizando Brevo:', e);
    }

    // El estado se calcula aqui, con el reloj del servidor: si se calculara
    // en el navegador, un reloj desajustado daria un resultado distinto.
    // Sirve para que la pagina no arranque una generacion que el servidor va
    // a rechazar de todos modos, y pueda decirle al cliente que pasa.
    const st = estado(session);

    return res.status(200).json({
      ok: true,
      email,
      metadata: session.metadata || {},
      estadoInforme: st.completado ? 'completado' : (st.ocupada ? 'en_curso' : 'libre'),
    });

  } catch (error) {
    console.error('Error verificando pago:', error);
    return res.status(500).json({ ok: false, error: 'No se pudo verificar el pago' });
  }
}
