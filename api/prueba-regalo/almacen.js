// ═════════════════════════════════════════════════════════════════
// /api/prueba-regalo/almacen.js
// Leer y escribir ficheros sueltos del regalo en Cloudflare R2.
//
// POR QUE ESTA AQUI Y NO EN lib/. Lo de lib/ lo comparte el P1 y no se toca.
// Esto es solo del regalo y vive en su carpeta, igual que el resto del P0.
// Escribe y lee dentro de p0/, que es su sitio y de nadie mas.
//
// La firma es la misma que usa lib/guardar-informe.js para escribir: mismo
// bucket, mismas variables, misma manera de firmar.
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

// Lo que forma el nombre del fichero no puede llevar barras ni nada raro.
const limpio = txt => String(txt || '').replace(/[^A-Za-z0-9_-]/g, '');

// TODO LO DEL REGALO CUELGA DE AQUI, aparte de cualquier otro producto.
const CARPETA = 'p0';

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
  const peticion = [metodo, `/${cfg.bucket}/${ruta}`, '', cabeceras, firmadas, hash].join('\n');
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

  return fetch(`https://${host}/${cfg.bucket}/${ruta}`, {
    method: metodo,
    signal: AbortSignal.timeout(10000),
    headers: cabecerasHttp,
    ...(cuerpo ? { body: datos } : {}),
  });
}

function donde(cual, nombre) {
  const limpiado = limpio(nombre);
  if (!limpiado) throw new Error('Nombre vacio');
  return cual ? `${CARPETA}/${limpio(cual)}/${limpiado}.json` : `${CARPETA}/${limpiado}.json`;
}

// LEER. Devuelve null si no hay nada guardado con ese nombre; asi quien
// llama no tiene que distinguir "no existe" de "ha fallado".
export async function leer(cual, nombre) {
  const resp = await pedir('GET', donde(cual, nombre));
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return resp.json();
}

// ESCRIBIR.
export async function escribir(cual, nombre, contenido) {
  const resp = await pedir('PUT', donde(cual, nombre), contenido);
  if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return true;
}

// BORRAR. Se usa para quemar un vale cuando ya se ha gastado.
export async function borrar(cual, nombre) {
  const resp = await pedir('DELETE', donde(cual, nombre));
  if (!resp.ok && resp.status !== 404) {
    throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  return true;
}
