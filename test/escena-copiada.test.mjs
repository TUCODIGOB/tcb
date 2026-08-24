// ═════════════════════════════════════════════════════════════════
// test/escena-copiada.test.mjs
//
// La escena se escribe en su casilla y solo ahi. Cuando el modelo la copia
// ademas dentro de "parrafos", al cliente le sale impresa dos veces
// seguidas, palabra por palabra: paso en el area 1 del informe del 7 de
// marzo, pagina 7.
//
// Antes eso lo cazaba loQueLeFaltaAlArea, que vuelve a pedir el AREA
// ENTERA: 900 palabras de salida, que es lo que se paga caro, para borrar
// un parrafo que ya sabemos cual es. Y con un solo repaso: si el modelo
// volvia a copiarla, se imprimia igual. Se pagaba y encima salia mal.
//
// Ahora el parrafo se borra y ya. Esta prueba comprueba las tres cosas que
// pueden salir mal con eso:
//
//   A. la copia se va, la escena se sigue leyendo, y NO se vuelve a pedir
//      el area (que es el ahorro)
//   B. un parrafo que solo CITA la escena no se borra: ahi se sigue
//      haciendo lo de antes. Borrar de mas seria peor que el fallo.
//   C. un area sin copias no se toca
//
// Y la que de verdad importa: al quitar un parrafo, los numeros
// "tras_parrafo" que colocan la escena, los remates y la pregunta se
// desplazan. Si no se corrigen, las frases grandes salen donde no toca y
// el area se lee troceada. Se comprueba una a una.
//
// Ejecutar:  node test/escena-copiada.test.mjs
// Sin red y sin Stripe: cliente de Stripe de mentira y fetch interceptado.
// No toca ningun fichero de produccion.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analizarArea, revisarBloques, montarArea } from '../lib/bloques.js';
import { vecesQueLaLlamaPorSuNombre } from '../lib/estilo.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const SEPARADOR_AREAS = '';

// ── Stripe de mentira: una tienda en memoria.
const TIENDA = new Map();
const STRIPE_FALSO = `
export default function Stripe() {
  return { checkout: { sessions: {
    async retrieve(id) {
      const s = globalThis.__TIENDA.get(id);
      return s ? JSON.parse(JSON.stringify(s)) : null;
    },
    async update(id, { metadata }) {
      const s = globalThis.__TIENDA.get(id);
      s.metadata = {};
      for (const [k, v] of Object.entries(metadata)) {
        if (v !== '' && v != null) s.metadata[k] = String(v);
      }
      return JSON.parse(JSON.stringify(s));
    },
  } } };
}`;
globalThis.__TIENDA = TIENDA;

// ── LA ESCENA, y el parrafo que la copia palabra por palabra.
const ESCENA = 'Son las once de la noche y todavia estas repasando el movil con la luz apagada.';

// Un parrafo que NO es la escena: la cita de pasada y sigue con lo suyo.
// Comparte ocho palabras seguidas con ella, que es justo lo que hace saltar
// el aviso, pero es texto propio y no se puede borrar.
const SOLO_LA_CITA = 'Aquella frase que te dijiste, son las once de la noche y todavia, se te quedo grabada dentro sin que supieras nunca muy bien por que motivo.';

// Los parrafos que sobreviven en los tres casos. Llevan el nombre y tres
// negritas a proposito: asi no salta ninguna de las OTRAS reparaciones y lo
// que cuenta esta prueba son solo las llamadas que escriben el area.
const CUERPO = [
  { ladillo: null, texto: 'Te levantas y lo primero que haces es repasar la lista de lo que tienes pendiente, y eso lo llevas haciendo desde siempre.' },
  { ladillo: 'La cuenta que no llevas', texto: 'Y mientras asientes, Ana, por dentro **estas calculando cuanto has ensenado de mas**, que es un trabajo que no descansa.' },
  { ladillo: null, texto: 'De ahi sale todo lo demas, que es lo que nadie te ha contado y **llevas media vida pagando sin enterarte**.' },
  { ladillo: 'Donde empezo esto', texto: '**Eso no se arregla apretando mas**, se arregla mirando de donde viene y quien te enseno a hacerlo asi.' },
  { ladillo: null, texto: 'Y cuando por fin te sientas, la cabeza sigue repasando lo que queda para manana como si alguien lo fuera a corregir.' },
];

