// ════════════════════════════════════════════════════════════════
// api/p2-plan/prueba.js
//
// TU PLAN DE ORIGEN (P2), ENTERO Y EN UN SOLO FICHERO.
//
// VA JUNTO A PROPOSITO. Todo el P2 esta aqui dentro: como se le habla, sus
// siete partes, como se lee el informe del P1 que ya quedo guardado, como se
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
//   UNA LLAMADA DECIDE, PENSANDO. Recibe los rasgos del P1 y lo que ella misma
//   ha contado de su vida, y decide en corto los cinco puntos de cada una de
//   las siete partes. Siete cosas distintas, ninguna idea repetida entre
//   ellas. No escribe ni una linea del documento.
//
//   SIETE ESCRIBEN, A LA VEZ. Cada una recibe solo las cinco lineas de su
//   parte, y nada mas. No deciden: explican y amplian esas cinco lineas hasta
//   que se entiendan a la primera.
//
//   Y UNA AL FINAL ESCRIBE LA HOJA DE RUTA, leyendo las siete partes ya
//   escritas. Va la ultima porque es un resumen de lo que pone el documento,
//   asi que tiene que ver el documento.
//
// Por que se decide todo de golpe: si cada parte se decidiera por su cuenta,
// varias llegarian a la misma conclusion con otras palabras y la clienta
// leeria siete cosas que en realidad son dos. Eso solo se ve teniendo las
// siete delante a la vez.
//
// ── QUE LLEVA EL DOCUMENTO ──────────────────────────────────
//
//   LAS SIETE PARTES, todas iguales, cada una con cinco cosas:
//     1. A donde va en esa parcela.
//     2. Que se lo impide hoy.
//     3. El plan: la unica cosa que tiene que hacer ahi, contada entera.
//     4. Donde se va a caer intentandolo.
//     5. Como se levanta el dia que lo deja.
//
//   Y LA HOJA DE RUTA al final: por donde empieza y por que esa, las siete en
//   orden con lo que hace en cada una, y que hacer si lo deja del todo. Es la
//   que se queda a mano: lo demas se lee una vez, esto se usa.
//
// ── COMO SE USA ─────────────────────────────────────────────
//
// Se abre /api/p2-plan/prueba en el navegador, sale la lista de los ultimos
// informes guardados, se pincha uno y el plan va apareciendo.
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

Así que aquí no se diagnostica. No le explicas de dónde le viene lo que hace, ni le buscas la causa en su casa o en su infancia, ni le pones nombre a lo que le pasa, porque todo eso está dicho ya, y repetírselo con otras palabras es quitarle el sitio a lo único que ha venido a buscar, que es qué hace a partir de mañana.

De ahí salen las dos reglas que mandan sobre todas las demás:

1. DE LO SUYO SOLO APARECE LO QUE TE DAN ESCRITO ABAJO, y ni una cosa más. Nada del porqué: de dónde le viene, quién se lo hizo, cómo se llama lo que le pasa. Todo eso se lo contaron ya, y aquí ocupa el sitio de lo que ha venido a buscar. Si no puedes señalar de dónde sale lo que escribes, no lo escribes.

2. LO TUYO ES EL CÓMO. No solo qué hace: sobre todo cómo, que es lo que nadie le explica y lo que no está en su estudio. Es a lo que ha venido.

