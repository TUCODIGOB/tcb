// ════════════════════════════════════════════════════════════════
// /api/prueba-creencias.js
//
// PRUEBA. No es parte de la tienda y se borra cuando cerremos el punto de
// creencias del P2. No lo llama ninguna pagina.
//
// COMO FUNCIONA
//
// Se abre en el navegador y sale un formulario con las tres preguntas. Se
// pegan ahi las respuestas, se envia, y escribe las creencias con ellas.
//
// LAS RESPUESTAS NO ESTAN EN ESTE FICHERO NI LO VAN A ESTAR. Se pegan cada
// vez. Una respuesta escrita aqui dentro se le acabaria colando a otro
// cliente, y entonces el informe deja de ser suyo.
//
// SOLO LOS RASGOS. Las siete areas del P1 no se le mandan: son treinta mil
// caracteres que no aportan ninguna creencia que no este ya en los rasgos.
//
// UNA SOLA LLAMADA. Elige, descarta las repetidas y las escribe de una vez.
// Iba en tres pasos porque de una tirada salian repetidas, y salian repetidas
// por tener las areas delante. Sin ellas, las ve todas a la vez mientras
// escribe, que es cuando mejor puede no repetirse.
//
// Y despues se comprueba que no haya dos trozos que empiecen igual. Eso es una
// segunda llamada, corta, y SOLO si de verdad los hay.
// ════════════════════════════════════════════════════════════════

import crypto from 'crypto';

// LOS LADILLOS QUE LLEVA CADA CREENCIA.
//
// Van iguales en todas y en este orden. Son lo que deja respirar la lectura:
// el ojo descansa en ellos y de un vistazo sabe por donde va.
//
// El titulo es la creencia dicha corta. Debajo, el primer ladillo la explica:
// son dos cosas distintas y por eso van separadas. Un titulo que ademas
// tuviera que explicarse se convierte en el parrafo largo que no golpea.
//
// Estan escritos aqui una sola vez. El encargo los pide con estas palabras, y
// al pintar la pagina se cogen de aqui y no de lo que devuelva el modelo, asi
// que salen siempre bien escritos y con sus tildes aunque el se las coma.
const LADILLOS = [
  'La creencia',
  'Dónde se te nota y lo que te está costando',
  'Qué parte es verdad y qué parte no',
  'La creencia nueva',
];

// Las tres preguntas que se le hacen al cliente al comprar el P2.
const PREGUNTAS = [
  '¿Como seria tu mejor version, y como seria su vida? ¿Como seria su dia a dia?',
  '¿Como es tu vida hoy? ¿Como es una semana normal tuya?',
  '¿Que llevas años intentando cambiar y no cambia?',
];

// ── REPARTIR EL TEXTO QUE DEVUELVE EL MODELO ────────────────
//
// Cada creencia arranca en su linea CREENCIA: y dentro lleva sus ladillos,
// que son siempre los mismos. Aqui no se adivina nada.
//
// Los ladillos se reconocen por sus palabras con peso, no letra por letra: el
// modelo escribe alguna vez "lo que LE esta costando" donde el encargo pone
// "TE", y con la comparacion exacta ese renglon se quedaba en parrafo suelto,
// asi que la creencia perdia su ladillo y el texto su descanso.

const pelado = t => String(t).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const HUECAS = /\b(el|la|lo|los|las|un|una|unos|unas|y|o|que|de|del|a|al|en|se|te|le|me|tu|su|mi|es|esta|estas|esto)\b/g;
const conPeso = t => pelado(t).replace(HUECAS, ' ').replace(/\s+/g, ' ').trim();

// Solo se mira si el renglon tiene pinta de ladillo: corto y sin puntuacion al
// final. Sin esto, una frase suelta que acabara con las mismas palabras con
// peso se convertiria en ladillo y partiria la creencia en dos.
const pintaDeLadillo = t => t.length < 70 && !/[.:;,!?]$/.test(t);

const LADILLOS_CON_PESO = LADILLOS.map(conPeso);

export function repartir(texto) {
  const bloques = [];
  const meter = (parte) => {
    if (!bloques.length) bloques.push({ titulo: '', partes: [] });
    bloques[bloques.length - 1].partes.push(parte);
  };

  for (const trozo of String(texto).split(/\n{2,}/)) {
    // Dentro de un trozo, un ladillo puede venir pegado a su parrafo con un
    // solo salto de linea. Se miran las lineas una a una, y las que no son ni
    // cabecera ni ladillo se vuelven a juntar en el parrafo del que venian,
    // para no partir en dos lo que era uno.
    let suelto = [];
    const soltar = () => {
      const p = suelto.join(' ').trim();
      suelto = [];
      if (p) meter({ parrafo: p });
    };
    for (const linea of trozo.split('\n')) {
      const t = linea.trim();
      if (!t) continue;
      const marca = t.match(/^CREENCIA\s*:\s*(.*)$/i);
      if (marca) {
        soltar();
        bloques.push({ titulo: marca[1].trim(), partes: [] });
        continue;
      }
      const cual = pintaDeLadillo(t) ? LADILLOS_CON_PESO.indexOf(conPeso(t)) : -1;
      if (cual >= 0) { soltar(); meter({ ladillo: LADILLOS[cual] }); continue; }
      suelto.push(t);
    }
    soltar();
  }
  return bloques;
}

