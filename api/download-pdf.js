// ═════════════════════════════════════════════════════════════════
// /api/download-pdf.js
// Sirve un PDF privado del Blob si:
//  - el session_id es válido en Stripe
//  - el pago está confirmado
//  - no han pasado más de 7 días desde la compra
// ═════════════════════════════════════════════════════════════════

import { head } from '@vercel/blob';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Días de validez del link
const DIAS_VALIDEZ = 7;

export default async function handler(req, res) {
  try {
    const sessionId = req.query.session_id;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).send('Falta session_id');
    }

    // 1. Verificar sesión en Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return res.status(404).send('Sesión no encontrada');
    }
    if (session.payment_status !== 'paid') {
      return res.status(402).send('Pago no confirmado');
    }

    // 2. Comprobar que no han pasado más de 7 días
    const creadoMs = session.created * 1000;
    const ahoraMs = Date.now();
    const diasPasados = (ahoraMs - creadoMs) / (1000 * 60 * 60 * 24);
    if (diasPasados > DIAS_VALIDEZ) {
      return res.status(410).send(
        `Este enlace ha caducado (válido durante ${DIAS_VALIDEZ} días tras la compra). ` +
        `Por favor escríbenos a hola@tucodigobase.com con tu email de compra.`
      );
    }

    // 3. Descargar el PDF del Blob privado y servirlo
    const pathname = `informes/${sessionId}.pdf`;

    // head() nos da la URL privada interna + metadata
    let blobInfo;
    try {
      blobInfo = await head(pathname);
    } catch (e) {
      return res.status(404).send('PDF no encontrado. Por favor escríbenos a hola@tucodigobase.com');
    }

    // Descargar el PDF usando el token (fetch autenticado)
    const blobResponse = await fetch(blobInfo.url, {
      headers: {
        'Authorization': `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    if (!blobResponse.ok) {
      return res.status(500).send('No se pudo cargar el PDF');
    }

    const arrayBuffer = await blobResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Nombre bonito para el archivo descargado
    const nombre = (session.metadata?.nombre || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `TuDisenoDeOrigen_${nombre}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-cache');
    return res.status(200).send(buffer);

  } catch (error) {
    console.error('Error download-pdf:', error);
    return res.status(500).send('Error al descargar el PDF');
  }
}