Se escribe hacia delante, no hacia atrás: no de lo que le pasó, sino de lo que hace hoy y de lo que va a hacer con ello.`;

// ── LAS SIETE PARTES ────────────────────────────────────────
//
// Van estas siete y en este orden, el mismo del P1: cada una recoge lo que el
// P1 le conto en la suya.
//
// TODAS LLEVAN LO MISMO. Antes unas tenian dos cajas y otras una, y el
// documento salia desigual: la clienta lo nota y parece que a unas partes se
// les ha dedicado menos. Ahora las siete tienen la misma forma y lo unico que
// cambia es lo que hay dentro, que es lo suyo.
//
// LOS TITULOS SE ESCRIBEN AQUI, no los escribe el modelo. Es lo que hace que
// salgan siempre bien puestos y con sus tildes, y lo que deja que dos clientas
// reciban el mismo documento con dentro sus dos vidas distintas.
//
// "del_p1" es la etiqueta con la que el P1 marca los rasgos de cada area.

// NI DOS EMPIEZAN CON LA MISMA PALABRA. Van los siete seguidos en el mismo
// documento y se leen del tiron: si todos arrancan igual se ve el molde a la
// primera y esto empieza a parecer una plantilla.
const AREAS = [
  { id: 'identidad',   del_p1: 'IDENTIDAD',   titulo: 'Quién eres cuando ocupas tu sitio',
    deQueVa: 'quién es y cómo se planta delante de los demás' },
  { id: 'patrones',    del_p1: 'PATRONES',    titulo: 'Tu día cuando dejas de repetirte',
    deQueVa: 'lo que repite, su día a día, su manera de funcionar' },
  { id: 'miedos',      del_p1: 'MIEDOS',      titulo: 'Lo que haces cuando el miedo deja de mandar',
    deQueVa: 'lo que le frena y lo que evita' },
  { id: 'herida',      del_p1: 'HERIDA',      titulo: 'Cuando sueltas lo que no te toca cargar',
    deQueVa: 'lo que le duele de antiguo, su casa y los suyos' },
  { id: 'amor',        del_p1: 'AMOR',        titulo: 'Querer sin el patrón de siempre',
    deQueVa: 'la pareja, el deseo y el disfrute' },
  { id: 'relaciones',  del_p1: 'RELACIONES',  titulo: 'El sitio que ocupas entre los demás',
    deQueVa: 'la gente, hablar, los grupos, los amigos' },
  { id: 'dinero',      del_p1: 'DINERO',      titulo: 'Con el dinero y el trabajo, decides tú',
    deQueVa: 'el dinero, el trabajo y lo que vale lo suyo' },
];

// LOS CUATRO NOMBRES QUE VE DENTRO DE CADA PARTE, escritos aqui por lo mismo
// que los titulos.
//
// Antes todo iba en un bloque de texto sin nombre: dentro habia varias cosas y
// quien leia no sabia de que le hablaba cada una, ni podia volver a buscar una
// el dia que le hiciera falta. Y sirven para otra cosa igual de importante: un
// documento de veinte hojas de texto seguido cansa la vista, y estos son los
// sitios donde el ojo para y descansa.
//
// El texto corrido se queda sin nombre a proposito: es lo primero que se lee y
// no necesita etiqueta. Lo que sale con nombre es lo que se busca despues.
//
// VAN EN ESTE ORDEN, que es el de lo que le pasa: primero lo que hace, luego
// lo que la va a parar, luego la manera de hacerlo que no sirve, y al final en
// que va a ver que funciona.
const BLOQUES = {
  adondeVas:      'Adónde vas',
  queTeFrena:     'Qué te frena',
  elPlan:         'El plan',
  dondeTeCaes:    'Dónde te vas a caer',
  comoTeLevantas: 'Cómo te levantas',
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
// Asi que lo reparte el codigo: el principio y dos partes separadas entre si.
// Tres veces en todo el documento.
const NOMBRE_EN = new Set(['identidad', 'amor']);

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
// siete areas y los rasgos.
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

// Lo que se le manda del informe del P1 para que decida: sus rasgos con su
// area y su porque. El texto de las siete areas NO va aqui a proposito: es
// enorme, ya esta resumido en los rasgos, y el P2 no tiene que volver a
// contarle nada de eso.
// LO QUE ELLA MISMA HA CONTADO DE SU VIDA.
//
// Es lo unico que sabemos de su vida de hoy: el informe del P1 cuenta como es,
// no en que se le va el dia ni con quien lo pasa. Sin esto, lo que se decida
// vale igual para cualquiera, y eso es justo lo que no puede pasar.
//
// SI DEJA UNA EN BLANCO, SE DICE QUE ESTA EN BLANCO. Poner el hueco y callarse
// es lo que hace que el modelo se lo invente.
function loQueHaContado(respuestas) {
  const dijo = c => String(respuestas?.[c] || '').trim();
  const linea = (titulo, texto) => `${titulo}\n${texto || '(no ha contestado a esto)'}`;
  return ['LO QUE ELLA HA CONTADO DE SU VIDA:', '',
    linea('CÓMO ES SU VIDA HOY:', dijo('hoy')), '',
    linea('CÓMO LE GUSTARÍA QUE FUERA:', dijo('comoLeGustaria')), '',
    linea('LO QUE LLEVA AÑOS INTENTANDO CAMBIAR Y NO CAMBIA:', dijo('loQueNoCambia')),
  ].join('\n');
}

function susRasgos(rasgos) {
  const linea = (r, conPorque) =>
    `- ${r.nombre}: ${r.descripcion}` +
    (conPorque && r.causa ? ` PORQUE: ${r.causa}` : '');
  const deArea = (lista, area) => (lista || []).filter(r => r && r.area === area);

  return AREAS.map(a => {
    const f = deArea(rasgos?.fortalezas, a.del_p1).map(r => linea(r, false));
    const d = deArea(rasgos?.desafios, a.del_p1).map(r => linea(r, true));
    return `${a.del_p1}\nSE LE DA BIEN:\n${f.join('\n') || '(nada)'}\nLE CUESTA:\n${d.join('\n') || '(nada)'}`;
  }).join('\n\n');
}
// ════════════════════════════════════════════════════════════════
// PASO 1: DECIDIR EL PLAN ENTERO, PENSANDO
// ════════════════════════════════════════════════════════════════
//
// Esta es la unica llamada que decide, y es todo el cambio. Tambien es la
// unica que piensa a fondo: las que escriben piensan poco, y solo para
// releerse.
//
// Recibe sus rasgos de las siete partes de golpe y decide el documento entero
// en corto: que va en cada parte, por cual empieza, en que orden siguen y que
// hace el dia que falle. No escribe ni una linea de lo que ella va a leer.
//
// POR QUE DE GOLPE. Lo que hay que evitar es que las siete partes le manden
// hacer lo mismo con otras palabras, y eso solo se ve teniendo las siete
// delante a la vez. Pedirlas de una en una y confiar en que no se repitan es
// lo que fallaba antes.
//
// EL ESFUERZO, MEDIO. Es el que termina a tiempo. Con alto se pasa del tope y
// la clienta se queda mirando una pantalla en blanco; se probo en el P1 y
// costo un informe entero.
//
// Y SI VIENE A MEDIAS SE PIDE OTRA VEZ, pero dos intentos de esto no caben en
// los 300 segundos que aguanta la peticion: el segundo no pide otros 200, pide
// lo que sobre del primero, y si no sobra bastante no se pide.

const ESPERA_DEL_PLAN_MS = 200000;
const TECHO_DEL_PLAN = 16000;

// LO QUE AGUANTA LA PETICION, MENOS UN MARGEN PARA CONTESTAR. El servidor corta
// a los 300 segundos, y si corta el, la clienta ve una pagina rota en vez de un
// aviso. Aqui se corta antes y con un mensaje.
const MARGEN_DEL_SERVIDOR_MS = 285000;

// Y POR DEBAJO DE ESTO NO SE VUELVE A PEDIR. Un segundo intento con medio
// minuto por delante no termina: gasta dinero, se corta igual y encima se lleva
// por delante el plan que ya habia, que estaba a medias pero estaba.
const ESPERA_MINIMA_PARA_REHACER_MS = 90000;

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
          area:           { type: 'string', enum: AREAS.map(a => a.id) },
          adondeVas:      { type: 'string' },
          queTeFrena:     { type: 'string' },
          elPlan:         { type: 'string' },
          dondeTeCaes:    { type: 'string' },
          comoTeLevantas: { type: 'string' },
        },
        required: ['area', ...PUNTOS],
        additionalProperties: false,
      },
    },
  },
  required: ['partes'],
  additionalProperties: false,
};

async function pedirElPlan({ nombre, sexo, rasgos, respuestas, recordatorio = '', espera = ESPERA_DEL_PLAN_MS }) {
  const encargo = `Estás preparando el plan de una persona: lo que tiene que hacer para llegar a ser quien quiere ser y tener la vida que quiere.

Abajo tienes dos cosas: lo que ya se sabe de ella, sacado de su carta natal, y lo que ella misma ha contado de su vida de hoy y de la que quiere.

AQUÍ NO SE ESCRIBE EL DOCUMENTO. Aquí se DECIDE. Todo sale en corto, una línea cada cosa, y lo que se va a leer lo escribe otro después. Por eso puedes dedicarle el rato a lo que de verdad importa: decidir qué le va a mover la vida y qué no.

Y AQUÍ NO SE DIAGNOSTICA. No le vuelvas a contar cómo es ni de dónde le viene: eso ya lo tiene, se lo leyó entero en otro documento. Lo suyo solo aparece para enganchar lo que tiene que hacer.


1. QUÉ ES CADA PARTE

Las siete parcelas de su vida, y de qué va cada una:

${AREAS.map(a => `${a.del_p1.padEnd(12)} ${a.deQueVa}`).join('\n')}

CADA PARTE HABLA SOLO DE LO SUYO. Si lo que decides para una habla de otra parcela, va donde habla. Si acabas poniendo lo de los grupos en el día a día, o lo del dinero en los miedos, está mal y se cambia.


2. LAS SIETE A LA VEZ, Y NINGUNA IDEA REPETIDA

Decides las siete de una vez y con las siete delante. Esa es la razón de que esto se haga en un solo sitio: una misma idea, dicha con otras palabras, se cuela en cuatro partes distintas, y quien lo lee cree que tiene veinte cosas cuando en realidad son cinco. Eso solo se ve teniéndolas todas juntas.

