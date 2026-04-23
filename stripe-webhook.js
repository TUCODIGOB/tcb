// ═════════════════════════════════════════════════════════════════
// /api/stripe-webhook.js
// Recibe avisos de Stripe y guarda el contacto en Brevo.
// ═════════════════════════════════════════════════════════════════

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Config: desactivar el parser automático para poder verificar la firma
export const config = {
  api: {
    bodyParser: false,
  },
};

// Lee el body RAW (necesario para verificar firma Stripe)
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Firma webhook inválida:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // ───── Evento: pago completado ─────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata || {};
    const email = session.customer_email || session.customer_details?.email;

    try {
      await guardarContactoBrevo({
        email,
        nombre: metadata.nombre || '',
        sexo: metadata.sexo || '',
        fecha: metadata.fecha || '',
        hora: metadata.hora || '',
        municipio: metadata.municipio || '',
        provincia: metadata.provincia || '',
        pais: metadata.pais || '',
        telefono: metadata.telefono || '',
        edad: metadata.edad || '',
        sessionId: session.id,
        importe: (session.amount_total / 100).toFixed(2),
      });
      console.log('✅ Contacto guardado en Brevo:', email);
    } catch (err) {
      console.error('❌ Error guardando en Brevo:', err);
      // Avisar al admin por email
      await enviarEmailAdmin({
        asunto: '⚠️ URGENTE — Fallo guardando pedido en Brevo',
        mensaje: `Cliente: ${email}\nSessionID: ${session.id}\nError: ${err.message}\n\nDatos: ${JSON.stringify(metadata)}`,
      }).catch(e => console.error('Tampoco se pudo avisar admin:', e));
    }
  }

  // ───── Evento: reembolso ─────
  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    console.log('💰 Reembolso procesado:', charge.id);
    // Por ahora solo logueamos. En fase posterior podemos mandar email al cliente.
  }

  // Responder 200 a Stripe (si no, reintentará)
  return res.status(200).json({ received: true });
}

// ═════════════════════════════════════════════════════════════════
// GUARDAR CONTACTO EN BREVO
// ═════════════════════════════════════════════════════════════════
async function guardarContactoBrevo(datos) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY no configurada');
  if (!datos.email) throw new Error('Email vacío');

  // Separar nombre completo en nombre + apellidos (simplificado)
  const partes = (datos.nombre || '').trim().split(/\s+/);
  const firstName = partes[0] || '';
  const lastName = partes.slice(1).join(' ') || '';

  // Atributos personalizados que guardamos en Brevo
  const attributes = {
    FIRSTNAME: firstName,
    LASTNAME: lastName,
    SMS: datos.telefono || '',
    SEXO: datos.sexo || '',
    FECHA_NACIMIENTO: datos.fecha || '',
    HORA_NACIMIENTO: datos.hora || '',
    MUNICIPIO: datos.municipio || '',
    PROVINCIA: datos.provincia || '',
    PAIS: datos.pais || '',
    EDAD: datos.edad ? parseInt(datos.edad) : 0,
    STRIPE_SESSION_ID: datos.sessionId || '',
    IMPORTE_PAGADO: datos.importe || '',
    ESTADO_INFORME: 'pendiente',
  };

  const body = {
    email: datos.email,
    attributes,
    updateEnabled: true, // si ya existe, actualiza
  };

  const resp = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Brevo ${resp.status}: ${errText}`);
  }

  return await resp.json().catch(() => ({}));
}

// ═════════════════════════════════════════════════════════════════
// ENVIAR EMAIL AL ADMIN (vía Brevo)
// ═════════════════════════════════════════════════════════════════
async function enviarEmailAdmin({ asunto, mensaje }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

  const body = {
    sender: { email: 'hola@tucodigobase.com', name: 'Tu Código Base — Alertas' },
    to: [{ email: 'hola@tucodigobase.com', name: 'Admin' }],
    subject: asunto,
    htmlContent: `<pre style="font-family:monospace;background:#fff5f4;padding:16px;border-radius:8px;">${mensaje}</pre>`,
  };

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });
}
