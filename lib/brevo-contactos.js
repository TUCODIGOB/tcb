// ═════════════════════════════════════════════════════════════════
// lib/brevo-contactos.js
// Guardar un contacto en Brevo sin perder ninguno por el camino.
//
// QUE PROBLEMA RESUELVE. El contacto se manda a Brevo en dos momentos: cuando
// pide su P0 -entra en la lista 14- y cuando compra el P1 -pasa a la 3-. Si
// Brevo no contesta en ese instante, ese contacto no entraba y nadie volvia a
// intentarlo: se perdia sin que se enterara nadie.
//
// COMO. Se intenta al momento. Si no entra, se apunta en una lista de
// pendientes y el reloj -/api/brevo-pendientes- lo vuelve a intentar a los 15
// minutos, a la hora y a las tres horas. Cuando entra, se borra el apunte. Si
// a las tres horas sigue sin entrar, se avisa por correo a la tienda.
//
// Los datos del cliente NUNCA dependen de esto: viven en R2 y en Stripe.
// Brevo es la copia para el marketing, y esto es lo que hace que esa copia
// acabe llegando siempre.
//
// La firma de R2 es la misma que usan lib/ficha-del-lead.js y el almacen del
// P0: mismo bucket, mismas variables, misma manera de firmar.
// ═════════════════════════════════════════════════════════════════

import crypto from 'crypto';

// Los pendientes cuelgan de aqui, aparte de los informes y del P0.
const CARPETA = 'brevo/pendientes';

// LO QUE SE ESPERA ANTES DE CADA REINTENTO, contado desde el primer fallo.
// Al momento (el intento original) y luego estos tres. El reloj se despierta
// cada 15 minutos, asi que en la practica caen ahi o un poco despues.
export const ESPERAS_MS = [15 * 60 * 1000, 60 * 60 * 1000, 3 * 60 * 60 * 1000];

// ── BREVO ────────────────────────────────────────────────────────

// ¿SE QUEJA POR EL TELEFONO REPETIDO? Brevo no admite el mismo movil en dos
// contactos -una pareja, el movil de casa, un numero de empresa- y cuando pasa
// contesta esto.
export function esElTelefonoRepetido(estado, queja) {
  return estado === 400 && /duplicate_parameter/i.test(queja) && /\bSMS\b/i.test(queja);
}

function mandarABrevo(body, apiKey, tope) {
  return fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
    // SU TOPE. Delante de esto hay un cliente esperando, y la funcion entera
    // tiene su limite de tiempo: si Brevo no contesta pronto, se corta y se
    // sigue. Nunca se le deja mirando la pantalla por esto.
    signal: AbortSignal.timeout(tope),
  });
}

// GUARDA EL CONTACTO. Si no se puede, lanza: quien llama decide si lo apunta
// como pendiente o no.
//
// EL TELEFONO NO PUEDE COSTARLE LA FICHA A NADIE. Si ese movil ya esta en otro
// contacto, Brevo rechaza este ENTERO: ni la lista, ni sus datos de
// nacimiento, ni nada. Asi que se guarda otra vez sin el telefono, que es un
// dato de mas: el numero ya esta en el otro contacto.
export async function guardarContactoEnBrevo(body, apiKey, tope = 4000) {
  let resp = await mandarABrevo(body, apiKey, tope);

  if (!resp.ok && body.attributes && body.attributes.SMS) {
    const queja = await resp.text();
    if (!esElTelefonoRepetido(resp.status, queja)) {
      throw new Error(`Brevo ha contestado ${resp.status}: ${queja}`);
    }
    console.warn('⚠️ Ese telefono ya estaba en otro contacto de Brevo: se guarda sin el.');
    const { SMS, ...sinTelefono } = body.attributes;
    resp = await mandarABrevo({ ...body, attributes: sinTelefono }, apiKey, tope);
  }

  if (!resp.ok) {
    throw new Error(`Brevo ha contestado ${resp.status}: ${await resp.text()}`);
  }
  return true;
}

// ── LA LISTA DE PENDIENTES, EN R2 ────────────────────────────────

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