Así que son SIETE COSAS DISTINTAS. Antes de dar por buena la última, lee las siete seguidas: si dos dicen lo mismo con otras palabras, una de las dos se cambia por algo que de verdad sea otra cosa.

Y ojo, porque esto pasa de verdad: una persona tiene una manera de funcionar que le asoma en varias parcelas. Que la raíz sea la misma no vale de excusa. Lo que decides para cada parte se juega en SU terreno y con lo que ahí ocurre, y no se parece a lo de al lado.


3. QUÉ DECIDES DE CADA PARTE

De cada una de las siete sacas cinco cosas, en una línea cada una, y ninguna se queda vacía. La línea va escrita para que quien la lea después la entienda entera sin preguntar nada: no es un título, es la cosa dicha en corto.

adondeVas        A dónde va en esa parcela: cómo quiere ser ahí y cómo es su
                 vida cuando ya es así. Sale de lo que ella ha contado que
                 quiere, no de lo que te parezca bien a ti. Y es de esa
                 parcela, no de su vida entera.

queTeFrena       Lo que se lo impide hoy. No lo que le pasa por fuera: lo que
                 se cree y da por cierto sin haberlo puesto en duda nunca, y
                 que hace que siga igual. Sale de lo que sabes de ella.

elPlan           UNA SOLA COSA que tiene que hacer en esta parcela. Una, no
                 dos ni tres. Es lo más importante de las cinco y lo que ha
                 venido a buscar, y es una porque nadie cambia siete cosas a la
                 vez: si le pones tres por parcela acaba con veintiuna delante
                 y no hace ninguna.
                 Va con nombre de conducta, no de idea: qué deja de hacer y qué
                 hace en su lugar, algo que se pueda ver ocurriendo. Si lo que
                 escribes no se puede ver pasando, está mal y se cambia.
                 Y ESA COSA ES DE ESTA PARCELA Y DE NINGUNA OTRA. Las siete son
                 siete cosas distintas de verdad: no la misma conducta puesta
                 en siete sitios con otras palabras.

dondeTeCaes      Dónde se va a caer intentándolo: lo que va a aparecer para
                 frenarla, o el fallo que va a cometer porque parece que va
                 más deprisa y la deja peor. El que le pega a ESTA persona en
                 ESTA parcela, no uno que le valdría a cualquiera.

comoTeLevantas   Qué hace el día que lo deja. No es animarla: es el paso
                 concreto para volver, y que dejarlo entraba en el plan.


4. LO QUE NO SE PUEDE ESCRIBIR

NO SE INVENTA NADA DE SU VIDA. Lo que sabes de ella es lo que hay abajo y nada más. Si no ha dicho que tenga pareja, trabajo, hijos, casa o familia, no los tiene: no los nombres, no los supongas y no los uses para montar nada.

Y AL REVÉS: lo que sí ha contado, se usa. Si dice en qué se le va el día, ahí es donde pasa lo que decidas. Si dice quién le importa, con esa gente ocurre. Ese es todo el trabajo.

Nada que le valga igual a cualquiera. Si lo que has escrito se le podría mandar a otra persona distinta, está mal y se cambia.

Y NADA DE EJERCICIOS DE TERAPIA. Ni buscar de dónde le viene algo, ni ponerle nombre a quién se lo hizo, ni rituales, ni papeles que se rompen, ni nada que se parezca a una consulta. Lo que hace es algo que ya haría en su vida corriente, hecho distinto.

Y nada técnico: ni planetas, ni signos, ni casas. Quien lo lee no ve la carta.


5. EL REPASO, ANTES DE ENTREGAR

Con las siete delante:

PRIMERO, QUE LAS SIETE ESTÉN Y ENTERAS. Las ${AREAS.length}, cada una con sus cinco cosas y ninguna resuelta de pasada.

DESPUÉS, QUE NO SE REPITAN. Lee los siete "elPlan" seguidos: si dos le piden lo mismo con otras palabras, uno se cambia. Y lo mismo con los siete "adondeVas".

Y POR ÚLTIMO, QUE TODO SALGA DE LO QUE TIENES ABAJO. Si señalas una línea y no puedes decir de dónde sale, se cambia.

Devuelve solo lo decidido. No expliques lo que has quitado.


LO QUE SE SABE DE ESA PERSONA, DE SU CARTA:

${susRasgos(rasgos)}

${loQueHaContado(respuestas)}

