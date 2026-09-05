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
// Igual que el P1 despues de arreglarlo, que es lo unico que ha funcionado:
//
//   UNA LLAMADA DECIDE, PENSANDO, con el informe entero delante. Saca en corto
//   lo que va en las siete partes, por cual empieza, en que orden siguen y que
//   hace el dia que falle. No escribe ni una linea del documento.
//
//   LAS DEMAS SOLO ESCRIBEN lo que ya esta decidido. Piensan un poco, lo justo
//   para releerse antes de entregar, pero no deciden nada.
//
// Por que asi y no como antes: antes se pedian las siete partes de una en una
// y ninguna veia a las demas, asi que varias llegaban por su cuenta a la misma
// conclusion y la clienta leia veinte cosas que hacer que en realidad eran
// diez. Comparar las siete a la vez es justo lo que hace falta, y comparar sin
// pensar no se puede.
//
// ── QUE LLEVA EL DOCUMENTO ──────────────────────────────────
//
//   1. POR DONDE EMPIEZA. La conducta por la que empieza, contada con lo que
//      hace, y por que mover esa arrastra lo demas. Va delante para quitarle
//      el agobio de tener siete cosas que arreglar.
//   2. LAS SIETE PARTES, todas iguales, cada una con cuatro cosas: que deja de
//      hacer y que hace en su lugar, los movimientos concretos, lo que va a
//      aparecer para frenarle y en que lo va a notar.
//   3. EL ORDEN. Cual va despues de cual, y que tiene que estar pasando para
//      saltar a la siguiente. Sin fechas: no sabemos su vida.
//   4. EL DIA QUE FALLE. Que hace, y que fallar entra en el plan.
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


CÓMO SE HABLA

Le hablas de tú, con la confianza de quien conoce bien a la persona que lo va a leer y se lo cuenta claro. Ni como un informe, ni como un libro, ni como alguien dando una clase.

ESTILO DE ESCRITURA:
- EL TONO ES EL DE ALGUIEN QUE LA QUIERE BIEN Y SE LO DICE CLARO. Cercano y cálido, pero sin rodeos: le nombra a la cara lo que le pasa, sin suavizarlo y sin castigarle. Nunca suena a experto explicando, ni a informe, ni a libro. La fuerza está en lo que le dice, no en cómo lo adorna
- No empieces dos párrafos con la misma estructura. Varía los arranques.
- NO SE CONVIERTE EN COSA LO QUE HACE. Nada de coger su conducta, volverla un sustantivo y colgársela con un posesivo o con un artículo delante. En cuanto lo que hace se nombra como si fuera un objeto que tiene, quien lee tiene que volver atrás para entenderlo. Se dice con un verbo: qué hace
- LA IDEA SE DICE EN CLARO, SIEMPRE Y EN LITERAL. Cada cosa que le cuentes se dice en seco: qué hace, qué le pasa o cómo se le nota, con palabras que se puedan agarrar. Si tapas todo lo demás y esa frase sola no dice nada concreto de esa persona, está mal escrita.
- NADA DE METÁFORAS NI IMÁGENES. Se dice la cosa, no una figura de la cosa. Y mucho menos una comparación inventada sobre la marcha, de esas que no existen en español y que el lector no puede ver en la cabeza: eso no explica nada, despista. Si has escrito una comparación, bórrala y di en literal lo que querías decir con ella.
- Y NO HAY NINGUNA EXCEPCIÓN. De la primera palabra a la última, se dice la cosa en literal.
- SE ENTIENDE A LA PRIMERA. Si una frase obliga a volver atrás para entenderla, está mal escrita y se cambia. Esa prueba manda sobre lo bonito que quede, y sobre cualquier otra regla de aquí: entre escribirlo bonito y que se entienda, se entiende.
- Y esto se lee de noche, con el día encima y muchas veces en el móvil. Quien lo lee no relee: si tropieza, lo deja.
- LAS PALABRAS SON LAS DE TODOS LOS DÍAS, no las de un informe ni las de un libro. Si una palabra la verías antes escrita en un informe que dicha en una conversación normal, va fuera. Lo tiene que entender alguien de dieciocho años sin releer nada.
- NO SE HABLA DE PARTES SUYAS COMO SI FUERAN COSAS CON VIDA PROPIA que se mueven, chocan, se doblan, se construyen o se mezclan. Se dice lo que hace la persona.
- NADA DE SEÑALAR CON UN DEMOSTRATIVO ALGO QUE NO HAYAS DICHO ANTES CON TODAS SUS LETRAS. Si señalas algo suyo, antes tiene que estar contado en claro qué es; si no, el lector no sabe de qué le hablas.
- PROHIBIDO CONTAR ALGO SOLO CON UNA SENSACIÓN. Si al leer una frase no se sabe qué hace o qué le pasa exactamente, esa frase no vale y se reescribe diciéndolo. Describir cómo se siente algo no es contar qué es.
- PROHIBIDO DECIR DOS VECES LA MISMA IDEA CON OTRA ROPA. Si el párrafo siguiente cuenta lo mismo que el anterior cambiando las palabras, sobra: o dice algo nuevo, o no va. Eso es lo que hace que parezcan muchas ideas cuando hay una.
- CADA FRASE TIENE QUE SONAR COMO HABLA UNA PERSONA DE VERDAD. Antes de dar una frase por buena, léela en voz alta por dentro: si nadie la diría hablando, está mal y se reescribe. No fuerces la gramática para que suene elaborado, y no cojas un verbo raro cuando el normal dice lo mismo. Lo que suena a literatura no emociona, distrae: el lector tropieza, sale del texto y deja de reconocerse.
- PROHIBIDO ENUMERAR. Nunca anuncies cuántas cosas vas a decir ni las numeres, ni con cifras ni con ordinales, ni al empezar ni por el camino. Las ideas se encadenan una detrás de otra, como cuando alguien te cuenta algo hablando, y el lector no necesita saber cuántas quedan. Si lo que escribes se pudiera convertir en una lista de viñetas sin perder nada, está mal escrito.
- CADA PÁRRAFO SE ENGANCHA CON EL ANTERIOR. Retomas una palabra o una idea del párrafo de antes y sigues tirando del hilo desde ahí. Ningún párrafo empieza un tema nuevo en frío, y ninguno puede leerse suelto sin perder nada. Si quitas un párrafo y el resto se lee igual de bien, es que estaba puesto al lado y no cosido.
- UNA FRASE, UNA IDEA. Esta manda sobre lo largo que sea. Una frase puede ser larga y estar bien, si lo que hace es desarrollar UNA cosa a base de comas. Lo que no puede es meter dos o tres cosas distintas encadenándolas con "que", "porque", "cuando" o "aunque": ahí el lector suelta la primera para seguir la segunda, y acaba sin ninguna. Si al leerla en voz alta te falta el aire o tienes que volver atrás, lleva dos ideas dentro y se parte en dos.
- FRASES LARGAS, NO CORTAS, dentro de esa regla. Se escribe con comas y seguido, como habla alguien. Y ESTO ES LO QUE MÁS SE NOTA: donde una persona hablando uniría dos trozos con una coma, va la coma, no un punto. El punto se reserva para cuando de verdad se cierra algo. Un texto lleno de puntos suena a lista de frases sueltas, aunque cada frase esté bien escrita. PROHIBIDO encadenar tres frases cortas seguidas: eso suena a titular y no a una persona. Las de menos de diez palabras se reservan para rematar, dos o tres en todo el texto como mucho.
- NO SE HABLA DEL DOCUMENTO, SE HABLA DE SU VIDA. Ni áreas, ni partes, ni capítulos, ni apartados, ni lo que viene antes o después, ni cuántas cosas hay. Quien lee no ve el andamio, ve su vida. En cuanto le nombras un trozo del documento, deja de entender de qué le hablas.
- Y NO SE LE NOMBRA UN TÍTULO COMO SI FUERA UNA COSA QUE HACER. Los títulos son etiquetas para encontrar las cosas, no acciones. Lo que hace se dice con un verbo y con lo que hace.
- NADA DE CONDICIONALES ENCADENADOS. Una suposición que arrastra a otra obliga a quien lee a sostener las dos a la vez, y suelta. Se cuenta lo que pasa, en presente y en directo.
- LOS PÁRRAFOS RESPIRAN. Cuatro o cinco líneas, no dos: un párrafo cuenta una cosa entera, con su desarrollo. Cortar cada dos líneas llena el texto de puntos y lo vuelve entrecortado, que es lo contrario de alguien hablando. Y tampoco al revés: cinco ideas seguidas en el mismo párrafo no se leen, se abandonan.
- LE PONES SUS FRASES ENTRECOMILLADAS: lo que se dice por dentro, con sus palabras y en primera persona. Es lo que hace que se reconozca. Una o dos en lo que escribas, no más: en cuanto se repiten en cada párrafo se convierten en una muletilla y dejan de sonar suyas.
- LE DAS LA RAZÓN ANTES DE CORREGIR: primero le reconoces por qué hace lo que hace, que en su momento le sirvió, y después le dices lo que cambia. Reconocerlo no es suavizarlo: lo que viene detrás se dice igual de claro y sin rodeos.
- NO DES NADA POR SABIDO. No tiene a quién preguntarle. Cortar una explicación no es escribir conciso, es dejarla coja: si hace falta una frase más para que se entienda, va esa frase.
- NI UNA PALABRA TÉCNICA: ningún planeta, ningún signo, ninguna casa, ningún aspecto. Su carta no se nombra, y no se dice tu informe ni tu estudio.
- NADA DE ANIMAR NI DE CONSEJOS DE LOS QUE SE LEEN EN CUALQUIER SITIO. Si lo que vas a escribir le vale igual a otra persona, no lo escribas.
- PROHIBIDAS ESTAS PALABRAS Y CUALQUIER VARIANTE SUYA: sanar, empoderarte, gestionar tus emociones, tu mejor yo, trabajar en ti, tu proceso, tu camino, y "mejor versión" en todas sus formas.
- "Nueva versión" sí se puede decir, pero no es una muletilla: como mucho una vez, y solo si cae sola.
- Español de España, hablado. Ni una palabra en otro idioma.
- Sin asteriscos, sin listas, sin símbolos, sin guiones de adorno y sin numerar nada: la maqueta la pone el programa, no tú. Lo único que marcas tú es dónde acaba un párrafo y empieza el siguiente, dejando una línea en blanco entre los dos.

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

