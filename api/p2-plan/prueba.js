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
//   UNA LLAMADA LIMPIA LA LISTA, Y NO HACE NADA MAS. Recibe todo lo que a esta
//   persona le cuesta, sacado del P1, y dice cuales se quedan: fuera los que
//   dicen practicamente lo mismo y los que se contradicen entre si.
//   Devuelve numeros, no texto. Es la que compara, y por eso es la que piensa.
//
//   OTRA DECIDE, con las que han quedado. De cada una saca en corto el titulo y
//   los cuatro puntos. No compara nada -ya viene limpio- y no escribe ni una
//   linea de lo que ella va a leer.
//
//   UNA POR PARTE ESCRIBEN, TODAS A LA VEZ. Cada una recibe solo las cuatro
//   lineas de su parte, y nada mas. No deciden: abren esas cuatro lineas hasta
//   que se entiendan a la primera.
//
//
// POR QUE LIMPIAR VA APARTE. Estuvo junto con decidir, y no salia: mientras
// comparaba dieciocho desafios entre si estaba tambien redactando el titulo y
// las cuatro lineas de cada uno, sesenta y cinco lineas, y el trabajo de
// redactar se comia al de comparar. En un plan de verdad, de dieciocho
// desafios salieron trece partes -o sea que no limpio nada- y tres de ellas
// mandaban hacer lo mismo. Se reescribio la instruccion tres veces y siguio
// igual: no era la instruccion, era que la llamada tenia dos trabajos.
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

AFIRMA. Dices las cosas y sigues. No las razonas, no las justificas y no las matizas: cada matiz que añades le quita fuerza a lo que acabas de decir y le obliga a sostener dos cosas a la vez. Si has escrito una frase para suavizar la anterior, bórrala.

EMPIEZAS POR QUIEN LEE. Lo primero que lee es algo suyo: lo que hace, lo que siente o lo que se dice, nunca una idea ni una explicación. Y cuando le presentes algo por el camino, entras igual, por lo que le pasa y no por el concepto. Eso no quiere decir que todos los párrafos arranquen igual: si dos empiezan con la misma forma, cambias uno.

LE PONES SUS PALABRAS. Lo que se dice por dentro, entrecomillado, en primera persona y tal como suena de verdad, no arreglado. Es lo que le hace levantar la cabeza y decir esto va por mí. Una o dos en lo que escribas y no más: en cuanto se repiten en cada párrafo dejan de sonar suyas y se convierten en una muletilla.

TE PONES A SU LADO. Le hablas desde dentro de lo que le pasa, no desde arriba. Nada de darle una lección, ni de explicarle lo que ya sabe con otras palabras.

LE DAS LA RAZÓN ANTES DE PEDIRLE NADA. Primero le reconoces por qué hace lo que hace y que en su momento le sirvió. Después le dices lo que cambia, y eso se dice entero y sin rodeos. Reconocerlo no es suavizarlo.

LE MANDAS EN DIRECTO. Cuando le digas lo que hace, se lo dices con verbos y a la cara. Nada de rodeos ni de condicionales encadenados.

REPITES LO QUE IMPORTA. Dentro de un mismo texto, una frase que quieres que se le quede se puede repetir tal cual, y funciona. Lo que no vale es contarle la misma idea otra vez con otras palabras para rellenar: eso lo nota y le hace pensar que hay más de lo que hay. Y si te piden varias cosas por separado, cada una dice lo suyo y no vuelve sobre lo que ya está dicho en otra.

TIENE CALOR. Se le nota que quien escribe está de su lado y que se alegra por quien lee. Sin animarle con frases que le valdrían a cualquiera, y sin dorarle nada.

Y CON ESTO SE ENTIENDE A LA PRIMERA:

- LÉELA POR DENTRO ANTES DE DARLA POR BUENA. Si nadie diría esa frase hablando, está mal y se reescribe. No fuerces la gramática para que suene elaborado, y no cojas un verbo raro cuando el normal dice lo mismo.
- SE DICE LA COSA, NO UNA FIGURA DE LA COSA. Nada de metáforas, ni de comparaciones inventadas, ni de partes suyas que se mueven o chocan como si tuvieran vida propia. Se dice lo que hace la persona, con palabras que se puedan agarrar.
- SI TAPAS TODO LO DEMÁS Y ESA FRASE SOLA NO DICE NADA CONCRETO DE QUIEN LO LEE, está mal escrita. Contar cómo se siente algo no es contar qué es.
- LAS PALABRAS SON LAS DE TODOS LOS DÍAS. Si una palabra la verías antes en un informe que dicha en una conversación, va fuera. Lo tiene que entender alguien de dieciocho años sin releer.
- SE ESCRIBE CON COMAS Y SEGUIDO, como habla alguien. Donde una persona hablando uniría dos trozos con una coma, va la coma y no un punto. Pero una frase lleva UNA idea: si al leerla en voz alta te falta el aire o tienes que volver atrás, lleva dos dentro y se parte.
- NO SE CONVIERTE EN COSA LO QUE HACE. Nada de coger su conducta, volverla un sustantivo y colgársela con un posesivo delante: se dice con un verbo, qué hace.
- NO EMPIECES DOS PÁRRAFOS CON LA MISMA ESTRUCTURA. Varía los arranques.
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
  queHaces:     'Qué haces',
  dondeTeCaes:  'Dónde te vas a caer y qué hacer cuando te caigas',
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
// LA UNICA PUERTA AL MODELO
// ════════════════════════════════════════════════════════════════
//
// Todo lo que se le pide al modelo pasa por aqui: mismo trato de los fallos,
// mismo molde y un solo sitio donde cambiar lo que valga para todos.
//
// "piensa" es con cuanto esfuerzo razona. Vacio, no razona: entonces se apaga
// del todo, porque encendido a medias se gasta el presupuesto pensando en vez
// de escribir y la respuesta llega cortada.

