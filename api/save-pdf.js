// ═════════════════════════════════════════════════════════════════
// /api/save-pdf.js
// Envía el PDF al cliente por email como ARCHIVO ADJUNTO (vía Brevo).
// ═════════════════════════════════════════════════════════════════

import Stripe from 'stripe';

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
    const { session_id, pdfBase64, nombre, sexo, fecha, hora, lugar, edad } = req.body;

    if (!session_id || !pdfBase64) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    // 1. Verificar que el pago es real consultando Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session || session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Pago no confirmado' });
    }

    const email = session.customer_email;
    const nombreCliente = (nombre || session.metadata?.nombre || 'Cliente').toString();
    const sexoCliente = (sexo || session.metadata?.sexo || '').toString();
    const fechaCliente = (fecha || session.metadata?.fecha || '').toString();
    const horaCliente = (hora || session.metadata?.hora || '').toString();
    const lugarCliente = (lugar || session.metadata?.municipio || '').toString();
    const edadCliente = String(edad || session.metadata?.edad || '');

    // 2. Limpiar base64: quitar prefijo data URI + espacios/saltos de línea
    let base64Limpio = String(pdfBase64);
    const comma = base64Limpio.indexOf(',');
    if (base64Limpio.startsWith('data:') && comma > -1) {
      base64Limpio = base64Limpio.substring(comma + 1);
    }
    base64Limpio = base64Limpio.replace(/[\r\n\t\s]/g, '');

    // Nombre del archivo adjunto (solo caracteres seguros)
    const nombreArchivo = `TuDisenoDeOrigen_${nombreCliente.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    // 3. Enviar email al cliente con el PDF adjunto
    try {
      await enviarEmailCliente({
        email,
        nombre: nombreCliente,
        sexo: sexoCliente,
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

    // 4. Actualizar contacto en Brevo
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
async function enviarEmailCliente({ email, nombre, sexo, pdfContent, nombreArchivo }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY no configurada');

  let deLos;
  if (sexo === 'mujer') deLos = 'de las primeras';
  else if (sexo === 'hombre') deLos = 'de los primeros';
  else deLos = 'de los/as primeros/as';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tu Diseño de Origen</title>
</head>
<body style="margin:0;padding:0;background:#fffbef;font-family:Arial,Helvetica,sans-serif;color:#0c0c0c;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbef;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;box-shadow:0 4px 24px rgba(14,63,75,0.08);overflow:hidden;">
        <tr><td style="padding:32px 24px 16px 24px;text-align:center;background:#ffffff;">
          <img src="https://tcb-iota.vercel.app/images/3-logo-email-tu-codigo-base-carta-natal-astral.png" alt="Tu Código Base" width="180" style="display:block;margin:0 auto 16px auto;max-width:180px;height:auto;border:0;">
          <h1 style="font-family:Georgia,'Playfair Display',serif;color:#bd9048;font-size:32px;line-height:1.2;margin:0;font-weight:700;letter-spacing:0.5px;">
            Tu Diseño de Origen
          </h1>
        </td></tr>
        <tr><td style="padding:32px 28px 16px 28px;">
          <p style="font-size:17px;line-height:1.6;color:#0c0c0c;margin:0 0 20px 0;">
            Hola <strong>${escapeHtml(nombre)}</strong>,
          </p>
          <p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 14px 0;">
            Gracias por confiar en nosotros.
          </p>
          <p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 28px 0;">
            Ya tienes <strong>Tu Diseño de Origen</strong> descargado, pero te dejamos aquí una copia de respaldo en formato PDF adjunto a este email, por si quieres guardarla.
          </p>
          <p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 14px 0;">
            <strong>Un consejo:</strong> cuando lo leas, no lo hagas con prisa. Busca un momento tranquilo. Lo que vas a descubrir no es información, es una forma nueva de entenderte.
          </p>
          <p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 24px 0;">
            Algunas áreas te van a resonar al instante, otras necesitarán que las releas, pero todas ellas tienen algo importante que decirte.
          </p>
          <div style="background:#f5f1e6;padding:14px 18px;border-radius:6px;margin:0 0 28px 0;">
            <p style="font-size:14px;line-height:1.6;color:#555;margin:0;">
              📌 Guarda esta dirección <strong>(hola@tucodigobase.com)</strong> en tus contactos. Así, cuando <strong>Tu Nueva Versión</strong> esté lista, serás ${deLos} en enterarte. Es el siguiente paso: <strong>lo que tienes que hacer exactamente para vivir la vida que quieres.</strong> Y no queremos que se pierda en spam.
            </p>
          </div>
          <p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 6px 0;">
            Un abrazo,
          </p>
          <p style="font-size:16px;line-height:1.6;color:#0e3f4b;margin:0 0 32px 0;font-weight:600;">
            El equipo de Tu Código Base
          </p>
        </td></tr>
        <tr><td style="background:#0e3f4b;padding:20px 24px;text-align:center;">
          <p style="color:#cfb180;font-size:13px;margin:0 0 6px 0;">
            <a href="mailto:hola@tucodigobase.com" style="color:#cfb180;text-decoration:none;">hola@tucodigobase.com</a>
          </p>
          <p style="color:#cfb180;font-size:12px;margin:6px 0 0 0;">
            <a href="https://www.tucodigobase.com" style="color:#cfb180;text-decoration:none;">www.tucodigobase.com</a>
          </p>
          <p style="color:rgba(255,251,239,0.5);font-size:11px;margin:0;">
            © 2026 TU CÓDIGO BASE · Operado por Pura Group LLC
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const requestBody = {
    sender: { email: 'hola@tucodigobase.com', name: 'Tu Código Base' },
    to: [{ email, name: nombre }],
    subject: 'Tu Diseño de Origen ✨',
    htmlContent: html,
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
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

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