// El area se pide por bloques con huecos con nombre, no por una lista de
// parrafos: ver ESQUEMA_AREA_POR_BLOQUES en api/chat.js. Esto reparte una lista
// de parrafos por los cinco bloques en el mismo orden en que el codigo los
// vuelve a juntar, asi que el texto que sale es identico al de la lista.
// Los cinco bloques tienen que llevar algo: uno vacio es justo el fallo que
// esto viene a impedir, y api/chat.js vuelve a pedir el area.
function porBloques(parrafos) {
  const nombres = ['arranque', 'hoy', 'origen', 'creencias', 'soltar'];
  const bloques = {};
  for (const nombre of nombres) bloques[nombre] = {};
  parrafos.forEach((p, i) => {
    const donde = bloques[nombres[Math.min(i, nombres.length - 1)]];
    donde['p' + (Object.keys(donde).length + 1)] = p;
  });
  return bloques;
}

// Lo que api/chat.js hace con los bloques antes de montar el area: juntarlos en
// una lista de parrafos y cambiar el "tras_bloque" por el numero de parrafo.
function comoLoVeMontarArea(area) {
  const nombres = ['arranque', 'hoy', 'origen', 'creencias', 'soltar'];
  const parrafos = [];
  const acaba = {};
  for (const nombre of nombres) {
    const bloque = area[nombre] || {};
    for (const hueco of Object.keys(bloque).sort()) parrafos.push(bloque[hueco]);
    acaba[nombre] = parrafos.length;
  }
  const salida = { ...area, parrafos };
  for (const casilla of ['escena', 'remate_herida', 'remate_fuerza', 'pregunta']) {
    if (salida[casilla]) {
      salida[casilla] = { ...salida[casilla], tras_parrafo: acaba[salida[casilla].tras_bloque] || 1 };
    }
  }
  return salida;
}


// El area tal como llega del modelo. "intruso" es el parrafo que se cuela en
// la posicion 1; con los numeros puestos como los pone el modelo cuando ha
// copiado la escena: la escena detras del parrafo copiado, y todo lo demas
// mas abajo.
function areaCon(intruso) {
  const parrafos = intruso === null
    ? [...CUERPO]
    : [CUERPO[0], { ladillo: null, texto: intruso }, ...CUERPO.slice(1)];
  return JSON.stringify({
    ...porBloques(parrafos),
    escena: { tras_bloque: 'arranque', texto: ESCENA },
    pregunta: { tras_bloque: 'hoy', texto: '¿Cuantas veces te has callado algo por no montar un lio?' },
    remate_herida: { tras_bloque: 'origen', texto: 'Llevas media vida pidiendo permiso para ocupar tu propio sitio' },
    remate_fuerza: { tras_bloque: 'creencias', texto: 'Nadie aguanta tanto tiempo de pie sin que eso sea una fuerza' },
    cierre: 'Y hasta que no veas eso, vas a seguir buscando fuera lo que lleva anos esperandote dentro.',
  });
}

// Y el aviso: si algun dia se le pide al area algo mas y estos textos de
// mentira dejan de cumplirlo, la prueba lo dice en una linea en vez de
// morirse reintentando y dejar de vigilar lo que viene a vigilar.
{
  const montada = montarArea(comoLoVeMontarArea(JSON.parse(areaCon(null))));
  const faltan = revisarBloques(analizarArea(montada));
  if (vecesQueLaLlamaPorSuNombre(montada, 'Ana') < 1) {
    faltan.push('el area de mentira no llama "Ana" a la clienta ni una vez, y api/chat.js lo exige');
  }
  if (faltan.length > 0) {
    console.error('\n  X El area de mentira de esta prueba ya no pasa la revision de lib/bloques.js:');
    for (const f of faltan) console.error('    - ' + f);
    console.error('\n  Arregla CUERPO aqui arriba. Mientras no pase, esta prueba no comprueba nada.\n');
    process.exit(1);
  }
}

// ── El modelo de mentira. Devuelve el area que toque en cada escenario y
//    cuenta SOLO las llamadas que escriben un area, que son las caras.
let queDevuelve = areaCon(null);
let llamadasAlModelo = 0;
let auxiliaresInesperadas = [];

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (!u.includes('api.anthropic.com')) {
    return { ok: true, status: 200, json: async () => ({}) };   // Brevo
  }
  const cuerpo = JSON.parse(opts.body || '{}');
  const sistema = String(
    Array.isArray(cuerpo.system) ? (cuerpo.system[0] && cuerpo.system[0].text) || '' : cuerpo.system || ''
  );

  // La llamada que calienta la cache. Se reconoce por su mensaje, "ok": el
  // resto de la peticion es identica a la de un area a proposito, para que la
  // cache acierte, asi que no vale mirar max_tokens ni el esquema.
  if (cuerpo.messages?.[0]?.content === 'ok') {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: 'ok' }] }) };
  }
  // El repaso de estilo lee el area, no la escribe: no cuenta como generacion.
  if (sistema.startsWith('Eres un corrector de estilo')) {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{"frases":[]}' }] }) };
  }
  // Estas dos NO deberian saltar: el area de mentira ya trae el nombre y las
  // tres negritas. Si saltan, el area de mentira se ha quedado corta y el
  // recuento de llamadas dejaria de significar lo que dice significar.
  if (sistema.startsWith('Eres un corrector.') || sistema.startsWith('Eres un maquetador')) {
    auxiliaresInesperadas.push(sistema.slice(0, 30));
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{"frases":[]}' }] }) };
  }
  llamadasAlModelo++;
  return { ok: true, status: 200, json: async () => ({ content: [{ text: queDevuelve }] }) };
};