async function pedir(metodo, ruta, cuerpo, consulta) {
  const cfg = ajustes();
  if (!cfg) throw new Error('Faltan las variables INFORME_P1_CLOUDFLARE_*');

  const host = `${cfg.cuenta}.r2.cloudflarestorage.com`;
  const region = 'auto', servicio = 's3';
  const ahora = new Date();
  const dia = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const marca = ahora.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const ambito = `${dia}/${region}/${servicio}/aws4_request`;

  const datos = cuerpo ? JSON.stringify(cuerpo) : '';
  const hash = crypto.createHash('sha256').update(datos ? Buffer.from(datos) : Buffer.alloc(0)).digest('hex');
  const conTipo = Boolean(cuerpo);

  const query = consulta
    ? Object.keys(consulta).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(consulta[k])}`).join('&')
    : '';

  const cabeceras =
    (conTipo ? 'content-type:application/json\n' : '') +
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

  return fetch(`https://${host}${camino}${query ? '?' + query : ''}`, {
    method: metodo,
    signal: AbortSignal.timeout(10000),
    headers: cabecerasHttp,
    ...(cuerpo ? { body: datos } : {}),
  });
}

// EL NOMBRE DEL APUNTE sale del email y de la lista a la que iba. Asi, si el
// mismo contacto falla dos veces seguidas, no se acumulan dos apuntes: el
// nuevo pisa al viejo y se reintenta una sola vez, con lo ultimo que se sabe.
function nombreDelApunte(body) {
  const email = String(body?.email || '').trim().toLowerCase();
  const listas = (body?.listIds || []).join('-');
  return crypto.createHash('sha256').update(`${email}|${listas}`).digest('hex').slice(0, 32);
}

const donde = nombre => `${CARPETA}/${String(nombre).replace(/[^a-f0-9]/g, '')}.json`;

// APUNTAR UNO. No lanza nunca: esto es la red de seguridad, y una red que se
// rompe no puede tumbar lo que estaba salvando.
export async function apuntarPendiente(body, motivo) {
  try {
    const nombre = nombreDelApunte(body);
    if (!body?.email) return false;
    const resp = await pedir('PUT', donde(nombre), {
      body,
      creado: Date.now(),
      intentos: 0,
      motivo: String(motivo || '').slice(0, 300),
    });
    if (!resp.ok) throw new Error(`R2 ${resp.status}`);
    console.warn(`⚠️ Brevo no ha aceptado el contacto: apuntado para reintentar (${nombre}).`);
    return true;
  } catch (err) {
    console.error('❌ No se ha podido apuntar el contacto pendiente de Brevo:', err.message);
    return false;
  }
}

export async function listarPendientes() {
  const prefijo = `${CARPETA}/`;
  const nombres = [];
  let desde = '';

  for (let vuelta = 0; vuelta < 20; vuelta++) {
    const consulta = { 'list-type': '2', prefix: prefijo, 'max-keys': '200' };
    if (desde) consulta['continuation-token'] = desde;

    const resp = await pedir('GET', '', null, consulta);
    if (!resp.ok) throw new Error(`R2 ${resp.status}`);
    const xml = await resp.text();

    (xml.match(/<Key>([^<]+)<\/Key>/g) || []).forEach(trozo => {
      const clave = trozo.slice(5, -6);
      if (clave.startsWith(prefijo) && clave.endsWith('.json')) {
        nombres.push(clave.slice(prefijo.length, -5));
      }
    });

    if (!/<IsTruncated>true<\/IsTruncated>/.test(xml)) break;
    const sigue = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
    if (!sigue) break;
    desde = sigue[1];
  }

  return nombres;
}

export async function leerPendiente(nombre) {
  const resp = await pedir('GET', donde(nombre));
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`R2 ${resp.status}`);
  return resp.json();
}

export async function guardarPendiente(nombre, ficha) {
  const resp = await pedir('PUT', donde(nombre), ficha);
  if (!resp.ok) throw new Error(`R2 ${resp.status}`);
  return true;
}

export async function borrarPendiente(nombre) {
  const resp = await pedir('DELETE', donde(nombre));
  if (!resp.ok && resp.status !== 404) throw new Error(`R2 ${resp.status}`);
  return true;
}