Quien lo va a leer es ${comoSeLeHabla(sexo)}
Nombre de pila: ${nombre}`;

  const salida = await alModelo({
    que: 'decidir el plan',
    modelo: 'claude-sonnet-5',
    piensa: 'medium',
    techo: TECHO_DEL_PLAN,
    system: encargo,
    mensaje: `Decide su plan entero, siguiendo el esquema.${recordatorio}`,
    molde: MOLDE_DEL_PLAN,
    espera: AbortSignal.timeout(espera),
  });

  // Se ordena como van en el documento y se deja solo una parte por area: si
  // el modelo repitiera un area, la segunda sobra y no puede colarse.
  const porArea = new Map();
  for (const p of (Array.isArray(salida.partes) ? salida.partes : [])) {
    const id = String(p?.area || '').trim();
    if (!id || porArea.has(id)) continue;
    const suyo = { area: id };
    for (const punto of PUNTOS) suyo[punto] = String(p?.[punto] || '').trim();
    porArea.set(id, suyo);
  }

  // UNA PARTE A MEDIAS NO SE ESCRIBE. Si viene con una casilla vacia, quien
  // escribe se encuentra un hueco y lo rellena por su cuenta, y entonces se
  // inventa algo de su vida que no sale de ningun sitio.
  const entera = p => PUNTOS.every(punto => p[punto]);
  const partes = AREAS.map(a => porArea.get(a.id)).filter(p => p && entera(p));

  // Y LO QUE HAYA SALIDO MAL, DICHO. Es lo que decide si se pide otra vez y lo
  // que se le recuerda al pedirlo.
  const falla = [];
  const faltan = AREAS.filter(a => !porArea.has(a.id) || !entera(porArea.get(a.id)));
  if (faltan.length) falla.push(`faltan estas partes enteras: ${faltan.map(a => a.del_p1).join(', ')}`);

  // ── Y QUE NO SE REPITA NINGUNA ────────────────────────────
  //
  // Es lo que mata este producto: siete parcelas que le mandan hacer lo mismo
  // con otras palabras. Lee siete cosas que hacer y en realidad son dos, y a
  // la semana no ha hecho ninguna.
  //
  // Al encargo se le pide, y con una sola cosa por parcela ya es raro que
  // pase, pero pedirlo no basta: aqui se comprueba, y si dos se parecen se
  // vuelve a pedir el plan entero, que es lo unico que lo arregla -quitar una
  // dejaria a esa parcela sin nada que hacer.
  //
  // Se comparan por las palabras que llevan dentro, cortadas a cinco letras
  // para que la misma cosa escrita en otro tiempo verbal cuente como la misma,
  // y quitando antes el armazon que llevan todas -cuando, cada, antes, hacer,
  // cosa, vez-, porque si se deja, dos cosas distintas dichas con la misma
  // forma salen parecidas y dos iguales dichas de otra manera no.
  //
  // Medido con pares escritos a mano: la misma cosa dicha de dos maneras da
  // entre 0,50 y 0,80; dos cosas distintas, aunque compartan el dia y el
  // verbo, no pasan de 0,27. Se corta en 0,40, en medio del hueco.
  const ARMAZON = new Set(['cuand','cada','notes','antes','despu','para','como',
    'mismo','misma','sobre','entre','hasta','desde','porqu','pero','tambi',
    'toda','todo','solo','sola','veces','nada','algo','otra','otro','cosa',
    'cosas','hace','hacer','haces','dice','dices','decir','esta','este']);

  const palabrasDe = txt => new Set(
    sinTildes(txt).replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/)
      .filter(w => w.length >= 4).map(w => w.slice(0, 5))
      .filter(w => !ARMAZON.has(w)));

  const seParecen = (a, b) => {
    if (!a.size || !b.size) return false;
    let juntos = 0;
    for (const w of a) if (b.has(w)) juntos++;
    return juntos / (a.size + b.size - juntos) >= 0.40;
  };

  const repetidas = [];
  for (let i = 0; i < partes.length; i++) {
    for (let j = i + 1; j < partes.length; j++) {
      if (seParecen(palabrasDe(partes[i].elPlan), palabrasDe(partes[j].elPlan))) {
        repetidas.push(`${partes[i].area} y ${partes[j].area}`);
      }
    }
  }
  if (repetidas.length) falla.push(`estas partes mandan hacer lo mismo: ${repetidas.join('; ')}`);

  return { plan: { partes }, falla };
}

// ── Y SI EL PLAN VIENE A MEDIAS, SE PIDE OTRA VEZ ───────────
//
// Es la unica llamada que decide, y de ella cuelga el documento entero: si
// vuelve con seis partes en vez de siete, la clienta se queda sin una parcela
// de su vida y paga lo mismo.
async function decidirElPlan({ nombre, sexo, rasgos, respuestas }) {
  const arranque = Date.now();
  const primero = await pedirElPlan({ nombre, sexo, rasgos, respuestas });
  if (!primero.falla.length) return primero.plan;

  // Y SOLO SE PIDE OTRA VEZ SI CABE. Lo que quede del tiempo del servidor, y
  // nunca menos de lo que tarda en salir uno entero.
  const queda = loQueQueda(arranque, ESPERA_DEL_PLAN_MS);
  if (queda < ESPERA_MINIMA_PARA_REHACER_MS) {
    console.warn(`[p2] el plan ha venido a medias (${primero.falla.join('; ')}), pero ya no queda tiempo para rehacerlo`);
    return primero.plan;
  }

  console.warn(`[p2] el plan ha venido a medias (${primero.falla.join('; ')}), se pide otra vez`);
  const segundo = await pedirElPlan({
    nombre, sexo, rasgos, respuestas,
    espera: queda,
    recordatorio: `\n\nY OJO CON ESTO, que la vez anterior salió mal: ${primero.falla.join('; ')}. Las ${AREAS.length} partes van todas, ninguna se queda fuera, cada una con sus cinco cosas escritas enteras, y en cada una UNA sola cosa que hacer, distinta de verdad de las de las otras seis.`,
  });

  // Y SE QUEDA EL MEJOR DE LOS DOS. Pedir otra vez no garantiza que salga
  // mejor: el segundo puede venir peor que el primero.
  if (segundo.falla.length < primero.falla.length) return segundo.plan;
  console.warn('[p2] el segundo plan no ha mejorado, se entrega el primero');
  return primero.plan;
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
  if (resto.trim().split(/\s+/).length < 120) return false;
  return MARCAS_DE_QUE_HACER.filter(re => re.test(resto)).length < MARCAS_MINIMAS;
}

// UNA CASILLA VACIA O CON SU PROPIO TITULO DENTRO NO VALE.
//
// En un plan de verdad salieron casillas en blanco y otras con el nombre del
// bloque escrito como si fuera el texto -"Asi eres aqui" dentro de la casilla
// que ya se titula asi-, y el documento parecia roto.
//
// Se comprueba lo que se puede comprobar sin opinar: que hay texto, que no es
// una linea suelta y que no es el titulo repetido.
const LARGO_MINIMO = 60;

// Dos textos son el mismo aunque cambien las mayusculas, las tildes o la
// puntuacion. Comparar dos cadenas a pelo no es criterio.
const comoSeCompara = txt =>
  sinTildes(txt).replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();

function estaVacia(texto, titulo) {
  const limpio = String(texto || '').trim();
  if (limpio.length < LARGO_MINIMO) return true;
  return comoSeCompara(limpio) === comoSeCompara(titulo);
}

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
// PERO SI PIENSAN, Y POCO. No para decidir, que eso ya esta hecho, sino para
// releerse antes de entregar. La regla que mas se saltaban -leerla por dentro
// y, si nadie la diria hablando, reescribirla- es justo la que no se puede
// cumplir sin pararse a comprobarla.
//
// El esfuerzo, bajo: aqui no hay nada que comparar ni que elegir, solo repasar
// lo que se acaba de escribir. Y el techo sube, porque pensar sale del mismo
// presupuesto que escribir y con el de antes la respuesta llegaria cortada.
//
// CADA UNA VE SOLO SU PARTE. No hace falta que vea las demas: el paso que
// piensa ya se encargo de que no se repitan.

// LO QUE SE LE DA A CADA INTENTO.
//
// Escribir una parte son cinco casillas y trescientas y pico palabras, y es la
// respuesta mas larga que se pide. Con 120 segundos se corto una de verdad, y
// con 65 -medidos cuando eran cuatro casillas y doscientas sesenta- se cortaba
// siempre.
//
// Ahora 170. Dos intentos de 170 no caben en los 300 segundos que aguanta esta
// peticion, y por eso el segundo no pide otros 170: pide lo que sobre del
// primero (loQueQueda), y si no sobra ni para medio intento no se pide.
const ESPERA_DE_ESCRIBIR_MS = 170000;
const TECHO_DE_ESCRIBIR = 12000;

const MOLDE_DE_LA_PARTE = {
  type: 'object',
  properties: {
    adondeVas:      { type: 'string' },
    queTeFrena:     { type: 'string' },
    elPlan:         { type: 'string' },
    dondeTeCaes:    { type: 'string' },
    comoTeLevantas: { type: 'string' },
  },
  required: PUNTOS,
  additionalProperties: false,
};

// Lo minimo que ocupa cada punto para estar contado y no despachado. No es por
// llenar: explicarle bien algo no cabe en tres frases, y el que escribe tiende
// a resumir la linea que le dan en vez de abrirla.
const PALABRAS_MINIMAS = { adondeVas: 110, queTeFrena: 110, elPlan: 200, dondeTeCaes: 110, comoTeLevantas: 90 };

// QUIEN ESCRIBE NO DECIDE NADA.
//
// Recibe las cinco lineas de SU parte y nada mas: ni los rasgos, ni lo que ella
// conto, ni lo de las otras seis. Todo eso ya esta dentro de sus cinco lineas,
// que las decidio quien las tenia delante. Darselo otra vez no le da material
// nuevo: le da sitio para irse por su cuenta y repetir lo de la parte de al
// lado, que es lo que hay que evitar.
//
// Su trabajo es explicar y ampliar hasta que se entienda a la primera.
async function escribirLaParte({ area, nombre, sexo, decidido }) {
  const encargo = `${EL_P2_NO_ES_EL_P1}

