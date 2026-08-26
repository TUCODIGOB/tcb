import Stripe from 'stripe';
import { MAX_INTENTOS, estado, reservar, liberar, compraValida } from '../lib/reserva.js';
import { analizarArea, revisarBloques, avisosBloques, montarArea, negritasDe } from '../lib/bloques.js';
import { quitarComaAntesDeY, vecesQueLaLlamaPorSuNombre } from '../lib/estilo.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Separador entre las 7 areas del informe. Tiene que ser algo que el modelo
// no pueda escribir nunca; ver la nota donde se usa.
const SEPARADOR_AREAS = '\u001F';

// ══════════════════════════════════════════════════════════════════
// CADA BLOQUE DEL AREA, EN SU CASILLA
//
// El prompt le pide seis bloques en cada area: el arranque, HOY, ORIGEN,
// CREENCIAS, SOLTAR y el CIERRE. La escena y el cierre ya tenian casilla
// propia y no han faltado NUNCA. Los otros iban todos revueltos dentro de una
// sola casilla, "parrafos", y ahi dentro no habia forma de saber si habia
// escrito los cuatro o dos.
//
// En el informe del 23 de agosto faltaba ORIGEN —"de donde te viene esto"— en
// CUATRO de las siete areas. Son las palabras que mas valor le dan y nadie lo
// comprobaba. De ahi salian las dos quejas a la vez: el area se lee corta y
// cuenta una sola idea.
//
// Aqui cada bloque pasa a tener su casilla, igual que la escena y el cierre.
// Van todas en "required" y con al menos un parrafo dentro, asi que la API no
// deja terminar la respuesta sin ellas.
//
// LO QUE NO SE PUEDE HACER, Y COSTO UN INFORME CAIDO EL 24 DE AGOSTO:
// obligar tambien al NUMERO de parrafos de cada bloque. Se intento dandole a
// cada bloque huecos numerados (p1, p2, p3...), unos obligatorios y otros no,
// y la API lo rechazo de entrada con un 400: "the compiled grammar is too
// large, simplify your tool schemas". Diecisiete casillas sueltas, y las
// opcionales multiplicando las combinaciones, es mas de lo que admite. Aqui
// cada bloque es UNA lista, que es lo mismo que ya funcionaba, solo que ahora
// hay cinco en vez de una. Cuantos parrafos van dentro lo sigue pidiendo el
// prompt.
//
// Y minItems tampoco sirve para eso: esta API solo admite minItems 0 y 1.
// El 1 si vale, y es justo lo que hace falta: que el bloque no llegue vacio.
// ══════════════════════════════════════════════════════════════════

const PARRAFO_DEL_AREA = {
  type: 'object',
  properties: {
    ladillo: { type: ['string', 'null'], description: 'Ladillo de tres a cinco palabras que va ENCIMA de este parrafo, o null si este parrafo no lleva.' },
    texto: { type: 'string', description: 'El texto del parrafo. Aqui, y solo aqui, van las negritas del area, marcadas con dos asteriscos a cada lado: **asi**. Se marca la frase o la media frase que ella subrayaria con un fosforito, nunca una palabra suelta.' },
  },
  required: ['ladillo', 'texto'],
  additionalProperties: false,
};

function bloqueDelArea(description) {
  return { type: 'array', description, minItems: 1, items: PARRAFO_DEL_AREA };
}

// Las cuatro casillas grandes dicen detras de QUE BLOQUE se leen, no detras de
// que numero de parrafo: el modelo ya no escribe una lista sola, asi que no
// puede saber que numero le va a tocar a cada parrafo. Y de paso desaparece el
// fallo que el propio prompt llama "lo que mas se falla".
// SOLTAR no esta en la lista a proposito: detras de SOLTAR solo va el cierre.
const BLOQUES_DONDE_CABEN = ['arranque', 'hoy', 'origen', 'creencias'];
function casillaGrande(description) {
  return {
    type: 'object',
    description,
    properties: {
      tras_bloque: { type: 'string', enum: BLOQUES_DONDE_CABEN, description: 'Detras de que bloque se lee.' },
      texto: { type: 'string' },
    },
    required: ['tras_bloque', 'texto'],
    additionalProperties: false,
  };
}

// Los cinco bloques van DENTRO de una sola casilla, no sueltos.
//
// No es por orden: es lo que separa este esquema del que la API rechazo. Lo
// que le cuesta a la API es la combinatoria de casillas dentro de un mismo
// sitio, y el intento del 24 de agosto dejaba diez en el primer nivel ademas
// de diecisiete huecos numerados por debajo. Metiendo los bloques en una, el
// primer nivel se queda en SEIS, exactamente las mismas que tiene el esquema
// que lleva funcionando desde el principio: el texto, la escena, los dos
// remates, la pregunta y el cierre. Lo unico que cambia de verdad es que la
// casilla del texto, que era una lista, ahora son cinco listas con nombre.
const ESQUEMA_AREA_POR_BLOQUES = {
  type: 'object',
  properties: {
    bloques: {
      type: 'object',
      description: 'El texto del area, repartido por bloques. Los cinco van escritos SIEMPRE.',
      properties: {
        arranque: bloqueDelArea('EL ARRANQUE del area: abre ancho, desde algo que le pasa a mucha gente, y solo entonces se estrecha hasta ella.'),
        hoy: bloqueDelArea('El bloque HOY: como se manifiesta ahora, lo malo Y lo bueno, con el don contado a fondo. Es el bloque mas largo del area.'),
        origen: bloqueDelArea('El bloque ORIGEN: por que es asi y de donde le viene, uniendo el porque con lo que hace hoy como causa y efecto. Viene de como esta hecha desde que nacio, NUNCA de un pasado que se le invente. UNA sola explicacion, desarrollada a fondo.'),
        creencias: bloqueDelArea('El bloque CREENCIAS: lo que da por cierto sin haberlo puesto en duda y que hace que todo se repita solo. Aqui va la verdad incomoda. Despues de HOY, el que mas sitio ocupa.'),
        soltar: bloqueDelArea('El bloque SOLTAR: solo NOMBRA la creencia que tiene que caer. Ni pasos, ni ejercicios, ni plan. Es el bloque mas corto de todos.'),
      },
      required: ['arranque', 'hoy', 'origen', 'creencias', 'soltar'],
      additionalProperties: false,
    },
    escena: casillaGrande('La escena concreta y visual. Obligatoria.'),
    remate_herida: casillaGrande('La frase que nombra lo que le duele, sin anestesia. Va sola y grande.'),
    remate_fuerza: casillaGrande('La frase que nombra lo que tiene de raro y valioso, con la misma fuerza.'),
    pregunta: casillaGrande('La pregunta directa que le hace parar y pensar. Obligatoria.'),
    cierre: { type: 'string', description: 'El ultimo parrafo del area. Revela algo nuevo y no presenta la siguiente area.' },
  },
  required: ['bloques', 'escena', 'remate_herida', 'remate_fuerza', 'pregunta', 'cierre'],
  additionalProperties: false,
};

// ══════════════════════════════════════════════════════════════════
// LA VOZ, QUE ES LA MISMA EN TODO EL ESTUDIO
// ══════════════════════════════════════════════════════════════════
//
// Estas reglas estaban solo dentro del prompt de las areas. La lista de
// rasgos tenia las suyas, cuatro lineas escritas aparte, y por eso sonaba a
// otra persona: mismo informe, misma clienta, y de repente un tono distinto
// en la ultima pagina.
//
// Aqui estan escritas UNA vez y las usan las dos. El prompt de las areas no
// cambia ni una letra: lo unico que se ha hecho es sacar el texto a una
// constante y volver a meterlo donde estaba. Lo comprueba test/rasgos.test.mjs
// letra por letra, porque tocar ese prompt sin querer seria romper el
// producto entero.
//
// No esta todo el prompt de las areas, solo lo que vale para las dos cosas.
// Lo que habla de parrafos, de negritas, de la escena o de las 900 palabras
// no pinta nada en una lista de fichas cortas.

const ESPANOL_DE_ESPANA = `IMPORTANTE: Escribe siempre en español de España. Nunca uses voseo ni expresiones latinoamericanas. Usa tú, no vos.`;

const SIN_NOMBRAR_PLANETAS = `No uses nombres de planetas ni casas astrológicas. Pero SÍ tienes que apoyarte en ellos: la casa de cada planeta dice en qué parcela concreta de la vida se nota (trabajo, pareja, dinero, familia, cuerpo, amigos, casa, estudios), y los aspectos dicen qué partes de la persona chocan entre sí y cuáles se apoyan. Traduce eso a situaciones reales de su vida, sin nombrarlo nunca. Un texto escrito solo con el signo de cada planeta le vale igual a una de cada doce personas, y se nota al leerlo`;

const FRASES_QUE_SUENAN_HABLADAS = `CADA FRASE TIENE QUE SONAR COMO HABLA UNA PERSONA DE VERDAD. Antes de dar una frase por buena, léela en voz alta por dentro: si nadie la diría hablando, está mal y se reescribe. No fuerces la gramática para que suene elaborado, y no cojas un verbo raro cuando el normal dice lo mismo. Lo que suena a literatura no emociona, distrae: el lector tropieza, sale del texto y deja de reconocerse.
- MAL: "el cariño que no te has ganado con algo no termina de ser de fiar" (construcción retorcida, hay que releerla). BIEN: "del cariño que llega gratis no te puedes fiar".
- MAL: "enseñar que algo te ha dolido" (verbo forzado). BIEN: "dejar ver que algo te ha dolido".`;

const DEFECTOS_DESDE_LA_FUERZA = `LOS DEFECTOS SE CUENTAN DESDE LA FUERZA QUE LOS ORIGINA, NUNCA CONTRA ELLA. Esto NO es suavizar ni maquillar: el defecto se nombra entero, con su nombre y sin rebajarlo. Lo que cambia es de dónde lo haces salir. Y no vale poner la virtud y el defecto uno al lado del otro como si fueran dos cosas distintas ("eres muy exigente contigo, pero también tienes buen criterio"), porque no son dos cosas: son la misma cualidad, solo que pasada de vueltas ("ese criterio tuyo, pasado de vueltas, es lo que te machaca"). Contado así lo reconoce y no se defiende. Contado como una lista de fallos sueltos, cierra el informe y no vuelve.`;

const COMA_ANTES_DE_Y = `CUIDADO CON LA COMA ANTES DE "Y". La mayoría de las veces sobra: se escribe "quiero plátanos, peras y fresas", no "quiero plátanos, peras, y fresas". Solo se pone cuando de verdad hace falta, cuando lo que va detrás de la "y" es otra frase distinta con su propio sujeto. Ante la duda, quítala.`;

const TODO_DE_TU = `TODO SE LE ESCRIBE A ELLA, DE TÚ, DE LA PRIMERA PALABRA A LA ÚLTIMA. Nunca se habla de ella desde fuera: ni "ella", ni "la que", ni un verbo en tercera persona referido a ella. Se escribe "lo que se te rompió", no "lo que se le rompió"; "cuando te callas", no "cuando se calla"; "vas a descubrir", no "va a descubrir".`;

// La segunda mitad de la misma regla: por que romperla lo estropea todo.
const HABLAR_DE_ELLA_LO_ROMPE = `En cuanto una frase habla de ella en tercera persona, el lector deja de ser el destinatario y pasa a ser un tercero que está oyendo cómo la comentan. Da igual lo buena que sea la frase: ahí se rompe todo lo anterior. Si al releer encuentras una sola, se reescribe en segunda persona.`;

const PERDONA_ANTES_DE_NOMBRAR = `PERDONA ANTES DE NOMBRAR:
Nadie baja la guardia delante de quien le está haciendo una lista de defectos. Antes de nombrar lo que le pesa, se le quita la culpa de encima, y solo entonces se le cuenta.
Por dentro la forma es siempre la misma: eso que haces no es un defecto tuyo, es lo que te ha servido para que las cosas salieran bien, y te funcionó, por eso sigues haciéndolo. Las palabras las pones tú y cambian en cada área.
Sin ese permiso lee a la defensiva y no le entra nada. Con él, se abre, y a partir de ahí le puedes decir cualquier cosa.`;

// ══════════════════════════════════════════════════════════════════
// RASGOS: CARACTERISTICAS EXTRAIDAS DE LA CARTA NATAL
// ══════════════════════════════════════════════════════════════════
//
// LA FICHA ES TRES COSAS Y NADA MAS: NOMBRE, DOS FRASES Y AREA.
//
// Las listas mandan: salen ANTES que las siete areas, porque cada area
// desarrolla los rasgos que le tocan y sin listas no sabe cuales son. Todo el
// informe espera por esta llamada, asi que lo que se le pide es exactamente lo
// que se imprime y lo que las areas necesitan, sin una casilla de mas.
//
// Hubo una cuarta, la explicacion: un porque de 30-60 palabras que se pedia en
// una segunda llamada. Se ha quitado. De donde le viene cada cosa ya se cuenta
// entero en su area, que son cuatro paginas para eso, y repetirlo en la ficha
// era decir dos veces lo mismo y en peor: dos frases no explican nada que las
// areas no hayan explicado ya.

const RASGO = {
  type: 'object',
  properties: {
    nombre: { type: 'string', description: 'El titulo de la ficha, corto, de tres a ocho palabras, diciendo lo que ella hace o lo que le pasa. Nunca una etiqueta. Ej: "Ves lo que le falta a la gente", "Te cuesta pedir ayuda".' },
    descripcion: { type: 'string', description: 'Dos lineas contandole eso mismo con detalle, escritas a ella y como se dice hablando. Van seguidas y unidas con comas, nunca partidas en dos frases con un punto en medio, y acaban en punto. Con tildes y enes, que es un texto que se imprime. Ej, para el titulo "Ves lo que le falta a la gente": "Notas lo que le hace falta a alguien antes de que lo pida y te pones a resolverlo sin esperar a que nadie te lo diga, muchas veces antes de que esa persona se haya dado cuenta."' },
    area: { type: 'number', enum: [1, 2, 3, 4, 5, 6, 7], description: 'A cual de las siete areas corresponde este rasgo (1=Identidad, 2=Patrones, 3=Miedos, 4=Herida, 5=Amor, 6=Relaciones, 7=Dinero).' },
  },
  required: ['nombre', 'descripcion', 'area'],
  additionalProperties: false,
};

// EL MINIMO DE RASGOS QUE LLEVA CADA AREA.
//
// Las listas son la fuente: de ellas salen los rasgos y a cada uno le toca su
// area, y despues esa area desarrolla LOS SUYOS y nada mas. Si de un area
// sale uno solo, esa area se pasa cuatro paginas dando vueltas a una cosa, que
// es exactamente lo que las listas vienen a arreglar. Dos es el suelo.
//
// Maximo no hay: si de un area salen seis, el area cuenta seis. Lo que dice la
// carta manda, y lo que no vale es rellenar para cuadrar.
const MINIMO_POR_AREA = 2;

// Los nombres de las siete, en un solo sitio: se usan al pedir la lista, al
// avisar de lo que le falta y al decirle a cada area cuales son los suyos.
const NOMBRE_DEL_AREA = {
  1: 'IDENTIDAD', 2: 'PATRONES', 3: 'MIEDOS', 4: 'HERIDA',
  5: 'AMOR', 6: 'RELACIONES', 7: 'DINERO',
};

// CUANTOS RASGOS SE PIDEN, Y POR QUE NO LO DICE EL ESQUEMA.
//
// El numero se pide en el prompt, no aqui. Esta API solo admite minItems 0 y
// 1, como ya esta apuntado arriba en el esquema del area: un minItems: 10
// no lo rechaza el modelo, lo rechaza la API de entrada con un 400 y la
// lista no llega nunca. Lo unico que el esquema puede garantizar es que la
// lista no venga vacia, y eso es lo que hace el minItems: 1.
//
// Y va con horquilla, no "los que salgan". Pidiendo sin tope, el modelo
// escribia mas de lo que le cabia en la respuesta y llegaba cortada a mitad
// de una frase: ver TOPE_RASGOS aqui debajo. Pero un numero fijo tampoco
// vale: doce y doce clavados no es lo que da una carta, es una cuota, y para
// llegar a ella el modelo rellena. La horquilla le deja sacar lo que haya.
//
// Las dos listas NO tienen que medir lo mismo. Nadie tiene exactamente
// tantas cosas buenas como malas, y dos listas del mismo largo se leen a
// reparto hecho a ojo.
const RASGOS_MINIMO = 12;
const RASGOS_MAXIMO = 18;

// El hueco para escribir la respuesta. No llega ni de lejos: las treinta y
// seis fichas enteras, con su nombre, sus dos frases y su area, son menos de
// 7.000 caracteres de JSON y no pasan de 2.500 tokens.
// Se deja de sobra a proposito: el tope no se paga, se paga lo que el modelo
// escriba, y quedarse corto cuesta la lista entera, que es lo que paso con el
// de 3.000.
const TOPE_RASGOS = 12000;

const ESQUEMA_RASGOS = {
  type: 'object',
  properties: {
    fortalezas: {
      type: 'array',
      minItems: 1,
      items: RASGO,
      description: `Las fortalezas, dones y habilidades que mas claras se ven en la carta. Entre ${RASGOS_MINIMO} y ${RASGOS_MAXIMO}.`
    },
    desafios: {
      type: 'array',
      minItems: 1,
      items: RASGO,
      description: `Los desafios, dificultades y areas de crecimiento que mas claros se ven en la carta. Entre ${RASGOS_MINIMO} y ${RASGOS_MAXIMO}.`
    },
  },
  required: ['fortalezas', 'desafios'],
  additionalProperties: false,
};

// EL ORDEN EN QUE SE LEEN LOS BLOQUES, Y LO PONE EL CODIGO.
//
// Antes cada area llevaba su propia secuencia escrita en el prompt. Ya no puede
// ser: el modelo escribe los bloques en el orden en que estan las casillas, y
// si el orden de lectura fuera otro estaria escribiendo el enganche de un
// bloque que todavia no ha escrito. Asi escribe siempre hacia delante, que es
// como se lee. El orden es el que el propio prompt llama la logica de siempre:
// que te pasa, de donde viene, que creencia lo sostiene, que se cae.
//
// La variedad entre areas no se pierde: sigue estando en donde caen la escena,
// los dos remates y la pregunta, que es lo que el lector nota.
const ORDEN_DE_LOS_BLOQUES = ['arranque', 'hoy', 'origen', 'creencias', 'soltar'];

// Junta los cinco bloques en la lista de parrafos que espera todo lo de abajo,
// y traduce el "tras_bloque" de las casillas grandes al numero de parrafo de
// siempre. Devuelve los bloques que han llegado sin una sola palabra, que es lo
// unico que la API no puede garantizar.
function bloquesAParrafos(datos) {
  const parrafos = [];
  const dondeAcabaCadaBloque = {};
  const vacios = [];

  for (const nombre of ORDEN_DE_LOS_BLOQUES) {
    const bloque = datos && datos.bloques && datos.bloques[nombre];
    let puestos = 0;
    for (const p of (Array.isArray(bloque) ? bloque : [])) {
      const texto = p && typeof p.texto === 'string' ? p.texto.trim() : '';
      if (!texto) continue;
      const ladillo = p && typeof p.ladillo === 'string' && p.ladillo.trim() ? p.ladillo.trim() : null;
      parrafos.push({ ladillo, texto });
      puestos++;
    }
    if (puestos === 0) vacios.push(nombre);
    // Contando desde 1, que es como cuenta tras_parrafo. Un bloque vacio se
    // queda donde acabo el anterior, asi lo que fuera detras no se descoloca.
    dondeAcabaCadaBloque[nombre] = parrafos.length;
  }

  datos.parrafos = parrafos;

  for (const casilla of ['escena', 'remate_herida', 'remate_fuerza', 'pregunta']) {
    const d = datos && datos[casilla];
    if (!d || typeof d !== 'object') continue;
    const acaba = dondeAcabaCadaBloque[d.tras_bloque];
    const { tras_bloque, ...resto } = d;
    // Sin bloque valido se va al primer parrafo, que es lo que hacia montarArea
    // con un numero que no entendia.
    datos[casilla] = { ...resto, tras_parrafo: acaba > 0 ? acaba : 1 };
  }

  return vacios;
}

// ══════════════════════════════════════════════════════════════════
// QUE NO REPITA, Y QUE ESO NO SEA UN DESEO SINO UNA COMPROBACION
// ══════════════════════════════════════════════════════════════════
//
// El prompt pide que no repita. Pedirlo no es garantizarlo: las siete areas
// tienen toda una maquinaria que las lee y las manda a repasar, y la lista no
// tenia ninguna. Salia lo que saliera.
//
// Y aqui repetir hace mas daño que en ningun otro sitio. Un area repetitiva se
// nota a medias porque son cuatro paginas de texto corrido; treinta fichas
// cortas puestas en columna se leen de un vistazo, y dos que dicen lo mismo
// saltan a la cara. Una lista con repetidos vale menos que no tenerla.
//
// LO QUE ESTO PILLA Y LO QUE NO. Pilla el mismo nombre escrito dos veces y
// pilla lo mismo dicho con palabras parecidas, que es como repite un modelo
// cuando le has pedido mas fichas de las que da la carta. NO pilla lo mismo
// dicho con palabras completamente distintas ("Miedo al abandono" y "Terror a
// que la dejen"): eso no hay manera de verlo contando palabras, y de eso se
// encargan el prompt, que lo pide con ese ejemplo delante, y el repaso.

// DOS CONTADORES DISTINTOS, IGUAL QUE EN LAS AREAS.
//
// Una cosa es que la llamada se caiga (la red, la API saturada, un error del
// servidor) y otra que llegue floja (corta o con repetidos). Antes se contaban
// juntos y con dos: un solo hipo de red y el estudio salia sin lista, que es
// justo lo que no puede pasar. Las siete areas llevan desde siempre tres
// intentos para lo primero y un repaso para lo segundo; la lista ahora igual.
//
// Y no alarga el estudio: la lista se pide a la vez que las areas y termina
// mucho antes, asi que los reintentos caben dentro de lo que las areas tardan
// de todas formas.
const INTENTOS_DE_LA_LISTA = 3;
const REPASOS_DE_LA_LISTA = 1;

const listaVacia = () => ({ fortalezas: [], desafios: [] });

// Palabras que aparecen en cualquier frase y no dicen de que va el rasgo.
//
// Van por la misma poda que las del texto, y no escritas a mano tal cual: si
// no, la mitad no servian para nada. "veces" se poda a "vece" y "menos" a
// "meno", asi que puestas enteras aqui no coincidian NUNCA con lo que se
// comparaba. Las de tres letras se han quitado: el filtro de longitud las tira
// antes de llegar hasta aqui.
const PALABRAS_QUE_NO_CUENTAN = new Set([
  'para', 'como', 'pero', 'porque', 'aunque', 'cuando', 'donde', 'entre',
  'hasta', 'desde', 'antes', 'despues', 'sobre', 'todo', 'toda', 'todos',
  'todas', 'cada', 'algo', 'nada', 'nadie', 'siempre', 'nunca', 'este',
  'esta', 'esto', 'estos', 'estas', 'otro', 'otra', 'otros', 'otras',
  'mismo', 'misma', 'menos', 'tener', 'tienes', 'tiene', 'hacer', 'haces',
  'hace', 'eres', 'estar', 'poder', 'puedes', 'puede', 'vida', 'gente',
  'cosas', 'cosa', 'veces', 'anos', 'demas', 'propio', 'propia', 'sino',
  'solo', 'esos', 'esas',
].map(raizDePalabra));

// Sin tildes, en minusculas, sin la "s" del plural y cortada a siete letras.
// Es una poda basta a proposito: lo que tiene que juntar es "captas" con
// "capta" y "miedos" con "miedo", que es como se repite de verdad una lista.
function raizDePalabra(p) {
  const limpia = p.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const sinPlural = limpia.length > 4 && limpia.endsWith('s') ? limpia.slice(0, -1) : limpia;
  return sinPlural.slice(0, 7);
}

function palabrasDelRasgo(rasgo) {
  return new Set(
    `${rasgo.nombre} ${rasgo.descripcion}`
      .split(/[^\p{L}\p{N}]+/u)
      .filter(p => p.length >= 4)
      .map(raizDePalabra)
      .filter(p => !PALABRAS_QUE_NO_CUENTAN.has(p))
  );
}

// Cuanto tienen que compartir dos fichas para que sean la misma. Se mide
// contra la mas corta de las dos: si una ficha entera cabe dentro de otra,
// es la misma aunque la otra diga ademas alguna cosa.
const PARECIDO_QUE_YA_ES_REPETIR = 0.6;

function dicenLoMismo(a, b) {
  const nombreA = raizDeFrase(a.nombre), nombreB = raizDeFrase(b.nombre);
  if (nombreA && nombreA === nombreB) return true;
  const pa = palabrasDelRasgo(a), pb = palabrasDelRasgo(b);
  if (pa.size === 0 || pb.size === 0) return false;
  let comunes = 0;
  for (const p of pa) if (pb.has(p)) comunes++;
  return comunes / Math.min(pa.size, pb.size) >= PARECIDO_QUE_YA_ES_REPETIR;
}

