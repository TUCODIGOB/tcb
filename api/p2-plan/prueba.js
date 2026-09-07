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
//   persona le cuesta, sacado del P1, y dice cuales se quedan: fuera las que
//   dicen lo mismo, las que se contradicen y las que no dan para un cambio.
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

AFIRMA. Dices las cosas y sigues. No las razonas, no las justificas y no las matizas: cada matiz que añades le quita fuerza a lo que acabas de decir y la obliga a sostener dos cosas a la vez. Si has escrito una frase para suavizar la anterior, bórrala.

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
- SI TAPAS TODO LO DEMÁS Y ESA FRASE SOLA NO DICE NADA CONCRETO DE ELLA, está mal escrita. Contar cómo se siente algo no es contar qué es.
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

// ── LO QUE SEPARA EL P2 DEL P1 ──────────────────────────────
//
// Es la regla que decide si este producto vale algo. El P1 ya le conto quien
// es; si el P2 se lo vuelve a contar en positivo, ella lo lee y piensa que le
// han dado dos veces lo mismo. Y tendria razon.
//
// Por eso se parte en dos: el PORQUE sale de su informe, y el QUE HACER no
// esta ahi y lo pone el P2. Eso es lo unico que este producto anade, y es a lo
// que ha venido.

const EL_P2_NO_ES_EL_P1 = `QUÉ ES ESTO

Esto no le explica a nadie cómo es. Eso ya lo tiene: se leyó entero un estudio suyo que le contaba quién es y de dónde le viene.

Esto es la parte que le falta. Lo que tiene que hacer para llegar a ser quien quiere ser y tener la vida que quiere.

Y SE ESCRIBE DESDE AQUÍ: lo que le cuesta no es un defecto suyo, es lo que le toca aprender. La vida se lo va a seguir poniendo delante hasta que lo aprenda, y el día que lo haga, eso mismo se convierte en lo mejor que tiene. Eso es lo que cambia todo: no viene a que le arreglen nada, viene a saber qué examen tiene delante y qué hace para aprobarlo.

No se lo digas con esas palabras ni se lo expliques como una idea. Se nota en cómo está escrito todo lo demás: no le hablas de algo que hay que corregir, le hablas de algo que hay que superar.

Así que aquí no se diagnostica. No le explicas de dónde le viene lo que hace, ni le buscas la causa en su casa o en su infancia, ni le pones nombre a lo que le pasa, porque todo eso está dicho ya, y repetírselo con otras palabras es quitarle el sitio a lo único que ha venido a buscar, que es qué hace a partir de mañana.

De ahí salen las dos reglas que mandan sobre todas las demás:

1. DE LO SUYO SOLO APARECE LO QUE TE DAN ESCRITO ABAJO, y ni una cosa más. Nada del porqué: de dónde le viene, quién se lo hizo, cómo se llama lo que le pasa. Todo eso se lo contaron ya, y aquí ocupa el sitio de lo que ha venido a buscar. Si no puedes señalar de dónde sale lo que escribes, no lo escribes.

2. LO TUYO ES EL CÓMO. No solo qué hace: sobre todo cómo, que es lo que nadie le explica y lo que no está en su estudio. Es a lo que ha venido.

Se escribe hacia delante, no hacia atrás: no de lo que le pasó, sino de lo que hace hoy y de lo que va a hacer con ello.`;

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
  dondeTeCaes:  'Dónde te vas a caer',
  cuandoTeCaes: 'Cuando te caigas',
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
  ? 'Puedes llamarla por su nombre UNA vez en lo que escribas, donde caiga natural. Nunca en la última frase.'
  : 'Y NO LA LLAMES POR SU NOMBRE en lo que escribas: ya se lo dicen en otro sitio, y repetido cansa.';
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
// EL PORQUE VA DETRAS de cada uno: es lo que le hizo instalarse y lo que hay
// que darle la vuelta.
function susDesafios(rasgos) {
  return (rasgos?.desafios || [])
    .filter(r => r && String(r.descripcion || '').trim())
    .map((r, i) => `${i + 1}. ${String(r.descripcion).trim()}` +
      (r.causa ? `\n   PORQUE: ${String(r.causa).trim()}` : ''))
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
const TECHO_DE_LIMPIAR = 16000;

const MOLDE_DE_LIMPIAR = {
  type: 'object',
  properties: {
    sequedan: { type: 'array', items: { type: 'integer' } },
    sequitan: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          numero: { type: 'integer' },
          porque: { type: 'string' },
        },
        required: ['numero', 'porque'],
        additionalProperties: false,
      },
    },
  },
  required: ['sequedan', 'sequitan'],
  additionalProperties: false,
};

