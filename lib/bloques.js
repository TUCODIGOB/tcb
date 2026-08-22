// ═════════════════════════════════════════════════════════════════
// LOS BLOQUES DE UN AREA
//
// Un area es un texto de 900 palabras seguidas. Si se maqueta tal cual,
// el cliente se encuentra cuatro paginas de parrafos iguales y el ojo se
// cansa antes de llegar a lo bueno. Para que respire, el modelo marca al
// principio del parrafo lo que ese parrafo es:
//
//   [SUBTITULO] Lo que no se ve desde fuera     -> ladillo dorado
//   [ESCENA] Son las once de la noche y ...     -> bloque en cursiva
//   [REMATE] Llevas media vida pidiendo permiso -> frase grande
//   [PREGUNTA] ¿Cuantas veces te has callado?   -> pregunta suelta
//
// Aqui se traduce ese texto marcado a una lista de bloques, y se revisa
// que esten todos. Lo usan los dos sitios que tienen que entenderlo igual:
// chat.js, para no dar por buena un area mal marcada, y generar-pdf.js,
// para pintarla. Si esto viviera en dos ficheros, tarde o temprano uno de
// los dos cambiaria y el informe saldria distinto de lo que se valido.
// ═════════════════════════════════════════════════════════════════

const PALABRAS = 'SUBT[ÍI]TULOS?|SUBTITULOS?|SUB|ESCENA|REMATE|PREGUNTA';

// La marca normal: [ESCENA]. Se aceptan las variantes que se le escapan al
// modelo (minusculas, asteriscos alrededor, espacios dentro, dos puntos
// detras) porque la marca solo es una instruccion de maquetacion: lo que
// importa es entenderla, no castigarla.
const CON_CORCHETES = new RegExp('^\\*{0,2}\\s*\\[\\s*(' + PALABRAS + ')\\s*\\]\\s*:?\\s*\\*{0,2}\\s*', 'i');

// Sin corchetes hacen falta dos cosas: dos puntos detras y la palabra en
// mayusculas (ESCENA: ...). Sin lo segundo, un parrafo que empezara por
// "Pregunta: por que siempre acabas igual" se leeria como una marca y esa
// frase saldria pintada como una pregunta suelta en mitad del area.
const SIN_CORCHETES = new RegExp('^\\*{0,2}\\s*(' + PALABRAS + ')\\s*:\\s*\\*{0,2}\\s*');

// Cualquier marca que se haya quedado suelta en mitad del texto. Se borra
// sin mirar: al cliente no le puede llegar un corchete impreso.
const MARCA_SUELTA = new RegExp('\\[\\s*(' + PALABRAS + '|CIERRE|HOY|ORIGEN|CREENCIAS|SOLTAR)\\s*\\]\\s*:?', 'gi');

function tipoDe(palabra) {
  const p = String(palabra)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  if (p.indexOf('SUB') === 0) return 'sub';
  if (p === 'ESCENA') return 'escena';
  if (p === 'REMATE') return 'remate';
  if (p === 'PREGUNTA') return 'pregunta';
  return 'texto';
}

// Una pregunta suelta se reconoce sola: un parrafo que es una sola frase y
// acaba en interrogante. Asi sale bien maquetada aunque el modelo se deje
// la marca, que es el fallo mas facil de cometer y el mas tonto de pagar.
function esPreguntaSuelta(txt) {
  const limpio = txt.replace(/\*\*/g, '').trim();
  if (limpio.length < 15 || limpio.length > 220) return false;
  if (limpio.charAt(limpio.length - 1) !== '?') return false;
  return !/[.!?]/.test(limpio.slice(0, -1));
}

// Una marca al principio de una linea. Ademas de la forma que se pide,
// [SUBTITULO], se aceptan las que salen solas al escribir: en minusculas, con
// asteriscos alrededor, con dos puntos, o el titulo en markdown (## Asi). La
// marca es una instruccion de maquetacion, no un examen: lo que importa es
// entenderla.
function marcaDeLinea(linea) {
  const limpia = linea.trim();
  const m = CON_CORCHETES.exec(limpia) || SIN_CORCHETES.exec(limpia);
  if (m) return { tipo: tipoDe(m[1]), resto: limpia.slice(m[0].length) };
  const titulo = /^#{1,4}\s+(.+)$/.exec(limpia);
  if (titulo) return { tipo: 'sub', resto: titulo[1] };
  return null;
}

