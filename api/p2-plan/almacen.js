// ═════════════════════════════════════════════════════════════════
// /api/p2-plan/almacen.js
// Donde vive lo que se le ha escrito a cada clienta en el P2.
//
// POR QUE HACE FALTA. Hasta ahora el P2 se montaba, se miraba en la pagina y
// se perdia. Si nadie lo guarda no se puede entregar mas tarde, ni volver a
// bajar el PDF, ni mirar como salio cuando algo chirrie.
//
// POR QUE ESTA AQUI Y NO EN lib/. Lo de lib/ lo comparte el P1 y no se toca.
// Esto es solo del P2 y vive en su carpeta, igual que el resto del producto.
// Escribe y lee dentro de p2/, que es su sitio y de nadie mas: ni el P0 ni el
// P1 entran aqui, ni esto entra en lo suyo.
//
// QUE SE GUARDA: solo texto, y TODO lo que hace falta para revisarlo despues.
// No solo el documento que ella lee: tambien lo que se decidio antes, lo que
// la limpieza quito, de que desafios sale cada creencia y cuanto peso tiene, y
// el cuaderno con lo que tardo y costo cada llamada. Sin eso, cuando un plan
// salga raro no habria manera de saber por donde se torcio.
//
// El PDF no se guarda: se vuelve a montar desde este texto cuando haga falta,
// y pesa casi dos megas.
//
// DONDE: un fichero por compra, con el identificador de Stripe como nombre.
// Asi dos compras del mismo email nunca se pisan.
//
// La firma es la misma que usan lib/guardar-informe.js y el almacen del P0:
// mismo bucket, mismas variables, misma manera de firmar.
// ═════════════════════════════════════════════════════════════════

import crypto from 'crypto';

// Este bucket es PRIVADO: aqui hay nombres y el documento entero de una
// persona. Sin estas cuatro variables no se guarda nada.
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

// TODO LO DEL P2 CUELGA DE AQUI, aparte de cualquier otro producto.
const CARPETA = 'p2';

// Y los documentos terminados, dentro de su propia carpeta: asi manana cabe
// otra cosa del P2 al lado sin mezclarse con estos.
const PLANES = 'planes';

async function pedir(metodo, ruta, cuerpo, consulta) {
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

  // La consulta va aparte y ordenada: asi la firma la lee igual que R2.
  const query = consulta
    ? Object.keys(consulta).sort()
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(consulta[k])).join('&')
    : '';

  const conTipo = metodo === 'PUT';
  const cabeceras =
    (conTipo ? `content-type:application/json\n` : '') +
    `host:${host}\n` +
    `x-amz-content-sha256:${hash}\n` +
    `x-amz-date:${marca}\n`;
  const firmadas = (conTipo ? 'content-type;' : '') + 'host;x-amz-content-sha256;x-amz-date';
  const camino = ruta ? `/${cfg.bucket}/${ruta}` : `/${cfg.bucket}`;
  const peticion = [metodo, camino, query, cabeceras, firmadas, hash].join('\n');
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

  // Si R2 no contesta en diez segundos se deja: guardar no puede retrasar la
  // entrega de un documento que ya esta hecho.
  return fetch(`https://${host}${camino}${query ? '?' + query : ''}`, {
    method: metodo,
    signal: AbortSignal.timeout(10000),
    headers: cabecerasHttp,
    ...(cuerpo ? { body: datos } : {}),
  });
}

// ── GUARDAR UN PLAN TERMINADO ─────────────────────────────────
//
// Se le pasa tal cual lo que ha salido de montar el documento. Lo que no
// venga se guarda en nulo: un plan al que le falte el cuaderno se sigue
// pudiendo leer, y es mejor eso que no guardarlo.
export async function guardarElPlan({ compra, cliente, documento, plan, creencias, cuaderno }) {
  const cual = limpio(compra);
  if (!cual) throw new Error('Sin el identificador de la compra no se guarda nada');

  const cuerpo = {
    producto: CARPETA,
    compra: cual,
    generado: new Date().toISOString(),
    // De quien es: su nombre y su sexo, que es con lo que se escribio.
    cliente: cliente || null,
    // LO QUE ELLA LEE: sus pruebas, sus creencias y su hoja de ruta.
    documento: documento || null,
    // LO QUE SE DECIDIO ANTES DE ESCRIBIR: las partes elegidas, de que desafio
    // sale cada una, y que quito la limpieza de la lista del P1.
    plan: plan || null,
    // LAS CREENCIAS POR DENTRO: las que salieron con su peso y sus desafios, y
    // las que se cayeron en cada corte.
    creencias: creencias || null,
    // Y COMO FUE LA TANDA: cada llamada, con su modelo, lo que tardo y lo que
    // costo. No cambia nada de lo que se entrega; es para poder mirarlo.
    cuaderno: cuaderno || null,
  };

  const resp = await pedir('PUT', `${CARPETA}/${PLANES}/${cual}.json`, cuerpo);
  if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return { guardado: true, compra: cual };
}

// ── LEER UN PLAN ──────────────────────────────────────────────
//
// Devuelve null si no hay nada guardado con esa compra, para que quien llama
// no tenga que distinguir "no existe" de "ha fallado".
export async function leerElPlan(compra) {
  const cual = limpio(compra);
  if (!cual) return null;
  const resp = await pedir('GET', `${CARPETA}/${PLANES}/${cual}.json`);
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return resp.json();
}

// ── LOS QUE HAY, DE MAS NUEVO A MAS VIEJO ─────────────────────
//
// Solo los nombres y la fecha, sin abrir ninguno: es lo que hace falta para
// poner la lista y elegir cual se mira.
export async function losPlanes(cuantos = 40) {
  const cuantosDeVerdad = Math.min(Math.max(Number(cuantos) || 40, 1), 1000);
  const prefijo = `${CARPETA}/${PLANES}/`;

  const resp = await pedir('GET', '', null, {
    'list-type': '2',
    prefix: prefijo,
    'max-keys': String(cuantosDeVerdad),
  });
  if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);

  const xml = await resp.text();
  const planes = [];
  for (const trozo of xml.split('<Contents>').slice(1)) {
    const clave = (trozo.match(/<Key>([^<]+)<\/Key>/) || [])[1];
    const fecha = (trozo.match(/<LastModified>([^<]+)<\/LastModified>/) || [])[1];
    if (!clave || !clave.startsWith(prefijo) || !clave.endsWith('.json')) continue;
    planes.push({ compra: clave.slice(prefijo.length, -'.json'.length), fecha: fecha || '' });
  }
  planes.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  return planes.slice(0, cuantosDeVerdad);
}
