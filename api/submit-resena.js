// ═════════════════════════════════════════════════════════════════
// /api/submit-resena.js
// Recibe los datos del formulario (sin vídeo, ya subido a Drive),
// actualiza Brevo y envía email de aviso al admin.
// ═════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { nombre, email, consentimiento, fecha, texto_consentimiento, driveFileId, nombreArchivo } = req.body;

    if (!nombre || !email || !consentimiento || !driveFileId) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    // 1. Actualizar Brevo
    await actualizarBrevo(email, nombre, fecha, texto_consentimiento, driveFileId);

    // 2. Enviar email admin
    await enviarEmailAdmin(nombre, email, fecha, driveFileId, nombreArchivo);

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[submit-resena] Error:', error);
    return res.status(500).json({ error: 'Error procesando la reseña', detalle: error.message });
  }
}

// ═══════════════════════════════════════
// ACTUALIZAR BREVO
// ═══════════════════════════════════════
async function actualizarBrevo(email, nombre, fecha, textoConsentimiento, driveFileId) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

  const attributes = {
    RESENA_ENVIADA: 'si',
    RESENA_FECHA: fecha || new Date().toISOString(),
    RESENA_CONSENTIMIENTO: textoConsentimiento || 'Autorizado',
    RESENA_DRIVE_ID: driveFileId || '',
  };

  const resp = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({ attributes }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error('[submit-resena] Error Brevo:', err);
  } else {
    console.log(`[submit-resena] ✅ Brevo actualizado para: ${email}`);
  }
}

// ═══════════════════════════════════════
// EMAIL ADMIN
// ═══════════════════════════════════════
async function enviarEmailAdmin(nombre, email, fecha, driveFileId, nombreArchivo) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

  const driveLink = `https://drive.google.com/file/d/${driveFileId}/view`;
  const fechaFormateada = fecha ? new Date(fecha).toLocaleString('es-ES') : new Date().toLocaleString('es-ES');

  const body = {
    sender: { email: 'hola@tucodigobase.com', name: 'Tu Código Base — Reseñas' },
    to: [{ email: 'tucodigobase@gmail.com', name: 'Tu Código Base' }],
    subject: '🎬 RESEÑA RECIBIDA TCB',
    htmlContent: `
      <div style="font-family:Arial,sans-serif;padding:24px;background:#fffbef;max-width:600px;">
        <h2 style="color:#0e3f4b;margin-bottom:20px;">🎬 RESEÑA RECIBIDA TCB</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;width:160px;">Nombre:</td><td style="padding:8px 0;color:#333;">${nombre}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Email:</td><td style="padding:8px 0;color:#333;">${email}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Archivo:</td><td style="padding:8px 0;color:#333;">${nombreArchivo || 'video'}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Fecha envío:</td><td style="padding:8px 0;color:#333;">${fechaFormateada}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Consentimiento:</td><td style="padding:8px 0;color:#333;">✅ Firmado</td></tr>
        </table>
        <div style="margin-top:24px;">
          <a href="${driveLink}" style="background:#bd9048;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
            🎬 Ver vídeo en Drive
          </a>
        </div>
        <p style="margin-top:20px;font-size:12px;color:#999;">
          Texto del consentimiento firmado: "Autorizo a Tu Código Base a usar mi imagen, voz y testimonio en su web, redes sociales y materiales de comunicación para mostrar experiencias reales del producto."
        </p>
      </div>
    `,
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

  console.log(`[submit-resena] ✅ Email admin enviado para: ${nombre}`);
}
