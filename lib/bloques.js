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

// Sin corchetes solo vale con dos puntos detras (ESCENA: ...), para que un
// parrafo que empiece por la palabra suelta no se convierta en una marca.
const SIN_CORCHETES = new RegExp('^\\*{0,2}\\s*(' + PALABRAS + ')\\s*:\\s*\\*{0,2}\\s*', 'i');

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
  return txt
    .replace(MARCA_SUELTA, ' ')
    .replace(/^\*{2,}\s*/, '')
    .replace(/\s*\*{2,}$/, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
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

// Lo que tiene que traer un area para poder maquetarse.
//
// Aqui se pide el MINIMO con el que la pagina ya respira, no lo ideal. El
// prompt pide tres o cuatro subtitulos y dos remates, y eso es lo que hay que
// buscar; pero si un area llega con dos subtitulos y un remate, se lee
// perfectamente y no merece la pena volver a pedirla: cada revision fallida
// es otra llamada al modelo, y en la primera generacion de verdad se gastaron
// dieciseis llamadas en lugar de siete por exigir aqui el numero ideal.
export function revisarBloques(bloques, opciones) {
  // Con dos subtitulos un area de 900 palabras ya queda partida en tres
  // trozos, que es de lo que se trata. El area 1 es mas larga y pide uno mas.
  const minSub = (opciones && opciones.minSub) || 2;
  const fallos = [];
  const cuantos = t => bloques.filter(b => b.tipo === t).length;
  const conTipo = t => bloques.filter(b => b.tipo === t);

  const subs = conTipo('sub');
  if (subs.length < minSub) {
    fallos.push(`hay ${subs.length} subtítulos y hacen falta ${minSub} como mínimo, repartidos cada 250 o 300 palabras, cada uno en su propio párrafo empezando por [SUBTITULO]`);
  }
  if (subs.length > 8) {
    fallos.push(`hay ${subs.length} subtítulos y son demasiados, con tres o cuatro basta`);
  }
  for (let i = 0; i < subs.length; i++) {
    if (subs[i].t.length > 80) {
      fallos.push('un subtítulo se ha ido de largo: son tres o cinco palabras, no una frase');
      break;
    }
  }

  const escenas = cuantos('escena');
  if (escenas < 1) fallos.push('falta la escena: su párrafo tiene que empezar por [ESCENA]');
  if (escenas > 2) fallos.push(`la escena ocupa uno o dos párrafos como mucho y hay ${escenas} marcados`);

  // El prompt pide dos remates, el de la herida y el de la fuerza. Aqui se
  // exige uno: con ninguno el area pierde sus dos frases grandes y se nota,
  // con uno se sostiene. Volver a pedir el area entera por el segundo sale
  // mas caro de lo que arregla.
  const remates = conTipo('remate');
  if (remates.length < 1) {
    fallos.push('no hay ningún remate: son dos, el de la herida y el de la fuerza, cada uno solo en su párrafo empezando por [REMATE]');
  }
  if (remates.length > 4) {
    fallos.push(`hay ${remates.length} remates y son dos`);
  }
  for (let i = 0; i < remates.length; i++) {
    if (remates[i].t.length > 220) {
      fallos.push('un remate se ha ido de largo: es una frase que se aguanta sola, no un párrafo');
      break;
    }
  }

  const preguntas = conTipo('pregunta');
  if (preguntas.length < 1) {
    fallos.push('falta la pregunta directa suelta en su propio párrafo, empezando por [PREGUNTA]');
  }
  for (let i = 0; i < preguntas.length; i++) {
    if (preguntas[i].t.length > 220) {
      fallos.push('una pregunta se ha ido de largo: va sola en su párrafo y es una sola frase');
      break;
    }
  }

  const ultimo = bloques[bloques.length - 1];
  if (!ultimo || ultimo.tipo !== 'cierre') {
    fallos.push('el área tiene que terminar con el párrafo de cierre, sin marca ninguna y sin nada detrás');
  }

  return fallos;
}