1. DE LO SUYO SE CUENTA POCO Y SOLO PARA ENGANCHAR. Lo que hace hoy, en dos o tres frases, las justas para que sepa que esto va con ella. Y nada del porqué: de dónde le viene, quién se lo hizo, cómo se llama lo que le pasa. Todo eso se lo contaron ya, y aquí ocupa el sitio de lo que ha venido a buscar. Lo poco que cuentes tiene que poder rastrearse a lo que tienes abajo: si no puedes señalar de dónde sale, no lo escribes.

2. TODO LO DEMÁS ES QUÉ HACE Y CÓMO. No solo qué: sobre todo cómo, que es lo que nadie le explica. Eso no está en su estudio y lo pones tú, es a lo que ha venido, y tiene que ocupar la mayor parte de lo que escribas.

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
    deQueVa: 'quién es y cómo se planta delante de los demás',
    porDondeEntra: 'entra por lo que hace nada más llegar a un sitio, delante de otros'  },
  { id: 'patrones',    del_p1: 'PATRONES',    titulo: 'Tu día cuando dejas de repetirte',
    deQueVa: 'lo que repite, su día a día, su manera de funcionar',
    porDondeEntra: 'entra por lo que repite cada día sin que nadie se lo pida, y sigue haciendo aunque ya no le sirva'  },
  { id: 'miedos',      del_p1: 'MIEDOS',      titulo: 'Lo que haces cuando el miedo deja de mandar',
    deQueVa: 'lo que le frena y lo que evita',
    porDondeEntra: 'entra por lo que deja de hacer, por el paso que no da'  },
  { id: 'herida',      del_p1: 'HERIDA',      titulo: 'Cuando sueltas lo que no te toca cargar',
    deQueVa: 'lo que le duele de antiguo, su casa y los suyos',
    porDondeEntra: 'entra por lo que sostiene sin que se le note, y por lo que le cuesta pedir'  },
  { id: 'amor',        del_p1: 'AMOR',        titulo: 'Querer sin el patrón de siempre',
    deQueVa: 'la pareja, el deseo y el disfrute',
    porDondeEntra: 'entra por lo que da y por lo que no dice cuando quiere a alguien'  },
  { id: 'relaciones',  del_p1: 'RELACIONES',  titulo: 'El sitio que ocupas entre los demás',
    deQueVa: 'la gente, hablar, los grupos, los amigos',
    porDondeEntra: 'entra por lo que calla delante de la gente, o por lo que dice de más'  },
  { id: 'dinero',      del_p1: 'DINERO',      titulo: 'Con el dinero y el trabajo, decides tú',
    deQueVa: 'el dinero, el trabajo y lo que vale lo suyo',
    porDondeEntra: 'entra por una decisión suya de dinero o de trabajo que lleva tiempo sin tomar'  },
];

// Las cuatro cosas que lleva cada parte, con el nombre que ve la clienta. Se
// escriben aqui por lo mismo que los titulos.
// Eran cinco y sobraba uno: "Asi eres aqui" y "Lo que cambia" contaban lo
// mismo, los dos en abstracto, asi que cada parte abria con dos parrafos que
// no decian nada y quien leia no sabia de que le estaban hablando.
const BLOQUES = { movimientos: 'Qué haces' };

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

// Cuantos movimientos lleva cada parte. Dos o tres: uno se queda corto para
// una parte entera, y con cuatro ya no se acuerda de ninguno.
const MOVIMIENTOS = { min: 2, max: 3 };

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
  };
  if (piensa) {
    cuerpo.thinking = { type: 'adaptive' };
    cuerpo.output_config.effort = piensa;
  } else {
    cuerpo.thinking = { type: 'disabled' };
  }

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: espera,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(cuerpo),
  });

  if (!resp.ok) {
    const detalle = (await resp.text()).slice(0, 300);
    throw new Error(`${que}: el modelo ha contestado ${resp.status} — ${detalle}`);
  }

  const datos = await resp.json();
  // Cuando piensa, la respuesta trae delante un bloque de pensamiento y detras
  // el texto. Se cogen solo los de texto y se pegan.
  const texto = (datos.content || [])
    .filter(b => b && b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text).join('');
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

const ESPERA_DEL_PLAN_MS = 120000;
const TECHO_DEL_PLAN = 12000;

