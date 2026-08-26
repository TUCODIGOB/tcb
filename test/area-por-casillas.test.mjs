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
    { ladillo: null, texto: 'En el trabajo se te nota enseguida, **revisas una tarea tres veces** cuando con una bastaria, y no es que dudes de tu criterio.' },
    { ladillo: 'Donde aprendiste la cuenta', texto: 'De pequena entendiste que el carino se ganaba haciendo las cosas bien, siendo la que no daba problemas nunca.' },
    { ladillo: null, texto: 'Y cuarenta anos despues sigues revisando y sigues anticipando, **sin que nadie te lo haya pedido** jamas.' },
  ]),
  escena: { tras_bloque: 'hoy', texto: 'Son las once de la noche y sigues con el movil en la mano sin mirar nada en concreto.' },
  remate_herida: { tras_bloque: 'creencias', texto: 'Te has pasado la vida demostrando que se puede confiar en ti' },
  remate_fuerza: { tras_bloque: 'arranque', texto: 'Muy poca gente sigue sosteniendo cuando ya no la mira nadie' },
  pregunta: { tras_bloque: 'origen', texto: '¿Cuando fue la ultima vez que alguien te dio las gracias por eso?' },
  cierre: 'No estas cansada de hacer cosas, estas cansada de que sea la unica prueba que te vale.',
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
    'En el trabajo revisas una tarea tres veces cuando con una bastaria, y **no es que dudes de tu criterio.**',
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
  d.cierre = 'No estas cansada de hacer cosas, estas cansada de que sea la unica prueba que te vale."';
  return JSON.stringify(d);
})();

// Lo mismo pero con la escena en blanco: la API no puede impedirlo.
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
