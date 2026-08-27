// ═════════════════════════════════════════════════════════════════
// test/entrega-pase-lo-que-pase.test.mjs
//
// La ultima red de api/chat.js: si el area esta escrita entera y solo le
// falta una marca, se entrega, aunque el repaso falle las tres veces.
//
// POR QUE EXISTE: el 22 de agosto una clienta pago, el modelo escribio
// las siete areas, dos llegaron con un ladillo mal puesto, el repaso no
// las arreglo, y se tiro el informe entero. Pago y no recibio nada. Esta
// prueba ejerce ese camino con un modelo de mentira que falla SIEMPRE, y
// comprueba que ahora se entrega.
//
// Y comprueba lo contrario, que es igual de importante: un area que llega
// cortada a media frase NO se entrega. Eso no es una marca que falta, es
// texto que no existe.
//
// Ejecutar:  node test/entrega-pase-lo-que-pase.test.mjs
// Sin red y sin Stripe.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const SID = 'cs_test_red';

const TIENDA = new Map();
globalThis.__TIENDA = TIENDA;
const STRIPE_FALSO = `
const T = globalThis.__TIENDA;
export default function Stripe() {
  return { checkout: { sessions: {
    async retrieve(id) { return T.get(id); },
    async update(id, d) {
      const s = T.get(id);
      s.metadata = { ...s.metadata, ...(d.metadata || {}) };
      T.set(id, s); return s;
    },
  } } };
}`;

// El area que devuelve el modelo, ya por casillas. La API obliga a que
// vengan todas, asi que el caso de "se le olvido la escena" ya no existe:
// lo unico que puede pasar es que llegue en blanco, y eso se prueba abajo.

// El area se pide con una casilla por bloque, no con una lista sola: ver
// ESQUEMA_AREA_POR_BLOQUES en api/chat.js. Esto reparte una lista de parrafos
// por los cinco bloques en el mismo orden en que el codigo los vuelve a juntar,
// asi que el texto que sale es identico al de la lista. Los cinco tienen que
// llevar algo: un bloque vacio es el fallo que esto viene a impedir.
function porBloques(parrafos) {
  const nombres = ['arranque', 'hoy', 'origen', 'creencias', 'soltar'];
  const bloques = {};
  for (const nombre of nombres) bloques[nombre] = [];
  parrafos.forEach((p, i) => bloques[nombres[Math.min(i, nombres.length - 1)]].push(p));
  return { bloques };
}

const AREA_BUENA = JSON.stringify({
  ...porBloques([
    { ladillo: null, texto: 'Antes de contarte nada de ti, quiero que pienses un momento en las personas que sostienen, porque en cualquier familia hay una.' },
    { ladillo: 'La cuenta que no llevas', texto: 'Por fuera pareces tranquila, Ana, y por dentro llevas una **maquina que no para de repasar** lo que acabas de decir.' },
    { ladillo: null, pregunta: '¿cuantas veces has vuelto sobre algo que ya estaba bien?', texto: 'En el trabajo se te nota enseguida, **revisas una tarea tres veces** cuando con una bastaria, y no es que dudes de tu criterio. ¿Cuantas veces has vuelto sobre algo que ya estaba bien? Casi nunca te lo has preguntado.' },
    { ladillo: 'Donde aprendiste la cuenta', texto: 'De pequena entendiste que el carino se ganaba haciendo las cosas bien, siendo la que no daba problemas nunca.' },
    { ladillo: null, texto: 'Y cuarenta anos despues sigues revisando y sigues anticipando, **sin que nadie te lo haya pedido** jamas.' },
  ]),
  escena: { tras_bloque: 'hoy', texto: 'Son las once de la noche y sigues con el movil en la mano sin mirar nada en concreto.' },
  remate_herida: { tras_bloque: 'creencias', texto: 'Te has pasado la vida demostrando que se puede confiar en ti' },
  remate_fuerza: { tras_bloque: 'arranque', texto: 'Muy poca gente sigue sosteniendo cuando ya no la mira nadie' },
  pregunta: { tras_bloque: 'origen', texto: '¿Cuando fue la ultima vez que alguien te dio las gracias por eso?' },
  cierre: { revela: 'que la prueba se la puso ella y nadie se la pidio', texto: 'Hacer cosas no te cansa, lo que te cansa es que sea la unica prueba que te vale de que mereces estar donde estas, y esa prueba te la pusiste tu.' },
});