async function limpiarLaLista({ rasgos, espera = ESPERA_DE_LIMPIAR_MS, modelo = EL_QUE_DECIDE }) {
  const desafios = losDesafios(rasgos);

  const encargo = `${EL_P2_NO_ES_EL_P1}

Abajo tienes, numeradas, las cosas que le cuestan a una persona. Salen de su carta y están escritas por separado, sin que nadie las mirara juntas.

TU ÚNICO TRABAJO ES DECIR CUÁLES SE QUEDAN. Aquí no se escribe nada del documento, no se decide qué tiene que hacer y no se le cuenta nada a nadie. Solo se limpia la lista. Por eso puedes dedicarle todo el rato a compararlas bien, que es lo único que hay que hacer aquí.

Cada una de las que dejes va a ser una parte del documento. Si dejas dos que dicen lo mismo, ella lee dos veces la misma cosa, cree que tiene el doble de trabajo del que tiene, y deja de fiarse.

CÓMO SE COMPARAN

De cada una, dite para ti en tres o cuatro palabras QUÉ ESTÁ HACIENDO ELLA ahí. No de qué habla ni dónde le pasa: qué hace. Eso no lo escribes en ningún sitio, es para ti.

Ahora mira esa lista de conductas y compáralas entre sí, todas con todas. Las que se repitan te están diciendo que ahí hay una sola cosa contada varias veces.

Léelas así y no por cómo están escritas. Vienen redactadas por separado, así que dos idénticas por debajo pueden no compartir ni una palabra, y dos que suenan parecido pueden ser distintas. Y da igual que a una le pase en un sitio de su vida y a otra en otro: el sitio no las hace distintas, la conducta sí.

QUÉ SE QUITA

LAS QUE DICEN LO MISMO. De cada grupo se queda UNA, la que esté mejor contada, y las demás se van.

LAS QUE SE CONTRADICEN. Si dos le piden cosas que no puede hacer a la vez, se queda la que más le pese y la otra se va.

LAS QUE NO DAN PARA UN CAMBIO. Si de una no sale nada que ella pueda ponerse a hacer, se va, por muy cierta que sea. El documento es lo que hace, no lo que le pasa.

Y NADA MÁS. Lo que no entre en esos tres casos se queda. No hay número que cumplir: ni quites una buena para que salgan menos, ni dejes una floja para que salgan más. Salen las que salgan.

LO QUE DEVUELVES

"sequedan": los números de las que se quedan, en el orden en que están abajo.
"sequitan": las que quitas, cada una con su número y, en media línea, por qué. Si una se va por decir lo mismo que otra, di cuál.

Cada número de la lista tiene que estar en una de las dos, y en una sola.

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

  const sequitan = (Array.isArray(salida.sequitan) ? salida.sequitan : [])
    .map(x => ({ numero: Number(x?.numero), porque: String(x?.porque || '').trim() }))
    .filter(x => validos.has(x.numero) && !sequedan.includes(x.numero));

  // SI SE DEJA ALGUNO SIN CLASIFICAR, SE QUEDA. Un desafio que no esta ni en una
  // lista ni en la otra es un descuido suyo, no una decision: tirarlo seria
  // quitarle a la clienta algo que nadie ha decidido quitar.
  const olvidados = [...validos].filter(n => !sequedan.includes(n) && !sequitan.some(x => x.numero === n));
  if (olvidados.length) {
    console.warn(`[p2] la limpieza no ha dicho nada de ${olvidados.join(', ')}: se quedan`);
    sequedan.push(...olvidados);
    sequedan.sort((a, b) => a - b);
  }

  return {
    sequedan,
    sequitan,
    // Las descripciones de las que se quedan, ya listas para el paso siguiente.
    lista: sequedan.map((n, i) => {
      const r = desafios[n - 1];
      return `${i + 1}. ${String(r.descripcion).trim()}` +
        (r.causa ? `\n   PORQUE: ${String(r.causa).trim()}` : '');
    }).join('\n\n'),
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
          // El titulo de esta parte del documento, y lo unico que se ve de
          // aqui. Lo escribe el modelo porque cada plan lleva unas cosas
          // distintas y no se pueden dejar escritos de antemano.
          titulo:       { type: 'string' },
          tuPrueba:     { type: 'string' },
          queHaces:     { type: 'string' },
          dondeTeCaes:  { type: 'string' },
          cuandoTeCaes: { type: 'string' },
        },
        required: ['deCuales', 'titulo', ...PUNTOS],
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
  const encargo = `${EL_P2_NO_ES_EL_P1}

Estás preparando el plan de una persona: lo que tiene que cambiar para llegar a ser quien quiere ser, y qué hace para conseguirlo.

Abajo tienes una lista: todo lo que a esta persona le cuesta, sacado de su carta. Cada uno con lo que le pasa y con el porqué detrás.

LO QUE LE CUESTA ES SU PRUEBA, NO SU DEFECTO. Es lo único que hay que entender para hacer bien esto. Cada cosa que le cuesta es algo que la vida le va a seguir poniendo delante hasta que lo aprenda, y de ahí sale lo que tiene que hacer. Ese es todo el trabajo: darle la vuelta a lo que le pesa y convertirlo en lo que hace.

AQUÍ NO SE ESCRIBE EL DOCUMENTO. Aquí se DECIDE. Todo sale en corto, una línea cada cosa, y lo que se va a leer lo escribe otro después. Por eso puedes dedicarle el rato a lo que de verdad importa: decidir qué le va a mover la vida y qué no.

Y AQUÍ NO SE DIAGNOSTICA. No le vuelvas a contar cómo es ni de dónde le viene: eso ya lo tiene, se lo leyó entero en otro documento. Lo suyo solo aparece para enganchar lo que tiene que hacer.


1. DE CADA UNO DE LOS QUE HAY ABAJO, ESTO

La lista ya viene limpia: alguien ha quitado antes las que decían lo mismo, las que se contradecían y las que no daban para nada que hacer. Así que no tienes que quitar ninguna ni juntarlas. Cada una de abajo es una parte del documento, y salen tantas partes como cosas hay en la lista.

De cada uno sacas seis cosas, en una línea cada una, y ninguna se queda vacía. La línea va escrita para que quien la lea después la entienda entera sin preguntar nada: no es un título, es la cosa dicha en corto.

deCuales         El número de la lista de abajo del que sale esta parte. Uno
                 solo: aquí no se junta nada, ya viene juntado. Es para poder
                 mirar de dónde ha salido cada cosa.

titulo           Cómo se llama esta parte del documento. Habla de lo que ella
                 va a hacer o de en quién se convierte, nunca de lo que le
                 pasa: es un título de plan, no de diagnóstico. Corto, y sin
                 dos puntos ni subtítulos.
                 Y NI DOS EMPIEZAN CON LA MISMA PALABRA: van seguidos en el
                 mismo documento y se leen del tirón.
                 SE ENTIENDE SOLO, LEÍDO DE PASO Y SIN NADA ALREDEDOR. Es lo
                 único de aquí que ella va a leer tal cual, en grande y en la
                 primera página de esa parte, así que si tiene que llegar
                 abajo para saber de qué le hablas, el título está mal.
                 Y SE DICE LA COSA, NO UNA FIGURA DE LA COSA. Ni metáforas,
                 ni imágenes, ni frases que suenan bien sin decir nada: si el
                 título no se puede hacer literalmente, está mal. Se nombra lo
                 que ella hace, con las palabras de todos los días, y si una
                 palabra la verías antes escrita que dicha en una conversación,
                 va fuera. Tiene que entenderlo alguien de dieciocho años a la
                 primera y sin pensar.

tuPrueba         Qué le pone la vida delante aquí y en quién se convierte el
                 día que lo supere. Dicho como un examen que tiene delante, no
                 como un fallo suyo que hay que corregir.

queHaces         UNA SOLA COSA que tiene que hacer. Una, no dos ni tres. Es lo
                 más importante de las cuatro y por lo que ha pagado, y es una
                 porque nadie cambia cinco cosas a la vez.
                 Va con nombre de conducta: qué deja de hacer y qué hace en su
                 lugar, algo que se pueda ver ocurriendo. Si lo que escribes no
                 se puede ver pasando, está mal y se cambia.
                 Y ES ALGO QUE YA PUEDE HACER con la vida que tenga, sin
                 comprar nada, sin apuntarse a nada y sin que le haga falta
                 nadie. Como no sabes en qué se le va el día, lo que decidas va
                 sobre lo que ella hace, que eso sí lo sabes, y no sobre dónde
                 lo hace.

dondeTeCaes      Dónde se va a caer intentándolo: lo que va a aparecer para
                 frenar a quien lee, o el fallo que va a cometer porque parece
                 que así va más deprisa y le deja peor. El que le pega a ESTA persona con
                 ESTA orden, no uno que le valdría a cualquiera.

cuandoTeCaes     Qué hace el día que lo deja. No es animar a nadie: es el
                 paso concreto para volver, y que dejarlo entraba en el plan.


2. LO QUE NO SE PUEDE ESCRIBIR

NO SE INVENTA NADA DE SU VIDA. Lo que sabes de ella es lo que hay abajo y nada más. No sabes si tiene pareja, trabajo, hijos, casa o familia: no los nombres, no los supongas y no los uses para montar nada. Lo que decidas tiene que servirle igual sea cual sea su vida.

Y NO HACE FALTA SABERLO, porque lo que decides no va sobre su vida, va sobre su conducta, y esa la tienes entera abajo. No es "habla con quien sea": es qué hace cuando le pasa lo que le pasa siempre. Eso es suyo, y solo suyo, sin saber nada más.

Nada que le valga igual a cualquiera. Si lo que has escrito se le podría mandar a otra persona distinta, está mal y se cambia.

Y NADA DE EJERCICIOS DE TERAPIA. Ni buscar de dónde le viene algo, ni ponerle nombre a quién se lo hizo, ni rituales, ni papeles que se rompen, ni nada que se parezca a una consulta. Lo que hace es algo que ya haría en su vida corriente, hecho distinto.

Y nada técnico: ni planetas, ni signos, ni casas. Quien lo lee no ve la carta.


3. EL REPASO, ANTES DE ENTREGAR

Con todas delante:

LEE LOS "queHaces" SEGUIDOS. La lista viene limpia, así que no deberían pedirle lo mismo dos veces. Pero tú acabas de escribirlos, y ahí es donde se puede colar: dos órdenes que suenan distintas y acaban en la misma conducta. Si te pasa, cambia una de las dos para que mande de verdad lo que dice su desafío, que para eso está.

Y QUE TODO SALGA DE LA LISTA. Si señalas una línea y no puedes decir de qué número de abajo sale, se cambia.

Devuelve solo lo decidido. No expliques lo que has quitado.


TODO LO QUE A ESTA PERSONA LE CUESTA:

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
    const suyo = {
      // Los numeros que devuelve son los de la lista LIMPIA que se le paso.
      // Se traducen a los de la lista original, que es lo que se mira en la
      // pagina para saber de que desafio de verdad sale cada parte.
      deCuales: (Array.isArray(p?.deCuales) ? p.deCuales : [])
        .map(Number).filter(Number.isInteger)
        .map(n => limpia.deCuales[n - 1]).filter(Boolean),
      titulo: String(p?.titulo || '').trim(),
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
  if ([...porTitulo.values()].some(n => n > 1)) falla.push('hay dos partes con el mismo titulo');

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
    (limpia.sequitan.length ? `; fuera: ${limpia.sequitan.map(x => `${x.numero} (${x.porque})`).join(', ')}` : ''));

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
  //
  // Con Sonnet, siempre. Este intento no esta para pensar mejor que el
  // anterior: esta para arreglar algo concreto que se le dice escrito -una
  // casilla vacia, dos titulos iguales, una parte que falta-, y eso es trabajo
  // de seguir una instruccion, no de criterio. Sonnet lo hace en la cuarta
  // parte del tiempo, y a estas alturas el reloj ya va cargado.
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
      recordatorio: `\n\nY OJO CON ESTO, que la vez anterior salió mal: ${primero.falla.join('; ')}. La lista ya viene limpia: sale una parte por cada cosa de la lista, ninguna se queda fuera y ninguna se junta con otra. Y cada parte va con su título y sus cuatro cosas escritas enteras.`,
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

// ── LO QUE LA CLIENTA NO PUEDE LEER ─────────────────────────
//
// El encargo prohibe nombrar la carta y aun asi se cuela: en el P1 pasaba, y
// aqui pasaria igual. Pedirlo no basta, asi que se comprueba.
//
// Solo se buscan las palabras que en castellano no significan otra cosa.
// "Casa", "signo" o "aspecto" sueltas son palabras corrientes y no cuentan.
//
// Es la misma lista que el P1, copiada a proposito: este fichero no depende de
// ningun otro, y el dia que se borre la carpeta no se lleva nada por delante.
const PALABRAS_DE_ASTROLOGIA = [
  /\b(mercurio|jupiter|saturno|urano|neptuno|pluton|quiron|ascendente)\b/,
  /\bnodo (norte|sur)\b/,
  /\b(aries|tauro|geminis|virgo|escorpio|sagitario|capricornio|acuario|piscis)\b/,
  // Cancer, Leo y Libra son enfermedad y dos verbos, asi que sueltas no cuentan:
  // se buscan como se nombra un signo, detras de "en".
  /\ben (cancer|leo|libra)\b/,
  /\b(tu|su|la|mi) carta\b/,
  /\b(carta|mapa) (natal|astral)\b/,
  /\bretrograd[oa]\b/,
  /\bcasa \d{1,2}\b/,
  /\b(conjuncion|oposicion|cuadratura|trigono|sextil) (a|con|al)?\s*(el|la)?\s*(mercurio|jupiter|saturno|urano|neptuno|pluton|quiron|sol|luna|venus|marte)\b/,
  // "aspecto" y "signo" solas son palabras corrientes, asi que se buscan solo
  // pegadas a lo que las convierte en tecnicas.
  /\bsin (ningun )?aspecto/,
  /\baspectos? (que (conect|sostien|un|enlac)|entre)/,
  /\b(tu|su) (sol|luna|venus|marte|mercurio|jupiter|saturno|signo)\b/,
  /\b(los|tus|sus) planetas\b/,
  /\b(zodiaco|horoscopo|astrolog|efemerides)\b/,
  // Y TAMPOCO SE NOMBRA EL OTRO DOCUMENTO. Las reglas lo prohiben, pero aqui
  // el encargo le cuenta que ya se leyo un estudio suyo, asi que la tentacion
  // de escribir "en tu estudio te contaron" la tiene delante. Quien lee no
  // sabe que es eso ni tiene que saberlo.
  /\b(tu|su) (informe|estudio)\b/,
  /\b(el|ese|aquel) (informe|estudio) (que|suyo|anterior|tuyo)\b/,
  /\b(primer|otro) (informe|estudio|documento)\b/,
];

function sinTildes(txt) {
  return String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function hablaDeAstrologia(texto) {
  const limpio = sinTildes(texto);
  return PALABRAS_DE_ASTROLOGIA.some(re => re.test(limpio));
}

// ── LA PRUEBA DE LAS TRES PRIMERAS FRASES, HECHA POR EL CODIGO ──
//
// El encargo dice que de lo suyo se cuentan dos o tres frases y que de ahi
// hasta el final todo es como se hace. Pedirlo no basta: en el P1 se pidieron
// cosas asi durante semanas y se colaban igual.
//
// Asi que se tapa el arranque -las tres primeras frases, que son las que
// tienen permiso- y se mira lo que queda. Si ahi sigue explicandole de donde
// le viene lo que hace, quien se lo hizo o como se llama lo que le pasa, eso
// es el diagnostico que ya pago en el P1, y se pide otra vez.
//
// La lista es corta y de palabras que solo aparecen explicando el origen. Una
// palabra normal aqui dentro haria reescribir textos buenos, que es peor que
// dejar pasar uno malo.
const PALABRAS_DE_DIAGNOSTICO = [
  /\bde (pequen|nin|cri)[ao]\b/,
  /\bdesde (pequen|nin|cri)[ao]\b/,
  /\btu infancia\b/,
  /\baprendiste (a|que)\b/,
  /\b(te )?viene de (tu|ahi|lo|esa|ese)\b/,
  /\b(tus padres|tu madre|tu padre|tu familia)\b/,
  /\btu (patron|herida|programacion)\b/,
  /\bpor eso eres\b/,
  /\besa es la razon\b/,
  /\blo que te pasa es\b/,
];

// Y EL DIAGNOSTICO TAMBIEN SE ESCRIBE SIN NINGUNA DE ESAS PALABRAS.
//
// "Te cuesta pedir. Sostienes lo que no te toca. Eres la que aguanta." Ahi no
// hay ni infancia ni padres ni patron, y sigue siendo contarle como es, que es
// lo que ya pago en el P1.
//
// Asi que ademas de mirar lo que no puede haber, se mira lo que TIENE que
// haber. Un texto que de verdad le explica como se hace algo no puede
// escribirse sin decir cuando lo hace, que pasa si no le sale, que hace en vez
// de lo de antes o las primeras veces. Esas marcas caen solas y muchas; una
// descripcion de como es no lleva casi ninguna.
//
// El liston esta bajo a proposito: tres marcas distintas en todo lo que queda
// despues del arranque. Un texto bueno pasa de sobra; uno que solo la describe
// no llega.
const MARCAS_DE_QUE_HACER = [
  /\bcuando\b/, /\ben vez de\b/, /\ben lugar de\b/, /\bantes de\b/,
  /\bdespues de\b/, /\bhasta que\b/, /\bmientras\b/, /\bcada vez que\b/,
  /\bvas a\b/, /\bte va a\b/, /\ba partir de\b/, /\bde ahora en adelante\b/,
  /\bsi te\b/, /\bsi lo\b/, /\bsi se te\b/, /\bel dia que\b/,
  /\blo que haces es\b/, /\bla primera vez\b/, /\blas primeras veces\b/,
  /\bya no\b/, /\bnada de\b/, /\bsin\b/,
];

const MARCAS_MINIMAS = 3;

// LO QUE ELLA SE DICE POR DENTRO NO CUENTA COMO DIAGNOSTICO.
//
// Las reglas piden que se le pongan sus frases entrecomilladas, y dentro de
// una de esas cabe perfectamente "lo que me pasa es que estoy cansada" o "por
// eso soy asi". Eso no es el documento explicandole de donde le viene: es ella
// diciendoselo, que es justo lo que hay que escribir. Asi que lo que va entre
// comillas se quita antes de mirar.
// Las comillas se escriben de muchas maneras y hay que cogerlas todas: las
// angulares, las tipograficas de abrir y de cerrar, y las rectas.
const sinLoEntrecomillado = txt =>
  String(txt || '').replace(/[\u00ab\u201c\u2018"']([^\u00ab\u00bb\u201c\u201d\u2018\u2019"']{0,300})[\u00bb\u201d\u2019"']/g, ' ');

// Solo las palabras que explican de donde le viene algo. Es lo que vale para
// los cuatro puntos que no son el plan: ahi no se cuenta como se hace nada, asi
// que pedirles marcas de que-hacer seria reescribirlos siempre.
function soloPalabrasDeDiagnostico(texto) {
  const limpio = sinTildes(sinLoEntrecomillado(texto));
  return PALABRAS_DE_DIAGNOSTICO.some(re => re.test(limpio));
}

function cuentaComoEs(texto, frasesQuePerdona = 3) {
  const frases = sinLoEntrecomillado(texto).split(/(?<=[.!?])\s+/);
  const resto = sinTildes(frases.slice(frasesQuePerdona).join(' '));
  if (!resto.trim()) return false;
  if (PALABRAS_DE_DIAGNOSTICO.some(re => re.test(resto))) return true;
  // Y contar marcas solo tiene sentido en un texto largo. Una casilla de dos
  // frases no puede llevar tres, y exigirselas la haria reescribir siempre.
  //
  // EL SUELO VA POR DEBAJO DEL TOPE DE "queHaces", Y ESO ES TODO EL ASUNTO.
  // Estaba en 120 palabras cuando el tope de esa casilla era 115: o sea que
  // para llegar a contarse las marcas habia que haberse pasado ya de largo, y
  // entonces salta antes la red del tope. Esta parte del codigo no se ejecuto
  // NUNCA. Con 95 si entra: la casilla no baja de 80 y no pasa de 135, asi que
  // casi todo lo que escribe se mira de verdad.
  if (resto.trim().split(/\s+/).length < 95) return false;
  return MARCAS_DE_QUE_HACER.filter(re => re.test(resto)).length < MARCAS_MINIMAS;
}

// Dos textos son el mismo aunque cambien las mayusculas, las tildes o la
// puntuacion. Comparar dos cadenas a pelo no es criterio.
const comoSeCompara = txt =>
  sinTildes(txt).replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();

// ── Y QUE NINGUNO SE QUEDE A MEDIA FRASE ────────────────────
//
// En un plan de verdad una parte llego terminada en "y entonces lo que haces
// es". Paso todas las comprobaciones: tenia palabras de sobra, venia en
// parrafos y no le contaba como es. Ninguna miraba como acababa.
//
// Un corte grande ya lo caza la cuenta de palabras, porque el texto se queda
// corto. Esto tapa el hueco de en medio: el que es lo bastante largo para
// pasar y aun asi acaba colgado.
//
// NO SE MIRA QUE ACABE EN PUNTO, SE MIRA QUE NO ACABE COLGADO. Pidiendo el
// punto habria que acertar la lista entera de finales buenos, y uno raro pero
// legitimo -unas comillas de las que se le piden, unos puntos suspensivos, un
// parentesis- se reescribiria sin motivo. Asi que se mira al reves: solo lo
// que no puede cerrar una frase nunca.
//
// Y ahi entran dos cosas. Lo que se queda a medias -una letra, un numero, una
// coma, un punto y coma, dos puntos-, que es como acaba un texto cortado. Y lo
// que se acaba de abrir -unas comillas, un parentesis, un signo de abrir
// interrogacion o exclamacion-, que ademas del corte delata que lo que venia
// detras no llego.
//
// LOS GUIONES NO ENTRAN, aunque parezcan de lo mismo. Un inciso se cierra con
// su guion y puede caer justo al final -asi-, y eso es un final bueno. Contarlo
// como cortado reescribiria textos correctos, que es lo unico que esta red no
// se puede permitir.
const acabaColgado = txt => /[\p{L}\p{N},;:«¿¡([“‘]$/u.test(String(txt || '').trim());

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

// SI SE LE CUELA, SE VUELVE A PEDIR. Una sola vez: aqui no se puede tirar el
// trozo como en el P1 -eso dejaria un hueco en el documento-, asi que se pide
// otra vez recordandoselo. Si a la segunda sigue colandose, se avisa en el
// registro y se entrega, que es mejor que dejar la parte en blanco.
const NO_NOMBRES_LA_CARTA =
  'Y esto por encima de todo: en lo que escribas no puede aparecer ni una palabra de astrología. ' +
  'Ni un planeta, ni un signo, ni una casa, ni un aspecto, ni la carta, ni el mapa. ' +
  'Quien lo lee no ha visto nada de eso y no sabe de qué le hablas.';

// "tope" es lo que se le da al primer intento, y va sin valor por defecto a
// proposito: quien llame tiene que decirlo. Un defecto de cero apagaria el
// reloj sin avisar y el reintento se saldria del tiempo del servidor.
async function sinNombrarLaCarta({ que, pedir, texto, cojo = () => false, aviso = '', tope }) {
  const arranque = Date.now();
  const primera = await pedir('', tope);
  const laCarta = hablaDeAstrologia(texto(primera));
  const aMedias = cojo(primera);
  if (!laCarta && !aMedias) return primera;

  // Y SOLO SE PIDE OTRA VEZ SI CABE. Si del tiempo del servidor no queda ni
  // para la mitad de un intento, no se pide: se entrega lo que hay, que es
  // mejor que quedarse sin nada por haberlo intentado.
  const queda = loQueQueda(arranque, tope);
  if (queda < tope / 2) {
    console.warn(`[p2] ${que}: ${laCarta ? 'se ha colado una palabra de la carta' : 'ha venido a medias'}, pero ya no queda tiempo para pedirlo otra vez`);
    return primera;
  }

  console.warn(`[p2] ${que}: ${laCarta ? 'se ha colado una palabra de la carta' : 'ha venido a medias'}, se pide otra vez`);
  const elAviso = typeof aviso === 'function' ? aviso(primera) : aviso;
  const segunda = await pedir((laCarta ? `\n\n${NO_NOMBRES_LA_CARTA}` : '') + (aMedias ? elAviso : ''), queda);

  // Y SE ENTREGA LA MENOS MALA DE LAS DOS. Pedir otra vez no garantiza que
  // salga mejor: puede venir mas corta, o colarsele lo que a la primera no se
  // le colo. Quedarse con la segunda a ciegas seria cambiar un fallo por otro.
  const fallos = r => (hablaDeAstrologia(texto(r)) ? 1 : 0) + (cojo(r) ? 1 : 0);
  const deLaSegunda = fallos(segunda);
  if (!deLaSegunda) return segunda;
  if (deLaSegunda < (laCarta ? 1 : 0) + (aMedias ? 1 : 0)) {
    console.warn(`[p2] ${que}: sigue mal a la segunda, se entrega igual`);
    return segunda;
  }
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
const ESPERA_DE_ESCRIBIR_MS = 60000;
const TECHO_DE_ESCRIBIR = 12000;

const MOLDE_DE_LA_PARTE = {
  type: 'object',
  properties: {
    tuPrueba:     { type: 'string' },
    queHaces:     { type: 'string' },
    dondeTeCaes:  { type: 'string' },
    cuandoTeCaes: { type: 'string' },
  },
  required: PUNTOS,
  additionalProperties: false,
};

// CUANTO OCUPA CADA PUNTO, Y POR QUE AQUI CASI NO SE CUENTAN PALABRAS.
//
// ESTO SE INTENTO DOS VECES CONTANDO Y LAS DOS SALIO MAL, asi que queda
// escrito para no volver a intentarlo una tercera.
//
// La idea era que cada parte cupiera en una hoja, y de ahi salia un tope de
// palabras por casilla. Pero el tope se fijaba a ojo y el modelo escribia otra
// cosa: se le pedian 135 palabras en "Que haces" y en el primer plan de verdad
// escribio entre 156 y 206. Se subio el tope a lo que habia escrito ese
// documento, y eso tampoco vale: era el documento de UNA clienta. La
// siguiente trae otros desafios, y lo que hay que explicarle no ocupa lo
// mismo. Cualquier cifra fija va a estar mal para alguien.
//
// Y equivocarse ahi es caro por los dos lados. Si el tope se queda corto, se
// reescribe una parte que estaba bien -un minuto de reloj y el doble de
// dinero, cada vez- y encima el modelo, intentando obedecer, corta el texto a
// media frase. Si el tope se pasa, no hace nada.
//
// ASI QUE NO SE CUENTAN PALABRAS PARA DECIDIR SI UN TEXTO VALE. Se mira lo que
// miraria alguien releyendo esto antes de mandarselo a una persona:
//
//   QUE ESTE TERMINADO. Que no se quede a media frase. -> acabaColgado
//   QUE DIGA ALGO.      Que no venga vacia ni con una palabra de relleno
//                       haciendo bulto.                -> esRelleno, y el suelo
//   QUE NO LE REPITA    Que no vuelva a contarle como es y de donde le viene,
//   EL OTRO DOCUMENTO.  que eso ya lo pago.            -> cuentaComoEs
//   QUE SE LEA.         Que la orden venga en parrafos y no en un ladrillo.
//
// Eso si vale para cualquier clienta, porque no depende de cuanto tenga que
// decirle: depende de si lo dicho esta entero.
//
// LO QUE SE LE PIDE, QUE NO ES LO MISMO QUE LO QUE SE RECHAZA. En el encargo si
// va una cifra, porque sin ella el modelo no sabe si le estas pidiendo cuatro
// lineas o cuatro hojas. Es una guia para que apunte, no una regla que se
// comprueba despues. Sale de lo que escribio cuando lo hizo bien.
const PALABRAS_PEDIDAS = { tuPrueba: 60, queHaces: 180, dondeTeCaes: 25, cuandoTeCaes: 20 };

// Y UN SUELO, que es el unico limite que si se comprueba. No esta para que
// llene: esta para cazar la casilla que viene vacia de contenido pareciendo
// entera -"placeholder", una linea suelta, media idea-. Va deliberadamente muy
// por debajo de lo que escribe: aqui no se rechaza nada por ser corto si de
// verdad ha dicho lo que tenia que decir.
const PALABRAS_MINIMAS = { tuPrueba: 25, queHaces: 90, dondeTeCaes: 12, cuandoTeCaes: 10 };

// Y UNA LINEA DE LARGO DE VERDAD, medida con los dos planes que han salido.
//
// Al quitar el tope de golpe el documento se doblo: de 19 paginas a 37. "Que
// haces" paso de 156-206 palabras a 192-334, y "Tu prueba" de 38-99 a 100-172.
// El documento no mejora por ser mas largo: quien lo lee no relee, y a las
// treinta y siete paginas ya no lee.
//
// Asi que vuelve a haber una linea, y estas cifras salen de los dos documentos,
// contadas: por encima de lo mas largo que escribio el que salio bien -para que
// no reescriba nada que estaba bien- y por debajo de lo que escribio el que se
// doblo. Ni pegadas a lo que se le pide ni sin techo.
//
//                se le pide   el bueno llego a   se rechaza a partir de
//   tuPrueba          60             99                   115
//   queHaces         180            206                   240
//   dondeTeCaes       25             35                    45
//   cuandoTeCaes      20             23                    32
const SE_HA_DESBOCADO_EN = { tuPrueba: 115, queHaces: 240, dondeTeCaes: 45, cuandoTeCaes: 32 };
const SE_HA_DESBOCADO = punto => SE_HA_DESBOCADO_EN[punto];

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
  const encargo = `${EL_P2_NO_ES_EL_P1}

${REGLAS_COMUNES}


LO QUE TE TOCA AHORA

Escribes UNA parte del documento, la que va con este título: "${parte.titulo}".

TE DAN CUATRO LÍNEAS YA DECIDIDAS Y ESCRIBES LAS CUATRO, cada una por su lado. No eliges tú lo que va: eso ya está decidido con todo su plan delante. Lo tuyo es que se entienda y que sirva.

NO DECIDES, EXPLICAS. Coges la línea que te dan y la abres: qué es exactamente, cómo se hace, por qué así y no de otra manera, y qué pasa cuando lo hace. Todo lo que escribas tiene que poder rastrearse a la línea que te han dado. Si te falta un dato, no te lo inventas: cuentas mejor lo que ya está.

Y NO TE SALGAS DE LO TUYO. Las otras partes del documento las escribe otro y no las ves. Lo tuyo es esto y nada más.

CADA UNA DE LAS CUATRO ES SU PROPIO TEXTO, seguido, en párrafos, sin títulos dentro y sin anunciar lo que viene. Los nombres los pone el programa. Y no se repiten entre ellas: lo que ya has dicho en una no vuelve en la siguiente.

LAS CUATRO, Y LO QUE VA EN CADA UNA:

"tuPrueba"
Qué le pone la vida delante aquí y en quién se convierte el día que lo supere. Se entra por lo que le pasa a quien lee, nunca por la idea, y se cuenta como lo que tiene delante y le toca aprender, no como algo suyo que está mal. Sin anunciarlo: nada de abrir diciéndole que esto es una prueba que la vida le pone, que suena a libro y encima ya lo pone en el título. Que sea una prueba se nota en cómo está contado. Y la segunda mitad es lo que gana: cómo es ahí su vida el día que ya lo ha superado, en concreto y en presente, con lo que va a estar pasando y no con lo que va a sentir. Unas ${PALABRAS_PEDIDAS.tuPrueba} palabras para hacerte una idea del tamaño. Si lo dices en menos, mejor.

"queHaces"
Es la más larga de las cuatro y por la que ha pagado. Te dan UNA sola cosa que hacer, y como es una, cabe explicarla entera: qué hace exactamente, cómo se hace las primeras veces cuando todavía no le sale, qué dice o qué hace en su lugar cuando le salga lo de siempre, y cómo lo sostiene cuando deje de ser nuevo. Tan claro que lo pueda hacer mañana sin preguntarle a nadie. No le añadas otras cosas que hacer: la que te dan y nada más, contada hasta el final. Unas ${PALABRAS_PEDIDAS.queHaces} palabras, que es de sobra si no das rodeos.

"dondeTeCaes"
Dónde se va a caer intentándolo, avisado antes de que le pase: lo que va a aparecer para frenarle o lo que va a hacer mal creyendo que así va más deprisa. Y que eso llega siempre y es señal de que va bien, no de que se esté equivocando. Y qué hace justo ahí. Unas ${PALABRAS_PEDIDAS.dondeTeCaes} palabras.

"cuandoTeCaes"
Qué hace el día que lo deja. El paso concreto para volver -y que sea más pequeño que el del principio, porque el día que se ha caído no puede con el del principio-, y que dejarlo entraba en el plan y no significa que no sirva. Nada de animar. Unas ${PALABRAS_PEDIDAS.cuandoTeCaes} palabras.

ANTES DE DARLO POR BUENO, LEE LAS CUATRO Y PREGÚNTATE ESTO DE CADA FRASE: ¿esto lo puede hacer o ver una persona? Si en una frase hay algo que solo pasa como imagen -que ella se apague, se borre, se rompa, se abra, se cierre, se llene o se vacíe- eso no es lo que le pasa, es una manera bonita de decirlo, y quien lo lee tiene que pararse a traducirlo. Se cambia por lo que hace o por lo que le ocurre de verdad. Es la frase más fácil de escribir y la que menos sirve.

LAS CIFRAS DE ARRIBA SON PARA QUE SEPAS EL TAMAÑO DE CADA COSA. Cuanto más corto, mejor: si lo dices en la mitad, has acertado. Lo único que no se hace nunca es cortar una frase por la mitad para que quepa. Si ves que no cabe, quitas algo entero y cierras: lo que no puede pasar es que quede a medias.

LOS PÁRRAFOS SE SEPARAN CON UNA LÍNEA EN BLANCO. Es lo único de maqueta que haces tú, y hace falta: sin esa línea todo sale pegado en un bloque y no hay quien lo lea en un móvil.


LO QUE SE HA DECIDIDO PARA ESTA PARTE:

${PUNTOS.map(punto => `"${punto}"\n${parte[punto]}`).join('\n\n')}

Quien lo va a leer es ${comoSeLeHabla(sexo)}
Nombre de pila: ${nombre}
${REGLA_DEL_NOMBRE(puedeElNombre)}`;

  const cuantas = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
  // En cuantos parrafos viene. La separacion la marca el modelo con una linea
  // en blanco, y sin ella el punto mas largo sale como un muro de texto.
  const parrafosDe = t => String(t || '').split(/\n+/).filter(x => x.trim()).length;
  const cortos = p => PUNTOS.filter(punto => cuantas(p[punto]) < PALABRAS_MINIMAS[punto]);
  // Se mide contra el tope CON su margen: pasarse un poco entra, pasarse de
  // verdad se reescribe. Ver MARGEN_DE_LARGO.
  const pasados = p => PUNTOS.filter(punto => cuantas(p[punto]) > SE_HA_DESBOCADO(punto));
  const colgados = p => PUNTOS.filter(punto => acabaColgado(p[punto]));

  const salida = await sinNombrarLaCarta({
    que: `la parte "${parte.titulo}"`,
    // Se mira que los cuatro esten contados enteros, que el que manda hacer
    // algo venga en parrafos y que ninguno se ponga a contarle otra vez como
    // es.
    // Lo de contar marcas de que-hacer solo vale para "que haces", que es el
    // unico que explica como se hace algo. Su prueba o donde se cae se cuentan
    // de otra manera y exigirselas alli haria reescribir textos buenos.
    cojo: p => cortos(p).length > 0
            || pasados(p).length > 0
            || colgados(p).length > 0
            || PUNTOS.some(punto => esRelleno(p[punto]))
            || parrafosDe(p.queHaces) < 2
            || cuentaComoEs(p.queHaces, 0)
            || PUNTOS.some(punto => soloPalabrasDeDiagnostico(p[punto])),
    aviso: p => cuentaComoEs(p.queHaces, 0) || PUNTOS.some(punto => soloPalabrasDeDiagnostico(p[punto]))
      ? '\n\nY OJO: la vez anterior te pusiste a contarle cómo es y de dónde le viene. Eso ya se lo contaron entero y aquí no va. Se cuenta qué tiene delante y adónde le lleva, qué hace, dónde se cae y qué hace ese día.'
      : pasados(p).length
        ? `\n\nY OJO: la vez anterior "${pasados(p).map(x => BLOQUES[x]).join('", "')}" se te fue larguísimo, al triple de lo que hacía falta. Eso no es explicar más, es dar vueltas: quien lo lee no relee, y lo que sobra tapa lo que importa. Di lo que hay que decir y para.`
      : PUNTOS.some(punto => esRelleno(p[punto]))
        ? `\n\nY OJO: la vez anterior dejaste una casilla con una palabra de relleno dentro (${PUNTOS.filter(punto => esRelleno(p[punto])).map(x => BLOQUES[x]).join(', ')}) en vez de escribirla. Esto lo lee una persona que ha pagado por ello: las cuatro se escriben, y si te has quedado sin hilo, se vuelve a empezar esa.`
      : colgados(p).length
        ? `\n\nY OJO: la vez anterior algo se quedó a media frase (${colgados(p).map(x => BLOQUES[x]).join(', ')}). Se termina lo que se empieza: cada uno de los cuatro acaba su última frase, con su punto.`
        : `\n\nY OJO: la vez anterior algo salió corto o vino de una pieza${cortos(p).length ? ` (${cortos(p).map(x => BLOQUES[x]).join(', ')})` : ''}. Cada uno de los cuatro se cuenta entero, y lo que tiene que hacer va repartido en párrafos separados por una línea en blanco. Lo que falta no es adorno: es explicar mejor lo que ya está decidido.`,
    tope: ESPERA_DE_ESCRIBIR_MS,
    pedir: (recordatorio, cuanto) => alModelo({
      que: `escribir "${parte.titulo}"`,
      modelo: 'claude-sonnet-5',
      piensa: '',
      techo: TECHO_DE_ESCRIBIR,
      system: encargo,
      mensaje: `Escribe las cuatro partes de esta, enteras.${recordatorio}`,
      molde: MOLDE_DE_LA_PARTE,
      espera: AbortSignal.timeout(cuanto),
    }),
    texto: p => PUNTOS.map(punto => p[punto]).join(' '),
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
  aviso.textContent = 'Decidiendo su plan… (es la única parte que piensa, y es la que más tarda)';
  try {
    const r = await llamar({ accion:'plan', compra });
    plan = r.plan;
    quienEs = r.quien;
    // El servidor no deja pasar un informe sin nombre, asi que esto no
    // deberia saltar nunca. Pero si saltara, es mejor pararse aqui que
    // escribir siete partes dirigidas a "undefined".
    if (!quienEs || !quienEs.nombre) throw new Error('El informe ha venido sin el nombre del cliente');
  } catch (e) {
    aviso.className = 'aviso error';
    aviso.textContent = 'No se ha podido decidir el plan: ' + e.message;
    ir.disabled = false; quien.disabled = false;
    return;
  }

  // 2. Las siete partes, TODAS A LA VEZ.
  //
  // Cada una es su propia peticion, asi que lanzarlas juntas no acerca a
  // ninguna al tiempo maximo del servidor. De una en una esto tardaba lo que
  // tardan las siete sumadas; asi tarda lo que tarde la mas lenta.
  //
  // Se pintan en su hueco, en el orden del documento, y no segun van llegando:
  // el sitio se reserva antes y cada una cae en el suyo.
  // Lo decidido, arriba del todo y antes de escribir nada: asi se puede mirar
  // mientras se escriben las siete.
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
  // DOS Y NO TRES. Cada vuelta cuesta hasta un minuto de espera y una llamada
  // por parte caida. En el plan donde se cayeron tres, la tercera vuelta no
  // arreglo ninguna: solo sumo un minuto y tres llamadas a la basura.
  const INTENTOS = 2;
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
      // La etiqueta pequena de cada parte y los nombres de sus cuatro puntos van
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
  // De donde sale cada parte. Una con dos o mas numeros es una que ha juntado
  // dos desafios que decian lo mismo, que es lo que tiene que pasar.
  const filas = partes.map((p, i) => {
    const deCuantos = (p.deCuales || []).length;
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + escapar(p.titulo || '') + '</td>' +
      '<td>' + escapar((p.deCuales || []).join(', ')) + (deCuantos > 1 ? ' <b>(juntados)</b>' : '') + '</td>' +
      '<td>' + escapar(p.queHaces || '') + '</td>' +
    '</tr>';
  }).join('');

  const fuera = (limpieza && limpieza.sequitan) || [];
  const entraron = partes.length + fuera.length;

  const quitadas = fuera.length
    ? '<p class="quitadas"><b>Se han quitado ' + fuera.length + ':</b> ' +
      fuera.map(x => '#' + escapar(x.numero) + ' — ' + escapar(x.porque)).join(' · ') + '</p>'
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