function raizDeFrase(txt) {
  return String(txt || '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(p => p.length >= 4)
    .map(raizDePalabra)
    .join(' ')
    .trim();
}

// Las dos listas se miran JUNTAS: el mismo rasgo en fortalezas y en desafios
// es el peor repetido de todos, porque ademas se contradice.
function todosLosRasgos(lista) {
  return [
    ...lista.fortalezas.map(r => ({ r, en: 'fortalezas' })),
    ...lista.desafios.map(r => ({ r, en: 'desafios' })),
  ];
}

// Devuelve las parejas que dicen lo mismo, cada una una sola vez.
function losQueSeRepiten(lista) {
  const todos = todosLosRasgos(lista);
  const parejas = [];
  const yaCaido = new Set();
  for (let i = 0; i < todos.length; i++) {
    if (yaCaido.has(i)) continue;
    for (let j = i + 1; j < todos.length; j++) {
      if (yaCaido.has(j)) continue;
      if (dicenLoMismo(todos[i].r, todos[j].r)) {
        parejas.push({ se_queda: todos[i], sobra: todos[j] });
        yaCaido.add(j);
      }
    }
  }
  return parejas;
}

// Se queda el primero de cada pareja y se va el segundo.
function sinLosRepetidos(lista) {
  const sobran = new Set(losQueSeRepiten(lista).map(p => p.sobra.r));
  return {
    fortalezas: lista.fortalezas.filter(r => !sobran.has(r)),
    desafios: lista.desafios.filter(r => !sobran.has(r)),
  };
}

// ── NI UNA PALABRA DE ASTROLOGO IMPRESA ───────────────────────────
//
// En el informe del 24 de agosto salieron 25 fichas de 28 diciendo cosas
// como "El sol y Mercurio en la casa del trabajo diario, en un signo que vive
// para servir...". El prompt lo prohibia y aun asi salio en el 89%: la
// clienta no ha pagado por una lectura tecnica, ha pagado porque le hablen
// de ella, y ahi se le entrego lo primero.
//
// Se arreglaron las dos cosas que empujaban a escribirlo (la casilla del
// esquema decia "Sale de la carta natal", que el modelo leia como "citala"),
// pero pedirlo no es garantizarlo: eso ya lo aprendimos con los repetidos.
// Esto lo comprueba.
//
// "casa" NO esta en la lista a proposito, aunque sea de las que mas se cuelan
// ("la casa del trabajo diario"): es una palabra normal que sale en cualquier
// frase de una vida ("en casa aprendiste", "la casa en orden") y meterla
// mandaria a repasar listas que estan bien. Cuando se cuela va acompanada de
// un planeta o de un "signo", y por ahi cae igual.
const PALABRAS_DE_ASTROLOGO = [
  'mercurio', 'venus', 'marte', 'jupiter', 'saturno', 'urano', 'neptuno',
  'pluton', 'quiron', 'sol', 'luna', 'lunar', 'solar',
  'ascendente', 'descendente', 'medio cielo', 'nodo', 'nodos',
  'aries', 'tauro', 'geminis', 'virgo', 'escorpio', 'escorpion',
  'sagitario', 'capricornio', 'acuario', 'piscis',
  'cuadratura', 'cuadraturas', 'trigono', 'trigonos', 'sextil', 'sextiles',
  'conjuncion', 'oposicion', 'aspectos', 'orbe', 'retrogrado', 'retrograda',
  'signo', 'signos', 'angulo', 'angulos', 'carta', 'natal',
  'horoscopo', 'zodiaco', 'zodiacal', 'efemerides', 'astrologia', 'astrologica',
];

const CAZA_AL_ASTROLOGO = new RegExp(
  `(^|[^a-z0-9])(${PALABRAS_DE_ASTROLOGO.join('|')})([^a-z0-9]|$)`
);

// Devuelve la palabra que se ha colado, o null si la ficha esta limpia. Mira
// las dos casillas que se escriben, que son las dos que se imprimen.
function laPalabraDeAstrologo(rasgo) {
  // El "|| ''" es un seguro. limpiar() ya deja las dos casillas como cadena,
  // pero sin el, una que llegara vacia meteria la palabra "undefined" dentro
  // del texto que se analiza.
  const txt = `${rasgo.nombre || ''} ${rasgo.descripcion || ''}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  const m = CAZA_AL_ASTROLOGO.exec(txt);
  return m ? m[2] : null;
}

// Lo que le falta a la lista, dicho como se le dice al modelo para que lo
// arregle. Si devuelve vacio, la lista esta bien.
//
// Pasarse del maximo NO esta aqui a proposito: que saque veinte en vez de
// dieciocho no le hace daño a nadie y no merece pagar otra llamada entera.
// Quedarse corta si, porque una lista de seis no es la pagina que se vendio.
// Un punto en mitad de la descripcion: final de frase y mayuscula detras.
// En estas fichas no hay abreviaturas ni cifras, asi que no confunde ninguna.
const VA_PICADA = /[.?!]\s+[A-ZÁÉÍÓÚÑ¿¡]/;

// Un texto en espanol trae entre seis y ocho tildes por cada cien palabras.
// La lista que salio mal traia 0,2. Ver loQueLeFaltaALaLista.
const TILDES_POR_CIEN = 1.5;

function loQueLeFaltaALaLista(lista) {
  const problemas = [];

  for (const [cual, rasgos] of [['fortalezas', lista.fortalezas], ['desafios', lista.desafios]]) {
    if (rasgos.length < RASGOS_MINIMO) {
      problemas.push(`la lista de ${cual} ha llegado con ${rasgos.length} y se piden al menos ${RASGOS_MINIMO}`);
    }
  }

  // EL MINIMO POR AREA, QUE AQUI ES LO MAS IMPORTANTE DE TODO.
  //
  // Cada una de las siete areas se escribe DESPUES con los rasgos que esta
  // lista le haya puesto y con ninguno mas. Un area que se quede con uno solo
  // son cuatro paginas dando vueltas a una cosa, que es justo lo que esto
  // viene a arreglar. Por eso no es un aviso: se vuelve a pedir la lista.
  const porArea = {};
  for (const { r } of todosLosRasgos(lista)) {
    const n = Number(r.area);
    if (n >= 1 && n <= 7) porArea[n] = (porArea[n] || 0) + 1;
  }
  const cortas = [1, 2, 3, 4, 5, 6, 7].filter(n => (porArea[n] || 0) < MINIMO_POR_AREA);
  if (cortas.length > 0) {
    problemas.push(
      `las areas ${cortas.map(n => `${NOMBRE_DEL_AREA[n]} (${porArea[n] || 0})`).join(', ')} `
      + `no llegan a ${MINIMO_POR_AREA} rasgos, y cada area del estudio se escribe solo con los suyos: `
      + `saca mas rasgos de esas areas mirando otra vez la carta, sin quitar los que ya tienes`
    );
  }

  // Todas en un solo aviso: con veinticinco fichas tocadas, una linea por
  // ficha convierte el encargo del repaso en una pared de texto.
  const conPalabrota = [];
  for (const { r } of todosLosRasgos(lista)) {
    const palabra = laPalabraDeAstrologo(r);
    if (palabra) conPalabrota.push(`"${r.nombre}" (dice "${palabra}")`);
  }
  if (conPalabrota.length > 0) {
    problemas.push(
      `${conPalabrota.length} ficha(s) usan palabras de astrologo, que no pueden salir impresas: `
      + conPalabrota.slice(0, 8).join(', ')
      + (conPalabrota.length > 8 ? `, y ${conPalabrota.length - 8} mas` : '')
      + '. Vuelve a escribirlas contando lo mismo desde su vida, sin nombrar planetas, signos, casas, angulos ni la carta'
    );
  }

  // LAS DESCRIPCIONES PICADAS EN DOS FRASES.
  //
  // En el informe del 26 de agosto, 19 de las 29 descripciones llegaron
  // cortadas por la mitad con un punto ("...le das una vuelta antes. Cuando
  // explicas algo..."). Asi no suena a alguien hablando, suena a ficha de
  // catalogo, y la pagina de rasgos se lee entera de un vistazo: el punto de
  // mas se ve ahi mas que en ningun otro sitio del estudio.
  //
  // El prompt ya lo pedia. No basto, porque los ejemplos que tenia delante
  // iban partidos con punto y el modelo copia la forma del ejemplo antes que
  // la regla. Los ejemplos ya estan arreglados; esto es lo que lo asegura.
  //
  // SE MIRA LA LISTA ENTERA, NO FICHA POR FICHA. Un punto suelto en una
  // descripcion no es un fallo -a veces la frase se acaba de verdad ahi-; lo
  // que se lee mal es la pagina llena de ellos. Por eso el limite no es
  // "ninguna", es "que no sea la norma": salta pasado un tercio. Asi no puede
  // dar la falsa alarma que daba el corrector que se quito el 26 de agosto,
  // porque esto no juzga lo que dice la frase, solo cuenta puntos.
  const cuantas = todosLosRasgos(lista).length;
  const picadas = todosLosRasgos(lista).filter(({ r }) => VA_PICADA.test(String(r.descripcion || '')));
  if (cuantas > 0 && picadas.length * 3 > cuantas) {
    problemas.push(
      `${picadas.length} de ${cuantas} descripciones van picadas en dos frases con un punto en medio, `
      + `y asi no suenan a alguien hablando: escribelas seguidas y unidas con comas`
    );
  }

  // LA PAGINA ENTERA ESCRITA SIN TILDES.
  //
  // El 27 de agosto salio impresa asi: "le acercas un cafe", "dentro de un
  // ano", "los detalles pequenos", "los demas". Dos tildes en 1.128 palabras,
  // cuando el informe anterior traia 71. Las areas, en cambio, salieron con
  // 687: la diferencia es que el prompt de las areas se escribe con tildes y
  // el de la lista no, porque es texto para el modelo. El modelo copio la
  // ortografia que tenia delante.
  //
  // Los ejemplos del prompt ya van escritos con tildes. Esto es lo que lo
  // asegura, y no se puede arreglar aqui: donde va cada tilde no lo sabe el
  // codigo, hay que volver a pedir la lista.
  //
  // Se mira la lista entera y con mucho margen: un texto en espanol trae
  // entre seis y ocho tildes por cada cien palabras, y el que salio mal traia
  // 0,2. El liston en ${TILDES_POR_CIEN} no roza a ninguna lista bien escrita.
  const escrito = todosLosRasgos(lista).map(({ r }) => `${r.nombre} ${r.descripcion}`).join(' ');
  const cuantasPalabras = escrito.split(/\s+/).filter(Boolean).length;
  const cuantasTildes = (escrito.match(/[\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1\u00fc\u00c1\u00c9\u00cd\u00d3\u00da\u00d1]/g) || []).length;
  if (cuantasPalabras >= 100 && cuantasTildes * 100 < cuantasPalabras * TILDES_POR_CIEN) {
    problemas.push(
      `la lista viene escrita sin tildes (${cuantasTildes} en ${cuantasPalabras} palabras): `
      + `se imprime tal cual en su libro, asi que va con su ortografia entera, con tildes y enes`
    );
  }

  for (const { se_queda, sobra } of losQueSeRepiten(lista)) {
    const mismaLista = se_queda.en === sobra.en;
    problemas.push(
      `"${sobra.r.nombre}" (${sobra.en}) y "${se_queda.r.nombre}" (${se_queda.en}) dicen lo mismo`
      + (mismaLista ? '' : ', y encima uno en cada lista')
    );
  }

  return problemas;
}

// ══════════════════════════════════════════════════════════════════
// EXTRACCION DE RASGOS DESDE LA CARTA NATAL
// ══════════════════════════════════════════════════════════════════

async function extraerRasgos(nombrePila, sexo, cartaTexto) {
  const trato = sexo === 'mujer'
    ? 'una MUJER. Toda en femenino.'
    : 'un HOMBRE. Todo en masculino.';

  const prompt = `Eres la misma experta que escribe el estudio entero, y ahora te toca escribir sus dos listas de rasgos: lo que tiene a favor y lo que le pesa. Los sacas UNICAMENTE de su carta natal, pero eso no se nota al leerlos, porque van escritos con la misma voz que el resto del libro.

LO QUE NO ESTA EN SU CARTA NO SE ESCRIBE, Y ESTA ES LA REGLA QUE SOSTIENE EL PRODUCTO.
Ha pagado por leer lo suyo, no algo que le valdria a cualquiera. En cuanto lee una sola cosa que no le ha pasado deja de creerse el estudio entero, y no vuelve a comprar.
De su carta sale COMO funciona, no lo que vivio: no sabes como era su casa, ni que vio de pequena, ni que le dijeron. Asi que su pasado no se afirma NUNCA -nada de "aprendiste", "creciste", "de pequena", "en tu casa", "desde joven"-, se cuenta lo que le pasa HOY, que es lo unico que puede reconocer.

ESTAS LISTAS SON LA BASE DEL ESTUDIO ENTERO, NO SU FINAL.
De aqui salen las siete areas: a cada una le tocan los rasgos que tu le pongas, y esa area contara ESOS y ninguno mas. Un rasgo que no pongas aqui no se cuenta en ningun sitio. Ademas las dos listas se imprimen enteras al final, asi que lo que escribas se lee dos veces.

${ESPANOL_DE_ESPANA}

Y ASI ES COMO SUENA, QUE ES LO QUE DECIDE SI LO SIGUE LEYENDO O LO CIERRA:

Lo va a leer una mujer que no sabe nada de astrologia ni de psicologia, sentada en su sofa. Tiene que entenderlo a la primera, sin releer y sin preguntarse que has querido decir.

SE TIENE QUE ENTENDER A LA PRIMERA, con palabras de todos los dias. Si al llegar al final de una frase hay que volver atras, esta mal: no la partas en dos, reescribela mas simple.
Lo que tampoco vale es el otro extremo, el trozo seco de telegrama -"Aguantas mucho. Luego explotas."-, que suena a ficha de catalogo. Hablando no vamos cortando: DENTRO de la frase las cosas van seguidas y unidas con comas, en vez de partidas en dos con un punto en medio. El punto del FINAL va siempre, que una frase sin punto esta sin acabar.

NI UNA PALABRA TECNICA, ni de astrologia ni de terapia. Fuera "mecanismo", "patron", "gestionar", "procesar", "vinculo", "autoexigencia", "validacion", "dependencia emocional", "sanar". Si no la usaria ella hablando con una amiga, no va.

Y NADA DE FRASES ABSTRACTAS, que es de donde salen las fichas que no significan nada. "Dependencia emocional de lo compartido" no lo entiende nadie. "Te cuesta gastar en ti cuando el dinero es de los dos" sí.

${TODO_DE_TU}
${HABLAR_DE_ELLA_LO_ROMPE}
Y tampoco apareces tu: aqui no hay un "yo" que cuente su experiencia ni que opine. Solo ella.

LAS DOS CASILLAS QUE ESCRIBES:

- "nombre": el titulo de la ficha, corto, de tres a ocho palabras. No es una etiqueta, ni un diagnostico, ni una cualidad suelta: es una cosa concreta que ella hace o que le pasa, dicha como se dice hablando. Al leerlo se tiene que ver QUE hace; si solo suena bien y no se ve nada, esta mal y se reescribe.
  BIEN: "Ves lo que le falta a la gente", "Te cuesta pedir ayuda", "Dices que sí sin pensarlo", "Aguantas más de la cuenta", "Te fías poco de lo que llega fácil".
  MAL: "Servicio que cura de verdad", "Dependencia emocional de lo compartido", "Autoexigencia que nunca descansa". Son etiquetas, y al leerlas nadie sabe de que hablan.

- "descripcion": dos lineas contandole eso mismo con detalle. El titulo lo dice en corto; aqui se lo cuentas entero, con sus palabras, para que al leerlo se reconozca. Nada de ejemplos ni de escenas montadas: es lo suyo contado, sin decorar.
  Y va SEGUIDA, unida con comas, nunca partida en dos frases con un punto en medio. El punto del final si va: una frase sin punto esta sin acabar.
  BIEN, para el titulo "Ves lo que le falta a la gente": "Notas lo que le hace falta a alguien antes de que lo pida y te pones a resolverlo sin esperar a que te lo diga nadie, muchas veces antes de que esa persona sepa siquiera qué le pasaba."
  MAL: "Detectas necesidades ajenas con rapidez. Actúas sin que te lo pidan." Dice el titulo otra vez y en mas tecnico, va picada en dos y no anade ni un detalle.

- "area": un numero del 1 al 7. 1=Identidad, 2=Patrones, 3=Miedos, 4=Herida, 5=Amor, 6=Relaciones, 7=Dinero. El area donde ese rasgo pesa mas, porque ahi se contara entero: uno puesto donde no va deja su area coja y le roba el sitio a la que si le tocaba.

LO QUE NO SE TOCA:
1. Entre ${RASGOS_MINIMO} y ${RASGOS_MAXIMO} en cada lista, y las dos con numeros distintos: nadie tiene tantas cosas buenas como malas. Los que de verdad salgan de la carta, sin rellenar para cuadrarlas.
2. NI UNO REPETIDO, ni dentro de una lista ni entre las dos. Repetido no es solo la misma frase, es la misma cosa dicha de otra manera: "Miedo al abandono" y "Terror a que la dejen" son el mismo rasgo escrito dos veces. Antes de dar una ficha por buena, leela contra todas las anteriores.
3. Cada rasgo en UNA sola lista, nunca en las dos.
4. De cada una de las siete areas salen al menos ${MINIMO_POR_AREA}, contando las dos listas juntas. Cada area se escribe DESPUES solo con los suyos, asi que un area con uno solo se pasa cuatro paginas dando vueltas a una cosa. Ninguna carta se queda muda en un area.
5. Maximo por area no hay: si de una salen seis, pon seis. Reparte mirando la carta, no a partes iguales.

LA LISTA DE LO QUE LE PESA ES LA DELICADA. Son ${RASGOS_MINIMO} golpes seguidos o mas, sin las paginas que en las areas los amortiguan: mal escrita, se lee y se cierra el informe.
- ${DEFECTOS_DESDE_LA_FUERZA}
- ${PERDONA_ANTES_DE_NOMBRAR}

NI UN PLANETA, NI UN SIGNO, NI UNA CASA, NI UN ANGULO. NI UNA VEZ.
Prohibidas estas palabras y todas sus parientes: Sol, Luna, Mercurio, Venus, Marte, Jupiter, Saturno, Urano, Neptuno, Pluton, Quiron, nodo, ascendente, medio cielo, los doce signos, cuadratura, trigono, sextil, oposicion, conjuncion, aspecto, orbe, retrogrado, carta, carta natal, horoscopo.
Y "casa" solo cuando es la casa astrologica ("la casa del dinero"); la casa de vivir se dice las veces que haga falta.
- MAL: "El sol y Mercurio en la casa del trabajo diario te dan capacidad para detectar qué necesita alguien". BIEN: "Notas quién no está de acuerdo aunque diga que sí, y lo notas por el tono antes que por lo que dice."
- MAL: "El sol enfrentado a Saturno te hizo sentir que el cariño había que ganárselo". BIEN: "Cuando alguien te quiere bien y sin más, te cuesta creértelo, así que sigues currándotelo por si acaso, aunque ya lo tengas."
Los dos BIEN dicen exactamente lo mismo que los MAL, pero contado desde su vida y con palabras suyas. Eso es lo que hay que escribir.

Y EL RESTO DEL TONO, IGUAL QUE EN LAS AREAS:
- ${FRASES_QUE_SUENAN_HABLADAS}
- ${SIN_NOMBRAR_PLANETAS}
- ${COMA_ANTES_DE_Y}
- Nada de asteriscos, negritas, guiones ni simbolos dentro de las dos casillas: es texto corrido y la maquetacion la pone el PDF.
- Llamala por su nombre una o dos veces EN TODA la lista, nunca en cada ficha: un nombre que sale en todas se lee a plantilla.

Carta natal:
${cartaTexto}

Persona: ${trato}
Nombre de pila: ${nombrePila}

IMPORTANTE: entre ${RASGOS_MINIMO} y ${RASGOS_MAXIMO} por lista, las dos con numeros distintos, ni uno repetido, y de cada una de las siete areas al menos ${MINIMO_POR_AREA}. Y antes de entregar, lee las dos listas seguidas en voz alta: la ficha que suene a etiqueta, la que haya que releer para entenderla, la que vaya picada en dos frases secas en vez de ir seguida y la que afirme algo de su vida que la carta no dice, se reescriben.`;

  // LA LISTA SE PIDE CON EL ESQUEMA PUESTO, NO PIDIENDO JSON POR ESCRITO.
  //
  // Sin esquema, el modelo escribe el JSON a mano y lo que llega depende de lo
  // que le quepa. En el informe del 24 de agosto se corto a mitad de una frase
  // ("Unterminated string in JSON at position 6991"), JSON.parse no pudo
  // leerlo y la lista entera se fue a la basura: el cliente pago una llamada
  // de las caras y recibio un PDF sin la pagina de rasgos. Con output_config
  // lo que llega es JSON valido y con todas sus casillas, igual que las areas.
  //
  // Y va con sonnet, como todo lo demas del informe. Iba con opus, que cuesta
  // cinco veces mas por token: el trabajo dificil es escribir las areas, no
  // sacar treinta fichas cortas.
  const pedirLaLista = async (queCorregir) => {
    const encargo = queCorregir
      ? `Saca las dos listas de esta carta, siguiendo exactamente la estructura del esquema.

La vez anterior salio con esto mal, asi que esta vez hay que arreglarlo:
${queCorregir.map(p => '- ' + p).join('\n')}

Vuelve a sacar las dos listas ENTERAS, no solo lo que fallaba.`
      : 'Saca las dos listas de esta carta, siguiendo exactamente la estructura del esquema.';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        thinking: { type: 'disabled' },
        output_config: { format: { type: 'json_schema', schema: ESQUEMA_RASGOS } },
        // Ver TOPE_RASGOS. El tope viejo eran 3.000 y por eso llegaba cortada.
        max_tokens: TOPE_RASGOS,
        system: prompt,
        messages: [{ role: 'user', content: encargo }],
      }),
    });

    // Se lanza en vez de devolver vacio, y se marca si el fallo es de los que
    // se arreglan solos volviendo a llamar. Saturacion (429) y errores del
    // servidor (5xx) lo son; una clave mal puesta o una peticion mal formada
    // (4xx) no, y ahi insistir es tirar tiempo y dinero.
    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`la API ha contestado ${response.status}: ${errorText.slice(0, 120)}`);
      err.temporal = response.status === 429 || response.status >= 500;
      throw err;
    }

    const data = await response.json();

    // Si aun asi se quedara sin sitio, lo que llega es JSON cortado. Se dice
    // aqui y con estas palabras, que es el aviso que hay que buscar si algun
    // dia la pagina de rasgos vuelve a salir vacia.
    // Cortada por falta de sitio. Con TOPE_RASGOS no deberia pasar nunca, pero
    // si pasa se vuelve a pedir: el modelo no escribe dos veces lo mismo de
    // largo y la segunda suele caber.
    if (data.stop_reason === 'max_tokens') {
      const err = new Error(`la respuesta no cupo en ${TOPE_RASGOS} tokens y ha llegado cortada`);
      err.temporal = true;
      throw err;
    }

    const texto = (data.content || [])
      .filter(b => b && typeof b.text === 'string')
      .map(b => b.text)
      .join('') || '{}';

    const resultado = JSON.parse(texto);
    if (!Array.isArray(resultado.fortalezas)) resultado.fortalezas = [];
    if (!Array.isArray(resultado.desafios)) resultado.desafios = [];

    // La ficha se queda en sus tres casillas y nada mas: lo que llegue de
    // sobra no viaja hasta el PDF.
    //
    // Y pasa por el mismo cepillo de la coma antes de "y" que el texto de las
    // areas. El prompt la lleva pedida desde siempre y se sigue colando; alli
    // se quitan las que se pueden quitar sin riesgo desde el primer dia, y
    // aqui no, que era un olvido: las fichas salian con ", y" donde el area no.
    // Ver quitarComaAntesDeY en lib/estilo.js: ante la duda no toca nada,
    // porque una coma quitada donde hacia falta es una falta impresa.
    const sinLaComa = t => quitarComaAntesDeY(String(t || '').trim(), nombrePila);
    // LA DESCRIPCION ACABA EN PUNTO, SIEMPRE.
    //
    // El 27 de agosto salieron las 28 sin el: "...respira mejor sin saber muy
    // bien por que", y ahi terminaba. El prompt pedia menos puntos DENTRO de
    // la frase y el modelo se llevo tambien el del final. Ya esta dicho en el
    // prompt, y aqui se cierra: esto no merece una llamada, se arregla solo.
    // El titulo no lleva punto, que es un titulo.
    const conPuntoFinal = t => (t && !/[.?!]$/.test(t)) ? t + '.' : t;

    const limpiar = (rasgo) => {
      const area = Number(rasgo.area);
      return {
        nombre: sinLaComa(rasgo.nombre),
        descripcion: conPuntoFinal(sinLaComa(rasgo.descripcion)),
        area: (area >= 1 && area <= 7) ? area : 1,
      };
    };
    const valido = r => r && r.nombre && r.descripcion;

    return {
      fortalezas: resultado.fortalezas.filter(valido).map(limpiar),
      desafios: resultado.desafios.filter(valido).map(limpiar),
    };
  };

  // Pase lo que pase, de aqui no sale una excepcion. La lista es un extra del
  // informe: si falla, el PDF sale sin esa pagina, pero las siete areas que el
  // cliente ha pagado se entregan igual. Antes un corte de red aqui tumbaba el
  // informe entero cuando ya estaba escrito.
  try {
    let mejor = null;
    let queCorregir = null;
    let fallos = 0;
    let repasos = 0;
    let ultimoError = null;

    while (fallos < INTENTOS_DE_LA_LISTA) {
      try {
        const salida = await pedirLaLista(queCorregir);

        const problemas = loQueLeFaltaALaLista(salida);
        if (problemas.length === 0) {
          console.log(`Rasgos extraidos: ${salida.fortalezas.length} fortalezas, ${salida.desafios.length} desafios`);
          return salida;
        }

        // La que menos le falta, y en empate la ultima, que es la que se
        // escribio sabiendo lo que habia fallado. Igual que en las areas.
        if (mejor === null || problemas.length <= mejor.cuantos) mejor = { salida, cuantos: problemas.length };

        if (repasos >= REPASOS_DE_LA_LISTA) break;
        repasos++;
        queCorregir = problemas;
        console.warn(`Rasgos: ${problemas.join('; ')} — se vuelve a pedir la lista`);

      } catch (err) {
        ultimoError = err;
        fallos++;
        // Un corte de red llega sin marca; se trata como temporal.
        const temporal = err.temporal !== false;
        if (!temporal || fallos >= INTENTOS_DE_LA_LISTA) break;
        console.warn(`Rasgos: intento ${fallos} fallido (${err.message.slice(0, 80)}), reintentando`);
        await new Promise(r => setTimeout(r, 1500 * fallos));
      }
    }

    if (mejor === null) {
      console.error(`Error extrayendo rasgos: ${ultimoError ? ultimoError.message : 'sin lista'} — el informe sale SIN la lista`);
      return listaVacia();
    }

    // Lo que siga repetido despues del repaso se quita, aunque la lista se
    // quede mas corta. Una lista de veinticinco con tres repetidos vale menos
    // que una de veintidos sin ninguno: el cliente no cuenta las fichas, pero
    // se da cuenta enseguida de que le han dicho dos veces lo mismo.
    const limpia = sinLosRepetidos(mejor.salida);
    const quitados = (mejor.salida.fortalezas.length + mejor.salida.desafios.length)
                   - (limpia.fortalezas.length + limpia.desafios.length);
    if (quitados > 0) console.warn(`SE ENTREGA CON AVISOS — Rasgos: se han quitado ${quitados} repetido(s) que seguian ahi despues del repaso`);
    for (const aviso of loQueLeFaltaALaLista(limpia)) console.warn(`SE ENTREGA CON AVISOS — Rasgos: ${aviso}`);

    console.log(`Rasgos extraidos: ${limpia.fortalezas.length} fortalezas, ${limpia.desafios.length} desafios`);
    return limpia;

  } catch (err) {
    console.error('Error extrayendo rasgos:', err.message);
    return listaVacia();
  }
}

// NADA DE LO QUE SE LE DICE AL MODELO PUEDE SALIR IMPRESO.
//
// Al area se le mandan cosas que son para ella y no para la clienta: que
// parte de la carta le toca mirar, y desde las listas, que rasgos suyos le
// tocan contar. Si el modelo copiase esos encabezados dentro del texto, la
// clienta abriria un estudio de 27 euros y leeria las instrucciones internas
// del producto.
//
// Hasta ahora eso se pedia y nada mas. Se pedia bien -en los dos estudios del
// 25 de agosto no se colo ni una- pero pedir no es garantizar, y lo que de
// verdad tapaba ese agujero era el detector de palabras de astrologo, que
// caza "el Sol con Saturno" si se copia. La nota de los rasgos no lleva ni una
// palabra de esas, asi que ese detector no la veria: de ahi esta lista.
//
// Son frases largas y literales de los encabezados internos. Ninguna la
// escribiria nadie contandole a una persona como es, asi que no hay riesgo de
// llevarse por delante texto bueno.
const MARCAS_QUE_NO_SE_IMPRIMEN = [
  'lo que te toca contar a ti en esta area',
  'esto es que contar, no por donde mirar',
  'los bloques no cambian de trabajo',
  'la parte de la carta que te toca mirar',
  'por donde va esta area',
  'informacion interna para ti',
  'antes de dar el area por terminada',
];

// LA RED DE ABAJO DEL TODO. El control de mas arriba manda a rehacer el area
// cuando ve una marca, pero el repaso tiene un tope: si a la segunda vuelve a
// colarse, el area se entrega con avisos, que es lo correcto para un fallo de
// estilo y lo peor posible para esto. Antes de entregar, la marca se quita del
// texto. La clienta se queda sin ver una frase que nunca fue para ella, y no
// sin su estudio.
//
// Se quita solo el encabezado y los dos puntos que lo siguen, no la frase
// entera: lo que va detras es texto suyo, escrito para ella, y vale.
function sinLasMarcasInternas(texto) {
  let salida = String(texto || '');
  for (const marca of MARCAS_QUE_NO_SE_IMPRIMEN) {
    // La marca se busca sin tildes, asi que se localiza sobre una copia sin
    // ellas y se corta por posicion sobre el original, que es el que se
    // entrega. Las dos cadenas miden lo mismo: quitar tildes no cambia el
    // numero de letras.
    for (;;) {
      const limpio = salida
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const donde = limpio.indexOf(marca);
      if (donde < 0) break;
      // La marca es solo el principio del encabezado ("lo suyo que te toca
      // contar"), y detras va el resto ("a ti en esta area:"). Se corta hasta
      // los dos puntos que lo cierran, buscandolos cerca: si no aparecen en
      // lo que mide un encabezado, se quita solo la marca y no se toca nada
      // mas, que es mejor que llevarse por delante una frase suya.
      const CABE_UN_ENCABEZADO = 60;
      let hasta = donde + marca.length;
      const dosPuntos = salida.indexOf(':', hasta);
      if (dosPuntos >= 0 && dosPuntos - hasta <= CABE_UN_ENCABEZADO) hasta = dosPuntos + 1;
      while (hasta < salida.length && /\s/.test(salida[hasta])) hasta++;
      salida = salida.slice(0, donde) + salida.slice(hasta);
    }
  }
  return salida;
}

function laMarcaInternaQueSeHaColado(texto) {
  // Sin tildes y en minusculas, para que una tilde de mas o de menos en la
  // copia no lo deje pasar. No usa el sinTildes de mas abajo a proposito:
  // aquel vive dentro del handler y esto es de fichero.
  const limpio = String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return MARCAS_QUE_NO_SE_IMPRIMEN.find(m => limpio.includes(m)) || null;
}


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { session_id } = req.body;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
  }

  // Este endpoint es el unico que cuesta dinero (7 llamadas al modelo por
  // peticion), asi que aqui es donde se decide si se genera o no. Las tres
  // puertas van en este orden a proposito: primero lo definitivo, luego lo
  // temporal, y el contador de intentos el ultimo, para que una recarga
  // mientras se genera no consuma intentos ni dispare avisos en falso.
  let reserva;
  // En que numero de intento va esta generacion, y la sesion de Stripe con los
  // datos del cliente: hacen falta si la generacion falla y era la ultima.
  let intentoActual = 0;
  let datosCliente = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!compraValida(session)) {
      return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
    }

    const st = estado(session);

    // 1. Ya se genero: definitivo. Ni recargando, ni con el enlace, ni nunca.
    if (st.completado) {
      return res.status(403).json({ error: 'Este informe ya fue generado.', motivo: 'completado' });
    }

    // 2. Se esta generando ahora mismo. No es un error: el informe viene en
    //    camino y llegara por correo. Sin gasto.
    if (st.ocupada) {
      return res.status(409).json({ error: 'Tu informe se esta generando ahora mismo.', motivo: 'en_curso' });
    }

    // 3. Se agotaron los intentos de verdad (los dos fallaron y liberaron la
    //    reserva, o caducaron). Aqui si hay que avisar al admin.
    if (st.intentos >= MAX_INTENTOS) {
      await avisarClienteSinInforme(stripe, session_id, session, st.intentos, 'se agotaron los intentos');
      return res.status(429).json({ error: 'Se ha alcanzado el limite de intentos para este informe. Escribenos a hola@origennatal.com y te lo enviamos.', motivo: 'agotado' });
    }

    // Coger la reserva ANTES de gastar. Si otra peticion simultanea se la
    // lleva, cedemos sin gastar nada.
    reserva = await reservar(stripe, session_id, session);
    if (!reserva.ok) {
      return res.status(409).json({ error: 'Tu informe se esta generando ahora mismo.', motivo: 'en_curso' });
    }
    // Este es el intento numero X de Y. Se guarda para saber, si esta
    // generacion falla, si al cliente le quedaba otra oportunidad o no.
    intentoActual = st.intentos + 1;
    datosCliente = session;
  } catch (err) {
    return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
  }

  const { nombre, sexo, fechaNice, hora, lugar, edad, cartaTexto } = req.body;

  if (!nombre || !cartaTexto) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  // El cliente escribe nombre y apellidos en la misma casilla ("Juan Jose Mayo
  // Perez"), asi que aqui se separa la primera palabra y se le pasa al modelo
  // aparte, para que no llame a la persona por su apellido ni por el nombre
  // entero. El nombre completo se sigue mandando por si el de pila es compuesto.
  const nombrePila = String(nombre).trim().split(/\s+/)[0] || String(nombre).trim();

  const SYSTEM_PROMPT = `Eres una experta en psicología, astrología y neurociencia. Generas diagnósticos de autoconocimiento muy personalizados basados en la carta natal.

${ESPANOL_DE_ESPANA}

ESTILO DE ESCRITURA:
- Habla como una persona de confianza, directo y cercano
- Lenguaje sencillo, que lo entienda cualquier persona aunque no haya leído un libro en años
- UNA IDEA NO SE PARTE CON UN PUNTO. Va seguida y unida con comas, igual que cuando alguien te lo está contando hablando. El punto se pone al cambiar de idea, nunca en mitad de una: si lo que viene detrás del punto es lo mismo que venías diciendo, ahí iba una coma. Y las ideas se conectan con comas, nunca con guiones largos
- Sin listas, sin viñetas, sin símbolos, todo en párrafos corridos. Los asteriscos tienen un único uso, marcar la negrita que se explica más abajo, y no valen para nada más. Dentro del texto no se escribe nada que no sean sus palabras: la maquetación sale de las casillas, que se explican en CÓMO SE ENTREGA EL ÁREA
- ${SIN_NOMBRAR_PLANETAS}
- No empieces dos párrafos con la misma estructura. Varía los arranques
- Escribe como un humano, no como una IA: frases que fluyen, con su ritmo mezclado, no todas cortadas del mismo tamaño
- ${FRASES_QUE_SUENAN_HABLADAS}
- Vigila especialmente la primera frase del área. Si el lector tropieza ahí, ya no entra.
- PROHIBIDO ENUMERAR. Nunca anuncies cuántas cosas vas a decir ni las numeres: nada de "son tres", "el primero", "la segunda", "y la tercera", "hay dos cosas que". Las ideas se encadenan una detrás de otra, como cuando alguien te cuenta algo hablando, y el lector no necesita saber cuántas quedan. Si el área se pudiera convertir en una lista de viñetas sin perder nada, está mal escrita.
- CADA PÁRRAFO SE ENGANCHA CON EL ANTERIOR. Retomas una palabra, una imagen o una idea del párrafo de antes y sigues tirando del hilo desde ahí. Ningún párrafo empieza un tema nuevo en frío, y ninguno puede leerse suelto sin perder nada. Si quitas un párrafo y el resto se lee igual de bien, es que estaba puesto al lado y no cosido.
- EL RITMO SE MEZCLA, NI TODO LARGO NI TODO CORTO. La media está en unas veinte palabras por frase, con una coma dentro: ese es el punto en el que se lee a alguien hablando. Por debajo de diez suena a titular y pica; por encima de treinta y cinco el lector se pierde y tiene que releer, que es justo lo que hace que un párrafo no llegue. Se mezclan: una larga que desarrolla una idea entera, otra normal, y de vez en cuando una corta que remata. Lo que no vale es que todas midan parecido.
- ${DEFECTOS_DESDE_LA_FUERZA}
- EL PORQUÉ VA PEGADO, NO APARTE. Cada cosa que le nombras lleva su motivo dentro de la misma frase: para qué le sirve eso, qué gana haciéndolo o de qué le libra. Nombrárselo a secas es un diagnóstico, y un diagnóstico se lee y se olvida; con el motivo dentro es cuando dice "claro, por eso". Ese motivo es siempre cómo está hecha ella por dentro, nunca algo que le pasara. Y no se cose siempre igual: unas veces con un "porque", otras con un "para", otras basta con enseñarle lo que gana, que si las siete áreas enganchan el motivo con la misma palabra se oye el molde.
- LLÁMALA POR SU NOMBRE UNA O DOS VECES EN EL ÁREA. Nunca ninguna: un área en la que no la nombras suena a informe sobre ella y no a alguien hablándole. Va donde caiga natural, igual que cuando alguien que te conoce te llama por tu nombre justo en el momento en que te está diciendo algo que te toca.
- Y NO SIEMPRE EN EL MISMO SITIO DE LA FRASE. Las siete áreas se leen seguidas, así que si el nombre sale siempre encajado en mitad de la frase se lee a plantilla, por muy bien puesto que esté. Se cambia de sitio en cada área: unas veces abre la frase ("Raquel, eso que haces..."), otras la cierra ("...y eso lo sabes de sobra, Raquel."), y otras va dentro. Lleva sus comas siempre, que es como se escribe en español, pero no siempre en el mismo hueco.
- Y VA EN UNA FRASE EN LA QUE LE HABLAS DE TÚ. Su nombre y la tercera persona no pueden ir juntos: en cuanto escribes su nombre dentro de una frase que habla de ella desde fuera, deja de ser alguien que le habla y pasa a ser alguien que la comenta con otro. Nunca para empezar el área.
- EL NOMBRE QUE USAS ES EL DE PILA, el que tienes en "Nombre de pila". Nunca los apellidos y nunca el nombre completo: a nadie le llaman por el apellido en una conversación. Si al mirar el nombre entero ves claro que el de pila es compuesto (María Carmen, José Luis, Juan José), puedes usar las dos palabras. Ante la duda, la primera palabra sola.
- PREGÚNTALE DIRECTAMENTE, y no una sola vez. A lo largo del área te paras y le haces preguntas de verdad, de las que se quedan dando vueltas y la obligan a mirarse por dentro. Una va en su casilla; las demás van repartidas por el texto, DENTRO de un párrafo y entre las otras frases, saliendo de lo que le acabas de contar, y el párrafo sigue después. La referencia es esta: la pregunta que le haría alguien que la conoce bien, en una conversación de verdad, no la que saldría en un folleto. Tiene que ser tan suya que si se la hicieras a otra persona no significaría nada.
- Las preguntas BUENAS salen de algo que acabas de contarle y le devuelven la pelota: "¿cuántas veces te has callado algo por no montar un lío?". Las MALAS valen para cualquiera y no dicen nada: "¿te suena?", "¿te identificas con esto?", "¿te ha pasado alguna vez?".
  De ese ejemplo se coge la pelota que devuelve, no las palabras con las que arranca: por dónde empieza la tuya lo lleva escrito tu área, al final de su encargo. Copiándole el arranque pasa lo del último estudio, donde las siete preguntas empezaron por "¿cuántas veces" o "¿cuánto hace", y dos áreas acabaron con la misma pregunta palabra por palabra.
- Y EL SITIO DE CADA UNA LO MARCA EL TEXTO: cada vez que le pones nombre a algo que le cuesta, o a algo que hace sin darse cuenta de que lo hace, ahí te paras y se lo preguntas. En un área hay tres o cuatro momentos así y ninguno se deja pasar. Si todas las preguntas se quedan en la casilla, lo que ella lee es un informe sobre ella y no alguien hablándole.
- RESALTA EN NEGRITA, dentro del texto de los párrafos, marcándolo con dos asteriscos a cada lado: **así**. Esto no es opcional y no es un adorno: un área sin una sola negrita es un muro de cuatro páginas donde el ojo no tiene dónde pararse, y es el fallo que más caro sale.
- LA NEGRITA ES EL FOSFORITO DEL LECTOR. No es maquetación, no es un resumen y no es para que la página quede bonita: es exactamente lo que esa persona subrayaría si estuviera leyendo esto en un libro suyo, con un rotulador en la mano y sin pensárselo. La pregunta que decide cada una es esa: al llegar aquí, ¿pararía y lo subrayaría, o seguiría de largo?
- SE MARCA LO QUE LA NOMBRA, NO LO QUE LE EXPLICAS. Lo que se subraya es la frase en la que se reconoce de golpe, la que le pone nombre a algo que llevaba años haciendo sin saber que lo hacía, la que ella se dice por dentro y no ha dicho nunca en voz alta, o la cuenta exacta de lo que le está costando. El porqué, el ejemplo, el contexto y la parte amable no se subrayan jamás: son lo que sostiene la frase que sí.
- LA PRUEBA, Y ES LA QUE MANDA: al terminar el área, lee seguido SOLO lo que has marcado. Tiene que sonar a lo que esa persona le contaría de sí misma a una amiga después de leerlo. Si suena a titulares, has marcado lo que quedaba bien. Si suena al área otra vez pero más corta, has marcado de más. Si no dice nada, has marcado de menos.
- LA CANTIDAD LA DECIDE EL TEXTO, NO UNA CUOTA. Esto no es un correo de tres párrafos: es un libro sobre ella, y esta área sola ocupa cuatro páginas. Un libro que alguien lee con el fosforito en la mano no se termina con dos frases subrayadas, y tampoco con media página amarilla: de cada página se queda algo. En unas una cosa, en otras tres, y en alguna nada, porque el reparto es irregular igual que es irregular lo que le va pasando por dentro mientras lee. No hay número fijo ni sitio fijo: en un área saldrán tres y en otra siete, las que dé el texto. Lo que no puede pasar, y es lo único que aquí se mide, es que un área entera se quede sin ninguna. Lo que sí está mal es repartirlas a ojo para que queden equilibradas por página: eso se lee a plantilla y se nota.
- EL FALLO DE VERDAD ES QUEDARSE CORTO, y es el que se comete siempre. Se marca lo más evidente, se dejan cuatro páginas sin nada donde agarrarse, y eso se lee igual de plano que no marcar nada: el lector recorre el muro sin que nada le pare. Cuando termines el área, reléela entera buscando lo que ella releería dos veces. Cada frase que encuentres así y no esté marcada, se marca.
- EL TAMAÑO ES EL DEL GOLPE, no el de la frase. Se marca desde donde empieza a doler hasta donde deja de doler, aunque eso caiga en mitad de la frase y se lleve por delante una coma: "y mientras asientes, por dentro **estás calculando cuánto has enseñado de más**". Van de tres palabras a una frase entera, nunca una palabra suelta, y nunca dos líneas y media seguidas, que ya no es una negrita sino un bloque y deja de resaltar.
- NO SE MARCAN NUNCA: las explicaciones, los datos, los piropos, ni lo que ya se veía venir dos líneas antes. De un mismo contraste se marca solo la mitad que escuece, nunca las dos, porque marcar las dos se lee a plantilla. Y dos negritas seguidas que dicen lo mismo con otras palabras son una sola: se queda la buena.
- FUERA DEL TEXTO CORRIDO NO HAY NEGRITAS. Ni dentro de la escena, que se lee del tirón y una marca ahí saca al lector de golpe, ni en los remates, ni en la pregunta, ni en el cierre: esos ya se destacan solos al maquetarlos, y una negrita encima no se ve, se pierde.
- Los asteriscos van siempre en pareja, dos para abrir y dos para cerrar, y la pareja entera dentro del mismo párrafo. Nunca sueltos, nunca impares y nunca para ninguna otra cosa.
- ${COMA_ANTES_DE_Y}

REGLA DE PÁRRAFOS (CRÍTICA, se cumple siempre):
- TECHO ABSOLUTO: ningún párrafo pasa de 90 palabras. Al maquetarse en el PDF, 90 palabras ocupan 7 líneas, y 7 líneas es el máximo. Si se te va por encima, pártelo en dos. Esto no se negocia nunca.
- NO HAY MÍNIMO. Los párrafos van de 2 a 7 líneas y tienen que MEZCLARSE sin patrón: uno de siete que desarrolla una idea entera sin cortarla, otro de cinco, dos cortos seguidos, uno de dos líneas que remata y duele. Escribe como escribe una persona, no como una máquina que reparte el texto en trozos iguales.
- Si todos tus párrafos miden parecido, está MAL aunque respeten el techo. Se lee robótico y el lector lo nota aunque no sepa por qué.
- Un párrafo de dos líneas es la mejor herramienta que tienes para cerrar una idea o dejar caer algo incómodo. Úsalos, y no siempre en el mismo sitio.
- Entre párrafo y párrafo hay doble salto de línea (línea en blanco visible)
- SI EL ÁREA TE SOBRA DE LARGO, quita contenido entero: un párrafo, una idea, un ejemplo. NUNCA comprimas lo que ya está escrito apretándolo, porque al apretarlo se pierden las explicaciones, se queda en afirmaciones sueltas y el área acaba leyéndose como un esquema.
- REGLA CRÍTICA DE LONGITUD: cada área tiene OBLIGATORIAMENTE entre 850 y 900 palabras, con UNA excepción: el ÁREA 1 (IDENTIDAD) va entre 1.100 y 1.300 palabras, porque cubre más terreno. Los párrafos salen de lo que pide cada bloque, y el suelo son once en un área normal. Un área por debajo de su mínimo es un ERROR GRAVE que rompe el producto final. Si te sale corta, AMPLÍA con más detalle y más ejemplos, AÑADIENDO párrafos nuevos, nunca engordando los que ya tienes.

OBJETIVO: Que la persona lea y piense que eso es exactamente ella, que por fin alguien se lo explica.

LA VOZ QUE LE HABLA (ESTO VA ANTES QUE CUALQUIER OTRA REGLA):
Esto no es un informe sobre ella, es alguien contándole quién es. Y ese alguien tiene que notarse dentro del texto, porque si no se nota, el estudio entero se lee como una radiografía: todo cierto, todo frío, y nadie al otro lado.
La posición desde la que se escribe cada párrafo es esta: estás sentada delante de ella, la conoces bien, la quieres bien, y le vas a contar cosas que no le ha dicho nadie nunca.
Cómo se nota que hay alguien ahí: le quitas la culpa antes de decirle algo que va a doler ("esto no lo elegiste tú"), le pides que piense y le das tiempo ("piénsalo despacio, no de pasada"), le señalas lo que acaba de hacer mientras leía, le das la razón cuando la tiene. No es un narrador que describe desde fuera, es una persona que la acompaña mientras se lo cuenta.
Sin pasarse: no se abre cada párrafo con una intervención, ni se le habla como en un correo de ventas. Son tres o cuatro momentos en toda el área, puestos donde hacen falta.

${TODO_DE_TU} Esto vale para el área entera, y con más motivo para el primer párrafo y para el cierre, que son los dos sitios donde más se escapa.
${HABLAR_DE_ELLA_LO_ROMPE}
Cuidado con la excepción falsa: la entradilla que abre el área puede hablar de mucha gente ("a casi nadie le pasa...", "todo el mundo conoce a una..."), y eso es correcto porque no habla de ELLA. Lo que no vale nunca es hablar de ella misma en tercera persona.

${PERDONA_ANTES_DE_NOMBRAR}

EL PUNTO DE LUZ:
Al cerrar la última página tiene que quedarse con ganas, no hundida. Un estudio que solo diagnostica se lee una vez y no se recomienda a nadie.
No se consigue con frases de ánimo ni con un final bonito pegado al final. Se consigue así: cuando le cuentas de dónde viene algo, recuérdale que lo que se volvió automático se puede volver a decidir; cuando le cuentas lo que le pesa, enséñale que esa misma cualidad es la que la hace buena en algo concreto; y en el cierre, deja ver qué se le abre cuando suelte eso.
Esa es la diferencia entre un diagnóstico y un estudio que se lo pasa a una amiga.

ASÍ SUENA CUANDO ESTÁ BIEN:
Esto no es contenido, es tono. No copies ni una palabra, ni la situación, ni el personaje: lo que se coge de aquí es cómo se le habla.

  "Piensa un momento en las personas que sostienen, la que se acuerda de los cumpleaños de toda la familia, la que en una oficina nota que alguien está raro antes que nadie. Todo el mundo tiene una cerca y casi nadie le pregunta nunca cómo lo lleva.
  Tú eres esa persona.
  Por fuera pareces tranquila, con esa cosa rara de conseguir que cualquier conversación fluya sin que nadie se incomode, mientras por dentro llevas una máquina que no para de repasar lo que acabas de decir.
  Y esto es lo importante, porque de aquí sale todo lo demás: eso no es falsedad, ni es que finjas, es que suavizas todo lo que tocas antes de que nadie note que hacía falta suavizarlo, y lo llevas haciendo desde hace tanto que ya ni te das cuenta de que lo estás haciendo."

Fíjate en lo que hace ese fragmento, porque es lo que hay que reproducir: abre ancho antes de entrar (ancho SÍ, pero por dónde ya te lo dice tu área, no lo copies de aquí), se nota que hay alguien hablándole a ella y no un texto que se explica solo, le quita la culpa antes de nombrarle nada, y mezcla frases largas con una corta que cae sola.

  "Hacer cosas no te cansa, eso lo llevas bien y lo has llevado siempre. Lo que te cansa es que hacerlas sea la única prueba que te vale de que mereces estar donde estás, y esa prueba te la pusiste tú, no te la pidió nadie: llevas años pudiendo descansar y no lo sabías."

Ese es un cierre: dice algo que no se había dicho en toda el área, lo dice entero, no presenta nada de lo que viene después, y termina enseñándole lo que se le abre.
Y NO ABUSES DE "NO ES X, ES Y". Es una figura buena y de vez en cuando cae sola, pero en cuanto se repite se oye el molde: "no es frialdad, es una fuerza", "no es que dudes, dudas de", "no es desconfianza, es que necesitas". Una vez en el área, como mucho dos, y el resto se dice derecho.
DE AHÍ SE COGE LO QUE HACE, NO CÓMO ESTÁ ARMADO. En los dos ultimos estudios los catorce cierres calcaron su forma: "No es que X..., el día que Y vas a descubrir Z", los catorce. Leídos seguidos se ve el molde y el golpe se pierde, porque a la cuarta el lector ya sabe cómo va a terminar la frase. Tu área lleva escrita su propia forma de cerrar al final de su encargo, en POR DÓNDE VA ESTA ÁREA.

ESCENA REAL OBLIGATORIA:
Tienes que incluir una escena concreta, específica y visual que el lector reconozca de inmediato como propia. No vale una situación genérica ni tonta. Debe ser una escena tan concreta que el lector diga "joder, esto me pasa literalmente".

Ejemplos de escenas BUENAS (úsalas de inspiración, no las copies):
- Para MIEDOS: "Llega el domingo por la tarde y ya notas ese peso raro en el pecho pensando en el lunes, haces una lista mental de todo lo que tienes que controlar, no porque haga falta, sino porque si no lo repasas todo cien veces sientes que algo malo va a pasar, y cuando te metes en la cama te pones a revisar el móvil para no pensar."
- Para AMOR: "Estás con alguien que te gusta de verdad, todo va bien dos meses, y un día esa persona tarda cuatro horas en contestar un mensaje, y sin darte cuenta ya estás construyendo una historia entera en tu cabeza, ya estás pensando que se acabó, que no le importas, que era demasiado bonito, y cuando por fin responde con un simple 'perdona, he estado liado', tu cuerpo se relaja de golpe y te das cuenta de lo agotada que estabas."
- Para DINERO: "Te ofrecen un trabajo mejor pagado, la propuesta está encima de la mesa, y antes de alegrarte ya estás pensando en todas las razones por las que no vas a poder con él, en todo lo que puede salir mal, en qué van a pensar los demás si fracasas, y acabas diciendo que no, o pidiendo menos de lo que te ofrecían, con una sensación extraña de alivio."

Las escenas BUENAS son específicas (hora del día, gesto concreto, diálogo interno, objeto real), visuales, y tocan una inseguridad real. Las escenas MALAS son abstractas ("cuando te sientes mal, piensas cosas"), obvias ("a veces dudas de ti mismo") o vacías.
DE ESOS TRES SE COGE EL CONTENIDO, NO EL ARRANQUE. Los tres empiezan situando el momento, y así es justo como no se empieza: los catorce ejemplos de los dos ultimos estudios arrancaron con la hora seca. El tuyo arranca por la media línea que la invita a mirar, la que lleva escrita tu área, y el momento va detrás.

La escena ocupa uno o dos párrafos completos y se presenta como un rato suyo, no como una ilustración de lo que le estás explicando: se la invita a mirarlo, pero no se le llama "ejemplo" ni se anuncia lo que va a demostrar.
LA ESCENA SE ESCRIBE EN UN SITIO Y EN UNO SOLO: en la casilla "escena", que se explica en CÓMO SE ENTREGA EL ÁREA. NO la escribas además dentro de los bloques de texto. Está en su casilla y el código la coloca donde tú digas, así que si además la copias en un párrafo el cliente se la encuentra impresa dos veces seguidas, palabra por palabra. Eso ya ha pasado en tres áreas del mismo informe.
LA ESCENA SE PRESENTA, NO SE SUELTA, Y LA INVITACIÓN VA DENTRO DE SU CASILLA. Soltada de golpe, el lector se encuentra de pronto en una cocina a las once de la noche sin saber por qué le están contando eso. Antes se pedía esa frase de entrada en el bloque de texto de al lado y no llegaba nunca: en los dos ultimos estudios las catorce escenas empezaban a pelo, con la hora. Así que va DENTRO de la casilla "escena", como su primera media línea. AQUÍ NO PONE CUÁL, a propósito: la tuya la lleva escrita tu área en POR DÓNDE VA ESTA ÁREA, y por eso las siete no entran igual. Si la pusiera aquí, las siete cogerían esa. Corta, y sin llamarla ejemplo ni explicar lo que va a demostrar.
Y detrás, cuando la escena termina, otra frase que recoge lo que acaba de leer y le pone nombre. Esa sí va fuera, en el bloque de texto que le toque.

ESTRUCTURA INTERNA (sin títulos ni numeración visible, todo fluido):
Lo de abajo es una lista de lo que tienes que tocar, no un índice de apartados. Los nombres en mayúsculas son etiquetas mías para poder referirme a cada cosa: NUNCA se escriben, NUNCA se anuncian, NUNCA empiezas un párrafo con ellos y NUNCA abres uno con una frase que presente lo que viene ("hay algo que sostiene todo esto", "y esto viene de lejos"). Los subtítulos que sí se escriben son otra cosa distinta y se explican en CÓMO SE ENTREGA EL ÁREA MARCADA: nunca llevan el nombre de una de estas etiquetas.
El área se lee como una sola conversación seguida, no como seis trozos pegados. Se pasa de una cosa a la siguiente por dentro del texto, tirando del hilo de lo que acabas de contar, y el lector no debe poder señalar dónde acaba una parte y empieza otra.
Y FÍJATE EN CÓMO ESTÁ ESCRITO LO DE ABAJO, porque no es casualidad: está en segunda persona, hablándole a ella de tú, que es exactamente como tiene que salir en el texto. "Qué se te rompió", no "qué se le rompió". Mantén esa persona de la primera palabra a la última.

HOY — CÓMO SE MANIFIESTA AHORA, lo bueno Y lo malo. Qué haces hoy en esta parcela concreta de tu vida, en qué situaciones y con qué gestos. Y también tu fuerza real aquí: lo que esta misma manera de ser te da y que casi seguro no te apuntas como mérito, contada con el mismo detalle y la misma concreción que lo que te pesa, nunca despachada en una frase amable de paso. Es el punto más largo del área, y lo bueno ocupa más o menos lo mismo que lo que te duele.
Las tres o cuatro cosas que HOY tiene que contar en TU area van escritas en tu encargo, al final. Son esas y no otras.

ESAS TRES O CUATRO COSAS DE TU ÁREA VAN TODAS, Y NINGUNA EN MEDIA LÍNEA. Son lo que la persona ha venido a leer de esta parcela de su vida, y un punto resuelto de paso es un punto que no está. Sitio hay: el espacio que ocupa HOY se reparte entre ellas y ninguna se queda en el aire. Lo que nunca se recorta para que quepan es lo que va en su propia casilla, que es la escena, los dos remates, la pregunta y el cierre.
Y LOS RASGOS QUE TE LLEGAN AL FINAL DEL ENCARGO NO SE SUMAN A ESTOS PUNTOS, LOS LLENAN. No son apartados nuevos que haya que meter además: cada uno de ellos responde a uno de estos puntos, y contándolo por dentro del punto que le toca lo estás contando entero. Un rasgo suyo del amor no es un tema aparte que vaya al lado: es la respuesta a cómo eres en el amor. Por eso caben los dos: son la misma cosa contada una sola vez.

ESCENA — la escena real obligatoria, tal como pide la sección ESCENA REAL OBLIGATORIA. Va en su casilla, y detrás de qué bloque se lee lo eliges tú en "tras_bloque": en unas áreas pronto y en otras más adelante, nunca en el mismo sitio en las siete. Lo que no es nunca es lo primero que se lee: delante van igualmente el arranque que sitúa el área y la frase que presenta la escena.

ORIGEN — POR QUÉ ES ASÍ Y DE DÓNDE VIENE, con puente causal explícito hasta hoy. No basta con decir que es así: hay que unir el porqué con lo que hace hoy, como causa y efecto, para que entienda el PORQUÉ y no solo el qué.
Y AQUÍ ES DONDE SE JUEGA EL PRODUCTO ENTERO. Su carta dice CÓMO está hecha, no lo que le pasó: no sabes cómo era su casa, ni qué vio de pequeña, ni qué le dijeron, ni a qué edad. Así que su pasado NO SE AFIRMA NUNCA, ni siquiera con un "puede que fuera": nada de "aprendiste", "de pequeña", "creciste", "en tu casa", "tu madre", "esa niña de siete años". Ha pagado por leer lo suyo, y en cuanto lee una frase de una vida que no ha vivido deja de creerse el estudio entero y no vuelve a comprar.
El origen que sí es verdad es este: viene de serie con ella, es la manera en la que está montada desde que llegó al mundo. Y el puente hasta hoy tiene esta forma: "esto lo traes puesto de siempre, te funcionó, y de tanto funcionarte se volvió automático, hasta el punto de que hoy lo haces sin decidirlo". La forma es esa, las palabras las pones tú y cambian en cada área.
UNA SOLA EXPLICACIÓN, NO VARIAS. Eliges el origen que mejor lo explique todo y lo desarrollas a fondo: la situación concreta, qué concluiste tú de aquello, y qué haces hoy por haberlo concluido. Está PROHIBIDO apilar dos o tres explicaciones distintas una detrás de otra, aunque cada una sea buena por separado: se lee como relleno para llegar a las palabras que faltan, y ninguna acaba de calar. Si de ese único origen salen dos consecuencias en tu vida de hoy, cuéntalas, eso es desarrollarlo; lo que no vale es empezar de cero con otra explicación distinta.

CREENCIAS — LO QUE SOSTIENE EL PATRÓN. Lo que das por cierto sin haberlo puesto en duda nunca y que hace que todo lo demás se repita solo. Aquí va la verdad incómoda, la frase exacta que le escuece leer porque no la puede negar. Después de HOY, es el punto que más sitio ocupa.

SOLTAR — QUÉ TIENES QUE SOLTAR. Solo NOMBRAR la creencia concreta que tiene que caer. Nada más. Ni pasos, ni ejercicios, ni plan, ni "empieza por", ni por dónde, ni cómo hacerlo. El cómo es otro producto y aquí sobra. Es el punto más corto de todos.

CIERRE — el cierre, tal como pide la sección CIERRE DE CADA ÁREA. Además tiene que salir del contenido concreto de ESTA área y de ESTA persona: si ese mismo cierre pudiera ir al final de cualquiera de las otras seis áreas, no vale y lo reescribes.

SIN SOLAPE ENTRE LOS SEIS BLOQUES:
Cada bloque cuenta una cosa y solo una, y lo que ya has dicho en uno no se repite en otro. Lo de hoy va en HOY y no reaparece dentro de CREENCIAS. El pasado sale únicamente en ORIGEN. La escena lleva delante la frase que la abre y detrás la que la recoge, tal como pide LA ESCENA SE PRESENTA, NO SE SUELTA; lo que no se hace es explicarla ni contar otra vez por dentro lo que acaba de verse. SOLTAR no vuelve a explicar la creencia, solo la nombra. El cierre no es un resumen de nada de lo anterior. Si al escribir un bloque notas que estás diciendo otra vez algo que ya contaste, córtalo y sigue adelante: no sobra sitio para repetirse en ninguna de las áreas.

EL ORDEN DE LOS BLOQUES:
Los cinco bloques de texto se leen siempre en el mismo orden, y no lo pones tú: lo pone el código. Es el arranque, HOY, ORIGEN, CREENCIAS, SOLTAR, y el CIERRE al final. Es la lógica de siempre: qué te pasa, de dónde te viene, qué creencia lo sostiene, qué se cae. Escribe cada bloque enganchado con el que va antes, porque así es exactamente como se va a leer.

Lo que cambia de un área a otra, y ahí no puede haber dos iguales, es dónde caen la escena, los dos remates y la pregunta: eso lo eliges tú en "tras_bloque". Las siete áreas se leen seguidas dentro del mismo informe, así que si en todas las pones en el mismo sitio, el estudio deja de parecer escrito para esa persona y empieza a parecer una plantilla rellenada.

NADA DE FRASES MOLDE:
Como las siete áreas van juntas, cualquier fórmula que repitas en todas canta al leerlas del tirón. La lógica de fondo se mantiene siempre (qué te pasa, de dónde viene, qué creencia lo sostiene, qué se cae), lo que cambia en cada área es cómo se dice, con qué palabras y con qué ejemplos suyos. Quedan PROHIBIDAS estas fórmulas y cualquier variante suya:
- "el bucle es siempre el mismo", "el patrón es siempre el mismo", "y así una y otra vez"
- "lo que tienes que soltar es", "lo que te toca soltar es", "toca soltar"
- "el día que ... todo cambia", "el día que ... todo empieza", "cuando entiendas esto, todo cambia". Lo que queda prohibido es la promesa vacía del "todo cambia", no que le enseñes lo que se le abre: eso vale siempre que sea concreto y suyo, y que las siete áreas no lo digan con las mismas palabras
No las cambies por otra fórmula fija: dilo cada vez de una manera distinta, que salga de lo que acabas de contar y no de una plantilla.

CIERRE DE CADA ÁREA (OBLIGATORIO):
El área termina con un párrafo de cierre potente, no con una frase suave o vaga. El cierre tiene que hacer clic en la cabeza del lector, dejarle pensando, como esa frase que alguien te dice una vez y no se te olvida. Puede ser una verdad directa, una imagen contundente, una paradoja, una frase corta que golpea. No debe ser un resumen, ni un consejo, ni motivación barata. Es la frase que el lector subrayaría si tuviera un lápiz.
EL CIERRE REVELA, NO RECOGE. Tiene que decir algo que no has dicho todavía en el área: el nombre exacto de lo que le pasa, la consecuencia que ella no ha atado, lo que hay debajo de todo lo anterior. Si el cierre se pudiera escribir habiendo leído solo el primer párrafo, no vale. Y si al leerlo la persona piensa "esto ya me lo has dicho", tampoco.
NI SE QUEDA A MEDIAS. Un cierre que apunta a algo sin decirlo deja al lector con la sensación de que falta información, y esa sensación es la contraria a la que buscas. Si nombras lo que le pasa, lo nombras entero: no "el colchón nunca fue el problema", sino qué era el problema.
EL CIERRE CIERRA, Y NO PRESENTA NADA. No anuncia el área siguiente, no insinúa lo que viene después, no deja un hilo colgando "para que pase de página con ganas". Eso convertía el final de cada área en un acertijo: como no se puede nombrar lo que viene, acaba escribiéndose "otra cosa que también cuesta reclamar cuando llega el momento", y el lector se queda sin entender nada justo en la frase que más tenía que llegarle. Cada área termina en sí misma. Quien quiera seguir leyendo, sigue porque lo que acaba de leer le ha gustado.
Y termina con luz, EN ESTE ORDEN Y NO AL REVÉS: primero lo que revela, que es el golpe, y solo después lo que se le abre. Un cierre que empieza por lo que se le abre se ha saltado la revelación, y entonces no es un cierre, es una promesa: se lee, se pasa página y no queda nada.
Esa última frase no es un consejo ni un "tú puedes": es enseñarle la puerta que ella no sabía que estaba ahí. Y las palabras las pones tú, distintas en cada área: si las siete rematan con la misma fórmula se oye el molde, y a la tercera ya sabe cómo va a acabar la frase antes de leerla.

Ejemplos del GOLPE que abre el cierre. Ojo, son solo la primera mitad: detrás de cualquiera de estos va todavía la frase que le enseña lo que se le abre, que es lo que remata el cierre de verdad.
- "Y hasta que no veas eso, vas a seguir buscando fuera lo que lleva años esperándote dentro."
- "Porque en el fondo lo sabes, siempre lo has sabido, solo que mirar para otro lado era más cómodo."
- "Llevas media vida demostrando que vales para no tener que averiguar si es verdad."
Uno entero, con sus dos mitades, es el que ya has visto arriba en ASÍ SUENA CUANDO ESTÁ BIEN: primero el golpe, y detrás la frase que le enseña la puerta.

CADA ÁREA MIRA UNA PARTE DISTINTA DE LA CARTA:
Las siete áreas se escriben por separado y ninguna sabe lo que dicen las otras, así que todas tienden a coger el rasgo más llamativo de la carta y contarlo otra vez con otras palabras. El lector lo nota enseguida: siente que le han dicho lo mismo siete veces y que ha pagado por un solo retrato repetido. Para que eso no pase, cada área lleva escrito qué parte de la carta le toca mirar, y esa es la que manda.
Si el rasgo dominante de la persona también asoma en tu área, no lo cuentas otra vez: cuentas SOLO cómo se nota dentro de esta parcela concreta, con situaciones que solo se dan aquí. La misma persona controladora se nota de una manera con el dinero, de otra en la cama y de otra con su madre: eso es lo que tienes que escribir.
PROHIBIDO que dos áreas expliquen lo mismo, aunque cambies las palabras. Si al terminar el área te das cuenta de que lo que has escrito valdría casi igual para otra de las siete, está mal y se reescribe entera desde la parte de la carta que te toca.

EL DETALLE QUE NO LE VALE A NADIE MÁS:
Un patrón general ("controla todo", "no pide ayuda", "se exige mucho") le vale a media España y no impresiona a nadie. En cada área tiene que haber al menos un detalle tan concreto y tan raro que la persona piense "esto no lo sabe nadie de mí". No es una frase más intensa: es un dato con grano.
Se consigue bajando al detalle físico y cotidiano: la hora exacta a la que te pasa, el objeto que tienes en la mano, la frase textual que te dices por dentro, el gesto que haces sin darte cuenta, lo que haces justo después. Sale de cruzar dos cosas de su carta que casi nadie tiene juntas, no de adornar una idea general.
MAL: "te cuesta pedir ayuda". BIEN: "pides ayuda solo cuando ya lo has resuelto tú, para que quien te la dé no tenga que hacer nada y tú puedas seguir contando que no la necesitaste".

EL DON (OBLIGATORIO EN CADA ÁREA):
Un informe que solo diagnostica deja a la persona tocada y sin ganas de volver. En cada área tiene que haber una parte que le dé aire: lo que esa misma manera de ser te ha dado, lo que haces mejor que casi nadie por ser así, y por qué esa capacidad es rara de verdad.
No es un piropo de paso ni una frase amable al final. Se cuenta con el mismo detalle y la misma concreción que lo que le duele, con su situación y su ejemplo, y ocupa un sitio parecido dentro del área.
No es "pero también tienes cosas buenas". Es la otra cara exacta de lo que acabas de contarle: esa misma cualidad que te pesa es la que te hace buena en algo concreto, y tiene que quedar claro que sin ella no tendrías esa capacidad.

QUE LO SIENTA, NO SOLO QUE LO ENTIENDA:
Un área puede estar perfectamente analizada y dejar al lector frío. Eso es exactamente lo que no sirve: entiende lo que le dices, asiente, pasa de página y no le ha pasado nada por dentro. Tiene que haber un momento en cada área en el que se le encoja algo, ese "por fin alguien lo dice" que hace que se le salten las lágrimas o que tenga que parar de leer un segundo.
No se consigue subiendo el volumen ni poniendo frases más dramáticas. Se consigue así: en lugar de explicarle el patrón desde fuera, la metes dentro. Presente, no pasado. Su cuerpo, no su psicología: lo que se te tensa, lo que haces con las manos, lo que te pasa en el pecho, lo que dices en voz alta y lo que te callas justo después. Y cuando ya está dentro, una frase corta que le pone nombre a lo que lleva años sintiendo sin saber decirlo.
La prueba: si lo lees en voz alta y no te cambia la respiración, no está. Y si lo que has escrito se lo podrías leer a otra persona y también le tocaría, tampoco está.

LAS FRASES QUE REMATAN:
Cada área lleva dos como mínimo, y si el texto pide una tercera, va. Lo que no se hace es rellenar con frases grandes: se imprimen centradas y a cuerpo mayor, así que un área con cinco o seis se lee troceada, como una sucesión de carteles con texto pequeño entre medias.
La de la HERIDA nombra lo que le duele sin anestesia y sin salida amable. Es la que le escuece leer porque no la puede negar.
La de la FUERZA nombra lo que tiene de raro y de valioso, con la misma contundencia y sin rebajarla con un "pero" ni con un "aunque". No es un consuelo detrás del golpe: es otro golpe, del otro lado.
DÓNDE VA CADA UNA, QUE ES LO QUE MÁS SE FALLA. No se colocan para repartir la página: cada una sale de lo que acabas de contarle y va justo detrás de contárselo. La de la herida detrás de la creencia que la sostiene, la de la fuerza detrás de haberle enseñado su don. Puesta donde no toca no remata nada, solo corta el texto por la mitad.
No van seguidas ni en el mismo párrafo, y ninguna es el cierre del área. Si al terminar solo hay una de las dos, está a medias.

EL ARRANQUE DE CADA ÁREA:
Un área se lee como un capítulo, y un capítulo no empieza en mitad de la frase. Pero es un capítulo SIN TÍTULO PROPIO: el título ya va impreso arriba en la página, así que el PRIMER párrafo del área no lleva ladillo nunca. Empieza por la primera frase de la entradilla. Entrar de golpe con una afirmación seca sobre ella en la primera línea da un frenazo: el lector acaba de pasar de página, todavía no sabe de qué le van a hablar, y ya le están diciendo algo suyo.
Se abre ancho y se cierra sobre ella. Dos o tres frases que sitúan el tema desde fuera y solo entonces se estrechan hasta ella. Lo que NO se dice aquí es por dónde se abre: eso lo lleva escrito cada área en POR DÓNDE VA ESTA ÁREA, y por eso ninguna entra igual que otra. Si aquí se pusiera la puerta, las siete cogerían la misma.
Y AUN ASÍ SIGUEN ENTRANDO IGUAL, porque lo que se repite no es por dónde abren, es CÓMO. En el último informe seis de las siete abrieron con la misma forma: "hay personas que...", "hay gente que...", "hay quien...", "hay un gesto que...", "en cualquier grupo hay una persona que...". Leídas seguidas son la misma frase con distinto relleno, y para la tercera ya sabe cómo empieza la siguiente.
Así que ESA FORMA NO SE USA: nada de empezar por "hay" ni por "casi todo el mundo" ni por "la mayoría de la gente". Se abre igual de ancho, pero entrando de otra manera cada vez: por un dicho que todo el mundo repite, por una escena contada en presente, por una pregunta, por dos maneras opuestas de hacer lo mismo, por un objeto o una cifra. Tu área lleva la suya escrita en POR DÓNDE VA ESTA ÁREA.
Lo que sí vale para las siete es el movimiento: ancho primero, y en dos o tres frases ya estás en ella. Las palabras las pones tú.
Que sitúe no significa que anuncie: sigue estando PROHIBIDO decir lo que vas a contar ("en esta parte vamos a ver", "hay algo que tienes que entender").
Y es la ÚNICA parte del área donde vale algo que le pasa a mucha gente, precisamente porque en dos frases se estrecha hasta ella y deja de valerle a nadie más. En cuanto has entrado en ella vuelve a mandar la regla de siempre: nada que le pudieras leer a otra persona y también le tocara.
Las siete van seguidas, así que ninguna abre como otra. NO ELIJAS TÚ POR DÓNDE: cada área lleva escrita su puerta al final de su encargo, en POR DÓNDE VA ESTA ÁREA, y es la que usas. Si eliges tú, las siete acaban entrando por el mismo sitio, porque las siete leen esto mismo. Y ninguna empieza por "hay algo", "hay una escena" ni "imagina que".

CÓMO SE ENTREGA EL ÁREA (ES LO QUE LA MAQUETA):
El área no se entrega como un texto seguido: se entrega por casillas, y cada casilla se imprime distinta. Novecientas palabras del mismo tamaño y del mismo color son cuatro páginas de muro gris, y el ojo se cansa antes de llegar a lo que la persona ha pagado.

- El texto del área va en la casilla "bloques", y dentro hay una lista por cada bloque: arranque, hoy, origen, creencias y soltar. Cada lista son los párrafos de ESE bloque, y ninguna se queda vacía. Dentro de cada una pones los párrafos que ese bloque necesite, con la medida que te piden más abajo. No los ordenas ni los colocas: se leen siempre en ese orden y de eso se encarga el código.
- CUÁNTOS PÁRRAFOS LLEVA CADA BLOQUE, que es de donde sale que el área llegue a sus palabras: hoy lleva CUATRO o más, que es el bloque más largo; creencias TRES o más; origen DOS o más; el arranque UNO o dos; soltar UNO. Once párrafos es el suelo de un área normal, no el techo: si te faltan palabras, añades párrafos dentro de los bloques que más den de sí, nunca engordando los que ya tienes.
- AQUÍ, Y SOLO AQUÍ, VAN LAS NEGRITAS, marcadas con dos asteriscos a cada lado, tal como pide RESALTA EN NEGRITA: son frases o medias frases del propio párrafo, nunca una palabra suelta. Cada párrafo lleva su texto y, si le toca, un ladillo encima de tres a cinco palabras. El PRIMER párrafo del área nunca lleva ladillo: la página ya trae el título del área impreso arriba. Un ladillo cada 250 o 300 palabras, así que en un área normal llevan ladillo tres de ellos y en el ÁREA 1, que es más larga, cuatro. El ladillo sale del párrafo que tiene justo debajo y de nadie más: coge la imagen, el gesto o la frase concreta que acabas de contar de ESTA persona y la dice en pequeño. NO es el nombre de un bloque ("HOY", "EL ORIGEN") y NO anuncia lo que viene. Si ese mismo ladillo pudiera ir en el área de otro cliente, no vale.
- escena: la escena real obligatoria, tal como pide ESCENA REAL OBLIGATORIA. No lleva negritas dentro. Va escrita aquí y en ningún sitio más: NO la repitas dentro de los bloques de texto. Y aquí va la escena de verdad, escrita entera: una casilla no se rellena nunca con una palabra de relleno ni con un aviso de que falta algo, porque eso se imprime tal cual en el estudio del cliente.
- remate_herida y remate_fuerza: las dos frases que rematan, tal como pide LAS FRASES QUE REMATAN. Cada una es UNA frase de treinta palabras como mucho, se imprime grande y centrada, y no lleva negritas.
- pregunta: la pregunta directa, tal como pide PREGÚNTALE DIRECTAMENTE. Una sola frase, y no lleva negritas.
- cierre: el último párrafo del área, tal como pide CIERRE DE CADA ÁREA. Va sin nada detrás.

DÓNDE VA CADA COSA, QUE ES LA MITAD DEL TRABAJO:
La escena, los dos remates y la pregunta llevan "tras_bloque", que dice detrás de qué bloque se leen: arranque, hoy, origen o creencias. Esa elección es tuya y es donde de verdad se decide cómo se lee el área.
- Cada uno sale de lo que acabas de contar en el bloque que tiene delante, y el texto sigue después. El lector viene leyendo, se encuentra la frase, y continúa. Si la quitas, lo de antes y lo de después tienen que seguir enganchados igual. La de la herida detrás de la creencia que la sostiene, la de la fuerza detrás de haberle enseñado su don.
- Detrás de SOLTAR no va ninguna: ahí solo va el cierre. Por eso no está entre las opciones.
- Cada una detrás de un bloque DISTINTO: si pones dos detrás del mismo, entre ellas no queda texto y se leen como un cartel puesto en medio del área.
- Y en cada área las pones en sitios distintos: la escena puede ir pronto en una y en mitad en otra. Las siete se leen seguidas, así que si todas llevan las cosas en el mismo sitio, el estudio se lee a plantilla.

Las casillas son para maquetar: el cliente no ve ningún nombre de casilla, ve su estudio. Y NUNCA escribas corchetes ni marcas dentro del texto: eso ya no hace falta, cada cosa va en su sitio.

PROHIBICIONES ABSOLUTAS:
- No repetir el título del área en el texto
- No causas vagas sin explicar cómo y cuándo
- No frases de autoayuda ni coaching
- No decir qué debe hacer la persona: ni pasos, ni ejercicios, ni plan, ni "empieza por". Enseñarle lo que se le abre cuando algo deje de mandarla no es decirle qué hacer, es enseñarle una puerta, y eso sí va
- PROHIBIDO empezar párrafos con "La verdad incómoda es", "Tienes que soltar", "Esto ocurre porque", "Esto empezó cuando" u otras fórmulas repetitivas
- PROHIBIDO escribir párrafos de más de 7 líneas. Parte en 2 si hace falta
- PROHIBIDO enumerar o anunciar cuántas cosas vienen ("son tres", "el primero", "la segunda")
- PROHIBIDO que un párrafo empiece un tema nuevo sin engancharlo con el anterior
- PROHIBIDO que todas las frases midan parecido. Ni todas largas ni todas cortas
- PROHIBIDO comprimir el texto para que quepa. Si sobra, se quita contenido entero
- PROHIBIDO retorcer una frase o usar un verbo raro para que suene literario. Si no lo diría una persona hablando, se reescribe
- PROHIBIDO apilar varias explicaciones del origen. Una sola, bien desarrollada
- PROHIBIDO que todos los párrafos midan casi lo mismo. La variedad es obligatoria
- PROHIBIDO poner escenas tontas, genéricas o abstractas. Si no es específica y visual, no vale
- PROHIBIDO cerrar un área con una frase suave o vaga. El cierre golpea primero y solo despues abre: el golpe nunca se cambia por la luz, van los dos y en ese orden
- PROHIBIDO contar en tu área lo mismo que gobierna otra. Mira la parte de la carta que te toca
- PROHIBIDO quedarse en el patrón general. Sin un detalle que solo le valga a ella, el área no vale
- PROHIBIDO un área que solo diagnostique. Sin el don contado a fondo, el área no vale
- PROHIBIDO empezar un área con "imagina que" o parecidos. Y por "hay...", tampoco: ver EL ARRANQUE DE CADA ÁREA
- PROHIBIDO un área que se entienda pero no se sienta. Sin el momento que le toca por dentro, no vale
- PROHIBIDO dejar una casilla vacía: los cinco bloques de texto, la escena, los dos remates, la pregunta y el cierre van siempre
- PROHIBIDO rellenar una casilla con una palabra de relleno o con un aviso de que falta algo. Lo que escribas ahí se imprime tal cual en el estudio del cliente
- PROHIBIDO copiar el texto de la escena dentro de los bloques de texto. Va en su casilla y solo en su casilla
- PROHIBIDO escribir corchetes dentro del texto: cada cosa va en su casilla y no hay nada que marcar
- PROHIBIDO rematar solo la herida. Van los dos remates, el de la herida y el de la fuerza
- PROHIBIDO un cierre que resuma lo ya contado o que insinúe algo sin llegar a decirlo
- PROHIBIDA cualquier palabra técnica en el texto del cliente: nombres de planetas, casas, signos, aspectos, "carta natal", "tu signo". Le prometemos un estudio que se entiende sin saber nada de astrología, y una sola de esas palabras rompe esa promesa. La carta guía lo que escribes por dentro; fuera se traduce a su vida`;

  const AREAS = [
    {
      id: 1,
      prompt: `Genera ÚNICAMENTE el ÁREA 1 — IDENTIDAD para esta persona: quién es por dentro y cómo se vive a sí misma.

LA PARTE DE LA CARTA QUE TE TOCA MIRAR EN ESTA ÁREA: el Sol, el Ascendente y el planeta que rige su signo, lo que caiga en la casa 1, y TODOS los aspectos del Sol, incluidos los que hace con Saturno, Pluton y Neptuno: el Sol con Saturno es lo que hace sentir que hay que ganarse el sitio, y contado tambien en el area 3 saldria dos veces en el mismo estudio. Esto es informacion interna para ti, no un contenido: te dice DE DONDE sacas lo que cuentas, y esas palabras no se escriben nunca en el texto que lee la persona.
Eso es el EJE del area, no una valla. Para explicarlo cruzas todo lo que haga falta del resto de su carta, igual que se hace de verdad: un rasgo casi nunca sale de un solo sitio, sale de dos o tres cosas que se combinan. Lo que no puedes es contar lo que gobierna otra area, ni repetir aqui lo que alli se explica entero. La regla es sencilla: si lo que escribes habla de ESTA parcela de su vida, entra, venga de donde venga en la carta.
Y el area no se sostiene sobre un solo rasgo repetido con otras palabras. Tiene que haber varias cosas distintas de ella dentro, que no se solapen entre si, porque una persona no es una sola cosa: si todo el area gira sobre la misma idea, se lee corta aunque tenga las palabras justas.

Esta es la PRIMERA area del estudio, asi que su arranque no abre solo el area: abre el libro entero. Es lo primero que lee de si misma despues de pagar, y ahi decide si sigue leyendo o lo deja.
Asi que EMPIEZA COMO EMPIEZA UNA HISTORIA QUE LE VAS A CONTAR, no como empieza un informe. Se entra despacio, por lo que se ve, contandolo y dejandola mirar, sin decirle todavia que va de ella. Cuando lleve unas lineas dentro y ya se haya olvidado de que esta leyendo, entonces si: entonces le dices que esa de la que hablas es ella. Nada de soltarle una verdad suya en la primera linea, que ahi no hay nada delante que la sostenga y le pega un frenazo.

LAS CUATRO COSAS QUE HOY TIENE QUE CONTAR EN ESTA AREA, cada una sacada de su carta y ninguna afirmada de pasada:
Cómo funcionas por dentro: por dónde te entra lo que te pasa y qué haces con ello, qué te ocurre primero y qué después, y qué consecuencia tiene ese orden en lo que haces por fuera. Es lo que le pone nombre a tu manera de funcionar y lo que se lleva puesto al terminar de leer.
Lo que se te da bien de verdad: tus fortalezas reales, sobre todo las que tú no pondrías primero si te preguntaran. Sin esto el área se convierte en un repaso de defectos y la persona cierra el informe tocada.
Los puntos ciegos que no ves: lo que haces y no registras como un problema, o que registras al revés, como si fuera una virtud. Es lo único del área que le cuenta algo que no sabía, así que aquí no te quedes en lo cómodo.
Qué muestras, qué ocultas y qué contradicciones tienes: la distancia entre la persona que enseñas y la que guardas, y las cosas tuyas que no encajan entre sí y conviven igual. Es lo que hace que el texto suene a ella y no a un perfil que le valdría a cualquiera.
Esas cuatro cosas no se solapan entre ellas y ninguna vuelve a aparecer más adelante.

No pongas título de área ni encabezado: el título ya va impreso en la página. Rellena todas las casillas: los cinco bloques de texto con sus párrafos y sus ladillos, la escena, los dos remates, la pregunta y el cierre. Entre 1.100 y 1.300 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
    {
      id: 2,
      prompt: `Genera ÚNICAMENTE el ÁREA 2 — PATRONES para esta persona: qué repite una y otra vez sin darse cuenta.

LA PARTE DE LA CARTA QUE TE TOCA MIRAR EN ESTA ÁREA: los Nodos (el Sur, lo que repite en automatico, y el Norte, hacia donde no va), lo que caiga en las casas 6 y 9, y las configuraciones en las que un mismo planeta recibe varios aspectos a la vez, que es lo que hace que una cosa se repita sola. La casa 6 es el dia a dia, donde el automatismo se ve funcionando; la casa 9 es lo que da por cierto sobre como va la vida, que es de donde sale que el automatismo no se cuestione nunca. Los aspectos duros de Saturno, Pluton y Neptuno a los planetas personales NO son de aqui, son del area 3. Esto es informacion interna para ti, no un contenido: te dice DE DONDE sacas lo que cuentas, y esas palabras no se escriben nunca en el texto que lee la persona.
Eso es el EJE del area, no una valla. Para explicarlo cruzas todo lo que haga falta del resto de su carta, igual que se hace de verdad: un rasgo casi nunca sale de un solo sitio, sale de dos o tres cosas que se combinan. Lo que no puedes es contar lo que gobierna otra area, ni repetir aqui lo que alli se explica entero. La regla es sencilla: si lo que escribes habla de ESTA parcela de su vida, entra, venga de donde venga en la carta.
Y el area no se sostiene sobre un solo rasgo repetido con otras palabras. Tiene que haber varias cosas distintas de ella dentro, que no se solapen entre si, porque una persona no es una sola cosa: si todo el area gira sobre la misma idea, se lee corta aunque tenga las palabras justas.

LAS CUATRO COSAS QUE HOY TIENE QUE CONTAR EN ESTA AREA, cada una sacada de su carta y ninguna afirmada de pasada:
Cuáles son tus patrones: los que de verdad te gobiernan la vida, contados de forma concreta y reconocible, no uno genérico que le valdría a cualquiera.
Qué los enciende: la situación exacta que los dispara, la que hace saltar el automatismo antes de que te des cuenta. Es lo que hace que se reconozca al leerlo.
Dónde acabas siempre: el mismo punto de llegada al que vuelves una vez tras otra, por caminos distintos y con gente distinta. Es donde ve que el patrón existe de verdad.
Qué ganas con ellos: de qué te protegen, qué te evitan, qué te ahorras cada vez que los repites. Mientras no vea eso, va a seguir creyendo que es cuestión de fuerza de voluntad.
Lo que gana con el patrón va aquí; la creencia que lo sostiene va más adelante, en su sitio, y no se cuenta dos veces.

No pongas título de área ni encabezado: el título ya va impreso en la página. Rellena todas las casillas: los cinco bloques de texto con sus párrafos y sus ladillos, la escena, los dos remates, la pregunta y el cierre. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
    {
      id: 3,
      prompt: `Genera ÚNICAMENTE el ÁREA 3 — MIEDOS para esta persona: el miedo que gobierna su vida sin que lo nombre.

LA PARTE DE LA CARTA QUE TE TOCA MIRAR EN ESTA ÁREA: Saturno, Plutón y Neptuno, y lo que caiga en la casa 12, con los aspectos duros de esos tres a los planetas personales, MENOS al Sol y a la Luna: los del Sol con estos tres son del area 1 y los de la Luna son del area 4, y la Luna con Saturno o con Pluton es el aspecto que mas se repite en las cartas duras, asi que si lo cuentas aqui saldra contado dos veces en el mismo estudio. Esto es informacion interna para ti, no un contenido: te dice DE DONDE sacas lo que cuentas, y esas palabras no se escriben nunca en el texto que lee la persona.
Eso es el EJE del area, no una valla. Para explicarlo cruzas todo lo que haga falta del resto de su carta, igual que se hace de verdad: un rasgo casi nunca sale de un solo sitio, sale de dos o tres cosas que se combinan. Lo que no puedes es contar lo que gobierna otra area, ni repetir aqui lo que alli se explica entero. La regla es sencilla: si lo que escribes habla de ESTA parcela de su vida, entra, venga de donde venga en la carta.
Y el area no se sostiene sobre un solo rasgo repetido con otras palabras. Tiene que haber varias cosas distintas de ella dentro, que no se solapen entre si, porque una persona no es una sola cosa: si todo el area gira sobre la misma idea, se lee corta aunque tenga las palabras justas.

LAS TRES COSAS QUE HOY TIENE QUE CONTAR EN ESTA AREA, cada una sacada de su carta y ninguna afirmada de pasada:
Cuál es el miedo que te gobierna la vida y qué inseguridad hay debajo: el que manda de verdad por debajo de los que tú nombrarías si te preguntaran, y de qué tienes miedo en el fondo cuando tienes miedo de eso.
Qué te lo dispara y cómo reaccionas cuando aparece: las situaciones concretas que lo encienden, y lo que haces en ese momento sin decidirlo, si te paralizas, si controlas más, si te adelantas, si desapareces.
Qué estás evitando por él y qué te ha costado ya: lo que llevas años sin hacer por ese miedo, y el precio que has pagado sin llevar la cuenta, en oportunidades, en años, en cosas que no dijiste a tiempo.

No pongas título de área ni encabezado: el título ya va impreso en la página. Rellena todas las casillas: los cinco bloques de texto con sus párrafos y sus ladillos, la escena, los dos remates, la pregunta y el cierre. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
    {
      id: 4,
      prompt: `Genera ÚNICAMENTE el ÁREA 4 — HERIDA para esta persona: qué le sigue doliendo hoy y cómo le afecta.

LA PARTE DE LA CARTA QUE TE TOCA MIRAR EN ESTA ÁREA: Quirón y la Luna, lo que caiga en la casa 4, y TODOS los aspectos de la Luna con Quirón, Saturno, Pluton y Neptuno: los cuatro son de esta area y de ninguna otra, para que no se cuenten dos veces. Esto es informacion interna para ti, no un contenido: te dice DE DONDE sacas lo que cuentas, y esas palabras no se escriben nunca en el texto que lee la persona.
Eso es el EJE del area, no una valla. Para explicarlo cruzas todo lo que haga falta del resto de su carta, igual que se hace de verdad: un rasgo casi nunca sale de un solo sitio, sale de dos o tres cosas que se combinan. Lo que no puedes es contar lo que gobierna otra area, ni repetir aqui lo que alli se explica entero. La regla es sencilla: si lo que escribes habla de ESTA parcela de su vida, entra, venga de donde venga en la carta.
Y el area no se sostiene sobre un solo rasgo repetido con otras palabras. Tiene que haber varias cosas distintas de ella dentro, que no se solapen entre si, porque una persona no es una sola cosa: si todo el area gira sobre la misma idea, se lee corta aunque tenga las palabras justas.

LAS TRES COSAS QUE HOY TIENE QUE CONTAR EN ESTA AREA, cada una sacada de su carta y ninguna afirmada de pasada:
Cuál es la herida y qué te la reabre hoy: qué se te rompió y qué te sigue faltando desde entonces, y las situaciones concretas de tu vida de ahora que te la vuelven a tocar.
Cómo te proteges cuando se reabre, y qué te estás perdiendo por protegerte así: lo que haces en ese momento para que no te vuelva a doler, y lo que esa misma protección te está dejando fuera.
Qué necesitas de verdad en ese momento: ponerle nombre a lo que llevas años sintiendo sin saber decirlo, y qué acabas haciendo con esa necesidad.

No pongas título de área ni encabezado: el título ya va impreso en la página. Rellena todas las casillas: los cinco bloques de texto con sus párrafos y sus ladillos, la escena, los dos remates, la pregunta y el cierre. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
    {
      id: 5,
      prompt: `Genera ÚNICAMENTE el ÁREA 5 — AMOR para esta persona: cómo vive las relaciones de pareja.

LA PARTE DE LA CARTA QUE TE TOCA MIRAR EN ESTA ÁREA: Venus y Marte, y lo que caiga en las casas 5 y 7, con los aspectos entre Venus y Marte. Esto es informacion interna para ti, no un contenido: te dice DE DONDE sacas lo que cuentas, y esas palabras no se escriben nunca en el texto que lee la persona.
Eso es el EJE del area, no una valla. Para explicarlo cruzas todo lo que haga falta del resto de su carta, igual que se hace de verdad: un rasgo casi nunca sale de un solo sitio, sale de dos o tres cosas que se combinan. Lo que no puedes es contar lo que gobierna otra area, ni repetir aqui lo que alli se explica entero. La regla es sencilla: si lo que escribes habla de ESTA parcela de su vida, entra, venga de donde venga en la carta.
Y el area no se sostiene sobre un solo rasgo repetido con otras palabras. Tiene que haber varias cosas distintas de ella dentro, que no se solapen entre si, porque una persona no es una sola cosa: si todo el area gira sobre la misma idea, se lee corta aunque tenga las palabras justas.

LAS CUATRO COSAS QUE HOY TIENE QUE CONTAR EN ESTA AREA, cada una sacada de su carta y ninguna afirmada de pasada:
Cómo eres en el amor: cómo te comportas cuando quieres a alguien de verdad, cómo lo demuestras, cuánto te entregas y cuánto te guardas, y qué te pasa con el deseo y con la intimidad.
Qué tipo de persona atraes y por qué: quién se te acerca una y otra vez, qué tienen en común esas personas, y qué te da alguien así que tú no te estás dando.
Qué necesitas de la otra persona para sentirte querida y qué te enamora: lo que te hace falta para bajar la guardia, y lo que te engancha de alguien, que no siempre es lo mismo.
Dónde falla siempre y por qué: el punto exacto en el que la relación se tuerce, el momento que se repite en una historia tras otra, y qué haces tú ahí sin darte cuenta.
Dónde falla se cuenta aquí como lo que pasa, con hechos y momentos concretos; la idea que da por cierta y que hace que se tuerza ahí va más adelante, en su sitio, y no se cuenta dos veces.

No pongas título de área ni encabezado: el título ya va impreso en la página. Rellena todas las casillas: los cinco bloques de texto con sus párrafos y sus ladillos, la escena, los dos remates, la pregunta y el cierre. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
    {
      id: 6,
      prompt: `Genera ÚNICAMENTE el ÁREA 6 — RELACIONES para esta persona: cómo se vincula con los demás fuera de la pareja.

LA PARTE DE LA CARTA QUE TE TOCA MIRAR EN ESTA ÁREA: Mercurio y Urano, y lo que caiga en las casas 3 y 11, con los aspectos de Mercurio. Esto es informacion interna para ti, no un contenido: te dice DE DONDE sacas lo que cuentas, y esas palabras no se escriben nunca en el texto que lee la persona.
Eso es el EJE del area, no una valla. Para explicarlo cruzas todo lo que haga falta del resto de su carta, igual que se hace de verdad: un rasgo casi nunca sale de un solo sitio, sale de dos o tres cosas que se combinan. Lo que no puedes es contar lo que gobierna otra area, ni repetir aqui lo que alli se explica entero. La regla es sencilla: si lo que escribes habla de ESTA parcela de su vida, entra, venga de donde venga en la carta.
Y el area no se sostiene sobre un solo rasgo repetido con otras palabras. Tiene que haber varias cosas distintas de ella dentro, que no se solapen entre si, porque una persona no es una sola cosa: si todo el area gira sobre la misma idea, se lee corta aunque tenga las palabras justas.

LAS TRES COSAS QUE HOY TIENE QUE CONTAR EN ESTA AREA, cada una sacada de su carta y ninguna afirmada de pasada. Aquí no se habla de pareja ni de amor, que es el área 5: aquí van los amigos, la familia, los compañeros de trabajo y los grupos.
Qué papel ocupas siempre sin decidirlo: el sitio que acabas ocupando con los demás una y otra vez, sin haberlo elegido y casi sin darte cuenta de que lo ocupas.
Qué pasa con lo que das y lo que recibes: si la balanza te sale igualada o no, cuánto sostienes tú y cuánto te sostienen a ti, y qué haces cuando esa cuenta no te cuadra.
En qué dinámicas acabas metida una y otra vez: el tipo de relación que se te repite con gente distinta, y qué se repite dentro de ti cada vez que vuelve a pasar.

No pongas título de área ni encabezado: el título ya va impreso en la página. Rellena todas las casillas: los cinco bloques de texto con sus párrafos y sus ladillos, la escena, los dos remates, la pregunta y el cierre. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
    {
      id: 7,
      prompt: `Genera ÚNICAMENTE el ÁREA 7 — DINERO para esta persona: cómo se relaciona con el dinero.

LA PARTE DE LA CARTA QUE TE TOCA MIRAR EN ESTA ÁREA: Júpiter, lo que caiga en las casas 2, 8 y 10, con los aspectos de Júpiter. La casa 10 es su sitio de puertas afuera, lo que hace y por lo que se la conoce, y es de esta area porque el dinero de una persona sale de ahi antes que de ningun otro sitio. Esto es informacion interna para ti, no un contenido: te dice DE DONDE sacas lo que cuentas, y esas palabras no se escriben nunca en el texto que lee la persona.
Eso es el EJE del area, no una valla. Para explicarlo cruzas todo lo que haga falta del resto de su carta, igual que se hace de verdad: un rasgo casi nunca sale de un solo sitio, sale de dos o tres cosas que se combinan. Lo que no puedes es contar lo que gobierna otra area, ni repetir aqui lo que alli se explica entero. La regla es sencilla: si lo que escribes habla de ESTA parcela de su vida, entra, venga de donde venga en la carta.
Y el area no se sostiene sobre un solo rasgo repetido con otras palabras. Tiene que haber varias cosas distintas de ella dentro, que no se solapen entre si, porque una persona no es una sola cosa: si todo el area gira sobre la misma idea, se lee corta aunque tenga las palabras justas.

Esta es la última área del estudio, así que su cierre cierra el estudio entero, no solo el área.

LAS TRES COSAS QUE HOY TIENE QUE CONTAR EN ESTA AREA, cada una sacada de su carta y ninguna afirmada de pasada:
Qué significa el dinero para ti y qué te mueve a ganarlo: qué representa de verdad en tu cabeza, más allá de los números, y qué es lo que te empuja a querer más o a conformarte.
Qué haces con él cuando lo tienes: cómo lo gastas, cómo tomas las decisiones de dinero, y cómo llevas el riesgo cuando hay algo en juego.
Qué te bloquea para ganar más y qué pasa cuando empieza a irte bien: el techo con el que te encuentras una y otra vez, incluido lo que haces en el trabajo cuando toca pedir o cobrar lo que vales, y qué te ocurre justo cuando las cosas empiezan a salirte.

No pongas título de área ni encabezado: el título ya va impreso en la página. Rellena todas las casillas: los cinco bloques de texto con sus párrafos y sus ladillos, la escena, los dos remates, la pregunta y el cierre. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
  ];

  const contextoPersona = `Persona:
Nombre completo: ${nombre}
Nombre de pila: ${nombrePila}
Sexo: ${sexo}
Fecha de nacimiento: ${fechaNice}
Hora: ${hora}
Lugar: ${lugar}
Edad: ${edad} años

${cartaTexto}`;

  // Lo ultimo que lee el modelo antes de escribir. Las reglas de detalle
  // estaban solo en el prompt de sistema, que son 150 lineas, y se le perdian:
  // en el informe del 22 de agosto el nombre no aparecio ni una vez en las
  // siete areas, habia 89 comas antes de "y" y cuatro preguntas en 21 paginas.
  // Aqui, pegadas a la orden concreta y en femenino o masculino segun quien
  // sea, pesan mucho mas.
  const trato = sexo === 'mujer'
    ? 'una MUJER. Todo en femenino: sola, cansada, ella misma. Nunca en masculino.'
    : sexo === 'hombre'
      ? 'un HOMBRE. Todo en masculino: solo, cansado, el mismo. Nunca en femenino.'
      : 'una persona que no se identifica como hombre ni como mujer. Evita marcar el genero en los adjetivos, dale la vuelta a la frase cuando haga falta.';

  // POR DONDE ABRE, POR DONDE ENTRA AL EJEMPLO Y POR DONDE CIERRA CADA AREA.
  //
  // EL PROBLEMA. Las siete areas las escriben siete llamadas que no se ven
  // entre ellas, y todas leen el mismo prompt con el mismo ejemplo. Asi que
  // las siete eligen la misma forma. En los dos ultimos estudios:
  //
  //   - las 12 areas abrieron con "Hay personas que..." o "Casi todo el mundo..."
  //   - las 14 escenas empezaron con la hora seca, y 9 de las 14 pasaban a
  //     las once de la noche
  //   - los 14 cierres calcaron la forma del ejemplo del prompt: "No es que
  //     X... el dia que Y, vas a descubrir Z"
  //
  // Pedirle que varie no sirve: las siete leen la misma peticion. Por eso a
  // cada una se le da AQUI su propia forma, y como cada area lee solo la suya,
  // salen distintas sin tener que fiarse de nada.
  //
  // Va en el mensaje, no en el prompt de sistema: cambia por area y el de
  // sistema tiene que ser identico en las siete para que la cache valga.
  //
  // LO QUE NO SE TOCA: que abra ancho y se estreche hasta ella, que la escena
  // sea concreta y suya, y que el cierre revele y ensene la puerta. Eso lo
  // sigue mandando el prompt de siempre. Aqui solo se reparte POR DONDE.
  const MOLDES = {
    1: {
      pregunta: 'poniéndole delante lo que se le abre si deja de hacer eso, en forma de "¿qué pasaría si...?"',
      entra: 'nombrando el rato del que se trata, uno de esos que ni recuerda al día siguiente, y entrando en él sin anunciarlo',
      abre: 'por lo que se ve de una persona desde fuera antes de conocerla, y lo poco que eso cuenta de ella',
      cuando: 'un día cualquiera entre semana, a media mañana',
      cierra: 'con el golpe seco primero, en una frase corta, y la puerta detrás',
    },
    2: {
      pregunta: 'llevándola a la última vez concreta que le pasó, no a la cuenta de todas',
      entra: 'pidiéndole que se acuerde de la última vez que le pasó',
      abre: 'por un gesto pequeño que mucha gente hace sin darse cuenta, contado en dos líneas',
      cuando: 'un rato muerto de tarde',
      cierra: 'con una paradoja suya: dos cosas que no encajan entre sí y que sin embargo son la misma',
    },
    3: {
      pregunta: 'obligándola a elegir entre dos cosas, y que ninguna de las dos sea cómoda',
      entra: 'poniendo la hora y el sitio donde pasa, y ya estamos dentro',
      abre: 'por una pregunta directa al lector, y la respuesta llega en la frase siguiente',
      cuando: 'de madrugada, desvelada',
      cierra: 'nombrando lo que de verdad teme, que no es lo que ella cree que teme',
    },
    4: {
      pregunta: 'preguntándole qué le diría a alguien a quien quiere si hiciera exactamente lo que hace ella',
      entra: 'avisándole de que lo que viene le va a sonar',
      abre: 'por una frase hecha que todo el mundo repite y casi nadie ha pensado del todo',
      cuando: 'un domingo por la tarde',
      cierra: 'con una imagen concreta que se le quede grabada, no con una explicación',
    },
    5: {
      pregunta: 'devolviéndole en pregunta la frase exacta que ella se repite por dentro',
      entra: 'diciéndole que mire lo que hace sin darse cuenta',
      abre: 'por dos maneras opuestas de hacer lo mismo, y ella es una de las dos',
      cuando: 'un fin de semana, de día',
      cierra: 'diciéndole en concreto lo que le está costando eso, con nombre y apellidos',
    },
    6: {
      pregunta: 'preguntándole quién haría por ella lo que ella hace por los demás',
      entra: 'poniéndola a mirarse desde fuera un segundo',
      abre: 'por cómo funciona un grupo cualquiera: una familia, una oficina, unas amigas',
      cuando: 'en mitad de algo, con gente delante',
      cierra: 'poniendo enfrente lo que da y lo que recibe, sin quejarse por ella',
    },
    7: {
      pregunta: 'con una pregunta que solo se puede responder con una cifra concreta',
      entra: 'por la cuenta que ella misma se hace, y detrás el día en que se la hizo',
      abre: 'por un objeto, una cifra o un gesto concreto con dinero',
      cuando: 'a plena luz del día, un día de cobrar o de gastar',
      cierra: 'dándole la vuelta al asunto: lo que parecía ser cosa de dinero resulta que nunca lo fue',
    },
  };

  function losMoldesDeEstaArea(id) {
    const m = MOLDES[id];
    if (!m) return '';
    return `

POR DÓNDE VA ESTA ÁREA (las otras seis van por otro sitio, así que no busques tú la forma: usa esta):
- ABRE ${m.abre}. Sigues abriendo ancho y estrechándote hasta ella en dos o tres frases, como siempre: lo que cambia es la puerta por la que entras.
- EL EJEMPLO ENTRA ${m.entra}. Esa media línea es lo PRIMERO que se lee dentro de la casilla "escena", y NO EMPIEZA POR LA HORA: nada de "Son las once de la noche...", "Es domingo por la tarde...". Las palabras las pones tú, pero la puerta es esa.
- EL EJEMPLO PASA ${m.cuando}. El momento se sitúa detrás de la invitación, nunca delante, y la escena de verdad va después y ocupa lo que tenga que ocupar.
- LA PREGUNTA VA ${m.pregunta}. Y NO EMPIEZA por "¿Cuántas veces...", "¿Cuándo fue la última vez..." ni "¿Cuánto hace que...": esas tres las escribe cualquiera sin pensar, y por eso se repiten de un área a otra.
- CIERRA ${m.cierra}. Y NO EMPIECES EL CIERRE por "No es que...", "No estás cansada de..." ni "No te falta...": esas tres son la forma que sale sola, la usan todas y se lee a plantilla.`;
  }

  // LOS RASGOS QUE LE TOCAN A ESTA AREA, sacados de las dos listas.
  //
  // Las listas son la fuente del estudio: se sacan de la carta ANTES que las
  // areas y cada rasgo lleva puesta su area. Esta area desarrolla los suyos y
  // ninguno mas, y ningun otro area va a tocarlos. Asi lo que lee la clienta en
  // el area y lo que lee en la lista del final es lo mismo, y un rasgo no puede
  // salir contado dos veces en dos sitios distintos.
  //
  // Va en el mensaje, NO en el prompt de sistema: el de sistema es identico en
  // las siete y es el que esta en cache, y meter aqui algo que cambia por area
  // la dejaria sin usar en las siete. Ver calentarLaCache.
  function losRasgosDeEstaArea(listas, id) {
    const mios = [];
    for (const cual of ['fortalezas', 'desafios']) {
      for (const r of (listas && listas[cual]) || []) {
        if (Number(r.area) === id) mios.push({ r, cual });
      }
    }
    if (mios.length === 0) return '';

    const fichas = mios
      .map(({ r, cual }) => `- ${r.nombre} (${cual === 'fortalezas' ? 'fortaleza' : 'desafio'}): ${r.descripcion}`)
      .join('\n');

    return `

LO QUE TE TOCA CONTAR A TI EN ESTA AREA, Y NINGUN RASGO MAS:
${fichas}

Estos ${mios.length} salen de su carta y estan repartidos entre las siete areas: los de aqui son TUYOS y los de las otras seis los estan contando ellas ahora mismo. Van los ${mios.length} y NO ANADES NINGUNO MAS. Si al mirar su carta te llama otro tema con mas fuerza, ese es de otra area: dejalo.
NO SON UN INDICE APARTE, Y ESTO ES LO QUE MAS IMPORTA DE TODA ESTA NOTA. Los puntos que HOY le pide a TU area no se tocan ni se encogen: estos ${mios.length} van POR DENTRO de ellos, cada uno entrando por el punto al que responde. Tratados como temas sueltos que hay que colocar ademas, te comes esos puntos para hacerles sitio y el area se queda sin la mitad de lo que tenia que contar.
EMPIEZA POR LOS PUNTOS, NO POR LA LISTA: coges cada punto de HOY, miras cual de estos lo responde, y lo cuentas ahi a fondo. Y si alguno de estos no cae en ninguno de esos puntos, va igual: entra por el bloque que le toque, pero fuera no se queda.
ESTO ES QUE CONTAR, NO POR DONDE MIRAR. Para explicar cada uno sigues cruzando todo lo que haga falta de su carta, igual que hasta ahora: no es una valla, es el contenido.
Y SI UNO DE ESTOS PARECE SALIR DE UNA PARTE DE LA CARTA QUE ARRIBA SE DA A OTRA AREA, MANDA ESTA LISTA. El rasgo esta puesto aqui y aqui se cuenta: no lo dejes fuera por eso, ni lo cuentes a medias. Lo de arriba te dice donde mirar cuando buscas tu solo; esto te dice lo que hay que contar, y ya esta repartido para que no se cuente dos veces.
Y NO VAN UNO EN CADA BLOQUE. Lo de arriba es HOY, que es donde se cuenta como se le nota; pero un rasgo no se agota ahi. De donde le viene va en ORIGEN y lo que da por cierto por debajo va en CREENCIAS, con los bloques haciendo lo que hacen siempre. Los bloques no cambian de trabajo.
NO SE COPIAN: eso de arriba es una nota para ti, no un texto para ella. Ni el nombre del rasgo ni sus frases se escriben tal cual, ni se presentan como una lista. Lo que ella lee son tus parrafos de siempre.`;
  }

  const recordatorioFinal = `ANTES DE DAR EL AREA POR TERMINADA, REPASA ESTAS, QUE SON LAS QUE MAS SE ESCAPAN:
1. Escribes para ${trato}
2. El nombre "${nombrePila}" aparece UNA o DOS veces en el area, dentro de una frase en la que le hablas de tu, nunca en una que hable de ella en tercera persona y nunca al empezar. Ninguna vez no vale
3. El area lleva negritas dentro del texto de los parrafos, marcadas con **dos asteriscos a cada lado**: frases o medias frases que ella subrayaria con el fosforito, nunca una palabra suelta. Relee solo lo marcado seguido y tiene que sonar a ella contandose a si misma; la que no pase esa prueba se cambia por la que si la pasa, pero el area no se entrega sin ninguna
4. Ademas de la pregunta que va en su casilla, hay tres o cuatro mas repartidas por el texto, en bloques distintos: una cada vez que le pones nombre a algo que le cuesta o a algo que hace sin darse cuenta. Van DENTRO de un parrafo, entre las demas frases, nunca solas: una pregunta que ocupa un parrafo entero sale impresa en grande, y grande solo va la de la casilla
5. Ni una coma antes de "y" salvo que detras venga otra frase con su propio sujeto
6. Hay un detalle que solo le vale a ella, y esta el don contado a fondo
7. Ni una palabra tecnica en el texto. Ni de astrologia -Sol, Luna, Saturno, Venus, Quiron, ascendente, casa 4, cuadratura, trigono, signo, carta natal- ni de terapia -"mecanismo", "patron", "gestionar", "procesar", "vinculo", "autoexigencia", "validacion", "dependencia emocional", "sanar"-. Son tus herramientas, no su vocabulario: si no lo diria ella hablando con una amiga, no va
7b. NI UNA FRASE QUE AFIRME SU PASADO. De su carta sale como esta hecha, no lo que vivio: si aparece "aprendiste", "de pequena", "en tu casa", "creciste" o un "puede que fuera", se reescribe contando lo que le pasa hoy
8. Ningun bloque se queda vacio: el arranque, hoy, origen, creencias y soltar llevan todos sus parrafos. Y si el area no llega a las palabras que te piden, anade parrafos dentro de los bloques, nunca engordes los que ya tienes
8b. ESTAN LAS TRES O CUATRO COSAS QUE HOY LE PIDE A TU AREA, todas, cada una contada de verdad. Cuentalas una por una antes de entregar: si alguna se ha quedado en media linea, esa area no esta terminada
9. Ninguna casilla se queda vacia ni rellena con una palabra de relleno: la escena, los dos remates, la pregunta y el cierre van SIEMPRE y van escritos de verdad
9b. La escena esta escrita SOLO en su casilla. Repasa los bloques de texto: si ahi vuelve a estar la escena, la borras de ahi, que si no sale impresa dos veces
9c. NI UNA FRASE EN TERCERA PERSONA SOBRE ELLA. Relee el primer parrafo y el cierre, que es donde se escapa: si dice "ella", "le", "aprendio", "carga", "va a descubrir" hablando de ella, se reescribe en segunda persona
10. Y MIRA DONDE LAS HAS PUESTO: detras de cada una tiene que quedar texto del area, asi que ninguna va detras del ultimo parrafo, que ahi solo va el cierre. Y nunca dos detras del mismo bloque, que entre ellas tambien tiene que quedar texto
11. Que se note que hay alguien hablandole: tres o cuatro veces en toda el area te paras y le hablas de tu a tu, y antes de nombrarle lo que le pesa le quitas la culpa de encima
12. El area abre situando el tema desde fuera, no de golpe con una frase seca sobre ella. Y el cierre CIERRA: no presenta la siguiente area, no insinua nada, y deja ver que se le abre
13. NI UN PUNTO EN MITAD DE UNA IDEA. Relee el area entera: donde haya un punto y lo de detras sea lo mismo que venias diciendo, no son dos frases, es una partida en dos, y ahi va una coma
14. CADA COSA QUE LE CUENTAS LLEVA SU MOTIVO PEGADO, en la misma frase, para que entienda por que le pasa y no solo que le pasa. Y ese motivo es como esta hecha ella por dentro, nunca algo que le pasara`;

  // Las 7 areas se piden a la vez, asi que un fallo puntual en una sola tumbaba
  // el informe entero y gastaba un intento del cliente. Ahora cada area se
  // reintenta hasta 3 veces cuando el fallo es temporal (saturacion, error del
  // servidor, corte de red). Los fallos permanentes (clave mal, peticion mal
  // formada) no se reintentan: no van a mejorar por repetirlos.
  const INTENTOS_POR_AREA = 3;

  // ── LO QUE HACE QUE UN AREA SE VUELVA A PEDIR AUNQUE HAYA LLEGADO ENTERA ──
  //
  // Dos cosas llevan pedidas desde el principio, estan en el prompt y en el
  // repaso final, y aun asi se colaban: en el informe del 22 de agosto salieron
  // CERO negritas en las siete areas y el nombre aparecio tres veces en total.
  // Hasta ahora las dos se apuntaban en un registro que no lee nadie y el area
  // se entregaba igual. Contarlas y volver a pedir el area es lo unico que ha
  // funcionado con la coma antes de "y", asi que se hace lo mismo aqui.
  //
  // ESTO NO TIRA EL INFORME. Un area sin negritas se lee; una clienta que ha
  // pagado y no recibe nada, no. Por eso el repaso va acotado a REPASOS_POR_ESTILO
  // y, si al final sigue floja, se entrega la que hay y se apunta en el registro.
  //
  // El minimo de negritas es un suelo para detectar el desastre, no una cuota:
  // no decide cuales ni donde, eso lo decide el prompt. Un area de 900 palabras
  // con menos de tres es un muro.
  const MIN_NEGRITAS = 3;
  // Mas largo que esto ya no resalta; es el mismo tope que aplica el saneado.
  const LARGO_MAX_NEGRITA = 200;
  const REPASOS_POR_ESTILO = 1;

  // Lo que tiene que medir un area comparada con la mediana de las siete del
  // mismo informe. Por debajo, se ha quedado sin escribir bloques enteros.
  const PARTE_QUE_TIENE_QUE_TENER = 0.6;

  // Una casilla rellenada por rellenar. En el informe del 22 de agosto la
  // escena del area 6 llego con la palabra "placeholder" dentro y salio
  // impresa en dorado y a pagina entera.
  //
  // El suelo se queda bajo a proposito: aqui NO se juzga si la escena es buena
  // ni si es larga, solo se caza lo que no es texto. Una escena corta se lee;
  // volver a pedirla cuesta dinero y tiempo por algo que no esta roto.
  const MIN_PALABRAS_ESCENA = 12;
  const RELLENO = /^(placeholder|lorem|todo|tbd|pendiente|texto|xxx+|n\s*\/?\s*a|\.+|-+)$/;

  // Ocho palabras seguidas iguales no son una casualidad: es la escena copiada.
  // Paso en tres de las siete areas del mismo informe, y el cliente se la
  // encontro impresa dos veces seguidas, palabra por palabra.
  const PALABRAS_IGUALES = 8;

  // ── LO ULTIMO QUE PASA ANTES DE QUE EL TEXTO EXISTA ───────────────
  //
  // Aqui no se mira de que casilla viene nada. Se mira lo que se va a
  // imprimir, y se quita lo que un cliente no puede leer nunca. Existe porque
  // los guardias por casilla siempre llegan tarde: el 22 de agosto el relleno
  // salio por la escena, el 23 por el cierre, y el 24 salio otra cosa que no
  // era relleno sino el modelo hablando solo.
  //
  // Tres cosas se van:
  //   1. los trozos que son solo una palabra de relleno ("placeholder")
  //   2. todo lo que venga detras de una llave, { o }, que en este texto no
  //      aparecen jamas y solo salen cuando al modelo se le escapa el JSON
  //   3. la frase en la que el modelo se disculpa o habla del formato, que en
  //      el informe del 24 de agosto salio impresa: "...que tu lo fabriques.}
  //      disculpa, corrijo el formato en la respuesta final.},"
  const DISCULPA = /\s*[^.?!¿¡]{0,120}(disculp|perdon|perdón|lo siento|corrijo|corregir)[^.?!]{0,120}(formato|respuesta final|json|casilla|instrucciones)[^.?!]*[.?!]?\s*$/i;

  // EL MODELO PRESENTANDOSE O EXPLICANDO LO QUE HACE.
  //
  // Aqui hay que hilar fino, porque esto BORRA UN PARRAFO ENTERO. La primera
  // version llevaba "lo siento", "perdona que", "si necesitas" y "revisado",
  // y en este producto esas frases son texto legitimo y de lo mejor que
  // escribe: "Lo siento en el cuerpo antes que en la cabeza", "Perdona que te
  // lo diga asi de claro", "Si necesitas que alguien te lo confirme...".
  // Con aquella lista se habria borrado un parrafo bueno del estudio de una
  // clienta, que es peor que el fallo que se venia a arreglar.
  //
  // Asi que no basta con la formula: tiene que ir acompanada de aquello de lo
  // que solo habla el modelo —el area, el texto, el formato, las casillas, el
  // JSON, las instrucciones— o ser algo que nadie diria hablandole a ella.
  const COSA_DEL_MODELO = '([ée]l |la |lo |los |las |el |este |esta |tu |su )?(area|área|texto|informe|p[áa]rrafo|contenido|formato|casilla|casillas|json|instrucciones|secci[óo]n|apartado|versi[óo]n|respuesta|salida)';
  const SE_EXPLICA = new RegExp(
    '^\\s*[«"\'(\\[]?\\s*(' + [
      // formulas que ya solas no son de este texto
      'nota\\s*:',
      'nota final\\s*:',
      'aclaraci[óo]n\\s*:',
      // "como modelo" a secas NO vale: "como modelo de mujer fuerte te
      // pusieron a tu madre" es texto del estudio y se borraba entero.
      'como (una )?(ia|inteligencia artificial|asistente)\\b',
      'como modelo de lenguaje',
      'd[ée]jame saber si',
      // y las que solo valen si hablan de lo suyo
      // "no puedo generar" tambien pide contexto: "No puedo generar mas\n      // excusas, piensas" es texto del estudio.
      '(aqu[íi] (tienes|va|est[áa])|a continuaci[óo]n( te)? (tienes|dejo|presento|muestro)|no puedo (generar|escribir|crear|completar)|he (escrito|generado|redactado|creado|ajustado|corregido|completado)|voy a (escribir|generar|redactar|corregir)|espero que (esto|est[ao]|te sirva|cumpla|se ajuste)|si necesitas que (ajuste|cambie|modifique|reescriba))[^.?!\\n]{0,40}' + COSA_DEL_MODELO,
    ].join('|') + ')', 'i');

  // Restos de formato que aqui no pintan nada: vallas de codigo, titulos de
  // markdown, separadores y comillas de cierre sueltas.
  //
  // Y los angulos, < y >, que se anadieron el 24 de agosto: en el informe de
  // ese dia salio impreso un ">" suelto pegado al punto final del area 7, la
  // ultima frase que lee la clienta ("...te costaba pedir.>"). Es la marca de
  // cita de markdown, que al modelo se le escapa de vez en cuando y sobre todo
  // al final, que es lo ultimo que escribe.
  //
  // Se quitan siempre, en cualquier sitio, y no hay riesgo de llevarse nada:
  // en el texto que lee la clienta no hay ni una sola razon para escribir un
  // angulo. No es HTML, no es codigo, y las comillas de este producto son las
  // españolas y las dobles. Se comprobo sobre el informe entero: los unicos
  // < y > que hay en 8.760 palabras son ese resto.
  const RESTOS = /```+|~~~+|^#{1,6}\s|^-{3,}\s*$|^\*{3,}\s*$|[<>]/gm;

  // PALABRAS QUE SOLO EXISTEN EN EL ENCARGO, NUNCA EN EL ESTUDIO.
  //
  // El 24 de agosto salio impreso, dentro del cierre de un area y en el PDF
  // de una clienta: "Este texto no deberia llevar negritas fuera de los
  // bloques, corrijo: el cierre no lleva negrita. Ignora la nota anterior, es
  // un error de formato." El modelo discutiendo consigo mismo.
  //
  // SE_EXPLICA, que es quien caza esto, va anclada al principio del parrafo
  // porque ahi es donde el modelo se presenta ("Aqui tienes el area..."). Esto
  // se colo al FINAL, detras de texto bueno, asi que por ahi no pasaba.
  //
  // Estas palabras son de la maquetacion y de la conversacion conmigo. En un
  // texto escrito para ella no hay ninguna razon para decir "negrita",
  // "ladillo" o "error de formato": si aparecen, la frase entera es del
  // encargo y no suya. Se quita la frase, no el parrafo, que lo de al lado es
  // texto bueno.
  const VOCABULARIO_DEL_ENCARGO = /(\bnegrit[ao]s?\b|\bladillos?\b|\basteriscos?\b|error de formato|ignora la nota|la nota anterior|corrijo:)/i;

  // UNA COMILLA QUE CIERRA SIN HABERSE ABIERTO.
  //
  // En el informe del 26 de agosto los cierres de las areas 6 y 7 acabaron
  // asi: "...no solo pedirte que sostengas.'" y "...la misma persona en todas
  // partes."". Una comilla suelta pegada a la ultima palabra que lee la
  // clienta, sin nada que la abriera.
  //
  // Se mira solo en los extremos del parrafo, que es donde se cuelan, y solo
  // se quita la que no tiene pareja: un parrafo con una frase entrecomillada
  // de verdad no se toca, porque sus dos comillas se encuentran.
  const ABREN = '\u201c\u00ab\u2018';
  const CIERRAN = '\u201d\u00bb\u2019';
  function sinComillaHuerfana(t) {
    let cuerpo = String(t || '').trim();
    for (;;) {
      const fin = cuerpo.slice(-1);
      const resto = cuerpo.slice(0, -1);
      if (CIERRAN.includes(fin) && !new RegExp('[' + ABREN + ']').test(resto)) { cuerpo = resto.trim(); continue; }
      // Las rectas no distinguen abrir de cerrar: si van impares, sobra una.
      if ((fin === '"' || fin === "'") && (cuerpo.split(fin).length - 1) % 2 === 1) { cuerpo = resto.trim(); continue; }
      break;
    }
    for (;;) {
      const ini = cuerpo.slice(0, 1);
      const resto = cuerpo.slice(1);
      if (ABREN.includes(ini) && !new RegExp('[' + CIERRAN + ']').test(resto)) { cuerpo = resto.trim(); continue; }
      if ((ini === '"' || ini === "'") && (cuerpo.split(ini).length - 1) % 2 === 1) { cuerpo = resto.trim(); continue; }
      break;
    }
    return cuerpo;
  }

  // Limpia UN texto suelto. Lo usan las dos mitades: las casillas antes de
  // montar el area, y la puerta final sobre lo ya montado.
  function limpiarTexto(t) {
    const original = String(t || '');
    let cuerpo = original;
    let cortado = false;

    const llave = cuerpo.search(/[{}]/);
    if (llave >= 0) { cuerpo = cuerpo.slice(0, llave); cortado = true; }

    // RESTOS lleva /g, asi que .test() deja la posicion movida y la siguiente
    // llamada empezaria donde acabo la anterior. Se usa solo .replace(), que
    // no arrastra estado, y se compara para saber si toco algo.
    const sinRestos = cuerpo.replace(RESTOS, ' ').replace(/\s{2,}/g, ' ');
    if (sinRestos !== cuerpo) { cuerpo = sinRestos; cortado = true; }

    if (SE_EXPLICA.test(cuerpo)) return '';

    if (DISCULPA.test(cuerpo)) { cuerpo = cuerpo.replace(DISCULPA, ''); cortado = true; }

    // La frase que habla de la maquetacion, no de ella. Ver mas arriba.
    if (VOCABULARIO_DEL_ENCARGO.test(cuerpo)) {
      const frases = cuerpo.split(/(?<=[.?!])\s+/);
      cuerpo = frases.filter(f => !VOCABULARIO_DEL_ENCARGO.test(f)).join(' ');
      cortado = true;
    }

    // El recorte del final SOLO se hace si se ha cortado algo, porque si no
    // se comia el cierre de un parrafo bueno: un parrafo que acabara en dos
    // puntos se quedaba sin ellos.
    // Las comillas ya no van en ese recorte: las mira sinComillaHuerfana, que
    // distingue la que sobra de la que tiene pareja, y las miraba a lo bruto
    // se comia el cierre de 'te dices por dentro: "no puedo mas"'.
    // La comilla huerfana se mira siempre, se haya cortado algo o no: llega
    // en parrafos que por lo demas estan perfectos.
    return sinComillaHuerfana(cortado ? cuerpo.replace(/[\s,;:]+$/, '') : cuerpo);
  }

  // Un parrafo del cuerpo acaba en punto, interrogacion o admiracion, con o
  // sin comilla o parentesis detras; los dos puntos tambien valen, que a
  // veces presentan lo que viene. Cualquier otra cosa es que se corto.
  const ACABA_CORTADO = /[^.?!…:"»)\]]$/;

  // PERO LOS ASTERISCOS DE CERRAR UNA NEGRITA VAN DETRAS DEL PUNTO.
  //
  // Una negrita que remata el parrafo acaba asi: "...cuanto has ensenado de
  // mas.**". Ese parrafo esta entero, pero su ultimo caracter es un asterisco
  // y aqui se daba por cortado: se recortaba hasta el punto, el ** de cerrar
  // se iba con el recorte y quedaba el de abrir solo. Sin pareja, el PDF los
  // limpia, asi que la negrita desaparecia del estudio impreso.
  // El 26 de agosto le paso al area 6 en siete parrafos seguidos: se quedo
  // sin una sola negrita, salto "el area se queda plana" y el codigo volvio a
  // pedir el area entera. 39 segundos y una llamada de mas por parrafos que
  // estaban perfectos. Asi que para decidir si se corto se miran quitados.
  const sinElCierreDeLaNegrita = t => t.replace(/\*+$/, '').trim();

  function limpiarLoQueSeImprime(texto, idArea) {
    const aviso = (que, trozo) => console.warn(`Área ${idArea}: ${que} ("${String(trozo).trim().slice(0, 40)}")`);

    const trozos = String(texto || '').split('\n\n').map(t => {
      const marca = (/^\[[A-ZÁÉÍÓÚ]+\]\s*/.exec(t) || [''])[0];
      const original = t.slice(marca.length);
      let cuerpo = limpiarTexto(original);
      if (cuerpo !== original.trim()) aviso('se ha limpiado basura del modelo', original);

      // UN PARRAFO CORTADO A MITAD DE FRASE NO SE IMPRIME ASI.
      //
      // El 26 de agosto el area 2 salio con un parrafo que acababa: "...algo
      // te dice que todavia no, que mejor esperar un poco mas. Ese". Y ahi
      // terminaba, en el PDF de una clienta que habia pagado. El modelo se
      // paro a mitad de la frase y nadie lo miraba.
      //
      // Un parrafo del cuerpo escrito de verdad acaba en punto, en
      // interrogacion o en admiracion. El que no, se recorta hasta su ultima
      // frase entera: se pierde un cabo de cinco palabras que no decia nada y
      // lo que queda se lee bien. Si no tiene ni una frase entera, no hay nada
      // que salvar y se va con el resto del relleno, ahi abajo.
      //
      // SOLO EL CUERPO. Los remates, la pregunta y la escena van marcados y
      // muchos acaban sin punto a proposito, que es como se escribe una frase
      // suelta. Por eso los que llevan marca no se tocan.
      const desnudo = sinElCierreDeLaNegrita(cuerpo);
      if (!marca && desnudo && ACABA_CORTADO.test(desnudo)) {
        let entero = desnudo.replace(/[^.?!…]*$/, '').trim();
        // Y si el corte cae DENTRO de una negrita, su ** de abrir se queda
        // solo y pasa lo mismo: el PDF lo borra y el marcado se pierde. Se
        // cierra detras del punto, que es donde el modelo iba a cerrarlo.
        if (entero && (entero.match(/\*\*/g) || []).length % 2) entero += '**';
        if (entero) aviso('se ha recortado un parrafo cortado a mitad de frase', cuerpo.slice(-40));
        else aviso('se ha quitado un parrafo sin una sola frase entera', cuerpo);
        cuerpo = entero;
      }
      return { marca, cuerpo };
    });

    // 1) los trozos que son solo relleno
    return trozos.filter(({ marca, cuerpo }) => {
      const p = enPalabras(cuerpo);
      const basura = p.length === 0 || (p.length <= 4 && p.every(x => RELLENO.test(x)));
      if (basura && cuerpo) aviso('se ha quitado un relleno impreso', cuerpo);
      return !basura;
    }).map(({ marca, cuerpo }) => marca + cuerpo).join('\n\n');
  }

  // Un solo sitio donde se decide que es "de relleno", para que la
  // comprobacion y el arreglo no puedan discrepar nunca.
  function esDeRelleno(texto, minimo) {
    const p = enPalabras(texto);
    return p.length < (minimo || MIN_PALABRAS_ESCENA) || p.every(x => RELLENO.test(x));
  }

  // ── UNA SOLA PUERTA PARA LAS LLAMADAS CORTAS ──────────────────────
  //
  // Los arreglos de aqui abajo (la escena, el nombre, las negritas y el
  // repaso que lee) hacen todos lo mismo: una llamada pequena con esquema y
  // la respuesta en JSON. Con el codigo repetido cuatro veces, cambiar algo
  // obligaba a acordarse de los cuatro sitios. Aqui se hace una vez.
  //
  // Devuelve null ante cualquier problema: sin clave, error de red, respuesta
  // cortada o JSON que no se puede leer. Quien llama decide que hacer con el
  // null, y en todos los casos la decision es seguir con lo que ya habia.
  async function pedirJson({ system, contenido, esquema, tope }) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          thinking: { type: 'disabled' },
          output_config: { format: { type: 'json_schema', schema: esquema } },
          max_tokens: tope,
          system,
          messages: [{ role: 'user', content: contenido }],
        }),
      });
      if (!r.ok) return null;
      const data = await r.json();
      if (data.stop_reason === 'max_tokens') return null;
      const txt = (data.content || []).filter(b => b && typeof b.text === 'string').map(b => b.text).join('');
      return JSON.parse(txt);
    } catch {
      return null;
    }
  }

  const ESQUEMA_SOLO_ESCENA = {
    type: 'object',
    properties: { texto: { type: 'string', description: 'Lo que se pide, escrito entero.' } },
    required: ['texto'],
    additionalProperties: false,
  };

  // Pide SOLO una casilla, sin volver a escribir el area entera. Es corta,
  // barata y no toca nada de lo que ya estaba bien. Devuelve null si no sale,
  // y entonces manda el plan B: esa casilla se queda fuera.
  const QUE_ES_CADA_CASILLA = {
    escena: 'LA ESCENA de esta área, tal como pide ESCENA REAL OBLIGATORIA: uno o dos párrafos, concreta y visual, sin negritas y sin repetir nada de lo que ya está escrito arriba',
    remate_herida: 'EL REMATE DE LA HERIDA: UNA sola frase, de treinta palabras como mucho, que nombre lo que le duele sin anestesia y sin salida amable, tal como pide LAS FRASES QUE REMATAN',
    remate_fuerza: 'EL REMATE DE LA FUERZA: UNA sola frase, de treinta palabras como mucho, que nombre lo que tiene de raro y de valioso, sin rebajarlo con un "pero", tal como pide LAS FRASES QUE REMATAN',
    pregunta: 'LA PREGUNTA DIRECTA: UNA sola frase, salida de lo que se le acaba de contar, tal como pide PREGÚNTALE DIRECTAMENTE',
    cierre: 'EL CIERRE del área, tal como pide CIERRE DE CADA ÁREA: un párrafo que golpea primero y después le enseña lo que se le abre, que no resuma nada de lo anterior y que no presente lo que viene después',
  };

  async function pedirSoloLaCasilla(area, datos, casilla) {
    const loEscrito = (datos?.parrafos || []).map(p => p?.texto).filter(Boolean).join('\n\n');
    const salida = await pedirJson({
      // El mismo prompt de siempre, asi que se aprovecha la misma cache.
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      esquema: ESQUEMA_SOLO_ESCENA,
      tope: 800,
      contenido: `${contextoPersona}\n\n${area.prompt}\n\nESTO YA ESTÁ ESCRITO Y NO HAY QUE TOCARLO:\n\n${loEscrito}\n\nLo único que falta es ${QUE_ES_CADA_CASILLA[casilla]}. Escríbelo ahora, hablándole a ella de tú. Devuelve solo eso.`,
    });
    return typeof salida?.texto === 'string' ? salida.texto.trim() : null;
  }

  // ── LO QUE FALTA SE ARREGLA, NO SE REESCRIBE EL AREA ENTERA ───────
  //
  // Cuando al area le faltaba el nombre o le faltaban negritas, se volvia a
  // pedir el area ENTERA y se cruzaban los dedos. Eso es tirar una moneda: en
  // el informe del 23 de agosto el nombre salio en 3 de 7 areas y las
  // negritas llegaron al minimo en 4 de 7, porque el modelo se volvia a
  // olvidar. Reescribir 900 palabras para anadir una marca es, ademas, lo
  // caro y lo lento.
  //
  // Aqui se hace lo que si funciono con la escena: se pide SOLO lo que falta,
  // y el codigo COMPRUEBA lo que vuelve antes de aceptarlo. Si no cuadra, se
  // descarta y se sigue con lo que habia, que nunca queda peor que antes.

  // El parrafo donde se mete el nombre: uno de en medio y con cuerpo. Nunca
  // el primero, que el prompt prohibe abrir el area llamandola por su nombre.
  function dondeCabeElNombre(parrafos) {
    const largo = i => {
      const t = parrafos[i] && parrafos[i].texto;
      return typeof t === 'string' ? t.split(/\s+/).filter(Boolean).length : 0;
    };
    // Primero, uno con cuerpo y cerca del medio del area.
    let elegido = -1;
    for (let i = 1; i < parrafos.length; i++) {
      if (largo(i) < 35) continue;
      if (elegido < 0 || Math.abs(i - parrafos.length / 2) < Math.abs(elegido - parrafos.length / 2)) elegido = i;
    }
    if (elegido >= 0) return elegido;
    // Si ninguno llega a 35 palabras, el mas largo de los que no son el
    // primero. Antes se devolvia -1 y el nombre no se ponia: un area de
    // parrafos cortos se quedaba sin el sin que nadie lo intentara.
    for (let i = 1; i < parrafos.length; i++) {
      if (elegido < 0 || largo(i) > largo(elegido)) elegido = i;
    }
    // Y si el area es de un solo parrafo, ese.
    return elegido >= 0 ? elegido : (parrafos.length > 0 ? 0 : -1);
  }

  const ESQUEMA_TEXTO = {
    type: 'object',
    properties: { texto: { type: 'string' } },
    required: ['texto'],
    additionalProperties: false,
  };

  // Devuelve el parrafo con su nombre metido, o null. Lo que vuelve tiene que
  // ser EL MISMO parrafo: se le quita el nombre a la respuesta y tiene que
  // quedar palabra por palabra lo que habia. Asi no puede colarse una
  // reescritura que cambie el contenido con la excusa de meter el nombre.
  async function ponerleElNombre(parrafo) {
    const salida = await pedirJson({
      system: `Eres un corrector. Te dan un parrafo de un libro escrito para una mujer que se llama ${nombrePila}, hablandole de tu.
Tu unico trabajo es devolver ESE MISMO parrafo con su nombre metido UNA vez, donde caiga natural, como cuando alguien que te conoce te llama por tu nombre justo al decirte algo que te toca.
NO cambies ni una palabra mas. NO reescribas, NO resumas, NO mejores nada, NO quites ni anadas ideas. Lo unico que se anade es el nombre y las comas que necesite.
Y no lo pongas siempre en el mismo hueco: puede abrir la frase, cerrarla o ir dentro.`,
      esquema: ESQUEMA_TEXTO,
      tope: 900,
      contenido: parrafo,
    });
    const t = salida?.texto;
    if (typeof t !== 'string' || vecesQueLaLlamaPorSuNombre(t, nombrePila) < 1) return null;
    // El mismo parrafo, quitandole el nombre: tiene que coincidir palabra por
    // palabra con el original. Si no, es que ha reescrito y no vale.
    const sinNombre = p => enPalabras(p).filter(w => w !== sinTildes(nombrePila)).join(' ');
    return sinNombre(t) === sinNombre(parrafo) ? t.trim() : null;
  }

  const ESQUEMA_NEGRITAS = {
    type: 'object',
    properties: {
      frases: {
        type: 'array',
        description: 'Las frases a resaltar, copiadas del texto tal cual, sin cambiar ni una letra.',
        items: { type: 'string' },
      },
    },
    required: ['frases'],
    additionalProperties: false,
  };

  // Pide SOLO las frases a resaltar y los asteriscos los pone el codigo.
  //
  // Antes se le pedia que devolviera los parrafos enteros con los ** dentro:
  // eran dos mil palabras de salida por area, que es lo que se paga caro, y
  // encima habia que comprobar que no hubiera cambiado ninguna. Pidiendo solo
  // las frases son sesenta palabras, y como el codigo es quien marca, el texto
  // del area NO SE TOCA: es imposible que este paso cambie una palabra.
  //
  // Una frase que no aparezca tal cual en el texto se ignora y ya.
  async function marcarLasNegritas(parrafos) {
    const textos = parrafos.map(p => (p && typeof p.texto === 'string') ? p.texto : '');
    const salida = await pedirJson({
      system: `Eres un maquetador. Te dan los parrafos de un capitulo escrito para una mujer, numerados y en orden.
Devuelve las frases que ella subrayaria con un fosforito: la que le pone nombre a algo que llevaba anos haciendo sin saberlo, la que se dice por dentro y no ha dicho nunca en voz alta, o la cuenta exacta de lo que le esta costando.
De tres palabras a una frase entera. NUNCA una palabra suelta y nunca dos lineas seguidas. No valen las explicaciones, ni los ejemplos, ni los piropos.
Entre TRES y SEIS en total, y no una por parrafo: el reparto es irregular.
COPIALAS TAL CUAL, letra por letra, tal como estan escritas en el texto, para que se puedan encontrar. No las reescribas ni las arregles.`,
      esquema: ESQUEMA_NEGRITAS,
      // Solo devuelve frases sueltas: con esto sobra.
      tope: 700,
      contenido: textos.map((t, i) => `[${i + 1}]\n${t}`).join('\n\n'),
    });
    const frases = salida?.frases;
    if (!Array.isArray(frases)) return null;

    // Marcar es envolver: el texto no se sustituye, se rodea. Se descartan las
    // que no aparecen tal cual, las que ya estan marcadas y las que se pisan
    // con otra ya marcada.
    const marcados = [...textos];
    let puestas = 0;
    for (const frase of frases) {
      if (typeof frase !== 'string') continue;
      const f = frase.trim().replace(/^\*+|\*+$/g, '');
      if (enPalabras(f).length < 3 || f.length > LARGO_MAX_NEGRITA) continue;
      const i = marcados.findIndex(t => t.includes(f));
      if (i < 0) continue;
      if (marcados[i].includes('**' + f) || marcados[i].includes(f + '**')) continue;
      // Se marca con una funcion, no con un texto: en el segundo argumento de
      // replace, un "$&" o un "$1" dentro de la frase se interpretarian como
      // patron y saldria un parrafo corrompido. Con la funcion, lo que se
      // escribe es exactamente lo que hay.
      marcados[i] = marcados[i].replace(f, () => '**' + f + '**');
      puestas++;
    }
    return puestas >= MIN_NEGRITAS ? marcados : null;
  }

  // "ELLA" QUE DELATA QUE SE HA SALIDO DEL "TU", Y SOLO ESA.
  //
  // Lo que se busca es que el area hable de la clienta en tercera persona
  // ("ella nota", "ella aprendio"), que rompe el tono de todo el estudio. En
  // el informe del 22 de agosto habia cuatro "ella" y tres estaban mal.
  //
  // Pero un "ella" suelto no basta para saberlo, y cazar de mas sale caro: el
  // area se manda a rehacer entera. En el estudio del 25 de agosto salto dos
  // veces sobre frases perfectas y costo 54 segundos y dos llamadas de las
  // caras.
  //
  // Repasados los estudios que conservamos -1.565 frases- este detector habia
  // marcado tres, y las tres estaban bien escritas. (Las del 22 de agosto no
  // se pueden volver a mirar: de aquel informe solo queda la nota de arriba.)
  // Por eso se descartan dos casos:
  //
  //  1. LA FRASE YA LE HABLA DE TU. Si dice "te", "tu" o "ti", le esta
  //     hablando A ELLA, asi que el "ella" es OTRA persona:
  //       "Te fijas en lo que le falta a la persona que tienes delante antes
  //        de que ella misma lo sepa"   <- la otra persona, no ella
  //
  //  2. VA DETRAS DE PREPOSICION. Entonces no es sujeto, es complemento, y
  //     casi siempre se refiere a una cosa:
  //       "una decision que ya has tomado: vuelves sobre ella igual que..."
  //       "y si tiene un fallo, que eres tu sin ella?"   <- su maquinaria
  //
  // LO QUE SE DEJA PASAR: una frase que mezcle las dos cosas ("te fijas en
  // todo, y ella nunca descansa"). Es rara, y encima queda la otra revision
  // -la que lee el area entera- que la marcaria igual en los registros.
  const PREPOSICIONES = new Set(['a', 'ante', 'bajo', 'con', 'contra', 'de', 'desde',
    'en', 'entre', 'hacia', 'hasta', 'para', 'por', 'segun', 'sin', 'sobre', 'tras']);
  const LE_HABLA_DE_TU = /(^|[^a-z0-9])(te|tu|tus|ti|tuyo|tuya|tuyos|tuyas|contigo)([^a-z0-9]|$)/;

  // La frase llega ya sin tildes y en minusculas.
  function hablaDeEllaEnTerceraPersona(frase) {
    if (LE_HABLA_DE_TU.test(frase)) return false;
    const palabras = frase.split(/[^a-z0-9]+/).filter(Boolean);
    for (let i = 0; i < palabras.length - 1; i++) {
      if (palabras[i] !== 'ella') continue;
      // Detras de preposicion no es sujeto, es complemento.
      if (i > 0 && PREPOSICIONES.has(palabras[i - 1])) continue;
      return true;
    }
    return false;
  }

  const sinTildes = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const enPalabras = t => sinTildes(t).replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean);

  // La escena copiada dentro del texto. Se busca una tirada de PALABRAS_IGUALES
  // palabras de la escena dentro del cuerpo: comparar los textos enteros no
  // valdria, porque el modelo cambia una coma al copiar y ya no coinciden.
  function escenaRepetida(escena, cuerpo) {
    const e = enPalabras(escena);
    if (e.length < PALABRAS_IGUALES) return false;
    const donde = ' ' + enPalabras(cuerpo).join(' ') + ' ';
    for (let i = 0; i + PALABRAS_IGUALES <= e.length; i++) {
      if (donde.includes(' ' + e.slice(i, i + PALABRAS_IGUALES).join(' ') + ' ')) return true;
    }
    return false;
  }

  // CUANTO DE UN PARRAFO ESTA COPIADO DE LA ESCENA, de 0 a 1.
  //
  // escenaRepetida contesta si hay copia en algun sitio del area, que es lo
  // que hace falta para avisar. Para BORRAR hace falta otra cosa: saber si
  // ESE parrafo es la copia o solo un parrafo que la roza. Se cuenta por
  // ventanas de PALABRAS_IGUALES palabras: cuantas de las del parrafo estan
  // tal cual dentro de la escena. Una copia entera da 1; un parrafo que
  // recoge la escena y le pone nombre, citando una frase suelta, se queda
  // bajo y no se toca.
  function cuantoSeCopiaDe(escena, parrafo) {
    const p = enPalabras(parrafo);
    const ventanas = p.length - PALABRAS_IGUALES + 1;
    if (ventanas < 1) return 0;
    const donde = ' ' + enPalabras(escena).join(' ') + ' ';
    let dentro = 0;
    for (let i = 0; i < ventanas; i++) {
      if (donde.includes(' ' + p.slice(i, i + PALABRAS_IGUALES).join(' ') + ' ')) dentro++;
    }
    return dentro / ventanas;
  }

  // A partir de aqui el parrafo ES la escena, no un parrafo que la menciona.
  // Se deja alto a proposito: lo que no llegue sigue tratandose como hasta
  // ahora, avisando y volviendo a pedir el area. Preferimos pagar un repaso
  // de mas antes que borrarle un parrafo bueno al cliente.
  const COPIA_DE_LA_ESCENA = 0.6;
  // Por debajo de esto el area se queda sin cuerpo, y un area sin cuerpo es
  // peor que un area con un parrafo repetido.
  const MIN_PARRAFOS = 2;

  // CUANTOS PARRAFOS HACEN FALTA PARA QUE QUEPAN LAS FRASES GRANDES.
  //
  // montarArea reparte la escena, los dos remates y la pregunta uno por
  // parrafo. Con menos parrafos que frases grandes no le quedan huecos: dos
  // salen pegadas y se leen como un cartel, y con tres o menos llega a
  // perderse una. Eso ya era asi antes de esto, pero quitar un parrafo puede
  // empujar el area hasta ahi, y ese si seria un fallo nuevo. Cuando pasa, no
  // se quita nada: se avisa y se sigue haciendo lo de antes, que es volver a
  // pedir el area. Un parrafo repetido es malo; un area descuadrada, peor.
  function huecosQueHacenFalta(datos) {
    const grandes = ['escena', 'remate_herida', 'remate_fuerza', 'pregunta']
      .filter(c => datos[c] && String(datos[c].texto || '').trim()).length;
    return Math.max(MIN_PARRAFOS, grandes);
  }

  // Borra de "parrafos" la escena copiada y recoloca lo que iba detras.
  //
  // Los numeros "tras_parrafo" dicen detras de que parrafo se lee la escena,
  // los remates y la pregunta. Al quitar un parrafo, todos los que apuntaban
  // mas abajo se desplazan uno: si no se corrigen aqui, las frases grandes
  // salen colocadas donde no toca y el area se lee troceada. Ese es el unico
  // riesgo real de quitar un parrafo, y se cierra aqui.
  function quitarLaEscenaDeLosParrafos(datos, id) {
    const escena = datos && datos.escena && datos.escena.texto;
    if (typeof escena !== 'string' || !escena.trim()) return;
    if (!Array.isArray(datos.parrafos)) return;

    const sobran = [];
    datos.parrafos.forEach((p, i) => {
      const t = p && typeof p.texto === 'string' ? p.texto : '';
      if (cuantoSeCopiaDe(escena, t) >= COPIA_DE_LA_ESCENA) sobran.push(i);
    });
    if (sobran.length === 0) return;

    const hacenFalta = huecosQueHacenFalta(datos);
    if (datos.parrafos.length - sobran.length < hacenFalta) {
      console.warn(`Área ${id}: la escena viene copiada, pero quitarla dejaría ${datos.parrafos.length - sobran.length} párrafo(s) para ${hacenFalta} hueco(s): se deja como está y se vuelve a pedir el área`);
      return;
    }

    datos.parrafos = datos.parrafos.filter((_, i) => !sobran.includes(i));

    // sobran son posiciones contando desde 0; tras_parrafo cuenta desde 1.
    for (const casilla of ['escena', 'remate_herida', 'remate_fuerza', 'pregunta']) {
      const d = datos[casilla];
      // Una casilla que se quito por venir de relleno llega aqui como null, y
      // Number(null) vale 0, que es un numero: sin esta linea se le pondria un
      // tras_parrafo a una casilla que ya no existe.
      if (!d) continue;
      const n = Number(d.tras_parrafo);
      if (!Number.isFinite(n)) continue;
      const encima = sobran.filter(i => i + 1 <= Math.round(n)).length;
      if (encima > 0) datos[casilla] = { ...d, tras_parrafo: Math.round(n) - encima };
    }

    console.warn(`Área ${id}: la escena venía copiada en ${sobran.length} párrafo(s), se han quitado sin volver a pedir el área`);
  }

  // ── LO QUE HACE QUE SE VUELVA A PEDIR EL AREA ──────────────────────
  //
  // Devuelve la lista de lo que trae mal y se arregla volviendo a pedirla.
  //
  // AQUI HUBO UN CORRECTOR QUE LEIA EL AREA CON OTRA LLAMADA AL MODELO, Y SE
  // HA QUITADO. Costaba una llamada por area -siete por informe- y se
  // equivocaba casi siempre.
  //
  // Primero mandaba reescribir, y el 24 de agosto mando cuatro areas de
  // siete: las CUATRO volvieron marcadas por lo mismo. Cuatro areas de mil
  // trescientas palabras pagadas dos veces para quedarnos igual.
  //
  // Entonces se bajo a aviso, que es como estaba. Pero en el informe del 25
  // de agosto marco seis frases y CUATRO estaban bien escritas, entre ellas
  // "Tu no tienes ese problema, Raquel", que es de tu y lleva su nombre
  // delante. Un aviso que se equivoca cuatro de cada seis veces no avisa de
  // nada: entierra el de verdad. Y ninguno cambiaba el informe, porque solo
  // se escribia en el registro.
  //
  // Estas son las frases por las que llego a mandar reescribir:
  //   "Tu llevas esa cuenta, Raquel, y la llevas desde hace tanto..."  -> es de TU
  //   "guardas una habitacion cerrada que no ensenas ni a quien mas quieres" -> es de TU
  //   "ahi es tambien donde mas se te nota que llevas la cuenta de todo" -> es de TU
  //   "Hay una edad, casi siempre muy pronto, en la que cualquier nina..." -> habla de mucha gente
  //   "Hay gente que aprende pronto que el mundo se sostiene..."      -> habla de mucha gente
  //   "el amor hay que ganarselo cada semana"                         -> no habla de nadie
  // Su propio prompt decia que esas tres cosas NO son fallo, y aun asi las
  // marcaba. Es un corrector que se equivoca casi siempre y cuyo arreglo no
  // arregla: las dos mitades fallan, no una.
  //
  // LO QUE SI SE QUEDA es el "ella" de sujeto, que esta aqui debajo: no es un
  // corrector que opina, es una palabra que esta o no esta, y un "ella
  // responde" impreso lo lee la clienta. Ese tambien marco de mas en su dia
  // y por eso lleva dos excepciones escritas: ver su nota, en
  // hablaDeEllaEnTerceraPersona.
  function loQueLeFaltaAlArea(montada) {
    const flojo = [];
    const bloques = analizarArea(montada);

    const negritas = negritasDe(bloques).length;
    if (negritas < MIN_NEGRITAS) {
      flojo.push(`solo ${negritas} negrita(s) en el cuerpo, hacen falta ${MIN_NEGRITAS}`);
    }
    if (vecesQueLaLlamaPorSuNombre(montada, nombrePila) < 1) {
      flojo.push(`no la llama "${nombrePila}" ni una vez`);
    }

    const escena = bloques.filter(b => b.tipo === 'escena').map(b => b.t).join(' ');
    const cuerpo = bloques.filter(b => b.tipo !== 'escena' && b.tipo !== 'sub').map(b => b.t).join(' ');
    // Si el area viene a proposito sin escena (porque venia de relleno y
    // tampoco salio al pedirla sola), no se vuelve a pedir el area entera por
    // eso: ya se decidio, y volver a pedirla solo gasta.
    if (escena && esDeRelleno(escena)) {
      flojo.push('la escena viene a medias o rellenada por rellenar');
    } else if (escena && escenaRepetida(escena, cuerpo)) {
      flojo.push('la escena viene copiada tambien dentro del texto: saldria impresa dos veces');
    }

    // LE HABLA DE TU O NO LE HABLA. Los ladillos quedan fuera: son etiquetas
    // de tres palabras y no le hablan a nadie.
    const leido = escena + ' ' + cuerpo;

    // Lo barato primero, que no gasta llamada: "ella" de sujeto, y solo si la
    // frase no le esta hablando de tu. Ver LE_HABLA_DE_TU.
    const ella = leido
      .split(/(?<=[.?!])\s+/)
      .map(f => f.trim())
      .find(f => hablaDeEllaEnTerceraPersona(sinTildes(f)));
    if (ella) {
      flojo.push(`habla de ella desde fuera: "${ella.slice(0, 70).trim()}..."`);
    }

    // Una instruccion interna copiada dentro del texto. No se apunta como
    // aviso: se manda a rehacer el area, porque esto no se puede entregar.
    // Ver MARCAS_QUE_NO_SE_IMPRIMEN.
    const marca = laMarcaInternaQueSeHaColado(montada);
    if (marca) {
      flojo.push(`ha copiado una instruccion interna dentro del texto: "${marca}"`);
    }

    return flojo;
  }


  // loQueFalloAntes: lo que traia mal el area en el intento anterior. Pedir el
  // area otra vez a secas es tirar una moneda; decirle que fallo la vez pasada
  // es lo unico que hace que el repaso sirva para algo.
  async function pedirArea(area, loQueFalloAntes, listas) {
    const repaso = (loQueFalloAntes && loQueFalloAntes.length)
      ? `\n\nESTE AREA YA LA HAS ESCRITO UNA VEZ Y HA VUELTO POR ESTO:\n- ${loQueFalloAntes.join('\n- ')}\nEscribela entera otra vez, arreglando eso y sin estropear lo demas.`
      : '';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        // Sonnet 5 razona antes de escribir salvo que se le diga que no, y ese
        // razonamiento sale del mismo presupuesto que el texto y se paga igual.
        // Sonnet 4.5, el modelo anterior, no lo hacia: por eso al cambiar de
        // modelo el 19 de agosto las areas empezaron a llegar cortadas, cada
        // generacion paso de 2 a mas de 4 minutos y el coste se multiplico por
        // cinco. En los registros se veia clavado: la salida era siempre el
        // tope exacto (3.500 con el tope en 3.500, 6.000 al subirlo), porque el
        // razonamiento se expande hasta llenar lo que le des. Aqui no hace
        // falta razonar: hay que escribir un area con el prompt que ya lleva
        // todas las reglas.
        thinking: { type: 'disabled' },
        // El area se pide por casillas y la API le obliga a rellenarlas todas.
        // Antes se le pedia texto seguido con marcas dentro y se le olvidaba
        // alguna; asi no puede. Ver ESQUEMA_AREA_POR_BLOQUES arriba en este archivo.
        output_config: { format: { type: 'json_schema', schema: ESQUEMA_AREA_POR_BLOQUES } },
        // Tope de seguridad, no un objetivo: solo se paga lo que el modelo
        // escribe, y el largo lo manda el prompt. Bajarlo seria peligroso: un
        // area que se corta NO se entrega, asi que un tope escaso no cortaria
        // el texto, cortaria la venta.
        //
        // ESTABA EN 5.000 Y NO LLEGABA. La cuenta de entonces salia de contar
        // solo las palabras: el AREA 1 en su tope son 1.300 palabras, unos
        // 3.500 tokens, y el resto unos 2.400, asi que 5.000 parecia el doble
        // de lo necesario. Lo que esa cuenta no contaba es lo que el area lleva
        // ademas del texto: los nombres de las casillas, los cinco bloques, los
        // ladillos y las cuatro casillas grandes, todo en JSON.
        //
        // En el informe del 24 de agosto el AREA 7 se planto en 5.000 tokens
        // clavados, llego cortada y hubo que escribirla ENTERA otra vez: unos
        // 50 segundos y el coste de un area, tirados. Y no fue mala suerte de
        // la 7: el tope es el mismo para las siete y la que mas cerca anda es
        // la 1, que pide 1.300 palabras frente a las 900 de las demas.
        max_tokens: 6000,
        // LA CACHE DEL PROMPT. El prompt de sistema son 22.000 tokens y se
        // manda 7 veces identico, una por area: casi la mitad de lo que
        // costaba un informe era reenviar el mismo texto. Marcandolo asi, la
        // primera vez cuesta igual y las otras seis cuestan una decima parte.
        // No cambia ni una palabra de lo que se escribe. La marca va DETRAS
        // del texto que se repite, y todo lo que cambia (la carta, el area,
        // el repaso) viaja en messages, que va despues: si el prompt cacheado
        // llevara dentro algo distinto en cada llamada, no acertaria nunca.
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{
          role: 'user',
          content: `${contextoPersona}\n\n${area.prompt}${losMoldesDeEstaArea(area.id)}${losRasgosDeEstaArea(listas, area.id)}\n\n${recordatorioFinal}${repaso}`,
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`Error en área ${area.id}: ${response.status} — ${errorText}`);
      err.temporal = response.status === 429 || response.status >= 500;
      throw err;
    }

    const data = await response.json();

    // El modelo se ha quedado sin espacio y ha dejado el area a media frase.
    // Esto NO llega como error: la respuesta trae texto y es larga, asi que
    // colaba como buena y el area entraba cortada en el PDF del cliente. La
    // propia API lo dice en stop_reason, y hasta ahora se ignoraba. Se trata
    // como fallo para que se vuelva a pedir; si no sale entera en ningun
    // intento, no se entrega nada y el cliente ve la pantalla de reintentar.
    if (data.stop_reason === 'max_tokens') {
      const err = new Error(`Área ${area.id} se quedó sin espacio y llegó cortada`);
      err.temporal = true;
      throw err;
    }

    // La respuesta viene en bloques y el area puede no ser el primero: los
    // modelos que razonan antes de escribir colocan delante un bloque de
    // razonamiento, que no lleva texto. Antes se cogia data.content[0].text a
    // secas, asi que con esos modelos salia vacio y se descartaba un area que
    // el modelo si habia escrito, y que ya estaba pagada. Se cogen todos los
    // bloques de texto y se pegan, que es lo unico que nos interesa.
    const texto = (data.content || [])
      .filter(b => b && typeof b.text === 'string')
      .map(b => b.text)
      .join('');

    if (!texto || texto.trim().length < 100) {
      const err = new Error(`Área ${area.id} devolvió texto vacío o demasiado corto`);
      err.temporal = true;
      throw err;
    }

    // Con output_config.format, lo que llega es JSON valido y con todas sus
    // casillas. Lo unico que la API no puede garantizar es que ninguna venga
    // en blanco, asi que eso se mira aqui y se vuelve a pedir si pasa.
    let datos;
    try {
      datos = JSON.parse(texto);
    } catch {
      const err = new Error(`Área ${area.id} no llegó como estructura`);
      err.temporal = true;
      throw err;
    }
    // El area llega por bloques: aqui se juntan en la lista de parrafos de
    // siempre y el "tras_bloque" pasa a ser el "tras_parrafo" que espera todo
    // lo de abajo. A partir de esta linea el resto del codigo ve exactamente lo
    // mismo que veia cuando el modelo mandaba "parrafos".
    const bloquesVacios = bloquesAParrafos(datos);

    const vacias = [
      ['la escena', datos?.escena?.texto],
      ['el remate de la herida', datos?.remate_herida?.texto],
      ['el remate de la fuerza', datos?.remate_fuerza?.texto],
      ['la pregunta', datos?.pregunta?.texto],
      ['el cierre', datos?.cierre],
    ].filter(([, t]) => !t || !String(t).trim()).map(([n]) => n);
    if (!Array.isArray(datos?.parrafos) || datos.parrafos.length === 0) vacias.push('los párrafos');
    for (const nombre of bloquesVacios) vacias.push(`el bloque ${nombre}`);
    if (vacias.length > 0) {
      const err = new Error(`Área ${area.id} llegó con casillas vacías: ${vacias.join(', ')}`);
      err.temporal = true;
      throw err;
    }

    // ── LA PALABRA "PLACEHOLDER" NO PUEDE LLEGAR AL PDF. NUNCA ──────
    //
    // El 22 de agosto el area 6 llego con la palabra "placeholder" en la
    // casilla de la escena y salio impresa en dorado y a pagina entera en el
    // estudio de una clienta que habia pagado 47 euros.
    //
    // La causa ya no esta: el prompt pedia la escena en dos sitios a la vez y
    // el modelo la escribia en el texto y rellenaba la casilla de cualquier
    // manera. Pero eso es confiar, y esto no se puede confiar. Aqui se cierra
    // por codigo, y se cierra SIN perder la venta, que es la otra mitad:
    //
    //   1. si la escena viene de relleno, se pide SOLO la escena. Es una
    //      llamada corta y barata, y el area entera no se toca.
    //   2. si volviera a venir de relleno, el area sale SIN el bloque de la
    //      escena. Se lee perfectamente sin el; con la palabra "placeholder"
    //      impresa, no.
    //
    // Asi que la palabra no tiene por donde llegar al papel, y ningun informe
    // se cae por esto.
    // NINGUNA CASILLA, NI UNA, PUEDE SALIR CON RELLENO.
    //
    // La primera version de esto solo miraba la escena, porque fue donde
    // aparecio "placeholder" el 22 de agosto. El 23 volvio a salir, esta vez
    // en el CIERRE, impreso en dorado y a pagina entera. Poner el guardia en
    // una casilla y no en las otras no es un arreglo: es esperar a que el
    // fallo se mude de sitio. Ahora se miran las cinco.
    //
    // Y cada una tiene su plan B si no se puede arreglar, para no perder la
    // venta: la escena, los remates y la pregunta se pueden quitar y el area
    // se lee bien sin ellos; y si se quita el cierre, analizarArea toma como
    // cierre el ultimo parrafo del area, que es lo que hacia antes de que
    // existieran las casillas.
    const CASILLAS = [
      { nombre: 'escena', minimo: MIN_PALABRAS_ESCENA },
      { nombre: 'remate_herida', minimo: 4 },
      { nombre: 'remate_fuerza', minimo: 4 },
      { nombre: 'pregunta', minimo: 4 },
      { nombre: 'cierre', minimo: 10 },
    ];

    // Lo que se ha quitado a proposito, para que la revision no tire el area
    // por echar en falta justo lo que acabamos de decidir no imprimir.
    const quitadas = {};
    for (const casilla of CASILLAS) {
      const dato = datos[casilla.nombre];
      const crudo = casilla.nombre === 'cierre' ? dato : dato?.texto;
      // Se limpia ANTES de juzgarla: si lo que queda despues de quitarle la
      // basura sigue siendo un texto valido, se guarda limpio y no hace falta
      // pedir nada. Y si al limpiarla no queda nada, es que la casilla era
      // basura entera y se trata como tal.
      const texto = limpiarTexto(crudo);
      if (typeof crudo === 'string' && texto !== crudo.trim() && !esDeRelleno(texto, casilla.minimo)) {
        console.warn(`Área ${area.id}: se ha limpiado basura del modelo en ${casilla.nombre}`);
        datos[casilla.nombre] = casilla.nombre === 'cierre' ? texto : { ...dato, texto };
        continue;
      }
      if (!esDeRelleno(texto, casilla.minimo)) continue;

      console.warn(`Área ${area.id}: ${casilla.nombre} vino de relleno, se pide solo eso`);
      const otra = await pedirSoloLaCasilla(area, datos, casilla.nombre);
      if (otra && !esDeRelleno(otra, casilla.minimo)) {
        datos[casilla.nombre] = casilla.nombre === 'cierre' ? otra : { ...dato, texto: otra };
        continue;
      }
      // El cierre no se puede quitar sin mas: el area tiene que terminar en
      // cierre. Su plan B es ascender el ultimo parrafo, que es exactamente lo
      // que hacia el codigo antes de que existieran las casillas.
      if (casilla.nombre === 'cierre') {
        if (datos.parrafos.length > 1) {
          datos.cierre = datos.parrafos.pop().texto;
          console.warn(`Área ${area.id}: cierre de relleno, se asciende el último párrafo a cierre`);
        } else {
          datos.cierre = null;
        }
        continue;
      }
      console.warn(`Área ${area.id}: SE ENTREGA SIN ${casilla.nombre} antes que imprimir un relleno`);
      datos[casilla.nombre] = null;
      if (casilla.nombre === 'escena') quitadas.escenaOpcional = true;
      if (casilla.nombre === 'pregunta') quitadas.preguntaOpcional = true;
      if (casilla.nombre.startsWith('remate')) quitadas.remateOpcional = true;
    }

    // ── LA ESCENA COPIADA SE BORRA, NO SE REESCRIBE EL AREA ────────
    //
    // El prompt pide la escena en su casilla y SOLO ahi. Cuando el modelo la
    // copia ademas dentro de "parrafos", el cliente se la encuentra impresa
    // dos veces seguidas, palabra por palabra: esta impreso en la pagina 7 del
    // ultimo informe revisado, en el area 1.
    //
    // Hasta ahora esto lo cazaba loQueLeFaltaAlArea, que vuelve a pedir el
    // AREA ENTERA. Son 900 palabras de salida, que es lo caro, para borrar un
    // parrafo que ya sabemos cual es. Y solo hay un repaso: si el modelo
    // vuelve a copiarla, se imprime igual. Por eso se paga y encima sale mal.
    //
    // Aqui se borra el parrafo y ya. No cuesta una llamada, no puede fallar
    // dos veces, y lo que se quita es texto que se sigue leyendo entero en el
    // bloque de la escena: al cliente no le falta nada.
    quitarLaEscenaDeLosParrafos(datos, area.id);

    // ── Y LO QUE FALTE, SE ARREGLA AQUI ────────────────────────────
    // Las dos comprobaciones son las mismas que hace loQueLeFaltaAlArea
    // despues. La diferencia es que si aqui se arregla, ya no hace falta
    // volver a pedir el area entera: sale mas rapido y mas barato.
    // Va DESPUES de quitar la escena copiada a proposito: si se pusiera antes,
    // el nombre o una negrita podrian caer justo en el parrafo que se borra.
    if (vecesQueLaLlamaPorSuNombre(montarArea(datos), nombrePila) < 1) {
      const donde = dondeCabeElNombre(datos.parrafos);
      if (donde >= 0) {
        const conNombre = await ponerleElNombre(datos.parrafos[donde].texto);
        if (conNombre) {
          datos.parrafos[donde] = { ...datos.parrafos[donde], texto: conNombre };
          console.warn(`Área ${area.id}: le faltaba el nombre, se le ha puesto`);
        } else {
          console.warn(`Área ${area.id}: le falta el nombre y no se ha podido poner`);
        }
      }
    }

    const yaMarcadas = datos.parrafos.reduce((n, p) => n + ((p?.texto || '').match(/\*\*[\s\S]+?\*\*/g) || []).length, 0);
    if (yaMarcadas < MIN_NEGRITAS) {
      const marcados = await marcarLasNegritas(datos.parrafos);
      if (marcados) {
        datos.parrafos = datos.parrafos.map((p, i) => ({ ...p, texto: marcados[i] }));
        console.warn(`Área ${area.id}: tenía ${yaMarcadas} negrita(s), se han marcado las que faltaban`);
      } else {
        console.warn(`Área ${area.id}: tenía ${yaMarcadas} negrita(s) y no se han podido marcar más`);
      }
    }

    // LA ULTIMA RED, Y ES ABSOLUTA.
    //
    // Todo lo de arriba depende de que yo haya acertado con la lista de
    // casillas. El 22 de agosto el guardia estaba en la escena y el relleno
    // salio por el cierre. Asi que aqui, con el area ya montada y justo antes
    // de que exista como texto, se barre lo que se va a imprimir y se tira
    // cualquier trozo que sea solo una palabra de relleno, venga de donde
    // venga y se llame como se llame la casilla de la que vino.
    const antesDeLimpiar = montarArea(datos);
    const montada = limpiarLoQueSeImprime(antesDeLimpiar, area.id);

    // Si al limpiar se ha llevado por delante una pieza entera (porque el
    // parrafo era el modelo explicandose y no quedaba nada), la revision no
    // puede tirar el area por echarla en falta: quitarla ha sido la decision
    // correcta. Se mira que marcas habia antes y cuales quedan.
    for (const [marca, opcion] of [['[ESCENA]', 'escenaOpcional'], ['[REMATE]', 'remateOpcional'], ['[PREGUNTA]', 'preguntaOpcional']]) {
      if (antesDeLimpiar.includes(marca) && !montada.includes(marca)) quitadas[opcion] = true;
    }

    // El area llega montada desde pedirArea, con cada casilla ya en su sitio.
    // mismo trato que se le da a un area que llega cortada.
    // El nombre se revisa aqui, con las marcas, porque falla igual que ellas:
    // esta pedido en el prompt y en el repaso final, y en el informe del 22 de
    // agosto salio CERO veces en las siete areas. Pedirlo otra vez por escrito
    // ya se ha probado y no funciona; contarlo, si.
    const bloques = analizarArea(montada);
    // Si el area sale a proposito sin escena (ver arriba), se dice aqui: esa
    // decision ya esta tomada y es la buena.
    const faltan = revisarBloques(bloques, quitadas);

    // Lo que no para el area pero conviene saber. Va a los registros y ya: si
    // llegan mil correos por esto, no se lee ninguno. Si un aviso se repite
    // informe tras informe, es que algo se esta escapando en el prompt.
    // Las negritas y el nombre ya no se apuntan aqui: tienen su propia
    // comprobacion en loQueLeFaltaAlArea, que ademas vuelve a pedir el area.
    // El area 1 es mas larga y el prompt le pide cuatro ladillos; las otras
    // tres. Antes esto leia area.minSub, que NUNCA se ha definido en ningun
    // sitio, asi que siempre valia 2 y el aviso no saltaba aunque faltaran.
    const avisos = avisosBloques(bloques, { minSub: area.id === 1 ? 4 : 3 });
    if (avisos.length > 0) {
      console.warn(`SE ENTREGA CON AVISOS — Área ${area.id}: ${avisos.join('; ')}`);
    }

    // Esto ya no deberia poder saltar: las casillas obligatorias vienen de la
    // API y colocarlas es cosa del codigo. Se queda como red por si el esquema
    // cambiara algun dia sin que nadie se acuerde de mirar aqui.
    if (faltan.length > 0) {
      const err = new Error(`Área ${area.id} llegó incompleta: ${faltan.join('; ')}`);
      err.temporal = true;
      throw err;
    }

    return montada;
  }

  // ── LA CACHE HAY QUE CALENTARLA ANTES ─────────────────────────────
  //
  // Un fallo que casi cuela: las siete areas salen A LA VEZ. La cache no
  // existe hasta que TERMINA la llamada que la escribe, asi que si las siete
  // arrancan juntas ninguna la encuentra, las siete la escriben, y escribir
  // cuesta un 25 % MAS que no usar cache. Es decir: sale mas caro que antes,
  // que es lo contrario de lo que se buscaba.
  //
  // Con una llamada minima antes —un solo token de respuesta— la cache queda
  // escrita y las siete la leen a una decima parte. Cuesta un par de segundos.
  //
  // Si falla, no pasa nada: se pierde el ahorro, no el informe.
  async function calentarLaCache() {
    try {
      const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          thinking: { type: 'disabled' },
          // ESTA LLAMADA TIENE QUE SER IGUAL QUE LAS DE LAS AREAS.
          //
          // La cache acierta por el principio de la peticion, y el esquema de
          // casillas va DELANTE del prompt. Sin el, esta llamada guardaba una
          // cosa y las siete areas pedian otra, asi que ninguna la encontraba:
          // se escribia siete veces el mismo prompt de 22.000 tokens y no se
          // leia ni una. En el informe del 23 de agosto eso fueron 268.000
          // tokens de prompt pagados a precio entero, dos tercios de la
          // factura. Con el esquema puesto, la peticion empieza igual y las
          // areas si encuentran lo que dejo esta.
          //
          // Si algun dia se le cambia algo a la llamada del area de lo que va
          // ANTES del prompt, hay que cambiarlo aqui tambien o la cache se
          // vuelve a quedar sin usar, y eso no se nota mirando el informe: se
          // nota en la factura.
          output_config: { format: { type: 'json_schema', schema: ESQUEMA_AREA_POR_BLOQUES } },
          // No queremos texto, queremos que la cache quede escrita. Se deja
          // sitio para unos pocos tokens porque con el esquema puesto la
          // respuesta es JSON y un tope de 1 puede rechazarse; lo que se paga
          // es lo que escriba, y aqui no escribe nada util a proposito.
          max_tokens: 16,
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: 'ok' }],
        }),
      });
      // Si esta llamada falla, el informe sale igual pero pagando el prompt
      // siete veces. No rompe nada, asi que no se corta la generacion, pero
      // tiene que verse en los registros: es la diferencia entre un informe
      // de 0,90 y uno de 0,50.
      if (!respuesta.ok) {
        console.warn(`La cache no se ha podido calentar (HTTP ${respuesta.status}): el informe sale igual, pero el prompt se paga en cada área`);
      }
    } catch (err) {
      console.warn(`No se pudo calentar la cache (${err.message.slice(0, 60)}): se sigue sin ella`);
    }
  }

  async function generarArea(area, listas) {
    let ultimoError;
    // LA MEJOR DE LAS QUE HAN LLEGADO, no la primera.
    //
    // Aqui habia un fallo mio que se vio en el informe del 23 de agosto: se
    // guardaba la PRIMERA area que llegaba y no se actualizaba nunca. Asi que
    // el repaso se pedia, llegaba un area mejor, y si a esa le faltaba
    // cualquier otra cosa se tiraba y se entregaba la vieja. El nombre de la
    // clienta salio en 3 de 7 areas por esto: se pidieron los repasos, se
    // pagaron, vinieron con el nombre, y se descartaron.
    //
    // Ahora se queda la que menos le falta, y en empate la ultima, que es la
    // que se escribio sabiendo lo que habia fallado.
    let mejor = null;
    let fallos = 0;
    let repasos = 0;
    let loQueFalloAntes = null;
    while (fallos < INTENTOS_POR_AREA) {
      try {
        const montada = await pedirArea(area, loQueFalloAntes, listas);
        const flojo = loQueLeFaltaAlArea(montada);
        if (flojo.length === 0) return montada;
        if (mejor === null || flojo.length <= mejor.cuantos) mejor = { montada, cuantos: flojo.length };
        if (repasos >= REPASOS_POR_ESTILO) {
          console.warn(`SE ENTREGA CON AVISOS — Área ${area.id}: ${flojo.join('; ')}`);
          return mejor.montada;
        }
        repasos++;
        loQueFalloAntes = flojo;
        console.warn(`Área ${area.id} floja (${flojo.join('; ')}): se vuelve a pedir`);
      } catch (err) {
        ultimoError = err;
        fallos++;
        // Un corte de red llega sin marca; se trata como temporal.
        const temporal = err.temporal !== false;
        if (!temporal || fallos >= INTENTOS_POR_AREA) break;
        console.warn(`Área ${area.id}: intento ${fallos} fallido (${err.message.slice(0, 80)}), reintentando`);
        await new Promise(r => setTimeout(r, 1500 * fallos));
      }
    }
    // Si en algun momento llego un area entera, se entrega aunque venga floja.
    if (mejor !== null) return mejor.montada;
    throw ultimoError;
  }

  try {
    // Lanzar las 7 llamadas en paralelo
    // Primero se calienta la cache y solo despues salen las siete: ver
    // calentarLaCache. Sin esto, las siete se pisan y la cache sale cara.
    await calentarLaCache();

    // LAS LISTAS SALEN LAS PRIMERAS, Y AQUI SE ESPERA A PROPOSITO.
    //
    // Son la fuente del estudio: de la carta salen los rasgos, cada uno con su
    // area, y despues cada una de las siete se escribe con LOS SUYOS y con
    // ninguno mas. Sin listas, un area no sabe de que tiene que hablar.
    //
    // Todo el informe espera por esta llamada, y es la unica de los rasgos
    // que hay: la ficha es el nombre, sus dos frases y su area, y con eso ya
    // esta escrita entera. No queda nada suyo pendiente de una segunda vuelta.
    //
    // Si se cae, devuelve las listas vacias -no lanza nunca- y las siete areas
    // se escriben como se escribian antes de que las listas existieran.
    const listas = await extraerRasgos(nombrePila, sexo, cartaTexto);

    const resultados = await Promise.all(
      AREAS.map(area => generarArea(area, listas))
    );

    // UN AREA QUE SE QUEDA A LA MITAD QUE SUS SEIS HERMANAS.
    //
    // El 26 de agosto el area 2 salio con 665 palabras y las otras seis del
    // mismo informe traian entre 1.163 y 1.446. Tres paginas donde las demas
    // llevan cinco, sin los bloques del final, y se entrego igual: nada
    // miraba si el area tenia el tamano de un area.
    //
    // No se mide contra un numero fijo, se mide contra las otras seis del
    // mismo informe, que es la unica vara honrada: cada carta da lo que da, y
    // lo que no es normal es que una se quede en la mitad que el resto. Con
    // las medidas de ese dia, la rota sale al 52% de la mediana y la
    // siguiente mas corta al 91%: por debajo del 60% no cabe un area sana.
    //
    // Se pide una vez mas, y solo esa. Si la segunda tampoco viene mas larga,
    // se entrega la que habia: es peor quedarse sin el area que tenerla
    // corta, y en los registros queda dicho.
    // Se cuentan SOLO los parrafos del cuerpo, que es donde estan los bloques
    // que se pierden. La escena, los remates, la pregunta y el cierre van en
    // sus casillas y ya tienen quien las vigile, y si entraran en la cuenta
    // taparian el agujero: son las mismas en un area entera y en una coja.
    const enPalabrasEl = t => analizarArea(String(t || ''))
      .filter(b => b.tipo === 'texto')
      .map(b => b.t)
      .join(' ')
      .split(/\s+/).filter(Boolean).length;
    const largos = resultados.map(enPalabrasEl);
    const mediana = [...largos].sort((a, b) => a - b)[Math.floor(largos.length / 2)];
    for (let i = 0; i < resultados.length; i++) {
      if (largos[i] >= mediana * PARTE_QUE_TIENE_QUE_TENER) continue;
      console.warn(`Área ${AREAS[i].id} se ha quedado en ${largos[i]} palabras y las demas traen ${mediana}: se vuelve a pedir`);
      const otra = await generarArea(AREAS[i], listas).catch(() => null);
      if (enPalabrasEl(otra) > largos[i]) {
        resultados[i] = otra;
        largos[i] = enPalabrasEl(otra);
      } else {
        console.warn(`SE ENTREGA CON AVISOS — Área ${AREAS[i].id}: sigue corta, ${largos[i]} palabras de las ${mediana} que traen las demas`);
      }
    }

    // Unir con el separador. Es U+001F (Unit Separator), un caracter de
    // control invisible que existe justo para esto y que no aparece en texto
    // escrito. Antes era la palabra "===AREA===": si el modelo la escribia por
    // casualidad dentro de un area, el informe se partia mal y los textos se
    // desplazaban de seccion.
    // Por si acaso, se quita el separador del texto de cada area antes de unir:
    // asi ni escribiendolo a proposito se puede romper el reparto.
    // La coma antes de "y" lleva pedida desde el principio y se sigue colando:
    // 78 veces en el informe del 22 de agosto. Aqui se quitan las que se puede
    // quitar sin riesgo, que son las que no llevan sujeto propio detras. Ver
    // lib/estilo.js: ante la duda no se toca, porque una coma quitada donde
    // hacia falta es una falta de ortografia impresa.
    // sinLasMarcasInternas va aqui, en el ultimo sitio por el que pasa el
    // texto antes de salir hacia el navegador: pase lo que pase mas arriba,
    // por aqui no sale una instruccion interna impresa. Ver la nota que
    // acompaña a MARCAS_QUE_NO_SE_IMPRIMEN.
    const textoCompleto = resultados
      .map(t => sinLasMarcasInternas(quitarComaAntesDeY(t, nombrePila)).split(SEPARADOR_AREAS).join(''))
      .join(SEPARADOR_AREAS);

    // El token viaja al navegador y de ahi a generar-pdf y save-pdf: es lo
    // que demuestra que quien pide el PDF es quien tiene la reserva.
    return res.status(200).json({ texto: textoCompleto, rasgos: listas, token: reserva.token });

  } catch (err) {
    console.error('Error generando áreas:', err.message);
    // Soltar la reserva para que el cliente pueda reintentar en el acto en
    // vez de esperar a que caduque.
    await liberar(stripe, session_id, reserva.token);
    // Si con esta se le acaban los intentos, el cliente se queda sin informe
    // aqui mismo: se avisa ahora. Antes el aviso salia cuando volvia a pedirlo
    // otra vez, asi que si no volvia, no se enteraba nadie.
    if (intentoActual >= MAX_INTENTOS) {
      await avisarClienteSinInforme(stripe, session_id, datosCliente, intentoActual, err.message);
    }
    return res.status(500).json({ error: 'Error generando el informe: ' + err.message });
  }
}


// ═════════════════════════════════════════════════════════════════
// AVISO: CLIENTE PAGADO Y SIN INFORME
//
// Se manda en el momento en que se le acaban los intentos, no cuando el
// cliente vuelve a pedirlo: si no volvia, antes no se enteraba nadie de que
// habia pagado y se habia quedado sin nada.
// La marca aviso_agotado en Stripe evita que salga dos veces por la misma
// compra, aunque el cliente recargue o vuelva a darle al boton.
// ═════════════════════════════════════════════════════════════════
async function avisarClienteSinInforme(stripe, session_id, session, intentos, motivo) {
  try {
    // Se relee la sesion: la que tenemos en la mano puede llevar varios
    // minutos en memoria y la marca del aviso puede haberse escrito despues.
    const fresca = await stripe.checkout.sessions.retrieve(session_id);
    if (fresca?.metadata?.aviso_agotado === 'si') return;

    const m = fresca?.metadata || {};
    const emailCliente = fresca?.customer_email || fresca?.customer_details?.email
      || session?.customer_email || '(desconocido)';

    await enviarEmailAdmin({
      asunto: `⚠️ URGENTE — Cliente sin informe tras ${MAX_INTENTOS} intentos — ${m.nombre || 'Cliente'}`,
      mensaje: [
        `Este cliente HA PAGADO y NO tiene su informe`,
        ``,
        `Email:    ${emailCliente}`,
        `Nombre:   ${m.nombre || '-'}`,
        `Telefono: ${m.telefono || '-'}`,
        `Sexo:     ${m.sexo || '-'}`,
        `Nacio:    ${m.fecha || '-'} a las ${m.hora || '-'}`,
        `Lugar:    ${[m.municipio, m.provincia, m.pais].filter(Boolean).join(', ') || '-'}`,
        `Edad:     ${m.edad || '-'}`,
        ``,
        `Session:  ${session_id}`,
        `Intentos: ${intentos} de ${MAX_INTENTOS}`,
        `Motivo:   ${motivo || '-'}`,
      ].join('\n'),
    });

    await stripe.checkout.sessions.update(session_id, {
      metadata: { ...(fresca?.metadata || {}), aviso_agotado: 'si' },
    });
  } catch (err) {
    console.error('No se pudo avisar de que el cliente se quedo sin informe:', err.message);
  }
}


// ═════════════════════════════════════════════════════════════════
// AVISO AL ADMIN (via Brevo) — mismo formato que save-pdf.js
// ═════════════════════════════════════════════════════════════════
async function enviarEmailAdmin({ asunto, mensaje }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

  const body = {
    sender: { email: 'hola@origennatal.com', name: 'Origen Natal — Alertas' },
    to: [{ email: 'hola@origennatal.com', name: 'Admin' }],
    subject: asunto,
    htmlContent: `<pre style="font-family:monospace;background:#fff5f4;padding:16px;border-radius:8px;">${mensaje}</pre>`,
  };

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });
}