// Y la misma con un parrafo del cuerpo cortado a mitad de frase, que es
// como salio impresa el area 2 el 26 de agosto: "...que mejor esperar un
// poco mas. Ese", y ahi terminaba, en el PDF de una clienta.
const AREA_PARRAFO_CORTADO = (() => {
  const d = JSON.parse(AREA_BUENA);
  const ultimo = d.bloques.soltar[d.bloques.soltar.length - 1];
  ultimo.texto = 'Lo que tiene que caer es esa idea de que **lo que vales se mide en lo que resuelves**. Ese';
  return JSON.stringify(d);
})();

// Y la misma con la negrita rematando cada parrafo, que es como salio el
// area 6 el 26 de agosto: "...te llamarian igual sin necesitar nada.**". El
// parrafo esta entero, pero acaba en asterisco, y el recorte lo daba por
// cortado: se llevaba el ** de cerrar, quedaba el de abrir solo, el PDF lo
// limpiaba y la negrita desaparecia del estudio. Siete parrafos asi dejaron
// el area sin ninguna, y el codigo la volvio a pedir entera.
const AREA_NEGRITA_AL_FINAL = (() => {
  const d = JSON.parse(AREA_BUENA);
  const textos = [
    'Antes de contarte nada de ti, quiero que pienses un momento en las personas que sostienen, porque en cualquier familia **siempre hay una.**',
    'Por fuera pareces tranquila, Ana, y por dentro llevas **una maquina que no para de repasar lo que acabas de decir.**',
    'En el trabajo revisas una tarea tres veces cuando con una bastaria. ¿Cuantas veces has vuelto sobre algo que ya estaba bien? Y **no es que dudes de tu criterio.**',
    'De pequena entendiste que el carino se ganaba haciendo las cosas bien, **siendo la que no daba problemas nunca.**',
    'Y cuarenta anos despues sigues revisando y sigues anticipando, **sin que nadie te lo haya pedido jamas.**',
  ];
  ['arranque', 'hoy', 'origen', 'creencias', 'soltar'].forEach((b, i) => { d.bloques[b][0].texto = textos[i]; });
  return JSON.stringify(d);
})();

// Y un area a la mitad de largo que sus hermanas: la que salio el 26 de
// agosto traia 665 palabras y las otras seis entre 1.163 y 1.446.
const AREA_A_LA_MITAD = (() => {
  const d = JSON.parse(AREA_BUENA);
  d.bloques.arranque = [{ ladillo: null, texto: 'Hay gente que **no para nunca**, Ana.' }];
  d.bloques.hoy = [{ ladillo: 'La cuenta que no llevas', texto: 'Tu eres de esas y **se te nota en todo**.' }];
  d.bloques.origen = [{ ladillo: null, texto: 'Viene de lejos y **sigue funcionando**.' }];
  d.bloques.creencias = [{ ladillo: 'Donde empezo la cuenta', texto: 'Crees que **vales por lo que resuelves**.' }];
  d.bloques.soltar = [{ ladillo: null, texto: 'Eso es lo que **tiene que caer**.' }];
  return JSON.stringify(d);
})();

// Siete areas de tamanos distintos pero normales, como salen de verdad: en
// el informe del 26 de agosto las seis sanas iban del 91% al 113% de la
// mediana. Ninguna de estas puede disparar un repaso.
const AREA_DE_SU_TAMANO = (n) => {
  const d = JSON.parse(AREA_BUENA);
  // De 3 a 7 lineas en el bloque mas largo, segun el area: eso mueve el
  // tamano un 20% arriba y abajo, que es lo que se mueve de verdad.
  const extra = { 1: 2, 2: -1, 3: 0, 4: 1, 5: -1, 6: 0, 7: 2 }[n] || 0;
  const uno = d.bloques.hoy[0];
  d.bloques.hoy = Array.from({ length: Math.max(1, 2 + extra) }, () => ({ ...uno }));
  return JSON.stringify(d);
};

// Y un area con las dos porquerias que salieron impresas de verdad: la
// comilla que cierra sin haberse abierto (areas 6 y 7 del 26 de agosto) y el
// modelo discutiendo consigo mismo dentro del cierre (24 de agosto).
const AREA_CON_PORQUERIA = (() => {
  const d = JSON.parse(AREA_BUENA);
  d.bloques.creencias = [{ ladillo: null, texto: 'Y por debajo hay una cuenta que **nunca has puesto en duda**. Este texto no deberia llevar negritas fuera de los bloques, corrijo: el cierre no lleva negrita. Y tu sigues pagandola.' }];
  // Acaba EN comilla, y con su pareja: es el caso que no se puede tocar.
  d.bloques.soltar = [{ ladillo: null, texto: 'Y te dices por dentro, **aunque sigas pudiendo**: "no puedo mas."' }];
  d.cierre = { revela: 'que la prueba se la puso ella y nadie se la pidio', texto: 'Hacer cosas no te cansa, lo que te cansa es que sea la unica prueba que te vale de que mereces estar donde estas, y esa prueba te la pusiste tu."' };
  return JSON.stringify(d);
})();

