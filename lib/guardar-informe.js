// ═════════════════════════════════════════════════════════════════
// lib/guardar-informe.js
// Guarda en Cloudflare R2 lo que se le entrego al cliente.
//
// POR QUE HACE FALTA.
//
// Hasta ahora, de un informe no quedaba nada: se generaba, se mandaba por
// correo y se perdia. El siguiente producto se apoya en el anterior -le habla
// de los rasgos que ella ya leyo-, y para eso tiene que poder leerlos.
//
// Y tiene que ser lo que salio DE VERDAD, no una tirada nueva: el modelo no
// elige los mismos rasgos dos veces, asi que regenerar desde la fecha de
// nacimiento daria una persona distinta de la que ella leyo.
//
// QUE SE GUARDA: solo texto. Los rasgos, las siete areas y sus datos. Unos
// 40 KB por informe. Ni el PDF, ni las imagenes, ni las fuentes: el PDF se
// vuelve a montar desde el texto, y pesa 1,8 MB.
//
// La carta natal tampoco: se recalcula sola desde la fecha, la hora y el
// lugar, y sale identica siempre.
//
// DONDE: un fichero por compra, con el identificador de Stripe como nombre.
// Asi dos compras del mismo email nunca se pisan.
//
// SI FALLA, NO PASA NADA. El informe ya esta hecho y el cliente lo recibe
// igual: esto es una copia para despues, no un paso de la entrega. Por eso
// nunca corta, solo deja aviso.
// ═════════════════════════════════════════════════════════════════

import crypto from 'crypto';

// Este bucket es PRIVADO y aparte del de las resenas: aqui hay nombres,
// fechas de nacimiento y el informe entero de una persona. Sin estas cuatro
// variables no se guarda nada y el informe sale igual que siempre.
function ajustes() {
  const cuenta = process.env.INFORMES_CLOUDFLARE_ACCOUNT_ID;
  const clave = process.env.INFORMES_CLOUDFLARE_ACCESS_KEY_ID;
  const secreto = process.env.INFORMES_CLOUDFLARE_SECRET_ACCESS_KEY;
  const bucket = process.env.INFORMES_CLOUDFLARE_BUCKET_NAME;
  if (!cuenta || !clave || !secreto || !bucket) return null;
  return { cuenta, clave, secreto, bucket };
}

function firmaDelDia(secreto, dia, region, servicio) {
  const kFecha = crypto.createHmac('sha256', `AWS4${secreto}`).update(dia).digest();
  const kRegion = crypto.createHmac('sha256', kFecha).update(region).digest();
  const kServicio = crypto.createHmac('sha256', kRegion).update(servicio).digest();
  return crypto.createHmac('sha256', kServicio).update('aws4_request').digest();
}

// El identificador de Stripe ya viene limpio (cs_live_… / cs_test_…), pero se
// filtra igual: es lo que forma el nombre del fichero y no puede llevar barras.
const limpio = txt => String(txt || '').replace(/[^A-Za-z0-9_-]/g, '');

export async function guardarInforme({ producto, sessionId, cliente, areas, rasgos }) {
  const cfg = ajustes();
  if (!cfg) {
    console.warn('Informe no guardado: falta la configuracion de R2 para informes');
    return { guardado: false, motivo: 'sin-configurar' };
  }

  const compra = limpio(sessionId);
  const cual = limpio(producto) || 'p1';
  if (!compra) return { guardado: false, motivo: 'sin-compra' };

  const cuerpo = Buffer.from(JSON.stringify({
    producto: cual,
    compra,
    generado: new Date().toISOString(),
    cliente,
    areas,
    rasgos,
  }), 'utf8');

  const ruta = `informes/${cual}/${compra}.json`;
  const host = `${cfg.cuenta}.eu.r2.cloudflarestorage.com`;
  const region = 'auto', servicio = 's3';
  const ahora = new Date();
  const dia = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const marca = ahora.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const ambito = `${dia}/${region}/${servicio}/aws4_request`;
  const hash = crypto.createHash('sha256').update(cuerpo).digest('hex');

  const cabeceras =
    `content-type:application/json\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${hash}\n` +
    `x-amz-date:${marca}\n`;
  const firmadas = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const peticion = ['PUT', `/${cfg.bucket}/${ruta}`, '', cabeceras, firmadas, hash].join('\n');
  const aFirmar = ['AWS4-HMAC-SHA256', marca, ambito,
    crypto.createHash('sha256').update(peticion).digest('hex')].join('\n');
  const firma = crypto.createHmac('sha256', firmaDelDia(cfg.secreto, dia, region, servicio))
    .update(aFirmar).digest('hex');

  // Un informe que tarda no puede retrasar la entrega: si R2 no contesta en
  // diez segundos, se deja y el cliente recibe su PDF igual.
  const resp = await fetch(`https://${host}/${cfg.bucket}/${ruta}`, {
    method: 'PUT',
    signal: AbortSignal.timeout(10000),
    headers: {
      'Content-Type': 'application/json',
      'x-amz-content-sha256': hash,
      'x-amz-date': marca,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${cfg.clave}/${ambito}, SignedHeaders=${firmadas}, Signature=${firma}`,
    },
    body: cuerpo,
  });

  if (!resp.ok) {
    throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }

  return { guardado: true, ruta, bytes: cuerpo.length };
}