const MOLDE_DEL_PLAN = {
  type: 'object',
  properties: {
    partes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area:   { type: 'string', enum: AREAS.map(a => a.id) },
          cambio: { type: 'string' },
          movimientos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                cuando: { type: 'string' },
                haces:  { type: 'string' },
              },
              required: ['cuando', 'haces'],
              additionalProperties: false,
            },
          },
          freno: { type: 'string' },
          senal: { type: 'string' },
        },
        required: ['area', 'cambio', 'movimientos', 'freno', 'senal'],
        additionalProperties: false,
      },
    },
    empiezaPor: {
      type: 'object',
      properties: {
        area:   { type: 'string', enum: AREAS.map(a => a.id) },
        porque: { type: 'string' },
      },
      required: ['area', 'porque'],
      additionalProperties: false,
    },
    orden: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area:   { type: 'string', enum: AREAS.map(a => a.id) },
          saltas: { type: 'string' },
        },
        required: ['area', 'saltas'],
        additionalProperties: false,
      },
    },
    recaida: { type: 'string' },
  },
  required: ['partes', 'empiezaPor', 'orden', 'recaida'],
  additionalProperties: false,
};

async function decidirElPlan({ nombre, sexo, rasgos }) {
  const encargo = `Estás preparando el plan de una persona: lo que tiene que hacer para llegar a ser quien quiere ser.

Abajo tienes lo que ya se sabe de esa persona, sacado de su carta natal y repartido en las siete partes de su vida. Ya se lo han contado todo eso en otro documento que se ha leído entero.

AQUÍ NO SE ESCRIBE EL DOCUMENTO. Aquí se DECIDE. Todo sale en corto, en una línea cada cosa, y lo que se va a leer lo escribe otro después. Por eso puedes dedicarle el rato a lo que de verdad importa: decidir qué le va a mover la vida y qué no.

Y AQUÍ NO SE DIAGNOSTICA. No le vuelvas a contar cómo es ni de dónde le viene: eso ya lo tiene. Lo suyo solo aparece para enganchar lo que tiene que hacer.


1. QUÉ ES CADA PARTE

Las siete parcelas de su vida, y de qué va cada una:

IDENTIDAD    quién es y cómo se planta delante de los demás
PATRONES     lo que repite, su día a día, su manera de funcionar
MIEDOS       lo que le frena y lo que evita
HERIDA       lo que le duele de antiguo, su casa y los suyos
AMOR         la pareja, el deseo y el disfrute
RELACIONES   la gente, hablar, los grupos, los amigos
DINERO       el dinero, el trabajo y lo que vale lo suyo

CADA PARTE HABLA SOLO DE LO SUYO. Abajo te llegan sus rasgos repartidos en las siete, pero ese reparto no siempre está fino: si un rasgo que te llega en una parcela habla de otra, lo que decidas con él va donde habla, no donde estaba puesto. Si acabas escribiendo de grupos en la parcela del día a día, o de dinero en la de los miedos, está mal y se cambia.


2. LAS SIETE PARTES, Y LAS SIETE A LA VEZ

Decides las siete de una vez y con las siete delante. Eso es lo importante, y es la razón de que esto se haga en un solo sitio: una misma cosa que hacer, dicha con otras palabras, puede colarse en cuatro partes distintas, y quien lo lee cree que tiene veinte cosas cuando en realidad son diez. Eso solo se ve teniéndolas todas delante.


3. QUÉ DECIDES DE CADA PARTE

De cada una de las siete sacas cuatro cosas, y ninguna se queda vacía:

cambio         Qué deja de hacer y qué hace en su lugar, las dos mitades en
               una frase. Y las dos con nombre de conducta, no de idea: algo
               que se pueda ver haciendo o dejando de hacer. Si lo que escribes
               no se puede ver ocurriendo, está mal y se cambia.

movimientos    De ${MOVIMIENTOS.min} a ${MOVIMIENTOS.max}, y son lo más importante de todo el
               documento. Cada uno tiene dos mitades:
               "cuando"  la señal que va a notar por dentro, o algo que se
                         pilla haciendo. Es el disparador, y tiene que ser
                         algo que pueda reconocer en el momento en que pasa,
                         no una situación general.
               "haces"   lo que hace justo ahí, en ese momento. Concreto hasta
                         el punto de que se pueda hacer el martes sin
                         preguntarle nada a nadie.

freno          Lo que va a aparecer para que no lo haga: lo que va a sentir o
               lo que se va a decir por dentro para librarse. Se le avisa
               antes de que llegue, y se le dice que eso es señal de que va
               bien, no de que se esté equivocando. Es lo que hace que no lo
               deje a la primera.

senal          En qué va a notar que está funcionando. Algo que pueda ver
               ocurriendo en su vida, no un estado de ánimo. Y de las
               primeras: algo que pase en semanas, no en años.


4. LO QUE NO SE PUEDE ESCRIBIR

No sabemos nada de su vida que no esté escrito abajo. No tiene pareja, ni hijos, ni jefe, ni familia, ni trabajo, ni casa, mientras no aparezcan ahí. No los nombres, no los supongas y no los uses para montar un movimiento.

Por eso los movimientos arrancan siempre por algo que ocurre dentro de esa persona, y nunca por otra.

Nada de consejos que le valgan igual a cualquiera. Si lo que has escrito se le podría mandar a otra persona distinta, está mal y se cambia.

Y NADA DE EJERCICIOS DE TERAPIA. Ni buscar de dónde le viene algo, ni ponerle nombre a quién se lo hizo, ni rituales, ni papeles que se rompen, ni nada que se parezca a una consulta. Lo que hace es algo que ya haría en su vida corriente, hecho distinto.

Y nada técnico: ni planetas, ni signos, ni casas. Quien lo lee no ve la carta.


5. POR DÓNDE EMPIEZA

Eliges UNA de las siete. La que, si se mueve, arrastra a las demás: normalmente es la que está por debajo de varias, la que si sigue igual hace que lo demás vuelva.

Y dices por qué esa, en una frase, mirando lo suyo. No vale un porqué general que le sirva a cualquiera: tiene que salir de lo que le pasa a esta persona.


6. EL ORDEN

Las otras seis, en el orden en que le conviene ir. De cada una dices cuándo salta a la siguiente: qué tiene que estar pasando ya en su vida para dar por hecha la anterior.

NO PONGAS FECHAS NI SEMANAS. No sabemos cómo es su vida ni cuánto tiempo tiene. Se salta por lo que pasa, no por el calendario.


7. EL DÍA QUE FALLE

Qué hace exactamente el día que se le olvide, lo deje o vuelva a lo de antes. No es animarla: es el paso concreto para volver, y dejarle claro que eso iba a pasar y está contado.


8. EL REPASO, ANTES DE ENTREGAR

Con las siete partes escritas delante:

PRIMERO, MIRA LOS MOVIMIENTOS DE LAS SIETE JUNTOS. Los que le pidan lo mismo con otras palabras son uno solo escrito varias veces. Se queda en la parte donde más le pese, y en las otras se sustituye por algo distinto de verdad.

DESPUÉS, MIRA QUE CADA PARTE HABLE DE SU PARCELA Y NO DE OTRA. Tapa de dónde venía cada rasgo, lee lo que has decidido y mira si habla de la parcela en la que lo has puesto. Si no, se mueve.

Y POR ÚLTIMO: que ninguna de las cuatro casillas de ninguna parte se haya quedado vacía o resuelta de pasada.

Devuelve solo lo decidido. No expliques lo que has quitado.


LO QUE SE SABE DE ESA PERSONA:

${susRasgos(rasgos)}

Quien lo va a leer es ${comoSeLeHabla(sexo)}
Nombre de pila: ${nombre}`;

  const salida = await alModelo({
    que: 'decidir el plan',
    modelo: 'claude-opus-5',
    piensa: 'medium',
    techo: TECHO_DEL_PLAN,
    system: encargo,
    mensaje: 'Decide su plan entero, siguiendo el esquema.',
    molde: MOLDE_DEL_PLAN,
    espera: AbortSignal.timeout(ESPERA_DEL_PLAN_MS),
  });

  // Se ordena como van en el documento y se deja solo una parte por area: si
  // el modelo repitiera un area, la segunda sobra y no puede colarse.
  const porArea = new Map();
  for (const p of (Array.isArray(salida.partes) ? salida.partes : [])) {
    const id = String(p?.area || '').trim();
    if (!id || porArea.has(id)) continue;
    porArea.set(id, {
      area: id,
      cambio: String(p.cambio || '').trim(),
      movimientos: (Array.isArray(p.movimientos) ? p.movimientos : [])
        .map(m => ({ cuando: String(m?.cuando || '').trim(), haces: String(m?.haces || '').trim() }))
        .filter(m => m.cuando && m.haces)
        .slice(0, MOVIMIENTOS.max),
      freno: String(p.freno || '').trim(),
      senal: String(p.senal || '').trim(),
    });
  }

  // UNA PARTE A MEDIAS NO SE ESCRIBE.
  //
  // Si viene con una casilla vacia, quien escribe se encuentra un hueco y lo
  // rellena por su cuenta, y entonces se inventa algo de su vida que no sale
  // de su carta. Vale mas entregar seis partes buenas que siete con una
  // inventada dentro.
  const entera = p => p.cambio && p.freno && p.senal && p.movimientos.length >= 1;

  const partes = AREAS.map(a => porArea.get(a.id)).filter(p => p && entera(p));
  const cojas = AREAS.map(a => porArea.get(a.id)).filter(p => p && !entera(p)).map(p => p.area);
  const faltan = AREAS.filter(a => !porArea.has(a.id)).map(a => a.id);
  if (cojas.length) console.warn(`[p2] estas partes han venido a medias y no se escriben: ${cojas.join(', ')}`);
  if (faltan.length) console.warn(`[p2] el plan ha venido sin estas partes: ${faltan.join(', ')}`);

  // POR DONDE EMPIEZA TIENE QUE SER UNA DE LAS QUE SE VAN A ESCRIBIR.
  // Si el modelo nombra una que no existe, o una que se ha caido, el documento
  // abriria mandandola a un sitio que no esta. Se coge la primera que si esta.
  const hay = new Set(partes.map(p => p.area));
  let empieza = String(salida.empiezaPor?.area || '').trim();
  if (!hay.has(empieza)) {
    console.warn(`[p2] por donde empieza venia como "${empieza}", que no esta; se pone la primera`);
    empieza = partes[0]?.area || '';
  }

  // Y EL ORDEN, SOLO CON LAS QUE QUEDAN Y SIN REPETIR. Ni la de empezar, que
  // ya va delante.
  const puestas = new Set([empieza]);
  const orden = [];
  for (const o of (Array.isArray(salida.orden) ? salida.orden : [])) {
    const area = String(o?.area || '').trim();
    const saltas = String(o?.saltas || '').trim();
    if (!hay.has(area) || puestas.has(area) || !saltas) continue;
    puestas.add(area);
    orden.push({ area, saltas });
  }

  // LA HOJA DE RUTA LAS LLEVA TODAS. Si quien decide se deja alguna fuera, esa
  // parte se escribiria y luego no aparecerian en el orden, asi que quien lo
  // lee no sabria cuando le toca. Las que falten se ponen al final, en el
  // orden del documento, y quien escribe les pone el cuando a partir de lo que
  // cambia en ellas.
  for (const p of partes) {
    if (puestas.has(p.area)) continue;
    puestas.add(p.area);
    orden.push({ area: p.area, saltas: '' });
    console.warn(`[p2] el orden venia sin la parte de ${p.area}, se pone al final`);
  }

  return {
    partes,
    empiezaPor: { area: empieza, porque: String(salida.empiezaPor?.porque || '').trim() },
    orden,
    recaida: String(salida.recaida || '').trim(),
  };
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
  /\b(tu|su) (informe|estudio|lectura|analisis)\b/,
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

// UNA CASILLA VACIA O CON SU PROPIO TITULO DENTRO NO VALE.
//
// En un plan de verdad salieron casillas en blanco y otras con el nombre del
// bloque escrito como si fuera el texto -"Asi eres aqui" dentro de la casilla
// que ya se titula asi-, y el documento parecia roto.
//
// Se comprueba lo que se puede comprobar sin opinar: que hay texto, que no es
// una linea suelta y que no es el titulo repetido.
const LARGO_MINIMO = 60;

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

async function sinNombrarLaCarta({ que, pedir, texto, cojo = () => false, aviso = '' }) {
  const primera = await pedir('');
  const laCarta = hablaDeAstrologia(texto(primera));
  const aMedias = cojo(primera);
  if (!laCarta && !aMedias) return primera;

  console.warn(`[p2] ${que}: ${laCarta ? 'se ha colado una palabra de la carta' : 'ha venido a medias'}, se pide otra vez`);
  const segunda = await pedir((laCarta ? `\n\n${NO_NOMBRES_LA_CARTA}` : '') + (aMedias ? aviso : ''));

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

// EL TOPE CABE DOS VECES. Si se le cuela una palabra de la carta se vuelve a
// pedir, asi que los dos intentos juntos tienen que caber en los 150 segundos
// que aguanta esta peticion. Escribir una parte ronda el medio minuto, asi que
// sesenta y cinco segundos ya es de sobra para una.
const ESPERA_DE_ESCRIBIR_MS = 65000;
const TECHO_DE_ESCRIBIR = 12000;

const MOLDE_DE_LA_PARTE = {
  type: 'object',
  properties: {
    texto: { type: 'string' },
    movimientos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          texto:  { type: 'string' },
        },
        required: ['titulo', 'texto'],
        additionalProperties: false,
      },
    },
  },
  required: ['texto', 'movimientos'],
  additionalProperties: false,
};