// Lo mismo pero con la escena en blanco: la API no puede impedirlo.
const AREA_SIN_PREGUNTAS = (() => {
  const d = JSON.parse(AREA_BUENA);
  // Se le quita la unica que va dentro del texto. La de su casilla se queda:
  // esa se imprime grande y sale siempre, y no es la que faltaba.
  const p = d.bloques.origen[0];
  p.pregunta = null;
  p.texto = 'En el trabajo se te nota enseguida, **revisas una tarea tres veces** cuando con una bastaria, y no es que dudes de tu criterio.';
  return JSON.stringify(d);
})();

// Un cierre empezado por una de las tres formulas que el propio encargo del
// area prohibe. Salen solas, y con las siete areas leidas seguidas se oye el
// molde: a la tercera ya sabe como va a acabar la frase antes de leerla.
const AREA_CIERRE_DE_MOLDE = (() => {
  const d = JSON.parse(AREA_BUENA);
  d.cierre = { revela: 'que la prueba se la puso ella', texto: 'No es que no sepas descansar, es que descansar nunca te ha parecido algo que hubieras terminado de ganarte.' };
  return JSON.stringify(d);
})();

// Y un cierre con una frase que la limpieza se lleva entera. Es lo que paso
// el 26 de agosto en las areas 3 y 6: "se ha limpiado basura del modelo en
// cierre", y se entregaba lo que quedaba. Como el cierre son dos mitades -el
// golpe y lo que se le abre-, si la que se va es la segunda, lo que se
// imprime es medio cierre. Dos de siete.
const AREA_CIERRE_MUTILADO = (() => {
  const d = JSON.parse(AREA_BUENA);
  // De paso, un parrafo que anota una pregunta en su casilla y NO la escribe
  // dentro del texto: esa casilla es donde el modelo decide, no algo que se
  // imprima. Si saliera, la clienta leeria el andamio.
  d.bloques.creencias[0].pregunta = 'nota interna que no se imprime nunca';
  d.cierre = {
    revela: 'que la prueba se la puso ella',
    texto: 'Hacer cosas no te cansa, lo que te cansa es que sea la unica prueba que te vale de que mereces estar donde estas. He puesto las negritas donde tocaba.',
  };
  return JSON.stringify(d);
})();

const CIERRE_EN_TROZOS = [
  'Y el dia que dejes de medir lo que das, vas a descubrir que tambien se puede querer sin cargar con todo el peso encima.',
  '4o menos.',
  'No estas cansada de dar, estas cansada de dar sin que nadie note que tambien hace falta darte a ti.',
].join('\n');

const AREA_CIERRE_EN_TROZOS = (() => {
  const d = JSON.parse(AREA_BUENA);
  d.cierre = { revela: 'que la prueba se la puso ella', texto: CIERRE_EN_TROZOS };
  return JSON.stringify(d);
})();

const AREA_ESCENA_VACIA = JSON.stringify({
  ...JSON.parse(AREA_BUENA),
  escena: { tras_bloque: 'hoy', texto: '   ' },
});