${REGLAS_COMUNES}


LO QUE TE TOCA AHORA

Escribes UNA parte del documento, la de esta parcela de su vida: ${area.deQueVa}.

TE DAN CINCO LÍNEAS YA DECIDIDAS Y ESCRIBES LAS CINCO, cada una por su lado. No eliges tú lo que va: eso ya está decidido con toda su vida delante. Lo tuyo es que se entienda y que sirva.

NO DECIDES, EXPLICAS. Coges la línea que te dan y la abres: qué es exactamente, cómo se hace, por qué así y no de otra manera, y qué pasa cuando lo hace. Todo lo que escribas tiene que poder rastrearse a la línea que te han dado. Si te falta un dato, no te lo inventas: cuentas mejor lo que ya está.

Y NO TE SALGAS DE TU PARCELA. Las otras seis las escribe otro y no las ves. Lo tuyo es esto y nada más.

CADA UNA DE LAS CINCO ES SU PROPIO TEXTO, seguido, en párrafos, sin títulos dentro y sin anunciar lo que viene. Los nombres los pone el programa. Y no se repiten entre ellas: lo que ya has dicho en una no vuelve en la siguiente.

LAS CINCO, Y LO QUE VA EN CADA UNA:

"adondeVas"
A dónde va en esta parcela: cómo va a ser ahí y cómo es su vida cuando ya sea así. Se escribe en presente y en concreto, con lo que va a estar pasando en su vida cuando esté ahí, no con lo que va a sentir. Al menos ${PALABRAS_MINIMAS.adondeVas} palabras.

"queTeFrena"
Lo que se lo impide hoy. Se lo dices claro, sin suavizarlo y sin castigarle: lo que se cree y da por cierto, y lo que le pasa por seguir creyéndolo. Que lo vea entero, porque de ahí sale que quiera moverlo. Al menos ${PALABRAS_MINIMAS.queTeFrena} palabras.

"elPlan"
Es la más larga de las cinco y por la que ha pagado. Te dan UNA sola cosa que hacer, y como es una, cabe explicarla entera: qué hace exactamente, cuándo lo hace -por lo que va a notar, nunca por una hora ni un día de la semana-, cómo se hace las primeras veces cuando todavía no le sale, y cómo lo sostiene cuando deje de ser nuevo. Tan claro que lo pueda hacer mañana sin preguntarle a nadie. No le añadas otras cosas que hacer: la que te dan y nada más, contada hasta el final. Al menos ${PALABRAS_MINIMAS.elPlan} palabras, y aquí no se ahorra ni una.

"dondeTeCaes"
Dónde se va a caer intentándolo, avisado antes de que le pase: lo que va a aparecer para frenarla o lo que va a hacer mal creyendo que va más deprisa. Y que eso llega siempre y es señal de que va, no de que se esté equivocando. Y qué hace justo ahí. Al menos ${PALABRAS_MINIMAS.dondeTeCaes} palabras.

"comoTeLevantas"
Qué hace el día que lo deja. El paso concreto para volver, y que dejarlo entraba en el plan y no significa que no sirva. Nada de animar. Al menos ${PALABRAS_MINIMAS.comoTeLevantas} palabras.

LOS PÁRRAFOS SE SEPARAN CON UNA LÍNEA EN BLANCO. Es lo único de maqueta que haces tú, y hace falta: sin esa línea todo sale pegado en un bloque y no hay quien lo lea en un móvil.


LO QUE SE HA DECIDIDO PARA ESTA PARTE:

${PUNTOS.map(punto => `"${punto}"\n${decidido[punto]}`).join('\n\n')}

Quien lo va a leer es ${comoSeLeHabla(sexo)}
Nombre de pila: ${nombre}
${REGLA_DEL_NOMBRE(NOMBRE_EN.has(area.id))}`;

  const cuantas = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
  // En cuantos parrafos viene. La separacion la marca el modelo con una linea
  // en blanco, y sin ella el punto mas largo sale como un muro de texto.
  const parrafosDe = t => String(t || '').split(/\n+/).filter(x => x.trim()).length;
  const cortos = p => PUNTOS.filter(punto => cuantas(p[punto]) < PALABRAS_MINIMAS[punto]);

  const salida = await sinNombrarLaCarta({
    que: `la parte de ${area.id}`,
    // Se mira que los cinco esten contados enteros, que el mas largo venga en
    // parrafos y que ninguno se ponga a contarle otra vez como es.
    // Lo de contar marcas de que-hacer solo vale para el plan, que es el unico
    // que explica como se hace algo. A donde va o que le frena se cuentan de
    // otra manera y exigirselas alli haria reescribir textos buenos.
    cojo: p => cortos(p).length > 0
            || parrafosDe(p.elPlan) < 2
            || cuentaComoEs(p.elPlan, 0)
            || PUNTOS.some(punto => soloPalabrasDeDiagnostico(p[punto])),
    aviso: p => cuentaComoEs(p.elPlan, 0) || PUNTOS.some(punto => soloPalabrasDeDiagnostico(p[punto]))
      ? '\n\nY OJO: la vez anterior te pusiste a contarle cómo es y de dónde le viene. Eso ya se lo contaron entero y aquí no va. Se cuenta a dónde va, qué se lo impide hoy, qué hace, dónde se cae y cómo vuelve.'
      : `\n\nY OJO: la vez anterior algo salió corto o vino de una pieza${cortos(p).length ? ` (${cortos(p).map(x => BLOQUES[x]).join(', ')})` : ''}. Cada uno de los cinco se cuenta entero, y el plan va repartido en párrafos separados por una línea en blanco. Lo que falta no es adorno: es explicar mejor lo que ya está decidido.`,
    tope: ESPERA_DE_ESCRIBIR_MS,
    pedir: (recordatorio, cuanto) => alModelo({
      que: `escribir ${area.id}`,
      modelo: 'claude-sonnet-5',
      piensa: 'medium',
      techo: TECHO_DE_ESCRIBIR,
      system: encargo,
      mensaje: `Escribe las cinco partes de esta parcela, enteras.${recordatorio}`,
      molde: MOLDE_DE_LA_PARTE,
      espera: AbortSignal.timeout(cuanto),
    }),
    texto: p => PUNTOS.map(punto => p[punto]).join(' '),
  });

  const parte = { id: area.id, titulo: area.titulo };
  for (const punto of PUNTOS) parte[punto] = String(salida[punto] || '').trim();
  return parte;
}


// ── LA HOJA DE RUTA, AL FINAL ───────────────────────────────
//
// Es lo ultimo que se escribe y lo unico que va a mirar despues: la hoja que
// se queda a mano cuando ya ha cerrado el documento.
//
// LEE LAS SIETE PARTES YA ESCRITAS, no lo decidido. Es un resumen de lo que
// pone de verdad en el documento, asi que tiene que ver el documento. Por eso
// va al final y no en paralelo con las demas.
//
// El tiempo, el mismo que el de escribir una parte: sale mas corta, pero se
// lee las siete enteras antes de empezar y eso tambien cuesta.
const ESPERA_DE_LA_HOJA_MS = 170000;
const TECHO_DE_LA_HOJA = 12000;

const MOLDE_DE_LA_HOJA = {
  type: 'object',
  properties: {
    porDondeEmpiezas: { type: 'string' },
    empiezaPor:       { type: 'string', enum: AREAS.map(a => a.id) },
    elOrden: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area:   { type: 'string', enum: AREAS.map(a => a.id) },
          queHaces: { type: 'string' },
        },
        required: ['area', 'queHaces'],
        additionalProperties: false,
      },
    },
    siLoDejas: { type: 'string' },
  },
  required: ['porDondeEmpiezas', 'empiezaPor', 'elOrden', 'siLoDejas'],
  additionalProperties: false,
};

const tituloDe = id => (AREAS.find(a => a.id === id) || {}).titulo || id;

async function escribirLaHojaDeRuta({ nombre, sexo, partes }) {
  const encargo = `${EL_P2_NO_ES_EL_P1}