// EL AREA SE ESCRIBE DE UNA TIRADA, NO POR CASILLAS.
//
// Antes salia en cuatro casillas de dos o tres frases cada una. Cada casilla
// empezaba en frio, no venia de nada y no llevaba a nada, y el documento
// entero sonaba a formulario. Eso no es que se entienda mal: es que no suena a
// nadie hablando, y por eso no entra.
//
// Ahora el area es UN texto seguido, con su sitio para respirar. Los
// movimientos siguen aparte porque son lo que se hace el martes y hay que
// poder encontrarlos, pero todo lo demas se cuenta corrido.
const PALABRAS_MINIMAS = 320;

// Lo que se sabe de ella en esta parcela, tal como se lo conto el P1. Sin esto
// quien escribe solo tiene el esquema de lo decidido, y con un esquema no se
// escribe nada que suene a persona.
function rasgosDeLaParte(area, rasgos) {
  const linea = (r, conPorque) =>
    `- ${r.nombre}: ${r.descripcion}` + (conPorque && r.causa ? ` POR QUÉ LE PASA: ${r.causa}` : '');
  const suyos = l => (l || []).filter(r => r && r.area === area.del_p1);
  const f = suyos(rasgos?.fortalezas).map(r => linea(r, false));
  const d = suyos(rasgos?.desafios).map(r => linea(r, true));
  if (!f.length && !d.length) return '';
  return `\n\nLO QUE YA SE LE HA CONTADO DE ESTA PARCELA DE SU VIDA:\n\nSE LE DA BIEN\n${f.join('\n') || '(nada)'}\n\nLE CUESTA\n${d.join('\n') || '(nada)'}`;
}