let modo = 'buena';
let llamadas = 0;
let correoRevienta = false;
const correos = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.brevo.com')) {
    if (correoRevienta) throw new Error('Brevo caido');
    correos.push(JSON.parse(opts.body || '{}'));
    return { ok: true, status: 201, json: async () => ({}) };
  }
  if (u.includes('api.anthropic.com')) {
    // La llamada que calienta la cache. Se reconoce por su mensaje, "ok", que
    // es lo unico suyo que no comparte con las de area: el resto de la
    // peticion tiene que ser identica a proposito, para que la cache acierte.
    // Antes se reconocia por max_tokens === 1, y al cambiarlo esta prueba
    // empezo a contar el arranque como si fuera un area.
    if (JSON.parse(opts.body || '{}').messages?.[0]?.content === 'ok') {
      return { ok: true, status: 200, json: async () => ({ content: [{ text: 'ok' }] }) };
    }
    // El repaso de estilo que lee el area es otra llamada distinta de la que
    // escribe el area. Aqui se responde "no hay nada que corregir" y no se
    // cuenta como generacion, que es lo que miden las comprobaciones de abajo.
    if (String(JSON.parse(opts.body || '{}').system || '').startsWith('Eres un corrector de estilo')) {
      return { ok: true, status: 200, json: async () => ({ content: [{ text: '{"frases":[]}' }] }) };
    }
    // La lista de rasgos que cierra el informe es otra llamada, con otro
    // prompt, y no escribe ninguna area: no cuenta como generacion. Esta
    // prueba no mide la lista, asi que se le contesta que no y se sigue.
    if (String(JSON.parse(opts.body || '{}').system || '').startsWith('Eres la misma experta')) {
      return { ok: false, status: 503, text: async () => 'la lista de rasgos no es lo que mide esta prueba' };
    }
    llamadas++;
    if (modo === 'casilla vacia') {
      return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_ESCENA_VACIA }] }) };
    }
    // Solo el area 2 viene corta; las otras seis, enteras. Asi se ve si la
    // comprobacion mide contra las demas o contra un numero inventado.
    if (modo === 'porqueria') {
      return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_CON_PORQUERIA }] }) };
    }
    if (modo === 'siete distintas') {
      const n = Number((String(JSON.parse(opts.body || '{}').messages?.[0]?.content || '').match(/Genera ÚNICAMENTE el ÁREA (\d)/) || [])[1] || 1);
      return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_DE_SU_TAMANO(n) }] }) };
    }
    if (modo === 'una corta') {
      const suya = /Genera ÚNICAMENTE el ÁREA 2 /.test(String(JSON.parse(opts.body || '{}').messages?.[0]?.content || ''));
      return { ok: true, status: 200, json: async () => ({ content: [{ text: suya ? AREA_A_LA_MITAD : AREA_BUENA }] }) };
    }
    if (modo === 'cierre en trozos' || modo === 'cierre en trozos sin arreglo') {
      if (String(JSON.parse(opts.body || '{}').messages?.[0]?.content || '').includes('Lo único que falta es')) {
        llamadas--; // una casilla suelta no es una generacion de area
        if (modo === 'cierre en trozos sin arreglo') {
          return { ok: false, status: 500, text: async () => 'no sale' };
        }
        return { ok: true, status: 200, json: async () => ({ content: [{ text: JSON.stringify({ texto: 'Y el dia que dejes de medir lo que das, vas a descubrir que tambien se puede querer sin cargar con todo el peso encima.' }) }] }) };
      }
      return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_CIERRE_EN_TROZOS }] }) };
    }
    if (modo === 'cierre de molde') {
      return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_CIERRE_DE_MOLDE }] }) };
    }
    if (modo === 'cierre mutilado') {
      // La segunda llamada de una casilla suelta trae el cierre entero.
      if (String(JSON.parse(opts.body || '{}').messages?.[0]?.content || '').includes('Lo único que falta es')) {
        llamadas--; // no es una generacion de area
        return { ok: true, status: 200, json: async () => ({ content: [{ text: JSON.stringify({ texto: 'Hacer cosas no te cansa, lo que te cansa es que sea la unica prueba que te vale, y llevas anos pudiendo descansar sin saberlo.' }) }] }) };
      }
      return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_CIERRE_MUTILADO }] }) };
    }
    if (modo === 'sin preguntas') {
      return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_SIN_PREGUNTAS }] }) };
    }
    if (modo === 'negrita al final') {
      return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_NEGRITA_AL_FINAL }] }) };
    }
    if (modo === 'parrafo cortado') {
      return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_PARRAFO_CORTADO }] }) };
    }
    if (modo === 'cortada') {
      return { ok: true, status: 200, json: async () => ({
        stop_reason: 'max_tokens',
        content: [{ text: AREA_BUENA.slice(0, 400) }],
      }) };
    }
    return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_BUENA }] }) };
  }
  return { ok: true, status: 200, json: async () => ({}) };
};

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
// Con la clave vacia, enviarEmailAdmin no manda nada y no se probaria el
// aviso. Aqui se pone una de mentira: el fetch a Brevo esta interceptado.
process.env.BREVO_API_KEY = 'brevo-de-mentira';

