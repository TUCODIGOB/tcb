// ═════════════════════════════════════════════════════════════════
// /api/submit-resena.js
// Recibe el formulario multipart, hace streaming del vídeo a Drive,
// actualiza Brevo y envía email al admin.
// ═════════════════════════════════════════════════════════════════

import { google } from 'googleapis';

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
    // Parsear el formulario multipart con streaming
    const { fields, fileBuffer, filename, mimeType } = await parseMultipart(req);

    const nombre = fields.nombre;
    const email = fields.email;
    const consentimiento = fields.consentimiento;
    const fecha = fields.fecha;
    const textoConsentimiento = fields.texto_consentimiento;

    if (!nombre || !email || !consentimiento || !fileBuffer) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    // Autenticar con Google Drive
    const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Nombre del archivo
    const nombreSeguro = nombre.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim().replace(/\s+/g, '_');
    const emailSeguro = email.replace(/[^a-zA-Z0-9@._-]/g, '');
    const ext = filename && filename.includes('.') ? '.' + filename.split('.').pop() : '.mp4';
    const nombreArchivo = `Resena_${nombreSeguro}_${emailSeguro}${ext}`;

    // Subir a Drive
    const { Readable } = await import('stream');
    const stream = Readable.from(fileBuffer);

    const driveRes = await drive.files.create({
      requestBody: {
        name: nombreArchivo,
        parents: [DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: mimeType || 'video/mp4',
        body: stream,
      },
      fields: 'id',
    });

    const driveFileId = driveRes.data.id;
    console.log(`[submit-resena] ✅ Vídeo subido: ${nombreArchivo}`);

    // Actualizar Brevo
    await actualizarBrevo(email, nombre, fecha, textoConsentimiento, driveFileId);

    // Email admin
    await enviarEmailAdmin(nombre, email, fecha, driveFileId, nombreArchivo);

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[submit-resena] Error:', error);
    return res.status(500).json({ error: 'Error procesando la reseña', detalle: error.message });
  }
}

// ═══════════════════════════════════════
// PARSEAR MULTIPART MANUALMENTE
// ═══════════════════════════════════════
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(.+)$/);
        if (!boundaryMatch) throw new Error('No boundary found');

        const boundary = '--' + boundaryMatch[1];
        const parts = splitBuffer(body, Buffer.from('\r\n' + boundary));

        const fields = {};
        let fileBuffer = null;
        let filename = null;
        let mimeType = null;

        for (const part of parts) {
          if (!part || part.length === 0) continue;

          const headerEnd = indexOfBuffer(part, Buffer.from('\r\n\r\n'));
          if (headerEnd === -1) continue;

          const headerStr = part.slice(0, headerEnd).toString();
          const content = part.slice(headerEnd + 4);

          // Quitar trailing \r\n--
          const trimmed = content.slice(0, content.length - 2);

          const nameMatch = headerStr.match(/name="([^"]+)"/);
          const filenameMatch = headerStr.match(/filename="([^"]+)"/);
          const mimeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/);

          if (!nameMatch) continue;
          const fieldName = nameMatch[1];

          if (filenameMatch) {
            filename = filenameMatch[1];
            mimeType = mimeMatch ? mimeMatch[1].trim() : 'video/mp4';
            fileBuffer = trimmed;
          } else {
            fields[fieldName] = trimmed.toString().trim();
          }
        }

        resolve({ fields, fileBuffer, filename, mimeType });
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function splitBuffer(buf, delimiter) {
  const parts = [];
  let start = 0;
  let pos = indexOfBuffer(buf, delimiter);
  while (pos !== -1) {
    parts.push(buf.slice(start, pos));
    start = pos + delimiter.length;
    pos = indexOfBuffer(buf, delimiter, start);
  }
  parts.push(buf.slice(start));
  return parts;
}

function indexOfBuffer(buf, search, offset = 0) {
  for (let i = offset; i <= buf.length - search.length; i++) {
    let found = true;
    for (let j = 0; j < search.length; j++) {
      if (buf[i + j] !== search[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
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
    console.error('[submit-resena] Error Brevo:', await resp.text());
  } else {
    console.log(`[submit-resena] ✅ Brevo actualizado: ${email}`);
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
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Archivo:</td><td style="padding:8px 0;color:#333;">${nombreArchivo}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Fecha:</td><td style="padding:8px 0;color:#333;">${fechaFormateada}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Consentimiento:</td><td style="padding:8px 0;color:#333;">✅ Firmado</td></tr>
        </table>
        <div style="margin-top:24px;">
          <a href="${driveLink}" style="background:#bd9048;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
            🎬 Ver vídeo en Drive
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
