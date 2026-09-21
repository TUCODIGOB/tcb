// ════════════════════════════════════════════════════════════════
// api/p2-plan/prueba.js
//
// TU PLAN DE ORIGEN (P2), ENTERO Y EN UN SOLO FICHERO.
//
// VA JUNTO A PROPOSITO. Todo el P2 esta aqui dentro: como se le habla, sus
// partes, como se lee el informe del P1 que ya quedo guardado, como se
// decide el plan, como se escribe y la pagina para leerlo. Lo unico que vive
// fuera de este fichero es el que lo maqueta en PDF, que esta al lado, en
// pdf.js. Si algun dia hay que borrarlo, se borra esta carpeta y no se cae
// nada: no hay un solo trozo de esto repartido por los ficheros del P1.
//
// LO UNICO QUE COGE DE FUERA es el informe del P1, y SOLO PARA LEERLO. No
// escribe nada en ningun sitio, no manda correos, no cobra y no toca la compra.
//
// ── COMO ESTA HECHO ─────────────────────────────────────────
//
//   UNA DECIDE, con todo lo que a esta persona le cuesta, sacado del P1. De
//   cada cosa saca en corto el titulo y los cuatro puntos. No escribe ni una
//   linea de lo que va a leer.
//
//   UNA POR PARTE ESCRIBEN, TODAS A LA VEZ. Cada una recibe solo las cuatro
//   lineas de su parte, y nada mas. No deciden: abren esas cuatro lineas hasta
//   que se entiendan a la primera.
//
// ── QUE LLEVA EL DOCUMENTO ──────────────────────────────────
//
//   LAS PARTES QUE HAYAN SALIDO -no hay numero fijo, salen las que aguanten-,
//   todas iguales, cada una con cuatro cosas y cada una en UNA HOJA:
//     1. Tu prueba: que le pone la vida delante ahi, y en quien se convierte
//        el dia que lo supere.
//     2. Que haces: la unica cosa que tiene que hacer ahi, contada entera.
//     3. Donde te vas a caer: avisado antes de que le pase.
//     4. Cuando te caigas: el paso para volver.
//
//   LO QUE LE CUESTA ES SU PRUEBA, NO SU DEFECTO. Es de donde sale todo: el
//   P1 le conto lo que le pesa, y el P2 le da la vuelta y lo convierte en lo
//   que tiene que hacer. Si esto se pierde, el documento vuelve a ser un
//   analisis y el producto no vale nada.
//
//
// ── COMO SE USA ─────────────────────────────────────────────
//
// Se abre /api/p2-plan/prueba en el navegador, sale la lista de los ultimos
// informes guardados, se pincha uno y el plan va apareciendo.
//
// NO SE LE PREGUNTA NADA A LA CLIENTA. Todo el plan sale de sus rasgos del P1.
// Se probo a preguntarle por su vida y se quito: el plan tiene que salir
// entero del origen, que es lo que ha comprado, y lo que decide cada parte no
// es donde vive sino que hace, y eso ya esta en sus rasgos.
//
// CADA PASO ES UNA PETICION SUYA. Asi ninguna se acerca al tiempo maximo que
// aguanta el servidor, y se ve llegar el documento a trozos en vez de esperar
// tres minutos a una pantalla en blanco.
//
// NO LLEVA CLAVE, a proposito: el producto no esta lanzado y aqui solo entra
// quien lo esta montando. Pero por aqui pasan informes de clientas reales con
// su nombre, y cada pulsacion gasta dinero del modelo, asi que EL DIA QUE ESTO
// SE LANCE, esta pagina se borra o se le pone una puerta. No se queda abierta.
// ════════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { leerLaFicha } from '../../lib/ficha-del-lead.js';
// ── COMO SE LE HABLA ────────────────────────────────────────
//
// Esto no es del P2: es de la marca. Es lo que ya se aprendio escribiendo el
// primer informe, y aqui se aplica igual para que los dos suenen a lo mismo.

const REGLAS_COMUNES = `AQUÍ NO SE ESCRIBEN ESCENAS

Ni una. Nada de contarle un momento suyo como si lo estuvieras viendo: ni una hora, ni un día de la semana, ni un sitio, ni lo que tenía en la mano, ni lo que hizo después.

En cuanto describes un momento te lo estás inventando, y se nota a la primera. Una escena que no le pasó tira todo lo demás, aunque lo demás sea cierto.

Lo que sí se dice es cómo funciona: lo que hace siempre que le pasa eso. Eso es suyo y es verdad. El cuándo y el dónde, no.


NO SE LE INVENTA NADA DE SU VIDA

Ni su infancia, ni sus padres, ni una pareja, ni hijos, ni un trabajo, ni de dónde le viene el dinero, ni un episodio que le pasó. Si no está escrito en lo que tienes abajo, no existe.

Si nombras a alguien de su alrededor, esa persona tiene que estar en lo que tienes abajo; y no le pongas sexo, ni parentesco, ni nombre que no le hayan puesto.

Y no lo arregles con un momento de los que le pasan a cualquiera: eso también es ponerle una vida que no sabes si tiene.

Y nada de lo que escribas puede contradecir lo que tienes abajo: si ahí pone que se le da bien algo, no vale decirle que le cuesta.


CÓMO SUENA ESTO

Le habla alguien que le conoce, le quiere bien y se sienta a decírselo a la cara. No un experto, no un informe, no un libro. Esto es lo que hace que suene a persona, y vale para todo lo que escribas:

AFIRMA Y VAS DIRECTA. Dices las cosas con verbos, a la cara, y sigues. No las razonas, no las justificas, no las matizas, ni las rodeas con condicionales: cada matiz o rodeo le quita fuerza a lo que acabas de decir. Si has escrito una frase para suavizar la anterior, bórrala.

EMPIEZAS POR QUIEN LEE. Lo primero que lee es algo suyo: lo que hace, lo que siente o lo que se dice, nunca una idea ni una explicación. Y cuando le presentes algo por el camino, entras igual, por lo que le pasa y no por el concepto. Eso no quiere decir que todos los párrafos arranquen igual: si dos empiezan con la misma forma, cambias uno.

LE PONES SUS PALABRAS. Lo que se dice por dentro, entrecomillado, en primera persona y tal como suena de verdad, no arreglado. Es lo que le hace levantar la cabeza y decir esto va por mí. Sale de lo que ya está en los datos de abajo, traducido a cómo se lo diría por dentro: no es un dato nuevo. Una o dos en lo que escribas y no más: en cuanto se repiten en cada párrafo dejan de sonar suyas y se convierten en una muletilla.

TE PONES A SU LADO. Le hablas desde dentro de lo que le pasa, no desde arriba. Nada de darle una lección, ni de explicarle lo que ya sabe con otras palabras.

LE DAS LA RAZÓN ANTES DE PEDIRLE NADA. Primero le reconoces por qué hace lo que hace y que en su momento le sirvió. Después le dices lo que cambia, y eso se dice entero y sin rodeos. Reconocerlo no es suavizarlo.

REPITES LO QUE IMPORTA. Dentro de un mismo texto, una frase que quieres que se le quede se puede repetir tal cual, y funciona. Lo que no vale es contarle la misma idea otra vez con otras palabras para rellenar: eso lo nota y le hace pensar que hay más de lo que hay. Y si te piden varias cosas por separado, cada una dice lo suyo y no vuelve sobre lo que ya está dicho en otra.

TIENE CALOR. Se le nota que quien escribe está de su lado y que se alegra por quien lee. Sin animarle con frases que le valdrían a cualquiera, y sin dorarle nada.

Y CON ESTO SE ENTIENDE A LA PRIMERA:

- LÉELA POR DENTRO ANTES DE DARLA POR BUENA. Si nadie diría esa frase hablando, está mal y se reescribe. No fuerces la gramática para que suene elaborado, y no cojas un verbo raro cuando el normal dice lo mismo.
- SE DICE LA COSA, NO UNA FIGURA DE LA COSA. Nada de metáforas, ni de comparaciones inventadas, ni de partes suyas que se mueven o chocan como si tuvieran vida propia. Se dice lo que hace la persona, con palabras que se puedan agarrar.
- SI TAPAS TODO LO DEMÁS Y ESA FRASE SOLA NO DICE NADA CONCRETO DE QUIEN LO LEE, está mal escrita. Contar cómo se siente algo no es contar qué es.
- LAS PALABRAS SON LAS DE TODOS LOS DÍAS. Si una palabra la verías antes en un informe que dicha en una conversación, va fuera. Lo tiene que entender alguien de dieciocho años sin releer.
- SE ESCRIBE CON COMAS Y SEGUIDO, como habla alguien. Donde una persona hablando uniría dos trozos con una coma, va la coma y no un punto. Pero una frase lleva UNA idea: si al leerla en voz alta te falta el aire o tienes que volver atrás, lleva dos dentro y se parte.
- NO SE CONVIERTE EN COSA LO QUE HACE. Nada de coger su conducta, volverla un sustantivo y colgársela con un posesivo delante: se dice con un verbo, qué hace.
- LOS PÁRRAFOS RESPIRAN. Cuatro o cinco líneas, no dos, y cada uno cuenta una cosa entera.
- CADA PÁRRAFO SE ENGANCHA CON EL ANTERIOR. Retomas algo de lo que acabas de decir y sigues tirando de ahí.
- NO SE DA NADA POR SABIDO. No tiene a quién preguntar. Si hace falta una frase más para que se entienda, va esa frase.
- SE LEE DE NOCHE, CON EL DÍA ENCIMA Y EN EL MÓVIL. Quien lo lee no relee: si tropieza, lo deja.

Y ESTO NO VA NUNCA:

- Ni una palabra técnica: ningún planeta, ningún signo, ninguna casa, ningún aspecto. Su carta no se nombra, y no se dice tu informe ni tu estudio.
- No se habla del documento, se habla de su vida: ni áreas, ni partes, ni apartados, ni lo que viene antes o después, ni cuántas cosas hay.
- Nada que le valga igual a otra persona. Si lo que vas a escribir se le podría mandar a otra, no lo escribas.
- Nada de anunciar cuántas cosas vas a decir ni de numerarlas.
- Prohibidas estas palabras y cualquier variante suya: sanar, empoderarte, gestionar tus emociones, tu mejor yo, trabajar en ti, tu proceso, tu camino, y "mejor versión" en todas sus formas.
- Español de España, hablado. Ni una palabra en otro idioma.
- Sin asteriscos, sin listas, sin símbolos y sin numerar nada: la maqueta la pone el programa. Lo único que marcas tú es dónde acaba un párrafo, dejando una línea en blanco.

SE ESCRIBE EN ESPAÑOL CORRECTO, CON TODAS SUS TILDES Y TODAS SUS EÑES

Esto no es un detalle. Lo lee alguien que ha pagado, y un texto al que le faltan las tildes parece roto y barato, por bueno que sea lo que dice.

Español, año, día, más, está, aquí, así, también, después, sensación, cariño, vínculo: todas llevan lo que llevan. Ni una palabra sin su acento, y ni una eñe escrita como una ene.`;


// LOS CUATRO NOMBRES QUE VE DENTRO DE CADA PARTE, escritos aqui por lo mismo
// que los titulos.
//
// Antes todo iba en un bloque de texto sin nombre: dentro habia varias cosas y
// quien leia no sabia de que le hablaba cada una, ni podia volver a buscar una
// el dia que le hiciera falta. Y sirven para otra cosa igual de importante: un
// documento de veinte hojas de texto seguido cansa la vista, y estos son los
// sitios donde el ojo para y descansa.
//
// Los cuatro llevan nombre, tambien el primero: si uno entra sin etiqueta, la
// parte arranca con un texto suelto y el molde de las cuatro no se ve.
//
// VAN EN ESTE ORDEN, que es el de lo que le pasa: primero para que es esto y
// adonde le lleva, luego lo unico que tiene que hacer, y al final las dos que
// le hacen falta el dia que falle, que es el dia en que la gente deja los
// planes.
const BLOQUES = {
  tuPrueba:     'Tu prueba',
  queHaces:     'Qué hacer',
  dondeTeCaes:  'Dónde te vas a caer',
};

// EL ORDEN EN QUE VAN, y con el que se recorren en todas partes: al decidir,
// al escribir, en la pantalla y en el PDF. Un solo sitio donde estan puestos.
const PUNTOS = Object.keys(BLOQUES);

// A QUIEN SE LE ESCRIBE. El informe del P1 guarda si quien compro es mujer u
// hombre, y hay que decirselo: los textos van en femenino o en masculino y sin
// esto el modelo lo adivina. La herramienta no tiene sexo; quien lee, si.
function comoSeLeHabla(sexo) {
  return sexo === 'mujer'
    ? 'una MUJER. Todo en femenino.'
    : sexo === 'hombre'
      ? 'un HOMBRE. Todo en masculino.'
      : 'una persona que no se identifica como hombre ni como mujer. Evita marcar el género en los adjetivos.';
}


// DONDE PUEDE LLAMARLA POR SU NOMBRE, Y DONDE NO.
//
// Antes la regla estaba entre las comunes y decia "un par de veces en lo que
// escribas". Eso valia cuando escribia una sola llamada; aqui escriben ocho, y
// ninguna ve lo que han puesto las otras, asi que el documento acababa con el
// nombre repetido quince o veinte veces. Eso no suena cercano, suena a carta
// de publicidad.
//
// Asi que lo reparte el codigo, desde la pagina: la primera parte y una de en
// medio. Dos veces en todo el documento, y da igual cuantas partes tenga.
const REGLA_DEL_NOMBRE = puede => puede
  ? 'Puedes llamar por su nombre a quien lo lee UNA vez en lo que escribas, donde caiga natural. Nunca en la última frase.'
  : 'Y NO LLAMES POR SU NOMBRE a quien lo lee en lo que escribas: ya se lo dicen en otro sitio, y repetido cansa.';
// ════════════════════════════════════════════════════════════════
// EL INFORME DEL P1 QUE YA ESTA GUARDADO
// ════════════════════════════════════════════════════════════════

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

// El numero de compra forma la ruta del fichero, asi que se filtra: sin esto,
// un "../" escrito a mano en la direccion sacaria ficheros de otro sitio.
const limpio = txt => String(txt || '').replace(/[^A-Za-z0-9_-]/g, '');