const stripeFalsoRuta = path.join(AQUI, '.stripe-falso-red.mjs');
const chatRuta = path.join(AQUI, '.chat-red.mjs');
const original = fs.readFileSync(path.join(RAIZ, 'api', 'chat.js'), 'utf8');
const MARCA = "import Stripe from 'stripe';";
if (!original.includes(MARCA)) {
  console.error('X api/chat.js ya no importa Stripe como se esperaba.');
  process.exit(1);
}
fs.writeFileSync(stripeFalsoRuta, STRIPE_FALSO);
fs.writeFileSync(chatRuta, original.replace(MARCA, "import Stripe from './.stripe-falso-red.mjs';"));
const limpiar = () => { for (const f of [stripeFalsoRuta, chatRuta]) try { fs.unlinkSync(f); } catch {} };

let fallos = 0;
const c = (d, ok, det = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${d}${det ? '  [' + det + ']' : ''}`);
  if (!ok) fallos++;
};

// Los avisos que escribe chat.js, para comprobar que grita cuando toca.
const gritos = [];
const errOriginal = console.error;
console.error = (...a) => { gritos.push(a.join(' ')); };
const avisos = [];
const warnOriginal = console.warn;
console.warn = (...a) => { avisos.push(a.join(' ')); };

try {
  const { default: chat } = await import(chatRuta);
  const res = () => {
    const r = { code: 0, body: null };
    r.status = x => { r.code = x; return r; };
    r.json = b => { r.body = b; return r; };
    r.setHeader = () => {};
    return r;
  };

  TIENDA.set(SID, {
    id: SID, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
    customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
  });

  console.log('\n  el modelo devuelve el area por casillas\n');
  const r = res();
  await chat({ method: 'POST', body: { session_id: SID, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r);
  c('el informe sale', r.code === 200, 'HTTP ' + r.code);
  c('con las siete areas', typeof r.body?.texto === 'string' && r.body.texto.length > 3000,
    (r.body?.texto || '').length + ' caracteres');
  c('se pidio UNA vez por area, sin repasos', llamadas === 7, llamadas + ' llamadas');
  c('y no llega ningun correo', correos.length === 0, correos.length + ' correos');
  c('el area empieza por texto, no por un ladillo',
    !r.body.texto.trimStart().startsWith('[SUBTITULO]'));
  c('lleva su escena, sus dos remates y su pregunta',
    (r.body.texto.match(/\[ESCENA\]/g) || []).length >= 7 &&
    (r.body.texto.match(/\[REMATE\]/g) || []).length >= 14 &&
    (r.body.texto.match(/\[PREGUNTA\]/g) || []).length >= 7);

  // ── Una casilla en blanco: es lo unico que la API no puede impedir ──
  console.log('\n  el modelo devuelve la escena en blanco\n');
  modo = 'casilla vacia';
  llamadas = 0;
  const SID2 = 'cs_test_vacia';
  TIENDA.set(SID2, { id: SID2, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const r2 = res();
  await chat({ method: 'POST', body: { session_id: SID2, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r2);
  c('se vuelve a pedir en vez de entregarla coja', llamadas > 7, llamadas + ' llamadas');
  c('y no se entrega un area sin escena', r2.code !== 200, 'HTTP ' + r2.code);

  // ── Un parrafo cortado a mitad de frase no se imprime asi ──────────
  //
  // Y con el, la otra mitad: los remates y la pregunta acaban sin punto a
  // proposito, asi que el recorte no puede tocarlos. Si los tocara, se
  // comeria la ultima palabra de cada frase suelta del informe entero.
  console.log('\n  el modelo devuelve un parrafo cortado a mitad de frase\n');
  modo = 'parrafo cortado';
  llamadas = 0;
  const SID4 = 'cs_test_parrafo_cortado';
  TIENDA.set(SID4, { id: SID4, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const r4 = res();
  await chat({ method: 'POST', body: { session_id: SID4, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r4);
  const texto4 = String(r4.body?.texto || '');
  c('el informe sale igual', r4.code === 200 && texto4.length > 3000, 'HTTP ' + r4.code);
  c('el cabo suelto NO se imprime', !/\bEse\s*$/m.test(texto4),
    (texto4.match(/.{0,30}\bEse\s*$/m) || [''])[0]);
  c('pero la frase entera que lo precede se queda',
    texto4.includes('se mide en lo que resuelves**.'));
  c('y los remates sin punto final NO se tocan',
    texto4.includes('Muy poca gente sigue sosteniendo cuando ya no la mira nadie')
    && texto4.includes('Te has pasado la vida demostrando que se puede confiar en ti'));
  c('la pregunta tampoco', texto4.includes('¿Cuando fue la ultima vez que alguien te dio las gracias por eso?'));

  // ── Un parrafo que acaba en negrita NO esta cortado ───────────────
  console.log('\n  el modelo remata cada parrafo con una negrita\n');
  modo = 'negrita al final';
  llamadas = 0;
  avisos.length = 0;
  const SIDN = 'cs_test_negrita_al_final';
  TIENDA.set(SIDN, { id: SIDN, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const rN = res();
  await chat({ method: 'POST', body: { session_id: SIDN, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, rN);
  const textoN = String(rN.body?.texto || '');
  c('el informe sale', rN.code === 200 && textoN.length > 3000, 'HTTP ' + rN.code);
  c('no se recorta ni un parrafo',
    !avisos.some(a => /se ha recortado un parrafo cortado/.test(a)),
    (avisos.find(a => /se ha recortado/.test(a)) || 'ninguno recortado'));
  c('las negritas que rematan el parrafo llegan enteras al PDF',
    textoN.includes('**una maquina que no para de repasar lo que acabas de decir.**')
    && textoN.includes('**sin que nadie te lo haya pedido jamas.**'));
  c('y no queda ni un asterisco sin pareja',
    (textoN.match(/\*\*/g) || []).length % 2 === 0,
    (textoN.match(/\*\*/g) || []).length + ' marcas');
  // Lo que costaba el fallo: el area se quedaba sin negritas, saltaba "el
  // area se queda plana" y se volvia a pedir entera. 39 segundos y una
  // llamada de mas por siete parrafos que estaban perfectos.
  c('el área NO se vuelve a pedir: 7 llamadas para 7 áreas', llamadas === 7, llamadas + ' llamadas');
  c('y no salta el aviso de área plana',
    !avisos.some(a => /se queda plana/.test(a)),
    (avisos.find(a => /se queda plana/.test(a)) || 'ninguno'));

  // ── Un area a la mitad de largo que las demas se vuelve a pedir ────
  console.log('\n  una de las siete vuelve a la mitad de largo\n');
  modo = 'una corta';
  llamadas = 0;
  const SID5 = 'cs_test_una_corta';
  TIENDA.set(SID5, { id: SID5, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const r5 = res();
  await chat({ method: 'POST', body: { session_id: SID5, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r5);
  const avisoDeCorta = avisos.find(a => /Área 2 se ha quedado en \d+ palabras y las demas traen/.test(a));
  c('el área corta se vuelve a pedir, y por corta', Boolean(avisoDeCorta) && llamadas > 7,
    avisoDeCorta || avisos.slice(-1)[0] || 'ningún aviso');
  c('y el informe sale igual', r5.code === 200 && String(r5.body?.texto || '').length > 3000, 'HTTP ' + r5.code);

  // Y LO CONTRARIO, que es lo que importa: con las siete del mismo tamano no
  // se pide ni una vez de mas. Ya lo mide la primera comprobacion de arriba
  // ("se pidio UNA vez por area, sin repasos", 7 llamadas), asi que aqui solo
  // se comprueba que sigue siendo verdad despues de todo lo anterior.
  modo = 'buena';
  llamadas = 0;
  const SID6 = 'cs_test_siete_iguales';
  TIENDA.set(SID6, { id: SID6, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const r6 = res();
  await chat({ method: 'POST', body: { session_id: SID6, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r6);
  c('siete áreas del mismo tamaño NO disparan ningún repaso', llamadas === 7, llamadas + ' llamadas');

  // ── SIN UNA SOLA PREGUNTA DENTRO DEL TEXTO ────────────────────────
  //
  // LAS PREGUNTAS DEL TEXTO SON LAS QUE HACEN QUE SE PARE A MIRARSE, y son
  // las que no salian: en el estudio de 21 paginas hubo CUATRO en todo el
  // informe, y las cuatro eran la de la casilla de cada area.
  //
  // Ahora cada parrafo tiene su casilla para decidir si ahi toca, y aqui se
  // comprueba el suelo: un area que llega con todas a null y sin una sola
  // pregunta en cuatro paginas no es un area con pocas, es un area que no lo
  // ha hecho, igual que una sin una sola negrita.
  //
  // Y se comprueba con la pregunta de su casilla PUESTA, que es lo que hace
  // que la prueba valga: si el contador la contara, un area asi pasaria y
  // seguiriamos con cuatro preguntas por informe.
  console.log('\n  un area sin una sola pregunta dentro del texto\n');
  modo = 'sin preguntas';
  llamadas = 0;
  avisos.length = 0;
  const SID_P = 'cs_test_sin_preguntas';
  TIENDA.set(SID_P, { id: SID_P, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const rP = res();
  await chat({ method: 'POST', body: { session_id: SID_P, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, rP);
  c('un área sin preguntas en el texto se vuelve a pedir', llamadas > 7, llamadas + ' llamadas');
  c('y la pregunta de su casilla NO cuenta como una del texto',
    avisos.some(a => /no le preguntas nada en todo el texto/.test(a)),
    avisos.find(a => /no le preguntas/.test(a)) || avisos.slice(-1)[0] || 'ningún aviso');
  c('y se le dice donde van, dentro del parrafo',
    avisos.some(a => /DENTRO del parrafo, entre las demas frases/.test(a)));
  c('el informe sale igual', rP.code === 200, 'HTTP ' + rP.code);

  // ── EL CIERRE ────────────────────────────────────────────────────
  //
  // De los siete cierres del ultimo estudio, dos no revelaban nada. Aqui se
  // miran las dos cosas que si se pueden mirar por codigo: que no empiece por
  // una de las tres formulas que su propia area le prohibe, y que la limpieza
  // no lo entregue a medias.
  console.log('\n  el cierre\n');
  modo = 'cierre de molde';
  llamadas = 0;
  avisos.length = 0;
  const SID_C1 = 'cs_test_cierre_molde';
  TIENDA.set(SID_C1, { id: SID_C1, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const rC1 = res();
  await chat({ method: 'POST', body: { session_id: SID_C1, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, rC1);
  c('un cierre empezado por "No es que..." se vuelve a pedir', llamadas > 7, llamadas + ' llamadas');
  c('y se le dice que esa es una de las tres que tiene prohibidas',
    avisos.some(a => /el cierre empieza por "no es que", que es una de las tres formas/i.test(a)),
    avisos.find(a => /el cierre empieza/i.test(a)) || avisos.slice(-1)[0] || 'ningún aviso');

  // Y la limpieza que deja medio cierre impreso.
  modo = 'cierre mutilado';
  llamadas = 0;
  avisos.length = 0;
  const SID_C2 = 'cs_test_cierre_mutilado';
  TIENDA.set(SID_C2, { id: SID_C2, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const rC2 = res();
  await chat({ method: 'POST', body: { session_id: SID_C2, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, rC2);
  const textoC2 = String(rC2.body?.texto || '');
  c('un cierre al que la limpieza le quita una frase se vuelve a pedir',
    avisos.some(a => /la limpieza le ha quitado una frase entera a cierre/.test(a)),
    avisos.find(a => /limpieza le ha quitado/.test(a)) || avisos.slice(-1)[0] || 'ningún aviso');
  c('y lo que se imprime es el cierre entero, no el trozo que quedaba',
    textoC2.includes('llevas anos pudiendo descansar sin saberlo'));
  c('sin volver a escribir el área entera', llamadas === 7, llamadas + ' llamadas');
  c('y la frase del modelo no llega al papel',
    !/negritas donde tocaba/i.test(textoC2));

  // La nota con la que encuentra la revelacion es para el modelo, no para
  // ella: si se imprimiera, la clienta leeria el andamio del producto.
  c('la nota "revela" no sale impresa en ningún sitio',
    !/que la prueba se la puso ella/i.test(textoC2));
  c('ni la casilla "pregunta" de cada párrafo',
    !/nota interna que no se imprime nunca/i.test(textoC2));

  // ── EL CIERRE QUE LLEGA EN TROZOS ────────────────────────────────
  //
  // Tal como salio impreso el 28 de agosto en el area de AMOR: la casilla
  // traia DOS cierres y "4o menos." entre medias, y se pinto todo junto en
  // dorado y a pagina entera.
  console.log('\n  el cierre llega en trozos\n');
  modo = 'cierre en trozos';
  llamadas = 0;
  avisos.length = 0;
  const SID_C3 = 'cs_test_cierre_trozos';
  TIENDA.set(SID_C3, { id: SID_C3, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const rC3 = res();
  await chat({ method: 'POST', body: { session_id: SID_C3, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, rC3);
  const textoC3 = String(rC3.body?.texto || '');
  c('un cierre que llega en trozos se pide otra vez', 
    avisos.some(a => /el cierre ha llegado en 3 trozos/.test(a)),
    avisos.find(a => /ha llegado en/.test(a)) || avisos.slice(-1)[0] || 'ningún aviso');
  c('y "4o menos." NO sale impreso', !/4o menos/.test(textoC3));
  c('ni el segundo cierre pegado detrás del primero',
    !/No estas cansada de dar/.test(textoC3));
  c('el cierre bueno sí sale', textoC3.includes('sin cargar con todo el peso encima'));
  c('y no se ha reescrito el área entera', llamadas === 7, llamadas + ' llamadas');

  // Y SI EL REINTENTO NO SALE, la basura tampoco se imprime: se van los
  // trozos que no llegan ni a una frase. Lo que NO se hace nunca es quedarse
  // con un solo trozo, que es como se pierde media pagina de cierre.
  modo = 'cierre en trozos sin arreglo';
  llamadas = 0;
  avisos.length = 0;
  const SID_C4 = 'cs_test_cierre_trozos_2';
  TIENDA.set(SID_C4, { id: SID_C4, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const rC4 = res();
  await chat({ method: 'POST', body: { session_id: SID_C4, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, rC4);
  const textoC4 = String(rC4.body?.texto || '');
  c('sin reintento, el trozo suelto tampoco se imprime', !/4o menos/.test(textoC4));
  c('y no se pierde ninguna de las dos mitades escritas',
    textoC4.includes('sin cargar con todo el peso encima')
    && textoC4.includes('hace falta darte a ti'));
  c('y queda dicho en los registros',
    avisos.some(a => /el cierre se queda con 2 de sus 3 trozos/.test(a)),
    avisos.find(a => /se queda con/.test(a)) || 'ningún aviso');

  // Y con las siete de tamanos distintos pero normales, tampoco: si el liston
  // estuviera demasiado alto, cada informe pagaria repasos por nada.
  modo = 'siete distintas';
  llamadas = 0;
  avisos.length = 0;
  const SID7 = 'cs_test_siete_distintas';
  TIENDA.set(SID7, { id: SID7, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const r7 = res();
  await chat({ method: 'POST', body: { session_id: SID7, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r7);
  c('y siete de tamaños distintos pero normales, tampoco',
    !avisos.some(a => /se ha quedado en \d+ palabras y las demas traen/.test(a)),
    (avisos.find(a => /se ha quedado en/.test(a)) || 'ninguna se pide dos veces'));

  // ── Ni una comilla suelta ni una instruccion del modelo impresas ───
  console.log('\n  el modelo mete una comilla suelta y una nota suya\n');
  modo = 'porqueria';
  llamadas = 0;
  const SID8 = 'cs_test_porqueria';
  TIENDA.set(SID8, { id: SID8, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const r8 = res();
  await chat({ method: 'POST', body: { session_id: SID8, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r8);
  const texto8 = String(r8.body?.texto || '');
  c('el informe sale igual', r8.code === 200 && texto8.length > 3000, 'HTTP ' + r8.code);
  c('la nota del modelo NO se imprime',
    !/negrita/i.test(texto8) && !/corrijo/i.test(texto8),
    (texto8.match(/.{0,45}(negrita|corrijo).{0,45}/i) || ['limpio'])[0]);
  c('pero el texto bueno que iba pegado a ella se queda',
    texto8.includes('nunca has puesto en duda') && texto8.includes('Y tu sigues pagandola.'));
  c('la comilla que cierra sin abrirse NO se imprime',
    !/prueba que te vale\."/.test(texto8),
    (texto8.match(/.{0,40}prueba que te vale.{0,6}/) || [''])[0]);
  c('y la que acaba en comilla CON pareja se queda entera',
    texto8.includes('"no puedo mas."'), 'con sus dos comillas');

  // ── Un area cortada a media frase no se entrega nunca ──────────────
  console.log('\n  el modelo devuelve el area cortada\n');
  modo = 'cortada';
  const SID3 = 'cs_test_cortada';
  TIENDA.set(SID3, { id: SID3, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const r3 = res();
  await chat({ method: 'POST', body: { session_id: SID3, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r3);
  c('un area cortada NO se entrega', r3.code !== 200, 'HTTP ' + r3.code);
  c('y no se cuela ningun texto', !r3.body?.texto);

} catch (err) {
  console.error = errOriginal;
  console.warn = warnOriginal;
  console.error('\n  X la prueba reventó:', err.message);
  fallos++;
} finally {
  console.error = errOriginal;
  console.warn = warnOriginal;
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
