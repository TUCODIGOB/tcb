// ═════════════════════════════════════════════════════════════════
// /api/submit-resena.js
// Dos acciones:
// 1. get-signature: genera firma para subida directa a Cloudinary
// 2. save: recibe URL del vídeo ya subido, guarda en Brevo y email
// ═════════════════════════════════════════════════════════════════

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const body = req.body;
    const { action, nombre, email, consentimiento, fecha, texto_consentimiento } = body;

    if (!nombre || !email || !consentimiento) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    // ═══════════════════════════════════════
    // ACCIÓN 1: Generar firma para Cloudinary
    // ═══════════════════════════════════════
    if (action === 'get-signature') {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      const timestamp = Math.floor(Date.now() / 1000);

      const nombreSeguro = nombre.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim().replace(/\s+/g, '_');
      const emailSeguro = email.replace(/[^a-zA-Z0-9@._-]/g, '').replace('@', '_at_');
      const publicId = `resenas/Resena_${nombreSeguro}_${emailSeguro}_${timestamp}`;

      const signature = crypto
        .createHash('sha1')
        .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
        .digest('hex');

      return res.status(200).json({ signature, timestamp, publicId, cloudName, apiKey });
    }

    // ═══════════════════════════════════════
    // ACCIÓN 2: Guardar datos tras subida
    // ═══════════════════════════════════════
    if (action === 'save') {
      const { videoUrl, publicId } = body;

      if (!videoUrl) {
        return res.status(400).json({ error: 'Falta la URL del vídeo' });
      }

      await actualizarBrevo(email, nombre, fecha, texto_consentimiento, videoUrl);
      await enviarEmailAdmin(nombre, email, fecha, videoUrl, publicId || 'video');

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Acción no válida' });

  } catch (error) {
    console.error('[submit-resena] Error:', error);
    return res.status(500).json({ error: 'Error procesando la reseña', detalle: error.message });
  }
}

// ═══════════════════════════════════════
// ACTUALIZAR BREVO
// ═══════════════════════════════════════
async function actualizarBrevo(email, nombre, fecha, textoConsentimiento, videoUrl) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

  const attributes = {
    RESENA_ENVIADA: 'si',
    RESENA_FECHA: fecha || new Date().toISOString(),
    RESENA_CONSENTIMIENTO: textoConsentimiento || 'Autorizado',
    RESENA_DRIVE_ID: videoUrl || '',
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
    console.error('[submit-resena] Error Brevo:', await resp.text());
  } else {
    console.log(`[submit-resena] ✅ Brevo actualizado: ${email}`);
  }
}

// ═══════════════════════════════════════
// EMAIL ADMIN
// ═══════════════════════════════════════
async function enviarEmailAdmin(nombre, email, fecha, videoUrl, publicId) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

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
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Archivo:</td><td style="padding:8px 0;color:#333;">${publicId}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Fecha:</td><td style="padding:8px 0;color:#333;">${fechaFormateada}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Consentimiento:</td><td style="padding:8px 0;color:#333;">✅ Firmado</td></tr>
        </table>
        <div style="margin-top:24px;">
          <a href="${videoUrl}" style="background:#bd9048;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
            🎬 Ver vídeo
          </a>
        </div>
        <p style="margin-top:20px;font-size:12px;color:#999;">
          Consentimiento firmado: "Autorizo a Tu Código Base a usar mi imagen, voz y testimonio en su web, redes sociales y materiales de comunicación para mostrar experiencias reales del producto."
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

  console.log(`[submit-resena] ✅ Email admin enviado: ${nombre}`);
}