// ── LOS TRES ENCARGOS ───────────────────────────────────────
//
// Solo reglas. Ni una linea de ejemplo, ni un trozo de informe de muestra:
// lo que se le enseñe escrito, lo copia, y entonces el informe deja de ser de
// quien lo ha comprado.

// ── EL ENCARGO ──────────────────────────────────────────────
//
// UNO SOLO. Antes eran tres -elegir, juntar, escribir- porque de una tirada
// salian repetidas. Salian repetidas porque se le mandaba tambien el estudio
// entero de las siete areas: treinta mil caracteres delante en los que cada
// creencia parecia justificada por su lado. Con los rasgos a secas eso ya no
// pasa, y las ve todas a la vez mientras escribe, que es cuando mejor puede
// no repetirse.
//
// SOLO REGLAS. Ni una linea de ejemplo, ni un trozo de informe de muestra: lo
// que se le enseñe escrito, lo copia, y entonces el informe deja de ser de
// quien lo ha comprado.

const CREENCIAS = `Escribes la segunda parte de un estudio personal. Ella ya leyo la primera, que le contaba como es y por que. Esta es para que cambie.

Te paso sus rasgos y lo que ella ha contestado hoy. Con eso eliges sus creencias y las escribes, todo de una vez.

Una creencia es algo que da por cierto sin haberlo puesto nunca en duda, y que decide lo que hace. Ella no lo vive como una creencia suya: lo vive como que las cosas son asi.


DE DONDE SALEN

De sus rasgos. De ahi y de nada mas.

No inventas ninguna. No pones ninguna que no puedas señalar en los rasgos que te paso.


CUALES ENTRAN

Abajo tienes lo que ella ha contestado: como seria su mejor version, como es su vida hoy, y que lleva años intentando cambiar sin conseguirlo.

Una creencia entra SOLO si le esta bloqueando algo de eso que ella misma ha dicho que quiere y no consigue.

Si no bloquea nada de lo que ella ha nombrado, fuera, por bien que suene y por mucho que este en sus rasgos.

Lo que decide no es cuantas son, es el peso que tienen: una que no la tenga atascada de verdad no entra.


BAJA HASTA DONDE DUELE

Esto decide si el trabajo vale algo.

Una creencia tiene dos versiones. La presentable es una regla sobre como funciona el mundo, y suena razonable. Esa no sirve: se lee, se asiente y no pasa nada, porque no acusa a nadie.

Debajo hay otra, que es un veredicto sobre ELLA: lo que cree que es, o que le falta, o que le sobra. Esa no la ha dicho en voz alta nunca.

Esa es la que se elige.

Para llegar: coge la version presentable y preguntate que tiene que ser cierto sobre ella para que se comporte asi. Y vuelve a preguntartelo. Paras cuando llegas a un veredicto sobre lo que ella es o lo que le falta.

COMO SE SABE QUE HAS LLEGADO: esta en primera persona, dice algo sobre ella y no sobre el mundo, y da un poco de verguenza leerla. Si se puede asentir tranquilamente, no has bajado.


NI UNA REPETIDA. ESTO ES LO QUE MAS SE ESTROPEA

Antes de escribir nada, ponlas todas en una lista y comparalas de dos en dos: la primera con la segunda, la primera con la tercera, y asi hasta el final. Luego la segunda con todas las que van detras. Todos los pares.

DOS SON LA MISMA cuando debajo dan por cierto lo mismo sobre ella, aunque cambien las palabras.

Y EL CASO QUE MAS SE ESCAPA ES ESTE: la misma creencia repetida en dos parcelas de su vida. Una con el trabajo y otra con la gente. Una con el dinero y otra con la pareja. Suenan a dos porque hablan de dos sitios, pero debajo dicen lo mismo sobre ella. Esas son UNA, siempre. El sitio donde le ocurre no las hace distintas.

AL REVES TAMBIEN, Y AQUI NO TE PASES: dos creencias distintas pueden estropearle lo mismo, porque en una vida casi todo desemboca en las mismas cuatro cosas. Que le bloqueen lo mismo no las hace una. Juntar dos que eran distintas le borra una creencia suya y esa ya no vuelve.

La pregunta es siempre la misma, y no hay otra: lo que da por cierto SOBRE SI MISMA en una, es lo mismo que da por cierto en la otra?

Cuando dos sean la misma, te quedas con la que llega mas abajo, la que mas duele, y le sumas lo que la otra tenga de nuevo. No se pierde nada de eso.


CUANTAS

Ordenalas de la que mas le cuesta a la que menos.

SEIS ES EL TECHO, NO UNA CANTIDAD QUE HAYA QUE ALCANZAR. Si te quedan mas de seis, cortas por la sexta. Si te quedan tres, van tres, y esta bien: son las suyas y no falta ninguna. Cada persona tiene las que tiene.

Las que se quedan son las que le bloquean lo que ella misma ha dicho que quiere, y las que le salen en mas sitios de su vida.

No se rellena inventando para llegar a seis, y una que ya has juntado no se vuelve a separar: eso devuelve el repetido que acabas de quitar.


COMO VA MONTADA CADA CREENCIA

Todas van montadas igual, y esto no cambia de una a otra.

Primero una linea que empieza por CREENCIA: y detras, en esa misma linea, la creencia. Nada mas en esa linea.

Debajo van cuatro ladillos, en este orden y con estas palabras exactas, cada uno solo en su linea y con sus parrafos debajo:

${LADILLOS[0]}
${LADILLOS[1]}
${LADILLOS[2]}
${LADILLOS[3]}

Ni un ladillo mas, ni uno menos, ni cambiados de sitio, ni con otras palabras. Ninguno se queda sin nada debajo.


EL TITULO, LA LINEA DE ARRIBA

Es el veredicto dicho por ella y sobre ella: primera persona y presente. Es lo que decide si sigue leyendo.

VA CORTO: UNA sola idea, DIEZ PALABRAS COMO MUCHO, y cuentalas. Ni una condicion metida dentro: nada de "asi que", nada de "y entonces", nada de dos frases pegadas con una coma. Si no te cabe en diez palabras es que llevas dos creencias en una: o las separas, o bajas hasta la que sostiene a las dos.

CON PALABRAS DE TODOS LOS DIAS, en seco. Si al leerlo hay que rellenar con la cabeza a que se refiere, esta mal escrito. Las palabras que no se pueden ver -confiar, valer, merecer, servir- no dicen nada solas; en su sitio va lo que ella hace, o lo que se dice, o lo que le pasa cuando se la cree.

Al leerlo tiene que apartar un poco la vista. Si se lee entero sin que se le mueva nada, esta suavizado y hay que bajarlo.

Aqui no se explica: explicarlo es el trabajo del primer ladillo. Sin numero, sin raya y sin comillas.


DEBAJO DEL PRIMER LADILLO

Aqui se le cuenta que es eso que acaba de leer arriba. Que da por cierto sobre ella misma, dicho entero y con sus palabras, hasta que lo reconozca.

Ella no lo vive como una creencia suya: lo vive como que las cosas son asi. Eso es justo lo que hay que enseñarle aqui, que es una idea que lleva dentro y no una descripcion del mundo.

Todavia no cuentas donde se le ve ni lo que le cuesta: eso viene en el ladillo siguiente y aqui sobra.


DEBAJO DEL SEGUNDO

Lo que esta creencia le hace hacer, lo que le hace no hacer, y lo que eso le quita.

Sale en varias partes de su vida, no en una: señala en cuantas la encuentres, siempre que esten en sus rasgos o en lo que ella ha contado. Que vea que lo que creia un problema de una zona suya le esta gobernando media vida.

Pero no las vacies todas de golpe. Coges lo que mas le pese y lo cuentas; lo demas se queda fuera. Una lista larga de sitios, uno detras de otro, deja de leerse a la tercera.

Los precios, concretos: las horas, la salud, el dinero, la conversacion que no tuvo, lo que no pidio. Nada de que le limita o le frena: eso no es un precio, es una palabra.


DEBAJO DEL TERCERO

Lleva años en pie porque una parte es cierta. Se le dice cual y se le da la razon ahi de verdad. Y luego se le señala el punto exacto donde deja de ser cierta.

Si se le dice que es mentira entera, no se lo cree y deja de leer.


DEBAJO DEL CUARTO

Aqui el estudio deja de mirar hacia atras. Todo lo anterior le explica lo que le pasa; esto es lo unico que se lleva, asi que no se despacha en una linea suelta.

Primero la creencia nueva, en una frase. Y esa frase tiene que APORTARLE algo o no vale.

Acaba de leer tres bloques explicandole como funciona por dentro. Si esta frase es la suya puesta del reves, o un resumen de lo que ya le has contado con otras palabras, o un lema de los que valen para cualquiera, no le aporta nada y se la salta.

Le aporta cuando le dice algo que no tenia: donde esta de verdad lo que lleva buscando, o que es lo que si le da eso que ella creia que le daba la creencia vieja.

Y tiene que poder creersela HOY: lo contrario de la suya no vale, porque le pide un salto de fe que no va a dar.

NO ARRANQUES ESTA FRASE CON "PUEDO", ni con "ya no necesito", ni con ninguna formula que acabe repitiendose en las demas.

Y despues, lo que se le abre. Que deja de pasarle. Que puede hacer que hoy no hace. Como es ella cuando esto ya no le manda, y eso no es un futuro bonito inventado: es lo que ella misma ha dicho que quiere, ahi puesto y al alcance, sin la creencia delante tapandolo.

Que lo cierre sabiendo por donde tira, no solo entendiendo por que esta atascada.

Pero sin irse de largo y sin convertirlo en un plan: ni ejercicios, ni pasos, ni pruebas para esta semana, ni consejos. El como se hace va en otra parte.


AQUI NO SE ESCRIBEN ESCENAS

Ni una. Nada de contarle un momento suyo como si lo estuvieras viendo: ni una hora, ni un dia de la semana, ni un sitio, ni lo que tenia en la mano, ni lo que hizo despues.

En cuanto describes un momento te lo estas inventando, y ella lo nota a la primera. Una escena que no le paso tira todo lo demas, aunque lo demas sea cierto.

Lo que si se dice es como funciona: lo que hace siempre que le pasa eso. Eso es suyo y es verdad. El cuando y el donde, no.


NINGUNA SE PARECE A OTRA AL LEERLA

El montaje es el mismo en todas, y justo por eso lo que va escrito dentro tiene que ser distinto de verdad. Si ademas suenan igual, a la tercera sabe lo que viene y deja de leer.

- LO QUE CUENTAS EN UNA NO LO VUELVES A CONTAR EN OTRA. Ni la misma idea con otras palabras, ni el mismo precio, ni el mismo detalle suyo.
- NINGUN PARRAFO ARRANCA COMO OTRO QUE VAYA DEBAJO DEL MISMO LADILLO. Los que van debajo del tercer ladillo son los que mas se te van a ir por el mismo molde: mirate los suyos juntos antes de entregar y cambialos.
- EL PARRAFO NO ARRANCA CON LAS PALABRAS DE SU LADILLO. Acaba de leerlo justo encima; si el parrafo empieza diciendo lo mismo, lee dos veces la misma frase.
- Y DENTRO DE UN BLOQUE, NO EMPIECES TRES FRASES SEGUIDAS IGUAL. En cuanto se ve la misma entrada una y otra vez, aquello se lee como una lista.
- No empieces dos igual y no cierres dos igual.
- Si una formula ya la has usado en una creencia, en las demas no aparece.
- Unas mas largas y otras mas cortas. La que mas le pesa se lleva mas sitio.

Antes de entregar, lee la primera frase de cada creencia seguidas, y luego la ultima de cada una. Si se parecen, reescribelas.


NO SE LE INVENTA NADA DE SU VIDA

Ni su infancia, ni sus padres, ni una pareja, ni hijos, ni un trabajo, ni de donde le viene el dinero, ni un episodio que le paso. Si no esta escrito en lo que te paso, no existe.

Si nombras a alguien de su alrededor, esa persona tiene que estar en lo que te paso; y no le pongas sexo, ni parentesco, ni nombre que no le hayan puesto.

Y no lo arregles con un momento de los que le pasan a cualquiera: eso tambien es ponerle una vida que no sabes si tiene.

Y ninguna puede contradecir lo que sus rasgos dicen: si en ellos pone que se le da bien algo, no vale decirle que le cuesta.


COMO SE HABLA

Le hablas a ella de tu, como alguien que la conoce bien y se lo cuenta claro. Ni como un informe, ni como un libro, ni como una experta explicando.

- SE ENTIENDE A LA PRIMERA. Si una frase hay que releerla, esta mal escrita. Lo tiene que entender alguien de dieciocho años sin pararse.
- LAS PALABRAS SON LAS DE TODOS LOS DIAS. Si una palabra la verias antes en un informe que en una conversacion, fuera.
- NADA DE METAFORAS NI IMAGENES. Se dice la cosa, no una figura de la cosa. Si lo que escribes no se puede ver ocurriendo de verdad, esta mal escrito.
- LE PONES SUS FRASES ENTRECOMILLADAS: lo que se dice ella por dentro cuando le pasa eso.
- LE DAS LA RAZON ANTES DE CORREGIRLA. Nunca de frente.
- FRASES SUELTAS PARA REMATAR. Una linea corta, en su propio parrafo, cuando algo tiene que aterrizar.
- NI UNA PALABRA TECNICA: ningun planeta, ningun signo, ninguna casa, ningun aspecto. Su carta no se nombra, y no se dice tu informe ni tu estudio.
- NADA DE ANIMAR NI DE CONSEJOS DE LOS QUE SE LEEN EN CUALQUIER SITIO. Si lo que vas a escribir le vale igual a otra persona, no lo escribas.
- Español de España, hablado. Ni una palabra en otro idioma.
- Sin asteriscos, sin listas, sin simbolos, sin guiones de adorno y sin numerar nada. Fuera de la linea de la creencia y de los cuatro ladillos, todo va en texto corrido.

CUANTO OCUPA: lo que necesite para entenderse, ni una linea mas. Pero corto no es apretado: lo que sobra es repetir con otras palabras algo ya dicho; lo que no sobra es explicarse.


QUE ENTREGAS

Las creencias escritas y nada mas. Ni presentacion, ni titulo general, ni la lista de las que has elegido, ni explicacion de lo que has hecho, ni comentarios.

Empiezas directamente con la linea CREENCIA: de la primera. Acabas con el ultimo parrafo de la ultima, sin resumen, sin despedida y sin buscar la creencia que hay debajo de todas.`;