async function escribirLaParte({ area, nombre, sexo, decidido, rasgos }) {
  const encargo = `${EL_P2_NO_ES_EL_P1}

${REGLAS_COMUNES}


LO QUE TE TOCA AHORA

Escribes UNA parte del documento. La parcela de su vida que te toca es esta: ${area.deQueVa}.

Y SE ESCRIBE DE UNA TIRADA, seguido, como cuando alguien que la conoce se sienta a contarle algo. Nada de apartados, nada de bloques, nada de anunciar lo que viene. Un párrafo lleva al siguiente.

TIENE QUE OCUPAR SU SITIO: al menos ${PALABRAS_MINIMAS} palabras. No es por llenar. Es que explicarle bien cómo se hace algo no cabe en cuatro frases, y en cuatro frases tampoco cabe una voz. Si te sale corto, no engordes las frases ni alargues el arranque: cuéntale con más detalle cómo se hace lo que tiene que hacer.

POR DÓNDE ENTRA ESTA PARTE: ${area.porDondeEntra}. Se entra por ahí, directamente, sin presentar nada.

Y ESTE ES EL ORDEN DE LO QUE PASA POR DENTRO DEL TEXTO, sin que se vean las costuras:

ARRANCAS POR LO QUE HACE HOY, Y EN DOS O TRES FRASES. Las justas para que sepa que esto va con ella y no con cualquiera. Ni una más. Eso ya se lo contaron entero en otro sitio, y volver a contárselo aquí, aunque sea con otras palabras, es quitarle el sitio a lo único que ha venido a buscar.

Y ENSEGUIDA, QUÉ CAMBIA. Qué deja de hacer y qué hace en su lugar, en claro y sin suavizarlo.

Y DE AHÍ HASTA EL FINAL, TODO ES CÓMO SE HACE. Esto es lo que ocupa la mayor parte de lo que escribas, y es por lo que ha pagado. Cómo lo hace las primeras veces, cuando todavía no le sale solo. Qué hace con lo que sienta mientras lo hace. Qué se va a encontrar por el camino, y cómo lo sostiene cuando ya no sea nuevo y deje de apetecerle. Se cuenta hacia delante, como quien le explica algo a alguien que lo va a hacer mañana, no como quien le explica cómo es.

AHÍ DENTRO LE AVISAS DE LO QUE VA A APARECER PARA QUE NO LO HAGA: lo que va a sentir o lo que se va a decir por dentro para librarse. Se lo dices antes de que le pase, y le dices que eso es señal de que va bien, no de que se esté equivocando.

Y CIERRAS CON EN QUÉ LO VA A NOTAR. Algo que va a ver ocurriendo en su vida, no un estado de ánimo, y de las primeras: algo que pase en semanas.

Y ESTA ES LA PRUEBA DE QUE ESTÁ BIEN ESCRITO: tapa las tres primeras frases y lee lo que queda. Si lo que queda le sirve para hacer algo, está bien. Si lo que queda vuelve a ser cómo es, está mal y se reescribe entero.

LOS MOVIMIENTOS SON EL PASO A PASO, Y VAN APARTE. En el texto seguido no repites lo que ellos ya dicen: ahí no se cuenta el momento ni el paso, que van debajo y en su sitio.

Lo que cuenta el texto es lo otro, lo que ningún paso explica: cómo se hace eso cuando no le sale, qué hace con lo que sienta al hacerlo, qué se va a encontrar y cómo lo sostiene cuando deje de ser nuevo. Si algo de lo que has escrito en el texto se pudiera meter dentro de un movimiento, es que va en el movimiento y no ahí.

"movimientos"
Los que te doy abajo, uno por uno, ni uno más ni uno menos. De cada uno:
  titulo   Cuatro o cinco palabras que digan qué hace. Le hablas de tú, empieza
           en mayúscula y no lleva punto al final.
  texto    Primero cuándo: la señal por la que sabe que es ese momento y no
           otro. Y después qué hace exactamente ahí. Tan claro que lo pueda
           hacer sin preguntarle a nadie. Tres o cuatro frases.


NO TE SALGAS DE LO DECIDIDO. Los movimientos son los que te doy. Lo demás lo escribes tú, pero de lo que ya se sabe de ella, no de lo que te imagines.

Y NO PONGAS TÍTULOS NI NÚMEROS: los pone el programa.

LOS PÁRRAFOS SE SEPARAN CON UNA LÍNEA EN BLANCO. Es lo único de maqueta que haces tú, y hace falta: sin esa línea todo sale pegado en un bloque y no hay quien lo lea en un móvil.


LO QUE SE HA DECIDIDO PARA ESTA PARTE:

Lo que cambia: ${decidido.cambio}

Los movimientos:
${decidido.movimientos.map((m, i) => `${i + 1}. Cuando: ${m.cuando}\n   Hace: ${m.haces}`).join('\n')}

Lo que va a frenar: ${decidido.freno}

En qué lo va a notar: ${decidido.senal}${rasgosDeLaParte(area, rasgos)}

Quien lo va a leer es ${comoSeLeHabla(sexo)}
Nombre de pila: ${nombre}
${REGLA_DEL_NOMBRE(NOMBRE_EN.has(area.id))}`;

  const cuantas = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
  const parrafosDe = t => String(t || '').split(/\n+/).filter(x => x.trim()).length;

  const salida = await sinNombrarLaCarta({
    que: `la parte de ${area.id}`,
    // Aqui se mira que el texto tenga su sitio y que esten los movimientos:
    // el mismo reintento sirve para eso y para la carta.
    // Y que venga en parrafos, no en un solo bloque: la separacion la marca el
    // modelo con una linea en blanco, y si no la pone sale un muro de texto.
    cojo: p => cuantas(p.texto) < PALABRAS_MINIMAS
            || parrafosDe(p.texto) < 3
            || !(p.movimientos || []).length
            || (p.movimientos || []).some(m => !m.titulo || cuantas(m.texto) < 25),
    aviso: `\n\nY OJO: la vez anterior salió corto o vino de una pieza. El texto seguido tiene que pasar de ${PALABRAS_MINIMAS} palabras, ir repartido en párrafos separados por una línea en blanco, y cada movimiento contarse entero. Lo que falta no es arranque, es cómo se hace: eso es lo que se cuenta con más detalle.`,
    pedir: recordatorio => alModelo({
      que: `escribir ${area.id}`,
      modelo: 'claude-sonnet-5',
      piensa: 'low',
      techo: TECHO_DE_ESCRIBIR,
      system: encargo,
      mensaje: `Escribe esta parte entera, seguida, y ${decidido.movimientos.length === 1 ? 'su movimiento' : `sus ${decidido.movimientos.length} movimientos`}.${recordatorio}`,
      molde: MOLDE_DE_LA_PARTE,
      espera: AbortSignal.timeout(ESPERA_DE_ESCRIBIR_MS),
    }),
    texto: p => [p.texto].concat((p.movimientos || []).flatMap(m => [m.titulo, m.texto])).join(' '),
  });

  return {
    id: area.id,
    titulo: area.titulo,
    texto: String(salida.texto || '').trim(),
    movimientos: (Array.isArray(salida.movimientos) ? salida.movimientos : [])
      .map(m => ({ titulo: String(m?.titulo || '').trim(), texto: String(m?.texto || '').trim() }))
      .filter(m => m.titulo && m.texto),
  };
}

