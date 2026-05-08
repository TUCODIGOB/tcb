// ═════════════════════════════════════════════════════════════════
// /api/get-upload-url.js
// Genera una URL de subida resumable directa a Google Drive.
// El navegador sube el vídeo directo a Drive sin pasar por Vercel.
// ═════════════════════════════════════════════════════════════════

import { google } from 'googleapis';

const DRIVE_FOLDER_ID = '1wbHTWATS88-D_xsqm38rkpCizFhmohb2';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { nombre, email, filename, mimeType } = req.body;

    if (!nombre || !email || !filename) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const authClient = await auth.getClient();
    const token = await authClient.getAccessToken();

    // Nombre del archivo en Drive
    const nombreSeguro = nombre.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim().replace(/\s+/g, '_');
    const emailSeguro = email.replace(/[^a-zA-Z0-9@._-]/g, '');
    const extension = filename.includes('.') ? '.' + filename.split('.').pop() : '.mp4';
    const nombreArchivo = `Resena_${nombreSeguro}_${emailSeguro}${extension}`;

    // Crear sesión de subida resumable en Drive
    const initResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.token}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': mimeType || 'video/mp4',
        },
        body: JSON.stringify({
          name: nombreArchivo,
          parents: [DRIVE_FOLDER_ID],
        }),
      }
    );

    if (!initResponse.ok) {
      const err = await initResponse.text();
      throw new Error(`Drive init error: ${err}`);
    }

    const uploadUrl = initResponse.headers.get('location');

    return res.status(200).json({ uploadUrl, nombreArchivo });

  } catch (error) {
    console.error('[get-upload-url] Error:', error);
    return res.status(500).json({ error: 'Error generando URL de subida', detalle: error.message });
  }
}