// ── PASO 4: los arranques que se repiten ────────────────────
//
// POR QUE NO BASTA CON PEDIRLO EN EL ENCARGO.
//
// Ya se le pide, y se lo salta. Escribiendo la sexta creencia no se acuerda de
// como empezo la segunda, asi que cae en el mismo molde una y otra vez: los
// bloques de "que parte es verdad" salieron los DOCE empezando igual.
//
// Comparar texto, en cambio, no falla nunca. Aqui se miran los primeros
// parrafos de cada ladillo, y si dos entran igual se le devuelven SOLO esas
// frases, sueltas y juntas. Ahi si las ve todas a la vez, que es justo lo que
// no puede hacer mientras escribe.
//
// SOLO SE LLAMA SI HAY REPETICION. Si no la hay, este paso no cuesta nada.
//
// Y ESTO NO SABE NADA DE CREENCIAS: sirve igual para cualquier otro punto del
// P2 que se escriba con ladillos.

const ARRANQUES = `Te paso unas frases sueltas y numeradas. Cada una abre un trozo de un mismo estudio, y todas empiezan igual: leidas seguidas se ve el molde y quien lee se las salta.

Reescribelas para que NINGUNA empiece como otra.

LO QUE DICE CADA UNA NO SE TOCA. Los mismos datos, lo mismo contado, sin añadir nada y sin quitar nada. Lo unico que cambia es por donde entra.

Y CAMBIA LA MANERA DE ENTRAR, no solo la primera palabra. Una puede entrar por lo que ella hace, otra por lo que se dice por dentro, otra por lo que evita, otra nombrando la cosa en seco, otra por lo que se le va en ello. Si todas entran igual aunque cambien las palabras, no has hecho nada.

Ninguna empieza repitiendo las palabras del titulo que lleva encima, si lo lleva.

Español de España, hablado, de tu a tu. Ni una palabra que no dirias en una conversacion.

QUE ENTREGAS: las mismas frases, con su mismo numero, una por linea y nada mas. Ni titulos, ni explicacion, ni comentarios.`;