// ── EL PRINCIPIO Y EL FINAL ─────────────────────────────────
//
// Por donde empieza va delante del todo: abre el documento quitandole el
// agobio de tener siete cosas que arreglar. El orden y el dia que falle van al
// final. Los tres salen de la misma decision y se escriben de una vez.

// El mismo tope que las partes, y por lo mismo: aqui tambien se puede pedir
// dos veces.
const ESPERA_DEL_MARCO_MS = 65000;
const TECHO_DEL_MARCO = 12000;

const MOLDE_DEL_MARCO = {
  type: 'object',
  properties: {
    laConducta: { type: 'string' },
    porQueEsa:  { type: 'string' },
    soloEsto:   { type: 'string' },
    // EL ARRANQUE. Van seguidas y sin titulo entre ellas: se leen como un solo
    // texto, pero se piden por separado para que ninguna se quede sin decir.
    conQue:       { type: 'string' },
    comoEmpiezas: { type: 'string' },
    cuandoSumas:  { type: 'string' },
    orden: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area:   { type: 'string' },
          saltas: { type: 'string' },
        },
        required: ['area', 'saltas'],
        additionalProperties: false,
      },
    },
    recaida: { type: 'string' },
  },
  required: ['laConducta', 'porQueEsa', 'soloEsto', 'conQue', 'comoEmpiezas', 'cuandoSumas', 'orden', 'recaida'],
  additionalProperties: false,
};

const tituloDe = id => (AREAS.find(a => a.id === id) || {}).titulo || id;

// Dos titulos son el mismo aunque cambien las mayusculas, las tildes o la
// puntuacion. Comparar dos cadenas no es criterio: lo hace el codigo.
const comoSeCompara = txt =>
  sinTildes(txt).replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();

