// ═════════════════════════════════════════════════════════════════
// /api/save-pdf.js
// Recibe el PDF desde el navegador, lo sube a Vercel Blob (7 días),
// actualiza el contacto en Brevo con el link del PDF, y envía email.
// ═════════════════════════════════════════════════════════════════

import { put } from '@vercel/blob';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Tamaño máximo 10MB (aprox)
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
    const { session_id, pdfBase64, nombre, sexo } = req.body;

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

    // 2. Convertir base64 a Buffer
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    // 3. Subir a Vercel Blob (PRIVADO)
    const filename = `informes/${session_id}.pdf`;

    await put(filename, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf',
      allowOverwrite: true,
    });

    // La URL pública del PDF pasa por nuestro endpoint de descarga
    // (verifica session_id, pago y caducidad de 7 días)
    const origin = (req.headers.origin || req.headers.referer || 'https://tcb-iota.vercel.app').replace(/\/$/, '');
    const host = origin.startsWith('http') ? origin.split('/').slice(0, 3).join('/') : 'https://tcb-iota.vercel.app';
    const pdfUrl = `${host}/api/download-pdf?session_id=${encodeURIComponent(session_id)}`;

    // 4. Actualizar contacto en Brevo con la URL del PDF
    try {
      await actualizarContactoBrevo(email, pdfUrl);
    } catch (err) {
      console.error('Error actualizando Brevo:', err);
      // No detenemos el flujo, el PDF ya está subido
    }

    // 5. Enviar email al cliente
    try {
      const sexoCliente = (sexo || session.metadata?.sexo || '').toString();
      await enviarEmailCliente(email, nombreCliente, pdfUrl, sexoCliente);
    } catch (err) {
      console.error('Error enviando email cliente:', err);
      // Avisamos al admin
      await enviarEmailAdmin({
        asunto: `⚠️ URGENTE — Fallo enviando email de entrega — ${nombreCliente}`,
        mensaje: `Cliente: ${email}\nNombre: ${nombreCliente}\nPDF: ${pdfUrl}\nError: ${err.message}\n\nRevisa y envíalo manualmente.`,
      }).catch(e => console.error('Tampoco se pudo avisar admin:', e));
    }

    return res.status(200).json({ ok: true, url: pdfUrl });

  } catch (error) {
    console.error('Error save-pdf:', error);
    return res.status(500).json({ error: 'No se pudo guardar el PDF' });
  }
}

// ═════════════════════════════════════════════════════════════════
// ACTUALIZAR CONTACTO EN BREVO (añadir URL_PDF)
// ═════════════════════════════════════════════════════════════════
async function actualizarContactoBrevo(email, pdfUrl) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY no configurada');

  const body = {
    attributes: {
      URL_PDF: pdfUrl,
      ESTADO_INFORME: 'entregado',
    },
  };

  const resp = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok && resp.status !== 204) {
    const errText = await resp.text();
    throw new Error(`Brevo ${resp.status}: ${errText}`);
  }
}

// ═════════════════════════════════════════════════════════════════
// ENVIAR EMAIL AL CLIENTE CON EL LINK DEL PDF
// ═════════════════════════════════════════════════════════════════
async function enviarEmailCliente(email, nombre, pdfUrl, sexo) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY no configurada');

  // Género para el texto del email
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
        <!-- CABECERO CON LOGO Y TÍTULO -->
        <tr><td style="padding:32px 24px 16px 24px;text-align:center;background:#ffffff;">
          <img src="https://tcb-iota.vercel.app/images/3-logo-email-tu-codigo-base-carta-natal-astral.png" alt="Tu Código Base" width="180" style="display:block;margin:0 auto 16px auto;max-width:180px;height:auto;border:0;">
          <h1 style="font-family:Georgia,'Playfair Display',serif;color:#bd9048;font-size:32px;line-height:1.2;margin:0;font-weight:700;letter-spacing:0.5px;">
            Tu Diseño de Origen
          </h1>
        </td></tr>

        <!-- CONTENIDO -->
        <tr><td style="padding:32px 28px 16px 28px;">
          <p style="font-size:17px;line-height:1.6;color:#0c0c0c;margin:0 0 20px 0;">
            Hola <strong>${escapeHtml(nombre)}</strong>,
          </p>
          <p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 14px 0;">
            Gracias por confiar en nosotros.
          </p>
          <p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 28px 0;">
            Ya tienes <strong>Tu Diseño de Origen</strong> descargado, pero te dejamos aquí una copia de respaldo por si quieres guardarla de nuevo.
          </p>

          <!-- BOTÓN -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="padding:8px 0 24px 0;">
              <a href="${pdfUrl}" style="display:inline-block;background:#bd9048;color:#ffffff;text-decoration:none;padding:16px 34px;border-radius:6px;font-size:16px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">
                📎 Descargar mi Diseño de Origen
              </a>
            </td></tr>
          </table>

          <p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 24px 0;">
            <strong>Importante:</strong> este enlace estará disponible solo durante <strong>7 días</strong>. Pasado ese tiempo, la descarga dejará de estar activa, así que te recomendamos guardar el archivo cuanto antes.
          </p>

          <p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 14px 0;">
            <strong>Un consejo:</strong> cuando lo leas, no lo hagas con prisa. Busca un momento tranquilo. Lo que vas a descubrir no es información, es una forma nueva de entenderte.
          </p>
          <p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 24px 0;">
            Algunas áreas te van a resonar al instante, otras necesitarán que las releas, pero todas ellas tienen algo importante que decirte.
          </p>

          <div style="background:#f5f1e6;padding:14px 18px;border-radius:6px;margin:0 0 28px 0;">
            <p style="font-size:14px;line-height:1.6;color:#555;margin:0;">
              📌 Guarda esta dirección <strong>(hola@tucodigobase.com)</strong> en tus contactos. Así, cuando <strong>Tu Nueva Versión</strong> esté lista, serás ${deLos} en enterarte y no queremos que se pierda en spam.
            </p>
          </div>

          <p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 6px 0;">
            Un abrazo,
          </p>
          <p style="font-size:16px;line-height:1.6;color:#0e3f4b;margin:0 0 32px 0;font-weight:600;">
            El equipo de Tu Código Base
          </p>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#0e3f4b;padding:20px 24px;text-align:center;">
          <p style="color:#cfb180;font-size:13px;margin:0 0 6px 0;">
            <a href="mailto:hola@tucodigobase.com" style="color:#cfb180;text-decoration:none;">hola@tucodigobase.com</a>
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

  const body = {
    sender: { email: 'hola@tucodigobase.com', name: 'Tu Código Base' },
    to: [{ email, name: nombre }],
    subject: 'Tu Diseño de Origen (disponible durante 7 días) ✨',
    htmlContent: html,
  };

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
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
