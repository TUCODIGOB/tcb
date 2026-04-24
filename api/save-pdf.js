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
    const { session_id, pdfBase64, nombre } = req.body;

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
      access: 'private',
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
      await enviarEmailCliente(email, nombreCliente, pdfUrl);
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
async function enviarEmailCliente(email, nombre, pdfUrl) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY no configurada');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fffbef;font-family:Arial,Helvetica,sans-serif;color:#0c0c0c;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbef;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;box-shadow:0 4px 24px rgba(14,63,75,0.08);">
        <tr><td style="padding:32px 40px 0 40px;text-align:center;">
          <h1 style="font-family:Georgia,'Playfair Display',serif;color:#0e3f4b;font-size:28px;margin:0 0 8px 0;font-weight:700;">TU CÓDIGO BASE</h1>
          <p style="color:#bd9048;font-size:13px;letter-spacing:3px;margin:0 0 32px 0;text-transform:uppercase;">Tu Diseño de Origen</p>
        </td></tr>
        <tr><td style="padding:0 40px;">
          <h2 style="font-family:Georgia,'Playfair Display',serif;color:#0e3f4b;font-size:22px;margin:0 0 20px 0;font-weight:400;">
            Hola <span style="color:#bd9048;font-style:italic;">${escapeHtml(nombre)}</span>,
          </h2>
          <p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 16px 0;">
            Gracias por confiar en nosotros ✨
          </p>
          <p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 16px 0;">
            Ya tienes <strong>Tu Diseño de Origen</strong> descargado, pero te dejamos aquí una copia de respaldo por si alguna vez lo necesitas.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${pdfUrl}" style="display:inline-block;background:linear-gradient(135deg,#bd9048,#cfb180);color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:6px;font-size:16px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;box-shadow:0 4px 16px rgba(189,144,72,0.3);">
              ⬇ Descargar mi Diseño de Origen
            </a>
          </div>
          <p style="font-size:14px;line-height:1.6;color:#888;text-align:center;margin:0 0 32px 0;font-style:italic;">
            Este enlace estará disponible durante 7 días.
          </p>
          <div style="background:#fffbef;border-left:3px solid #bd9048;padding:20px;border-radius:6px;margin:24px 0;">
            <p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 12px 0;">
              <strong>Un consejo:</strong> cuando lo leas, no lo hagas con prisa. Busca un momento tranquilo. Lo que vas a descubrir no es información, es una forma nueva de entenderte.
            </p>
            <p style="font-size:15px;line-height:1.6;color:#333;margin:0;">
              Algunas áreas te van a resonar al instante, otras necesitarán que las releas, pero todas ellas tienen algo importante que decirte.
            </p>
          </div>
          <p style="font-size:14px;line-height:1.6;color:#666;margin:24px 0;">
            📌 Guarda esta dirección (<strong>hola@tucodigobase.com</strong>) en tus contactos. Así, cuando <em>Tu Nueva Versión</em> esté lista, serás de los/as primeros/as en enterarte y no queremos que se pierda en spam.
          </p>
          <p style="font-size:16px;line-height:1.6;color:#333;margin:32px 0 8px 0;">
            Un abrazo,
          </p>
          <p style="font-size:16px;line-height:1.6;color:#0e3f4b;margin:0 0 40px 0;font-weight:600;">
            El equipo de Tu Código Base
          </p>
        </td></tr>
        <tr><td style="background:#0e3f4b;padding:24px 40px;text-align:center;border-radius:0 0 12px 12px;">
          <p style="color:#cfb180;font-size:13px;margin:0 0 8px 0;">
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
    subject: 'Tu Diseño de Origen (por si lo necesitas de nuevo) ✨',
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
