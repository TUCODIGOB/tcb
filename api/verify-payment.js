// ═════════════════════════════════════════════════════════════════
// /api/verify-payment.js
// Verifica que un session_id es real y el pago está confirmado.
// Se llama desde generando-informe.html al cargar la página.
// ═════════════════════════════════════════════════════════════════

import Stripe from 'stripe';
import { estado, compraValida } from '../lib/reserva.js';

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

    // La pagina no ha encontrado los datos de nacimiento, ni en el navegador
    // del cliente ni en la copia que guarda Stripe. Ha pagado y no va a poder
    // generar nada, asi que se avisa a la tienda para hacerlo a mano en vez de
    // esperar a que escriba. Se marca en Stripe para no repetir el aviso si
    // recarga la pagina varias veces.
    if (req.body.avisarDatosPerdidos === true) {
      if (session.metadata?.aviso_datos !== 'si') {
        try {
          const m = session.metadata || {};
          await enviarEmailAdmin({
            asunto: `⚠️ Cliente sin datos de nacimiento — ${m.nombre || 'Cliente'}`,
            mensaje: [
              `Este cliente HA PAGADO y la pagina no ha encontrado sus datos de nacimiento.`,
              `No puede generar el informe. Hay que generarselo a mano.`,
              ``,
              `Email:    ${email || '(desconocido)'}`,
              `Nombre:   ${m.nombre || '-'}`,
              `Telefono: ${m.telefono || '-'}`,
              `Sexo:     ${m.sexo || '-'}`,
              `Nacio:    ${m.fecha || '-'} a las ${m.hora || '-'}`,
              `Lugar:    ${[m.municipio, m.provincia, m.pais].filter(Boolean).join(', ') || '-'}`,
              ``,
              `Session:  ${session_id}`,
            ].join('\n'),
          });
          await stripe.checkout.sessions.update(session_id, {
            metadata: { ...session.metadata, aviso_datos: 'si' },
          });
        } catch (avisoErr) {
          console.error('No se pudo avisar de datos perdidos:', avisoErr.message);
        }
      }
      return res.status(200).json({ ok: true, avisado: true });
    }

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
      // Cuantas generaciones se han llegado a lanzar. La pagina lo necesita
      // para saber si arranca sola (primera vez) o si tiene que esperar a que
      // el cliente pulse el boton (ya fallo una).
      intentos: st.intentos,
    });

  } catch (error) {
    console.error('Error verificando pago:', error);
    return res.status(500).json({ ok: false, error: 'No se pudo verificar el pago' });
  }
}


// ═════════════════════════════════════════════════════════════════
// AVISO AL ADMIN (via Brevo) — mismo formato que chat.js
// ═════════════════════════════════════════════════════════════════
async function enviarEmailAdmin({ asunto, mensaje }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { email: 'hola@origennatal.com', name: 'ORIGEN NATAL — Alertas' },
      to: [{ email: 'hola@origennatal.com', name: 'Admin' }],
      subject: asunto,
      htmlContent: `<pre style="font-family:monospace;background:#fff5f4;padding:16px;border-radius:8px;">${mensaje}</pre>`,
    }),
  });
}
