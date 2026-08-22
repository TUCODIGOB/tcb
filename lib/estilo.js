// ═════════════════════════════════════════════════════════════════
// RETOQUES DE ESTILO QUE NO SE LE PUEDEN PEDIR AL MODELO
//
// Hay dos cosas del estilo que llevan escritas en el prompt desde el
// principio, se repiten en el repaso final, y aun asi no se cumplen. En
// el informe del 22 de agosto salieron asi:
//
//   - la coma antes de "y": 78 veces en las siete areas
//   - el nombre de la clienta: 0 veces en 26 paginas
//
// Son reglas mecanicas, de las que un modelo cumple a ratos por mucho que
// se le insista. Esta es la parte que se puede resolver contando y
// midiendo en vez de pidiendo.
// ═════════════════════════════════════════════════════════════════

// ── LA COMA ANTES DE "Y" ──────────────────────────────────────────
//
// La regla del prompt: la coma solo se queda cuando lo que va detras de
// la "y" es otra frase distinta CON SU PROPIO SUJETO. En todo lo demas
// sobra, porque un humano no la pone.
//
// Aqui NO se aplica esa regla entera, se aplica solo la parte segura.
// Decidir si dos oraciones comparten sujeto es un problema de gramatica
// que un puñado de expresiones regulares no resuelve, y una coma quitada
// donde hacia falta es una falta de ortografia impresa en un producto de
// 47 euros. Asi que ante la duda NO se toca: se quita solo cuando detras
// viene algo que no puede ser un sujeto nuevo.
//
// Sobre el informe real del 22 de agosto esto quita 21 de las 78 y deja
// intactas las 57 que estaban bien puestas.

// Detras de la "y" hay un sujeto propio, o empieza una subordinada: la
// coma se queda como esta.
const SUJETO_PROPIO = /^(eso|esa|ese|esto|esta|este|esos|esas|él|ella|ellos|ellas|nadie|nada|alguien|todo|todos|todas|cuando|si|aunque|como|donde|quien|quienes|mientras|porque|pese|es que|es|era|hay|habia|había|conviene|resulta|basta|el|la|los|las|un|una|unos|unas|tu|tus|su|sus|mi|mis|cada|otra|otro|otras|otros|muchos|muchas|pocas|pocos|algunas|algunos|ninguna|ninguno)(?=$|[\s,.;:!?])/i;

// Detras viene el MISMO sujeto. Tres formas seguras de reconocerlo:
// un pronombre atono pegado a su verbo, un verbo en segunda persona (que
// es la persona en la que esta escrito todo el estudio), o una expresion
// adverbial que no introduce a nadie nuevo.
const PRONOMBRE_ATONO = /^(lo|la|le|les|los|las|te|se|me|nos|os)\s+\S/i;
const VERBO_EN_TU = /^(acabas|llevas|sigues|haces|dices|sabes|tienes|quieres|puedes|vas|estás|estas|sientes|piensas|buscas|vuelves|sales|entras|miras|callas|cuentas|pides|das|aguantas|cargas|revisas|anticipas|resuelves|sostienes|controlas|evitas|esperas|necesitas|crees|notas|eliges|dejas|pagas|cierras|abres|sueltas|repites|cuidas|guardas|apartas)(?=$|[\s,.;:!?])/i;
const ADVERBIAL = /^(por eso|por dentro|por fuera|por fin|por si|en el fondo|en cambio|hoy|luego|después|despues|ahora|ahí|ahi|así|asi|encima|además|ademas|tampoco|todavía|todavia|aún|aun|ya)(?=$|[\s,.;:!?])/i;

// OJO CON \b: en JavaScript no marca fin de palabra detras de una vocal
// acentuada, porque \b va por el alfabeto ingles y la "í" no cuenta como
// letra. Con \b, "ahí", "así", "después" y "aún" se colaban todas. Por eso
// arriba se mira explicitamente que detras venga un espacio o un signo.

export function quitarComaAntesDeY(texto) {
  return String(texto || '').replace(
    /,(\s+[ye]\s+)([^\s,.;:]+(?:\s+[^\s,.;:]+)?)/gi,
    (todo, medio, sigue) => {
      // Si justo detras de la "y" arranca una negrita, los asteriscos tapan la
      // palabra y no se reconoce ninguna de las tres formas de abajo. Se miran
      // sin ellos, y se devuelven tal cual estaban.
      const limpio = sigue.replace(/^\*+/, '');
      if (SUJETO_PROPIO.test(limpio)) return todo;
      if (PRONOMBRE_ATONO.test(limpio) || VERBO_EN_TU.test(limpio) || ADVERBIAL.test(limpio)) {
        return medio + sigue;
      }
      return todo;
    },
  );
}

// ── EL NOMBRE DE LA PERSONA ───────────────────────────────────────
//
// Se compara sin tildes y sin mayusculas: la clienta escribe su nombre en
// una casilla y lo escribe como quiere.
function normalizar(txt) {
  return String(txt || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// No basta con mirar si la palabra esta en el texto: hay nombres que son
// palabra comun. Con una clienta llamada Sol, Rosa, Alba, Luz o Nieves,
// cualquier "cuando sale el sol" colaba como si la hubieran nombrado, y esa
// clienta se quedaba sin que la llamaran por su nombre en las 26 paginas sin
// que saltara nada.
//
// Tampoco vale exigir que vaya entre comas. Es lo correcto y es lo que sale
// casi siempre ("y ahi esta, Ana, lo que no ves"), pero un humano escribe
// igual de bien "Ana tu lo sabes", sin coma detras, y eso hay que darlo por
// bueno: si no, se manda a repasar un area que estaba perfecta.
//
// Lo que de verdad distingue el nombre de la palabra comun es lo que lleva
// DELANTE. "El sol", "una rosa", "la luz", "al alba": lo que convierte un
// nombre en cosa es un articulo o una preposicion pegada delante. Sin eso,
// esta llamando a la persona.
const DELANTE_LA_VUELVE_COSA = /(^|\s)(el|la|los|las|un|una|unos|unas|del|al|lo|ese|esa|este|esta|esos|esas|mi|tu|su|mis|tus|sus|nuestra|nuestro|a|de|con|para|por|sobre|hacia|sin|tras|entre|hasta|desde|en)\s+$/;

export function vecesQueLaLlamaPorSuNombre(texto, nombre) {
  const n = normalizar(nombre).trim();
  if (!n) return 0;
  const t = normalizar(texto);
  const escapado = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(?<![a-z0-9])' + escapado + '(?![a-z0-9])', 'g');
  let veces = 0, m;
  while ((m = re.exec(t)) !== null) {
    if (!DELANTE_LA_VUELVE_COSA.test(t.slice(Math.max(0, m.index - 14), m.index))) veces++;
  }
  return veces;
}
