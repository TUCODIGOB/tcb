// ═════════════════════════════════════════════════════════════════
// lib/pendientes-p1.js
// La lista de informes del P1 que todavia no se han entregado.
//
// QUE PROBLEMA RESUELVE. Hasta ahora, si la generacion se caia despues de
// cobrar, no quedaba constancia en ninguna parte: nadie sabia que esa clienta
// estaba esperando su informe. Aqui se apunta a cada compra en cuanto entra el
// dinero, y se le quita de la lista cuando su correo ha salido. Lo que queda
// apuntado es, por definicion, lo que falta por entregar.
//
// DONDE. En el mismo sitio donde ya se guardan los informes, dentro de p1/,
// que es la carpeta del P1 y de nadie mas. Un fichero por compra, con el
// identificador de Stripe como nombre, asi que apuntar dos veces la misma
// compra no la duplica.
//
// NUNCA CORTA LA ENTREGA. Ni apuntar ni quitar pueden dejar a nadie sin su
// informe: si R2 no contesta, se deja aviso y se sigue. Por eso quien llama
// envuelve estas dos llamadas y no espera por ellas.
//
// La firma es la misma que usa lib/guardar-informe.js: mismo bucket, mismas
// variables, misma manera de firmar.
// ═════════════════════════════════════════════════════════════════

import crypto from 'crypto';

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

// El identificador de Stripe ya viene limpio (cs_live_… / cs_test_…), pero se
// filtra igual: es lo que forma el nombre del fichero y no puede llevar barras.
const limpio = txt => String(txt || '').replace(/[^A-Za-z0-9_-]/g, '');

// LOS PENDIENTES DEL P1 CUELGAN DE AQUI, aparte de cualquier otro producto.
const CARPETA = 'p1/pendientes';

async function pedir(metodo, ruta, cuerpo) {
  const cfg = ajustes();
  if (!cfg) throw new Error('Faltan las variables INFORME_P1_CLOUDFLARE_*');

  const host = `${cfg.cuenta}.r2.cloudflarestorage.com`;
  const region = 'auto', servicio = 's3';
  const ahora = new Date();
  const dia = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const marca = ahora.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const ambito = `${dia}/${region}/${servicio}/aws4_request`;
  const datos = cuerpo ? Buffer.from(JSON.stringify(cuerpo), 'utf8') : Buffer.alloc(0);
  const hash = crypto.createHash('sha256').update(datos).digest('hex');

  const conTipo = metodo === 'PUT';
  const cabeceras =
    (conTipo ? `content-type:application/json\n` : '') +
    `host:${host}\n` +
    `x-amz-content-sha256:${hash}\n` +
    `x-amz-date:${marca}\n`;
  const firmadas = (conTipo ? 'content-type;' : '') + 'host;x-amz-content-sha256;x-amz-date';
  const camino = `/${cfg.bucket}/${ruta}`;
  const peticion = [metodo, camino, '', cabeceras, firmadas, hash].join('\n');
  const aFirmar = ['AWS4-HMAC-SHA256', marca, ambito,
    crypto.createHash('sha256').update(peticion).digest('hex')].join('\n');
  const firma = crypto.createHmac('sha256', firmaDelDia(cfg.secreto, dia, region, servicio))
    .update(aFirmar).digest('hex');

  const cabecerasHttp = {
    'x-amz-content-sha256': hash,
    'x-amz-date': marca,
    'Authorization': `AWS4-HMAC-SHA256 Credential=${cfg.clave}/${ambito}, SignedHeaders=${firmadas}, Signature=${firma}`,
  };
  if (conTipo) cabecerasHttp['Content-Type'] = 'application/json';

  // Diez segundos: esto no puede retrasar ni la respuesta a Stripe ni la
  // entrega del informe.
  return fetch(`https://${host}${camino}`, {
    method: metodo,
    signal: AbortSignal.timeout(10000),
    headers: cabecerasHttp,
    ...(cuerpo ? { body: datos } : {}),
  });
}

function donde(compra) {
  const nombre = limpio(compra);
  if (!nombre) throw new Error('Compra vacia');
  return `${CARPETA}/${nombre}.json`;
}

// APUNTAR. Se llama en cuanto Stripe confirma el cobro, antes de que empiece
// a generarse nada. Lo que se guarda es lo justo para saber quien espera y
// desde cuando.
export async function apuntarPendiente({ sessionId, email, nombre }) {
  const resp = await pedir('PUT', donde(sessionId), {
    compra: limpio(sessionId),
    email: String(email || '').trim().toLowerCase(),
    nombre: String(nombre || ''),
    creado: Date.now(),
  });
  if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return true;
}

// QUITAR. Se llama cuando el correo con el PDF ha salido de verdad. Si el
// fichero ya no estaba, tambien vale: lo que importa es que deje de constar
// como pendiente.
export async function quitarPendiente(sessionId) {
  const resp = await pedir('DELETE', donde(sessionId));
  if (!resp.ok && resp.status !== 404) {
    throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  return true;
}
