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

// Y los cerrojos, en la suya: uno por compra mientras se le esta montando el
// plan, para que no se monte dos veces a la vez.
const CERROJOS = 'cerrojos';

// Y los que esperan su plan, en la suya: una ficha por compra desde que paga
// hasta que su correo sale. Lo que no esta aqui, no esta pendiente de nada.
const PENDIENTES = 'pendientes';

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

// ── EL CERROJO ────────────────────────────────────────────────
//
// QUE PROBLEMA RESUELVE. Montar un plan cuesta dinero y tarda un par de
// minutos. Si en ese rato entra una segunda peticion por la misma compra -el
// aviso del cobro que se repite, un reintento que se adelanta, dos pestanas-,
// se montaria dos veces y se pagaria dos veces.
//
// COMO. Quien quiere montarlo deja aqui una senal con su nombre. Si ya hay
// otra sin caducar, se aparta. Es el mismo trato que usa el P1, y la misma
// razon de la espera: dos que leen a la vez ven las dos el hueco vacio, asi
// que despues de escribir se espera un momento y se vuelve a leer. Solo sigue
// quien encuentra su propio nombre.
//
// CADUCA. Si la funcion se muere sin soltarlo, el cerrojo se queda puesto.
// Pasada la ventana deja de valer, y la siguiente peticion puede montarlo.
const VENTANA_DEL_CERROJO_MS = 10 * 60 * 1000;

// Lo justo para que se note la escritura de otro que iba a la vez.
const ESPERA_DEL_CERROJO_MS = 1500;

// Sin dependencias: basta para distinguir dos peticiones simultaneas, que es
// lo unico para lo que se usa.
function unNombre() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10);
}

// COGER EL CERROJO. Devuelve el nombre con el que se ha cogido, o null si lo
// tiene otro. Quien reciba null NO debe montar nada.
export async function cogerElCerrojo(compra) {
  const cual = limpio(compra);
  if (!cual) throw new Error('Sin el identificador de la compra no hay cerrojo');
  const ruta = `${CARPETA}/${CERROJOS}/${cual}.json`;

  const mirar = async () => {
    const resp = await pedir('GET', ruta);
    if (resp.status === 404) return null;
    if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    return resp.json();
  };

  const puesto = await mirar();
  if (puesto && Date.now() - Number(puesto.desde || 0) < VENTANA_DEL_CERROJO_MS) return null;

  const mio = unNombre();
  const resp = await pedir('PUT', ruta, { nombre: mio, desde: Date.now() });
  if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);

  // Y AHORA SE COMPRUEBA QUE SIGUE SIENDO MIO. Si otro escribio el suyo a la
  // vez, el ultimo manda y aqui aparecera su nombre en vez del nuestro.
  await new Promise(r => setTimeout(r, ESPERA_DEL_CERROJO_MS));
  const ahora = await mirar();
  return ahora && ahora.nombre === mio ? mio : null;
}

// SOLTARLO. Solo lo suelta quien lo tiene: si mientras tanto ha caducado y lo
// ha cogido otro, este no se lo quita.
export async function soltarElCerrojo(compra, nombre) {
  const cual = limpio(compra);
  if (!cual || !nombre) return false;
  const ruta = `${CARPETA}/${CERROJOS}/${cual}.json`;

  const resp = await pedir('GET', ruta);
  if (resp.status === 404) return false;
  if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const puesto = await resp.json();
  if (!puesto || puesto.nombre !== nombre) return false;

  const fuera = await pedir('DELETE', ruta);
  if (!fuera.ok && fuera.status !== 404) {
    throw new Error(`R2 ${fuera.status}: ${(await fuera.text()).slice(0, 200)}`);
  }
  return true;
}

// ── LOS QUE ESPERAN SU PLAN ───────────────────────────────────
//
// QUE PROBLEMA RESUELVE. Un plan puede no salir: se cae el modelo, se cae
// Cloudflare, el correo no sale. Si nadie apunta quien esta esperando, esa
// clienta ha pagado y no vuelve a saber de nosotros.
//
// COMO. En cuanto se pone en marcha su plan queda apuntada aqui, y deja de
// estarlo cuando su correo sale de verdad. El reloj mira esta lista cada rato
// y le da otra oportunidad a quien siga esperando.
//
// QUE SE APUNTA: su compra, cuando empezo, cuantas veces se ha vuelto a
// montar y cuantas se ha vuelto a mandar. Nada suyo: el nombre y el email
// salen de su informe, como todo lo demas del P2.

// APUNTAR A QUIEN EMPIEZA A ESPERAR. Si ya estaba, se respeta lo que llevaba
// contado: esto se llama tambien en los reintentos y no puede borrar la
// cuenta de las veces que ya se ha probado.
export async function apuntarPendiente(compra) {
  const cual = limpio(compra);
  if (!cual) throw new Error('Sin el identificador de la compra no se apunta nada');

  const yaEstaba = await leerElPendiente(cual);
  if (yaEstaba) return yaEstaba;

  const ficha = { compra: cual, creado: Date.now(), intentos: 0, entregas: 0 };
  await guardarElPendiente(ficha);
  return ficha;
}

// GUARDAR LA FICHA ENTERA. Lo usa el reloj para dejar apuntado que ya ha
// probado una vez mas. Se escribe encima: un pendiente es siempre uno solo.
export async function guardarElPendiente(ficha) {
  const cual = limpio(ficha?.compra);
  if (!cual) throw new Error('Sin el identificador de la compra no se guarda nada');
  const resp = await pedir('PUT', `${CARPETA}/${PENDIENTES}/${cual}.json`, { ...ficha, compra: cual });
  if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return true;
}

// LEER UNA. Devuelve null si esa compra no esta esperando nada.
export async function leerElPendiente(compra) {
  const cual = limpio(compra);
  if (!cual) return null;
  const resp = await pedir('GET', `${CARPETA}/${PENDIENTES}/${cual}.json`);
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return resp.json();
}

// TODOS LOS QUE ESPERAN. Si una ficha no se puede leer, se deja aviso y se
// sigue con las demas: una rota no puede dejar sin reintento a las de detras.
export async function losPendientes() {
  const prefijo = `${CARPETA}/${PENDIENTES}/`;
  const nombres = [];
  let desde = '';

  for (let vuelta = 0; vuelta < 20; vuelta++) {
    const consulta = { 'list-type': '2', prefix: prefijo, 'max-keys': '200' };
    if (desde) consulta['continuation-token'] = desde;

    const resp = await pedir('GET', '', null, consulta);
    if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
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

  const fichas = [];
  for (const compra of nombres) {
    try {
      const suya = await leerElPendiente(compra);
      if (suya) fichas.push({ ...suya, compra });
    } catch (err) {
      console.error(`[p2] No se ha podido leer el pendiente ${compra}:`, err.message);
    }
  }
  return fichas;
}

// QUITAR. Se llama cuando su correo ha salido de verdad. Si la ficha ya no
// estaba, tambien vale: lo que importa es que deje de constar como pendiente.
export async function quitarElPendiente(compra) {
  const cual = limpio(compra);
  if (!cual) return false;
  const resp = await pedir('DELETE', `${CARPETA}/${PENDIENTES}/${cual}.json`);
  if (!resp.ok && resp.status !== 404) {
    throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  return true;
}