function limpiarCuerpo(txt) {
  let t = txt
    .replace(MARCA_SUELTA, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  // Los ** son la marca de negrita del cuerpo y se respetan siempre que
  // vengan en pareja. Antes se quitaban los del borde sin mirar, y eso se
  // comia justo las negritas que abren parrafo, que son de las que mejor
  // funcionan: se iba la marca de abrir, la de cerrar se quedaba sola y al
  // maquetar se limpiaba como asterisco suelto, asi que la frase salia sin
  // resaltar. Ahora solo se quita el que de verdad se ha quedado sin pareja,
  // que impreso saldria como un asterisco en mitad del texto.
  const impar = () => ((t.match(/\*\*/g) || []).length) % 2 === 1;
  if (impar()) t = t.replace(/^\*{2,}\s*/, '').trim();
  if (impar()) t = t.replace(/\s*\*{2,}$/, '').trim();
  return t;
}

// LAS NEGRITAS DEL CUERPO.
//
// Se cuentan solo en el texto corrido. En la escena, en los remates, en la
// pregunta y en el cierre manda la fuente del bloque (cursiva o negrita
// entera), asi que una negrita ahi no se ve: ni se pide ni se cuenta.
// LOS LIMITES DE LA MAQUETACION, en un solo sitio porque los usan las dos
// mitades: el saneado, que los aplica, y la revision, que los da por hechos.
const MAX_SUBS = 8;          // mas ladillos que esto es una lista, no un texto
const LARGO_SUB = 80;        // un ladillo son tres o cinco palabras
const MAX_ESCENAS = 2;       // la escena ocupa uno o dos parrafos
const MAX_REMATES = 4;       // mas frases grandes trocean el area
const LARGO_DESTACADA = 220; // un remate o una pregunta es UNA frase
const LARGO_NEGRITA = 200;   // mas que esto ya no resalta, es un bloque
const TOPE_NEGRITA = 0.25;   // marcada mas de una cuarta parte, deja de destacar

const NEGRITA = /\*\*([\s\S]+?)\*\*/g;

function contarPalabras(txt) {
  return String(txt || '').replace(/\*\*/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

export function negritasDe(bloques) {
  const fuera = [];
  for (const b of bloques) {
    if (b.tipo !== 'texto') continue;
    NEGRITA.lastIndex = 0;
    let m;
    while ((m = NEGRITA.exec(b.t)) !== null) {
      const t = m[1].trim();
      if (t) fuera.push(t);
    }
  }
  return fuera;
}

// ── EL AREA, PEDIDA POR CASILLAS ──────────────────────────────────
//
// Antes se le pedia al modelo el area entera como texto seguido y que se
// acordara de teclear [ESCENA] delante del parrafo que tocaba. Eso fallaba
// porque depende de que se acuerde mientras escribe 900 palabras: el 22 de
// agosto dos areas llegaron con el ladillo mal puesto y se cayo el informe.
//
// Ahora se le pide por casillas, con un esquema que la API le hace cumplir:
// la escena, los dos remates, la pregunta y el cierre son obligatorios y no
// puede entregar sin ellos. Lo que sigue siendo suyo es la forma: cuantos
// parrafos escribe, en que orden y donde encaja cada cosa. Por eso las siete
// areas siguen saliendo distintas.
//
// Aqui se pasa esa estructura al texto marcado de siempre, para que lo que
// viene despues —la revision y el PDF— no tenga que enterarse de nada.

// El esquema que viaja en output_config.format. Sin numeros minimos ni
// maximos: la API no admite esas restricciones y se validan en codigo.
export const ESQUEMA_AREA = {
  type: 'object',
  properties: {
    parrafos: {
      type: 'array',
      description: 'Los parrafos del area en su orden, sin la escena, los remates, la pregunta ni el cierre, que van aparte.',
      items: {
        type: 'object',
        properties: {
          ladillo: { type: ['string', 'null'], description: 'Ladillo de tres a cinco palabras que va ENCIMA de este parrafo, o null si este parrafo no lleva.' },
          texto: { type: 'string' },
        },
        required: ['ladillo', 'texto'],
        additionalProperties: false,
      },
    },
    escena: {
      type: 'object',
      description: 'La escena concreta y visual. Obligatoria.',
      properties: {
        tras_parrafo: { type: 'integer', description: 'Numero del parrafo detras del cual va la escena, contando desde 1.' },
        texto: { type: 'string' },
      },
      required: ['tras_parrafo', 'texto'],
      additionalProperties: false,
    },
    remate_herida: {
      type: 'object',
      description: 'La frase que nombra lo que le duele, sin anestesia. Va sola y grande.',
      properties: {
        tras_parrafo: { type: 'integer' },
        texto: { type: 'string' },
      },
      required: ['tras_parrafo', 'texto'],
      additionalProperties: false,
    },
    remate_fuerza: {
      type: 'object',
      description: 'La frase que nombra lo que tiene de raro y valioso, con la misma fuerza.',
      properties: {
        tras_parrafo: { type: 'integer' },
        texto: { type: 'string' },
      },
      required: ['tras_parrafo', 'texto'],
      additionalProperties: false,
    },
    pregunta: {
      type: 'object',
      description: 'La pregunta directa que le hace parar y pensar. Obligatoria.',
      properties: {
        tras_parrafo: { type: 'integer' },
        texto: { type: 'string' },
      },
      required: ['tras_parrafo', 'texto'],
      additionalProperties: false,
    },
    cierre: {
      type: 'string',
      description: 'El ultimo parrafo del area. Revela algo nuevo y no presenta la siguiente area.',
    },
  },
  required: ['parrafos', 'escena', 'remate_herida', 'remate_fuerza', 'pregunta', 'cierre'],
  additionalProperties: false,
};

// Monta el texto marcado a partir de la estructura. Todo lo que decide el
// modelo es donde va cada cosa; colocarla bien es cosa de aqui, y aqui no
// se equivoca: el area nunca empieza por una marca, nunca hay dos destacadas
// pegadas y el cierre siempre es lo ultimo.
export function montarArea(datos) {
  const parrafos = Array.isArray(datos?.parrafos) ? datos.parrafos : [];
  if (parrafos.length === 0) return '';

  // Lo que va intercalado, agrupado por el parrafo detras del que toca. El
  // indice que da el modelo se ajusta a lo que existe: nunca antes del primer
  // parrafo (el area abre con texto) y nunca despues del ultimo (detras solo
  // va el cierre).
  //
  // Cada una va detras de un parrafo DISTINTO. Si el modelo manda dos al mismo
  // sitio y se dejan pegadas, entre ellas no queda texto, se leen como un
  // cartel en mitad del area, y al sanearlo una de las dos deja de ser frase
  // grande y se pierde. Asi que la segunda baja al siguiente hueco libre.
  const pedidos = [
    ['ESCENA', datos?.escena],
    ['REMATE', datos?.remate_herida],
    ['REMATE', datos?.remate_fuerza],
    ['PREGUNTA', datos?.pregunta],
  ]
    .filter(([, d]) => d && d.texto && String(d.texto).trim())
    .map(([marca, d]) => {
      let n = Number(d.tras_parrafo);
      if (!Number.isFinite(n)) n = 1;
      return { marca, texto: String(d.texto).trim(), sitio: Math.min(Math.max(Math.round(n), 1), parrafos.length) };
    })
    // Se reparten primero las frases grandes y la escena al final. Si el area
    // trae pocos parrafos y no hay huecos para todas, la que acaba compartiendo
    // sitio es la escena, que puede ir pegada a un remate sin problema: dos
    // frases grandes juntas, en cambio, se leen como un cartel y una se pierde.
    .sort((a, b) => (a.marca === 'ESCENA') - (b.marca === 'ESCENA') || a.sitio - b.sitio);

  const dentro = new Map();
  const ocupados = new Set();
  for (const item of pedidos) {
    let n = item.sitio;
    while (ocupados.has(n) && n < parrafos.length) n++;
    // Si ya no quedan huecos por debajo, se busca hacia arriba antes de
    // resignarse a compartir parrafo con otra.
    if (ocupados.has(n)) { let m = item.sitio; while (m > 1 && ocupados.has(m)) m--; n = m; }
    ocupados.add(n);
    if (!dentro.has(n)) dentro.set(n, []);
    dentro.get(n).push(`[${item.marca}] ${item.texto}`);
  }

  const fuera = [];
  parrafos.forEach((p, i) => {
    const ladillo = p && typeof p.ladillo === 'string' ? p.ladillo.trim() : '';
    // El primer parrafo del area nunca lleva ladillo encima: la pagina ya trae
    // el titulo impreso y uno pegado debajo se lee como si empezara por la mitad.
    if (ladillo && i > 0) fuera.push(`[SUBTITULO] ${ladillo}`);
    const texto = p && typeof p.texto === 'string' ? p.texto.trim() : '';
    if (texto) fuera.push(texto);
    // Si a un mismo parrafo le tocan dos frases grandes seguidas, entre ellas
    // no quedaria texto y se leerian como un cartel: se reparten hacia abajo.
    for (const marcado of (dentro.get(i + 1) || [])) fuera.push(marcado);
  });

  const cierre = typeof datos?.cierre === 'string' ? datos.cierre.trim() : '';
  if (cierre) fuera.push(cierre);
  return fuera.join('\n\n');
}

export function analizarArea(texto) {
  // Se lee linea a linea y no parrafo a parrafo. El modelo casi nunca deja la
  // linea en blanco entre el subtitulo y el parrafo que va debajo, asi que
  // partiendo solo por parrafos el subtitulo se comia el texto entero y el
  // area se descartaba por tener un subtitulo larguisimo. Aqui una linea que
  // empieza por una marca abre bloque siempre, haya hueco delante o no.
  const lineas = String(texto || '').split(/\r?\n/);
  const brutos = [];
  let actual = null;
  let huecoAntes = true;
  // Marca que el modelo ha dejado sola en su linea, con el texto debajo:
  // se guarda y se le pone al primer trozo de texto que venga.
  let marcaPendiente = null;

  for (let i = 0; i < lineas.length; i++) {
    if (!lineas[i].trim()) { huecoAntes = true; continue; }
    const marca = marcaDeLinea(lineas[i]);
    if (marca && !marca.resto.trim()) { marcaPendiente = marca.tipo; huecoAntes = true; continue; }

    if (marca || huecoAntes || !actual) {
      const tipo = marca ? marca.tipo : (marcaPendiente || 'texto');
      actual = { tipo, marcado: !!(marca || marcaPendiente), lineas: [] };
      marcaPendiente = null;
      brutos.push(actual);
      actual.lineas.push(marca ? marca.resto.trim() : lineas[i].trim());
    } else {
      actual.lineas.push(lineas[i].trim());
    }
    huecoAntes = false;
  }

  const bloques = [];
  for (let i = 0; i < brutos.length; i++) {
    const b = brutos[i];
    // Un subtitulo, un remate y una pregunta son una linea: lo que venga
    // pegado debajo es el texto que sigue, no parte de ellos.
    const utiles = b.lineas.filter(l => l);
    const cortaEnLaPrimera = (b.tipo === 'sub' || b.tipo === 'remate' || b.tipo === 'pregunta');
    const suyas = cortaEnLaPrimera ? utiles.slice(0, 1) : utiles;
    const sobran = cortaEnLaPrimera ? utiles.slice(1) : [];

    let cuerpo = limpiarCuerpo(suyas.join(' '));
    if (cuerpo) {
      let tipo = b.tipo;
      if (tipo === 'texto' && esPreguntaSuelta(cuerpo)) tipo = 'pregunta';
      bloques.push({ tipo, t: cuerpo, marcado: b.marcado });
    }
    if (sobran.length > 0) {
      const resto = limpiarCuerpo(sobran.join(' '));
      if (resto) {
        bloques.push({ tipo: esPreguntaSuelta(resto) ? 'pregunta' : 'texto', t: resto, marcado: false });
      }
    }
  }

  // UN LADILLO EN LA PRIMERA LINEA SE BAJA, NO SE TIRA EL AREA.
  //
  // El area no puede abrir por un ladillo: la pagina ya lleva el titulo
  // impreso arriba y uno pegado debajo se lee como si el area empezara por la
  // mitad. Pero eso es maquetacion, no contenido, y lo arregla el que maqueta.
  //
  // Antes se descartaba el area entera y se volvia a pedir. En la generacion
  // del 22 de agosto a las 18:13 eso costo quince llamadas de repaso, dos
  // minutos, un euro, y el cliente se quedo sin informe por un ladillo mal
  // puesto. Ahora se baja al hueco siguiente y sigue adelante.
  //
  // Se coloca despues del primer parrafo de texto, que es donde habria ido de
  // haberlo puesto bien. Si el area no tiene ningun parrafo detras, no hay
  // donde bajarlo y se cae solo.
  // Se hace en bucle porque pueden venir dos pegados; cada vuelta saca uno y
  // la lista mengua, asi que termina siempre.
  while (bloques.length > 0 && bloques[0].tipo === 'sub') {
    const ladillo = bloques.shift();
    let dondeVa = -1;
    for (let i = 0; i < bloques.length; i++) {
      if (bloques[i].tipo === 'texto' || bloques[i].tipo === 'escena') { dondeVa = i + 1; break; }
    }
    // Tiene que quedar algo DETRAS del ladillo: el ultimo parrafo del area es
    // el cierre y nada va detras de el, asi que un ladillo colado al final
    // dejaria el area sin cierre. Si no hay sitio, se queda fuera.
    if (dondeVa > 0 && dondeVa < bloques.length) bloques.splice(dondeVa, 0, ladillo);
  }

  // LO QUE SOBRA SE COLOCA, NO SE TIRA EL AREA.
  //
  // Un area que llega con un remate de tres lineas, con cinco parrafos de
  // escena o con media pagina en negrita no es un area rota: es un area con
  // un exceso de maquetacion. Antes eso la descartaba y se volvia a pedir, y
  // cada vuelta es otra llamada al modelo, mas espera y mas dinero. El 22 de
  // agosto un ladillo mal puesto costo quince llamadas y un informe.
  //
  // Todo lo de aqui abajo es lo mismo: lo que se pasa de la raya se convierte
  // en parrafo normal, que es lo que habria hecho el que maqueta. Nada se
  // borra, solo cambia de tamano. Lo que FALTA no se puede arreglar asi, y eso
  // se queda en revisarBloques.
  {
    // Un ladillo que se ha ido de largo es una frase, no un ladillo.
    for (const b of bloques) {
      if (b.tipo === 'sub' && b.t.length > LARGO_SUB) b.tipo = 'texto';
    }
    // Ladillos de sobra: se quedan los primeros y el resto se va, que son
    // etiquetas de tres palabras y no se pierde nada contado.
    let vistos = 0;
    for (let i = 0; i < bloques.length; i++) {
      if (bloques[i].tipo !== 'sub') continue;
      vistos++;
      if (vistos > MAX_SUBS) { bloques.splice(i, 1); i--; }
    }
    // La escena son uno o dos parrafos: lo que venga detras es texto.
    let escenas = 0;
    for (const b of bloques) {
      if (b.tipo !== 'escena') continue;
      escenas++;
      if (escenas > MAX_ESCENAS) b.tipo = 'texto';
    }
    // Una destacada que no cabe en una frase deja de destacar: a texto.
    for (const b of bloques) {
      if ((b.tipo === 'remate' || b.tipo === 'pregunta') && b.t.length > LARGO_DESTACADA) b.tipo = 'texto';
    }
    // Remates de sobra: los primeros se quedan grandes, el resto a texto.
    let remates = 0;
    for (const b of bloques) {
      if (b.tipo !== 'remate') continue;
      remates++;
      if (remates > MAX_REMATES) b.tipo = 'texto';
    }
    // El area tampoco puede abrir por una frase grande: el lector acaba de
    // pasar de pagina y lo primero que se encuentra es el golpe, sin saber
    // todavia de que le hablan. Baja a parrafo normal, que es como se lee esa
    // misma frase dentro del texto, y el area arranca con ella como entradilla.
    if (bloques.length > 0 && (bloques[0].tipo === 'remate' || bloques[0].tipo === 'pregunta')) {
      bloques[0].tipo = 'texto';
    }
    // Dos destacadas pegadas se leen como un cartel en mitad del area: la
    // segunda baja a texto y queda el hueco que hacia falta entre ellas.
    for (let i = 1; i < bloques.length; i++) {
      const grande = t => t === 'remate' || t === 'pregunta';
      if (grande(bloques[i].tipo) && grande(bloques[i - 1].tipo)) bloques[i].tipo = 'texto';
    }
  }

  // LAS NEGRITAS QUE SE PASAN SE QUITAN, NO TIRAN EL AREA.
  //
  // Una negrita de tres lineas ya no resalta, y media pagina marcada tampoco:
  // lo que destaca es lo que va solo. Las dos cosas se arreglan quitando la
  // marca, que no toca ni una palabra del texto y no puede crear una falta.
  // Se quitan siempre las mas largas primero, que son justo las que estan mal
  // segun la regla: se marca el golpe, no el parrafo.
  {
    const cuerpo = bloques.filter(b => b.tipo === 'texto');
    const desmarcar = (bloque, trozo) => {
      bloque.t = bloque.t.replace('**' + trozo + '**', trozo);
    };
    // Primero las que se han ido de largo, una por una.
    for (const b of cuerpo) {
      let m;
      NEGRITA.lastIndex = 0;
      const largas = [];
      while ((m = NEGRITA.exec(b.t)) !== null) {
        if (m[1].trim().length > LARGO_NEGRITA) largas.push(m[1]);
      }
      for (const t of largas) desmarcar(b, t);
    }
    // Y despues, si sigue marcada mas de una cuarta parte del cuerpo, se van
    // cayendo las mas largas hasta bajar del tope.
    const palabrasCuerpo = cuerpo.reduce((n, b) => n + contarPalabras(b.t), 0);
    if (palabrasCuerpo > 0) {
      let intentos = 0;
      while (intentos++ < 50) {
        const marcadas = negritasDe(bloques);
        const enNegrita = marcadas.reduce((n, t) => n + contarPalabras(t), 0);
        if (enNegrita <= palabrasCuerpo * TOPE_NEGRITA) break;
        const masLarga = marcadas.reduce((a, b2) => (b2.length > a.length ? b2 : a), '');
        if (!masLarga) break;
        const donde = cuerpo.find(b => b.t.includes('**' + masLarga + '**'));
        if (!donde) break;
        desmarcar(donde, masLarga);
      }
    }
  }

  // UN REMATE SIN MARCAR SE RECONOCE, PERO SOLO SI NO HAY NINGUNO.
  //
  // Con las preguntas ya se hace: una pregunta suelta se reconoce sola aunque
  // el modelo se deje la marca. Con los remates no se puede hacer siempre,
  // porque un remate es un parrafo de una frase corta y eso tambien lo es un
  // parrafo normal de dos lineas, que el prompt pide a proposito: se llenaria
  // el area de frases grandes centradas.
  //
  // Asi que solo se hace cuando el area no trae NINGUN remate, que es cuando
  // la alternativa es tirarla. Se busca el mejor candidato: un parrafo de una
  // sola frase, corto, que no sea el primero ni el ultimo y que no toque otra
  // destacada. Si no hay ninguno claro, no se inventa nada.
  if (!bloques.some(b => b.tipo === 'remate')) {
    // De todos los que valen se coge EL MAS CORTO, no el primero. Un remate
    // es una frase que golpea y se acaba; un parrafo normal de dos lineas
    // tambien es una sola frase, pero es mas largo porque desarrolla algo.
    let elegido = -1, masCorto = Infinity;
    for (let i = 1; i < bloques.length - 1; i++) {
      const b = bloques[i];
      if (b.tipo !== 'texto') continue;
      const limpio = b.t.replace(/\*\*/g, '').trim();
      // Ni una linea suelta ni un parrafo desarrollado: entre las dos cosas.
      if (limpio.length < 40 || limpio.length > 160) continue;
      // Una sola frase: no hay punto ni interrogante dentro, solo al final.
      if (/[.!?]/.test(limpio.slice(0, -1))) continue;
      const grande = t => t === 'remate' || t === 'pregunta';
      if (grande(bloques[i - 1].tipo) || grande(bloques[i + 1].tipo)) continue;
      if (limpio.length < masCorto) { masCorto = limpio.length; elegido = i; }
    }
    if (elegido >= 0) bloques[elegido].tipo = 'remate';
  }

  // El ultimo parrafo normal del area es el CIERRE, que se pinta aparte.
  // Si el cierre es una pregunta ("¿y si nunca fue culpa tuya?"), el
  // reconocedor de preguntas se lo habria quedado y el area se descartaria
  // por no acabar en cierre: un cierre en forma de pregunta es un cierre.
  // Con la marca [PREGUNTA] puesta a proposito no vale, ahi si es un fallo.
  const fin = bloques.length - 1;
  if (fin >= 0 && bloques[fin].tipo === 'pregunta' && !bloques[fin].marcado) {
    bloques[fin].tipo = 'cierre';
  } else {
    for (let j = fin; j >= 0; j--) {
      if (bloques[j].tipo === 'texto') { bloques[j].tipo = 'cierre'; break; }
    }
  }

  return bloques;
}

// QUE PARA UN AREA Y QUE NO.
//
// La regla, decidida mirando lo que ve el cliente: se para solo por lo que
// rompe el producto. Lo que sobra ya lo ha colocado el saneado de arriba sin
// gastar una llamada, y lo que falta casi siempre se lee perfectamente.
//
// SE PARA (cuatro cosas):
//   - sin escena: es el bloque en cursiva con su barra dorada, y sin el una de
//     las cuatro piezas del diseno no existe
//   - sin ningun remate: no hay ni una frase grande en cuatro paginas
//   - sin ninguna pregunta: el area se lee de corrido sin una sola pausa
//   - sin cierre: el area termina en el aire
//
// SE ENTREGA Y SE AVISA (lo de avisosBloques):
//   - dos ladillos en vez de tres, un remate en vez de dos, un area sin
//     negritas, un area donde no la llaman por su nombre
//
// Un area con eso se lee bien, y tirar el informe entero por ello es lo que
// dejo a una clienta pagando sin recibir nada el 22 de agosto.
export function revisarBloques(bloques) {
  const fallos = [];
  const cuantos = t => bloques.filter(b => b.tipo === t).length;

  if (cuantos('escena') < 1) {
    fallos.push('falta la escena: su párrafo tiene que empezar por [ESCENA]');
  }
  if (cuantos('remate') < 1) {
    fallos.push('no hay ningún remate: son dos, el de la herida y el de la fuerza, cada uno solo en su párrafo empezando por [REMATE]');
  }
  if (cuantos('pregunta') < 1) {
    fallos.push('falta la pregunta directa suelta en su propio párrafo, empezando por [PREGUNTA]: sin ninguna pregunta el área se lee de corrido, sin una sola pausa');
  }
  const ultimo = bloques[bloques.length - 1];
  if (!ultimo || ultimo.tipo !== 'cierre') {
    fallos.push('el área tiene que terminar con el párrafo de cierre, sin marca ninguna y sin nada detrás');
  }
  return fallos;
}

// Lo que no para el area pero conviene saber, porque si se repite es que algo
// se esta escapando en el prompt. Se escribe en los registros y se sigue.
export function avisosBloques(bloques, opciones) {
  const minSub = (opciones && opciones.minSub) || 2;
  const avisos = [];
  const conTipo = t => bloques.filter(b => b.tipo === t);

  const subs = conTipo('sub');
  if (subs.length < minSub) avisos.push(`solo ${subs.length} ladillo(s), se piden ${minSub}`);

  const remates = conTipo('remate');
  if (remates.length < 2) avisos.push(`solo ${remates.length} remate(s), se piden 2`);

  const cuerpo = conTipo('texto');
  if (cuerpo.length > 0) {
    const palabrasCuerpo = cuerpo.reduce((n, b) => n + contarPalabras(b.t), 0);
    const suelo = Math.max(1, Math.floor(palabrasCuerpo / 300));
    if (negritasDe(bloques).length < suelo) avisos.push('el área se queda plana: casi nada en negrita');
  }
  return avisos;
}