// ── Copia de api/chat.js con el import de Stripe cambiado. Se deja en test/
//    para que su "../lib/reserva.js" siga resolviendo, y se borra al acabar.
const stripeFalsoRuta = path.join(AQUI, '.stripe-falso-escena.mjs');
const chatRuta = path.join(AQUI, '.chat-escena-bajo-prueba.mjs');
const original = fs.readFileSync(path.join(RAIZ, 'api', 'chat.js'), 'utf8');
const MARCA = "import Stripe from 'stripe';";
if (!original.includes(MARCA)) {
  console.error('✘ api/chat.js ya no importa Stripe como se esperaba; hay que actualizar esta prueba.');
  process.exit(1);
}
fs.writeFileSync(stripeFalsoRuta, STRIPE_FALSO);
fs.writeFileSync(chatRuta, original.replace(MARCA, "import Stripe from './.stripe-falso-escena.mjs';"));

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.BREVO_API_KEY = '';

const limpiar = () => { for (const f of [stripeFalsoRuta, chatRuta]) try { fs.unlinkSync(f); } catch {} };

let fallos = 0;
const comprobar = (desc, ok, detalle = '') => {
  console.log(`  ${ok ? '✔' : '✘ FALLA'}  ${desc}${detalle ? '  [' + detalle + ']' : ''}`);
  if (!ok) fallos++;
};
const veces = (texto, trozo) => texto.split(trozo).length - 1;