${REGLAS_COMUNES}


LO QUE TE TOCA AHORA

El documento ya está escrito entero y lo tienes abajo, sus siete partes. Te toca la última hoja: la hoja de ruta.

QUÉ ES ESTA HOJA. Es la que se queda a mano cuando ya ha cerrado el documento. Tiene que entenderse sola, sin volver a leer nada, y decirle dos cosas: por dónde empieza y qué va haciendo después. Si para usarla hay que volver atrás, no sirve.

NO SE ESCRIBE NADA NUEVO. Todo lo que pongas sale de lo que ya está escrito abajo. Aquí no se decide nada ni se añade ninguna idea que no esté ya en el documento.

Esto es lo que devuelves:

"empiezaPor"
El nombre en clave de la parte por la que empieza, copiado tal cual de la lista de abajo. No es texto para leer: es para que el programa sepa cuál es.

"porDondeEmpiezas"
Por qué empieza por esa: la que, si se mueve, arrastra a las demás. Normalmente es la que está por debajo de varias, la que si sigue igual hace que lo demás vuelva. Lo dices mirando lo suyo, no en general, y con lo que va a ganar cuando la mueva. Cuatro o cinco frases.

"elOrden"
Las ${AREAS.length}, en el orden en que le conviene ir, empezando por esa misma. De cada una:
  area       el nombre en clave, copiado tal cual de la lista de abajo.
  queHaces   lo que tiene que hacer ahí, resumido de lo que ya pone en su
             parte. Dos o tres frases, en claro y con verbos, para que
             leyendo solo esto sepa qué le toca. Nada de títulos ni de
             frases que no digan qué hace.
Van las ${AREAS.length}, ninguna se queda fuera y ninguna se repite.

"siLoDejas"
Qué hace el día que lo deja del todo, no una parte: cómo retoma el plan entero. Por dónde vuelve a entrar y qué hace primero. Y que dejarlo entraba en el plan. Cuatro o cinco frases.

LAS SIETE PARTES, CON SU NOMBRE EN CLAVE:

${partes.map(p => `[${p.id}] ${tituloDe(p.id)}
A DÓNDE VA: ${p.adondeVas}
LO QUE LE FRENA: ${p.queTeFrena}
EL PLAN: ${p.elPlan}
DÓNDE SE CAE: ${p.dondeTeCaes}
CÓMO SE LEVANTA: ${p.comoTeLevantas}`).join('\n\n')}

