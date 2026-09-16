// ═════════════════════════════════════════════════════════════════
// lib/ficha-del-lead.js
// La ficha de un email: sus datos de nacimiento y su carta.
//
// QUE ES LA FICHA. Un mismo email tiene una sola ficha, con sus datos y su
// carta natal, y la crea quien llegue primero. Hoy llega primero el regalo,
// que la deja hecha antes de comprar nada. Pero manana puede entrar alguien
// que compre el informe sin haber pasado por el regalo -desde otro producto,
// desde otra pagina-, y entonces esa ficha no existe: la tiene que crear el
// informe. Eso es lo unico que hace este fichero.
//
// SE MIRA ANTES DE ESCRIBIR, SIEMPRE. Si la ficha ya estaba, no se toca: ahi
// dentro puede haber lo que el regalo le escribio, y volver a guardarla lo
// borraria. Solo se crea cuando no hay ninguna.
//
// NUNCA CORTA NADA. Esto pasa cuando el informe ya esta hecho y entregado: si
// falla, se deja aviso y se sigue. Quien llama no espera nada de aqui.
//
// La firma es la misma que usa lib/guardar-informe.js, que es quien escribe.
// ═════════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { guardarInforme } from './guardar-informe.js';

function ajustes() {
  const cuenta = process.env.INFORME_P1_CLOUDFLARE_ACCOUNT_ID;
  const clave = process.env.INFORME_P1_CLOUDFLARE_ACCESS_KEY_ID;
  const secreto = process.env.INFORME_P1_CLOUDFLARE_SECRET_ACCESS_KEY;
  const bucket = process.env.INFORME_P1_CLOUDFLARE_BUCKET_NAME;
  if (!cuenta || !clave || !secreto || !bucket) return null;
  return { cuenta, clave, secreto, bucket };
}

function firmaDelDia(secreto, dia, region, servicio) {
  const kFecha = crypto.createHmac('sha256', `AWS4${secreto}`).update(dia).digest();
  const kRegion = crypto.createHmac('sha256', kFecha).update(region).digest();
  const kServicio = crypto.createHmac('sha256', kRegion).update(servicio).digest();
  return crypto.createHmac('sha256', kServicio).update('aws4_request').digest();
}

// EL NOMBRE DEL FICHERO SALE DEL EMAIL, y tiene que salir igual desde
// cualquier sitio: se limpia y se pasa a minusculas antes de cifrarlo, que es
// exactamente lo que hace el regalo. Si esto cambiara, dos productos buscarian
// la misma ficha en dos sitios distintos.
export function huellaDelEmail(email) {
  const limpio = String(email || '').trim().toLowerCase();
  if (!limpio) return '';
  return crypto.createHash('sha256').update(limpio).digest('hex').slice(0, 32);
}

// ¿ESTA YA? Se pregunta solo por la cabecera, sin bajar el fichero: lo unico
// que hace falta saber es si existe.
async function yaLaTiene(huella) {
  const cfg = ajustes();
  if (!cfg) throw new Error('Faltan las variables INFORME_P1_CLOUDFLARE_*');

  const host = `${cfg.cuenta}.r2.cloudflarestorage.com`;
  const region = 'auto', servicio = 's3';
  const ahora = new Date();
  const dia = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const marca = ahora.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const ambito = `${dia}/${region}/${servicio}/aws4_request`;
  const hash = crypto.createHash('sha256').update(Buffer.alloc(0)).digest('hex');
  const camino = `/${cfg.bucket}/p0/${huella}.json`;

  const cabeceras =
    `host:${host}\n` +
    `x-amz-content-sha256:${hash}\n` +
    `x-amz-date:${marca}\n`;
  const firmadas = 'host;x-amz-content-sha256;x-amz-date';
  const peticion = ['HEAD', camino, '', cabeceras, firmadas, hash].join('\n');
  const aFirmar = ['AWS4-HMAC-SHA256', marca, ambito,
    crypto.createHash('sha256').update(peticion).digest('hex')].join('\n');
  const firma = crypto.createHmac('sha256', firmaDelDia(cfg.secreto, dia, region, servicio))
    .update(aFirmar).digest('hex');

  const resp = await fetch(`https://${host}${camino}`, {
    method: 'HEAD',
    signal: AbortSignal.timeout(10000),
    headers: {
      'x-amz-content-sha256': hash,
      'x-amz-date': marca,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${cfg.clave}/${ambito}, SignedHeaders=${firmadas}, Signature=${firma}`,
    },
  });

  if (resp.status === 404) return false;
  if (!resp.ok) throw new Error(`R2 ${resp.status}`);
  return true;
}

// CREARLA SI NO ESTA. Devuelve que ha pasado, para poder dejarlo en el
// registro. No lanza nada por su cuenta: quien llama lo envuelve igualmente.
export async function asegurarLaFicha({ email, cliente, carta }) {
  const huella = huellaDelEmail(email);
  if (!huella) return { creada: false, motivo: 'sin-email' };

  // SIN CARTA NO SE CREA. Una ficha sin carta no le sirve a nadie y ocuparia
  // el sitio de la buena.
  if (!carta || typeof carta !== 'object') return { creada: false, motivo: 'sin-carta' };

  if (await yaLaTiene(huella)) return { creada: false, motivo: 'ya-estaba' };

  const guardado = await guardarInforme({
    producto: 'p0',
    sessionId: huella,
    cliente: { ...cliente, email: String(email).trim().toLowerCase() },
    carta,
    // La ficha es solo sus datos y su carta. Lo escrito del area 1 y sus
    // rasgos entran si algun dia hace el regalo, igual que si la hubiera
    // creado el.
    areas: null,
    rasgos: null,
  });

  if (!guardado.guardado) return { creada: false, motivo: guardado.motivo };
  return { creada: true, ruta: guardado.ruta };
}
