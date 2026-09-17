// ═════════════════════════════════════════════════════════════════
// /api/p0-informes.js
// Lee los regalos ya guardados, para poder mirarlos.
//
// PARA QUE. Es la misma puerta que /api/p1-informes, pero para el regalo. Al
// escribirlo se guarda un cuaderno con lo que tardo cada llamada, lo que
// costo, que rasgos saco de la carta, cuales quito la limpieza y con cuales se
// quedo. Esto es lo unico que hace falta para mirarlo desde la pagina de
// control, sin que quien lo recibe vea nada de eso.
//
// SOLO LEE. No escribe nada, no borra nada y no toca ningun regalo. Si esto
// desapareciera manana, el P0 seguiria funcionando igual.
//
// DOS MANERAS DE PEDIR:
//   · sin nada       -> la lista de regalos, de mas nuevo a mas viejo
//   · ?compra=...    -> el regalo entero de ese email
//
// CERRADA CON LLAVE. Lleva dentro los datos de nacimiento y lo que se le
// escribio a una persona, asi que no puede quedar abierta. Entra quien traiga
// P0_INFORMES_CLAVE.
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

const limpio = txt => String(txt || '').replace(/[^A-Za-z0-9_-]/g, '');

// Los regalos viven aqui. Lo demas del P0 -los pendientes, los vales, las
// veces y los enlaces- cuelga de sus propias carpetas y no se mira desde esta
// puerta.
const CARPETA = 'p0';

async function pedir(metodo, ruta, consulta) {
  const cfg = ajustes();
  if (!cfg) throw new Error('Faltan las variables INFORME_P1_CLOUDFLARE_*');

  const host = `${cfg.cuenta}.r2.cloudflarestorage.com`;
  const region = 'auto', servicio = 's3';
  const ahora = new Date();
  const dia = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const marca = ahora.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const ambito = `${dia}/${region}/${servicio}/aws4_request`;
  const hash = crypto.createHash('sha256').update(Buffer.alloc(0)).digest('hex');

  const query = consulta
    ? Object.keys(consulta).sort()
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(consulta[k])).join('&')
    : '';

  const cabeceras =
    `host:${host}\n` +
    `x-amz-content-sha256:${hash}\n` +
    `x-amz-date:${marca}\n`;
  const firmadas = 'host;x-amz-content-sha256;x-amz-date';
  const camino = ruta ? `/${cfg.bucket}/${ruta}` : `/${cfg.bucket}`;
  const peticion = [metodo, camino, query, cabeceras, firmadas, hash].join('\n');
  const aFirmar = ['AWS4-HMAC-SHA256', marca, ambito,
    crypto.createHash('sha256').update(peticion).digest('hex')].join('\n');
  const firma = crypto.createHmac('sha256', firmaDelDia(cfg.secreto, dia, region, servicio))
    .update(aFirmar).digest('hex');

  return fetch(`https://${host}${camino}${query ? '?' + query : ''}`, {
    method: metodo,
    signal: AbortSignal.timeout(10000),
    headers: {
      'x-amz-content-sha256': hash,
      'x-amz-date': marca,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${cfg.clave}/${ambito}, SignedHeaders=${firmadas}, Signature=${firma}`,
    },
  });
}

// CUANTOS SE ABREN PARA SABER DE QUIEN SON. El nombre y el email no estan en
// la lista de R2, hay que abrir el informe. Se abren los ultimos, que son los
// que se miran, y todos a la vez para que no se note.
const CON_NOMBRE = 15;

// DE QUIEN ES ESE REGALO. Su nombre y su email van dentro, que es donde los
// deja el regalo al guardarlo. Si no salen, se queda sin ellos y la lista lo
// enseña igual.
async function deQuienEs(compra) {
  const resp = await pedir('GET', `${CARPETA}/${compra}.json`);
  if (!resp.ok) return {};
  const guardado = await resp.json();
  const dentro = guardado.cliente || {};
  return { nombre: String(dentro.nombre || '').trim(), email: dentro.email || '' };
}

// LA LISTA. Se piden los nombres y la fecha de cada fichero de p0/, sin bajar
// el contenido: la lista tiene que salir rapida aunque haya cientos.
async function laLista() {
  const prefijo = `${CARPETA}/`;
  const informes = [];
  let desde = '';

  for (let vuelta = 0; vuelta < 20; vuelta++) {
    const consulta = { 'list-type': '2', prefix: prefijo, 'max-keys': '200' };
    if (desde) consulta['continuation-token'] = desde;

    const resp = await pedir('GET', '', consulta);
    if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    const xml = await resp.text();

    (xml.match(/<Contents>[\s\S]*?<\/Contents>/g) || []).forEach(trozo => {
      const clave = (trozo.match(/<Key>([^<]+)<\/Key>/) || [])[1] || '';
      const cuando = (trozo.match(/<LastModified>([^<]+)<\/LastModified>/) || [])[1] || '';
      // Lo que cuelga de otra carpeta -p0/pendientes/, p0/vales/...- aqui no
      // pinta nada.
      if (!clave.startsWith(prefijo) || !clave.endsWith('.json')) return;
      const nombre = clave.slice(prefijo.length, -5);
      if (nombre.includes('/')) return;
      informes.push({ compra: nombre, guardado: cuando });
    });

    if (!/<IsTruncated>true<\/IsTruncated>/.test(xml)) break;
    const sigue = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
    if (!sigue) break;
    desde = sigue[1];
  }

  const ordenados = informes.sort((a, b) => String(b.guardado).localeCompare(String(a.guardado)));

  // Y a los ultimos se les pone nombre y email. Si alguno no se puede abrir, se
  // queda sin ellos: la lista sale igual.
  await Promise.all(ordenados.slice(0, CON_NOMBRE).map(async inf => {
    try {
      const quien = await deQuienEs(inf.compra);
      inf.nombre = quien.nombre || '';
      inf.email = quien.email || '';
    } catch (err) {
      console.error(`[p0-informes] No se ha podido saber de quien es ${inf.compra}:`, err.message);
    }
  }));

  return ordenados;
}

export default async function handler(req, res) {
  const clave = process.env.P0_INFORMES_CLAVE;
  if (!clave) {
    console.error('[p0-informes] Sin P0_INFORMES_CLAVE: la puerta no se abre');
    return res.status(500).json({ error: 'Sin llave' });
  }
  const traida = req.headers['x-p0-clave'] || (req.query && req.query.clave) || '';
  if (traida !== clave) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const compra = limpio((req.query && req.query.compra) || '');

  try {
    // SIN COMPRA: la lista.
    if (!compra) {
      return res.status(200).json({ informes: await laLista() });
    }

    // CON COMPRA: ese informe entero.
    const resp = await pedir('GET', `${CARPETA}/${compra}.json`);
    if (resp.status === 404) {
      return res.status(404).json({ error: 'No hay ningun regalo guardado con ese nombre' });
    }
    if (!resp.ok) throw new Error(`R2 ${resp.status}`);
    return res.status(200).json(await resp.json());

  } catch (err) {
    console.error('[p0-informes] No se ha podido leer:', err.message);
    return res.status(500).json({ error: 'No se ha podido leer' });
  }
}