// Una peticion GET firmada a R2. El cuerpo va siempre vacio, que es lo unico
// que se hace aqui: pedir.
async function pedir(cfg, ruta, consulta = {}) {
  const host = `${cfg.cuenta}.r2.cloudflarestorage.com`;
  const region = 'auto', servicio = 's3';
  const ahora = new Date();
  const dia = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const marca = ahora.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const ambito = `${dia}/${region}/${servicio}/aws4_request`;

  // El cuerpo vacio tiene un hash fijo, pero se calcula igual para no dejar
  // aqui una constante magica que nadie sepa de donde sale.
  const hash = crypto.createHash('sha256').update('').digest('hex');

  // La firma exige los parametros ordenados alfabeticamente y codificados uno
  // a uno. Cualquier otro orden da una firma que R2 rechaza.
  const query = Object.keys(consulta).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(consulta[k])}`)
    .join('&');

  const cabeceras =
    `host:${host}\n` +
    `x-amz-content-sha256:${hash}\n` +
    `x-amz-date:${marca}\n`;
  const firmadas = 'host;x-amz-content-sha256;x-amz-date';
  const peticion = ['GET', ruta, query, cabeceras, firmadas, hash].join('\n');
  const aFirmar = ['AWS4-HMAC-SHA256', marca, ambito,
    crypto.createHash('sha256').update(peticion).digest('hex')].join('\n');
  const firma = crypto.createHmac('sha256', firmaDelDia(cfg.secreto, dia, region, servicio))
    .update(aFirmar).digest('hex');

  return fetch(`https://${host}${ruta}${query ? `?${query}` : ''}`, {
    method: 'GET',
    signal: AbortSignal.timeout(15000),
    headers: {
      'x-amz-content-sha256': hash,
      'x-amz-date': marca,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${cfg.clave}/${ambito}, SignedHeaders=${firmadas}, Signature=${firma}`,
    },
  });
}

// Los informes guardados, del mas nuevo al mas viejo.
//
// R2 los devuelve en XML y ordenados por nombre, no por fecha, asi que se
// ordenan aqui por la fecha que trae cada uno.
//
// Solo saca el nombre y la fecha: para elegir en una lista no hace falta
// bajarse los informes enteros, que son decenas de KB cada uno.
async function listar(cuantos = 40) {
  const cfg = ajustes();
  if (!cfg) throw new Error('Faltan las variables INFORME_P1_CLOUDFLARE_*');

  const resp = await pedir(cfg, `/${cfg.bucket}`, {
    'list-type': '2',
    'prefix': 'p1/',
    'max-keys': String(Math.min(Math.max(cuantos, 1), 1000)),
  });
  if (!resp.ok) {
    throw new Error(`R2 no deja listar (${resp.status}): ${(await resp.text()).slice(0, 200)}`);
  }

  const xml = await resp.text();
  const informes = [];
  for (const trozo of xml.split('<Contents>').slice(1)) {
    const clave = (trozo.match(/<Key>([^<]+)<\/Key>/) || [])[1];
    const fecha = (trozo.match(/<LastModified>([^<]+)<\/LastModified>/) || [])[1];
    if (!clave || !clave.endsWith('.json')) continue;
    informes.push({ compra: clave.slice('p1/'.length, -'.json'.length), fecha: fecha || '' });
  }
  informes.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  return informes.slice(0, cuantos);
}

// Un informe entero. Devuelve lo mismo que se guardo: cliente, carta, las
// areas y los rasgos.
async function leer(compra) {
  const cfg = ajustes();
  if (!cfg) throw new Error('Faltan las variables INFORME_P1_CLOUDFLARE_*');

  const cual = limpio(compra);
  if (!cual) throw new Error('Numero de compra vacio');

  const resp = await pedir(cfg, `/${cfg.bucket}/p1/${cual}.json`);
  if (resp.status === 404) throw new Error(`No hay informe guardado de la compra ${cual}`);
  if (!resp.ok) {
    throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  return resp.json();
}

// ════════════════════════════════════════════════════════════════
// EL CUADERNO: QUE HA HECHO CADA LLAMADA, CUANTO HA TARDADO Y CUANTO
// HA COSTADO
// ════════════════════════════════════════════════════════════════
//
// Igual que el del P1, y para lo mismo: poder mirar despues si alguna se cae,
// cual se lleva el tiempo y cual se lleva el dinero. NO DECIDE NADA. Si un dia
// se quita, el P2 funciona igual.
//
// CADA PETICION TIENE EL SUYO. Se guarda en el almacen de la peticion -no en
// una variable de fuera- porque la pagina lanza varias a la vez, y asi lo de
// una nunca acaba apuntado en la otra.

const ELCUADERNO = new AsyncLocalStorage();

// LO QUE CUESTA CADA MODELO, EN DOLARES POR MILLON DE TOKENS. Son los precios
// de Anthropic; si los cambian, se cambian aqui. Lo que el modelo piensa se
// cobra como salida y ya viene sumado en output_tokens, asi que no se cuenta
// aparte.
const PRECIOS = {
  'claude-opus-5':   { entrada: 5, salida: 25 },
  'claude-sonnet-5': { entrada: 2, salida: 10 },
};

// Apunta una llamada. Si nadie ha abierto cuaderno, no hace nada.
function apuntarLaLlamada(apunte) {
  const cuaderno = ELCUADERNO.getStore();
  if (cuaderno) cuaderno.push(apunte);
}

// De lo que devuelve el modelo a tokens y dolares. Un modelo que no este en la
// tabla de precios apunta sus tokens y se queda en cero: no rompe nada.
function loQueCuesta(modelo, uso) {
  const entrada = (uso?.input_tokens || 0)
    + (uso?.cache_read_input_tokens || 0)
    + (uso?.cache_creation_input_tokens || 0);
  const salida = uso?.output_tokens || 0;
  const precio = PRECIOS[modelo];
  const dolares = precio ? (entrada * precio.entrada + salida * precio.salida) / 1000000 : 0;
  return { entrada, salida, dolares };
}


// ════════════════════════════════════════════════════════════════
// LA UNICA PUERTA AL MODELO
// ════════════════════════════════════════════════════════════════
//
// Todo lo que se le pide al modelo pasa por aqui: mismo trato de los fallos,
// mismo molde y un solo sitio donde cambiar lo que valga para todos.
//
// "piensa" es con cuanto esfuerzo razona. Vacio, no razona: entonces se apaga
// del todo, porque encendido a medias se gasta el presupuesto pensando en vez
// de escribir y la respuesta llega cortada.

// ── Y DELANTE DE EL, EL CUADERNO ────────────────────────────
//
// Mide lo que tarda, se queda con lo que ha gastado y lo apunta, salga bien o
// salga mal: los tokens de una respuesta que hay que tirar tambien se pagan.
async function alModelo(loSuyo) {
  const arranque = Date.now();
  const uso = {};
  const comoFue = mas => apuntarLaLlamada({
    que: loSuyo.que,
    modelo: loSuyo.modelo,
    piensa: loSuyo.piensa || '',
    segundos: Math.round((Date.now() - arranque) / 100) / 10,
    ...loQueCuesta(loSuyo.modelo, uso),
    ...mas,
  });

  try {
    const salida = await hablarConElModelo(loSuyo, uso);
    comoFue({ ok: true });
    return salida;
  } catch (err) {
    comoFue({ ok: false, fallo: String(err.message || '').slice(0, 200) });
    throw err;
  }
}

async function hablarConElModelo({ que, modelo, piensa, techo, system, mensaje, molde, espera }, uso) {
  const cuerpo = {
    model: modelo,
    max_tokens: techo,
    system,
    messages: [{ role: 'user', content: mensaje }],
    output_config: { format: { type: 'json_schema', schema: molde } },
    // SE PIDE A TROZOS, NO DE GOLPE.
    //
    // Una peticion normal se queda callada mientras el modelo escribe y solo
    // contesta al final. Con respuestas largas eso se corta por el camino: al
    // llegar al tope, la peticion muere aunque el modelo siguiera trabajando,
    // y se pierde todo lo que llevaba escrito.
    //
    // A trozos la respuesta va llegando segun se escribe. Nada se queda callado
    // esperando, y aqui abajo se puede ver que sigue viniendo.
    stream: true,
  };
  if (piensa) {
    cuerpo.thinking = { type: 'adaptive' };
    cuerpo.output_config.effort = piensa;
  } else {
    cuerpo.thinking = { type: 'disabled' };
  }

  // EL AVISO SE ENTIENDE. Si se pasa del tiempo, lo que llega de serie es
  // "The operation was aborted due to timeout", que quien lo lee no sabe lo que
  // es y encima esta en ingles.
  const cortado = err => err && (err.name === 'TimeoutError' || err.name === 'AbortError');

  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: espera,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(cuerpo),
    });
  } catch (err) {
    if (cortado(err)) throw new Error(`${que}: ha tardado más de la cuenta y se ha cortado. Vuelve a intentarlo.`);
    throw err;
  }

  if (!resp.ok) {
    const detalle = (await resp.text()).slice(0, 300);
    throw new Error(`${que}: el modelo ha contestado ${resp.status} — ${detalle}`);
  }

  // Los trozos llegan como lineas "data: {...}". Se juntan solo los de texto:
  // cuando piensa, lo que piensa viene en otros trozos aparte y aqui no entra.
  let texto = '';
  // POR QUE PARO. Si se queda sin sitio, el JSON llega cortado y lo unico que
  // se veria luego es "la respuesta no es JSON valido", que no dice nada de lo
  // que ha pasado ni de como arreglarlo.
  let porQueParo = '';
  if (!resp.body) throw new Error(`${que}: el modelo ha contestado sin nada dentro`);
  try {
    const lector = resp.body.getReader();
    const aLetras = new TextDecoder();
    let resto = '';
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      resto += aLetras.decode(value, { stream: true });
      const lineas = resto.split('\n');
      resto = lineas.pop();
      for (const linea of lineas) {
        if (!linea.startsWith('data:')) continue;
        const crudo = linea.slice(5).trim();
        if (!crudo || crudo === '[DONE]') continue;
        let trozo;
        try { trozo = JSON.parse(crudo); } catch { continue; }
        if (trozo.type === 'error') {
          throw new Error(`${que}: el modelo ha cortado — ${trozo.error?.message || 'sin detalle'}`);
        }
        if (trozo.type === 'content_block_delta' && trozo.delta?.type === 'text_delta') {
          texto += trozo.delta.text;
        }
        // Y por si el JSON con molde viniera en su propio tipo de trozo en vez
        // de como texto: aqui no se piden herramientas, asi que esto solo puede
        // ser el mismo JSON por otro camino. Si nunca llega, no hace nada.
        if (trozo.type === 'content_block_delta' && trozo.delta?.type === 'input_json_delta') {
          texto += trozo.delta.partial_json || '';
        }
        if (trozo.type === 'message_delta' && trozo.delta?.stop_reason) {
          porQueParo = trozo.delta.stop_reason;
        }
        // LO QUE GASTA, para el cuaderno. La entrada viene al empezar y la
        // salida al terminar, cada una en su trozo.
        if (trozo.type === 'message_start' && trozo.message?.usage) Object.assign(uso, trozo.message.usage);
        if (trozo.type === 'message_delta' && trozo.usage) Object.assign(uso, trozo.usage);
      }
    }
  } catch (err) {
    if (cortado(err)) throw new Error(`${que}: ha tardado más de la cuenta y se ha cortado. Vuelve a intentarlo.`);
    throw err;
  }

  if (porQueParo === 'max_tokens') {
    throw new Error(`${que}: se ha quedado sin sitio y ha salido a medias. Hay que darle más techo.`);
  }
  if (porQueParo === 'refusal') {
    throw new Error(`${que}: el modelo se ha negado a contestar.`);
  }
  if (!texto.trim()) throw new Error(`${que}: el modelo ha devuelto una respuesta vacía`);

  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`${que}: la respuesta no es JSON válido`);
  }
}

// Cuantos le han llegado, para saber si hay con que hacer un plan.
const cuantosDesafios = rasgos => (rasgos?.desafios || [])
  .filter(r => r && String(r.descripcion || '').trim()).length;

// La lista tal y como se le manda, para poder recorrerla por su numero.
const losDesafios = rasgos => (rasgos?.desafios || [])
  .filter(r => r && String(r.descripcion || '').trim());

// ════════════════════════════════════════════════════════════════
// PASO 1: DECIDIR EL PLAN
// ════════════════════════════════════════════════════════════════
//
// De cada cosa que ha quedado saca el titulo y sus cuatro puntos, en corto. No
// escribe ni una linea de lo que va a leer: eso lo hacen las que vienen
// despues.
//
// AQUI NO SE COMPARA NADA, y por eso no hace falta que piense mucho. Lo que
// hace es mirar un desafio y decidir que conducta le manda cambiar, uno por
// uno. Eso es criterio, y el criterio lo pone el modelo -Opus-, no el rato que
// piense. Va a esfuerzo BAJO.
//
// Bajo y no apagado porque aqui se decide lo que tiene que hacer, que es
// por lo que ha pagado, y en eso no se ahorra.
//
// SALE UNA PARTE POR CADA COSA DE LA LISTA. Ni junta ni quita nada.
// Si vuelve con menos partes de las que habia, es que se ha dejado alguna y se
// pide otra vez.
//
// TODO EL DOCUMENTO TIENE QUE ESTAR EN DOS MINUTOS Y MEDIO. Esa es la regla, y
// de ahi salen los numeros de aqui abajo, no al reves.
//
// EL REPARTO, y esta vez cuadra con lo que hace el codigo:
//    90 s para decidir el plan con todo lo que le cuesta.
//    90 s para el segundo intento, que va SIEMPRE con Sonnet. Ese intento no
//        esta para pensar mejor: esta para arreglar algo concreto que se le
//        dice, y Sonnet lo hace en 24 segundos medidos.
//    60 s para escribir, y las partes van todas a la vez, asi que ese es el
//        tope de UNA, no el de la suma.
//
// El peor caso de una peticion es 90 + 90 = 180, por debajo de los 285 que se
// dejan de margen, y solo se da si todo sale mal dos veces seguidas. Lo normal
// son unos 40 segundos para decidir y 40 mas para escribir, que van todas a la
// vez.
const ESPERA_DEL_PLAN_MS = 90000;

// Y EL SEGUNDO INTENTO, MAS CORTO, porque va con Sonnet y Sonnet tarda 24.
const ESPERA_DEL_SEGUNDO_PLAN_MS = 90000;

// SITIO DE SOBRA PARA LA RESPUESTA. Cuando el modelo piensa, lo que piensa sale
// del MISMO techo que lo que escribe, asi que un techo justo no se queda corto
// de texto: se queda corto de sitio para pensar, y entonces la respuesta llega
// cortada a media llave y no hay plan. Con 16000 iba justo para Opus. La
// respuesta de verdad no llega a 4000, asi que esto no gasta de mas: solo
// quita el techo de en medio.
const TECHO_DEL_PLAN = 32000;

// LO QUE AGUANTA LA PETICION, MENOS UN MARGEN PARA CONTESTAR. El servidor corta
// a los 300 segundos, y si corta el, la clienta ve una pagina rota en vez de un
// aviso. Aqui se corta antes y con un mensaje.
const MARGEN_DEL_SERVIDOR_MS = 285000;

// Y POR DEBAJO DE ESTO NO SE VUELVE A PEDIR. Un segundo intento sin tiempo por
// delante no termina: gasta dinero, se corta igual y encima se lleva por
// delante el plan que ya habia, que estaba a medias pero estaba.
//
// 40 segundos, que es lo que tarda Sonnet en decidir uno entero con holgura
// sobre los 24 medidos. El segundo intento va siempre con Sonnet, asi que el
// suelo se mide con Sonnet y no con Opus.
const ESPERA_MINIMA_PARA_REHACER_MS = 40000;

// LO QUE LE QUEDA A ESTA PETICION.
//
// Cada llamada del navegador tiene el tiempo del servidor y nada mas. El
// primer intento puede llevarse casi todo, y entonces el segundo no arranca
// con el tope entero: arranca con lo que sobre. Sin esto, el reintento se
// ponia a pedir un intento entero que ya no cabia y se cortaba en seco,
// perdiendo tambien lo que habia salido bien a la primera.
function loQueQueda(arranque, tope) {
  return Math.min(tope, MARGEN_DEL_SERVIDOR_MS - (Date.now() - arranque));
}

const MOLDE_DEL_PLAN = {
  type: 'object',
  properties: {
    partes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          // DE QUE DESAFIO SALE, y si viene de varios juntados, de cuales. Van
          // por su numero, que es como se le pasan. No se escribe en el
          // documento: sirve para mirar lo que ha elegido antes de gastar las
          // llamadas que escriben.
          deCuales:     { type: 'array', items: { type: 'integer' } },
          tuPrueba:     { type: 'string' },
          queHaces:     { type: 'string' },
          dondeTeCaes:  { type: 'string' },
        },
        required: ['deCuales', ...PUNTOS],
        additionalProperties: false,
      },
    },
  },
  required: ['partes'],
  additionalProperties: false,
};

// El que decide, y el que termina si el primero no puede.
const EL_QUE_DECIDE = 'claude-opus-5';
const EL_QUE_REMATA = 'claude-sonnet-5';

async function pedirElPlan({ nombre, sexo, limpia, recordatorio = '',
                             espera = ESPERA_DEL_PLAN_MS, modelo = EL_QUE_DECIDE }) {
  const encargo = `AQUÍ NO SE DIAGNOSTICA

No le expliques cómo es o por qué, ni de dónde le viene lo que hace, ni le busques la causa, ni le pongas nombre a lo que le pasa. Eso ya lo tiene.

Ahora lo que necesitamos es: que haría su mejor versión, lo que tiene que cambiar y qué hace para conseguirlo con éxito, siendo humana la persona.

Lo que le cuesta no es su defecto, es su prueba: de ahí sale lo que tiene que hacer.

Aquí no se escribe el documento, aquí se decide. Todo en corto, una línea cada cosa.

DE CADA UNO DE LOS QUE HAY ABAJO, ESTO

Sale una parte por cada uno de la lista. De cada uno sacas cuatro cosas, una línea cada una, y ninguna se queda vacía.

deCuales — El número de la lista del que sale esta parte.

tuPrueba — Cuál es la prueba que le pone delante la vida aquí, qué debe cambiar y en quién se convierte cuando lo transforma y lo logra.

queHaces — Qué debe hacer cuando eso pase para poder cambiarlo, solo el paso concreto. Si la acción lleva plazo, puede ser de horas, días o semanas, pero nunca más de un mes.

dondeTeCaes — El autosabotaje que aparecerá cuando intente cambiarlo a mejor, qué puede pasarle cuando le salga el autosabotaje, lo que le impedirá cambiarlo a bien.

LO QUE NO SE PUEDE ESCRIBIR

No te inventes nada de su vida. No sabes si tiene pareja, trabajo, hijos, casa o familia.

Nada que le valga igual a cualquier persona: este producto es de élite.

Nada técnico: ni planetas, ni signos, ni casas, ni nada relacionado con astrología.

Sin palabras técnicas ni metáforas.

Devuelve solo lo decidido.


${limpia.lista}

Quien lo va a leer es ${comoSeLeHabla(sexo)}
Nombre de pila: ${nombre}`;

  const salida = await alModelo({
    que: 'decidir el plan',
    modelo,
    piensa: 'medium',
    techo: TECHO_DEL_PLAN,
    system: encargo,
    mensaje: `Decide su plan entero, siguiendo el esquema.${recordatorio}`,
    molde: MOLDE_DEL_PLAN,
    espera: AbortSignal.timeout(espera),
  });

  // Lo que ha decidido, limpio y en el orden en que lo ha puesto.
  const partes = [];
  for (const p of (Array.isArray(salida.partes) ? salida.partes : [])) {
    // Los numeros que devuelve son los de la lista que se le paso.
    const crudos = (Array.isArray(p?.deCuales) ? p.deCuales : [])
      .map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= limpia.sequedan.length);
    const suyo = {
      // Se traducen a los de la lista original, que es lo que se mira en la
      // pagina para saber de que desafio de verdad sale cada parte.
      deCuales: crudos.map(n => limpia.deCuales[n - 1]).filter(Boolean),
      // EL TITULO ES EL DEL DESAFIO, y lo pone el programa: lo tiene tal cual
      // lo escribio el P1, asi que no hace falta que nadie lo copie.
      titulo: crudos.length ? limpia.titulos[crudos[0] - 1] : '',
      // Y EL AREA, LA DEL MISMO DESAFIO. Tampoco pasa por el modelo: sale del
      // numero que ha devuelto, asi que no puede descuadrarse con lo escrito.
      area: crudos.length ? limpia.areas[crudos[0] - 1] : '',
    };
    for (const punto of PUNTOS) suyo[punto] = String(p?.[punto] || '').trim();
    // UNA PARTE A MEDIAS NO SE ESCRIBE. Si viene con una casilla vacia, quien
    // escribe se encuentra un hueco y lo rellena por su cuenta, y entonces se
    // inventa algo de su vida que no sale de ningun sitio.
    if (!suyo.titulo || PUNTOS.some(punto => !suyo[punto])) continue;
    partes.push(suyo);
  }

  // Y LO QUE HAYA SALIDO MAL, DICHO. Es lo que decide si se pide otra vez y lo
  // que se le recuerda al pedirlo.
  const falla = [];

  // SIN UN MINIMO NO HAY PLAN. No se le pone numero a lo que tiene que salir
  // -eso es lo que traia el relleno- pero con dos partes no hay documento que
  // entregar, y eso solo puede ser que la llamada ha venido mal.
  if (partes.length < 3) falla.push(`solo han salido ${partes.length} partes, y con eso no hay documento`);

  // Y TIENE QUE SALIR UNA POR CADA UNA DE LA LISTA. Aqui no se quita nada: si
  // faltan, es que se ha dejado alguna por el camino y hay que pedirlo otra
  // vez.
  if (partes.length < limpia.sequedan.length) {
    falla.push(`quedaron ${limpia.sequedan.length} cosas que le cuestan y solo han salido ${partes.length} partes: no falta ninguna por escribir`);
  }

  // ── QUE NINGUN TITULO SE REPITA ───────────────────────────
  //
  // Esto si lo puede mirar el codigo: dos titulos iguales son iguales y no hay
  // nada que interpretar.
  const porTitulo = new Map();
  for (const p of partes) {
    const cual = comoSeCompara(p.titulo);
    if (!cual) continue;
    porTitulo.set(cual, (porTitulo.get(cual) || 0) + 1);
  }
  if ([...porTitulo.values()].some(n => n > 1)) falla.push('hay dos partes que van de lo mismo');

  // Y QUE DOS PARTES NO MANDEN HACER LO MISMO no se comprueba aqui: eso es
  // cuestion de lo que significan, no de las letras que llevan, y de eso se
  // encarga el encargo de arriba, que es donde hay que hacerlo bien.

  return { plan: { partes }, falla };
}

// ── LA LISTA CON LA QUE SE HACE EL PLAN ─────────────────────
//
// SON LOS DESAFIOS DEL P1, TAL Y COMO LOS DEJO EL. Aqui no se quita ninguno.
//
// Antes se limpiaban: dos llamadas miraban la lista y tiraban los que les
// parecian repetidos. Sobraban. El P1 ya hace esa limpieza cuando elige sus
// rasgos -de treinta y cinco se queda con veinticinco- y lo que llega aqui
// viene limpio de fabrica. Volver a limpiar lo ya limpio salia caro: en un
// plan de verdad, de quince desafios dejo siete, y entre los que tiro habia
// tres que no repetian nada. El documento se quedaba a medias.
//
// Lo que sale de aqui es lo mismo que salia antes -la lista, los titulos y
// las areas- solo que con todos dentro, para que los pasos siguientes no
// noten el cambio.
function laListaDelP1({ rasgos }) {
  const desafios = losDesafios(rasgos);
  const todos = desafios.map((_, i) => i + 1);

  return {
    sequedan: todos,
    // Cada uno con su titulo, su descripcion y su porque, listo para el paso
    // siguiente.
    lista: desafios.map((r, i) => {
      return `${i + 1}. ${String(r.nombre || '').trim()}\n   ${String(r.descripcion).trim()}` +
        (r.causa ? `\n   PORQUE: ${String(r.causa).trim()}` : '');
    }).join('\n\n'),
    // El titulo de cada uno, en el mismo orden que la lista de arriba.
    titulos: desafios.map(r => String(r.nombre || '').trim()),
    // Y su area, la que le puso el P1. Va pegada al desafio desde alli, asi
    // que no la elige nadie aqui: solo se arrastra hasta la cabecera del PDF.
    areas: desafios.map(r => String(r.area || '').trim()),
    // Con su descripcion, para poder mirarlos en la pagina.
    quedados: desafios.map((r, i) => ({
      numero: i + 1,
      descripcion: String(r.descripcion || '').trim(),
    })),
    // De que numero de la lista original sale cada uno, para poder mirarlo.
    deCuales: todos,
  };
}

async function decidirElPlan({ nombre, sexo, limpia }) {
  const arranque = Date.now();

  // ── 2. Y CON LAS QUE QUEDAN SE DECIDE EL PLAN ─────────────
  //
  // Y si Opus no puede -se pasa de tiempo, se queda sin sitio, el modelo
  // contesta 500-, NO se cae la peticion: termina Sonnet con lo que quede.
  // Quedarse sin esta llamada es quedarse sin documento, y eso no puede pasar
  // por elegir el modelo bueno.
  let primero;
  try {
    primero = await pedirElPlan({ nombre, sexo, limpia, modelo: EL_QUE_DECIDE });
  } catch (err) {
    const queda = loQueQueda(arranque, ESPERA_DEL_SEGUNDO_PLAN_MS);
    if (queda < ESPERA_MINIMA_PARA_REHACER_MS) throw err;
    console.warn(`[p2] ${EL_QUE_DECIDE} no ha podido decidir el plan (${err.message}), lo termina ${EL_QUE_REMATA}`);
    primero = await pedirElPlan({ nombre, sexo, limpia, modelo: EL_QUE_REMATA, espera: queda });
  }

  if (!primero.falla.length) return { ...primero.plan, limpieza: limpia };

  // ── 3. Y SI HA VENIDO A MEDIAS, SE PIDE OTRA VEZ ──────────
  const queda = loQueQueda(arranque, ESPERA_DEL_SEGUNDO_PLAN_MS);
  if (queda < ESPERA_MINIMA_PARA_REHACER_MS) {
    console.warn(`[p2] el plan ha venido a medias (${primero.falla.join('; ')}), pero ya no queda tiempo para rehacerlo`);
    return { ...primero.plan, limpieza: limpia };
  }

  console.warn(`[p2] el plan ha venido a medias (${primero.falla.join('; ')}), se pide otra vez`);
  let segundo;
  try {
    segundo = await pedirElPlan({
      nombre, sexo, limpia,
      modelo: EL_QUE_REMATA,
      espera: queda,
    });
  } catch (err) {
    // El segundo intento es una mejora, no un requisito: si se cae, se entrega
    // el primero, que estaba a medias pero estaba.
    console.warn(`[p2] el segundo intento del plan se ha caido (${err.message}), se entrega el primero`);
    return { ...primero.plan, limpieza: limpia };
  }

  // Y SE QUEDA EL MEJOR DE LOS DOS. Pedir otra vez no garantiza que salga
  // mejor: el segundo puede venir peor que el primero.
  if (segundo.falla.length < primero.falla.length) return { ...segundo.plan, limpieza: limpia };
  console.warn('[p2] el segundo plan no ha mejorado, se entrega el primero');
  return { ...primero.plan, limpieza: limpia };
}

function sinTildes(txt) {
  return String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Dos textos son el mismo aunque cambien las mayusculas, las tildes o la
// puntuacion. Comparar dos cadenas a pelo no es criterio.
const comoSeCompara = txt =>
  sinTildes(txt).replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();

// ── Y QUE NINGUNA CASILLA TRAIGA UN HUECO EN VEZ DE TEXTO ───
//
// En el primer plan de verdad, tres casillas llegaron con la palabra
// "placeholder" dentro y se imprimieron asi en el PDF. El modelo hace esto
// cuando se queda sin hilo a mitad: cierra el molde rellenando lo que le falta
// con una palabra cualquiera, y el molde queda valido, asi que nada se queja.
//
// Se busca solo lo que NADIE escribiria en un documento que se le entrega a
// una persona. Nada de palabras corrientes: una sola de esas aqui dentro haria
// tirar textos buenos.
const MARCAS_DE_RELLENO = [
  /^\s*(placeholder|lorem ipsum|texto de ejemplo|pendiente|por completar|por escribir|sin contenido|n\/?a|tbd|todo)\b/i,
  /\bplaceholder\b/i,
  /\blorem ipsum\b/i,
  /^\s*[.\-–—_]+\s*$/,
  /^\s*\[[^\]]*\]\s*$/,
];
const esRelleno = txt => MARCAS_DE_RELLENO.some(re => re.test(String(txt || '')));

// Y QUE NINGUN TEXTO ACABE A MEDIA FRASE. Se mira al reves de pedir el punto:
// solo lo que no puede cerrar una frase nunca -una letra, un numero, una coma,
// dos puntos, o algo que se acaba de abrir-. Los guiones no entran: un inciso
// puede cerrarse con su guion al final y eso es un final bueno.
const acabaColgado = txt => /[\p{L}\p{N},;:«¿¡([“‘]$/u.test(String(txt || '').trim());

// "tope" es lo que se le da al primer intento, y va sin valor por defecto a
// proposito: quien llame tiene que decirlo. Un defecto de cero apagaria el
// reloj sin avisar y el reintento se saldria del tiempo del servidor.
async function otraVezSiVieneRota({ que, pedir, cojo = () => false, aviso = '', tope }) {
  const arranque = Date.now();
  const primera = await pedir('', tope);
  if (!cojo(primera)) return primera;

  // Y SOLO SE PIDE OTRA VEZ SI CABE. Si del tiempo del servidor no queda ni
  // para la mitad de un intento, no se pide: se entrega lo que hay, que es
  // mejor que quedarse sin nada por haberlo intentado.
  const queda = loQueQueda(arranque, tope);
  if (queda < tope / 2) {
    console.warn(`[p2] ${que}: ha venido a medias, pero ya no queda tiempo para pedirlo otra vez`);
    return primera;
  }

  console.warn(`[p2] ${que}: ha venido a medias, se pide otra vez`);
  const elAviso = typeof aviso === 'function' ? aviso(primera) : aviso;
  const segunda = await pedir(elAviso, queda);
  if (!cojo(segunda)) return segunda;
  console.warn(`[p2] ${que}: la segunda no ha mejorado, se entrega la primera`);
  return primera;
}

// ════════════════════════════════════════════════════════════════
// PASO 2: ESCRIBIR LO QUE YA ESTA DECIDIDO
// ════════════════════════════════════════════════════════════════
//
// Estas llamadas NO deciden nada: reciben lo que salio del paso anterior y lo
// convierten en el texto que va a leer quien lo compro.
//
// Y NO PIENSAN. Aqui no hay nada que decidir ni que comparar: las tres cosas
// vienen decididas y lo unico que se hace es abrirlas hasta que se entiendan.
//
// CADA UNA VE SOLO SU PARTE. No hace falta que vea las demas: el paso que
// piensa ya se encargo de que no se repitan.

// 90 SEGUNDOS PARA CADA INTENTO. Las partes van todas a la vez, asi que este
// tope es el de UNA, no el de la suma. Y solo se gasta si de verdad tarda.
const ESPERA_DE_ESCRIBIR_MS = 90000;
const TECHO_DE_ESCRIBIR = 12000;

const MOLDE_DE_LA_PARTE = {
  type: 'object',
  properties: {
    titulo:       { type: 'string' },
    tuPrueba:     { type: 'string' },
    queHaces:     { type: 'string' },
    dondeTeCaes:  { type: 'string' },
  },
  required: PUNTOS,
  additionalProperties: false,
};

// QUIEN ESCRIBE NO DECIDE NADA.
//
// Recibe el titulo de su desafio y las tres lineas de SU parte, y nada mas.
// Su trabajo es explicar y ampliar hasta que se entienda a la primera.
async function escribirLaParte({ parte, nombre, sexo, puedeElNombre }) {
  const encargo = `${REGLAS_COMUNES}


AQUÍ NO SE DIAGNOSTICA

No le expliques cómo es o por qué, ni de dónde le viene lo que hace, ni le busques la causa, ni le pongas nombre a lo que le pasa. Eso ya lo tiene.

Ahora lo que necesitamos es: que haría su mejor versión, lo que tiene que cambiar y qué hace para conseguirlo con éxito, siendo humana la persona.

Lo que le cuesta no es su defecto, es su prueba: de ahí sale lo que tiene que hacer.

LO QUE TE TOCA AHORA

EL TÍTULO DE ESTA PARTE ES: ${parte.titulo}

Va tal cual, sin cambiarlo ni una palabra. Lo devuelves en la casilla "titulo".

TE DAN TRES LÍNEAS YA DECIDIDAS Y ESCRIBES LAS TRES, cada una por su lado. No eliges tú lo que va: eso ya está decidido con todo su plan delante. Lo tuyo es que el humano lo entienda a la primera al leer y de manera fácil, y que le sirva al humano, que le aporte valor.

NO DECIDES, EXPLICAS. Coges la línea que te dan y la abres: qué es exactamente, cómo se hace, por qué así y no de otra manera, y qué pasa cuando lo hace. Todo lo que escribas tiene que poder rastrearse a la línea que te han dado. Si te falta un dato, no te lo inventas: cuentas mejor lo que ya está.

Y NO TE SALGAS DE LO TUYO. Las otras partes del documento las escribe otro y no las ves. Lo tuyo es esto y nada más.

CADA UNA DE LAS TRES ES SU PROPIO TEXTO, seguido, en párrafos, sin títulos dentro y sin anunciar lo que viene. Los nombres los pone el programa. Y no se repiten entre ellas: lo que ya has dicho en una no vuelve en la siguiente.

LAS TRES, Y LO QUE VA EN CADA UNA:

"tuPrueba"

Cuál es la prueba que le pone delante la vida aquí, qué debe cambiar y en quién se convierte cuando lo transforma y lo logra.

Se abre siempre con una frase que le explique de qué se trata: la situación concreta que le pasa a quien lee, para que al leerla se reconozca enseguida, nunca por la idea. Y se cuenta como lo que tiene delante y le toca aprender, no como algo propio que está mal. Sin anunciarlo: nada de abrir diciéndole que esto es una prueba que la vida le pone, que suena a libro. Que sea una prueba se nota en cómo está contado.

Y la segunda mitad es lo que gana: su vida ahí con eso ya cambiado, en concreto y en presente, con lo que va a estar pasando y no con lo que va a sentir.

Esa parte no se anuncia. Se entra por lo que hace o por lo que deja de hacer, no con una fórmula que avise de que ahora viene lo que gana. Unas 80 palabras para hacerte una idea del tamaño.

"queHaces"

Qué debe hacer cuando eso pase para poder cambiarlo, solo el paso concreto.

Cabe explicarla entera: qué hace exactamente, cómo se hace. Tan claro que lo pueda hacer mañana sin preguntarle a nadie. No le añadas otras cosas que hacer: la que te dan y nada más, contada hasta el final. Unas 60 palabras para hacerte una idea del tamaño.

"dondeTeCaes"

El autosabotaje que aparecerá cuando intente cambiarlo a mejor, qué puede pasarle cuando le salga el autosabotaje, lo que le impedirá cambiarlo a bien. Lo que va a aparecer para frenarle o lo que va a hacer mal creyendo que así va más deprisa. Y que eso llega siempre, y que verlo aparecer no es ir mal.

Eso tampoco se cierra con una fórmula. Lo dices con tus palabras, y de otra manera cada vez. Unas 60 palabras para hacerte una idea del tamaño.

LAS CIFRAS DE ARRIBA SON UNA GUÍA, no un límite. Cuanto más corto, mejor, pero debe estar bien explicado, debe entenderse bien. Y nunca cortes una frase por la mitad para que quepa: si no cabe, quitas algo entero y cierras.

LOS PÁRRAFOS SE SEPARAN CON UNA LÍNEA EN BLANCO. Es lo único de maqueta que haces tú, y hace falta: sin esa línea todo sale pegado en un bloque y no hay quien lo lea en un móvil.

LO QUE NO SE PUEDE ESCRIBIR

No te inventes nada de su vida. No sabes si tiene pareja, trabajo, hijos, casa o familia.

Nada que le valga igual a cualquier persona: este producto es de élite.

Nada técnico: ni planetas, ni signos, ni casas, ni nada relacionado con astrología.

Sin palabras técnicas ni metáforas.

LO QUE SE HA DECIDIDO PARA ESTA PARTE:

${PUNTOS.map(punto => `"${punto}"\n${parte[punto]}`).join('\n\n')}

Quien lo va a leer es ${comoSeLeHabla(sexo)}
Nombre de pila: ${nombre}
${REGLA_DEL_NOMBRE(puedeElNombre)}`;

  const salida = await otraVezSiVieneRota({
    que: `la parte "${parte.titulo}"`,
    // Lo que se mira: que ninguna de las tres venga con una palabra de relleno
    // en vez de texto, y que ninguna se quede a media frase.
    cojo: p => PUNTOS.some(punto => esRelleno(p[punto]) || acabaColgado(p[punto])),
    aviso: p => !PUNTOS.some(punto => esRelleno(p[punto])) && PUNTOS.some(punto => acabaColgado(p[punto]))
      ? `\n\nY OJO: la vez anterior algo se quedó a media frase (${PUNTOS.filter(punto => acabaColgado(p[punto])).map(x => BLOQUES[x]).join(', ')}). Se termina lo que se empieza: cada uno de los tres acaba su última frase, con su punto.`
      : `\n\nY OJO: la vez anterior dejaste una casilla con una palabra de relleno dentro (${PUNTOS.filter(punto => esRelleno(p[punto])).map(x => BLOQUES[x]).join(', ')}) en vez de escribirla. Esto lo lee una persona que ha pagado por ello: las tres se escriben, y si te has quedado sin hilo, se vuelve a empezar esa.`,
    tope: ESPERA_DE_ESCRIBIR_MS,
    pedir: (recordatorio, cuanto) => alModelo({
      que: `escribir "${parte.titulo}"`,
      modelo: EL_QUE_REMATA,
      piensa: '',
      techo: TECHO_DE_ESCRIBIR,
      system: encargo,
      mensaje: `Escribe las tres partes de esta, enteras.${recordatorio}`,
      molde: MOLDE_DE_LA_PARTE,
      espera: AbortSignal.timeout(cuanto),
    }),
  });

  // EL AREA VIAJA CON LO ESCRITO. La pone el programa y va pegada al desafio
  // desde el P1; si no se devuelve aqui, se pierde al escribir y la cabecera
  // del PDF sale sin ella.
  const escrita = { titulo: parte.titulo, area: parte.area };
  for (const punto of PUNTOS) escrita[punto] = String(salida[punto] || '').trim();

  // ── UNA PARTE ROTA NO SE ENTREGA, PERO ROTA ES ROTA ───────
  //
  // Esto existe porque tres partes de un plan real salieron con la palabra
  // "placeholder" dentro y se imprimieron asi en el PDF de una clienta. Eso no
  // puede pasar.
  //
  // PERO SE PASO DE FRENO Y COSTO UN DOCUMENTO ENTERO. Estaba tirando tambien
  // las que acababan sin punto o las que venian algo cortas, y eso no es una
  // parte que falta: es una parte mejorable. Cada una de esas se volvia a pedir
  // hasta tres veces, y en un plan de verdad se cayeron tres partes, se
  // pidieron nueve veces mas, ninguna paso, y la clienta se quedo SIN PDF
  // despues de cuatro minutos y un euro.
  //
  // Quedarse sin documento es peor que tener una frase sin punto. Asi que ahora
  // solo se tira lo que de verdad no es texto: una casilla vacia o con una
  // palabra de relleno haciendo bulto. Todo lo demas se entrega, que para eso
  // ya se ha pedido dos veces ahi arriba.
  const roto = [];
  for (const punto of PUNTOS) {
    const txt = escrita[punto];
    if (!txt) roto.push(`"${BLOQUES[punto]}" viene vacio`);
    else if (esRelleno(txt)) roto.push(`"${BLOQUES[punto]}" trae texto de relleno en vez de contenido`);
  }
  if (roto.length) throw new Error(`la parte "${parte.titulo}" ha salido rota: ${roto.join('; ')}`);

  return escrita;
}


// ════════════════════════════════════════════════════════════════
// TU NUEVA PROGRAMACION: LAS CREENCIAS
// ════════════════════════════════════════════════════════════════
//
// EL OTRO TEMA DEL DOCUMENTO, Y VA POR SU LADO. Las pruebas dicen lo que tiene
// que hacer; esto dice lo que se cree, que es lo que hace que no lo haga. Son
// dos cosas distintas y no se mezclan en ninguna llamada: en las pruebas no se
// habla de lo que cree, y aqui no se le manda hacer nada.
//
// SALE DE LOS MISMOS DESAFIOS, asi que arranca en cuanto se lee el informe
// y va A LA VEZ que las pruebas: ninguna de las dos espera a la otra.
//
// CUATRO PASOS, igual que en las pruebas y por lo mismo: cada llamada hace UNA
// cosa.
//   A. SACA las creencias que hay debajo de los desafios. No filtra.
//   B. LIMPIA Y PUNTUA, y solo devuelve numeros: fuera las repetidas y las que
//      se contradicen, y a las que quedan les pone cuanto le mandan.
//   C. REPASA lo que quedo. Si se cae, no pasa nada: se sigue con lo de B.
//   D. ESCRIBE cada una, todas a la vez, y cada una ve solo la suya.

// LOS DOS NOMBRES QUE VE DENTRO DE CADA CREENCIA, por lo mismo que los de las
// pruebas: sin ellos quien lee no sabe de que le habla cada trozo.
const BLOQUES_DE_CREENCIA = {
  loQueCreesHoy: 'Lo que crees hoy',
  loQueEsVerdad: 'Lo que es verdad',
};
const PUNTOS_DE_CREENCIA = Object.keys(BLOQUES_DE_CREENCIA);

// Los mismos numeros que en las pruebas, y por las mismas razones: el techo es
// holgado porque pensar sale del mismo sitio que escribir, y la espera deja
// sitio para un segundo intento dentro del tiempo del servidor.
const ESPERA_DE_CREENCIAS_MS = 90000;
const TECHO_DE_CREENCIAS = 32000;

// EL TITULO DE UNA CREENCIA, LA MISMA MEDIDA QUE EN EL P1. Alli los titulos de
// los rasgos van de cuatro a siete palabras, y estos se leen al lado de
// aquellos: si aqui salieran de dos lineas, el documento no se veria del mismo
// sitio.
const PALABRAS_DEL_TITULO = { min: 4, max: 7 };

const cuantasPalabras = txt => String(txt || '').trim().split(/\s+/).filter(Boolean).length;

// ── A. SACAR LAS CREENCIAS ──────────────────────────────────

const MOLDE_DE_SACAR_CREENCIAS = {
  type: 'object',
  properties: {
    creencias: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          // De que desafios de la lista sale, por sus numeros.
          deCuales: { type: 'array', items: { type: 'integer' } },
          titulo: { type: 'string' },
          linea:  { type: 'string' },
        },
        required: ['deCuales', 'titulo', 'linea'],
        additionalProperties: false,
      },
    },
  },
  required: ['creencias'],
  additionalProperties: false,
};

// LAS PALABRAS QUE NO DICEN NADA NO CUENTAN PARA COMPARAR DOS FRASES: que dos
// lleven "de" o "que" no las hace parecidas.
const PALABRAS_VACIAS = new Set(['a', 'al', 'algo', 'ante', 'antes', 'aunque', 'como', 'con', 'contra',
  'cuando', 'cuanto', 'de', 'del', 'desde', 'donde', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre',
  'era', 'eran', 'eres', 'es', 'esa', 'esas', 'ese', 'eso', 'esos', 'esta', 'estan', 'estar', 'estas',
  'este', 'esto', 'estos', 'ha', 'han', 'hasta', 'hay', 'la', 'las', 'le', 'les', 'lo', 'los', 'mas',
  'me', 'mi', 'mis', 'mucho', 'muy', 'nada', 'ni', 'no', 'o', 'otra', 'otras', 'otro', 'otros', 'para',
  'pero', 'poco', 'por', 'porque', 'que', 'quien', 'se', 'ser', 'si', 'sin', 'sobre', 'solo', 'son',
  'su', 'sus', 'tan', 'te', 'ti', 'tu', 'tus', 'un', 'una', 'uno', 'unos', 'y', 'ya', 'yo']);

const conQuePalabras = txt =>
  new Set(comoSeCompara(txt).split(' ').filter(p => p && !PALABRAS_VACIAS.has(p)));

// Y DOS PALABRAS SON LA MISMA AUNQUE CAMBIE EL FINAL. Los desafios estan
// escritos hablandole de tu y las creencias en primera persona, asi que la
// misma palabra sale con otra terminacion: comparandolas enteras, la creencia
// que copia su desafio pasaria por buena. Se comparan por el principio.
const LA_MISMA_RAIZ = 4;

function esLaMismaPalabra(una, otra) {
  if (una === otra) return true;
  const corta = una.length < otra.length ? una : otra;
  const larga = una.length < otra.length ? otra : una;
  if (corta.length >= 3 && larga.startsWith(corta)) return true;
  return corta.length >= LA_MISMA_RAIZ && larga.slice(0, LA_MISMA_RAIZ) === corta.slice(0, LA_MISMA_RAIZ);
}

// UNA CREENCIA QUE REPITE LAS PALABRAS DE SU DESAFIO ES ESE DESAFIO OTRA VEZ.
// Se miran solo las palabras con contenido, y hace falta que se repita la
// mitad de lo que dice la creencia: dos frases distintas coinciden en alguna
// palabra suelta sin decir lo mismo, y por eso una sola no la marca.
//
// Y ESTO NO TIRA NINGUNA CREENCIA: cuenta como hueco, que es pedirla otra vez.
const REPITE_A_SU_DESAFIO = 0.5;

function copiaElDesafio(titulo, suyos) {
  const dela = conQuePalabras(titulo);
  if (!dela.size) return false;
  return suyos.some(otro => {
    const otras = [...conQuePalabras(otro)];
    let iguales = 0;
    for (const palabra of dela) if (otras.some(suya => esLaMismaPalabra(palabra, suya))) iguales++;
    return iguales / dela.size >= REPITE_A_SU_DESAFIO;
  });
}

// AQUI NO SE FILTRA NADA. Salen todas las que haya, aunque dos digan lo mismo:
// juntarlas y quitarlas es el trabajo de la siguiente, y pedirle las dos cosas
// a la vez es lo que ya se aprendio caro en las pruebas.
async function sacarLasCreencias({ lista, titulos, cuantos, sexo, piensa, espera = ESPERA_DE_CREENCIAS_MS,
                                   modelo = EL_QUE_DECIDE, recordatorio = '' }) {
  const encargo = `Abajo tienes los desafíos interiores de una persona. Cada uno lleva su número, lo que le pasa y por qué le pasa.

QUÉ TIENES QUE SACAR

Una creencia es una frase que esa persona da por verdad sin saber que se la cree, sobre sí misma, sobre los demás o sobre cómo funciona la vida. No cuenta lo que hace: es lo que tiene debajo y hace que lo haga.

NO SACAS UNA POR DESAFÍO. Lees los desafíos todos juntos y buscas lo que está debajo de VARIOS A LA VEZ: la misma frase que explica dos, tres o cuatro de ellos aunque por fuera no se parezcan entre sí. Eso es una creencia suya.

Si algo solo explica un desafío y ninguno más, no es una creencia: es ese desafío otra vez dicho de otra manera. No lo escribas.

Sacas TODAS las que haya, y no hay un número que tenga que salir. Aquí no se filtra, no se junta y no se quita nada de lo que se repita entre ellas: eso se hace después.

LO QUE DEVUELVES DE CADA UNA

"deCuales" — los números de los desafíos que esa creencia explica, dos como mínimo. Solo los que de verdad se sostienen con ella: no engordes la lista.

"titulo" — la creencia dicha en corto, de ${PALABRAS_DEL_TITULO.min} a ${PALABRAS_DEL_TITULO.max} palabras, en primera persona y tal como se la dice por dentro. Empieza en mayúscula y sin punto al final. No es una etiqueta ni el nombre de un concepto: es la frase que se cree.

Y no la digas con las palabras de sus desafíos. Si el título se parece al de un desafío, es que has copiado el desafío en vez de sacar lo que tiene debajo.

"linea" — UNA línea: qué es lo que cree exactamente y cómo funciona por dentro.

LO QUE NO SE PUEDE ESCRIBIR

No te inventes nada de su vida. No sabes si tiene pareja, trabajo, hijos, casa o familia.

Esto lo trae de nacimiento: no lo aprendió, no se lo enseñó nadie y no le viene de su infancia ni de su familia.

Nada técnico: ni planetas, ni signos, ni casas, ni nada relacionado con astrología.

Sin metáforas y sin palabras de manual: las de todos los días, las que se dicen hablando.

Español de España, con todas sus tildes y todas sus eñes.

LOS DESAFÍOS:

${lista}

Quien lo va a leer es ${comoSeLeHabla(sexo)}`;

  const salida = await alModelo({
    que: 'sacar las creencias',
    modelo,
    piensa,
    techo: TECHO_DE_CREENCIAS,
    system: encargo,
    mensaje: `Saca todas sus creencias, siguiendo el esquema.${recordatorio}`,
    molde: MOLDE_DE_SACAR_CREENCIAS,
    espera: AbortSignal.timeout(espera),
  });

  // Solo lo que viene entero y apunta a desafios que existen. Una creencia sin
  // su linea o sin sus numeros no se puede escribir ni colocar, asi que no entra.
  const losTitulos = Array.isArray(titulos) ? titulos : [];
  const creencias = [];
  let huecos = 0;
  for (const c of (Array.isArray(salida.creencias) ? salida.creencias : [])) {
    const deCuales = [...new Set((Array.isArray(c?.deCuales) ? c.deCuales : [])
      .map(Number)
      .filter(n => Number.isInteger(n) && n >= 1 && n <= cuantos))]
      .sort((a, b) => a - b);
    const titulo = String(c?.titulo || '').trim();
    const linea = String(c?.linea || '').trim();
    if (!deCuales.length || !titulo || !linea || esRelleno(titulo) || esRelleno(linea)) {
      huecos++;
      continue;
    }
    // UN TITULO FUERA DE MEDIDA CUENTA COMO HUECO, PERO NO SE TIRA. Es un
    // titulo largo, no una creencia que falte: si se tirara, se le quitaria a
    // quien lo lee algo suyo por una cuestion de tamano.
    const palabras = cuantasPalabras(titulo);
    if (palabras < PALABRAS_DEL_TITULO.min || palabras > PALABRAS_DEL_TITULO.max) huecos++;
    // Y LO MISMO LA QUE SE APOYA EN UN SOLO DESAFIO O LA QUE LO REPITE CON SUS
    // PALABRAS: cuentan como hueco para que se vuelva a pedir, pero no se
    // tiran aqui. Quitarlas es el paso siguiente, y alli se hace con todas a
    // la vista.
    if (deCuales.length < 2) huecos++;
    else if (copiaElDesafio(titulo, deCuales.map(n => losTitulos[n - 1] || ''))) huecos++;
    creencias.push({ deCuales, titulo, linea });
  }

  return { creencias, huecos };
}

// ── B. LIMPIAR Y PUNTUAR ────────────────────────────────────

// COMO SE PUNTUA, QUE ES COMO PUNTUA EL P1: no se pide una nota a ojo, se
// piden cuatro notas con su criterio escrito, y la suma la hace el codigo.
//
// Antes aqui se pedia "del 1 al 10 segun cuanto le manda". Diez niveles y una
// frase para explicarlos no los distingue nadie, ni un humano, y lo que salia
// eran casi todo sietes. El P1 lo tiene resuelto desde el principio: pocos
// niveles, cada uno con lo que significa, y el que puntua no elige.
const CRITERIOS_DE_LA_CREENCIA = ['cuanto', 'cuando', 'donde', 'duele'];

const MOLDE_DE_PUNTUAR_CREENCIAS = {
  type: 'object',
  properties: {
    sequedan: { type: 'array', items: { type: 'integer' } },
    sequitan: { type: 'array', items: { type: 'integer' } },
    puntos: {
      type: 'array',
      items: {
        type: 'object',
        properties: Object.fromEntries([
          ['numero', { type: 'integer' }],
          ...CRITERIOS_DE_LA_CREENCIA.map(c => [c, { type: 'integer' }]),
        ]),
        required: ['numero', ...CRITERIOS_DE_LA_CREENCIA],
        additionalProperties: false,
      },
    },
  },
  required: ['sequedan', 'sequitan', 'puntos'],
  additionalProperties: false,
};

// AQUI SOLO VE LAS CREENCIAS, numeradas, y nada mas: ni los desafios de los
// que salieron, ni quien las lee, ni que es este producto. Su trabajo es mirar
// una lista y decir cuales sobran, y para eso no le hace falta nada de eso.
//
// Y DEVUELVE NUMEROS. Lo mismo que en la limpieza de las pruebas: escribiendo
// cifras, todo el esfuerzo se le va en comparar, que es lo unico que hace.
async function limpiarLasCreencias({ creencias, piensa, espera = ESPERA_DE_CREENCIAS_MS,
                                     modelo = EL_QUE_DECIDE, recordatorio = '' }) {
  const encargo = `Abajo tienes las creencias de una persona, enumeradas. Cada una lleva la frase que se cree y una línea que dice qué es y de dónde le viene.

QUÉ SE QUITA

Las que digan prácticamente lo mismo, aunque estén escritas con otras palabras: se queda solo UNA, la que más pese.

Y las que se contradigan entre sí: se queda solo UNA, la que más pese.

Pesa más la que sea más concreta y más central para esa persona, no la más genérica.

LA PUNTUACIÓN

A cada una de las que se quedan le pones CUATRO notas, del 1 al 5, siempre número entero. 1 es lo más bajo y 5 lo más alto. Usa el 1 y usa el 5 cuando toque: si todo lo puntúas con un 3 o un 4, la nota no distingue nada y no sirve.

Tú mides, no eliges: cuánto pesa cada una lo decide después una suma, no tú.

"cuanto" — CUÁNTO LE CUESTA CREER ESO. 5 es que le quita algo que se puede contar y que es mucho: horas de su vida, dinero, salud, la gente que tiene cerca, su calma. 3 es que le quita algo que se puede contar pero es poco. 1 es que no le quita nada que se pueda nombrar.

"cuando" — CADA CUÁNTO LE MANDA. 5 es casi todos los días, sin que haga falta que pase nada especial. 3 es algunas veces al mes, o cuando se dan ciertas situaciones. 1 es muy de tarde en tarde.

"donde" — EN CUÁNTAS PARTES DE SU VIDA SE LE NOTA. 5 es en casi todo lo que hace, con quien sea y donde sea. 3 es en dos o tres partes suyas, y en el resto no. 1 es en una sola esquina de su vida.

"duele" — CUÁNTO LE VA A COSTAR RECONOCER QUE SE LO CREE. 5 es algo que no ha mirado nunca de frente, o que se cuenta al revés y cree que es una virtud. 3 es algo que sospecha de sí pero no ha llamado por su nombre. 1 es algo que ya sabe.

Ninguna de las cuatro vale más que las otras. Se suman igual.

LO QUE NO PUNTÚAS

Que suene bien o que esté mejor escrita. Eso no es una nota, es un gusto. Y no puntúas más alto lo que esté escrito con más palabras. Lo grave tampoco es lo mismo que lo pesado: algo que suena dramático y le pasa una vez al año saca nota baja en "cuando".

LO QUE DEVUELVES

"sequedan": los números de las que se quedan, en el orden de abajo.
"sequitan": los números de las que quitas.
"puntos": una entrada por CADA una de las que se quedan, con su número y sus cuatro notas.

Cada número tiene que quedar en una sola de las 2 listas, nunca en las 2. Todos los números tienen que aparecer en "sequedan" o en "sequitan", ninguno se queda fuera y ninguno se repite en las dos.

LAS CREENCIAS:

${creencias.map((c, i) => `${i + 1}. ${c.titulo}\n   ${c.linea}`).join('\n\n')}`;

  const salida = await alModelo({
    que: 'limpiar y puntuar las creencias',
    modelo,
    piensa,
    techo: TECHO_DE_CREENCIAS,
    system: encargo,
    mensaje: `Di cuáles se quedan, cuáles se quitan y cuánto pesa cada una, siguiendo el esquema.${recordatorio}`,
    molde: MOLDE_DE_PUNTUAR_CREENCIAS,
    espera: AbortSignal.timeout(espera),
  });

  const validos = new Set(creencias.map((_, i) => i + 1));
  const sequedan = [...new Set((Array.isArray(salida.sequedan) ? salida.sequedan : [])
    .map(Number).filter(n => validos.has(n)))].sort((a, b) => a - b);
  const sequitan = [...new Set((Array.isArray(salida.sequitan) ? salida.sequitan : [])
    .map(Number).filter(n => validos.has(n) && !sequedan.includes(n)))].sort((a, b) => a - b);

  // LA SUMA LA HACE EL CODIGO, no el modelo: el pone las cuatro notas y aqui
  // se suman. Una nota que no sea un entero del 1 al 5 no vale, y esa creencia
  // se queda sin puntuar -que cuenta como hueco y se pide otra vez-.
  const puntuacion = new Map();
  for (const p of (Array.isArray(salida.puntos) ? salida.puntos : [])) {
    const n = Number(p?.numero);
    if (!validos.has(n)) continue;
    const notas = CRITERIOS_DE_LA_CREENCIA.map(c => Number(p?.[c]));
    if (notas.some(x => !Number.isInteger(x) || x < 1 || x > 5)) continue;
    puntuacion.set(n, notas.reduce((a, b) => a + b, 0));
  }

  // LO QUE SE HA DEJADO SIN DECIR ES UN HUECO, y por eso se pide otra vez: una
  // creencia que no esta ni en una lista ni en la otra es un descuido suyo.
  const olvidadas = [...validos].filter(n => !sequedan.includes(n) && !sequitan.includes(n));
  const sinPuntuar = sequedan.filter(n => !puntuacion.has(n));

  return {
    sequedan, sequitan, puntuacion,
    olvidadas,
    huecos: olvidadas.length + sinPuntuar.length,
  };
}

// EL MOLDE DE QUIEN DICE CUALES SE QUEDAN Y CUALES SE VAN.
const MOLDE_DE_LIMPIAR = {
  type: 'object',
  properties: {
    sequedan: { type: 'array', items: { type: 'integer' } },
    sequitan: { type: 'array', items: { type: 'integer' } },
  },
  required: ['sequedan', 'sequitan'],
  additionalProperties: false,
};

// ── C. REPASAR LO QUE HA QUEDADO ────────────────────────────
//
// Con las que quedaron, otra vez lo mismo. NO VE LAS QUE SE TIRARON: le llegan
// renumeradas de uno en adelante, asi que no puede recuperar ninguna.
//
// ES UNA MEJORA, NO UN REQUISITO: si se cae, se sigue con lo que dejo la B.
async function repasarLasCreencias({ creencias, espera }) {
  const encargo = `Abajo tienes las creencias de una persona, enumeradas. Ya se han limpiado una vez; esto es el repaso.

QUÉ SE QUITA

Las que digan prácticamente lo mismo, aunque estén escritas con otras palabras: se queda solo UNA, la que más pese.

Y las que se contradigan entre sí: se queda solo UNA, la que más pese.

Pesa más la que sea más concreta y más central para esa persona, no la más genérica.

Si no hay nada que quitar, no quitas nada: todas a "sequedan".

LO QUE DEVUELVES

"sequedan": los números de las que se quedan, en el orden de abajo.
"sequitan": los números de las que quitas.

Cada número tiene que quedar en una sola de las 2 listas, nunca en las 2. Todos los números tienen que aparecer en "sequedan" o en "sequitan", ninguno se queda fuera y ninguno se repite en las dos.

LAS CREENCIAS:

${creencias.map((c, i) => `${i + 1}. ${c.titulo}\n   ${c.linea}`).join('\n\n')}`;

  const salida = await alModelo({
    que: 'repasar las creencias',
    modelo: EL_QUE_REMATA,
    piensa: 'medium',
    techo: TECHO_DE_CREENCIAS,
    system: encargo,
    mensaje: 'Di cuáles se quedan y cuáles se quitan, siguiendo el esquema.',
    molde: MOLDE_DE_LIMPIAR,
    espera: AbortSignal.timeout(espera),
  });

  const validos = new Set(creencias.map((_, i) => i + 1));
  const sequedan = [...new Set((Array.isArray(salida.sequedan) ? salida.sequedan : [])
    .map(Number).filter(n => validos.has(n)))].sort((a, b) => a - b);
  const sequitan = [...new Set((Array.isArray(salida.sequitan) ? salida.sequitan : [])
    .map(Number).filter(n => validos.has(n) && !sequedan.includes(n)))].sort((a, b) => a - b);

  // Igual que en la limpieza de las pruebas: la que no clasifique, se queda.
  for (const n of validos) {
    if (!sequedan.includes(n) && !sequitan.includes(n)) sequedan.push(n);
  }
  sequedan.sort((a, b) => a - b);

  return { sequedan, sequitan };
}

// ── LOS TRES PASOS SEGUIDOS ─────────────────────────────────
//
// Sale la lista de creencias lista para escribir: cada una con su titulo, su
// linea y su numero. Si no sale ninguna, esto LANZA: el documento no
// se monta a medias.
async function lasCreencias({ limpia, sexo }) {
  const arranque = Date.now();
  const cuantos = limpia.sequedan.length;

  // ── A. SE SACAN ───────────────────────────────────────────
  let sacadas;
  try {
    sacadas = await sacarLasCreencias({ lista: limpia.lista, titulos: limpia.titulos, cuantos, sexo, piensa: 'medium' });
  } catch (err) {
    // Si el que decide no puede, termina el otro: quedarse sin esta llamada es
    // quedarse sin la mitad del documento.
    const queda = loQueQueda(arranque, ESPERA_DE_CREENCIAS_MS);
    if (queda < ESPERA_MINIMA_PARA_REHACER_MS) throw err;
    console.warn(`[p2] ${EL_QUE_DECIDE} no ha podido sacar las creencias (${err.message}), lo termina ${EL_QUE_REMATA}`);
    sacadas = await sacarLasCreencias({
      lista: limpia.lista, titulos: limpia.titulos, cuantos, sexo, piensa: 'medium',
      espera: queda, modelo: EL_QUE_REMATA,
    });
  }

  // Y SI HA VENIDO A MEDIAS, SE PIDE OTRA VEZ Y SE QUEDA LA MEJOR. Pedir otra
  // vez no garantiza que salga mejor, asi que se comparan las dos.
  if (sacadas.huecos || !sacadas.creencias.length) {
    const queda = loQueQueda(arranque, ESPERA_DE_CREENCIAS_MS);
    if (queda >= ESPERA_MINIMA_PARA_REHACER_MS) {
      console.warn(`[p2] las creencias han venido ${sacadas.creencias.length ? `con ${sacadas.huecos} hueco(s)` : 'vacias'}, se piden otra vez`);
      try {
        const otra = await sacarLasCreencias({
          lista: limpia.lista, titulos: limpia.titulos, cuantos, sexo, piensa: 'medium',
          espera: queda, modelo: EL_QUE_REMATA,
          recordatorio: '\n\nY OJO: la vez anterior alguna vino sin sus números de desafío, sin su línea, con el título fuera de medida, apoyada en un solo desafío o dicha con las palabras de ese desafío. Todas enteras, cada una explicando dos desafíos como mínimo y con sus propias palabras, y el título de cuatro a siete palabras.',
        });
        // SE QUEDA LA MEJOR DE LAS DOS, Y MEJOR ES LA QUE TRAIGA MAS CREENCIAS
        // DE FONDO: las que salen de varios desafios, que son las unicas que se
        // van a escribir. Contando solo huecos, una tanda de tres sin un fallo
        // le ganaria a otra de ocho buenas con una suelta, y se tirarian cinco
        // creencias suyas por una cuenta. Los huecos deciden cuando empatan.
        const cuantasDeFondo = tanda => tanda.creencias.filter(c => c.deCuales.length >= 2).length;
        const mejora = !sacadas.creencias.length
          || cuantasDeFondo(otra) > cuantasDeFondo(sacadas)
          || (cuantasDeFondo(otra) === cuantasDeFondo(sacadas) && otra.huecos < sacadas.huecos);
        if (otra.creencias.length && mejora) sacadas = otra;
      } catch (err) {
        console.warn(`[p2] el segundo intento de sacar las creencias se ha caido (${err.message}), se sigue con el primero`);
      }
    }
  }

  let creencias = sacadas.creencias;
  if (!creencias.length) {
    throw new Error('no ha salido ninguna creencia, y sin ellas el documento no se monta');
  }
  console.log(`[p2] han salido ${creencias.length} creencias`);

  // ── Y LA QUE SALE DE UN SOLO DESAFIO, FUERA ───────────────
  //
  // Una creencia de fondo explica varias cosas suyas a la vez. La que solo
  // explica una es ese desafio dicho de otra manera, y eso ya se lo ha leido en
  // sus pruebas: volver a leerlo no le da nada. Lo hace el codigo con los
  // numeros, que es lo que no se le puede pedir de palabra al modelo.
  let quitaFondo = [];
  const deFondo = creencias.filter(c => c.deCuales.length >= 2);
  if (deFondo.length < creencias.length) {
    if (deFondo.length) {
      quitaFondo = creencias.filter(c => c.deCuales.length < 2)
        .map(c => ({ titulo: c.titulo, linea: c.linea }));
      creencias = deFondo;
      console.log(`[p2] ${quitaFondo.length} creencia(s) salian de un solo desafio: fuera, quedan ${creencias.length}`);
    } else {
      // SI NINGUNA SALE DE VARIOS, SE SIGUE CON TODAS. Medio documento en
      // blanco es peor que unas creencias flojas, y esto no puede dejar sin su
      // parte a quien ha pagado.
      console.warn('[p2] ninguna creencia sale de mas de un desafio: se sigue con todas');
    }
  }

  // ── B. SE LIMPIAN Y SE PUNTUAN ────────────────────────────
  const paraLimpiar = loQueQueda(arranque, ESPERA_DE_CREENCIAS_MS);
  if (paraLimpiar < ESPERA_MINIMA_PARA_REHACER_MS) {
    throw new Error('sacar sus creencias se ha llevado todo el tiempo y no queda para limpiarlas. Vuelve a darle.');
  }

  let limpiadas;
  try {
    limpiadas = await limpiarLasCreencias({ creencias, piensa: 'high', espera: paraLimpiar });
  } catch (err) {
    const queda = loQueQueda(arranque, ESPERA_DE_CREENCIAS_MS);
    if (queda < ESPERA_MINIMA_PARA_REHACER_MS) throw err;
    console.warn(`[p2] ${EL_QUE_DECIDE} no ha podido limpiar las creencias (${err.message}), lo termina ${EL_QUE_REMATA}`);
    limpiadas = await limpiarLasCreencias({ creencias, piensa: 'high', espera: queda, modelo: EL_QUE_REMATA });
  }

  if (limpiadas.huecos || !limpiadas.sequedan.length) {
    const queda = loQueQueda(arranque, ESPERA_DE_CREENCIAS_MS);
    if (queda >= ESPERA_MINIMA_PARA_REHACER_MS) {
      console.warn(`[p2] la limpieza de las creencias ${limpiadas.sequedan.length ? `ha venido con ${limpiadas.huecos} hueco(s)` : 'no ha dejado ninguna'}, se pide otra vez`);
      try {
        const otra = await limpiarLasCreencias({
          creencias, piensa: 'high', espera: queda, modelo: EL_QUE_REMATA,
          recordatorio: '\n\nY OJO: la vez anterior alguna se quedó sin decir si entra o sale, o sin su puntuación. Todas clasificadas y todas las que se quedan, puntuadas.',
        });
        if (otra.sequedan.length && (!limpiadas.sequedan.length || otra.huecos < limpiadas.huecos)) limpiadas = otra;
      } catch (err) {
        console.warn(`[p2] el segundo intento de limpiar las creencias se ha caido (${err.message}), se sigue con el primero`);
      }
    }
  }

  // LA QUE NO HAYA CLASIFICADO, SE QUEDA. Un descuido suyo no puede quitarle a
  // la clienta una creencia que nadie ha decidido quitar.
  let sequedan = [...limpiadas.sequedan, ...limpiadas.olvidadas].sort((a, b) => a - b);
  if (limpiadas.olvidadas.length) {
    console.warn(`[p2] la limpieza de creencias no ha dicho nada de ${limpiadas.olvidadas.join(', ')}: se quedan`);
  }
  if (!sequedan.length) {
    throw new Error('después de limpiarlas no queda ninguna creencia, y sin ellas el documento no se monta');
  }
  console.log(`[p2] de ${creencias.length} creencias se quedan ${sequedan.length}` +
    (limpiadas.sequitan.length ? `; fuera: ${limpiadas.sequitan.join(', ')}` : ''));

  // Las que quedan, con su puntuacion pegada. La que se haya quedado sin nota
  // no se tira: va sin ella.
  let quedan = sequedan.map(n => ({ ...creencias[n - 1], puntuacion: limpiadas.puntuacion.get(n) || 0 }));

  // Lo que quito la limpieza, para poder mirarlo en la pagina.
  const quitaLimpieza = limpiadas.sequitan.map(n => ({
    numero: n,
    titulo: creencias[n - 1].titulo,
    linea: creencias[n - 1].linea,
  }));
  const quitaRepaso = [];

  // ── C. Y SE REPASA LO QUE HA QUEDADO ──────────────────────
  if (quedan.length >= 3) {
    const queda = loQueQueda(arranque, ESPERA_DE_CREENCIAS_MS);
    if (queda >= ESPERA_MINIMA_PARA_REHACER_MS) {
      try {
        const repaso = await repasarLasCreencias({ creencias: quedan, espera: queda });
        const fuera = repaso.sequitan.map(n => quedan[n - 1]).filter(Boolean);
        const dejadas = repaso.sequedan.map(n => quedan[n - 1]).filter(Boolean);
        if (dejadas.length) {
          quedan = dejadas;
          quitaRepaso.push(...fuera.map(c => ({ titulo: c.titulo, linea: c.linea })));
          console.log(`[p2] el repaso de las creencias deja ${quedan.length}` +
            (fuera.length ? `; fuera tambien: ${fuera.map(c => c.titulo).join(' · ')}` : '; no ha quitado ninguna'));
        }
      } catch (err) {
        console.warn(`[p2] el repaso de las creencias se ha caido (${err.message}), se sigue con la limpieza`);
      }
    }
  }

  // PRIMERO LAS QUE MAS LE MANDAN. Para eso se ha puntuado. Las que empaten se
  // quedan en el orden en que salieron.
  //
  // LA CREENCIA NO LLEVA AREA. Sale de varios desafios a la vez, que pueden ser
  // de areas distintas, asi que ponerle una seria elegir por sorteo. Y ademas
  // una creencia no es de un area: se le nota en varias cosas suyas, que es
  // justo lo que la hace valer. Las pruebas si la llevan: cada una sale de un
  // desafio concreto.
  const listas = quedan
    .map((c, i) => ({ ...c, orden: i }))
    .sort((a, b) => (b.puntuacion - a.puntuacion) || (a.orden - b.orden))
    .map((c, i) => ({
      numero: i + 1,
      titulo: c.titulo,
      linea: c.linea,
      deCuales: c.deCuales,
      puntuacion: c.puntuacion,
    }));

  // Y COMO SE HA LLEGADO A ELLA, para poder mirarlo en la pagina: lo que saco
  // la primera, lo que quito cada pasada y con que se ha quedado. Esto no lo
  // ve la clienta y no decide nada.
  return {
    creencias: listas,
    revision: {
      entraron: creencias.map((c, i) => ({ numero: i + 1, titulo: c.titulo, linea: c.linea, deCuales: c.deCuales })),
      quitaFondo,
      quitaLimpieza,
      quitaRepaso,
    },
  };
}

// ── D. ESCRIBIR UNA CREENCIA ────────────────────────────────

const MOLDE_DE_LA_CREENCIA = {
  type: 'object',
  properties: {
    loQueCreesHoy: { type: 'string' },
    loQueEsVerdad: { type: 'string' },
  },
  required: PUNTOS_DE_CREENCIA,
  additionalProperties: false,
};

// CADA UNA VE SOLO LA SUYA. Ni las demas creencias ni las pruebas: aqui se
// habla de lo que cree, y lo que tiene que hacer esta en otro sitio del
// documento y lo escribe otro.
async function escribirLaCreencia({ creencia, nombre, sexo, prohibida = '' }) {
  const encargo = `${REGLAS_COMUNES}


AQUÍ SE HABLA DE LO QUE CREE, NO DE LO QUE TIENE QUE HACER

No le mandes hacer nada: ni un paso, ni un ejercicio, ni algo que probar, ni una señal que vigilar. Eso está en otro sitio del documento, lo escribe otro y no es lo tuyo.

Lo tuyo es lo que da por verdad sin darse cuenta, y cómo le cambia la vida cuando eso deja de mandarle.

LO QUE TE TOCA AHORA

Te dan UNA creencia suya y la línea que dice qué es y de dónde le viene. Escribes dos cosas, cada una por su lado, y no se repiten entre ellas: lo que ya has dicho en una no vuelve en la otra.

NO DECIDES, EXPLICAS. Coges lo que te dan y lo abres. Todo lo que escribas tiene que poder rastrearse a eso. Si te falta un dato, no te lo inventas: cuentas mejor lo que ya está.

LAS DOS, Y LO QUE VA EN CADA UNA:

"loQueCreesHoy"

Cuál es esa creencia, dicha a la cara y desde algo suyo, nunca desde la idea.

Dentro va, entrecomillada y en primera persona, cómo se la dice por dentro: la frase tal cual le suena por dentro, no arreglada.

Y cómo funciona por dentro: qué hay debajo que la sostiene.

Unas 90 palabras para hacerte una idea del tamaño.

"loQueEsVerdad"

La creencia nueva, la que ocupa el sitio de la de arriba. Tiene que ser creíble: no es lo contrario dicho en bonito, ni una frase de ánimo, es algo que pueda leer hoy y reconocer que es verdad.

Y la segunda mitad es cómo es su vida sin esa creencia mandando: en concreto y en presente, con lo que va a estar pasando y no con lo que va a sentir.

Esa parte no se anuncia. Se entra por lo que hace o por lo que deja de hacer, no con una fórmula que avise de que ahora viene lo que cambia.

Unas 90 palabras para hacerte una idea del tamaño.

LAS CIFRAS DE ARRIBA SON UNA GUÍA, no un límite. Cuanto más corto mejor, pero tiene que entenderse a la primera. Y nunca cortes una frase por la mitad para que quepa: si no cabe, quitas algo entero y cierras.

LOS PÁRRAFOS SE SEPARAN CON UNA LÍNEA EN BLANCO. Es lo único de maqueta que haces tú, y hace falta: sin esa línea todo sale pegado en un bloque y no hay quien lo lea en un móvil.

LO QUE NO SE PUEDE ESCRIBIR

Ni una palabra de este encargo sale en lo que escribes. Aquí se habla de tú: nunca "quien lo lee", ni "esta persona", ni el nombre de las casillas.

No te inventes nada de su vida. No sabes si tiene pareja, trabajo, hijos, casa o familia.

Esto lo trae de nacimiento: no lo aprendió, no se lo enseñó nadie y no le viene de su infancia ni de su familia. Con los años se le habrá marcado más, y eso sí lo puedes decir.

Nada que le valga igual a cualquier persona: este producto es de élite.

Nada técnico: ni planetas, ni signos, ni casas, ni nada relacionado con astrología.

Sin palabras técnicas ni metáforas.

LA CREENCIA QUE TE TOCA:

${creencia.titulo}

${creencia.linea}

Quien lo va a leer es ${comoSeLeHabla(sexo)}
Nombre de pila: ${nombre}
${REGLA_DEL_NOMBRE(false)}`;

  // UNA FRASE QUE YA ESTA EN OTRA CREENCIA. Quien escribe esta no ve a las
  // demas, asi que no puede saber que esa frase ya esta puesta: se la dice el
  // programa, que si las ve todas.
  const laProhibida = prohibida
    ? `\n\nY OJO: la frase "${prohibida}" ya está en otra parte del documento. No la uses, ni nada que suene igual: eso mismo se dice de otra manera.`
    : '';

  const salida = await otraVezSiVieneRota({
    que: `la creencia "${creencia.titulo}"`,
    cojo: c => PUNTOS_DE_CREENCIA.some(punto => esRelleno(c[punto]) || acabaColgado(c[punto])),
    aviso: c => !PUNTOS_DE_CREENCIA.some(punto => esRelleno(c[punto])) && PUNTOS_DE_CREENCIA.some(punto => acabaColgado(c[punto]))
      ? `\n\nY OJO: la vez anterior algo se quedó a media frase (${PUNTOS_DE_CREENCIA.filter(punto => acabaColgado(c[punto])).map(x => BLOQUES_DE_CREENCIA[x]).join(', ')}). Se termina lo que se empieza: las dos acaban su última frase, con su punto.`
      : `\n\nY OJO: la vez anterior dejaste una casilla con una palabra de relleno dentro (${PUNTOS_DE_CREENCIA.filter(punto => esRelleno(c[punto])).map(x => BLOQUES_DE_CREENCIA[x]).join(', ')}) en vez de escribirla. Esto lo lee una persona que ha pagado por ello: las dos se escriben, y si te has quedado sin hilo, se vuelve a empezar esa.`,
    tope: ESPERA_DE_ESCRIBIR_MS,
    pedir: (recordatorio, cuanto) => alModelo({
      que: `escribir "${creencia.titulo}"`,
      modelo: EL_QUE_REMATA,
      piensa: '',
      techo: TECHO_DE_ESCRIBIR,
      system: encargo,
      mensaje: `Escribe las dos partes de esta creencia, enteras.${laProhibida}${recordatorio}`,
      molde: MOLDE_DE_LA_CREENCIA,
      espera: AbortSignal.timeout(cuanto),
    }),
  });

  const escrita = { titulo: creencia.titulo };
  for (const punto of PUNTOS_DE_CREENCIA) escrita[punto] = String(salida[punto] || '').trim();

  // UNA CREENCIA ROTA NO SE ENTREGA, y rota es rota: lo mismo que en las
  // pruebas. Solo se tira lo que de verdad no es texto -una casilla vacia o con
  // una palabra de relleno haciendo bulto-, porque todo lo demas ya se ha
  // pedido dos veces ahi arriba.
  const roto = [];
  for (const punto of PUNTOS_DE_CREENCIA) {
    const txt = escrita[punto];
    if (!txt) roto.push(`"${BLOQUES_DE_CREENCIA[punto]}" viene vacio`);
    else if (esRelleno(txt)) roto.push(`"${BLOQUES_DE_CREENCIA[punto]}" trae texto de relleno en vez de contenido`);
  }
  if (roto.length) throw new Error(`la creencia "${creencia.titulo}" ha salido rota: ${roto.join('; ')}`);

  return escrita;
}


// ════════════════════════════════════════════════════════════════
// TU HOJA DE RUTA: LAS DOS TABLAS
// ════════════════════════════════════════════════════════════════
//
// LO ULTIMO DEL DOCUMENTO, Y LO ULTIMO QUE SE HACE. Son el resumen de lo que
// ya ha leido: una tabla con sus pruebas y otra con sus creencias, para tener
// en una hoja lo que en el documento ocupa veinte. Por eso no pueden salir
// antes: necesitan las pruebas y las creencias hechas.
//
// AQUI NO SE DECIDE NI SE ESCRIBE NADA NUEVO. Se resume lo que ya esta. Si una
// celda dijera algo que no esta en el documento, la tabla dejaria de ser un
// resumen y seria otro texto que se contradice con el suyo.
//
// Y SE RESUME LO ESCRITO, no lo que se decidio antes. Las dos leen el texto
// que va a leer quien lo compra, palabra por palabra, para que su celda sea el
// resumen de ESO y no de otra version de lo mismo.
//
// LAS DOS VAN A LA VEZ, cada una con su llamada: no se miran entre ellas.
//
// Y LAS DOS LLEVAN EL TONO, como todo lo que se escribe en este documento:
// una celda es media frase, pero es media frase que lee quien ha pagado, y
// tiene que sonar igual que el resto. Lo unico que se le anade es que aqui una
// celda es UNA frase y no un parrafo.

const ESPERA_DE_LA_TABLA_MS = 90000;

// Sitio de sobra: no razona y lo que escribe son dos o tres lineas por fila.
const TECHO_DE_LA_TABLA = 12000;

// El molde sale de las casillas que lleve cada tabla, que son las mismas que
// los nombres de dentro del documento.
const moldeDeLaTabla = celdas => ({
  type: 'object',
  properties: {
    filas: {
      type: 'array',
      items: {
        type: 'object',
        properties: Object.fromEntries([
          ['numero', { type: 'integer' }],
          ...celdas.map(c => [c, { type: 'string' }]),
        ]),
        required: ['numero', ...celdas],
        additionalProperties: false,
      },
    },
  },
  required: ['filas'],
  additionalProperties: false,
});

// LAS REGLAS DE UNA CELDA, y valen para las dos tablas. Van detras del tono, y
// mandan sobre el en lo suyo: alli se escriben parrafos y aqui una linea.
//
// NO SE MIRA SI ACABA EN PUNTO, a proposito: aqui se pide justo lo contrario
// -sin punto al final-, asi que lo que en el documento seria una frase cortada
// aqui es lo normal.
const comoEsUnaCelda = cuanto => `CADA CELDA

Una frase corta, ${cuanto}, hablada de tú. Se entiende sola de un vistazo, sin leer el resto de la tabla. Empieza en mayúscula y sin punto al final.

De todo lo de arriba, aquí manda esto: una celda es UNA frase, no un párrafo.

Y aquí se resume: no se explica, no se añade nada que no esté abajo y no se cambia lo que dice.`;

// Lo que vuelve, limpio: solo filas que existan, sin repetir y con todas sus
// celdas escritas. Una celda vacia o con una palabra de relleno deja la fila
// fuera, y entonces se vuelve a pedir SOLO esa.
function filasLimpias(salida, celdas, pedidas) {
  const validas = new Set(pedidas);
  const filas = [];
  for (const f of (Array.isArray(salida.filas) ? salida.filas : [])) {
    const numero = Number(f?.numero);
    if (!validas.has(numero) || filas.some(x => x.numero === numero)) continue;
    const fila = { numero };
    let entera = true;
    for (const celda of celdas) {
      const txt = String(f?.[celda] || '').trim();
      if (!txt || esRelleno(txt)) { entera = false; break; }
      fila[celda] = txt;
    }
    if (entera) filas.push(fila);
  }
  return filas;
}

// QUE NO EMPIECEN TODAS IGUAL.
//
// Una celda en futuro y de doce palabras tiene una salida facil, y el modelo
// la coge para todas: la columna entera arranca con las mismas dos palabras y
// leerla cansa. No se le prohibe un comienzo concreto -entonces cogeria otro y
// haria lo mismo-, se le prohibe repetir: dos celdas no pueden empezar igual.
//
// Se miran DOS palabras y no una: hablando de tu, muchas frases distintas
// empiezan por la misma palabra suelta sin sonar iguales, y pedir que ni eso
// se repita seria retorcer el texto por una regla.
const PALABRAS_DEL_COMIENZO = 2;

const elComienzo = txt => comoSeCompara(txt).split(' ').filter(Boolean)
  .slice(0, PALABRAS_DEL_COMIENZO).join(' ');

// Y EL MISMO COMIENZO TAL Y COMO ESTA ESCRITO, que es el que se le nombra a el:
// el de arriba va en minuscula y sin tildes para poder compararlos, y ponerselo
// asi delante seria ensenarle a escribir mal.
const elComienzoTalCual = txt => String(txt || '').trim().split(/\s+/)
  .slice(0, PALABRAS_DEL_COMIENZO).join(' ');

// Las que empiezan como otra que ya estaba. La primera se queda: se vuelven a
// pedir las que llegaron detras.
function lasQueRepitenElComienzo(filas, celda) {
  const vistos = new Set();
  const repiten = [];
  for (const fila of filas) {
    const suyo = elComienzo(fila[celda]);
    if (!suyo) continue;
    if (vistos.has(suyo)) repiten.push(fila.numero);
    else vistos.add(suyo);
  }
  return repiten;
}

// QUE LA CELDA DIGA QUE LE TOCA CAMBIAR, NO LO QUE HACE.
//
// El texto de "Tu prueba" arranca contando la situacion en la que se reconoce y
// despues dice cual es la prueba. Al resumir, el modelo coge lo primero, asi
// que la celda sale siendo el retrato de lo que hace -que ademas ya ha leido en
// el titulo- en vez de lo que le toca mover.
//
// UN INFINITIVO NO PUEDE SER ESE RETRATO. Lo que hace se le cuenta hablandole
// de tu, y ninguna de esas formas acaba en -ar, -er o -ir. Asi que mirar como
// empieza la celda basta para saber si ha resumido lo que toca.
//
// Y EL INFINITIVO PUEDE LLEVAR UN PRONOMBRE PEGADO DETRAS, que se le quita
// antes de mirar el final.
const PEGADOS_AL_VERBO = ['melo', 'mela', 'selo', 'sela', 'telo', 'tela',
  'me', 'te', 'se', 'lo', 'la', 'le', 'nos', 'los', 'las', 'les'];

function empiezaEnInfinitivo(txt) {
  const palabras = comoSeCompara(txt).split(' ').filter(Boolean);
  // "No dejarte..." tambien empieza por el verbo: el "no" va delante y no
  // cuenta. Sin esto se pediria otra vez una celda que ya estaba bien.
  let palabra = (palabras[0] === 'no' ? palabras[1] : palabras[0]) || '';
  for (const pegado of PEGADOS_AL_VERBO) {
    if (palabra.length > pegado.length + 2 && palabra.endsWith(pegado)) {
      palabra = palabra.slice(0, -pegado.length);
      break;
    }
  }
  return palabra.length >= 2 && /(ar|er|ir)$/.test(palabra);
}

// UNA TABLA, CON SU SEGUNDA VUELTA.
//
// Si alguna fila no vuelve, se pide otra vez SOLO esa: las que ya estan no se
// repiten. Y si despues de eso sigue faltando alguna, esto lanza: una tabla
// resumen con un hueco en medio no se entrega.
async function unaTabla({ que, celdas, encargoDe, mensaje, cosas, arranque,
                          enInfinitivo = null, sinRepetir = null }) {
  const pedidas = cosas.map(c => c.numero);

  const pedir = async (suyas, espera, aviso = '') => filasLimpias(
    await alModelo({
      que,
      modelo: EL_QUE_REMATA,
      piensa: '',
      techo: TECHO_DE_LA_TABLA,
      system: encargoDe(suyas),
      mensaje: mensaje + aviso,
      molde: moldeDeLaTabla(celdas),
      espera: AbortSignal.timeout(espera),
    }),
    celdas,
    suyas.map(c => c.numero),
  );

  // SI SE CAE, ES COMO SI NO HUBIERA VUELTO NINGUNA FILA: se pide otra vez
  // ahi abajo, con todas. Asi una caida y una fila que falta se arreglan por
  // el mismo camino.
  let filas = [];
  try {
    filas = await pedir(cosas, loQueQueda(arranque, ESPERA_DE_LA_TABLA_MS));
  } catch (err) {
    console.warn(`[p2] ${que}: se ha caido (${err.message}), se pide otra vez`);
  }

  const faltan = pedidas.filter(n => !filas.some(f => f.numero === n));
  if (faltan.length) {
    const queda = loQueQueda(arranque, ESPERA_DE_LA_TABLA_MS);
    if (queda >= ESPERA_MINIMA_PARA_REHACER_MS) {
      console.warn(`[p2] ${que}: faltan las filas ${faltan.join(', ')}, se piden otra vez`);
      try {
        filas.push(...await pedir(cosas.filter(c => faltan.includes(c.numero)), queda));
      } catch (err) {
        console.warn(`[p2] ${que}: la segunda vuelta se ha caido (${err.message})`);
      }
    }
  }

  const siguenFaltando = pedidas.filter(n => !filas.some(f => f.numero === n));
  if (siguenFaltando.length) {
    throw new Error(`${que}: no han salido las filas ${siguenFaltando.join(', ')}, y la tabla no se monta a medias`);
  }

  filas.sort((a, b) => a.numero - b.numero);

  // ── LO QUE LE TOCA CAMBIAR, SI ESTA TABLA LO PIDE ─────────
  //
  // Va antes de lo de los comienzos: una fila que se vuelve a pedir trae todas
  // sus celdas nuevas, asi que si se hiciera despues podria estropear lo otro.
  //
  // Y la nueva solo entra si de verdad lo arregla; si no, se queda la que
  // habia, que al menos es un resumen suyo.
  if (enInfinitivo) {
    const flojas = filas.filter(f => !empiezaEnInfinitivo(f[enInfinitivo.celda])).map(f => f.numero);
    const queda = loQueQueda(arranque, ESPERA_DE_LA_TABLA_MS);
    if (flojas.length && queda >= ESPERA_MINIMA_PARA_REHACER_MS) {
      console.warn(`[p2] ${que}: las filas ${flojas.join(', ')} cuentan lo que hace en vez de lo que le toca cambiar, se piden otra vez`);
      const aviso = `\n\nY OJO: en "${enInfinitivo.nombre}" la celda dice lo que le toca cambiar, y por eso empieza por un verbo en infinitivo. Las filas que te doy ahora no lo hacen: están contando lo que hace hoy, que es justo lo que no va ahí.`;
      try {
        const otras = await pedir(cosas.filter(c => flojas.includes(c.numero)), queda, aviso);
        for (const nueva of otras) {
          if (!empiezaEnInfinitivo(nueva[enInfinitivo.celda])) continue;
          const donde = filas.findIndex(f => f.numero === nueva.numero);
          if (donde >= 0) filas[donde] = nueva;
        }
      } catch (err) {
        console.warn(`[p2] ${que}: la vuelta de los infinitivos se ha caido (${err.message}), se queda lo que habia`);
      }
    }
  }

  // Y QUE NO EMPIECEN DOS IGUAL, si esta tabla lo pide. Se vuelven a pedir SOLO
  // las que repiten, con los comienzos ya cogidos delante para que no vuelva a
  // caer en ellos. Y la nueva solo entra si de verdad arranca por otro sitio:
  // si no, se queda la que habia. Antes una celda que empieza como otra que una
  // frase retorcida para cumplir una regla.
  if (sinRepetir) {
    const { celda, nombre } = sinRepetir;
    const repiten = lasQueRepitenElComienzo(filas, celda);
    const queda = loQueQueda(arranque, ESPERA_DE_LA_TABLA_MS);
    if (repiten.length && queda >= ESPERA_MINIMA_PARA_REHACER_MS) {
      console.warn(`[p2] ${que}: las filas ${repiten.join(', ')} empiezan como otra, se piden otra vez`);
      const quedan = filas.filter(f => !repiten.includes(f.numero));
      const cogidos = quedan.map(f => elComienzo(f[celda])).filter(Boolean);
      const comoSuenan = quedan.map(f => elComienzoTalCual(f[celda])).filter(Boolean);
      const aviso = `\n\nY OJO: en "${nombre}" no puede haber dos que empiecen igual, y estos comienzos ya están cogidos por las demás filas: ${comoSuenan.map(c => `"${c}"`).join(', ')}. Las tuyas arrancan cada una por su lado, y siguen en futuro.`;
      try {
        const otras = await pedir(cosas.filter(c => repiten.includes(c.numero)), queda, aviso);
        const puestos = new Set(cogidos);
        for (const nueva of otras) {
          const suyo = elComienzo(nueva[celda]);
          if (!suyo || puestos.has(suyo)) continue;
          const donde = filas.findIndex(f => f.numero === nueva.numero);
          if (donde < 0) continue;
          filas[donde] = nueva;
          puestos.add(suyo);
        }
      } catch (err) {
        console.warn(`[p2] ${que}: la vuelta de los comienzos se ha caido (${err.message}), se queda lo que habia`);
      }
    }
  }

  return filas;
}

// ── LA TABLA DE LAS PRUEBAS ─────────────────────────────────
//
// Lee lo que quien lo compra va a leer: la prueba ya escrita, entera. Su
// celda tiene que ser el resumen de ESO, no de otra version de lo mismo.
const laTablaDeLasPruebas = ({ partes, sexo, arranque }) => unaTabla({
  que: 'la tabla de las pruebas',
  celdas: PUNTOS,
  cosas: partes,
  arranque,
  mensaje: 'Escribe la tabla, una fila por cada prueba.',
  enInfinitivo: { celda: 'tuPrueba', nombre: BLOQUES.tuPrueba },
  sinRepetir: { celda: 'dondeTeCaes', nombre: BLOQUES.dondeTeCaes },
  encargoDe: suyas => `${REGLAS_COMUNES}


AQUÍ SE RESUME, NO SE ESCRIBE

Abajo tienes las pruebas de una persona, numeradas y ya escritas: es lo que acaba de leer.

Una fila por cada prueba de abajo, con su número, y tres celdas: "${BLOQUES.tuPrueba}", "${BLOQUES.queHaces}" y "${BLOQUES.dondeTeCaes}". Cada celda resume en una línea lo que pone abajo en esa misma casilla.

La de "${BLOQUES.tuPrueba}" dice QUÉ LE TOCA CAMBIAR, y por eso empieza por un verbo en infinitivo, no hablándole de tú como las otras dos. Abajo, esa casilla arranca contando la situación en la que se reconoce y después dice cuál es su prueba: lo que resumes es eso segundo. Lo que hace hoy no va ahí, que ya se lo has contado en el título.

La de "${BLOQUES.dondeTeCaes}" va en futuro, como está abajo: eso todavía no ha pasado, va a pasar cuando lo intente.

Y esas no empiezan dos igual: cada una arranca con palabras distintas de las de las demás filas. Todas en futuro, pero cada una entra por su lado.

Ninguna se queda fuera.

${comoEsUnaCelda('de menos de doce palabras')}

LAS PRUEBAS:

${suyas.map(p => [`${p.numero}. ${p.titulo}`,
  ...PUNTOS.map(punto => `${BLOQUES[punto]}: ${p[punto]}`)].join('\n\n')).join('\n\n\n')}

Quien lo va a leer es ${comoSeLeHabla(sexo)}`,
});

// ── LA TABLA DE LAS CREENCIAS ───────────────────────────────
//
// Igual que la otra: lee la creencia ya escrita, que es lo que ha leido. Pero
// aqui solo se le pide UNA celda.
//
// "LO QUE CREES HOY" ES EL TITULO DE LA CREENCIA, TAL CUAL. El titulo ya es la
// frase que se cree, dicha en corto: pedirle al modelo otra version de eso es
// que se invente una distinta de la que ha leido. La pone el programa.
const CELDAS_DE_LA_TABLA_DE_CREENCIAS = ['loQueEsVerdad'];

const pedirLaTablaDeLasCreencias = ({ creencias, sexo, arranque }) => unaTabla({
  que: 'la tabla de las creencias',
  celdas: CELDAS_DE_LA_TABLA_DE_CREENCIAS,
  cosas: creencias,
  arranque,
  mensaje: 'Escribe la tabla, una fila por cada creencia.',
  encargoDe: suyas => `${REGLAS_COMUNES}


AQUÍ SE RESUME, NO SE ESCRIBE

Abajo tienes las creencias de una persona, numeradas y ya escritas: es lo que acaba de leer.

Una fila por cada creencia de abajo, con su número, y UNA celda: "${BLOQUES_DE_CREENCIA.loQueEsVerdad}". Resume en una línea lo que pone abajo en esa misma casilla.

La otra columna de esa tabla, "${BLOQUES_DE_CREENCIA.loQueCreesHoy}", la pone el programa con el título de la creencia: tú no la escribes.

Ninguna se queda fuera.

${comoEsUnaCelda('de hasta quince palabras')}

LAS CREENCIAS:

${suyas.map(c => [`${c.numero}. ${c.titulo}`,
  ...PUNTOS_DE_CREENCIA.map(punto => `${BLOQUES_DE_CREENCIA[punto]}: ${c[punto]}`)].join('\n\n')).join('\n\n\n')}

Quien lo va a leer es ${comoSeLeHabla(sexo)}`,
});

async function laTablaDeLasCreencias({ creencias, sexo, arranque }) {
  const filas = await pedirLaTablaDeLasCreencias({ creencias, sexo, arranque });
  // Y SU TITULO EN LA PRIMERA CELDA, sacado de la misma creencia que resume.
  return filas.map(fila => {
    const suya = creencias.find(c => c.numero === fila.numero);
    return { ...fila, loQueCreesHoy: String(suya?.titulo || '').trim() };
  });
}

// LAS DOS, A LA VEZ. Si una se cae, se cae la hoja de ruta entera: media tabla
// resumen no es un resumen.
async function lasTablas({ partes, creencias, sexo }) {
  const arranque = Date.now();
  const [pruebas, suyas] = await Promise.all([
    laTablaDeLasPruebas({ partes, sexo, arranque }),
    laTablaDeLasCreencias({ creencias, sexo, arranque }),
  ]);

  // EL AREA NO LA ESCRIBE EL MODELO: se le pega aqui a su fila, sacada de la
  // misma cosa que resume, y la pone el que maqueta. Solo las pruebas: la
  // creencia no lleva area.
  const conArea = (filas, cosas) => filas.map(f => {
    const suya = cosas.find(c => c.numero === f.numero);
    return suya && suya.area ? { ...f, area: suya.area } : f;
  });
  console.log(`[p2] la hoja de ruta: ${pruebas.length} pruebas y ${suyas.length} creencias`);
  return { pruebas: conArea(pruebas, partes), creencias: suyas };
}


// ════════════════════════════════════════════════════════════════
// LA PAGINA Y SUS PETICIONES
// ════════════════════════════════════════════════════════════════
//
// Cada paso es una peticion suya: la lista, el plan y cada parte.
// Asi ninguna se acerca al tiempo maximo que aguanta el servidor, y el
// documento se ve llegar a trozos en vez de esperar a una pantalla en blanco.

// ── QUIEN ES ─────────────────────────────────────────────────────
//
// Sus datos -su nombre y su sexo- viven en el fichero de su email, que es uno
// solo: da igual que lo escribiera el regalo o el informe, o los dos. De ahi
// se sacan.
//
// LOS INFORMES DE ANTES LOS LLEVABAN DENTRO, y esos se usan tal cual sin
// abrir nada mas: es lo que se le entrego aquel dia.
//
// Si no aparece por ningun lado, se devuelve vacio y quien llama decide: aqui
// no se inventa un nombre.
async function susDatos(informe) {
  const dentro = (informe && informe.cliente) || {};
  if (dentro.nombre) {
    return { nombre: String(dentro.nombre).trim(), sexo: dentro.sexo || '' };
  }
  try {
    const ficha = await leerLaFicha(dentro.email || '');
    const suyo = (ficha && ficha.cliente) || null;
    if (suyo && suyo.nombre) {
      return { nombre: String(suyo.nombre).trim(), sexo: suyo.sexo || '' };
    }
  } catch (err) {
    console.error('[p2] No se ha podido leer la ficha del cliente:', err.message);
  }
  return { nombre: '', sexo: '' };
}

// Cada creencia la escribe una llamada distinta que no ve a las demas, asi que
// ninguna puede saber que la frase que esta poniendo ya esta puesta en otra. Y
// pasa: en un documento de verdad, siete de ocho abrieron su segunda mitad con
// la misma frase, porque el encargo se la dictaba. Se quito del encargo, pero
// eso no basta -si la instruccion sugiere una forma, todas van hacia ella-.
//
// Esto lo mira el codigo, que si las ve todas juntas: busca cualquier carrera
// de CINCO palabras seguidas que aparezca en dos creencias o mas. La primera
// se queda con ella; a las demas se les vuelve a pedir su texto diciendoles
// esa frase, para que la digan de otra manera.
const PALABRAS_QUE_SE_REPITEN = 5;

function frasesRepetidas(textos) {
  const carreras = textos.map(t => {
    const palabras = String(t || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9ñ]+/g, ' ').trim().split(' ').filter(Boolean);
    const suyas = new Set();
    for (let i = 0; i + PALABRAS_QUE_SE_REPITEN <= palabras.length; i++) {
      suyas.add(palabras.slice(i, i + PALABRAS_QUE_SE_REPITEN).join(' '));
    }
    return suyas;
  });

  // De cada carrera, quienes la llevan.
  const dequien = new Map();
  carreras.forEach((suyas, i) => suyas.forEach(f => {
    if (!dequien.has(f)) dequien.set(f, []);
    dequien.get(f).push(i);
  }));

  // La primera se la queda; las demas la tienen que cambiar.
  const repiten = new Map();
  for (const [frase, quienes] of dequien) {
    if (quienes.length < 2) continue;
    for (const i of quienes.slice(1)) if (!repiten.has(i)) repiten.set(i, frase);
  }
  return repiten;
}

// ═════════════════════════════════════════════════════════════════
// EL DOCUMENTO ENTERO, DE UNA VEZ Y DESDE AQUI
//
// Hasta ahora el orden lo llevaba la pagina: pedia el informe, luego el plan,
// luego cada parte, luego las creencias y al final la hoja de ruta. El
// servidor solo contestaba a cada peticion suelta. Eso vale para mirarlo
// mientras se hace, pero no para entregarselo a nadie: si quien mira cierra
// la pestana, el documento se queda a medias y nadie se entera.
//
// Aqui esta esa misma secuencia, con el mismo orden, los mismos reintentos y
// las mismas cosas yendo a la vez. Lo unico que cambia es quien manda.
// ═════════════════════════════════════════════════════════════════

// SE INSISTE HASTA TRES VECES CON LA QUE SE CAIGA.
//
// Una parte que no vuelve deja el documento con un agujero, y entonces no se
// puede entregar. Como cada una es corta e independiente, insistir con la que
// ha fallado no le quita tiempo a las demas -ya han terminado- y casi siempre
// entra a la segunda: lo que se cae aqui es la linea, no el texto.
//
// TRES. Se bajo a dos para ahorrar tiempo y fue un error: en un plan de
// verdad se cayeron tres partes, se acabaron las vueltas y la clienta se
// quedo SIN PDF despues de cuatro minutos.
const INTENTOS_DE_ESCRITURA = 3;

// Lo que se le manda a la hoja de ruta de cada cosa: su numero, su titulo y su
// texto tal como se escribio, que es lo que el cliente lee. EL AREA SOLO LA
// LLEVAN LAS PRUEBAS: las creencias no tienen, y darles una vacia seria meterle
// a esa tabla una casilla que no es suya.
function enCortoParaLaTabla(cosa, i, puntos, conArea) {
  return {
    numero: i + 1,
    titulo: String(cosa?.titulo || '').trim(),
    ...(conArea ? { area: String(cosa?.area || '').trim() } : {}),
    ...Object.fromEntries(puntos.map(punto => [punto, String(cosa?.[punto] || '').trim()])),
  };
}

// UN FALLO DEL INFORME DE PARTIDA NO ES UN SERVIDOR ROTO. Se marca para poder
// distinguirlo, igual que ya se distinguia al contestar a la pagina: con este
// informe no hay plan por mucho que se vuelva a intentar.
function fallaElInforme(mensaje) {
  const err = new Error(mensaje);
  err.esDelInforme = true;
  return err;
}

async function montarloTodo({ compra }) {
  // ── 1. SU INFORME DEL P1 ──────────────────────────────────
  const informe = await leer(compra);

  // SIN LO QUE LE CUESTA NO HAY PLAN. Es lo unico que se le manda al modelo,
  // asi que con la lista vacia se lo inventaria todo. Los informes de antes de
  // que se guardaran los rasgos entran por aqui.
  const cuantos = cuantosDesafios(informe?.rasgos);
  if (cuantos < 3) {
    throw fallaElInforme(cuantos
      ? `Ese informe solo tiene ${cuantos} cosas que le cuesten, y con eso no sale un plan`
      : 'Ese informe se guardó sin los rasgos, y sin ellos no hay plan');
  }

  // Y SIN SU NOMBRE TAMPOCO. Un documento que se entrega a alguien no lleva un
  // relleno donde va su nombre: si falta, se para aqui y se dice.
  const { nombre, sexo } = await susDatos(informe);
  if (!nombre) {
    throw fallaElInforme('Ese informe se guardó sin el nombre del cliente, y el plan va dirigido a él: no se hace a medias');
  }

  const limpia = laListaDelP1({ rasgos: informe.rasgos });

  // ── 2. LAS CREENCIAS, QUE VAN POR SU LADO Y A LA VEZ ──────
  //
  // Es el otro tema del documento y no depende de las pruebas: en cuanto la
  // lista esta limpia se piden, y mientras se decide el plan y se escriben las
  // partes ellas van saliendo. El fallo se guarda dentro en vez de soltarlo,
  // para que no se pierda por el camino mientras nadie mira.
  const vanCreencias = lasCreencias({ limpia, sexo })
    .then(d => ({ ok: true, creencias: d.creencias || [], revision: d.revision || null }))
    .catch(e => ({ ok: false, error: e.message }));

  // ── 3. EL PLAN ────────────────────────────────────────────
  const plan = await decidirElPlan({ nombre, sexo, limpia });

  // SIN PARTES NO HAY PLAN. No se le pone numero a lo que tiene que salir,
  // pero si vuelve con dos o con ninguna no hay documento que entregar.
  if (plan.partes.length < 3) {
    throw fallaElInforme(`El plan ha venido con ${plan.partes.length} partes, y con eso no hay documento. Vuelve a darle.`);
  }

  // ── 4. LAS PARTES, TODAS A LA VEZ ─────────────────────────
  const total = plan.partes.length;

  // DONDE PUEDE LLAMARLA POR SU NOMBRE. Ninguna de las que escriben ve lo que
  // han puesto las otras, asi que si se deja a su criterio el documento acaba
  // con el nombre repetido en cada parte. Lo reparte el codigo: la primera y
  // una de en medio. Dos veces en todo el documento.
  const conNombre = new Set([0, Math.floor(total / 2)]);

  const escritas = [];
  let caidas = plan.partes.map((_, i) => i);
  for (let vuelta = 1; vuelta <= INTENTOS_DE_ESCRITURA && caidas.length; vuelta++) {
    const seCaen = [];
    await Promise.all(caidas.map(async i => {
      const suya = plan.partes[i];
      try {
        // Lo decidido se comprueba antes de meterlo en el encargo: si viniera a
        // medias, el hueco lo rellenaria el modelo por su cuenta y acabaria
        // inventandose algo de su vida.
        if (!String(suya?.titulo || '').trim() || PUNTOS.some(punto => !String(suya?.[punto] || '').trim())) {
          throw new Error('llega a medias y no se escribe');
        }
        escritas[i] = await escribirLaParte({
          parte: suya, nombre, sexo, puedeElNombre: conNombre.has(i),
        });
      } catch (err) {
        seCaen.push(i);
        console.warn(`[p2] la prueba ${i + 1} se ha caído: ${err.message}`);
      }
    }));
    caidas = seCaen;
  }
  const completas = escritas.filter(Boolean);

  // ── 5. Y LAS CREENCIAS, QUE LLEVAN TODO ESTE RATO SALIENDO ─
  //
  // Se pidieron a la vez que el plan, asi que a estas alturas lo normal es que
  // ya esten: aqui solo se recogen y se escriben, igual que las partes.
  const suyas = await vanCreencias;

  let laProgramacion = [];
  let enteras = false;
  let elFalloDeLasCreencias = '';

  if (!suyas.ok) {
    elFalloDeLasCreencias = 'no han salido sus creencias: ' + suyas.error;
  } else if (!suyas.creencias.length) {
    elFalloDeLasCreencias = 'no ha salido ninguna creencia';
  } else {
    const cuantasC = suyas.creencias.length;
    const escritasC = [];
    let caidasC = suyas.creencias.map((_, i) => i);
    for (let vuelta = 1; vuelta <= INTENTOS_DE_ESCRITURA && caidasC.length; vuelta++) {
      const seCaen = [];
      await Promise.all(caidasC.map(async i => {
        const suya = suyas.creencias[i];
        try {
          if (!String(suya?.titulo || '').trim() || !String(suya?.linea || '').trim()) {
            throw new Error('llega a medias y no se escribe');
          }
          escritasC[i] = await escribirLaCreencia({
            creencia: { titulo: String(suya.titulo).trim(), linea: String(suya.linea).trim() },
            nombre, sexo,
          });
        } catch (err) {
          seCaen.push(i);
          console.warn(`[p2] la creencia ${i + 1} se ha caído: ${err.message}`);
        }
      }));
      caidasC = seCaen;
    }

    laProgramacion = escritasC.filter(Boolean);
    enteras = laProgramacion.length === cuantasC;

    // ── Y QUE NO SE REPITA NINGUNA FRASE ENTRE ELLAS ──────────
    //
    // Una sola vuelta: a la que repite se le dice la frase y la escribe de otra
    // manera. Si esa vuelta se cae, se queda la que habia, que una frase
    // repetida no vale perder el documento.
    if (enteras) {
      const repiten = frasesRepetidas(escritasC.map(c => PUNTOS_DE_CREENCIA.map(p => c[p]).join(' ')));
      if (repiten.size) {
        await Promise.all([...repiten].map(async ([i, frase]) => {
          const suya = suyas.creencias[i];
          try {
            escritasC[i] = await escribirLaCreencia({
              creencia: { titulo: String(suya.titulo).trim(), linea: String(suya.linea).trim() },
              nombre, sexo,
              prohibida: String(frase || '').trim().slice(0, 200),
            });
          } catch (err) {
            console.warn(`[p2] la creencia ${i + 1} repetía una frase y no se ha podido rehacer: ${err.message}`);
          }
        }));
        laProgramacion = escritasC.filter(Boolean);
      }
    } else {
      elFalloDeLasCreencias = `se han quedado sin escribir ${cuantasC - laProgramacion.length} de sus ${cuantasC} creencias`;
    }
  }

  // ── 6. Y LA HOJA DE RUTA, QUE ES LO ULTIMO ────────────────
  //
  // Resume las dos cosas, asi que solo se puede pedir cuando las dos estan
  // enteras. Si falta alguna, no hay nada que resumir.
  let hojaDeRuta = null;
  let elFalloDeLaHoja = '';
  if (completas.length === total && enteras) {
    try {
      // LAS DOS VAN COMO SE ESCRIBIERON, que es lo que el cliente lee: la tabla
      // es su resumen, asi que se hace con ese mismo texto.
      hojaDeRuta = await lasTablas({
        partes: completas.map((p, i) => enCortoParaLaTabla(p, i, PUNTOS, true)),
        creencias: laProgramacion.map((c, i) => enCortoParaLaTabla(c, i, PUNTOS_DE_CREENCIA, false)),
        sexo,
      });
    } catch (err) {
      elFalloDeLaHoja = 'no ha salido su hoja de ruta: ' + err.message;
    }
  }

  // EL DOCUMENTO SOLO SALE SI ESTA TODO. Con una prueba caida -o sin sus
  // creencias, o sin su hoja de ruta- saldria un documento con un agujero
  // dentro, y eso no se le ensena a nadie.
  if (completas.length === total && enteras && hojaDeRuta) {
    return {
      documento: {
        nombre,
        // El numero que le toca a cada parte y los nombres de sus puntos van
        // desde aqui: el que maqueta no tiene que saberselos.
        partes: completas.map((p, i) => ({ ...p, numero: i + 1, nombres: BLOQUES })),
        creencias: laProgramacion.map((c, i) => ({ ...c, numero: i + 1, nombres: BLOQUES_DE_CREENCIA })),
        tablas: hojaDeRuta,
      },
      falta: '',
    };
  }

  const falta = [];
  if (completas.length !== total) falta.push(`se han quedado sin escribir ${total - completas.length} de sus ${total} pruebas`);
  if (elFalloDeLasCreencias) falta.push(elFalloDeLasCreencias);
  if (elFalloDeLaHoja) falta.push(elFalloDeLaHoja);
  return { documento: null, falta: falta.join('; ') };
}

// LA PUERTA. Abre el cuaderno de la tanda, monta el documento dentro y lo
// devuelve todo junto: lo escrito, lo que falte si ha faltado algo, y lo que
// ha tardado y costado cada llamada.
export async function montarElPlan({ compra }) {
  const cuaderno = [];
  const salida = await ELCUADERNO.run(cuaderno, () => montarloTodo({ compra }));
  return { ...salida, cuaderno };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(PAGINA);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { accion } = req.body || {};

  // EL CUADERNO DE ESTA PETICION. Se abre aqui, lo van llenando las llamadas
  // que se hagan dentro, y va de vuelta en la respuesta -salga bien o salga
  // mal-, para poder mirar en la pagina lo que ha tardado y costado cada una.
  const cuaderno = [];
  const conCuaderno = datos => ({ ...datos, cuaderno });

  return ELCUADERNO.run(cuaderno, async () => {
  try {
    if (accion === 'lista') {
      const informes = await listar(40);
      // El nombre no esta en la lista de R2, hay que abrir cada informe. Se
      // abren los diez ultimos, que es lo que se va a elegir de verdad.
      const conNombre = await Promise.all(informes.map(async (inf, i) => {
        if (i >= 10) return { ...inf, nombre: inf.compra };
        try {
          const datos = await leer(inf.compra);
          return { ...inf, nombre: (await susDatos(datos)).nombre || inf.compra };
        } catch {
          return { ...inf, nombre: '(no se pudo abrir)' };
        }
      }));
      return res.status(200).json(conCuaderno({ informes: conNombre }));
    }

    if (accion === 'informe') {
      const { compra } = req.body || {};
      const informe = await leer(compra);
      // SIN LO QUE LE CUESTA NO HAY PLAN. Es lo unico que se le manda al
      // modelo, asi que con la lista vacia se lo inventaria todo. Los informes
      // de antes de que se guardaran los rasgos entran por aqui.
      const cuantos = cuantosDesafios(informe?.rasgos);
      if (cuantos < 3) {
        return res.status(422).json(conCuaderno({
          error: cuantos
            ? `Ese informe solo tiene ${cuantos} cosas que le cuesten, y con eso no sale un plan`
            : 'Ese informe se guardó sin los rasgos, y sin ellos no hay plan',
        }));
      }

      // Y SIN SU NOMBRE TAMPOCO. Antes, si el informe venia sin nombre, se
      // seguia adelante poniendo "esta persona": el modelo escribia con eso y
      // acababa impreso en la portada del documento y dentro del texto. Un
      // documento que se entrega a alguien no lleva un relleno donde va su
      // nombre. Si falta, se para aqui y se dice.
      const { nombre, sexo } = await susDatos(informe);
      if (!nombre) {
        return res.status(422).json(conCuaderno({
          error: 'Ese informe se guardó sin el nombre del cliente, y el plan va dirigido a él: no se hace a medias',
        }));
      }

      const limpia = laListaDelP1({ rasgos: informe.rasgos });
      // El nombre y el sexo viajan con la lista: los pasos siguientes
      // escriben con ellos y asi no hay que volver a abrir el informe.
      return res.status(200).json(conCuaderno({
        limpia,
        quien: { nombre, sexo },
      }));
    }

    if (accion === 'decidir') {
      const { nombre, sexo, limpia } = req.body || {};
      if (!String(nombre || '').trim() || !limpia || !Array.isArray(limpia.sequedan) || !limpia.lista) {
        return res.status(400).json(conCuaderno({ error: 'Falta la lista limpia y no se puede decidir el plan' }));
      }

      const plan = await decidirElPlan({
        nombre: String(nombre).trim(),
        sexo: String(sexo || ''),
        limpia,
      });
      // SIN PARTES NO HAY PLAN. No se le pone numero a lo que tiene que salir
      // -eso es lo que traia el relleno- pero si vuelve con dos o con ninguna,
      // no hay documento que entregar y es que la llamada ha venido mal.
      if (plan.partes.length < 3) {
        return res.status(422).json(conCuaderno({
          error: `El plan ha venido con ${plan.partes.length} partes, y con eso no hay documento. Vuelve a darle.`,
        }));
      }
      return res.status(200).json(conCuaderno({ plan }));
    }

    if (accion === 'parte') {
      const { nombre, sexo, parte, puedeElNombre } = req.body || {};
      // Lo que llega del navegador se comprueba antes de meterlo en el encargo:
      // si viniera a medias, el hueco lo rellenaria el modelo por su cuenta y
      // acabaria inventandose algo de su vida.
      if (!String(parte?.titulo || '').trim() || PUNTOS.some(punto => !String(parte?.[punto] || '').trim())) {
        return res.status(400).json(conCuaderno({ error: 'Esa parte llega a medias y no se escribe' }));
      }
      // Y sin nombre no se escribe: lo mismo que en el paso anterior, para que
      // no entre por aqui un relleno que acabaria impreso en el documento.
      if (!String(nombre || '').trim()) {
        return res.status(400).json(conCuaderno({ error: 'Esa parte llega sin el nombre del cliente y no se escribe' }));
      }
      const escrita = await escribirLaParte({
        parte,
        nombre: String(nombre).trim(),
        sexo: String(sexo || ''),
        puedeElNombre: !!puedeElNombre,
      });
      return res.status(200).json(conCuaderno({ parte: escrita }));
    }

    // ── LAS CREENCIAS, QUE VAN POR SU LADO ────────────────────
    //
    // Su propia peticion, y por eso puede ir A LA VEZ que la que decide las
    // pruebas: cada una tiene el tiempo del servidor entero para ella.
    if (accion === 'creencias') {
      const { sexo, limpia } = req.body || {};
      if (!limpia || !Array.isArray(limpia.sequedan) || !limpia.lista) {
        return res.status(400).json(conCuaderno({ error: 'Falta la lista limpia y no se pueden sacar sus creencias' }));
      }
      const { creencias, revision } = await lasCreencias({ limpia, sexo: String(sexo || '') });
      return res.status(200).json(conCuaderno({ creencias, revision }));
    }

    if (accion === 'creencia') {
      const { nombre, sexo, creencia } = req.body || {};
      // Lo que llega del navegador se comprueba antes de meterlo en el encargo:
      // si viniera a medias, el hueco lo rellenaria el modelo por su cuenta.
      if (!String(creencia?.titulo || '').trim() || !String(creencia?.linea || '').trim()) {
        return res.status(400).json(conCuaderno({ error: 'Esa creencia llega a medias y no se escribe' }));
      }
      if (!String(nombre || '').trim()) {
        return res.status(400).json(conCuaderno({ error: 'Esa creencia llega sin el nombre del cliente y no se escribe' }));
      }
      const escrita = await escribirLaCreencia({
        creencia: {
          titulo: String(creencia.titulo).trim(),
          linea: String(creencia.linea).trim(),
        },
        nombre: String(nombre).trim(),
        sexo: String(sexo || ''),
        // La frase que no puede usar, si es que se ha repetido con otra.
        prohibida: String(req.body?.prohibida || '').trim().slice(0, 200),
      });
      return res.status(200).json(conCuaderno({ creencia: escrita }));
    }

    // ── LA HOJA DE RUTA, LO ULTIMO ───────────────────────────
    //
    // Se pide cuando ya estan las pruebas y las creencias, porque las resume.
    // Las dos tablas se escriben a la vez aqui dentro.
    if (accion === 'tablas') {
      const { sexo, partes, creencias } = req.body || {};
      const hayPartes = Array.isArray(partes) && partes.length;
      const hayCreencias = Array.isArray(creencias) && creencias.length;
      if (!hayPartes || !hayCreencias) {
        return res.status(400).json(conCuaderno({ error: 'Faltan las pruebas o las creencias y no se puede resumir nada' }));
      }
      const tablas = await lasTablas({
        partes: partes.map((p, i) => ({
          numero: Number(p?.numero) || i + 1,
          titulo: String(p?.titulo || '').trim(),
          area: String(p?.area || '').trim(),
          ...Object.fromEntries(PUNTOS.map(punto => [punto, String(p?.[punto] || '').trim()])),
        })),
        creencias: creencias.map((c, i) => ({
          numero: Number(c?.numero) || i + 1,
          titulo: String(c?.titulo || '').trim(),
          ...Object.fromEntries(PUNTOS_DE_CREENCIA.map(punto => [punto, String(c?.[punto] || '').trim()])),
        })),
        sexo: String(sexo || ''),
      });
      return res.status(200).json(conCuaderno({ tablas }));
    }

    return res.status(400).json(conCuaderno({ error: 'Acción no válida' }));
  } catch (err) {
    console.error('[p2-plan/prueba]', err);
    // Un informe que no da para un plan no es un servidor roto: se dice como
    // lo que es, para no hacer buscar un fallo donde no lo hay.
    return res.status(err.esDelInforme ? 422 : 500).json(conCuaderno({ error: err.message }));
  }
  });
}
// La pagina. Los colores y las letras son los de la marca, para leerlo como se
// va a leer. No carga nada de fuera: ni fuentes, ni librerias, ni imagenes.
const PAGINA = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>P2 — prueba</title>
<style>
  :root { --teal:#0e3f4b; --gold:#bd9048; --crema:#fffbef; --tinta:#0c0c0c; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--crema); color:var(--tinta); font:16px/1.7 Georgia, 'Times New Roman', serif; padding:2rem 1rem 5rem; }
  .caja { max-width:760px; margin-inline:auto; }
  h1 { font-size:1.5rem; color:var(--teal); margin-bottom:.3rem; }
  .sub { color:#6b6b6b; font-size:.85rem; margin-bottom:2rem; font-family:system-ui,sans-serif; }
  select, button { font:inherit; font-family:system-ui,sans-serif; font-size:.95rem; }
  select { width:100%; padding:.7rem; border:1px solid rgba(14,63,75,.3); border-radius:6px; background:#fff; margin-bottom:1.4rem; }
  button { background:var(--gold); color:#fff; border:0; border-radius:6px; padding:.8rem 1.6rem; cursor:pointer; font-weight:600; letter-spacing:.03em; }
  button:disabled { opacity:.45; cursor:default; }
  #pdf { margin-left:.6rem; background:var(--teal); }
  .aviso { font-family:system-ui,sans-serif; font-size:.9rem; color:#6b6b6b; margin:1.2rem 0; }
  .error { color:#c0392b; }
  .parte { background:#fff; border:1px solid rgba(189,144,72,.25); border-left:4px solid var(--gold); border-radius:8px; padding:1.6rem 1.8rem; margin-top:1.6rem; }
  .parte h2 .area { font-size:.62em; font-weight:700; letter-spacing:.06em; color:var(--gold); }
  .parte h2 { font-size:1.25rem; color:var(--teal); margin-bottom:.9rem; line-height:1.35; }
  .bloque { margin-bottom:1.3rem; }
  .bloque:last-child { margin-bottom:0; }
  /* Las ordenes -lo que hace y por que senal- van sobre beige, igual que en el
     PDF: son las que vuelve a buscar y tiene que encontrar sin leer. */
  .bloque.beige > .caja-texto { background:#faf5ea; border-radius:6px; padding:.9rem 1.1rem; }
  .bloque h3 { font-family:system-ui,sans-serif; font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.1em; color:var(--gold); margin-bottom:.45rem; }
  .bloque p { margin-bottom:.6rem; }
  .bloque p:last-child { margin-bottom:0; }
  /* EL CUADERNO: lo que ha hecho cada llamada, lo que ha tardado y lo que ha
     costado. Es de la pagina de pruebas: quien compra nunca ve esto. */
  .cuaderno { border:1px dashed rgba(14,63,75,.35); border-radius:8px; padding:1rem 1.2rem; margin-top:1.4rem; background:#fff; }
  .cuaderno summary { font-family:system-ui,sans-serif; font-size:.9rem; font-weight:600; color:var(--teal); cursor:pointer; }
  .cuaderno table { width:100%; border-collapse:collapse; margin-top:.9rem; font-family:system-ui,sans-serif; font-size:.82rem; }
  .cuaderno th { text-align:left; color:var(--gold); text-transform:uppercase; font-size:.66rem; letter-spacing:.08em; padding:.35rem .4rem; border-bottom:1px solid rgba(189,144,72,.3); }
  .cuaderno td { padding:.4rem; border-bottom:1px solid rgba(14,63,75,.08); vertical-align:top; }
  .cuaderno td.der, .cuaderno th.der { text-align:right; white-space:nowrap; }
  /* El modelo y el esfuerzo, en una linea: partidos en dos no se leen. */
  .cuaderno td:nth-child(2), .cuaderno td:nth-child(3) { white-space:nowrap; }
  .cuaderno tr.mal td { background:#fdf1f0; color:#c0392b; }
  .cuaderno tr.suma td { font-weight:700; border-top:2px solid rgba(14,63,75,.2); border-bottom:0; }

  /* Las dos tablas del final, para verlas antes de bajar el PDF. */
  table.ruta { width:100%; border-collapse:collapse; font-family:system-ui,sans-serif; font-size:.85rem; margin-bottom:1.6rem; }
  table.ruta:last-child { margin-bottom:0; }
  table.ruta th { text-align:left; color:var(--gold); text-transform:uppercase; font-size:.68rem; letter-spacing:.1em; padding:.35rem .5rem; border-bottom:1px solid rgba(189,144,72,.4); }
  table.ruta td { padding:.55rem .5rem; border-bottom:1px solid rgba(14,63,75,.08); vertical-align:top; line-height:1.45; }
  table.ruta td.casilla { color:var(--gold); width:1.6rem; }
  table.ruta td.num { color:var(--teal); font-weight:700; width:1.6rem; }

  /* EL DESPLEGABLE DE LA PRIMERA LLAMADA. Es de la pagina de pruebas y solo
     sirve para mirar lo que ha elegido; el dia que esto se lance se va con
     la pagina. Se quita borrando este bloque y la funcion pintarLoDecidido. */
  .decidido { border:1px dashed rgba(14,63,75,.35); border-radius:8px; padding:1rem 1.2rem; margin-top:1.4rem; background:#fff; }
  .decidido summary { font-family:system-ui,sans-serif; font-size:.9rem; font-weight:600; color:var(--teal); cursor:pointer; }
  .decidido .quitadas { font-family:system-ui,sans-serif; font-size:.85rem; margin:.6rem 0; line-height:1.5; }
  .decidido table { width:100%; border-collapse:collapse; margin-top:.9rem; font-family:system-ui,sans-serif; font-size:.85rem; }
  .decidido th { text-align:left; color:var(--gold); text-transform:uppercase; font-size:.68rem; letter-spacing:.1em; padding:.35rem .5rem; border-bottom:1px solid rgba(189,144,72,.3); }
  .decidido td { padding:.5rem; border-bottom:1px solid rgba(14,63,75,.08); vertical-align:top; }
  .decidido td.verbo { font-weight:600; color:var(--teal); }
  /* Al imprimir solo sale el texto. Sin esto, el aviso de la pantalla se
     colaba arriba del todo en el PDF. */
  @media print {
    h1, .sub, select, button, .aviso { display:none !important; }
    body { padding:0; }
    .parte { border:0; box-shadow:none; padding:0 0 1.5rem; page-break-inside:avoid; }
  }
</style>
</head>
<body>
<div class="caja">
  <h1>Tu Plan de Origen — prueba</h1>
  <p class="sub">Solo para ver cómo sale. No manda nada a nadie.</p>

  <select id="quien"><option>Cargando informes…</option></select>

  <button id="ir" disabled>Escribir su plan</button>
  <button id="pdf" hidden>Bajar el PDF</button>

  <p class="aviso" id="aviso"></p>
  <div id="cuaderno"></div>
  <div id="salida"></div>
</div>
<script>
const BLOQUES = ${JSON.stringify(BLOQUES)};
const PUNTOS = ${JSON.stringify(PUNTOS)};
const BLOQUES_DE_CREENCIA = ${JSON.stringify(BLOQUES_DE_CREENCIA)};
const PUNTOS_DE_CREENCIA = ${JSON.stringify(PUNTOS_DE_CREENCIA)};
// El que va sobre beige, aqui y en el PDF: es la orden.
const SOBRE_BEIGE = ['queHaces'];
const quien = document.getElementById('quien');
const ir = document.getElementById('ir');
const pdf = document.getElementById('pdf');
const aviso = document.getElementById('aviso');
const salida = document.getElementById('salida');

const escapar = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Un texto de varios parrafos se pinta con sus parrafos, no en un ladrillo.
const parrafos = t => String(t || '').split(/\\n+/).map(p => p.trim()).filter(Boolean)
  .map(p => '<p>' + escapar(p) + '</p>').join('');

// EL CUADERNO DE TODA LA TANDA. Cada peticion devuelve el suyo -lo que ha
// hecho cada llamada al modelo, cuanto ha tardado y cuanto ha costado- y aqui
// se van juntando todos, salga bien o salga mal.
let elCuaderno = [];
let arrancoLaTanda = 0;

async function llamar(cuerpo) {
  const r = await fetch(location.pathname, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(cuerpo),
  });
  const d = await r.json().catch(() => ({ error:'Respuesta ilegible' }));
  if (Array.isArray(d.cuaderno) && d.cuaderno.length) {
    elCuaderno = elCuaderno.concat(d.cuaderno);
    pintarElCuaderno();
  }
  if (!r.ok) throw new Error(d.error || ('Error ' + r.status));
  return d;
}

(async function cargarLista() {
  try {
    const { informes } = await llamar({ accion:'lista' });
    if (!informes.length) {
      quien.innerHTML = '<option>No hay ningún informe guardado todavía</option>';
      aviso.textContent = 'El guardado es reciente: solo están los informes hechos desde que se puso.';
      return;
    }
    quien.innerHTML = informes.map(i =>
      '<option value="' + escapar(i.compra) + '">' + escapar(i.nombre) + ' — ' + escapar((i.fecha||'').slice(0,10)) + '</option>'
    ).join('');
    ir.disabled = false;
  } catch (e) {
    quien.innerHTML = '<option>No se pudo cargar la lista</option>';
    aviso.className = 'aviso error';
    aviso.textContent = e.message;
  }
})();

// Lo que se va escribiendo se guarda tal cual: el PDF se monta con esto
// mismo, sin volver a pedirle nada al modelo.
let elDocumento = null;

ir.addEventListener('click', async () => {
  ir.disabled = true; quien.disabled = true;
  pdf.hidden = true; elDocumento = null;
  salida.innerHTML = '';
  elCuaderno = []; arrancoLaTanda = Date.now();
  document.getElementById('cuaderno').innerHTML = '';
  aviso.className = 'aviso';
  const compra = quien.value;
  let quienEs = null;

  // 1. La que limpia la lista, y despues la que decide el documento entero.
  let plan;
  let marca = Date.now();
  const cuanto = () => {
    const va = Math.round((Date.now() - marca) / 1000) + 's';
    marca = Date.now();
    return va;
  };
  // LAS CREENCIAS VAN POR SU LADO Y A LA VEZ. Es el otro tema del documento y
  // no depende de las pruebas: en cuanto la lista esta limpia, se pide, y
  // mientras se decide el plan y se escriben las partes, ellas van saliendo.
  let vanCreencias = null;

  aviso.textContent = 'Leyendo su informe…';
  try {
    const uno = await llamar({ accion:'informe', compra });
    quienEs = uno.quien;
    // El servidor no deja pasar un informe sin nombre, asi que esto no
    // deberia saltar nunca. Pero si saltara, es mejor pararse aqui que
    // escribir las partes dirigidas a "undefined".
    if (!quienEs || !quienEs.nombre) throw new Error('El informe ha venido sin el nombre del cliente');
    // Se lanza y no se espera: se recoge al final. El fallo se guarda dentro en
    // vez de soltarlo, para que no se pierda por el camino mientras nadie mira.
    vanCreencias = llamar({ accion:'creencias', sexo:quienEs.sexo, limpia: uno.limpia })
      .then(d => ({ ok:true, creencias: d.creencias || [], revision: d.revision || null }))
      .catch(e => ({ ok:false, error: e.message }));
    aviso.textContent = 'Leído en ' + cuanto() + '. Decidiendo su plan…';
    const dos = await llamar({ accion:'decidir', nombre:quienEs.nombre, sexo:quienEs.sexo, limpia: uno.limpia });
    plan = dos.plan;
  } catch (e) {
    aviso.className = 'aviso error';
    aviso.textContent = 'No se ha podido decidir el plan: ' + e.message;
    ir.disabled = false; quien.disabled = false;
    return;
  }

  // 2. Las partes, TODAS A LA VEZ.
  //
  // Cada una es su propia peticion, asi que lanzarlas juntas no acerca a
  // ninguna al tiempo maximo del servidor. De una en una esto tardaba lo que
  // tardan todas sumadas; asi tarda lo que tarde la mas lenta.
  //
  // Se pintan en su hueco, en el orden del documento, y no segun van llegando:
  // el sitio se reserva antes y cada una cae en el suyo.
  // Lo decidido, arriba del todo y antes de escribir nada: asi se puede mirar
  // mientras se escriben.
  salida.insertAdjacentHTML('beforeend', pintarLoDecidido(plan.partes, plan.limpieza));

  const total = plan.partes.length;
  aviso.textContent = 'Plan decidido en ' + cuanto() + '. Escribiendo las ' + total + ' partes a la vez…';
  const huecos = plan.partes.map((suya, i) => {
    const hueco = document.createElement('div');
    hueco.className = 'parte';
    hueco.innerHTML = cabeceraDeParte(suya, i + 1) + '<p class="aviso">Escribiéndose…</p>';
    salida.appendChild(hueco);
    return hueco;
  });

  // DONDE PUEDE LLAMARLA POR SU NOMBRE. Ninguna de las que escriben ve lo que
  // han puesto las otras, asi que si se deja a su criterio el documento acaba
  // con el nombre repetido en cada parte. Lo reparte el codigo: la primera y
  // una de en medio. Dos veces en todo el documento.
  const conNombre = new Set([0, Math.floor(total / 2)]);

  const escritas = [];

  const pasada = async (cuales, segundaVuelta) => {
    const caidas = [];
    await Promise.all(cuales.map(async i => {
      const suya = plan.partes[i];
      const cabecera = cabeceraDeParte(suya, i + 1);
      try {
        const { parte } = await llamar({ accion:'parte', nombre:quienEs.nombre, sexo:quienEs.sexo,
                                         parte: suya, puedeElNombre: conNombre.has(i) });
        escritas[i] = parte;
        huecos[i].outerHTML = pintarParte(parte, i+1);
      } catch (err) {
        caidas.push(i);
        huecos[i].innerHTML = cabecera + (segundaVuelta
          ? '<p class="error">' + escapar(err.message) + '</p>'
          : '<p class="aviso">Se ha caído, se vuelve a pedir…</p>');
      }
    }));
    return caidas;
  };

  // Y SE INSISTE HASTA TRES VECES CON LA QUE SE CAIGA.
  //
  // Una parte que no vuelve deja el documento con un agujero, y entonces no se
  // puede entregar. Como cada parte es su propia peticion y es corta, insistir
  // con la que ha fallado no le quita tiempo a las demas -ya han terminado- y
  // casi siempre entra a la segunda: lo que se cae aqui es la linea, no el
  // texto.
  //
  // TRES. Se bajo a dos para ahorrar tiempo y fue un error: en un plan de
  // verdad se cayeron tres partes, se acabaron las vueltas y la clienta se
  // quedo SIN PDF despues de cuatro minutos.
  //
  // Y una vuelta de mas no cuesta lo que parece: solo se vuelven a pedir las
  // que se han caido, no todas, y las demas ya han terminado. Si no se cae
  // ninguna -que es lo normal- estas vueltas no existen y no cuestan nada.
  const INTENTOS = 3;
  let caidas = plan.partes.map((_, i) => i);
  for (let vuelta = 1; vuelta <= INTENTOS && caidas.length; vuelta++) {
    if (vuelta > 1) aviso.textContent = 'Se han caído ' + caidas.length + ', se piden otra vez…';
    caidas = await pasada(caidas, vuelta === INTENTOS);
  }

  const completas = escritas.filter(Boolean);

  // 3. Y LAS CREENCIAS, QUE LLEVAN TODO ESTE RATO SALIENDO POR SU LADO.
  //
  // Se pidieron a la vez que el plan, asi que a estas alturas lo normal es que
  // ya esten: aqui solo se recogen y se escriben, igual que las partes.
  aviso.textContent = 'Las pruebas, en ' + cuanto() + '. Ahora sus creencias…';
  const suyas = await vanCreencias;

  let laProgramacion = [];
  let enteras = false;

  if (!suyas.ok) {
    salida.insertAdjacentHTML('beforeend',
      '<p class="aviso error">No han salido sus creencias: ' + escapar(suyas.error) + '</p>');
  } else if (!suyas.creencias.length) {
    salida.insertAdjacentHTML('beforeend', '<p class="aviso error">No ha salido ninguna creencia.</p>');
  } else {
    const cuantasC = suyas.creencias.length;
    aviso.textContent = 'Han salido ' + cuantasC + ' creencias. Escribiéndolas todas a la vez…';

    // Lo que ha hecho cada llamada de este tema, antes de escribir nada: asi se
    // puede mirar mientras se escriben.
    salida.insertAdjacentHTML('beforeend', pintarLasCreencias(suyas.creencias, suyas.revision));

    const huecosC = suyas.creencias.map((suya, i) => {
      const hueco = document.createElement('div');
      hueco.className = 'parte';
      hueco.innerHTML = cabeceraDeParte(suya, i + 1) + '<p class="aviso">Escribiéndose…</p>';
      salida.appendChild(hueco);
      return hueco;
    });

    const escritasC = [];
    const pasadaDeCreencias = async (cuales, segundaVuelta) => {
      const caidas = [];
      await Promise.all(cuales.map(async i => {
        const suya = suyas.creencias[i];
        const cabecera = cabeceraDeParte(suya, i + 1);
        try {
          const { creencia } = await llamar({ accion:'creencia', nombre:quienEs.nombre,
                                              sexo:quienEs.sexo, creencia: suya });
          escritasC[i] = creencia;
          huecosC[i].innerHTML = pintarCreencia(creencia, i + 1);
        } catch (err) {
          caidas.push(i);
          huecosC[i].innerHTML = cabecera + (segundaVuelta
            ? '<p class="error">' + escapar(err.message) + '</p>'
            : '<p class="aviso">Se ha caído, se vuelve a pedir…</p>');
        }
      }));
      return caidas;
    };

    // Y SE INSISTE HASTA TRES VECES CON LA QUE SE CAIGA, por lo mismo que en
    // las partes: solo se vuelve a pedir la que ha fallado, y casi siempre
    // entra a la segunda.
    let caidasC = suyas.creencias.map((_, i) => i);
    for (let vuelta = 1; vuelta <= INTENTOS && caidasC.length; vuelta++) {
      if (vuelta > 1) aviso.textContent = 'Se han caído ' + caidasC.length + ' creencias, se piden otra vez…';
      caidasC = await pasadaDeCreencias(caidasC, vuelta === INTENTOS);
    }

    laProgramacion = escritasC.filter(Boolean);
    enteras = laProgramacion.length === cuantasC;

    // ── Y QUE NO SE REPITA NINGUNA FRASE ENTRE ELLAS ──────────
    //
    // Una sola vuelta: a la que repite se le dice la frase y la escribe de
    // otra manera. Si esa vuelta se cae, se queda la que habia, que una frase
    // repetida no vale perder el documento.
    if (enteras) {
      const repiten = frasesRepetidas(escritasC.map(c => PUNTOS_DE_CREENCIA.map(p => c[p]).join(' ')));
      if (repiten.size) {
        aviso.textContent = 'Hay ' + repiten.size + ' que repiten una frase, se piden otra vez…';
        await Promise.all([...repiten].map(async ([i, frase]) => {
          try {
            const { creencia } = await llamar({ accion:'creencia', nombre:quienEs.nombre,
                                                sexo:quienEs.sexo, creencia: suyas.creencias[i],
                                                prohibida: frase });
            escritasC[i] = creencia;
            huecosC[i].innerHTML = pintarCreencia(creencia, i + 1);
          } catch (err) {
            console.warn('[p2] la creencia ' + (i + 1) + ' repetía una frase y no se ha podido rehacer: ' + err.message);
          }
        }));
        laProgramacion = escritasC.filter(Boolean);
      }
    }
  }

  // 4. Y LA HOJA DE RUTA, QUE ES LO ULTIMO.
  //
  // Resume las dos cosas, asi que solo se puede pedir cuando las dos estan
  // enteras. Si falta alguna, no hay nada que resumir.
  let hojaDeRuta = null;
  if (completas.length === total && enteras) {
    aviso.textContent = 'Todo escrito en ' + cuanto() + '. Resumiendo su hoja de ruta…';
    // Lo que se le manda de cada cosa: su numero, su titulo y su texto.
    const enCorto = (cosa, i, puntos) => {
      const suyo = { numero: i + 1, titulo: cosa.titulo, area: cosa.area };
      puntos.forEach(punto => { suyo[punto] = cosa[punto]; });
      return suyo;
    };
    try {
      // LAS DOS VAN COMO SE ESCRIBIERON, que es lo que el cliente lee: la
      // tabla es su resumen, asi que se hace con ese mismo texto.
      const { tablas } = await llamar({ accion:'tablas', sexo:quienEs.sexo,
        partes: completas.map((p, i) => enCorto(p, i, PUNTOS)),
        creencias: laProgramacion.map((c, i) => enCorto(c, i, PUNTOS_DE_CREENCIA)) });
      hojaDeRuta = tablas;
      salida.insertAdjacentHTML('beforeend', pintarLaHojaDeRuta(tablas));
    } catch (e) {
      salida.insertAdjacentHTML('beforeend',
        '<p class="aviso error">No ha salido su hoja de ruta: ' + escapar(e.message) + '</p>');
    }
  }

  // EL PDF SOLO SE OFRECE SI ESTA TODO. Con una parte caida -o sin sus
  // creencias, o sin su hoja de ruta- saldria un documento con un agujero
  // dentro, y eso no se le ensena a nadie.
  if (completas.length === total && enteras && hojaDeRuta) {
    elDocumento = {
      nombre: quienEs.nombre,
      // El numero que le toca a cada parte y los nombres de sus puntos van
      // desde aqui: el que maqueta no tiene que saberselos.
      partes: completas.map((p, i) => ({ ...p, numero: i + 1, nombres: BLOQUES })),
      creencias: laProgramacion.map((c, i) => ({ ...c, numero: i + 1, nombres: BLOQUES_DE_CREENCIA })),
      tablas: hojaDeRuta,
    };
    pdf.hidden = false;
    aviso.textContent = 'Listo. Ya se puede bajar el PDF.';
  } else {
    aviso.textContent = 'Listo, pero falta alguna pieza: el PDF no se monta a medias.';
  }
  ir.disabled = false; quien.disabled = false;
});

pdf.addEventListener('click', async () => {
  if (!elDocumento) return;
  pdf.disabled = true;
  const antes = aviso.textContent;
  aviso.className = 'aviso';
  aviso.textContent = 'Montando el PDF…';
  try {
    const r = await fetch('/api/p2-plan/pdf', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(elDocumento),
    });
    const d = await r.json().catch(() => ({ error:'Respuesta ilegible' }));
    if (!r.ok) throw new Error(d.error || ('Error ' + r.status));
    const a = document.createElement('a');
    a.href = d.pdfBase64;
    a.download = 'TuPlanDeOrigen_' + String(elDocumento.nombre || 'plan').replace(/[^A-Za-z0-9]/g,'_') + '.pdf';
    a.click();
    aviso.textContent = d.fallos ? ('PDF bajado, pero no cargó: ' + d.fallos.join(', ')) : antes;
  } catch (e) {
    aviso.className = 'aviso error';
    aviso.textContent = 'No se ha podido montar el PDF: ' + e.message;
  }
  pdf.disabled = false;
});

// LO QUE HA DECIDIDO LA LLAMADA DEL PLAN, PARA PODER MIRARLO.
//
// De la pagina de pruebas y de ningun sitio mas: la clienta nunca ve esto. Es
// para ver de un vistazo cuantas partes han salido, de que desafios sale cada
// una y que le pide hacer, que es lo unico que hay que mirar para saber si esa
// llamada lo ha hecho bien o esta repitiendo.
function pintarLoDecidido(partes, limpieza) {
  // La descripcion de cada desafio que se quedo, por su numero.
  const suDescripcion = new Map(((limpieza && limpieza.quedados) || []).map(x => [x.numero, x.descripcion]));
  // De que desafio de la lista sale cada parte.
  const filas = partes.map(p => {
    const cual = (p.deCuales || [])[0];
    return '<tr>' +
      '<td>' + escapar((p.deCuales || []).join(', ')) + '</td>' +
      '<td>' + escapar(suDescripcion.get(cual) || '') + '</td>' +
      '<td>' + escapar(p.titulo || '') + '</td>' +
      '<td>' + escapar(p.queHaces || '') + '</td>' +
    '</tr>';
  }).join('');

  return '<details class="decidido" open><summary>Las pruebas — ' + partes.length +
    '</summary>' +
    '<table><tr><th>Desafío</th><th>Descripción</th><th>Título</th><th>Lo que le manda hacer</th></tr>' +
    filas + '</table></details>';
}

// La cabecera de una parte: su numero, el titulo del desafio y, al lado, el
// area de la que sale. La misma que lleva el PDF.
function cabeceraDeParte(p, n) {
  const elArea = p.area ? ' <span class="area">(' + escapar(String(p.area).toUpperCase()) + ')</span>' : '';
  return '<h2>' + n + '. ' + escapar(p.titulo) + elArea + '</h2>';
}

// Cada parte con sus puntos, cada uno con su nombre para saber de que habla y
// para poder volver a buscarlo.
function pintarParte(p, n) {
  const bloques = PUNTOS.map(punto => {
    const dentro = parrafos(p[punto]);
    return SOBRE_BEIGE.includes(punto)
      ? '<div class="bloque beige"><h3>' + escapar(BLOQUES[punto]) + '</h3><div class="caja-texto">' + dentro + '</div></div>'
      : '<div class="bloque"><h3>' + escapar(BLOQUES[punto]) + '</h3>' + dentro + '</div>';
  }).join('');
  return '<div class="parte">' + cabeceraDeParte(p, n) + bloques + '</div>';
}

// LAS FRASES QUE SE REPITEN ENTRE CREENCIAS.
//
const PALABRAS_QUE_SE_REPITEN = ${PALABRAS_QUE_SE_REPITEN};

${frasesRepetidas}

// LO QUE HA HECHO EL TEMA DE LAS CREENCIAS, PARA PODER MIRARLO.
//
// De la pagina de pruebas y de ningun sitio mas. Se ve de un vistazo cuantas
// saco la primera llamada, cuales quito la limpieza, cuales quito el repaso y
// con cuales se ha quedado, con su puntuacion y de que desafio sale cada una.
function pintarLasCreencias(creencias, revision) {
  const r = revision || {};
  const entraron = Array.isArray(r.entraron) ? r.entraron : [];
  const fuera0 = Array.isArray(r.quitaFondo) ? r.quitaFondo : [];
  const fuera1 = Array.isArray(r.quitaLimpieza) ? r.quitaLimpieza : [];
  const fuera2 = Array.isArray(r.quitaRepaso) ? r.quitaRepaso : [];

  const lista = (titulo, cuales) => cuales.length
    ? '<p class="quitadas"><b>' + titulo + ' ' + cuales.length + ':</b> ' +
      cuales.map(c => escapar(c.titulo) + ' — ' + escapar(c.linea)).join(' · ') + '</p>'
    : '<p class="quitadas"><b>' + titulo + ' ninguna.</b></p>';

  const filas = creencias.map(c =>
    '<tr>' +
      '<td>' + escapar(c.numero) + '</td>' +
      '<td>' + escapar(c.puntuacion) + '</td>' +
      '<td class="verbo">' + escapar(c.titulo) + '</td>' +
      '<td>' + escapar((c.deCuales || []).join(', ')) + '</td>' +
      '<td>' + escapar(c.linea) + '</td>' +
    '</tr>').join('');

  return '<details class="decidido" open><summary>Las creencias — ' +
    (entraron.length || creencias.length) + ' salieron, quedan ' + creencias.length + '</summary>' +
    lista('Salían de un solo desafío', fuera0) +
    lista('Quitó la limpieza', fuera1) + lista('Quitó el repaso', fuera2) +
    '<table><tr><th>Nº</th><th>Peso</th><th>Creencia</th><th>Desafíos</th><th>De dónde le viene</th></tr>' +
    filas + '</table></details>';
}

// EL CUADERNO, PARA REVISARLO.
//
// Una fila por cada llamada que se le ha hecho al modelo, en el orden en que
// han ido volviendo: cual es, con que modelo, cuanto ha razonado, lo que ha
// tardado, los tokens que ha gastado, lo que ha costado y si ha salido bien.
// Las que se han caido salen en rojo con su motivo.
//
// EL RELOJ DE ABAJO NO ES LA SUMA. Muchas van a la vez, asi que la suma de sus
// tiempos es mas grande que lo que se ha esperado de verdad: las dos cosas
// salen, y la que importa para el cliente es el reloj.
function pintarElCuaderno() {
  const hueco = document.getElementById('cuaderno');
  if (!hueco || !elCuaderno.length) return;

  const segundos = elCuaderno.reduce((a, l) => a + (Number(l.segundos) || 0), 0);
  const dolares = elCuaderno.reduce((a, l) => a + (Number(l.dolares) || 0), 0);
  const entrada = elCuaderno.reduce((a, l) => a + (Number(l.entrada) || 0), 0);
  const salidaT = elCuaderno.reduce((a, l) => a + (Number(l.salida) || 0), 0);
  const caidas = elCuaderno.filter(l => !l.ok).length;
  const reloj = arrancoLaTanda ? Math.round((Date.now() - arrancoLaTanda) / 100) / 10 : 0;

  const filas = elCuaderno.map(l =>
    '<tr class="' + (l.ok ? '' : 'mal') + '">' +
      '<td>' + escapar(l.que) + (l.ok ? '' : ' — ' + escapar(l.fallo || 'se ha caído')) + '</td>' +
      '<td>' + escapar(String(l.modelo || '').replace('claude-', '')) + '</td>' +
      '<td>' + escapar(l.piensa || 'sin razonar') + '</td>' +
      '<td class="der">' + escapar(l.segundos) + ' s</td>' +
      '<td class="der">' + escapar(l.entrada) + '</td>' +
      '<td class="der">' + escapar(l.salida) + '</td>' +
      '<td class="der">' + (Number(l.dolares) || 0).toFixed(4) + ' $</td>' +
    '</tr>').join('');

  hueco.innerHTML = '<details class="cuaderno" open><summary>Las llamadas — ' +
    elCuaderno.length + ', ' + reloj + ' s de reloj, ' + dolares.toFixed(3) + ' $' +
    (caidas ? ' · ' + caidas + ' se han caído' : '') + '</summary>' +
    '<table><tr><th>Llamada</th><th>Modelo</th><th>Razona</th><th class="der">Tiempo</th>' +
    '<th class="der">Entrada</th><th class="der">Salida</th><th class="der">Coste</th></tr>' +
    filas +
    '<tr class="suma"><td colspan="3">TOTAL · ' + reloj + ' s de reloj</td>' +
    '<td class="der">' + segundos.toFixed(1) + ' s</td>' +
    '<td class="der">' + entrada + '</td><td class="der">' + salidaT + '</td>' +
    '<td class="der">' + dolares.toFixed(4) + ' $</td></tr>' +
    '</table></details>';
}

// Las dos tablas del final, tal y como van a salir en el PDF: su casilla, su
// numero y las columnas con los mismos nombres que lleva el documento dentro.
function pintarLaHojaDeRuta(tablas) {
  const unaTabla = (filas, puntos, nombres) => {
    if (!Array.isArray(filas) || !filas.length) return '';
    return '<table class="ruta"><tr><th></th><th></th>' +
      puntos.map(punto => '<th>' + escapar(nombres[punto]) + '</th>').join('') + '</tr>' +
      filas.map(f => '<tr><td class="casilla">☐</td><td class="num">' + escapar(f.numero) + '</td>' +
        puntos.map(punto => '<td>' + escapar(f[punto]) + '</td>').join('') + '</tr>').join('') +
      '</table>';
  };
  return '<div class="parte">' +
    unaTabla(tablas.pruebas, PUNTOS, BLOQUES) +
    unaTabla(tablas.creencias, PUNTOS_DE_CREENCIA, BLOQUES_DE_CREENCIA) +
  '</div>';
}

// Y cada creencia con sus dos bloques. Va en texto corrido, sin fondo: aqui no
// hay ninguna orden que vuelva a buscar, solo lo que cree y lo que es verdad.
function pintarCreencia(c, n) {
  const bloques = PUNTOS_DE_CREENCIA.map(punto =>
    '<div class="bloque"><h3>' + escapar(BLOQUES_DE_CREENCIA[punto]) + '</h3>' + parrafos(c[punto]) + '</div>'
  ).join('');
  // Va DENTRO del hueco que ya tiene su sitio, no en vez de el: asi se puede
  // volver a pintar la misma si hay que rehacerla.
  return cabeceraDeParte(c, n) + bloques;
}
</script>
</body>
</html>`;
