// ═════════════════════════════════════════════════════════════════
// /api/submit-resena.js
// Recibe el formulario de reseña, sube el vídeo a Google Drive,
// actualiza Brevo y envía email de aviso al admin.
// ═════════════════════════════════════════════════════════════════

import { IncomingForm } from 'formidable';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const DRIVE_FOLDER_ID = '1wbHTWATS88-D_xsqm38rkpCizFhmohb2';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // 1. Parsear el formulario multipart
    const { fields, files } = await parseForm(req);

    const nombre = Array.isArray(fields.nombre) ? fields.nombre[0] : fields.nombre;
    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email;
    const consentimiento = Array.isArray(fields.consentimiento) ? fields.consentimiento[0] : fields.consentimiento;
    const fecha = Array.isArray(fields.fecha) ? fields.fecha[0] : fields.fecha;
    const textoConsentimiento = Array.isArray(fields.texto_consentimiento) ? fields.texto_consentimiento[0] : fields.texto_consentimiento;
    const videoFile = Array.isArray(files.video) ? files.video[0] : files.video;

    if (!nombre || !email || !consentimiento || !videoFile) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    // 2. Subir vídeo a Google Drive
    const driveFileId = await subirADrive(videoFile, nombre, email);

    // 3. Actualizar contacto en Brevo
    await actualizarBrevo(email, nombre, fecha, textoConsentimiento, driveFileId);

    // 4. Enviar email de aviso al admin
    await enviarEmailAdmin(nombre, email, fecha, driveFileId);

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[submit-resena] Error:', error);
    return res.status(500).json({ error: 'Error procesando la reseña', detalle: error.message });
  }
}

// ═══════════════════════════════════════
// PARSEAR FORMULARIO
// ═══════════════════════════════════════
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ keepExtensions: true, maxFileSize: 500 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// ═══════════════════════════════════════
// SUBIR A GOOGLE DRIVE
// ═══════════════════════════════════════
async function subirADrive(videoFile, nombre, email) {
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const nombreSeguro = nombre.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim().replace(/\s+/g, '_');
  const emailSeguro = email.replace(/[^a-zA-Z0-9@._-]/g, '');
  const extension = path.extname(videoFile.originalFilename || videoFile.newFilename || '.mp4') || '.mp4';
  const nombreArchivo = `Resena_${nombreSeguro}_${emailSeguro}${extension}`;

  const fileStream = fs.createReadStream(videoFile.filepath);

  const response = await drive.files.create({
    requestBody: {
      name: nombreArchivo,
      parents: [DRIVE_FOLDER_ID],
    },
    media: {
      mimeType: videoFile.mimetype || 'video/mp4',
      body: fileStream,
    },
    fields: 'id, name, webViewLink',
  });

  console.log(`[submit-resena] ✅ Vídeo subido a Drive: ${response.data.name}`);
  return response.data.id;
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
async function enviarEmailAdmin(nombre, email, fecha, driveFileId) {
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