async function escribirElMarco({ nombre, sexo, plan }) {
  // La parte por la que empieza: de sus movimientos sale el arranque, asi que
  // se busca una vez y se usa en los dos sitios del encargo.
  const laDeEmpezar = plan.partes.find(p => p.area === plan.empiezaPor.area) || {};

  const encargo = `${EL_P2_NO_ES_EL_P1}

${REGLAS_COMUNES}


LO QUE TE TOCA AHORA

El resto del documento ya está escrito. Te toca lo que va delante de todo, lo primero que hace y lo que va al final.

El principio son TRES COSAS SEPARADAS, y cada una hace UN SOLO trabajo. No las mezcles ni las repitas entre ellas: si algo ya está dicho en una, en las otras no vuelve.

"laConducta"
UNA sola cosa que hace, la de abajo, dicha en dos frases como se lo diría alguien que la conoce. Se entra por lo que hace, sin presentar nada, sin anunciar que esto empieza y sin nombrar títulos ni trozos del documento. Nada de encadenar dos conductas: una.

"porQueEsa"
Por qué mover esa mueve lo demás. Dos o tres frases, y en presente: lo que le pasa hoy por seguir haciéndolo, no lo que pasaría si no lo cambiara. Nada de suposiciones encadenadas.

"soloEsto"
Que ahora mismo no le toca nada más que eso. Una o dos frases, tranquilas, sin decirle cuántas cosas hay ni cuándo llegan las demás.

LO PRIMERO QUE HACE, EN TRES PIEZAS QUE SE LEEN SEGUIDAS. Aquí es donde este documento deja de ser algo que se lee y pasa a ser algo que se hace, así que es lo más importante que escribes. Abajo tienes los movimientos de la parte por la que empieza: de esos sale todo esto, y de ningún otro.

"conQue"
Con cuál de esos movimientos empieza, y por qué ese antes que los otros. Lo nombras por lo que hace, nunca por su título. Dos o tres frases.

"comoEmpiezas"
Cómo lo hace las primeras veces, cuando todavía no le sale solo. Tan concreto que lo pueda hacer mañana sin preguntarle a nadie: en qué momento, qué hace exactamente y qué hace con lo que sienta al hacerlo. Y qué hace el día que se le pase. Cuatro o cinco frases, y aquí no se ahorra ni una.

"cuandoSumas"
Cuándo añade el siguiente movimiento: qué tiene que estar pasando ya para que toque, y no cuántos días. Y en qué mira para saber que va bien, que tiene que ser algo que pueda ver ocurriendo y que llegue pronto: de lo que se nota a las pocas veces de hacerlo, no de lo que se ve al cabo de mucho tiempo. Tres o cuatro frases.

"orden"
Las demás, en el orden en que le conviene ir. De cada una:
  area     el nombre de esa parte, copiado TAL CUAL te lo doy abajo, sin
           cambiarle ni una palabra. Es lo que hace que cada texto acabe en su
           parte y no en la de al lado.
  saltas   qué tiene que estar pasando ya en su vida para dar por hecha la
           anterior y pasar a esta. Una frase, y ESCRITA PARA IR DETRÁS DE UN
           "Cuando": empieza directamente por lo que le está pasando, en
           minúscula, sin punto al final y sin repetir la palabra cuando.
           Y SALE DE ESA PARTE, no de otra: debajo de cada una tienes lo que
           cambia ahí, y de eso sale el cuándo. Si lo que escribes vale para
           cualquiera de las siete, está mal.
           Algunas traen ya apuntado el cuándo y otras no; a las que no lo
           traen les pones tú uno sacado de lo que cambia ahí.
NADA DE FECHAS NI DE SEMANAS. No sabemos cómo es su vida. Se salta por lo que le está pasando, no por el calendario.

"recaida"
Qué hace el día que lo deje o vuelva a lo de antes. Y que eso iba a pasar, que estaba contado y que no significa que no sirva. Nada de animar: el paso concreto para volver. Cuatro o cinco frases.


LO QUE SE HA DECIDIDO:

La conducta por la que empieza: ${laDeEmpezar.cambio || ''}
Y empieza por ahí porque: ${plan.empiezaPor.porque}

Los movimientos de esa parte, que son de donde sale lo primero que hace:
${(laDeEmpezar.movimientos || []).map(m => `- Cuando: ${m.cuando}\n  Hace: ${m.haces}`).join('\n') || '(no ha venido ninguno)'}

Lo que va a aparecer para frenarle ahí: ${laDeEmpezar.freno || ''}
Y en qué lo va a notar: ${laDeEmpezar.senal || ''}

Después, en este orden:
${plan.orden.map((o, i) => {
  const suya = plan.partes.find(p => p.area === o.area) || {};
  return `${i + 1}. ${tituloDe(o.area)}\n   lo que cambia ahí: ${suya.cambio || ''}` +
    (o.saltas ? `\n   se salta a ella cuando: ${o.saltas}` : '');
}).join('\n')}

El día que falle: ${plan.recaida}

Quien lo va a leer es ${comoSeLeHabla(sexo)}
Nombre de pila: ${nombre}
${REGLA_DEL_NOMBRE(true)}`;

  // LOS PASOS QUE SE ESPERAN, POR SU NOMBRE. Si vuelve con menos, la hoja de
  // ruta sale coja y quien lee se queda sin saber cuando le toca esa parte;
  // por eso cuenta como venir a medias y se pide otra vez.
  const esperados = plan.orden.map(paso => comoSeCompara(tituloDe(paso.area)));
  const faltaAlguno = m => {
    const traidos = new Set((Array.isArray(m?.orden) ? m.orden : [])
      .filter(o => String(o?.saltas || '').trim())
      .map(o => comoSeCompara(o?.area)));
    return esperados.some(t => !traidos.has(t));
  };

  const salida = await sinNombrarLaCarta({
    que: 'el principio y el final',
    cojo: m => estaVacia(m.laConducta, 'por dónde empiezas')
            || estaVacia(m.porQueEsa, 'por qué esa')
            || estaVacia(m.soloEsto, 'solo esto')
            || estaVacia(m.conQue, 'con qué empiezas')
            || estaVacia(m.comoEmpiezas, 'cómo empiezas')
            || estaVacia(m.cuandoSumas, 'cuándo sumas')
            || estaVacia(m.recaida, 'el día que lo dejes')
            || faltaAlguno(m),
    aviso: `\n\nY OJO: la vez anterior algo vino vacío o faltó algún paso del orden. El principio, lo primero que hace y el día que falle llevan texto escrito para quien lo lee, y el orden lleva las ${esperados.length} partes que te doy, cada una con su cuándo.`,
    pedir: recordatorio => alModelo({
      que: 'escribir el principio y el final',
      modelo: 'claude-sonnet-5',
      piensa: 'low',
      techo: TECHO_DEL_MARCO,
      system: encargo,
      mensaje: `Escribe el principio, lo primero que hace y el final, siguiendo el esquema.${recordatorio}`,
      molde: MOLDE_DEL_MARCO,
      espera: AbortSignal.timeout(ESPERA_DEL_MARCO_MS),
    }),
    texto: m => [m.laConducta, m.porQueEsa, m.soloEsto, m.conQue, m.comoEmpiezas, m.cuandoSumas, m.recaida]
      .concat((m.orden || []).map(o => o.saltas)).join(' '),
  });

  // CADA TEXTO VA A LA PARTE QUE NOMBRA, NO A LA QUE LE TOCA POR SU SITIO.
  //
  // Emparejarlos por su puesto en la lista es lo que en el P1 corrio las
  // descripciones tres sitios en el informe de una clienta: el modelo devolvio
  // menos de las que se le pidieron, todo lo de detras se pego a lo que no era
  // y nada salto. Aqui pasaria igual: el titulo saldria de una parte y el
  // texto de otra.
  //
  // Con el nombre delante eso no puede pasar. Y el titulo lo pone el codigo,
  // que es el que lo tiene bien escrito y con sus tildes.
  const porTitulo = new Map();
  for (const o of (Array.isArray(salida.orden) ? salida.orden : [])) {
    const clave = comoSeCompara(o?.area);
    const saltas = String(o?.saltas || '').trim();
    if (clave && saltas && !porTitulo.has(clave)) porTitulo.set(clave, saltas);
  }

  const orden = [];
  for (const paso of plan.orden) {
    const titulo = tituloDe(paso.area);
    const saltas = porTitulo.get(comoSeCompara(titulo));
    if (saltas) orden.push({ titulo, saltas });
    else console.warn(`[p2] el orden ha venido sin la parte de ${paso.area}`);
  }

  return {
    laConducta: String(salida.laConducta || '').trim(),
    porQueEsa: String(salida.porQueEsa || '').trim(),
    soloEsto: String(salida.soloEsto || '').trim(),
    conQue: String(salida.conQue || '').trim(),
    comoEmpiezas: String(salida.comoEmpiezas || '').trim(),
    cuandoSumas: String(salida.cuandoSumas || '').trim(),
    orden,
    recaida: String(salida.recaida || '').trim(),
  };
}
// ════════════════════════════════════════════════════════════════
// LA PAGINA Y SUS PETICIONES
// ════════════════════════════════════════════════════════════════
//
// Cada paso es una peticion suya: la lista, el plan, cada parte y el marco.
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
      const { compra, nombre, sexo, decidido } = req.body || {};
      const area = AREAS.find(a => a.id === String(decidido?.area || ''));
      if (!area) return res.status(400).json({ error: 'Esa parte no existe' });
      // Lo que llega del navegador se comprueba antes de meterlo en el encargo:
      // si viniera a medias, el hueco lo rellenaria el modelo por su cuenta y
      // acabaria inventandose algo de su vida.
      if (!Array.isArray(decidido.movimientos) || !decidido.movimientos.length
          || !decidido.cambio || !decidido.freno || !decidido.senal) {
        return res.status(400).json({ error: 'Esa parte llega a medias y no se escribe' });
      }
      // Se vuelve a abrir el informe para darle sus rasgos de esta parcela:
      // con el esquema de lo decidido a secas no se escribe nada que suene a
      // persona. Si no se puede abrir, se escribe igual, con menos material.
      let rasgos = null;
      try { rasgos = (await leer(compra))?.rasgos || null; }
      catch (e) { console.warn(`[p2] no se ha podido abrir el informe para ${area.id}: ${e.message}`); }

      const parte = await escribirLaParte({
        area,
        nombre: String(nombre || 'esta persona'),
        sexo: String(sexo || ''),
        decidido,
        rasgos,
      });
      return res.status(200).json({ parte });
    }

    if (accion === 'marco') {
      const { nombre, sexo, plan } = req.body || {};
      if (!plan?.empiezaPor?.area) {
        return res.status(400).json({ error: 'El marco se escribe con el plan, y no ha llegado' });
      }
      const marco = await escribirElMarco({ nombre: String(nombre || 'esta persona'), sexo: String(sexo || ''), plan });
      return res.status(200).json({ marco });
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
  select { width:100%; padding:.7rem; border:1px solid rgba(14,63,75,.3); border-radius:6px; background:#fff; margin-bottom:1rem; }
  button { background:var(--gold); color:#fff; border:0; border-radius:6px; padding:.8rem 1.6rem; cursor:pointer; font-weight:600; letter-spacing:.03em; }
  button:disabled { opacity:.45; cursor:default; }
  #pdf { margin-left:.6rem; background:var(--teal); }
  .aviso { font-family:system-ui,sans-serif; font-size:.9rem; color:#6b6b6b; margin:1.2rem 0; }
  .error { color:#c0392b; }
  .parte { background:#fff; border:1px solid rgba(189,144,72,.25); border-left:4px solid var(--gold); border-radius:8px; padding:1.6rem 1.8rem; margin-top:1.6rem; }
  .marco { border-left-color:var(--teal); }
  .cual { font-family:system-ui,sans-serif; font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.12em; color:var(--gold); margin-bottom:.5rem; }
  .parte h2 { font-size:1.25rem; color:var(--teal); margin-bottom:.9rem; line-height:1.35; }
  .bloque { margin-bottom:1.3rem; }
  .bloque:last-child { margin-bottom:0; }
  .bloque h3 { font-family:system-ui,sans-serif; font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.1em; color:var(--gold); margin-bottom:.45rem; }
  .bloque p { margin-bottom:.6rem; }
  .bloque p:last-child { margin-bottom:0; }
  .mov { background:rgba(189,144,72,.07); border-radius:6px; padding:.9rem 1.1rem; margin-bottom:.7rem; }
  .mov b { color:var(--teal); display:block; margin-bottom:.3rem; }
  .paso { margin-bottom:.6rem; }
  .paso b { color:var(--teal); }
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
// El nombre de cada area, el mismo que lleva en el P1, para ponerlo encima del
// titulo con su numero.
const NOMBRES = ${JSON.stringify(Object.fromEntries(AREAS.map(a => [a.id, a.del_p1])))};
const TITULOS = ${JSON.stringify(Object.fromEntries(AREAS.map(a => [a.id, a.titulo])))};
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
  let quienEs = { nombre:'esta persona', sexo:'' };

  // 1. La llamada que piensa y decide el documento entero.
  let plan;
  aviso.textContent = 'Decidiendo su plan… (es la parte que piensa, tarda un minuto)';
  try {
    const r = await llamar({ accion:'plan', compra });
    plan = r.plan;
    if (r.quien) quienEs = r.quien;
  } catch (e) {
    aviso.className = 'aviso error';
    aviso.textContent = 'No se ha podido decidir el plan: ' + e.message;
    ir.disabled = false; quien.disabled = false;
    return;
  }

  // 2. El principio y el final se piden ya, pero no se espera a que lleguen:
  // van a la vez que las siete partes. Su sitio se reserva ahora, arriba del
  // todo, y se rellena cuando llega.
  const arranque = document.createElement('div');
  arranque.className = 'parte marco';
  arranque.innerHTML = '<p class="cual">Antes de nada</p><p class="aviso">Escribiéndose…</p>';
  salida.appendChild(arranque);

  const elMarco = llamar({ accion:'marco', nombre:quienEs.nombre, sexo:quienEs.sexo, plan })
    .then(r => r.marco)
    .catch(e => { arranque.innerHTML = '<p class="cual">Antes de nada</p>' +
      '<p class="error">El principio ha fallado: ' + escapar(e.message) + '</p>'; return null; });

  // 3. Las siete partes, TODAS A LA VEZ.
  //
  // Cada una es su propia peticion, asi que lanzarlas juntas no acerca a
  // ninguna al tiempo maximo del servidor. De una en una esto tardaba lo que
  // tardan las siete sumadas; asi tarda lo que tarde la mas lenta.
  //
  // Se pintan en su hueco, en el orden del documento, y no segun van llegando:
  // el sitio se reserva antes y cada una cae en el suyo.
  aviso.textContent = 'Escribiendo las ' + plan.partes.length + ' partes a la vez…';
  const huecos = plan.partes.map((_, i) => {
    const hueco = document.createElement('div');
    hueco.className = 'parte';
    hueco.innerHTML = '<p class="cual">' + (i+1) + ' · ' + escapar(NOMBRES[plan.partes[i].area] || '') +
      '</p><p class="aviso">Escribiéndose…</p>';
    salida.appendChild(hueco);
    return hueco;
  });

  const escritas = [];
  await Promise.all(plan.partes.map(async (decidido, i) => {
    try {
      const { parte } = await llamar({ accion:'parte', compra, nombre:quienEs.nombre, sexo:quienEs.sexo, decidido });
      escritas[i] = parte;
      huecos[i].outerHTML = pintarParte(parte, i+1);
    } catch (e) {
      huecos[i].innerHTML = '<p class="cual">' + (i+1) + ' · ' + escapar(NOMBRES[decidido.area] || '') +
        '</p><p class="error">' + escapar(e.message) + '</p>';
    }
  }));

  // 4. Y cuando llega el marco, su principio arriba y su final abajo.
  const marco = await elMarco;
  if (marco) {
    arranque.outerHTML = pintarArranque(marco);
    salida.insertAdjacentHTML('beforeend', pintarFinal(marco, TITULOS[plan.empiezaPor.area] || ''));
  }

  // EL PDF SOLO SE OFRECE SI ESTA TODO. Con una parte caida saldria un
  // documento con un agujero dentro, y eso no se le ensena a nadie.
  const completas = escritas.filter(Boolean);
  if (marco && completas.length === plan.partes.length) {
    elDocumento = {
      nombre: quienEs.nombre,
      marco,
      empiezaPor: TITULOS[plan.empiezaPor.area] || '',
      // La etiqueta pequena de cada parte y el titulo de sus movimientos van
      // desde aqui: el que maqueta no tiene que saberse las siete partes.
      partes: completas.map(p => ({ ...p, etiqueta: NOMBRES[p.id] || '', bloque: BLOQUES.movimientos })),
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

function pintarArranque(m) {
  // Los parrafos van dentro de un bloque, como los de las siete partes. Sueltos
  // salian pegados unos a otros: la separacion entre parrafos la pone la hoja
  // de estilo dentro de .bloque, y fuera de ahi no la pone nadie.
  return '<div class="parte marco"><p class="cual">Antes de nada</p>' +
    '<h2>Por dónde empiezas</h2><div class="bloque">' + parrafos(m.laConducta) +
    parrafos(m.porQueEsa) + parrafos(m.soloEsto) + '</div></div>';
}

function pintarFinal(m, empiezaPor) {
  // PRIMERO LA CONDICION Y DESPUES A DONDE PASA. Al reves -el titulo delante y
  // la condicion debajo- se lee como si la condicion fuera de esa parte, y no
  // lo es: es lo que tiene que estar pasando ya para dar por hecha la anterior.
  // Puesto asi se entiende sin explicar nada.
  //
  // Y LA HOJA DE RUTA ABRE CON LA PARTE POR LA QUE EMPIEZA. Arriba del todo se
  // le cuenta la conducta por la que arranca, pero sin decirle de que parte
  // sale; sin esta linea la lista empieza por la segunda y quien lee no sabe
  // atar una cosa con la otra.
  const primero = empiezaPor
    ? '<p class="paso">Empiezas por <b>' + escapar(empiezaPor) + '</b>.</p>'
    : '';
  const orden = primero + (m.orden||[]).map(o =>
    '<p class="paso">Cuando ' + escapar(o.saltas) + ', pasas a <b>' + escapar(o.titulo) + '</b>.</p>'
  ).join('');
  // LO PRIMERO QUE HACE VA DELANTE DEL ORDEN. Las tres piezas se pintan
  // seguidas y sin titulo entre ellas: se leen como un texto solo.
  const arranque = [m.conQue, m.comoEmpiezas, m.cuandoSumas].filter(Boolean).map(parrafos).join('');
  return '<div class="parte marco"><p class="cual">Para terminar</p>' +
    (arranque ? '<h2>Lo primero que haces</h2><div class="bloque">' + arranque + '</div>' : '') +
    (orden ? '<div class="bloque"><h3>Y después, en este orden</h3>' + orden + '</div>' : '') +
    '<div class="bloque"><h3>El día que lo dejes</h3>' + parrafos(m.recaida) + '</div></div>';
}

function pintarParte(p, n) {
  const movs = (p.movimientos||[]).map(m =>
    '<div class="mov"><b>' + escapar(m.titulo) + '</b>' + parrafos(m.texto) + '</div>'
  ).join('');
  return '<div class="parte"><p class="cual">' + n + ' · ' + escapar(NOMBRES[p.id] || '') + '</p>' +
    '<h2>' + escapar(p.titulo) + '</h2>' +
    '<div class="bloque">' + parrafos(p.texto) + '</div>' +
    '<div class="bloque"><h3>' + escapar(BLOQUES.movimientos) + '</h3>' + movs + '</div>' +
    '</div>';
}
</script>
</body>
</html>`;
