// ═════════════════════════════════════════════════════════════════
// /api/save-pdf.js
// Envía el PDF al cliente por email como ARCHIVO ADJUNTO (vía Brevo).
// ═════════════════════════════════════════════════════════════════

import Stripe from 'stripe';
import { estado, marcarEmailEnviado, compraValida } from '../lib/reserva.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { session_id, token, pdfBase64, nombre, sexo, fecha, hora, lugar, edad } = req.body;

    if (!session_id || !pdfBase64) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    // 1. Verificar que el pago es real consultando Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!compraValida(session)) {
      return res.status(402).json({ error: 'Pago no confirmado' });
    }

    // 2. Verificar que quien envia es quien genero el PDF. Sin esto, tener el
    //    enlace bastaba para hacer que Brevo mandara al comprador cualquier
    //    fichero, tantas veces como se quisiera.
    const st = estado(session);
    if (!token || typeof token !== 'string' || token !== st.token) {
      return res.status(403).json({ error: 'Entrega no autorizada' });
    }
    if (st.emailEnviado) {
      return res.status(409).json({ error: 'El informe ya se envio por correo' });
    }

    const email = session.customer_email;
    const nombreCliente = (nombre || session.metadata?.nombre || 'Cliente').toString();
    const sexoCliente = (sexo || session.metadata?.sexo || '').toString();
    const fechaCliente = (fecha || session.metadata?.fecha || '').toString();
    const horaCliente = (hora || session.metadata?.hora || '').toString();
    const lugarCliente = (lugar || session.metadata?.municipio || '').toString();
    const edadCliente = String(edad || session.metadata?.edad || '');

    // 3. Limpiar base64: quitar prefijo data URI + espacios/saltos de línea
    let base64Limpio = String(pdfBase64);
    const comma = base64Limpio.indexOf(',');
    if (base64Limpio.startsWith('data:') && comma > -1) {
      base64Limpio = base64Limpio.substring(comma + 1);
    }
    base64Limpio = base64Limpio.replace(/[\r\n\t\s]/g, '');

    // Nombre del archivo adjunto (solo caracteres seguros)
    const nombreArchivo = `TuDisenoDeOrigen_${nombreCliente.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    // 4. Enviar email al cliente con el PDF adjunto
    try {
      await enviarEmailCliente({
        email,
        nombre: nombreCliente,
        pdfContent: base64Limpio,
        nombreArchivo,
      });
      console.log(`[save-pdf] ✅ Email enviado correctamente a ${email}`);
    } catch (err) {
      console.error('[save-pdf] ❌ Error enviando email:', err.message);
      await enviarEmailAdmin({
        asunto: `⚠️ URGENTE — Fallo enviando email de entrega — ${nombreCliente}`,
        mensaje: `Cliente: ${email}\nNombre: ${nombreCliente}\nSession: ${session_id}\nError: ${err.message}\n\nRevisa y envíalo manualmente.`,
      }).catch(e => console.error('Tampoco se pudo avisar admin:', e));
      return res.status(500).json({ error: 'No se pudo enviar el email', detalle: err.message });
    }

    // El correo salio: cerrar la puerta para que no se pueda reenviar en bucle.
    try {
      await marcarEmailEnviado(stripe, session_id);
    } catch (err) {
      console.error('[save-pdf] Error marcando email_enviado:', err.message);
    }

    // 5. Actualizar contacto en Brevo
    try {
      await actualizarContactoBrevo(email, { nombreCliente, fechaCliente, horaCliente, lugarCliente, edadCliente, sexoCliente });
    } catch (err) {
      console.error('[save-pdf] Error actualizando Brevo:', err.message);
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[save-pdf] Error general:', error);
    return res.status(500).json({ error: 'Error procesando el PDF', detalle: error.message });
  }
}

// ═════════════════════════════════════════════════════════════════
// ACTUALIZAR CONTACTO EN BREVO
// ═════════════════════════════════════════════════════════════════
async function actualizarContactoBrevo(email, { nombreCliente, fechaCliente, horaCliente, lugarCliente, edadCliente, sexoCliente } = {}) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY no configurada');

  const attributes = {
  ESTADO_INFORME: 'entregado',
  NOMBRE: nombreCliente || '',
  SEXO: sexoCliente || '',
  HORA_NAC: horaCliente || '',
  LUGAR_NAC: lugarCliente || '',
};

if (edadCliente) attributes.EDAD = parseInt(edadCliente);

if (fechaCliente) {
  const meses = { 'enero':'01','febrero':'02','marzo':'03','abril':'04','mayo':'05','junio':'06','julio':'07','agosto':'08','septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12' };
  const partes = fechaCliente.match(/(\d+) de (\w+) de (\d+)/);
  if (partes) {
    attributes.FECHA_NAC = `${partes[3]}-${meses[partes[2]]}-${partes[1].padStart(2,'0')}`;
  }
}

  const resp = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({ attributes }),
  });

  if (!resp.ok && resp.status !== 204) {
    const errText = await resp.text();
    throw new Error(`Brevo ${resp.status}: ${errText}`);
  }
}

// ═════════════════════════════════════════════════════════════════
// ENVIAR EMAIL AL CLIENTE CON PDF ADJUNTO
// ═════════════════════════════════════════════════════════════════
async function enviarEmailCliente({ email, nombre, pdfContent, nombreArchivo }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY no configurada');

  const requestBody = {
    sender: { email: 'hola@origennatal.com', name: 'Origen Natal' },
    to: [{ email, name: nombre }],
    templateId: 28,
    params: { NOMBRE: nombre },
    attachment: [
      {
        name: nombreArchivo,
        content: pdfContent,
      },
    ],
  };

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Brevo email ${resp.status}: ${errText}`);
  }
}

// ═════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════
async function enviarEmailAdmin({ asunto, mensaje }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

  const body = {
    sender: { email: 'hola@origennatal.com', name: 'Origen Natal — Alertas' },
    to: [{ email: 'hola@origennatal.com', name: 'Admin' }],
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