// Las primeras palabras de una frase, sin tildes ni signos. Con tres basta: es
// donde se ve el molde, y con mas se escapan los que solo cambian la cuarta.
const PALABRAS_DE_ARRANQUE = 3;
const arranqueDe = t => pelado(t).split(' ').slice(0, PALABRAS_DE_ARRANQUE).join(' ');

// La primera frase de un parrafo. Si no hay punto, el parrafo entero.
const primeraFrase = p => (String(p).match(/^[^.!?]*[.!?]/) || [String(p)])[0].trim();

// Los primeros parrafos de cada ladillo, que son los que se comparan entre si.
// Se compara solo dentro del MISMO ladillo: que el bloque de la creencia y el
// de lo que le cuesta empiecen parecido no canta, porque van separados. Que
// los seis "que parte es verdad" empiecen igual, si.
function primerosParrafos(bloques) {
  const lista = [];
  for (const b of bloques) {
    let bajo = null;
    for (const parte of b.partes) {
      if (parte.ladillo) { bajo = parte.ladillo; continue; }
      if (bajo === null) continue;
      lista.push({ bajo, parte });
      bajo = null;
    }
  }
  return lista;
}

export function arranquesQueChocan(bloques) {
  const grupos = new Map();
  for (const p of primerosParrafos(bloques)) {
    const llave = `${p.bajo} | ${arranqueDe(primeraFrase(p.parte.parrafo))}`;
    if (!grupos.has(llave)) grupos.set(llave, []);
    grupos.get(llave).push(p.parte);
  }
  // Van todos los del grupo, no todos menos uno: si se le deja uno puesto, los
  // demas se le acaban pareciendo igualmente.
  return [...grupos.values()].filter(g => g.length > 1).flat();
}