try {
  const { default: chat } = await import(chatRuta);

  // Cada escenario con su compra: la reserva es por session_id y un mismo id
  // no deja generar dos veces.
  let n = 0;
  const generar = async (devuelve) => {
    const sid = 'cs_test_escena_' + (++n);
    TIENDA.set(sid, {
      id: sid, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
      customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
    });
    queDevuelve = devuelve;
    llamadasAlModelo = 0;
    auxiliaresInesperadas = [];
    const r = { code: 0, body: null };
    r.status = c => { r.code = c; return r; };
    r.json = b => { r.body = b; return r; };
    r.setHeader = () => {};
    await chat({ method: 'POST', body: { session_id: sid, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r);
    return r;
  };

  console.log('\n  api/chat.js — la escena copiada se borra, no se reescribe el área\n');

  // ── A. LA COPIA LITERAL ─────────────────────────────────────────
  console.log('  A. el modelo copia la escena dentro de los párrafos');
  const a = await generar(areaCon(ESCENA));
  comprobar('el informe sale', a.code === 200, 'HTTP ' + a.code);
  comprobar('el área de mentira no ha necesitado ninguna reparación auxiliar',
    auxiliaresInesperadas.length === 0, auxiliaresInesperadas.join(', '));

  const areasA = String(a.body?.texto || '').split(SEPARADOR_AREAS);
  comprobar('salen las 7 áreas', areasA.length === 7, areasA.length + ' áreas');

  const dosVeces = areasA.filter(t => veces(t, ESCENA) !== 1).length;
  comprobar('la escena se lee UNA vez en cada área, no dos',
    dosVeces === 0, dosVeces + ' área(s) con la escena repetida o perdida');

  // El ahorro: siete áreas, siete llamadas. Antes eran catorce.
  comprobar('NO se vuelve a pedir el área: 7 llamadas para 7 áreas',
    llamadasAlModelo === 7, llamadasAlModelo + ' llamadas');

  // Y lo que de verdad puede romperse al quitar un párrafo: que la escena,
  // los remates y la pregunta se queden colocados donde toca.
  const bloquesA = analizarArea(areasA[0]);
  comprobar('el área sigue completa después de quitar el párrafo',
    revisarBloques(bloquesA).length === 0, revisarBloques(bloquesA).join('; '));
  const tipos = bloquesA.map(b => b.tipo).join(',');
  for (const [nombre, tipo, cuantos] of [['la escena', 'escena', 1], ['los dos remates', 'remate', 2], ['la pregunta', 'pregunta', 1]]) {
    const hay = bloquesA.filter(b => b.tipo === tipo).length;
    comprobar(`${nombre} sigue en el área`, hay === cuantos, hay + ' de ' + cuantos);
  }
  // Ninguna frase grande pegada a otra: eso es lo que pasa si los numeros no
  // se recolocan y dos caen en el mismo hueco.
  const pegadas = bloquesA.some((b, i) => {
    const g = t => t === 'remate' || t === 'pregunta' || t === 'escena';
    return i > 0 && g(b.tipo) && g(bloquesA[i - 1].tipo);
  });
  comprobar('no quedan dos frases grandes pegadas', !pegadas, tipos);
  comprobar('el texto copiado ya no está suelto en el cuerpo',
    bloquesA.filter(b => b.tipo === 'texto' && b.t.includes(ESCENA)).length === 0);

  // ── B. SOLO LA CITA ─────────────────────────────────────────────
  console.log('\n  B. un párrafo que solo cita la escena');
  const b = await generar(areaCon(SOLO_LA_CITA));
  comprobar('el informe sale', b.code === 200, 'HTTP ' + b.code);
  const areasB = String(b.body?.texto || '').split(SEPARADOR_AREAS);
  comprobar('el párrafo NO se borra: sigue en el área',
    areasB.every(t => t.includes(SOLO_LA_CITA)));
  comprobar('la escena tampoco se pierde',
    areasB.every(t => veces(t, ESCENA) === 1));
  // Aqui se sigue haciendo lo de antes, ni mas ni menos: se avisa y se pide
  // el area una segunda vez. Preferimos pagar ese repaso antes que borrarle
  // un parrafo bueno al cliente.
  comprobar('se comporta como antes: un repaso por área',
    llamadasAlModelo === 14, llamadasAlModelo + ' llamadas');

  // ── D. UN AREA QUE SE QUEDARIA SIN HUECOS ───────────────────────
  //
  // La escena, los dos remates y la pregunta se colocan uno por parrafo. Si
  // al quitar la copia no quedan parrafos para todos, dos frases grandes
  // salen pegadas y se leen como un cartel, y con tres o menos llega a
  // perderse una. Ahi NO se quita nada: se avisa y se hace lo de antes.
  // Un parrafo repetido es malo; un area descuadrada, peor.
  console.log('\n  D. un área tan corta que quitar la copia la descuadraría');
  const d = await generar(JSON.stringify({
    ...porBloques([CUERPO[1], { ladillo: null, texto: ESCENA }, { ladillo: null, texto: ESCENA }, CUERPO[2], CUERPO[3]]),
    escena: { tras_bloque: 'hoy', texto: ESCENA },
    pregunta: { tras_bloque: 'arranque', texto: '¿Cuantas veces te has callado algo por no montar un lio?' },
    remate_herida: { tras_bloque: 'origen', texto: 'Llevas media vida pidiendo permiso para ocupar tu propio sitio' },
    remate_fuerza: { tras_bloque: 'creencias', texto: 'Nadie aguanta tanto tiempo de pie sin que eso sea una fuerza' },
    cierre: 'Y hasta que no veas eso, vas a seguir buscando fuera lo que lleva anos esperandote dentro.',
  }));
  comprobar('el informe sale igual', d.code === 200, 'HTTP ' + d.code);
  const areasD = String(d.body?.texto || '').split(SEPARADOR_AREAS);
  comprobar('no se queda ningún área sin párrafos',
    areasD.every(t => analizarArea(t).filter(b => b.tipo === 'texto').length >= 2));
  comprobar('las cuatro frases grandes siguen estando',
    areasD.every(t => {
      const b = analizarArea(t);
      return b.filter(x => x.tipo === 'escena').length === 1
        && b.filter(x => x.tipo === 'remate').length === 2
        && b.filter(x => x.tipo === 'pregunta').length === 1;
    }));

  // ── C. UN AREA LIMPIA ───────────────────────────────────────────
  console.log('\n  C. un área sin copias');
  const c = await generar(areaCon(null));
  comprobar('el informe sale', c.code === 200, 'HTTP ' + c.code);
  const areasC = String(c.body?.texto || '').split(SEPARADOR_AREAS);
  comprobar('no se toca ni un párrafo',
    areasC.every(t => CUERPO.every(p => t.includes(p.texto.replace(/\*\*/g, '') ) || t.includes(p.texto))));
  comprobar('la escena se lee una vez', areasC.every(t => veces(t, ESCENA) === 1));
  comprobar('7 llamadas para 7 áreas', llamadasAlModelo === 7, llamadasAlModelo + ' llamadas');

} catch (err) {
  console.error('\n  ✘ la prueba reventó:', err.stack || err.message);
  fallos++;
} finally {
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