Quien lo va a leer es ${comoSeLeHabla(sexo)}
Nombre de pila: ${nombre}
${REGLA_DEL_NOMBRE(false)}`;

  const hay = new Set(partes.map(p => p.id));

  const salida = await sinNombrarLaCarta({
    que: 'la hoja de ruta',
    cojo: h => estaVacia(h.porDondeEmpiezas, 'por dónde empiezas')
            || estaVacia(h.siLoDejas, 'si lo dejas')
            || !hay.has(String(h.empiezaPor || '').trim())
            || new Set((h.elOrden || []).map(o => o?.area).filter(x => hay.has(x))).size !== hay.size,
    aviso: `\n\nY OJO: la vez anterior algo vino vacío o faltó alguna parte del orden. El orden lleva las ${AREAS.length}, cada una con su nombre en clave copiado tal cual y con lo que tiene que hacer ahí.`,
    tope: ESPERA_DE_LA_HOJA_MS,
    pedir: (recordatorio, cuanto) => alModelo({
      que: 'escribir la hoja de ruta',
      modelo: 'claude-sonnet-5',
      piensa: 'medium',
      techo: TECHO_DE_LA_HOJA,
      system: encargo,
      mensaje: `Escribe la hoja de ruta, siguiendo el esquema.${recordatorio}`,
      molde: MOLDE_DE_LA_HOJA,
      espera: AbortSignal.timeout(cuanto),
    }),
    texto: h => [h.porDondeEmpiezas, h.siLoDejas].concat((h.elOrden || []).map(o => o?.queHaces)).join(' '),
  });

  // CADA PASO VA A LA PARTE QUE NOMBRA, Y EL TITULO LO PONE EL CODIGO.
  //
  // Emparejarlos por su puesto en la lista es lo que en el P1 corrio las
  // descripciones tres sitios en el informe de una clienta. Con el nombre
  // delante eso no puede pasar, y el titulo sale de aqui, que es donde esta
  // bien escrito y con sus tildes.
  const puestas = new Set();
  const elOrden = [];
  for (const paso of (Array.isArray(salida.elOrden) ? salida.elOrden : [])) {
    const area = String(paso?.area || '').trim();
    const queHaces = String(paso?.queHaces || '').trim();
    if (!hay.has(area) || puestas.has(area) || !queHaces) continue;
    puestas.add(area);
    elOrden.push({ area, titulo: tituloDe(area), queHaces });
  }
  // Y si se dejo alguna, va al final: mejor sin su resumen que desaparecida.
  for (const p of partes) {
    if (puestas.has(p.id)) continue;
    puestas.add(p.id);
    elOrden.push({ area: p.id, titulo: tituloDe(p.id), queHaces: '' });
    console.warn(`[p2] la hoja de ruta venia sin la parte de ${p.id}, se pone al final`);
  }

  const empiezaPor = hay.has(String(salida.empiezaPor || '').trim())
    ? String(salida.empiezaPor).trim()
    : (elOrden[0]?.area || '');

  // Y LA PRIMERA DEL ORDEN ES POR LA QUE EMPIEZA. Se le pide asi, pero si
  // vuelve con otra delante, la hoja diria "empiezas por esta" y debajo
  // pondria otra la primera. Eso no se puede entregar, y aqui se ata.
  const donde = elOrden.findIndex(o => o.area === empiezaPor);
  if (donde > 0) {
    elOrden.unshift(elOrden.splice(donde, 1)[0]);
    console.warn('[p2] el orden no empezaba por la parte por la que empieza, se ha puesto delante');
  }

  return {
    empiezaPor,
    tituloDelPrimero: tituloDe(empiezaPor),
    porDondeEmpiezas: String(salida.porDondeEmpiezas || '').trim(),
    elOrden,
    siLoDejas: String(salida.siLoDejas || '').trim(),
  };
}


// ════════════════════════════════════════════════════════════════
// LA PAGINA Y SUS PETICIONES
// ════════════════════════════════════════════════════════════════
//
// Cada paso es una peticion suya: la lista, el plan, cada parte y la hoja.
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
      // SIN SUS RASGOS NO HAY PLAN. Es lo unico que se le manda al modelo, asi
      // que con la lista vacia se lo inventaria todo. Los informes de antes de
      // que se guardaran los rasgos entran por aqui.
      const cuantos = (informe?.rasgos?.fortalezas?.length || 0)
                    + (informe?.rasgos?.desafios?.length || 0);
      if (!cuantos) {
        return res.status(422).json({ error: 'Ese informe se guardó sin los rasgos, y sin ellos no hay plan' });
      }
      const plan = await decidirElPlan({
        nombre: informe?.cliente?.nombre || 'esta persona',
        sexo: informe?.cliente?.sexo || '',
        rasgos: informe.rasgos,
        respuestas: req.body?.respuestas,
      });
      if (!plan.partes.length) {
        return res.status(422).json({ error: 'El plan ha venido vacío' });
      }
      // El nombre y el sexo viajan con el plan: los pasos siguientes escriben
      // con ellos y asi no hay que volver a abrir el informe en cada uno.
      return res.status(200).json({
        plan,
        quien: {
          nombre: informe?.cliente?.nombre || 'esta persona',
          sexo: informe?.cliente?.sexo || '',
        },
      });
    }

    if (accion === 'parte') {
      const { nombre, sexo, decidido } = req.body || {};
      const area = AREAS.find(a => a.id === String(decidido?.area || ''));
      if (!area) return res.status(400).json({ error: 'Esa parte no existe' });
      // Lo que llega del navegador se comprueba antes de meterlo en el encargo:
      // si viniera a medias, el hueco lo rellenaria el modelo por su cuenta y
      // acabaria inventandose algo de su vida.
      if (PUNTOS.some(punto => !String(decidido?.[punto] || '').trim())) {
        return res.status(400).json({ error: 'Esa parte llega a medias y no se escribe' });
      }
      const parte = await escribirLaParte({
        area,
        nombre: String(nombre || 'esta persona'),
        sexo: String(sexo || ''),
        decidido,
      });
      return res.status(200).json({ parte });
    }

    if (accion === 'hoja') {
      const { nombre, sexo, partes } = req.body || {};
      // SIN LAS SIETE ESCRITAS NO HAY HOJA DE RUTA: es un resumen de lo que
      // pone el documento, asi que hace falta el documento.
      if (!Array.isArray(partes) || !partes.length
          || partes.some(p => !AREAS.some(a => a.id === p?.id) || PUNTOS.some(punto => !String(p?.[punto] || '').trim()))) {
        return res.status(400).json({ error: 'La hoja de ruta se escribe con las partes ya escritas, y no han llegado enteras' });
      }
      const hoja = await escribirLaHojaDeRuta({
        nombre: String(nombre || 'esta persona'),
        sexo: String(sexo || ''),
        partes,
      });
      return res.status(200).json({ hoja });
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (err) {
    console.error('[p2-plan/prueba]', err);
    return res.status(500).json({ error: err.message });
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
  select, textarea { width:100%; padding:.7rem; border:1px solid rgba(14,63,75,.3); border-radius:6px; background:#fff; }
  select { margin-bottom:1.4rem; }
  textarea { font:inherit; font-family:system-ui,sans-serif; font-size:.95rem; resize:vertical; }
  .pregunta { margin-bottom:1.2rem; }
  .pregunta label { display:block; font-family:system-ui,sans-serif; font-size:.95rem; font-weight:600; color:var(--teal); margin-bottom:.25rem; }
  .pista { font-family:system-ui,sans-serif; font-size:.82rem; color:#6b6b6b; margin-bottom:.45rem; }
  button { background:var(--gold); color:#fff; border:0; border-radius:6px; padding:.8rem 1.6rem; cursor:pointer; font-weight:600; letter-spacing:.03em; }
  button:disabled { opacity:.45; cursor:default; }
  #pdf { margin-left:.6rem; background:var(--teal); }
  .aviso { font-family:system-ui,sans-serif; font-size:.9rem; color:#6b6b6b; margin:1.2rem 0; }
  .error { color:#c0392b; }
  .parte { background:#fff; border:1px solid rgba(189,144,72,.25); border-left:4px solid var(--gold); border-radius:8px; padding:1.6rem 1.8rem; margin-top:1.6rem; }
  .aparte { border-left-color:var(--teal); }
  .cual { font-family:system-ui,sans-serif; font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.12em; color:var(--gold); margin-bottom:.5rem; }
  .parte h2 { font-size:1.25rem; color:var(--teal); margin-bottom:.9rem; line-height:1.35; }
  .bloque { margin-bottom:1.3rem; }
  .bloque:last-child { margin-bottom:0; }
  .bloque h3 { font-family:system-ui,sans-serif; font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.1em; color:var(--gold); margin-bottom:.45rem; }
  .bloque p { margin-bottom:.6rem; }
  .bloque p:last-child { margin-bottom:0; }
  .mov { background:rgba(189,144,72,.07); border-radius:6px; padding:.9rem 1.1rem; margin-bottom:.7rem; }
  .mov b { color:var(--teal); display:block; margin-bottom:.3rem; }
  .paso { margin-bottom:1rem; }
  .paso b { color:var(--teal); display:block; margin-bottom:.2rem; }
  .empieza { color:var(--teal); font-weight:600; margin-bottom:.5rem; }
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

  <div class="pregunta">
    <label for="p1">1. ¿Cómo es tu vida hoy?</label>
    <p class="pista">El trabajo, la casa, la pareja, la familia, los amigos, lo que haces con tu tiempo libre. Una semana normal tuya.</p>
    <textarea id="p1" rows="5"></textarea>
  </div>

  <div class="pregunta">
    <label for="p2">2. ¿Cómo te gustaría que fuera tu vida?</label>
    <p class="pista">El trabajo, la casa, la pareja, la familia, los amigos, tu tiempo. Tu día a día.</p>
    <textarea id="p2" rows="5"></textarea>
  </div>

  <div class="pregunta">
    <label for="p3">3. ¿Qué llevas años intentando cambiar y no cambia?</label>
    <textarea id="p3" rows="3"></textarea>
  </div>

  <p class="pista">Cuanto más cuentes, más tuyo será el plan.</p>

  <button id="ir" disabled>Escribir su plan</button>
  <button id="pdf" hidden>Bajar el PDF</button>

  <p class="aviso" id="aviso"></p>
  <div id="salida"></div>
</div>
<script>
const BLOQUES = ${JSON.stringify(BLOQUES)};
// El nombre de cada area, el mismo que lleva en el P1, para ponerlo encima del
// titulo con su numero.
const NOMBRES = ${JSON.stringify(Object.fromEntries(AREAS.map(a => [a.id, a.del_p1])))};
const PUNTOS = ${JSON.stringify(PUNTOS)};
const quien = document.getElementById('quien');
const ir = document.getElementById('ir');
const pdf = document.getElementById('pdf');
// LAS TRES RESPUESTAS. Son lo unico que sabemos de su vida de hoy: el informe
// del P1 dice como es, no que hace ni con quien. Viajan con la peticion del
// plan, que es la que decide, y de momento el motor no las lee: eso es el
// siguiente paso.
const preguntas = ['p1', 'p2', 'p3'].map(id => document.getElementById(id));
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

// Lo que ha escrito, sin espacios de mas. Si deja una en blanco, va vacia: no
// se le inventa nada por ella.
function laVidaQueCuenta() {
  const [hoy, comoLeGustaria, loQueNoCambia] = preguntas.map(c => String(c.value || '').trim());
  return { hoy, comoLeGustaria, loQueNoCambia };
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
  let quienEs = { nombre:'esta persona', sexo:'' };

  // 1. La llamada que piensa y decide el documento entero.
  let plan;
  aviso.textContent = 'Decidiendo su plan… (es la parte que piensa: un par de minutos)';
  try {
    const r = await llamar({ accion:'plan', compra, respuestas: laVidaQueCuenta() });
    plan = r.plan;
    if (r.quien) quienEs = r.quien;
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
  aviso.textContent = 'Escribiendo las ' + plan.partes.length + ' partes a la vez…';
  const huecos = plan.partes.map((decidido, i) => {
    const hueco = document.createElement('div');
    hueco.className = 'parte';
    hueco.innerHTML = '<p class="cual">' + (i+1) + ' · ' + escapar(NOMBRES[decidido.area] || '') +
      '</p><p class="aviso">Escribiéndose…</p>';
    salida.appendChild(hueco);
    return hueco;
  });

  const escritas = [];
  await Promise.all(plan.partes.map(async (decidido, i) => {
    try {
      const { parte } = await llamar({ accion:'parte', nombre:quienEs.nombre, sexo:quienEs.sexo, decidido });
      escritas[i] = parte;
      huecos[i].outerHTML = pintarParte(parte, i+1);
    } catch (e) {
      huecos[i].innerHTML = '<p class="cual">' + (i+1) + ' · ' + escapar(NOMBRES[decidido.area] || '') +
        '</p><p class="error">' + escapar(e.message) + '</p>';
    }
  }));

  // 3. Y al final, la hoja de ruta, que lee las siete ya escritas.
  const completas = escritas.filter(Boolean);
  let hoja = null;
  if (completas.length === plan.partes.length) {
    aviso.textContent = 'Escribiendo la hoja de ruta…';
    const hueco = document.createElement('div');
    hueco.className = 'parte aparte';
    hueco.innerHTML = '<p class="cual">Para tener a mano</p><p class="aviso">Escribiéndose…</p>';
    salida.appendChild(hueco);
    try {
      hoja = (await llamar({ accion:'hoja', nombre:quienEs.nombre, sexo:quienEs.sexo, partes:completas })).hoja;
      hueco.outerHTML = pintarHoja(hoja);
    } catch (e) {
      hueco.innerHTML = '<p class="cual">Para tener a mano</p><p class="error">' + escapar(e.message) + '</p>';
    }
  }

  // EL PDF SOLO SE OFRECE SI ESTA TODO. Con una parte caida saldria un
  // documento con un agujero dentro, y eso no se le ensena a nadie.
  if (hoja && completas.length === plan.partes.length) {
    elDocumento = {
      nombre: quienEs.nombre,
      hoja,
      // La etiqueta pequena de cada parte y los nombres de sus cinco puntos van
      // desde aqui: el que maqueta no tiene que saberselos.
      partes: completas.map(p => ({ ...p, etiqueta: NOMBRES[p.id] || '', nombres: BLOQUES })),
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

// LA HOJA DE RUTA, al final del todo: por donde empieza, las siete en orden
// con lo que hace en cada una, y que hacer si lo deja.
function pintarHoja(h) {
  const orden = (h.elOrden||[]).map((o, i) =>
    '<div class="paso"><b>' + (i+1) + '. ' + escapar(o.titulo) + '</b>' + parrafos(o.queHaces) + '</div>'
  ).join('');
  return '<div class="parte aparte"><p class="cual">Para tener a mano</p>' +
    '<h2>Tu hoja de ruta</h2>' +
    '<div class="bloque"><h3>Por dónde empiezas</h3>' +
      '<p class="empieza">' + escapar(h.tituloDelPrimero || '') + '</p>' +
      parrafos(h.porDondeEmpiezas) + '</div>' +
    '<div class="bloque"><h3>El orden</h3>' + orden + '</div>' +
    '<div class="bloque"><h3>Si lo dejas del todo</h3>' + parrafos(h.siLoDejas) + '</div>' +
    '</div>';
}

// Cada parte con sus cinco puntos, cada uno con su nombre para saber de que
// habla y para poder volver a buscarlo.
function pintarParte(p, n) {
  const bloques = PUNTOS.map(punto =>
    '<div class="bloque"><h3>' + escapar(BLOQUES[punto]) + '</h3>' + parrafos(p[punto]) + '</div>'
  ).join('');
  return '<div class="parte"><p class="cual">' + n + ' · ' + escapar(NOMBRES[p.id] || '') + '</p>' +
    '<h2>' + escapar(p.titulo) + '</h2>' + bloques + '</div>';
}
</script>
</body>
</html>`;
