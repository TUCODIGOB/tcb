// ═════════════════════════════════════════════════════════════════
// /api/submit-resena.js
// Dos acciones:
// 1. get-signature: genera URL prefirmada para subida directa a Cloudflare R2
// 2. save: recibe URL del vídeo ya subido, guarda en Brevo y email
//
// Y SI LA RESEÑA VIENE DEL PLAN DE ORIGEN (P2), el vídeo es lo que paga: al
// guardarla se pone en marcha su plan, igual que si hubiera pagado. Eso pasa
// SOLO cuando la reseña trae el número de su compra del P1, que es lo que
// lleva el enlace de la landing del P2. Una reseña normal, sin ese número, se
// guarda como siempre y no arranca nada.
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
    // ACCIÓN 1: Generar URL prefirmada para R2
    // ═══════════════════════════════════════
    if (action === 'get-signature') {
      const accountId = process.env.RESENA_CLOUDFLARE_ACCOUNT_ID;
      const accessKeyId = process.env.RESENA_CLOUDFLARE_ACCESS_KEY_ID;
      const secretAccessKey = process.env.RESENA_CLOUDFLARE_SECRET_ACCESS_KEY;
      const bucketName = process.env.RESENA_CLOUDFLARE_BUCKET_NAME;

      const timestamp = Math.floor(Date.now() / 1000);
      const nombreSeguro = nombre.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim().replace(/\s+/g, '_');
      const emailSeguro = email.replace(/[^a-zA-Z0-9@._-]/g, '').replace('@', '_at_');
      const objectKey = `resenas/Resena_${nombreSeguro}_${emailSeguro}_${timestamp}.mp4`;

      const endpoint = `https://${accountId}.eu.r2.cloudflarestorage.com`;
      const presignedUrl = await generatePresignedUrl({
        endpoint, accessKeyId, secretAccessKey, bucketName, objectKey, expiresIn: 3600,
      });
      const publicUrl = `${process.env.RESENA_R2_PUBLIC_URL}${objectKey}`;

      return res.status(200).json({ presignedUrl, publicUrl, objectKey });
    }

    // ═══════════════════════════════════════
    // ACCIÓN 2: Guardar datos tras subida
    // ═══════════════════════════════════════
    if (action === 'save') {
      const { videoUrl, objectKey } = body;

      if (!videoUrl) {
        return res.status(400).json({ error: 'Falta la URL del vídeo' });
      }

      await actualizarBrevo(email, nombre, fecha, texto_consentimiento, videoUrl);
      await enviarEmailAdmin(nombre, email, fecha, videoUrl, objectKey || 'video');

      // ── ¿VIENE DEL PLAN DE ORIGEN? ──────────────────────────
      //
      // Su vídeo ya está subido y su reseña guardada, así que ya se ha ganado
      // su plan: se pone en marcha. Va lo último y no puede tumbar nada: si
      // fallara, su reseña sigue guardada y se le puede sacar el plan a mano.
      const deSuPlan = laCompraDelP1(body.p1);
      let suPlan = false;
      if (deSuPlan) {
        suPlan = await arrancarSuPlan(deSuPlan);
      }

      return res.status(200).json({ ok: true, suPlan });
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
    NOMBRE: nombre,
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
async function enviarEmailAdmin(nombre, email, fecha, videoUrl, objectKey) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

  const fechaFormateada = fecha ? new Date(fecha).toLocaleString('es-ES') : new Date().toLocaleString('es-ES');

  const body = {
    sender: { email: 'hola@origennatal.com', name: 'ORIGEN NATAL — Reseñas' },
    to: [{ email: 'hola.origennatal@gmail.com', name: 'Origen Natal' }],
    subject: '🎬 RESEÑA RECIBIDA',
    htmlContent: `
      <div style="font-family:Arial,sans-serif;padding:24px;background:#fffbef;max-width:600px;">
        <h2 style="color:#0e3f4b;margin-bottom:20px;">🎬 RESEÑA RECIBIDA</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;width:160px;">Nombre:</td><td style="padding:8px 0;color:#333;">${nombre}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Email:</td><td style="padding:8px 0;color:#333;">${email}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Archivo:</td><td style="padding:8px 0;color:#333;">${objectKey}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Fecha:</td><td style="padding:8px 0;color:#333;">${fechaFormateada}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#0e3f4b;">Consentimiento:</td><td style="padding:8px 0;color:#333;">✅ Firmado</td></tr>
        </table>
        <div style="margin-top:24px;">
          <a href="${videoUrl}" style="background:#bd9048;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
            🎬 Ver vídeo
          </a>
        </div>
        <p style="margin-top:20px;font-size:12px;color:#999;">
          Consentimiento firmado: "Autorizo a Origen Natal a usar mi imagen, voz y testimonio en su web, redes sociales y materiales de comunicación para mostrar experiencias reales del producto."
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
async function generatePresignedUrl({ endpoint, accessKeyId, secretAccessKey, bucketName, objectKey, expiresIn }) {
  const region = 'auto';
  const service = 's3';
  const now = new Date();
  const datestamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;
  const canonicalUri = `/${bucketName}/${objectKey}`;
  const canonicalQueryString = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(credential)}`,
    `X-Amz-Date=${amzdate}`,
    `X-Amz-Expires=${expiresIn}`,
    `X-Amz-SignedHeaders=host`,
  ].join('&');
  const host = endpoint.replace('https://', '');
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = ['PUT', canonicalUri, canonicalQueryString, canonicalHeaders, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzdate, credentialScope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  const signingKey = getSigningKey(secretAccessKey, datestamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return `${endpoint}/${bucketName}/${objectKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

function getSigningKey(secretKey, datestamp, region, service) {
  const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(datestamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  return crypto.createHmac('sha256', kService).update('aws4_request').digest();
}

// ═══════════════════════════════════════
// EL PLAN DE ORIGEN, CUANDO LA RESEÑA LO PAGA
// ═══════════════════════════════════════

// EL NUMERO DE SU COMPRA DEL P1. Es lo unico que dice de que informe sacar su
// plan. Viene del navegador, asi que se mira: tiene que ser texto y con la
// pinta de un numero de compra de Stripe. Lo que no lo sea, se ignora y no se
// arranca nada.
const PARECE_UNA_COMPRA = /^[A-Za-z0-9_-]{8,120}$/;

function laCompraDelP1(suyo) {
  const limpio = typeof suyo === 'string' ? suyo.trim() : '';
  return PARECE_UNA_COMPRA.test(limpio) ? limpio : '';
}

// Y SE PONE EN MARCHA. Es la misma llamada que hace el aviso del cobro cuando
// alguien paga el P2: al otro lado se comprueba que ese informe existe, que no
// tiene ya su plan, y se monta.
//
// NO SE ESPERA A QUE TERMINE: tarda minutos y aqui hay alguien mirando la
// pantalla. Basta con que la peticion salga.
async function arrancarSuPlan(compra) {
  const clave = process.env.STRIPE_WEBHOOK_SECRET;
  if (!clave) {
    console.error('[submit-resena] Sin STRIPE_WEBHOOK_SECRET: no se arranca el plan de', compra);
    return false;
  }

  try {
    const resp = await fetch('https://origennatal.com/api/p2-plan/arranque', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-origen-interno': clave },
      body: JSON.stringify({ compra }),
      // DOS SEGUNDOS Y MEDIO, no mas. La peticion sale igual -lo que tarde
      // el plan en montarse ya no es cosa de aqui-, y una pega vuelve mucho
      // antes de eso. Se corta pronto a proposito: delante de esto van dos
      // llamadas a Brevo, y esta puerta tiene su limite de tiempo.
      signal: AbortSignal.timeout(2500),
    });

    // SI CONTESTA TAN RAPIDO ES QUE NO LO HA COGIDO. Montar un plan tarda
    // minutos: lo que vuelve en segundos es una pega -la llave mal, ese
    // informe no da para un plan, no existe-. En ese caso no se le puede
    // decir que su plan viene, porque no viene.
    //
    // El 409 es la excepcion: significa que ya se le esta montando, que es
    // justo lo que queriamos.
    if (!resp.ok && resp.status !== 409) {
      console.error(`[submit-resena] El plan de ${compra} no ha arrancado (${resp.status}): ${(await resp.text()).slice(0, 200)}`);
      return false;
    }

    // Y SI YA LO TENIA HECHO, tampoco: ese plan ya se le entrego en su dia y
    // no se le vuelve a mandar, asi que decirle que le llega en unos minutos
    // seria dejarla esperando un correo que no va a venir.
    if (resp.ok) {
      const dice = await resp.json().catch(() => ({}));
      if (dice && dice.yaEstaba) {
        console.log('[submit-resena] ' + compra + ' ya tenia su plan: no se le promete nada');
        return false;
      }
    }

    console.log('[submit-resena] Plan arrancado por su resena:', compra);
    return true;
  } catch (err) {
    // Un corte por tiempo es lo normal y lo esperado: significa que la
    // peticion llego y el plan se esta montando.
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      console.log('[submit-resena] Plan arrancado por su resena:', compra);
      return true;
    }
    console.error('[submit-resena] No se ha podido arrancar el plan de', compra, err.message);
    return false;
  }
}