async function desmoldarArranques(bloques) {
  const chocan = arranquesQueChocan(bloques);
  if (!chocan.length) return { arreglados: 0, uso: {} };

  const frases = chocan.map(parte => primeraFrase(parte.parrafo));
  const { texto, uso } = await pedir({
    sistema: ARRANQUES,
    mensaje: frases.map((f, i) => `${i + 1}. ${f}`).join('\n'),
    tope: 2000,
  });

  // Se lee lo que vuelve por su numero. Lo que no vuelva, o vuelva vacio, se
  // queda como estaba: un arranque repetido se lee peor, pero perder la frase
  // se lee muchisimo peor.
  const nuevas = new Map();
  for (const linea of String(texto).split('\n')) {
    const m = linea.trim().match(/^(\d{1,2})\s*[.)-]\s*(.+)$/);
    if (m) nuevas.set(Number(m[1]), m[2].trim());
  }

  let arreglados = 0;
  chocan.forEach((parte, i) => {
    const nueva = nuevas.get(i + 1);
    if (!nueva || nueva === frases[i]) return;
    parte.parrafo = nueva + parte.parrafo.slice(frases[i].length);
    arreglados++;
  });

  return { arreglados, uso };
}

// ── R2: leer un informe guardado ─────────────────────────────
function ajustes() {
  const cuenta = process.env.INFORME_P1_CLOUDFLARE_ACCOUNT_ID;
  const clave = process.env.INFORME_P1_CLOUDFLARE_ACCESS_KEY_ID;
  const secreto = process.env.INFORME_P1_CLOUDFLARE_SECRET_ACCESS_KEY;
  const bucket = process.env.INFORME_P1_CLOUDFLARE_BUCKET_NAME;
  if (!cuenta || !clave || !secreto || !bucket) return null;
  return { cuenta, clave, secreto, bucket };
}