async function alModelo({ que, modelo, piensa, techo, system, mensaje, molde, espera }) {
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

// TODO LO QUE SE LE MANDA AL MODELO PARA QUE DECIDA, y no hay nada mas.
//
// SOLO LO QUE LE CUESTA. Lo que se le da bien no es lo que tiene que cambiar,
// y meterlo aqui solo le da sitio para mandarle hacer mas de lo que ya hace
// bien, que no la mueve.
//
// Y SIN DECIR DE QUE AREA ES CADA UNO, a proposito. Las areas son del P1 y
// sirven para contarle como es; aqui estorban. Si se le dicen, reparte las
// cosas por areas para que salgan todas, y entonces vuelve el relleno: en un
// area donde no hay nada fuerte se inventa algo para llenarla. Sin etiquetas
// mira los desafios por lo que dicen, que es lo unico que importa.
//
// SE MANDA LA DESCRIPCION, NO EL TITULO. Dos desafios que dicen lo mismo
// suelen llevar titulos muy distintos -es lo que hace el P1 al escribirlos-,
// asi que comparar por el titulo no junta nada. Por la descripcion si.
//
function susDesafios(rasgos) {
  return (rasgos?.desafios || [])
    .filter(r => r && String(r.descripcion || '').trim())
    .map((r, i) => `${i + 1}. ${String(r.descripcion).trim()}`)
    .join('\n\n');
}

// Cuantos le han llegado, para saber si hay con que hacer un plan.
const cuantosDesafios = rasgos => (rasgos?.desafios || [])
  .filter(r => r && String(r.descripcion || '').trim()).length;

// La lista tal y como se le manda, para poder recorrerla por su numero.
const losDesafios = rasgos => (rasgos?.desafios || [])
  .filter(r => r && String(r.descripcion || '').trim());

// ════════════════════════════════════════════════════════════════
// PASO 1: LIMPIAR LA LISTA, Y NADA MAS
// ════════════════════════════════════════════════════════════════
//
// Esta llamada hace UNA cosa: leer las descripciones y decir cuales se quedan.
//
// POR QUE VA SOLA, Y ESTO SE APRENDIO CARO. Antes esto lo hacia la misma
// llamada que decidia el contenido de cada parte. O sea que mientras comparaba
// dieciocho desafios entre si, estaba tambien redactando el titulo y las cuatro
// lineas de cada uno: unas sesenta y cinco lineas. Y las dos cosas a la vez no
// salen. En un plan de verdad, de dieciocho desafios saco trece partes -no
// limpio nada- y tres de ellas le mandaban lo mismo.
//
// No era la instruccion: se reescribio tres veces y siguio igual. Era que la
// llamada tenia dos trabajos y el de redactar se comia al de comparar.
//
// AQUI SOLO DEVUELVE NUMEROS. Los desafios van numerados en la lista que se le
// manda, asi que para decir "el 11 dice lo mismo que el 7" le basta con
// escribir una cifra. Escribe cuatro lineas en total en vez de sesenta y cinco,
// y por eso todo el esfuerzo se le va en lo unico que tiene que hacer.
//
// Y POR ESO PUEDE PENSAR. Comparar dieciocho con dieciocho son ciento cincuenta
// y tres comparaciones: eso es pensar, y a esfuerzo bajo no se hace. Antes
// estaba en bajo -lo puse yo, para que fuera rapido- y por eso no comparaba.
// Ahora va en medio, que es lo que cuesta comparar, y aun asi termina rapido
// porque no escribe nada.
const ESPERA_DE_LIMPIAR_MS = 90000;
// EL TECHO, HOLGADO, Y NO POR LO QUE ESCRIBE. Lo que escribe son unos cuantos
// numeros. Pero PENSAR sale del MISMO sitio, y esta es la llamada que mas
// piensa de las tres -comparar dieciocho con dieciocho-. Si se lo come, la
// respuesta llega cortada y hay que pedirlo todo otra vez.
//
// Es un techo, no un objetivo: solo se paga lo que sale. Tenia la mitad que la
// llamada de al lado, y es justo al reves de lo que hace falta.
const TECHO_DE_LIMPIAR = 32000;

const MOLDE_DE_LIMPIAR = {
  type: 'object',
  properties: {
    sequedan: { type: 'array', items: { type: 'integer' } },
    sequitan: { type: 'array', items: { type: 'integer' } },
  },
  required: ['sequedan', 'sequitan'],
  additionalProperties: false,
};

async function limpiarLaLista({ rasgos, espera = ESPERA_DE_LIMPIAR_MS, modelo = EL_QUE_DECIDE }) {
  const desafios = losDesafios(rasgos);

  // Y AQUI NO VA NADA MAS QUE LA LISTA Y SU INSTRUCCION.
  //
  // Las otras dos llamadas empiezan con el bloque que explica que es este
  // producto, y lo necesitan: una decide que le manda hacer y la otra le
  // escribe. Esta no. Esta solo tiene que mirar una lista y decir cuales dicen
  // lo mismo, y para eso no le hace falta saber que es el P2, ni como se le
  // habla a la clienta, ni que lleva el documento.
  //
  // Estaba puesto, y eran mil setecientas letras: casi la mitad de lo que leia
  // no le servia para su trabajo. Se copio al partir la llamada en dos, sin
  // preguntarse si hacia falta.
  const encargo = `Abajo tienes los desafíos interiores de una persona. Cada uno está escrito por separado y está enumerado.

QUÉ SE QUITA

Revisa la descripción de todos los desafíos. Elimina los que dicen prácticamente lo mismo sobre la persona, los que sean la misma idea, dejando solo 1 de ellos, el que más pese. Y elimina los que se contradigan entre sí, dejando solo uno de ellos, el que más pese.

Pesa más el que sea más concreto y central para la persona, no el más genérico.

LO QUE DEVUELVES

"sequedan": los números de los que se quedan, en el orden de abajo.
"sequitan": los números de los que quitas.

Cada número tiene que quedar en una sola, nunca en las 2. Todos los números de la lista tienen que aparecer en "sequedan" o en "sequitan", ninguno se queda fuera y ninguno se repite en las dos.

LA LISTA:

${susDesafios(rasgos)}`;

  const salida = await alModelo({
    que: 'limpiar la lista',
    modelo,
    piensa: 'medium',
    techo: TECHO_DE_LIMPIAR,
    system: encargo,
    mensaje: 'Di cuáles se quedan y cuáles se quitan, siguiendo el esquema.',
    molde: MOLDE_DE_LIMPIAR,
    espera: AbortSignal.timeout(espera),
  });

  // Solo numeros que existan, sin repetir y en el orden de la lista.
  const validos = new Set(desafios.map((_, i) => i + 1));
  const sequedan = [...new Set((Array.isArray(salida.sequedan) ? salida.sequedan : [])
    .map(Number).filter(n => validos.has(n)))].sort((a, b) => a - b);

  const sequitan = [...new Set((Array.isArray(salida.sequitan) ? salida.sequitan : [])
    .map(Number).filter(n => validos.has(n) && !sequedan.includes(n)))].sort((a, b) => a - b);

  // SI SE DEJA ALGUNO SIN CLASIFICAR, SE QUEDA. Un desafio que no esta ni en una
  // lista ni en la otra es un descuido suyo, no una decision: tirarlo seria
  // quitarle a la clienta algo que nadie ha decidido quitar.
  const olvidados = [...validos].filter(n => !sequedan.includes(n) && !sequitan.includes(n));
  if (olvidados.length) {
    console.warn(`[p2] la limpieza no ha dicho nada de ${olvidados.join(', ')}: se quedan`);
    sequedan.push(...olvidados);
    sequedan.sort((a, b) => a - b);
  }

  return {
    sequedan,
    sequitan,
    // Los que se quedan, con su titulo, su descripcion y su porque, ya listos
    // para el paso siguiente.
    lista: sequedan.map((n, i) => {
      const r = desafios[n - 1];
      return `${i + 1}. ${String(r.nombre || '').trim()}\n   ${String(r.descripcion).trim()}` +
        (r.causa ? `\n   PORQUE: ${String(r.causa).trim()}` : '');
    }).join('\n\n'),
    // El titulo de cada uno, en el mismo orden que la lista de arriba.
    titulos: sequedan.map(n => String(desafios[n - 1].nombre || '').trim()),
    // De que numero de la lista original sale cada una, para poder mirarlo.
    deCuales: sequedan,
  };
}

// ════════════════════════════════════════════════════════════════
// PASO 2: DECIDIR, CON LA LISTA YA LIMPIA
// ════════════════════════════════════════════════════════════════
//
// De cada cosa que ha quedado saca el titulo y sus cuatro puntos, en corto. No
// escribe ni una linea de lo que ella va a leer: eso lo hacen las que vienen
// despues.
//
// AQUI NO SE COMPARA NADA, y por eso no hace falta que piense mucho. Lo que
// hace es mirar un desafio y decidir que conducta le manda cambiar, uno por
// uno. Eso es criterio, y el criterio lo pone el modelo -Opus-, no el rato que
// piense. Va a esfuerzo BAJO.
//
// Bajo y no apagado porque aqui se decide lo que ella tiene que hacer, que es
// por lo que ha pagado, y en eso no se ahorra.
//
// SALE UNA PARTE POR CADA COSA DE LA LISTA. Ni junta ni quita: eso ya se hizo.
// Si vuelve con menos partes de las que habia, es que se ha dejado alguna y se
// pide otra vez.
//
// TODO EL DOCUMENTO TIENE QUE ESTAR EN DOS MINUTOS Y MEDIO. Esa es la regla, y
// de ahi salen los numeros de aqui abajo, no al reves.
//
// EL REPARTO, y esta vez cuadra con lo que hace el codigo:
//    90 s para limpiar la lista, que es lo unico que compara. Piensa, pero
//        escribe cuatro lineas, asi que termina rapido.
//    90 s para decidir el plan con los que queden. Ya no compara nada, asi
//        que no necesita el rato que necesitaba antes.
//    90 s para el segundo intento, que va SIEMPRE con Sonnet. Ese intento no
//        esta para pensar mejor: esta para arreglar algo concreto que se le
//        dice, y Sonnet lo hace en 24 segundos medidos.
//    60 s para escribir, y las partes van todas a la vez, asi que ese es el
//        tope de UNA, no el de la suma.
//
// El peor caso de una peticion es 90 + 90 + 90 = 270, por debajo de los 285
// que se dejan de margen, y solo se da si todo sale mal dos veces seguidas.
// Lo normal son unos 40 segundos para limpiar, otros 40 para decidir y 40 mas
// para escribir, que van todas a la vez: unos dos minutos en total.
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

No le expliques como es o porque, ni de dónde le viene lo que hace, ni le busques la causa, ni le pongas nombre a lo que le pasa. Eso ya lo tiene.

Ahora lo que necesitamos es: que haría su mejor versión, lo que tiene que cambiar y qué hace para conseguirlo con éxito, siendo humana la persona.

Lo que le cuesta no es su defecto, es su prueba: de ahí sale lo que tiene que hacer.

Aquí no se escribe el documento, aquí se decide. Todo en corto, una línea cada cosa.

DE CADA UNO DE LOS QUE HAY ABAJO, ESTO

Sale una parte por cada uno de la lista. De cada uno sacas cuatro cosas, una línea cada una, y ninguna se queda vacía.

deCuales — El número de la lista del que sale esta parte.

tuPrueba — Cuál es la prueba que le pone delante la vida aquí, qué debe cambiar y en quién se convierte cuando lo transforma y lo logra.

queHaces — Una sola cosa que tiene que hacer para cambiar ese desafío y transformarlo en positivo. Debe ser algo que realmente le funcione a un humano. Nada de autoayuda barata: esto debe saber hacerlo y funcionarle bien.

dondeTeCaes — El autosabotaje que aparecerá cuando intente cambiarlo a mejor, qué puede pasarle cuando le salga el autosabotaje, lo que le impedirá cambiarlo a bien. Y qué debe hacer cuando eso pase para volver al camino, solo el paso concreto.

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
    // ESFUERZO BAJO, y aqui si es lo correcto: la lista ya viene limpia, asi
    // que no queda nada que comparar. Lo que hace es mirar un desafio y decidir
    // la conducta que le manda cambiar, uno por uno. Eso es criterio, no
    // comparacion, y el criterio lo pone el modelo -Opus-, no el rato que
    // piense.
    //
    // Se le deja bajo y no apagado porque aqui se decide lo que ella tiene que
    // hacer, que es por lo que ha pagado, y en eso no se ahorra. Cuesta unos
    // segundos y escribe poco.
    piensa: 'low',
    techo: TECHO_DEL_PLAN,
    system: encargo,
    mensaje: `Decide su plan entero, siguiendo el esquema.${recordatorio}`,
    molde: MOLDE_DEL_PLAN,
    espera: AbortSignal.timeout(espera),
  });

  // Lo que ha decidido, limpio y en el orden en que lo ha puesto.
  const partes = [];
  for (const p of (Array.isArray(salida.partes) ? salida.partes : [])) {
    // Los numeros que devuelve son los de la lista LIMPIA que se le paso.
    const crudos = (Array.isArray(p?.deCuales) ? p.deCuales : [])
      .map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= limpia.sequedan.length);
    const suyo = {
      // Se traducen a los de la lista original, que es lo que se mira en la
      // pagina para saber de que desafio de verdad sale cada parte.
      deCuales: crudos.map(n => limpia.deCuales[n - 1]).filter(Boolean),
      // EL TITULO ES EL DEL DESAFIO, y lo pone el programa: lo tiene tal cual
      // lo escribio el P1, asi que no hace falta que nadie lo copie.
      titulo: crudos.length ? limpia.titulos[crudos[0] - 1] : '',
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

  // Y TIENE QUE SALIR UNA POR CADA UNA DE LAS QUE QUEDARON. La lista ya venia
  // limpia, asi que aqui no se quita nada: si faltan, es que se ha dejado
  // alguna por el camino y hay que pedirlo otra vez.
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

// ── Y SI EL PLAN VIENE A MEDIAS, SE PIDE OTRA VEZ ───────────
//
// Es la unica llamada que decide, y de ella cuelga el documento entero: si
// vuelve con dos partes, no hay documento que entregar y la clienta ha pagado
// lo mismo.
async function decidirElPlan({ nombre, sexo, rasgos }) {
  const arranque = Date.now();

  // ── 1. SE LIMPIA LA LISTA ─────────────────────────────────
  //
  // Y si esto no se puede hacer, NO se sigue. Sin limpiar, lo que sale es un
  // documento con la misma cosa contada tres veces, que es peor que no darlo.
  let limpia;
  try {
    limpia = await limpiarLaLista({ rasgos });
  } catch (err) {
    // Igual que abajo: si el modelo bueno no puede, termina el otro. Sin esto,
    // un fallo aqui deja a la clienta sin documento entero.
    const queda = loQueQueda(arranque, ESPERA_DE_LIMPIAR_MS);
    if (queda < ESPERA_MINIMA_PARA_REHACER_MS) throw err;
    console.warn(`[p2] ${EL_QUE_DECIDE} no ha podido limpiar la lista (${err.message}), lo termina ${EL_QUE_REMATA}`);
    limpia = await limpiarLaLista({ rasgos, espera: queda, modelo: EL_QUE_REMATA });
  }
  console.log(`[p2] de ${limpia.sequedan.length + limpia.sequitan.length} cosas que le cuestan se quedan ${limpia.sequedan.length}` +
    (limpia.sequitan.length ? `; fuera: ${limpia.sequitan.join(', ')}` : ''));

  if (limpia.sequedan.length < 3) {
    // No es un fallo del servidor: es que ese informe no da para un plan. Se
    // marca como tal para que la pagina lo diga con sus palabras y no como si
    // se hubiera roto algo.
    const e = new Error(`después de limpiar solo quedan ${limpia.sequedan.length} cosas que le cuesten, y con eso no hay documento`);
    e.esDelInforme = true;
    throw e;
  }

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
// convierten en el texto que ella va a leer, con el tono de la marca.
//
// Y NO PIENSAN. Aqui no hay nada que decidir ni que comparar: las cuatro cosas
// vienen decididas y lo unico que se hace es abrirlas hasta que se entiendan.
//
// Pensar sale del MISMO presupuesto que escribir, asi que encendido se gasta
// en pensar lo que tenia que salir en el texto, y sobre todo se gasta EL
// RELOJ, que lo tiene la clienta esperando delante. Estas son las que mas
// escriben del documento, y van todas a la vez: es aqui donde se va el
// tiempo, no en la que decide.
//
// Se probo con esfuerzo medio y lo unico que aportaba era releerse. Eso no
// vale lo que cuesta: lo que hace que el texto salga bien es lo que se le
// pide, y las redes de aqui abajo lo comprueban despues sin gastar reloj.
//
// CADA UNA VE SOLO SU PARTE. No hace falta que vea las demas: el paso que
// piensa ya se encargo de que no se repitan.

// LO QUE SE LE DA A CADA INTENTO.
//
// Escribir una parte son cuatro casillas y unas doscientas palabras -una hoja-.
// No piensa, asi que solo tarda lo que tarda en escribirlas.
//
// 60 SEGUNDOS, que es el sitio que le queda dentro de los dos minutos y medio
// que tiene que durar todo. Las partes van todas a la vez, asi que este tope
// es el de una, no el de la suma. Si una se pasa, se pide otra vez con lo que
// sobre, y si no sobra ni para medio intento no se pide.
// 90 SEGUNDOS, los mismos que las otras dos. Tenia 60, que era apretar por
// apretar: si una parte tarda 61 se corta y hay que pedirla entera otra vez, y
// eso cuesta mas tiempo y mas dinero que haberla dejado terminar.
//
// Las partes van todas a la vez, asi que este tope es el de UNA, no el de la
// suma. Y solo se gasta si de verdad tarda: lo normal es la mitad.
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
// Recibe las cuatro lineas de SU parte y nada mas: ni los rasgos, ni lo que ella
// conto, ni lo de las otras seis. Todo eso ya esta dentro de sus cuatro lineas,
// que las decidio quien las tenia delante. Darselo otra vez no le da material
// nuevo: le da sitio para irse por su cuenta y repetir lo de la parte de al
// lado, que es lo que hay que evitar.
//
// Su trabajo es explicar y ampliar hasta que se entienda a la primera.
async function escribirLaParte({ parte, nombre, sexo, puedeElNombre }) {
  const encargo = `${REGLAS_COMUNES}


AQUÍ NO SE DIAGNOSTICA

No le expliques como es o porque, ni de dónde le viene lo que hace, ni le busques la causa, ni le pongas nombre a lo que le pasa. Eso ya lo tiene.

Ahora lo que necesitamos es: que haria su mejor version, lo que tiene que cambiar y qué hace para conseguirlo con exito, siendo humana la persona.

Lo que le cuesta no es su defecto, es su prueba: de ahí sale lo que tiene que hacer.

LO QUE TE TOCA AHORA

EL TÍTULO DE ESTA PARTE ES: ${parte.titulo}

Va tal cual, sin cambiarlo ni una palabra. Lo devuelves en la casilla "titulo".

TE DAN TRES LÍNEAS YA DECIDIDAS Y ESCRIBES LAS TRES, cada una por su lado. No eliges tú lo que va: eso ya está decidido con todo su plan delante. Lo tuyo es que el humano lo entienda a la primera al leer y de manera facil, y que le sirva al humano, que le aporte valor

NO DECIDES, EXPLICAS. Coges la línea que te dan y la abres: qué es exactamente, cómo se hace, por qué así y no de otra manera, y qué pasa cuando lo hace. Todo lo que escribas tiene que poder rastrearse a la línea que te han dado. Si te falta un dato, no te lo inventas: cuentas mejor lo que ya está.

Y NO TE SALGAS DE LO TUYO. Las otras partes del documento las escribe otro y no las ves. Lo tuyo es esto y nada más.

CADA UNA DE LAS TRES ES SU PROPIO TEXTO, seguido, en párrafos, sin títulos dentro y sin anunciar lo que viene. Los nombres los pone el programa. Y no se repiten entre ellas: lo que ya has dicho en una no vuelve en la siguiente.

LAS TRES, Y LO QUE VA EN CADA UNA:

"tuPrueba"

Cuál es la prueba que le pone delante la vida aquí, qué debe cambiar y en quién se convierte cuando lo transforma y lo logra. Se entra por lo que le pasa a quien lee, nunca por la idea, y se cuenta como lo que tiene delante y le toca aprender, no como algo propio que está mal. Sin anunciarlo: nada de abrir diciéndole que esto es una prueba que la vida le pone, que suena a libro y encima ya lo pone en el título. Que sea una prueba se nota en cómo está contado. Y la segunda mitad es lo que gana: cómo es ahí su vida el día que ya lo ha superado, en concreto y en presente, con lo que va a estar pasando y no con lo que va a sentir. Unas 60 palabras para hacerte una idea del tamaño. Si lo dices en menos, mejor.

"queHaces"

Una sola cosa que tiene que hacer para cambiar ese desafío y transformarlo en positivo. Debe ser algo que realmente le funcione a un humano. Nada de autoayuda barata: esto debe saber hacerlo y funcionarle bien.

Cabe explicarla entera: qué hace exactamente, cómo se hace. Tan claro que lo pueda hacer mañana sin preguntarle a nadie. No le añadas otras cosas que hacer: la que te dan y nada más, contada hasta el final. Unas 120 palabras, que es de sobra si no das rodeos.

"dondeTeCaes"

El autosabotaje que aparecerá cuando intente cambiarlo a mejor, qué puede pasarle cuando le salga el autosabotaje, lo que le impedirá cambiarlo a bien. lo que va a aparecer para frenarle o lo que va a hacer mal creyendo que así va más deprisa. Y que eso llega siempre y es señal de que va bien, no de que se esté equivocando.

Y tambien debes decir qué debe hacer cuando eso pase (el autosaboteo) para volver al camino correcto, solo el paso concreto.

Unas 60 palabras para hacerte una idea del tamaño. Si lo dices en menos, mejor.

LAS CIFRAS DE ARRIBA SON UNA GUIA, no un límite. Cuanto más corto, mejor, pero nunca cortes una frase por la mitad para que quepa: si no cabe, quitas algo entero y cierras.

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
    // Lo unico que se mira: que ninguna de las tres venga con una palabra de
    // relleno en vez de texto.
    cojo: p => PUNTOS.some(punto => esRelleno(p[punto])),
    aviso: p => `\n\nY OJO: la vez anterior dejaste una casilla con una palabra de relleno dentro (${PUNTOS.filter(punto => esRelleno(p[punto])).map(x => BLOQUES[x]).join(', ')}) en vez de escribirla. Esto lo lee una persona que ha pagado por ello: las tres se escriben, y si te has quedado sin hilo, se vuelve a empezar esa.`,
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

  const escrita = { titulo: parte.titulo };
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
// LA PAGINA Y SUS PETICIONES
// ════════════════════════════════════════════════════════════════
//
// Cada paso es una peticion suya: la lista, el plan y cada parte.
// Asi ninguna se acerca al tiempo maximo que aguanta el servidor, y el
// documento se ve llegar a trozos en vez de esperar a una pantalla en blanco.

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(PAGINA);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { accion } = req.body || {};

  try {
    if (accion === 'lista') {
      const informes = await listar(40);
      // El nombre no esta en la lista de R2, hay que abrir cada informe. Se
      // abren los diez ultimos, que es lo que se va a elegir de verdad.
      const conNombre = await Promise.all(informes.map(async (inf, i) => {
        if (i >= 10) return { ...inf, nombre: inf.compra };
        try {
          const datos = await leer(inf.compra);
          return { ...inf, nombre: datos?.cliente?.nombre || inf.compra };
        } catch {
          return { ...inf, nombre: '(no se pudo abrir)' };
        }
      }));
      return res.status(200).json({ informes: conNombre });
    }

    if (accion === 'plan') {
      const { compra } = req.body || {};
      const informe = await leer(compra);
      // SIN LO QUE LE CUESTA NO HAY PLAN. Es lo unico que se le manda al
      // modelo, asi que con la lista vacia se lo inventaria todo. Los informes
      // de antes de que se guardaran los rasgos entran por aqui.
      const cuantos = cuantosDesafios(informe?.rasgos);
      if (cuantos < 3) {
        return res.status(422).json({
          error: cuantos
            ? `Ese informe solo tiene ${cuantos} cosas que le cuesten, y con eso no sale un plan`
            : 'Ese informe se guardó sin los rasgos, y sin ellos no hay plan',
        });
      }

      // Y SIN SU NOMBRE TAMPOCO. Antes, si el informe venia sin nombre, se
      // seguia adelante poniendo "esta persona": el modelo escribia con eso y
      // acababa impreso en la portada del documento y dentro del texto. Un
      // documento que se entrega a alguien no lleva un relleno donde va su
      // nombre. Si falta, se para aqui y se dice.
      const nombre = String(informe?.cliente?.nombre || '').trim();
      if (!nombre) {
        return res.status(422).json({
          error: 'Ese informe se guardó sin el nombre del cliente, y el plan va dirigido a él: no se hace a medias',
        });
      }

      const plan = await decidirElPlan({
        nombre,
        sexo: informe?.cliente?.sexo || '',
        rasgos: informe.rasgos,
      });
      // SIN PARTES NO HAY PLAN. No se le pone numero a lo que tiene que salir
      // -eso es lo que traia el relleno- pero si vuelve con dos o con ninguna,
      // no hay documento que entregar y es que la llamada ha venido mal.
      if (plan.partes.length < 3) {
        return res.status(422).json({
          error: `El plan ha venido con ${plan.partes.length} partes, y con eso no hay documento. Vuelve a darle.`,
        });
      }
      // El nombre y el sexo viajan con el plan: los pasos siguientes escriben
      // con ellos y asi no hay que volver a abrir el informe en cada uno.
      return res.status(200).json({
        plan,
        quien: { nombre, sexo: informe?.cliente?.sexo || '' },
      });
    }

    if (accion === 'parte') {
      const { nombre, sexo, parte, puedeElNombre } = req.body || {};
      // Lo que llega del navegador se comprueba antes de meterlo en el encargo:
      // si viniera a medias, el hueco lo rellenaria el modelo por su cuenta y
      // acabaria inventandose algo de su vida.
      if (!String(parte?.titulo || '').trim() || PUNTOS.some(punto => !String(parte?.[punto] || '').trim())) {
        return res.status(400).json({ error: 'Esa parte llega a medias y no se escribe' });
      }
      // Y sin nombre no se escribe: lo mismo que en el paso anterior, para que
      // no entre por aqui un relleno que acabaria impreso en el documento.
      if (!String(nombre || '').trim()) {
        return res.status(400).json({ error: 'Esa parte llega sin el nombre del cliente y no se escribe' });
      }
      const escrita = await escribirLaParte({
        parte,
        nombre: String(nombre).trim(),
        sexo: String(sexo || ''),
        puedeElNombre: !!puedeElNombre,
      });
      return res.status(200).json({ parte: escrita });
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (err) {
    console.error('[p2-plan/prueba]', err);
    // Un informe que no da para un plan no es un servidor roto: se dice como
    // lo que es, para no hacer buscar un fallo donde no lo hay.
    return res.status(err.esDelInforme ? 422 : 500).json({ error: err.message });
  }
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
  .cual { font-family:system-ui,sans-serif; font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.12em; color:var(--gold); margin-bottom:.5rem; }
  .parte h2 { font-size:1.25rem; color:var(--teal); margin-bottom:.9rem; line-height:1.35; }
  .bloque { margin-bottom:1.3rem; }
  .bloque:last-child { margin-bottom:0; }
  /* Las ordenes -lo que hace y por que senal- van sobre beige, igual que en el
     PDF: son las que vuelve a buscar y tiene que encontrar sin leer. */
  .bloque.beige > .caja-texto { background:#faf5ea; border-radius:6px; padding:.9rem 1.1rem; }
  .bloque h3 { font-family:system-ui,sans-serif; font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.1em; color:var(--gold); margin-bottom:.45rem; }
  .bloque p { margin-bottom:.6rem; }
  .bloque p:last-child { margin-bottom:0; }
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
  <div id="salida"></div>
</div>
<script>
const BLOQUES = ${JSON.stringify(BLOQUES)};
const PUNTOS = ${JSON.stringify(PUNTOS)};
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

async function llamar(cuerpo) {
  const r = await fetch(location.pathname, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(cuerpo),
  });
  const d = await r.json().catch(() => ({ error:'Respuesta ilegible' }));
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
  aviso.className = 'aviso';
  const compra = quien.value;
  let quienEs = null;

  // 1. La llamada que piensa y decide el documento entero.
  let plan;
  aviso.textContent = 'Limpiando la lista y decidiendo su plan…';
  try {
    const r = await llamar({ accion:'plan', compra });
    plan = r.plan;
    quienEs = r.quien;
    // El servidor no deja pasar un informe sin nombre, asi que esto no
    // deberia saltar nunca. Pero si saltara, es mejor pararse aqui que
    // escribir las partes dirigidas a "undefined".
    if (!quienEs || !quienEs.nombre) throw new Error('El informe ha venido sin el nombre del cliente');
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
  aviso.textContent = 'Escribiendo las ' + total + ' partes a la vez…';
  const huecos = plan.partes.map((suya, i) => {
    const hueco = document.createElement('div');
    hueco.className = 'parte';
    hueco.innerHTML = '<p class="cual">' + (i+1) + ' de ' + total + '</p><h2>' + escapar(suya.titulo) +
      '</h2><p class="aviso">Escribiéndose…</p>';
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
      const cabecera = '<p class="cual">' + (i+1) + ' de ' + total + '</p><h2>' + escapar(suya.titulo) + '</h2>';
      try {
        const { parte } = await llamar({ accion:'parte', nombre:quienEs.nombre, sexo:quienEs.sexo,
                                         parte: suya, puedeElNombre: conNombre.has(i) });
        escritas[i] = parte;
        huecos[i].outerHTML = pintarParte(parte, i+1, total);
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

  // EL PDF SOLO SE OFRECE SI ESTA TODO. Con una parte caida saldria un
  // documento con un agujero dentro, y eso no se le ensena a nadie.
  if (completas.length === total) {
    elDocumento = {
      nombre: quienEs.nombre,
      // La etiqueta pequena de cada parte y los nombres de sus puntos van
      // desde aqui: el que maqueta no tiene que saberselos.
      partes: completas.map((p, i) => ({ ...p, etiqueta: (i+1) + ' de ' + total, nombres: BLOQUES })),
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

// LO QUE HA DECIDIDO LA PRIMERA LLAMADA, PARA PODER MIRARLO.
//
// De la pagina de pruebas y de ningun sitio mas: la clienta nunca ve esto. Es
// para ver de un vistazo cuantas partes han salido, de que desafios sale cada
// una y que le pide hacer, que es lo unico que hay que mirar para saber si esa
// llamada lo ha hecho bien o esta repitiendo.
function pintarLoDecidido(partes, limpieza) {
  // De que desafio de la lista sale cada parte.
  const filas = partes.map((p, i) => {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + escapar(p.titulo || '') + '</td>' +
      '<td>' + escapar((p.deCuales || []).join(', ')) + '</td>' +
      '<td>' + escapar(p.queHaces || '') + '</td>' +
    '</tr>';
  }).join('');

  const fuera = (limpieza && limpieza.sequitan) || [];
  const entraron = partes.length + fuera.length;

  const quitadas = fuera.length
    ? '<p class="quitadas"><b>Se han quitado ' + fuera.length + ':</b> ' +
      fuera.map(x => '#' + escapar(x)).join(' · ') + '</p>'
    : '<p class="quitadas">No se ha quitado ninguna.</p>';

  return '<details class="decidido" open><summary>La limpieza — ' +
    entraron + ' entraron, quedan ' + partes.length + '</summary>' + quitadas +
    '<table><tr><th>#</th><th>Título</th><th>Desafíos</th><th>Lo que le manda hacer</th></tr>' +
    filas + '</table></details>';
}

// Cada parte con sus cuatro puntos, cada uno con su nombre para saber de que
// habla y para poder volver a buscarlo.
function pintarParte(p, n, total) {
  const bloques = PUNTOS.map(punto => {
    const dentro = parrafos(p[punto]);
    return SOBRE_BEIGE.includes(punto)
      ? '<div class="bloque beige"><h3>' + escapar(BLOQUES[punto]) + '</h3><div class="caja-texto">' + dentro + '</div></div>'
      : '<div class="bloque"><h3>' + escapar(BLOQUES[punto]) + '</h3>' + dentro + '</div>';
  }).join('');
  return '<div class="parte"><p class="cual">' + n + ' de ' + total + '</p>' +
    '<h2>' + escapar(p.titulo) + '</h2>' + bloques + '</div>';
}
</script>
</body>
</html>`;