function firmaDelDia(secreto, dia, region, servicio) {
  const a = crypto.createHmac('sha256', `AWS4${secreto}`).update(dia).digest();
  const b = crypto.createHmac('sha256', a).update(region).digest();
  const c = crypto.createHmac('sha256', b).update(servicio).digest();
  return crypto.createHmac('sha256', c).update('aws4_request').digest();
}

async function pedirR2(cfg, ruta, consulta = '') {
  const host = `${cfg.cuenta}.r2.cloudflarestorage.com`;
  const ahora = new Date();
  const dia = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const marca = ahora.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const ambito = `${dia}/auto/s3/aws4_request`;
  const vacio = crypto.createHash('sha256').update('').digest('hex');
  const cabeceras = `host:${host}\nx-amz-content-sha256:${vacio}\nx-amz-date:${marca}\n`;
  const firmadas = 'host;x-amz-content-sha256;x-amz-date';
  const uri = `/${cfg.bucket}${ruta}`;
  const peticion = ['GET', uri, consulta, cabeceras, firmadas, vacio].join('\n');
  const aFirmar = ['AWS4-HMAC-SHA256', marca, ambito,
    crypto.createHash('sha256').update(peticion).digest('hex')].join('\n');
  const firma = crypto.createHmac('sha256', firmaDelDia(cfg.secreto, dia, 'auto', 's3'))
    .update(aFirmar).digest('hex');

  const resp = await fetch(`https://${host}${uri}${consulta ? '?' + consulta : ''}`, {
    signal: AbortSignal.timeout(15000),
    headers: {
      'x-amz-content-sha256': vacio,
      'x-amz-date': marca,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${cfg.clave}/${ambito}, SignedHeaders=${firmadas}, Signature=${firma}`,
    },
  });
  if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return resp.text();
}

// Los informes guardados, del mas nuevo al mas viejo, con el nombre de cada
// uno para poder elegir de quien se prueba. Solo se abren los diez ultimos:
// abrir cada fichero es una peticion, y en la prueba no hacen falta mas.
async function informesGuardados(cfg) {
  // La consulta va firmada tal cual, y AWS exige que dentro de un valor la
  // barra vaya escrita como %2F. Sin eso la firma no cuadra y R2 responde 403.
  const xml = await pedirR2(cfg, '/', 'list-type=2&prefix=p1%2F');
  const claves = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map(m => m[1]);
  const fechas = [...xml.matchAll(/<LastModified>([^<]+)<\/LastModified>/g)].map(m => m[1]);
  const todos = claves
    .map((clave, i) => ({ clave, fecha: fechas[i] || '' }))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .slice(0, 10);

  // Si un informe no se puede abrir, se lista igual sin nombre: mejor eso que
  // quedarse sin lista entera por uno malo.
  return Promise.all(todos.map(async item => {
    try {
      const info = JSON.parse(await pedirR2(cfg, `/${item.clave}`));
      return { ...item, nombre: (info.cliente?.nombre || '').split(/\s+/)[0] || '' };
    } catch {
      return { ...item, nombre: '' };
    }
  }));
}

// ── Las dos llamadas al modelo ──────────────────────────────
async function pedir({ sistema, mensaje, tope }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(180000),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      thinking: { type: 'disabled' },
      max_tokens: tope,
      system: sistema,
      messages: [{ role: 'user', content: mensaje }],
    }),
  });
  if (!resp.ok) throw new Error(`Modelo ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  return { texto: data.content?.[0]?.text || '', uso: data.usage || {} };
}

async function escribirCreencias(informe, respuestas) {
  const rasgo = r => `- ${r.nombre}: ${r.descripcion}${r.causa ? ` (por que le pasa: ${r.causa})` : ''}`;
  const f = (informe.rasgos?.fortalezas || []).map(rasgo).join('\n');
  const d = (informe.rasgos?.desafios || []).map(rasgo).join('\n');

  const quien = `Nombre de pila: ${(informe.cliente?.nombre || '').split(/\s+/)[0]}\nSexo: ${informe.cliente?.sexo || ''}`;

  // SOLO LOS RASGOS. Las siete areas del P1 no entran: son treinta mil
  // caracteres que no aportan una creencia que no este ya en los rasgos, y con
  // todo eso delante cada creencia parece justificada por su lado y acaban
  // repitiendose. Fuera, tarda menos, cuesta menos y se repite menos.
  const rasgos =
    `SUS RASGOS, LOS QUE SE LE DIJO QUE SE LE DAN BIEN:\n${f}\n\n` +
    `SUS RASGOS, LOS QUE SE LE DIJO QUE LE CUESTAN:\n${d}`;

  const contestado = `LO QUE ELLA HA CONTESTADO HOY:\n\n` +
    respuestas.map((r, i) => `${PREGUNTAS[i]}\n${r}`).join('\n\n');

  // Una sola llamada: elige, descarta las repetidas y las escribe.
  //
  // El tiempo lo marca lo que escribe, no lo que piensa: unas 75
  // palabras-token por segundo. Con 8000 este paso no puede pasar de dos
  // minutos, y la funcion se corta a los cinco. Seis creencias de cuatro
  // bloques son unas 5500.
  const una = await pedir({
    sistema: CREENCIAS,
    mensaje: `${quien}\n\n${rasgos}\n\n────────────────\n\n${contestado}\n\nEscribe sus creencias.`,
    tope: 8000,
  });
  if (!una.texto.trim()) throw new Error('No ha devuelto ninguna creencia');

  // Y despues, los trozos que entran igual que otro, reescritos por su
  // arranque. Solo llama al modelo si de verdad hay alguno.
  const bloques = repartir(una.texto);
  const dos = await desmoldarArranques(bloques);

  const suma = k => [una.uso, dos.uso].reduce((t, u) => t + (u[k] || 0), 0);
  return {
    bloques,
    rasgos,
    desmoldados: dos.arreglados,
    uso: { dentro: suma('input_tokens'), fuera: suma('output_tokens') },
  };
}

// ── La pagina ───────────────────────────────────────────
// El encargo prohibe los asteriscos, pero si alguno se cuela se veria tal
// cual en la pagina y parece un fallo. Se quitan al pintar.
const escapar = t => String(t)
  .replace(/\*\*?/g, '')
  .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function pagina(cuerpo) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Prueba — creencias</title>
<style>
 body{margin:0;background:#fffbef;color:#1d2b2f;font:17px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
 main{max-width:44rem;margin:0 auto;padding:3rem 1.5rem 6rem}
 .aviso{font-size:.8rem;color:#8a8578;border-bottom:1px solid #e7e0d0;padding-bottom:1rem;margin-bottom:2.5rem}
 h1{font-size:1.55rem;color:#0e3f4b;margin:0 0 1.6rem;line-height:1.25;font-weight:700}
 h2{font-size:1rem;color:#bd9048;margin:2.2rem 0 .8rem;line-height:1.3;font-weight:700}
 .creencia{padding:2.5rem 0 2rem;border-top:1px solid #e0d8c6}
 .creencia:first-of-type{border-top:0;padding-top:0}
 p{margin:0 0 1.1rem}
 label{display:block;font-size:.95rem;font-weight:600;color:#0e3f4b;margin:2rem 0 .5rem}
 textarea,input,select{width:100%;box-sizing:border-box;font:inherit;font-size:.95rem;padding:.7rem;
   border:1px solid #d8d0bd;border-radius:6px;background:#fff;color:inherit}
 textarea{min-height:8rem;resize:vertical}
 button{margin-top:2rem;background:#0e3f4b;color:#fffbef;border:0;border-radius:6px;
   padding:.9rem 1.6rem;font:inherit;font-weight:700;cursor:pointer}
 details{margin:0 0 2rem;font-size:.85rem;color:#6d675c}
 pre{white-space:pre-wrap;font:inherit;font-size:.85rem;background:#f5efdf;padding:1rem;border-radius:6px}
 .err{background:#fff0ee;border-left:3px solid #c0392b;padding:1rem 1.2rem;white-space:pre-wrap;font-size:.9rem}
</style></head><body><main>${cuerpo}</main></body></html>`;
}

function formulario(datos = {}, aviso = '', informes = []) {
  const campo = (i) => `<label>${escapar(PREGUNTAS[i])}</label>
    <textarea name="r${i + 1}" required>${escapar(datos[`r${i + 1}`] || '')}</textarea>`;

  const opcion = ({ clave, nombre, fecha }) => {
    const dia = (fecha || '').slice(0, 10).split('-').reverse().join('/');
    const quien = nombre || clave.replace(/^p1\//, '').slice(0, 18);
    return `<option value="${escapar(clave)}"${datos.informe === clave ? ' selected' : ''}
      >${escapar(quien)}${dia ? ' — ' + dia : ''}</option>`;
  };

  const elegir = informes.length
    ? `<label>De quien se prueba</label>
       <select name="informe">${informes.map(opcion).join('')}</select>`
    : `<label>Compra del informe P1</label>
       <input name="informe" value="${escapar(datos.informe || '')}" placeholder="p1/cs_live_...">`;

  return pagina(`${aviso}
    <div class="aviso">PRUEBA — lo que pegues aqui no se guarda en ningun sitio.
      Cada envio es una llamada al modelo, y una segunda corta solo si hay arranques repetidos.</div>
    <form method="POST">
      ${elegir}
      ${campo(0)}${campo(1)}${campo(2)}
      <button type="submit">Escribir sus creencias</button>
    </form>`);
}

// El cuerpo de un formulario llega como texto: nombre=valor separados por &,
// con los espacios como + y lo demas en %XX.
function leerFormulario(txt) {
  const datos = {};
  for (const par of String(txt || '').split('&')) {
    if (!par) continue;
    const i = par.indexOf('=');
    const k = decodeURIComponent((i < 0 ? par : par.slice(0, i)).replace(/\+/g, ' '));
    const v = i < 0 ? '' : decodeURIComponent(par.slice(i + 1).replace(/\+/g, ' '));
    datos[k] = v;
  }
  return datos;
}

async function cuerpoDe(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return leerFormulario(req.body);
  let txt = '';
  for await (const trozo of req) txt += trozo;
  return leerFormulario(txt);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const cfg = ajustes();

  // La lista de informes se saca para pintar el desplegable. Si no se puede,
  // el formulario sale igual con una casilla donde escribir la ruta a mano.
  const listar = async () => {
    try { return cfg ? await informesGuardados(cfg) : []; } catch { return []; }
  };

  if (req.method !== 'POST') {
    return res.status(200).send(formulario({}, '', await listar()));
  }

  let datos = {};
  try {
    datos = await cuerpoDe(req);
    const respuestas = [datos.r1, datos.r2, datos.r3].map(t => String(t || '').trim());
    if (respuestas.some(t => !t)) {
      return res.status(200).send(formulario(datos,
        '<div class="err">Faltan respuestas: hacen falta las tres.</div>', await listar()));
    }

    if (!cfg) throw new Error('Faltan las variables INFORME_P1_CLOUDFLARE_*');
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta ANTHROPIC_API_KEY');

    // Solo se admite lo que hay guardado del P1: la ruta llega del propio
    // desplegable, pero se filtra igual para que nadie pueda pedir otra cosa.
    const clave = String(datos.informe || '').trim();
    if (!/^p1\/[A-Za-z0-9_-]+\.json$/.test(clave)) throw new Error('Elige de quien se prueba');
    const informe = JSON.parse(await pedirR2(cfg, `/${clave}`));

    const t0 = Date.now();
    const { bloques, rasgos, desmoldados, uso } =
      await escribirCreencias(informe, respuestas);
    const seg = ((Date.now() - t0) / 1000).toFixed(0);

    const creencias = bloques.map(b => `<section class="creencia">
      ${b.titulo ? `<h1>${escapar(b.titulo)}</h1>` : ''}
      ${b.partes.map(p => p.ladillo
        ? `<h2>${escapar(p.ladillo)}</h2>`
        : `<p>${escapar(p.parrafo)}</p>`).join('\n')}
    </section>`).join('\n');

    return res.status(200).send(pagina(
      `<div class="aviso">PRUEBA — informe ${escapar(clave)} · ${seg}s ·
        ${uso.dentro} dentro / ${uso.fuera} fuera ·
        ${desmoldados ? `${desmoldados} arranques repetidos, reescritos` : 'ningun arranque repetido'}</div>
       <details><summary>Chuleta: el material con el que ha escrito</summary>
         <pre>${escapar(rasgos)}</pre>
       </details>
       ${creencias}`));

  } catch (err) {
    return res.status(200).send(formulario(datos,
      `<div class="err">No se pudo: ${escapar(err.message)}</div>`, await listar()));
  }
}
