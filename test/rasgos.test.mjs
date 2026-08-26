// ═════════════════════════════════════════════════════════════════
// test/rasgos.test.mjs
//
// LA LISTA DE RASGOS TIENE QUE LLEGAR AL PDF, Y NO PUEDE COSTAR UN OJO.
//
// El 24 de agosto la lista no salio en el informe, y no por un motivo sino
// por tres a la vez:
//
//   1. Se pedia el JSON por escrito, sin esquema, con hueco para 3.000
//      tokens. Veinte rasgos no caben ahi: la respuesta llegaba cortada a
//      mitad de una frase, JSON.parse reventaba y la lista se iba entera a
//      la basura ("Unterminated string in JSON at position 6991").
//   2. Iba con opus, cinco veces mas caro por token que el resto del
//      informe, para sacar veinte titulares de la carta.
//   3. Se pedia DETRAS de las siete areas, sumando su espera entera al
//      informe, que ya estaba en 3 minutos de un tope de 5.
//
// Y aunque se hubieran arreglado los tres, la lista tampoco habria salido:
// generando-informe.html no la mandaba a generar-pdf, donde la seccion
// entera va dentro de un "if (rasgos && ...)".
//
// Nada de esto se ve mirando el informe: sale un PDF correcto, sin una
// pagina que nadie echa en falta si no sabe que tenia que estar. Por eso se
// vigila aqui.
//
// Ejecutar:  node test/rasgos.test.mjs
// No llama a nadie: intercepta fetch y mira lo que se iba a enviar.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quitarComaAntesDeY } from '../lib/estilo.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');

let fallos = 0;
const comprobar = (desc, ok, detalle = '') => {
  console.log(`  ${ok ? '✔' : '✘ FALLA'}  ${desc}${detalle ? '  [' + detalle + ']' : ''}`);
  if (!ok) fallos++;
};

// ── LA TIENDA DE MENTIRA ──────────────────────────────────────────
const TIENDA = new Map();
globalThis.__TIENDA = TIENDA;
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

// ── UN AREA CUALQUIERA, QUE AQUI NO ES LO QUE SE MIRA ──────────────
function porBloques(parrafos) {
  const nombres = ['arranque', 'hoy', 'origen', 'creencias', 'soltar'];
  const bloques = {};
  for (const nombre of nombres) bloques[nombre] = [];
  parrafos.forEach((p, i) => bloques[nombres[Math.min(i, nombres.length - 1)]].push(p));
  return { bloques };
}

const AREA = JSON.stringify({
  ...porBloques([
    { ladillo: null, texto: 'Te levantas y lo primero que haces es repasar la lista de lo que tienes pendiente, y eso lo llevas haciendo desde siempre.' },
    { ladillo: 'La cuenta que no llevas', texto: 'Y mientras asientes, Ana, por dentro **estas calculando cuanto has ensenado de mas**, que es un trabajo que no descansa.' },
    { ladillo: null, texto: 'De ahi sale todo lo demas, que es lo que nadie te ha contado y **llevas media vida pagando sin enterarte**.' },
    { ladillo: 'Donde empezo esto', texto: '**Eso no se arregla apretando mas**, se arregla mirando de donde viene y quien te enseno a hacerlo asi.' },
    { ladillo: null, texto: 'Y cuando por fin te sientas, la cabeza sigue repasando lo que queda para manana como si alguien lo fuera a corregir.' },
  ]),
  escena: { tras_bloque: 'arranque', texto: 'Son las once de la noche y todavia estas repasando el movil con la luz apagada.' },
  remate_herida: { tras_bloque: 'origen', texto: 'Llevas media vida pidiendo permiso para ocupar tu propio sitio' },
  remate_fuerza: { tras_bloque: 'creencias', texto: 'Nadie aguanta tanto tiempo de pie sin que eso sea una fuerza' },
  pregunta: { tras_bloque: 'hoy', texto: '¿Cuantas veces te has callado algo por no montar un lio?' },
  cierre: 'Y hasta que no veas eso, vas a seguir buscando fuera lo que lleva anos esperandote dentro.',
});

// ── LAS DOS LISTAS QUE DEVUELVE EL MODELO DE MENTIRA ───────────────
//
// Tienen que ser rasgos DE VERDAD distintos entre si. Con treinta fichas
// llamadas "Rasgo numero 1", "Rasgo numero 2"... el detector de repetidos las
// marca todas, y con razon: dicen exactamente lo mismo. Que la prueba use
// fichas de mentira no le quita el trabajo de parecerse a las de verdad.
const CATALOGO = [
  ['Buscador de verdades', 'Necesitas entender el porqué de lo que te pasa antes de poder aceptarlo del todo'],
  ['Leal hasta el agotamiento', 'Sostienes a los tuyos mucho después de que a ti ya no te quede nada dentro'],
  // Esta lleva a proposito la coma antes de "y" que el cepillo quita: sin
  // una asi, la comprobacion de mas abajo pasaria sin mirar nada.
  ['Memoria para el detalle', 'Retienes lo que dijo cada uno y en qué tono, y por dentro sigues dándole vueltas semanas después'],
  ['Instinto para el peligro', 'Hueles el problema mucho antes de que se vea, y casi siempre aciertas'],
  ['Aguante fuera de lo normal', 'Sigues de pie en sitios donde cualquiera se habría bajado hace tiempo'],
  ['Talento para ordenar el caos', 'Entras donde todo está revuelto y en dos días aquello funciona solo'],
  ['Palabra que calma', 'Hablas y la gente baja el tono sin darse cuenta de que lo ha bajado'],
  ['Curiosidad que no se apaga', 'Empiezas algo por saber cómo funciona y acabas sabiendo más que nadie'],
  ['Ojo para el talento ajeno', 'Ves de qué es capaz alguien antes de que esa persona lo sepa'],
  ['Mano para lo práctico', 'Coges un problema abstracto y lo conviertes en cuatro pasos que se pueden hacer'],
  ['Humor que desarma', 'Sueltas la broma justa en el momento en que la tensión iba a estallar'],
  ['Firmeza sin ruido', 'Dices que no sin levantar la voz y sin que nadie se sienta atacado'],
  ['Paciencia con los procesos lentos', 'Esperas a que las cosas maduren mientras el resto se pone nervioso'],
  ['Generosidad silenciosa', 'Das sin contarlo y sin que quien lo recibe llegue a enterarse del todo'],
  ['Cabeza fría en la urgencia', 'Cuando todo se tuerce eres la que piensa mientras los demás gritan'],
  ['Gusto por el trabajo bien hecho', 'Te niegas a entregar algo que sabes que podría estar mejor rematado'],
  ['Facilidad para empezar de cero', 'Cierras una etapa y arrancas otra sin arrastrar el peso de la anterior'],
  ['Lectura rápida de las salas', 'Entras en un sitio y en un minuto sabes quién manda y quién está incómodo'],
  ['Miedo a decepcionar', 'Dices que sí a cosas que no quieres solo por no ver la cara del otro'],
  ['Control que no descansa', 'Repasas por dentro lo que ya está hecho, por si acaso se te escapó algo'],
  ['Cuenta pendiente con el descanso', 'Te sientas a parar y a los diez minutos ya estás buscando algo que hacer'],
  ['Dureza contigo que no aplicas a nadie', 'Perdonas a cualquiera un fallo que a ti no te perdonarías nunca'],
  ['Dificultad para pedir', 'Prefieres cargar tú sola antes que decir en voz alta que necesitas ayuda'],
  ['Tendencia a explicarte de más', 'Justificas decisiones tuyas ante gente que no te había pedido explicaciones'],
  ['Prisa por resolver el conflicto', 'Cedes rápido con tal de que la tensión se acabe cuanto antes'],
  ['Peso de las expectativas heredadas', 'Mides tu vida con una vara que te dieron y que nunca elegiste'],
  ['Desconfianza de lo que llega fácil', 'Cuando algo sale bien sin esfuerzo buscas dónde está la trampa'],
  ['Silencio con lo que te duele', 'Cuentas lo tuyo cuando ya está resuelto, nunca mientras está pasando'],
  ['Exigencia con los tiempos', 'Te enfadas contigo por no haber llegado donde creías que ya deberías estar'],
  ['Culpa al poner un límite', 'Dices que no y te pasas el resto del día dándole vueltas'],
  ['Cansancio de ser la fuerte', 'Todos acuden a ti y nadie te pregunta a ti cómo lo llevas'],
  ['Postergar lo que te toca a ti', 'Resuelves lo de los demás y lo tuyo se queda para un día que no llega'],
  ['Relación tensa con el dinero', 'Ganas más y en vez de soltar el aire aprietas todavía un poco más'],
  ['Necesidad de tenerlo todo cerrado', 'Lo que queda abierto te ocupa la cabeza aunque no sea urgente'],
  ['Vergüenza por lo que te ilusiona', 'Rebajas lo que te hace ilusión antes de que otro pueda rebajártelo'],
  ['Poca costumbre de recibir', 'Te incomoda que te cuiden y cambias de tema en cuanto empieza'],
];


// Sin una sola palabra de astrologo: si el catalogo de mentira las llevara,
// el detector saltaria en todas las pruebas y no serviria ninguna.
const unRasgo = (i, area) => ({
  nombre: CATALOGO[i % CATALOGO.length][0],
  descripcion: CATALOGO[i % CATALOGO.length][1],
  area,
});

// Catorce fortalezas y dieciseis desafios: dentro de la horquilla, y con
// numeros distintos a proposito, que es lo que se le pide al modelo.
const RASGOS = {
  fortalezas: Array.from({ length: 14 }, (_, i) => unRasgo(i, (i % 7) + 1)),
  desafios: Array.from({ length: 16 }, (_, i) => unRasgo(i + 18, (i % 7) + 1)),
};

// Y una que llega con dos fichas que dicen lo mismo, que es lo que hay que
// pillar. La segunda no repite ni una palabra entera de la primera: repite
// las mismas raices, que es como repite un modelo de verdad.
const RASGOS_CON_REPETIDO = {
  fortalezas: [
    ...Array.from({ length: 13 }, (_, i) => unRasgo(i, (i % 7) + 1)),
    // Dice lo mismo que "Instinto para el peligro", que ya esta mas arriba
    // en esta misma lista.
    { nombre: 'Instintos para los peligros', descripcion: 'Hueles los problemas mucho antes de que se vean, y casi siempre aciertas', area: 3 },
  ],
  desafios: Array.from({ length: 16 }, (_, i) => unRasgo(i + 18, (i % 7) + 1)),
};

// Y otra con el mismo rasgo en las DOS listas, que es el peor repetido de
// todos: ademas de decir dos veces lo mismo, se contradice a si mismo.
const RASGOS_REPETIDO_CRUZADO = {
  fortalezas: Array.from({ length: 14 }, (_, i) => unRasgo(i, (i % 7) + 1)),
  desafios: [
    ...Array.from({ length: 15 }, (_, i) => unRasgo(i + 18, (i % 7) + 1)),
    // Lo mismo que "Aguante fuera de lo normal", que esta en la lista de
    // fortalezas: el mismo rasgo puesto en las dos listas a la vez.
    { nombre: 'Aguantes fuera de lo normal', descripcion: 'Sigues de pie en los sitios donde cualquiera se habria bajado hace tiempo', area: 2 },
  ],
};

// Y una lista escrita como salio de verdad el 24 de agosto: 25 de 28 fichas
// nombrando planetas, signos y casas. Es lo que la clienta no ha pagado.
//
// La ficha son dos casillas escritas, el nombre y la frase, asi que por ahi
// es por donde se puede colar un planeta y por ahi se mira.
const RASGOS_DE_ASTROLOGO = {
  fortalezas: [
    { nombre: 'Sanadora practica del dia a dia', descripcion: 'El sol y Mercurio en la casa del trabajo te dan un don para arreglar lo que esta roto', area: 1 },
    { nombre: 'Intuicion para leer a la gente', descripcion: 'Venus bien conectada con la luna te da una calidez que la gente nota enseguida', area: 6 },
    ...Array.from({ length: 12 }, (_, i) => unRasgo(i, (i % 7) + 1)),
  ],
  desafios: [
    { nombre: 'Autocritica que pesa de mas', descripcion: 'El sol enfrentado a Saturno te hizo crecer creyendo que el carino habia que ganarselo', area: 2 },
    ...Array.from({ length: 13 }, (_, i) => unRasgo(i + 18, (i % 7) + 1)),
  ],
};

// Y una lista escrita como salio de verdad el 26 de agosto: las
// descripciones cortadas por la mitad con un punto, en vez de ir seguidas y
// unidas con comas. La ficha se lee de un vistazo y ahi el punto de mas se
// nota mas que en ninguna otra parte del estudio.
const picar = (d) => {
  const trozos = String(d).split(' ');
  const corte = Math.ceil(trozos.length / 2);
  const cola = trozos.slice(corte).join(' ');
  return trozos.slice(0, corte).join(' ') + '. ' + cola.charAt(0).toUpperCase() + cola.slice(1);
};

// Las `cuantas` primeras fichas llegan picadas y el resto bien escritas, que
// es como llega de verdad: nunca todas, nunca ninguna.
const listaPicada = (cuantas) => {
  const todas = [...RASGOS.fortalezas, ...RASGOS.desafios].map(r => ({ ...r }));
  todas.slice(0, cuantas).forEach(r => { r.descripcion = picar(r.descripcion); });
  return { fortalezas: todas.slice(0, 14), desafios: todas.slice(14) };
};

// Y las dos formas en que llego escrita el 27 de agosto: la pagina entera
// sin tildes ("un cafe", "dentro de un ano", "los detalles pequenos") y las
// 28 descripciones sin el punto del final.
const sinTildes = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const listaEscritaAsi = (toca) => {
  const uno = r => ({ ...r, nombre: toca(r.nombre), descripcion: toca(r.descripcion) });
  return { fortalezas: RASGOS.fortalezas.map(uno), desafios: RASGOS.desafios.map(uno) };
};

// ── LA PUERTA QUE DEJA VER SI LA LISTA SALE ANTES O DESPUES ────────
//
// Las siete areas se quedan paradas en la puerta sin contestar. Cuando ya
// estan las siete esperando, se mira si la lista se ha pedido: si esta
// pedida es que va en paralelo, y si no, es que estaba esperando su turno
// detras de ellas. Entonces se abre la puerta y el informe sigue.
//
// Se mira asi, y no contando vueltas del bucle de eventos, porque el numero
// de vueltas que hacen falta depende de por donde pase el codigo, y una
// prueba que a veces pasa y a veces no es peor que no tenerla.
let abrirLaPuerta;
const puerta = new Promise(r => { abrirLaPuerta = r; });

let lasSieteEnLaPuerta;
const sieteEsperando = new Promise(r => { lasSieteEnLaPuerta = r; });
let areasEnLaPuerta = 0;
let laListaYaEstabaPedida = false;

// Como contesta el modelo cuando se le pide la lista: bien, cortada por
// haberse quedado sin sitio, o directamente un corte de red.
let comoSalePedirLaLista = 'bien';
// Cuantas veces se ha pedido la lista, para ver si se repite el encargo.
let vecesQueSeHaPedidoLaLista = 0;
const encargosDeLaLista = [];

const enviadas = [];
globalThis.fetch = async (url, opts = {}) => {
  if (!String(url).includes('api.anthropic.com')) {
    return { ok: true, status: 200, json: async () => ({}) };
  }
  const cuerpo = JSON.parse(opts.body || '{}');
  enviadas.push(cuerpo);

  const sistema = String(Array.isArray(cuerpo.system) ? (cuerpo.system[0] || {}).text || '' : cuerpo.system || '');

  if (sistema.startsWith('Eres la misma experta')) {
    laListaYaEstabaPedida = true;
    vecesQueSeHaPedidoLaLista++;
    encargosDeLaLista.push(String(cuerpo.messages?.[0]?.content || ''));
    if (comoSalePedirLaLista === 'red') throw new Error('fetch failed');
    // Se cae una vez y a la siguiente va bien: es el caso de verdad, la red
    // que parpadea o la API saturada un rato.
    if (comoSalePedirLaLista === 'red_una_vez' && vecesQueSeHaPedidoLaLista === 1) throw new Error('fetch failed');
    if (comoSalePedirLaLista === 'saturada' && vecesQueSeHaPedidoLaLista === 1) {
      return { ok: false, status: 529, text: async () => 'overloaded' };
    }
    // Cortada DOS veces: aqui se ve si cuenta como fallo (tres intentos) o
    // como repaso (solo uno). Con una sola vez no se distingue, porque una
    // lista vacia dispara el repaso igual y las dos formas dan 2 llamadas.
    if (comoSalePedirLaLista === 'cortada_dos_veces' && vecesQueSeHaPedidoLaLista <= 2) {
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'max_tokens', content: [{ type: 'text', text: JSON.stringify(RASGOS).slice(0, 6991) }] }) };
    }
    if (comoSalePedirLaLista === 'cortada_una_vez' && vecesQueSeHaPedidoLaLista === 1) {
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'max_tokens', content: [{ type: 'text', text: JSON.stringify(RASGOS).slice(0, 6991) }] }) };
    }
    // Una clave mal puesta o una peticion mal formada no se arregla sola.
    if (comoSalePedirLaLista === 'clave_mala') {
      return { ok: false, status: 401, text: async () => 'authentication_error' };
    }
    if (comoSalePedirLaLista === 'repetido') {
      // La primera vez repite; si se le vuelve a pedir, lo arregla.
      const cuerpoBueno = vecesQueSeHaPedidoLaLista === 1 ? RASGOS_CON_REPETIDO : RASGOS;
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(cuerpoBueno) }] }) };
    }
    if (comoSalePedirLaLista === 'astrologo' && vecesQueSeHaPedidoLaLista === 1) {
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(RASGOS_DE_ASTROLOGO) }] }) };
    }
    if (comoSalePedirLaLista === 'astrologo_siempre') {
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(RASGOS_DE_ASTROLOGO) }] }) };
    }
    if (comoSalePedirLaLista === 'cruzado') {
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(RASGOS_REPETIDO_CRUZADO) }] }) };
    }
    if (comoSalePedirLaLista === 'repite_siempre') {
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(RASGOS_CON_REPETIDO) }] }) };
    }
    if (comoSalePedirLaLista === 'sin tildes' && vecesQueSeHaPedidoLaLista === 1) {
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(listaEscritaAsi(sinTildes)) }] }) };
    }
    if (comoSalePedirLaLista === 'sin punto') {
      const quitarPunto = t => String(t).replace(/[.?!]+$/, '');
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(listaEscritaAsi(quitarPunto)) }] }) };
    }
    if (comoSalePedirLaLista === 'picada' && vecesQueSeHaPedidoLaLista === 1) {
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(listaPicada(20)) }] }) };
    }
    if (comoSalePedirLaLista === 'picada_siempre') {
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(listaPicada(20)) }] }) };
    }
    // Diez de treinta es justo un tercio: el limite por abajo. Aqui NO puede
    // saltar, o estariamos pagando un repaso por una lista que esta bien.
    if (comoSalePedirLaLista === 'algun_punto') {
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(listaPicada(10)) }] }) };
    }
    if (comoSalePedirLaLista === 'corta') {
      const pocos = { fortalezas: RASGOS.fortalezas.slice(0, 4), desafios: RASGOS.desafios.slice(0, 3) };
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(pocos) }] }) };
    }
    if (comoSalePedirLaLista === 'cortada') {
      // Lo que llegaba el 24 de agosto: JSON a medias porque no cabia.
      const aMedias = JSON.stringify(RASGOS).slice(0, 6991);
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'max_tokens', content: [{ type: 'text', text: aMedias }] }) };
    }
    return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(RASGOS) }] }) };
  }
  if (sistema.startsWith('Eres un corrector de estilo')) {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{"frases":[]}' }] }) };
  }
  if (cuerpo.messages && cuerpo.messages[0] && cuerpo.messages[0].content === 'ok') {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{' }] }) };
  }
  // Un area: se pone en la puerta y espera a que la abran.
  areasEnLaPuerta++;
  if (areasEnLaPuerta === 7) lasSieteEnLaPuerta();
  await puerta;
  return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA }] }) };
};

// ── EL chat.js DE VERDAD, CON LA TIENDA CAMBIADA ───────────────────
const stripeFalsoRuta = path.join(AQUI, '.stripe-falso-rasgos.mjs');
const chatRuta = path.join(AQUI, '.chat-rasgos-bajo-prueba.mjs');
const original = fs.readFileSync(path.join(RAIZ, 'api', 'chat.js'), 'utf8');
const MARCA = "import Stripe from 'stripe';";
if (!original.includes(MARCA)) {
  console.error('✘ api/chat.js ya no importa Stripe como se esperaba; hay que actualizar esta prueba.');
  process.exit(1);
}
fs.writeFileSync(stripeFalsoRuta, STRIPE_FALSO);
fs.writeFileSync(chatRuta, original.replace(MARCA, "import Stripe from './.stripe-falso-rasgos.mjs';"));

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.BREVO_API_KEY = '';

const limpiar = () => { for (const f of [stripeFalsoRuta, chatRuta]) try { fs.unlinkSync(f); } catch {} };

try {
  const { default: chat } = await import(chatRuta);
  const SID = 'cs_test_rasgos';
  TIENDA.set(SID, {
    id: SID, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
    customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
  });
  const r = { code: 0, body: null };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; return r; };
  r.setHeader = () => {};

  const informe = chat({ method: 'POST', body: { session_id: SID, nombre: 'Ana Ruiz', sexo: 'mujer', cartaTexto: 'Sol: Piscis' } }, r);

  // Con las siete areas paradas en la puerta, se mira si la lista ya se ha
  // pedido. Y luego se abre y el informe termina.
  await sieteEsperando;
  const laListaEstabaPedida = laListaYaEstabaPedida;
  abrirLaPuerta();
  await informe;

  console.log('\n  api/chat.js — la lista de rasgos\n');
  comprobar('el informe sale', r.code === 200, 'HTTP ' + r.code);

  const lista = enviadas.find(c => String(c.system || '').startsWith('Eres la misma experta'));
  comprobar('se pide la lista de rasgos', Boolean(lista));

  // ── 1. QUE LLEGUE ENTERA ────────────────────────────────────────
  if (lista) {
    comprobar('la lista se pide CON esquema, no pidiendo JSON por escrito',
      lista.output_config?.format?.type === 'json_schema',
      lista.output_config ? 'con esquema' : 'SIN esquema: el JSON puede llegar cortado');

    const esquema = lista.output_config?.format?.schema;
    comprobar('el esquema es el de los rasgos',
      Boolean(esquema?.properties?.fortalezas && esquema?.properties?.desafios));

    // Esta API solo admite minItems 0 y 1. Un minItems: 10 lo rechaza de
    // entrada con un 400 y la lista no llega nunca.
    const topes = [];
    (function mirar(n) {
      if (!n || typeof n !== 'object') return;
      if (n.minItems !== undefined && n.minItems > 1) topes.push('minItems: ' + n.minItems);
      if (n.maxItems !== undefined) topes.push('maxItems: ' + n.maxItems);
      for (const v of Object.values(n)) mirar(v);
    })(esquema);
    comprobar('el esquema no lleva topes de lista que la API rechaza con un 400',
      topes.length === 0, topes.join(', '));

    comprobar('hay sitio de sobra para las dos listas enteras',
      lista.max_tokens >= 6000, 'max_tokens=' + lista.max_tokens);
  }

  // ── 2. QUE NO CUESTE UN OJO ─────────────────────────────────────
  if (lista) {
    comprobar('la lista va con el mismo modelo que las áreas, no con uno más caro',
      lista.model === 'claude-sonnet-5', lista.model);
  }

  // ── 3. QUE NO SUME TIEMPO ───────────────────────────────────────
  comprobar('la lista se pide A LA VEZ que las áreas, no detrás',
    laListaEstabaPedida,
    laListaEstabaPedida ? 'ya estaba pedida con las 7 áreas en vuelo'
                        : 'esperó a que terminaran las áreas: suma su espera entera');

  // ── 4. QUE SALGA POR LA PUERTA HACIA EL PDF ─────────────────────
  comprobar('el informe devuelve los rasgos', Boolean(r.body?.rasgos));
  comprobar('devuelve las dos listas enteras',
    r.body?.rasgos?.fortalezas?.length === 14 && r.body?.rasgos?.desafios?.length === 16,
    `${r.body?.rasgos?.fortalezas?.length} fortalezas, ${r.body?.rasgos?.desafios?.length} desafíos`);
  comprobar('una lista buena no se pide dos veces',
    vecesQueSeHaPedidoLaLista === 1, vecesQueSeHaPedidoLaLista + ' llamada(s)');
  const uno = r.body?.rasgos?.fortalezas?.[0];
  // Tres, y ninguna mas: el nombre, sus dos frases y su area. Hubo una
  // cuarta, el porque, y se quito porque eso ya lo cuenta entero su area.
  comprobar('cada rasgo llega con sus tres casillas',
    Boolean(uno?.nombre && uno?.descripcion && uno?.area >= 1 && uno?.area <= 7));
  comprobar('y con ninguna mas',
    JSON.stringify(Object.keys(uno || {}).sort()) === JSON.stringify(['area', 'descripcion', 'nombre']),
    Object.keys(uno || {}).join(', '));

  // LA COMA ANTES DE "Y" SE LE QUITA A LAS FICHAS, IGUAL QUE AL TEXTO.
  //
  // El prompt la lleva pedida desde siempre y se sigue colando. El texto de
  // las siete areas pasa por quitarComaAntesDeY desde el primer dia; las
  // fichas no pasaban, asi que salian con ", y" donde el area no. Aqui se
  // comprueba que ya pasan, con una frase que el cepillo si toca.
  // Se mira en las fichas que SALEN por la puerta, no llamando a la funcion
  // suelta: el dia que alguien quite esa llamada de chat.js, esto se cae.
  const salen = [...(r.body?.rasgos?.fortalezas || []), ...(r.body?.rasgos?.desafios || [])];
  const sinCepillar = salen.filter(f => quitarComaAntesDeY(f.descripcion, 'Ana') !== f.descripcion);
  comprobar('a las fichas se les quita la coma antes de "y", como al texto',
    salen.length > 0 && sinCepillar.length === 0,
    sinCepillar.length ? sinCepillar[0].descripcion.slice(0, 60) : salen.length + ' fichas cepilladas');

  // ── 5. EL TONO ES EL MISMO QUE EL DE LAS ÁREAS ──────────────────
  //
  // No "parecido": el MISMO TEXTO. Las reglas de voz están escritas una vez
  // en api/chat.js y las usan los dos prompts. Si algún día alguien las copia
  // y las edita solo en un sitio, la última página del informe empieza a
  // sonar a otra persona y nadie se entera hasta que lo lee un cliente.
  console.log('\n  api/chat.js — la lista habla con la voz del estudio\n');

  // La de calentar la cache lleva el MISMO prompt que las de area a proposito
  // (si no, la cache no acierta), asi que se distingue por su mensaje, "ok".
  const areaEnviada = enviadas.find(c => Array.isArray(c.system)
    && String((c.system[0] || {}).text || '').startsWith('Eres una experta en psicología')
    && c.messages?.[0]?.content !== 'ok');
  const promptAreas = String((areaEnviada?.system?.[0] || {}).text || '');
  const promptLista = String(lista?.system || '');

  comprobar('se capturan los dos prompts', promptAreas.length > 1000 && promptLista.length > 1000,
    `${promptAreas.length} y ${promptLista.length} caracteres`);

  // Esto es de las AREAS, no de la lista, pero la llamada del area ya esta
  // capturada aqui y no hay mejor sitio. El 24 de agosto el area 7 se planto
  // en 5.000 tokens clavados, llego cortada y hubo que escribirla entera otra
  // vez: 50 segundos y el coste de un area, tirados. Si alguien lo vuelve a
  // bajar, esto se cae.
  comprobar('las áreas piden hueco de sobra para no llegar cortadas',
    areaEnviada?.max_tokens >= 6000, 'max_tokens=' + areaEnviada?.max_tokens);

  // Las reglas compartidas se sacan del propio fichero, no se copian aquí:
  // así la prueba no puede quedarse desfasada sin enterarse.
  const fuente = fs.readFileSync(path.join(RAIZ, 'api', 'chat.js'), 'utf8');
  const REGLAS = ['ESPANOL_DE_ESPANA', 'SIN_NOMBRAR_PLANETAS', 'FRASES_QUE_SUENAN_HABLADAS',
                  'DEFECTOS_DESDE_LA_FUERZA', 'COMA_ANTES_DE_Y', 'TODO_DE_TU', 'HABLAR_DE_ELLA_LO_ROMPE', 'PERDONA_ANTES_DE_NOMBRAR'];
  for (const regla of REGLAS) {
    const m = fuente.match(new RegExp('const ' + regla + ' = `([^`]*)`'));
    const texto = m ? m[1] : null;
    comprobar(`la regla ${regla} está en los DOS prompts, letra por letra`,
      Boolean(texto) && promptAreas.includes(texto) && promptLista.includes(texto),
      !texto ? 'no existe esa constante'
             : !promptAreas.includes(texto) ? 'falta en las áreas'
             : !promptLista.includes(texto) ? 'falta en la lista' : 'en los dos');
  }

  // Y la excepción que solo vale para las áreas NO puede estar en la lista:
  // le daría permiso para escribir fichas en tercera persona.
  const EXCEPCION = 'Cuidado con la excepción falsa';
  comprobar('la excepción de la entradilla se queda solo en las áreas',
    promptAreas.includes(EXCEPCION) && !promptLista.includes(EXCEPCION));

  // ── 5b. CADA AREA VE SUS PUNTOS DE HOY, Y SOLO LOS SUYOS ────────
  //
  // HOY le pide a cada area tres o cuatro cosas concretas, distintas en cada
  // una: son lo que la clienta ha venido a leer de esa parcela de su vida.
  //
  // Las siete listas estaban juntas dentro del prompt compartido, asi que
  // cada area recibia los 24 puntos de las siete y tenia que encontrar los
  // suyos ahi dentro. En el informe del 26 de agosto salieron 21,5 de 24: se
  // perdieron "que ganas con ellos" (Patrones) y "que te bloquea para ganar
  // mas" (Dinero), los mismos dos que ya se habian perdido el informe
  // anterior. Ahora cada area lleva los suyos en su propio encargo.
  console.log('\n  api/chat.js — cada área ve sus puntos de HOY y solo los suyos\n');

  const PUNTOS = {
    1: ['Cómo funcionas por dentro', 'Lo que se te da bien de verdad', 'Los puntos ciegos que no ves', 'Qué muestras, qué ocultas'],
    2: ['Cuáles son tus patrones', 'Qué los enciende', 'Dónde acabas siempre', 'Qué ganas con ellos'],
    3: ['Cuál es el miedo que te gobierna', 'Qué te lo dispara', 'Qué estás evitando por él'],
    4: ['Cuál es la herida y qué te la reabre', 'Cómo te proteges cuando se reabre', 'Qué necesitas de verdad'],
    5: ['Cómo eres en el amor', 'Qué tipo de persona atraes', 'Qué necesitas de la otra persona', 'Dónde falla siempre'],
    6: ['Qué papel ocupas siempre', 'Qué pasa con lo que das y lo que recibes', 'En qué dinámicas acabas metida'],
    7: ['Qué significa el dinero para ti', 'Qué haces con él cuando lo tienes', 'Qué te bloquea para ganar más'],
  };

  const encargos = {};
  for (const c of enviadas) {
    if (!Array.isArray(c.system)) continue;
    if (!String((c.system[0] || {}).text || '').startsWith('Eres una experta en psicología')) continue;
    const msg = String(c.messages?.[0]?.content || '');
    const cual = msg.match(/Genera ÚNICAMENTE el ÁREA (\d)/);
    if (cual) encargos[cual[1]] = msg;
  }
  comprobar('se capturan los encargos de las siete áreas',
    Object.keys(encargos).length === 7, Object.keys(encargos).length + ' encargo(s)');

  const sinSusPuntos = Object.keys(PUNTOS).filter(n => !PUNTOS[n].every(p => (encargos[n] || '').includes(p)));
  comprobar('cada área lleva TODOS sus puntos de HOY en su propio encargo',
    sinSusPuntos.length === 0,
    sinSusPuntos.length ? 'les faltan puntos a las áreas ' + sinSusPuntos.join(', ') : '24 puntos repartidos');

  // Y NINGUNA LLEVA LOS DE OTRA: si le llegan los 24, vuelve a tener que
  // buscar los suyos, que es justo lo que hacia que se perdieran.
  const conPuntosAjenos = [];
  for (const n of Object.keys(PUNTOS)) {
    for (const otra of Object.keys(PUNTOS)) {
      if (otra === n) continue;
      // el primer punto de cada area, que no se parece al de ninguna otra
      if ((encargos[n] || '').includes(PUNTOS[otra][0])) conPuntosAjenos.push(`${n} lleva los de ${otra}`);
    }
  }
  comprobar('y ninguna área lleva los puntos de otra',
    conPuntosAjenos.length === 0, conPuntosAjenos.slice(0, 4).join('; ') || 'cada una con los suyos');

  comprobar('el prompt compartido ya no reparte las siete listas',
    !promptAreas.includes('SOLO EN EL ÁREA'), 'quedan repartidas en los encargos');

  // ── 5c. NI UN PASADO INVENTADO, EN NINGUNO DE LOS DOS PROMPTS ───
  //
  // De la carta sale COMO esta hecha, no lo que vivio. El bloque ORIGEN
  // pedia literalmente lo contrario -"aprendiste esto de pequena, y por eso
  // hoy..."- y por eso el informe del 26 de agosto le afirmaba su infancia
  // 31 veces, incluso adivinando en voz alta ("puede que fuera un padre
  // serio"). Es lo que rompe el producto: si no se reconoce, no vuelve.
  console.log('\n  api/chat.js — a nadie se le inventa su pasado\n');

  const ENSENA_EL_PASADO = /aprendiste esto de peque|qué aprendiste, con quién|lo que aprendiste para que|se aprendió se puede desaprender|quien fue de pequeña/;
  for (const [texto, cual] of [[promptAreas, 'áreas'], [promptLista, 'lista']]) {
    comprobar(`el prompt de las ${cual} no enseña a inventarle el pasado`,
      !ENSENA_EL_PASADO.test(texto), (texto.match(ENSENA_EL_PASADO) || ['limpio'])[0]);
  }
  // La prohibicion va en los dos sitios: en el bloque ORIGEN del prompt
  // compartido, y otra vez en el repaso que cada area lee al final, justo
  // antes de entregar, que es donde se mira lo que mas se escapa.
  comprobar('el bloque ORIGEN lo prohíbe con todas las letras',
    promptAreas.includes('su pasado NO SE AFIRMA NUNCA'));
  comprobar('y las siete lo repasan otra vez antes de entregar',
    Object.values(encargos).every(e => e.includes('NI UNA FRASE QUE AFIRME SU PASADO')),
    Object.values(encargos).filter(e => e.includes('NI UNA FRASE QUE AFIRME SU PASADO')).length + ' de 7');

  // ── 5d. EL TONO DE LAS AREAS ────────────────────────────────────
  //
  // Seis cosas medidas en el informe del 26 de agosto, y todas venian de que
  // el propio prompt las ensenaba: seis de las siete areas abrieron con la
  // misma forma ("hay personas que...", "hay gente que...", "hay quien..."),
  // el que escribe se anunciaba antes de cada escena ("dejame que te ensene",
  // "ven un momento conmigo"), salio "mecanismo" impreso dos veces, el nombre
  // 9 veces en todo el estudio y 9 preguntas, una por area, que es la
  // obligatoria. Se corrigieron los sitios que lo ensenaban.
  console.log('\n  api/chat.js — el tono de las áreas\n');

  const todoElEncargo = promptAreas + Object.values(encargos).join('\n');

  const SE_ANUNCIA = /d[ée]jame que te ense[nñ]e|ven un momento conmigo|para que veas de qu[ée] te hablo|quiero que te quede clara/i;
  comprobar('nada le enseña al que escribe a anunciarse antes de la escena',
    !SE_ANUNCIA.test(todoElEncargo), (todoElEncargo.match(SE_ANUNCIA) || ['limpio'])[0]);

  comprobar('las siete tienen prohibida la forma "hay..." para abrir',
    promptAreas.includes('ESA FORMA NO SE USA'));
  // La excepcion de la entradilla la daba por buena con esas palabras
  // ("hay quien...", "casi nadie..."), y el modelo se quedaba con el ejemplo.
  comprobar('y la excepción de la entradilla ya no la da por buena',
    !promptAreas.includes('puede hablar de mucha gente ("hay quien...'),
    'sus ejemplos ya no usan esa forma');

  // "mecanismo" solo puede salir en un sitio: en la lista de lo que NO se
  // escribe. Estaba nueve veces mas como instruccion, y de ahi se copiaba.
  const cuantosMecanismos = (todoElEncargo.match(/mecanismo/gi) || []).length;
  comprobar('"mecanismo" solo aparece donde se prohíbe',
    cuantosMecanismos === 7 && !/el mismo mecanismo|contar el mecanismo|el mecanismo con el que/i.test(todoElEncargo),
    cuantosMecanismos + ' veces, una por encargo, dentro de la lista de prohibidas');

  // El area 1 abre el libro entero, no solo su area. Y solo el area 1: si lo
  // llevaran las siete, las siete entrarian como si fueran la primera.
  const abrenElLibro = Object.keys(encargos).filter(n => encargos[n].includes('abre el libro entero'));
  comprobar('solo el área 1 sabe que abre el libro',
    abrenElLibro.length === 1 && abrenElLibro[0] === '1', 'lo llevan las áreas ' + abrenElLibro.join(', '));

  // Y lo que las siete leen justo antes de entregar.
  for (const [eti, trozo] of [
    ['dos o tres preguntas más, repartidas y dentro de un párrafo', 'hay DOS o TRES mas repartidas por el area'],
    ['el nombre dos o tres veces, en bloques distintos', 'aparece DOS o TRES veces en el area y en bloques distintos'],
    ['ni una palabra de terapeuta', 'ni de terapia'],
  ]) {
    comprobar(`las siete repasan ${eti}`,
      Object.values(encargos).every(e => e.includes(trozo)),
      Object.values(encargos).filter(e => e.includes(trozo)).length + ' de 7');
  }

  comprobar('y el "no es X, es Y" tiene su tope',
    promptAreas.includes('NO ABUSES DE "NO ES X, ES Y"'));

  // ── 6. NI UNO REPETIDO ──────────────────────────────────────────
  console.log('\n  api/chat.js — ni un rasgo repetido\n');

  const pedirInforme = async (modo, sufijo) => {
    comoSalePedirLaLista = modo;
    vecesQueSeHaPedidoLaLista = 0;
    encargosDeLaLista.length = 0;
    const SID3 = 'cs_test_rasgos_' + sufijo;
    TIENDA.set(SID3, {
      id: SID3, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
      customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
    });
    const r3 = { code: 0, body: null };
    r3.status = c => { r3.code = c; return r3; };
    r3.json = b => { r3.body = b; return r3; };
    r3.setHeader = () => {};
    await chat({ method: 'POST', body: { session_id: SID3, nombre: 'Ana Ruiz', sexo: 'mujer', cartaTexto: 'Sol: Piscis' } }, r3);
    return r3;
  };

  const nombresDe = b => [...(b?.rasgos?.fortalezas || []), ...(b?.rasgos?.desafios || [])].map(x => x.nombre);

  // (a) Llega un repetido → se vuelve a pedir la lista, y la buena se entrega.
  const conRepe = await pedirInforme('repetido', 'repe');
  comprobar('un repetido hace que se vuelva a pedir la lista',
    vecesQueSeHaPedidoLaLista === 2, vecesQueSeHaPedidoLaLista + ' llamada(s)');
  comprobar('y al volver a pedirla se le dice EXACTAMENTE cuál repite',
    /dicen lo mismo/.test(encargosDeLaLista[1] || '') && /Instintos para los peligros/.test(encargosDeLaLista[1] || ''));
  comprobar('la lista que se entrega es la buena, sin repetidos',
    conRepe.body?.rasgos?.fortalezas?.length === 14 && conRepe.body?.rasgos?.desafios?.length === 16,
    `${conRepe.body?.rasgos?.fortalezas?.length} + ${conRepe.body?.rasgos?.desafios?.length}`);

  // (b) Repite las dos veces → el repetido se quita, aunque la lista se acorte.
  const siempreRepe = await pedirInforme('repite_siempre', 'repe2');
  const nombres = nombresDe(siempreRepe.body);
  comprobar('si repite las dos veces, el repetido NO sale impreso',
    !nombres.includes('Instintos para los peligros'), nombres.length + ' fichas entregadas');
  comprobar('y lo que no repetía se entrega entero',
    nombres.includes('Instinto para el peligro') && nombres.length === 29, nombres.length + ' fichas');
  comprobar('ninguna de las fichas entregadas dice lo mismo que otra',
    new Set(nombres).size === nombres.length);

  // (b2) El mismo rasgo en las DOS listas: el peor de todos.
  const cruzado = await pedirInforme('cruzado', 'cruzado');
  comprobar('un rasgo repetido ENTRE las dos listas también se pilla',
    vecesQueSeHaPedidoLaLista === 2, vecesQueSeHaPedidoLaLista + ' llamada(s)');
  comprobar('y se le avisa de que está uno en cada lista',
    /uno en cada lista/.test(encargosDeLaLista[1] || ''));
  comprobar('el informe sale bien igualmente',
    cruzado.code === 200 && nombresDe(cruzado.body).length > 0, 'HTTP ' + cruzado.code);

  // (b3) LA LISTA NO SE PUEDE CAER POR UN HIPO DE RED.
  //
  // Antes, cualquier fallo de la llamada (red, API saturada, respuesta
  // cortada) se rendia a la primera y el estudio salia sin lista. El cliente
  // ha pagado por esa lista. Las siete areas reintentan desde siempre; la
  // lista tiene que hacer lo mismo.
  console.log('\n  api/chat.js — la lista no se cae a la primera\n');

  for (const [modo, cuento] of [['red_una_vez', 'se cae la red'], ['saturada', 'la API está saturada (529)'], ['cortada_una_vez', 'la respuesta llega cortada']]) {
    const r4 = await pedirInforme(modo, 'reint_' + modo);
    comprobar(`si ${cuento} una vez, se vuelve a intentar`,
      vecesQueSeHaPedidoLaLista === 2, vecesQueSeHaPedidoLaLista + ' llamada(s)');
    comprobar(`y la lista llega entera igualmente`,
      r4.body?.rasgos?.fortalezas?.length === 14 && r4.body?.rasgos?.desafios?.length === 16,
      `${r4.body?.rasgos?.fortalezas?.length} + ${r4.body?.rasgos?.desafios?.length}`);
  }

  const dosVeces = await pedirInforme('cortada_dos_veces', 'cortada2');
  comprobar('si se corta DOS veces, se intenta una tercera',
    vecesQueSeHaPedidoLaLista === 3, vecesQueSeHaPedidoLaLista + ' llamada(s)');
  comprobar('y a la tercera la lista llega entera',
    dosVeces.body?.rasgos?.fortalezas?.length === 14 && dosVeces.body?.rasgos?.desafios?.length === 16,
    `${dosVeces.body?.rasgos?.fortalezas?.length} + ${dosVeces.body?.rasgos?.desafios?.length}`);

  // Lo que NO se arregla insistiendo, no se insiste: es tirar tiempo y dinero.
  const claveMala = await pedirInforme('clave_mala', 'clave');
  comprobar('una clave mal puesta NO se reintenta',
    vecesQueSeHaPedidoLaLista === 1, vecesQueSeHaPedidoLaLista + ' llamada(s)');
  comprobar('y el informe se entrega igual, sin la lista',
    claveMala.code === 200 && claveMala.body?.rasgos?.fortalezas?.length === 0, 'HTTP ' + claveMala.code);

  // Y si se cae las tres veces, se intenta tres veces antes de rendirse.
  const siempreCaida = await pedirInforme('red', 'red3');
  comprobar('si se cae siempre, se intenta 3 veces antes de rendirse',
    vecesQueSeHaPedidoLaLista === 3, vecesQueSeHaPedidoLaLista + ' llamada(s)');
  comprobar('y aun así el informe se entrega entero',
    siempreCaida.code === 200 && String(siempreCaida.body?.texto || '').split('\u001F').filter(x => x.trim()).length === 7);

  // (b4) NI UNA PALABRA DE ASTROLOGO IMPRESA.
  //
  // El 24 de agosto salieron 25 fichas de 28 diciendo "El sol y Mercurio en la
  // casa del trabajo diario, en un signo que vive para servir...". El prompt ya
  // lo prohibia. Pedirlo no basta: se comprueba.
  console.log('\n  api/chat.js — ni una palabra de astrólogo impresa\n');

  const astro = await pedirInforme('astrologo', 'astro');
  comprobar('una ficha que nombra planetas hace repetir la lista',
    vecesQueSeHaPedidoLaLista === 2, vecesQueSeHaPedidoLaLista + ' llamada(s)');
  comprobar('y se le dice cuáles y con qué palabra',
    /palabras de astrologo/.test(encargosDeLaLista[1] || '')
    && /Sanadora practica/.test(encargosDeLaLista[1] || ''),
    (encargosDeLaLista[1] || '').slice(-200).replace(/\n/g, ' '));
  comprobar('y lo que se entrega es la lista limpia',
    astro.body?.rasgos?.fortalezas?.length === 14 && astro.body?.rasgos?.desafios?.length === 16,
    `${astro.body?.rasgos?.fortalezas?.length} + ${astro.body?.rasgos?.desafios?.length}`);

  // Si insiste, se entrega con aviso: es peor quedarse sin lista que con una
  // lista con pegas, pero tiene que quedar dicho en los registros.
  const astroSiempre = await pedirInforme('astrologo_siempre', 'astro2');
  comprobar('si insiste, el informe se entrega igual',
    astroSiempre.code === 200, 'HTTP ' + astroSiempre.code);
  comprobar('y se intenta las dos veces antes de darlo por bueno',
    vecesQueSeHaPedidoLaLista === 2, vecesQueSeHaPedidoLaLista + ' llamada(s)');

  // Y lo contrario: una lista bien escrita NO puede hacer saltar esto, o
  // estariamos pagando repasos por listas que estan perfectas.
  comprobar('una lista bien escrita no dispara ningún repaso',
    !/palabras de astrologo/.test(encargosDeLaLista[0] || '') && encargosDeLaLista.length >= 1);

  // (c) Llega corta → se vuelve a pedir.
  const corta = await pedirInforme('corta', 'corta');
  comprobar('una lista corta hace que se vuelva a pedir',
    vecesQueSeHaPedidoLaLista === 2, vecesQueSeHaPedidoLaLista + ' llamada(s)');
  comprobar('y se le dice cuántas faltan',
    /se piden al menos/.test(encargosDeLaLista[1] || ''));
  comprobar('el informe sale igual aunque la lista venga corta las dos veces',
    corta.code === 200, 'HTTP ' + corta.code);

  // (d) LAS DESCRIPCIONES PICADAS EN DOS FRASES.
  //
  // El 26 de agosto llegaron 19 de 29 cortadas por la mitad con un punto. El
  // prompt ya pedia comas: no basto, porque sus propios ejemplos iban
  // partidos con punto y el modelo copia la forma del ejemplo antes que la
  // regla. Los ejemplos ya estan arreglados; esto es lo que lo asegura.
  console.log('\n  api/chat.js — las descripciones van seguidas, no picadas\n');

  const picada = await pedirInforme('picada', 'picada');
  comprobar('una lista con las descripciones picadas se vuelve a pedir',
    vecesQueSeHaPedidoLaLista === 2, vecesQueSeHaPedidoLaLista + ' llamada(s)');
  comprobar('y se le dice cuántas son y qué tiene que hacer',
    /20 de 30 descripciones van picadas/.test(encargosDeLaLista[1] || '')
    && /seguidas y unidas con comas/.test(encargosDeLaLista[1] || ''),
    (encargosDeLaLista[1] || '').slice(-190).replace(/\n/g, ' '));
  comprobar('y lo que se entrega es la lista bien escrita',
    [...(picada.body?.rasgos?.fortalezas || []), ...(picada.body?.rasgos?.desafios || [])]
      .every(f => !/[.?!]\s+[A-ZÁÉÍÓÚÑ]/.test(f.descripcion)),
    [...(picada.body?.rasgos?.fortalezas || []), ...(picada.body?.rasgos?.desafios || [])].length + ' fichas');

  // Si insiste, se entrega igual: es peor quedarse sin la pagina de rasgos
  // que con una pagina que tiene mas puntos de la cuenta.
  const picadaSiempre = await pedirInforme('picada_siempre', 'picada2');
  comprobar('si insiste, el informe se entrega igual',
    picadaSiempre.code === 200
    && picadaSiempre.body?.rasgos?.fortalezas?.length === 14, 'HTTP ' + picadaSiempre.code);
  comprobar('y se intenta las dos veces antes de darlo por bueno',
    vecesQueSeHaPedidoLaLista === 2, vecesQueSeHaPedidoLaLista + ' llamada(s)');

  // Y LO CONTRARIO, QUE ES LO QUE HUNDIO AL CORRECTOR QUE SE QUITO EL 26 DE
  // AGOSTO: la falsa alarma. Un punto suelto no es un fallo, a veces la frase
  // se acaba de verdad ahi. Diez de treinta es justo un tercio, el limite: si
  // saltara aqui, estariamos pagando una llamada por una lista que esta bien.
  const algunPunto = await pedirInforme('algun_punto', 'punto');
  comprobar('un tercio de puntos NO dispara ningún repaso',
    vecesQueSeHaPedidoLaLista === 1, vecesQueSeHaPedidoLaLista + ' llamada(s)');
  comprobar('y esa lista se entrega tal cual, sin tocarle nada',
    algunPunto.body?.rasgos?.fortalezas?.length === 14
    && algunPunto.body?.rasgos?.desafios?.length === 16,
    `${algunPunto.body?.rasgos?.fortalezas?.length} + ${algunPunto.body?.rasgos?.desafios?.length}`);

  // Y una lista bien escrita del todo, tampoco.
  const limpia = await pedirInforme('bien', 'limpia');
  comprobar('una lista bien escrita tampoco lo dispara',
    vecesQueSeHaPedidoLaLista === 1 && limpia.code === 200,
    vecesQueSeHaPedidoLaLista + ' llamada(s)');

  // (e) LA PAGINA ESCRITA SIN TILDES Y SIN EL PUNTO DEL FINAL.
  //
  // El 27 de agosto la pagina de rasgos salio impresa con "un cafe", "dentro
  // de un ano" y "los detalles pequenos": 2 tildes en 1.128 palabras, cuando
  // el informe anterior traia 71. Y las 28 descripciones acabaron sin punto.
  // Las dos cosas venian de copiar el prompt, que va sin tildes porque es
  // texto para el modelo, y de pedirle menos puntos dentro de la frase.
  console.log('\n  api/chat.js — con su ortografía entera y su punto final\n');

  const sinT = await pedirInforme('sin tildes', 'tildes');
  comprobar('una lista escrita sin tildes se vuelve a pedir',
    vecesQueSeHaPedidoLaLista === 2, vecesQueSeHaPedidoLaLista + ' llamada(s)');
  comprobar('y se le dice que se imprime tal cual en su libro',
    /viene escrita sin tildes/.test(encargosDeLaLista[1] || ''),
    (encargosDeLaLista[1] || '').slice(-170).replace(/\n/g, ' '));
  comprobar('y lo que se entrega es la lista bien escrita',
    /[áéíóúñ]/.test(JSON.stringify(sinT.body?.rasgos || {})),
    'con sus tildes');

  // Y LO CONTRARIO: una lista bien escrita no puede pagar un repaso. Todas
  // las demas pruebas de este fichero usan el catalogo normal, que trae 50
  // tildes en 645 palabras, y ninguna dispara esto.
  const bienEscrita = await pedirInforme('bien', 'ortografia');
  comprobar('una lista con sus tildes NO dispara ningún repaso',
    vecesQueSeHaPedidoLaLista === 1, vecesQueSeHaPedidoLaLista + ' llamada(s)');

  // El punto del final no merece una llamada: se pone aqui y ya esta.
  const sinP = await pedirInforme('sin punto', 'punto');
  const conPunto = [...(sinP.body?.rasgos?.fortalezas || []), ...(sinP.body?.rasgos?.desafios || [])];
  comprobar('una descripción sin punto final se le pone, sin volver a pedir nada',
    vecesQueSeHaPedidoLaLista === 1 && conPunto.length > 0 && conPunto.every(f => /\.$/.test(f.descripcion)),
    `${vecesQueSeHaPedidoLaLista} llamada(s), ${conPunto.filter(f => /\.$/.test(f.descripcion)).length} de ${conPunto.length} con punto`);
  comprobar('y el título sigue sin punto, que es un título',
    conPunto.every(f => !/[.?!]$/.test(f.nombre)), conPunto.length + ' títulos');

  comoSalePedirLaLista = 'bien';

  // ── 7. SI LA LISTA FALLA, EL INFORME SE ENTREGA IGUAL ───────────
  //
  // La lista es un extra. Las siete areas son lo que el cliente ha pagado, y
  // cuando la lista se pide ya estan escritas: que se caigan por esto seria
  // cambiar una pagina que falta por un informe entero que no llega.
  console.log('\n  api/chat.js — y si la lista falla\n');

  for (const [modo, cuento] of [['cortada', 'la respuesta llega cortada'], ['red', 'se cae la red al pedirla']]) {
    comoSalePedirLaLista = modo;
    const SID2 = 'cs_test_rasgos_' + modo;
    TIENDA.set(SID2, {
      id: SID2, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
      customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
    });
    const r2 = { code: 0, body: null };
    r2.status = c => { r2.code = c; return r2; };
    r2.json = b => { r2.body = b; return r2; };
    r2.setHeader = () => {};
    await chat({ method: 'POST', body: { session_id: SID2, nombre: 'Ana Ruiz', sexo: 'mujer', cartaTexto: 'Sol: Piscis' } }, r2);

    comprobar(`si ${cuento}, el informe se entrega igual`, r2.code === 200, 'HTTP ' + r2.code);
    comprobar(`si ${cuento}, las 7 áreas llegan enteras`,
      String(r2.body?.texto || '').split('\u001F').filter(t => t.trim()).length === 7);
    comprobar(`si ${cuento}, el PDF sale sin esa página en vez de no salir`,
      r2.body?.rasgos?.fortalezas?.length === 0 && r2.body?.rasgos?.desafios?.length === 0);
  }

} catch (err) {
  console.error('\n  ✘ la prueba reventó:', err.stack || err.message);
  fallos++;
} finally {
  limpiar();
}

// ── 7b. EL DETECTOR DE PALABRAS DE ASTRÓLOGO, CASO POR CASO ───────
//
// Un detector así se rompe por los dos lados: o deja pasar lo que tiene que
// cazar, o salta con palabras normales y manda a repasar listas que estaban
// bien (y eso son llamadas pagadas y tiempo). Aquí están los casos que
// deciden dónde va la raya, y explican por qué "casa", "leo" y "libra" NO
// están en la lista: son palabras corrientes de cualquier frase de una vida.
console.log('\n  api/chat.js — el detector no se pasa ni se queda corto\n');

const fuenteChat = fs.readFileSync(path.join(RAIZ, 'api', 'chat.js'), 'utf8');
const PALABRAS = eval('[' + fuenteChat.match(/const PALABRAS_DE_ASTROLOGO = \[([\s\S]*?)\];/)[1] + ']');
const CAZA = new RegExp(`(^|[^a-z0-9])(${PALABRAS.join('|')})([^a-z0-9]|$)`);
const cazaEn = (s) => {
  const m = CAZA.exec(s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
  return m ? m[2] : null;
};

const CASOS = [
  // Frases normales de una vida: NO pueden disparar un repaso.
  ['Te sientas al girasol de la ventana', null],
  ['Prefieres cargar sola con todo', null],
  ['Lo haces solo por no molestar', null],
  ['Solamente pides ayuda cuando no queda otra', null],
  ['Los martes te pesan mas que el resto', null],
  ['Tienes lunares que te avergonzaban de nina', null],
  ['Pones las cartas sobre la mesa tarde', null],
  ['Es una decision muy personal', null],
  ['En casa aprendiste que lo de dentro no se ensena', null],
  ['En ese aspecto eres muy tuya', null],
  ['Cuidas tu aspecto mas de lo que admites', null],
  // Y lo que salió impreso el 24 de agosto: tiene que caer todo.
  ['El sol y Mercurio en la casa del trabajo', 'sol'],
  ['Tu luna en un signo serio y constante', 'luna'],
  ['Venus bien conectada con la luna', 'venus'],
  ['El buen angulo entre Saturno y Urano', 'angulo'],
  ['La cuadratura entre tu luna y el ascendente', 'cuadratura'],
  ['En la zona de tu carta que habla de raices', 'carta'],
  ['Mercurio en angulo armonico con Quiron', 'mercurio'],
  ['Marte y Jupiter juntos, apoyados por Neptuno', 'marte'],
  ['El sol enfrentado a Saturno te hizo crecer', 'sol'],
  ['Los aspectos duros lo potencian todavia mas', 'aspectos'],
  ['La casa del dinero pesa en tu carta', 'carta'],
];
let casosMal = 0;
for (const [frase, esperado] of CASOS) {
  if (cazaEn(frase) !== esperado) {
    casosMal++;
    console.log(`      ✘ «${frase}» → ${cazaEn(frase) || 'no salta'}, se esperaba ${esperado || 'que no saltara'}`);
  }
}
comprobar(`los ${CASOS.length} casos del filo caen del lado correcto`, casosMal === 0, casosMal + ' mal');

// ── 8. Y QUE EL NAVEGADOR LA MANDE AL PDF ─────────────────────────
//
// El eslabon que faltaba: chat.js puede devolver la lista perfecta, que si
// generando-informe.html no la mete en la peticion de generar-pdf, alli la
// seccion entera se salta y el PDF sale sin esa pagina.
console.log('\n  generando-informe.html — la lista llega hasta el PDF\n');
const html = fs.readFileSync(path.join(RAIZ, 'generando-informe.html'), 'utf8');
const peticion = html.slice(html.indexOf("fetch('/api/generar-pdf'"));
const cuerpoPeticion = peticion.slice(0, peticion.indexOf('})'));
comprobar('el navegador recoge los rasgos de la respuesta de /api/chat',
  /_G\.rasgos\s*=\s*data\.rasgos/.test(html));
comprobar('y los mete en la petición a /api/generar-pdf',
  /rasgos:\s*_G\.rasgos/.test(cuerpoPeticion));

// Y que generar-pdf siga pintando la seccion cuando le llegan.
const pdf = fs.readFileSync(path.join(RAIZ, 'api', 'generar-pdf.js'), 'utf8');
comprobar('generar-pdf lee los rasgos de la petición',
  /const\s*\{[^}]*\brasgos\b[^}]*\}\s*=\s*req\.body/.test(pdf));
comprobar('y pinta la sección cuando vienen',
  /if\s*\(lasFortalezas\.length > 0 \|\| losDesafios\.length > 0\)/.test(pdf));

// ── 9. Y QUE LA PAGINA APAREZCA DE VERDAD EN EL PDF ───────────────
//
// Todo lo de arriba puede estar bien y la pagina no salir igualmente: es lo
// que paso el 24 de agosto. Asi que aqui se fabrica el PDF de verdad, con la
// lista y sin ella, y se cuentan las paginas. Si la lista no pinta nada, los
// dos PDF tienen las mismas.
console.log('\n  api/generar-pdf.js — la página sale en el PDF\n');

let jspdfHay = true;
try { await import('jspdf'); } catch { jspdfHay = false; }

if (!jspdfHay) {
  console.log('  SALTADA: falta jspdf. Ejecuta "npm install" en la raíz del repo.');
  console.log('  La página del PDF NO se ha comprobado.');
} else {
  const copias = [];
  const stripePdf = path.join(AQUI, '.stripe-falso-rasgos-pdf.mjs');
  fs.writeFileSync(stripePdf, `
export default function Stripe() {
  return { checkout: { sessions: {
    async retrieve() {
      return { payment_status: 'paid', customer_email: 'prueba@ejemplo.com',
               customer_details: {}, metadata: { generacion_token: 'tok' } };
    },
    async update() {},
  } } };
}`);
  copias.push(stripePdf);
  const copiarApi = (api, destino) => {
    const o = fs.readFileSync(path.join(RAIZ, 'api', api), 'utf8');
    const r = path.join(AQUI, destino);
    fs.writeFileSync(r, o.replace(MARCA, "import Stripe from './.stripe-falso-rasgos-pdf.mjs';"));
    copias.push(r);
    return r;
  };

  // El PDF lee sus imagenes y sus fuentes del propio repo, no por red.
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('api.brevo.com')) return { ok: true, status: 201, json: async () => ({}) };
    const b = fs.readFileSync(path.join(RAIZ, u.replace('https://origennatal.com', '')));
    return { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
  };

  try {
    const { default: calcularCarta } = await import(copiarApi('calcular-carta.js', '.carta-rasgos.mjs'));
    const { default: generarPdf } = await import(copiarApi('generar-pdf.js', '.pdf-rasgos.mjs'));

    const resp = () => {
      const r = { code: 0, body: null };
      r.status = x => { r.code = x; return r; };
      r.json = b => { r.body = b; return r; };
      r.setHeader = () => {};
      return r;
    };

    const rc = resp();
    await calcularCarta({ method: 'POST', body: { session_id: 'x', year: 1990, month: 6, day: 12, localHour: 9, localMin: 30, latDeg: 40.4168, lonDeg: -3.7038, tzOffset: 2 } }, rc);

    const parrafo = 'Parrafo de prueba con la longitud habitual de un informe real de cliente para que el documento salga como siempre.';
    const pedido = {
      session_id: 'x', token: 'tok', nombre: 'Prueba Rasgos', sexo: 'Mujer',
      fechaNice: '12 de junio de 1990', hora: '09:30', lugar: 'Madrid, España',
      edad: 35, carta: rc.body, areas: Array(7).fill(parrafo),
    };

    const crudoDe = async (extra) => {
      const rr = resp();
      await generarPdf({ method: 'POST', body: { ...pedido, ...extra }, }, rr);
      return Buffer.from(rr.body.pdfBase64.split(',')[1], 'base64').toString('latin1');
    };

    const cuantasPaginas = async (extra) => {
      const r = resp();
      await generarPdf({ method: 'POST', body: { ...pedido, ...extra } }, r);
      if (r.code !== 200) return -1;
      const buf = Buffer.from(r.body.pdfBase64.split(',')[1], 'base64');
      return (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    };

    const sinLista = await cuantasPaginas({});
    const conLista = await cuantasPaginas({ rasgos: RASGOS });
    const listaVaciaPdf = await cuantasPaginas({ rasgos: { fortalezas: [], desafios: [] } });

    // ── DÓNDE VAN LAS PÁGINAS ───────────────────────────────────────
    //
    // No basta con que salgan: tienen que salir DESPUÉS del área 7 y ANTES
    // de la página de la frase. Puestas al principio, que es donde estaban,
    // el cliente se encontraba treinta fichas sobre sí mismo antes de haber
    // leído una sola línea que las explicara.
    const iAreas = pdf.indexOf('LAS 7 AREAS');
    const iFrase = pdf.indexOf("img_frase,'JPEG'");
    const iRasgos = pdf.indexOf('LAS DOS LISTAS DE RASGOS');
    const iFinales = pdf.indexOf("img_proximo,'JPEG'");
    comprobar('el orden es: 7 áreas → página de la frase → listas → páginas finales',
      iAreas > 0 && iFrase > iAreas && iRasgos > iFrase && iFinales > iRasgos,
      iRasgos < iAreas ? 'la lista está ANTES de las áreas'
      : iRasgos < iFrase ? 'la lista está antes de la frase'
      : iFinales < iRasgos ? 'las páginas finales están antes de la lista' : 'en su sitio');

    // Y se comprueba también en el PDF hecho: el texto de cada página va en
    // su propio flujo, así que dos PDF que van iguales hasta cierta página
    // dan los mismos flujos hasta ahí. Si la lista fuera al principio, el
    // primer flujo distinto sería uno de los primeros.
    const flujosDeTexto = (buf) => [...buf.toString('latin1')
      .matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
      .map(m => m[1]).filter(f => !f.startsWith('\xff\xd8')).map(f => f.length);

    const pdfDe = async (extra) => {
      const r = resp();
      await generarPdf({ method: 'POST', body: { ...pedido, ...extra } }, r);
      return flujosDeTexto(Buffer.from(r.body.pdfBase64.split(',')[1], 'base64'));
    };
    const flSin = await pdfDe({});
    const flCon = await pdfDe({ rasgos: RASGOS });
    let iguales = 0;
    while (iguales < flSin.length && iguales < flCon.length && flSin[iguales] === flCon[iguales]) iguales++;
    comprobar('la lista no cambia ni una página de las siete áreas',
      iguales > flSin.length * 0.5,
      `las ${iguales} primeras de ${flSin.length} salen exactamente igual que sin lista`);

    comprobar('el PDF se genera sin lista (como hasta ahora)', sinLista > 0, sinLista + ' páginas');
    comprobar('el PDF se genera con lista', conLista > 0, conLista + ' páginas');
    comprobar('los 30 rasgos AÑADEN páginas al informe',
      conLista > sinLista,
      conLista > sinLista ? `${sinLista} → ${conLista} páginas`
                          : 'mismas páginas: la lista no se está pintando');
    comprobar('con la lista vacía el informe sale como siempre, sin páginas en blanco',
      listaVaciaPdf === sinLista, listaVaciaPdf + ' páginas');

    // ── LAS DOS LISTAS, SEPARADAS ───────────────────────────────────
    //
    // Las mismas 30 fichas puestas en una sola lista ocupan menos que
    // repartidas en dos, porque cada lista empieza página. Si algún día se
    // vuelven a pegar una detrás de otra, esto se cae.
    // La segunda lista sigue donde acaba la primera, no abre página: una
    // ficha en cada lista tiene que caber en UNA sola página. Antes cada
    // lista abría la suya y esto daban dos, con media página en blanco en
    // medio del informe.
    const unaEnCadaUna = await cuantasPaginas({ rasgos: {
      fortalezas: [RASGOS.fortalezas[0]], desafios: [RASGOS.desafios[0]] } });
    comprobar('la segunda lista no abre página nueva, sigue a la primera',
      unaEnCadaUna === sinLista + 1,
      `una ficha en cada lista ocupa ${unaEnCadaUna - sinLista} página(s)`);

    // ── EL ÁREA DE CADA FICHA SE IMPRIME ────────────────────────────
    //
    // Las mismas fichas con las áreas cambiadas tienen que dar un PDF
    // distinto. Si el área no se pinta, los dos salen calcados: es lo que
    // pasaba antes, el dato llegaba y no se usaba.
    const conAreasVariadas = await pdfDe({ rasgos: RASGOS });
    const todasArea1 = await pdfDe({ rasgos: {
      fortalezas: RASGOS.fortalezas.map(r => ({ ...r, area: 1 })),
      desafios: RASGOS.desafios.map(r => ({ ...r, area: 1 })),
    } });
    // Si por lo que sea solo llegara una de las dos listas, el informe no
    // puede romperse ni dejar una pagina con un titulo y nada debajo.
    const soloFortalezas = await cuantasPaginas({ rasgos: { fortalezas: RASGOS.fortalezas, desafios: [] } });
    const soloDesafios = await cuantasPaginas({ rasgos: { fortalezas: [], desafios: RASGOS.desafios } });
    comprobar('si solo llega una de las dos listas, el PDF sale igualmente',
      soloFortalezas > sinLista && soloDesafios > sinLista,
      `solo fortalezas: ${soloFortalezas} págs, solo desafíos: ${soloDesafios} págs`);

    // ── FICHAS MAL FORMADAS ─────────────────────────────────────────
    //
    // Lo que llega a generar-pdf viene del navegador. Una entrada que no sea
    // una ficha reventaba la generacion entera al leerle el nombre: 500 y el
    // cliente sin el informe que ya ha pagado, por culpa de un extra.
    const conBasura = await cuantasPaginas({ rasgos: {
      fortalezas: [null, 5, {}, { nombre: '   ' }, ...RASGOS.fortalezas],
      desafios: RASGOS.desafios,
    } });
    comprobar('una ficha mal formada no tumba el PDF, se cae ella sola',
      conBasura === conLista, `${conBasura} páginas, las mismas que sin basura`);

    // Y si TODAS son basura, no se abre ni una página: abrirla y no pintar
    // nada estamparía dos veces el número en la última página del área 7 y
    // correría todos los de detrás.
    const todoBasura = await cuantasPaginas({ rasgos: { fortalezas: [null, 5, {}], desafios: [] } });
    comprobar('si todas las fichas son basura, el informe sale como si no hubiera lista',
      todoBasura === sinLista, `${todoBasura} páginas`);

    // ── QUE NADA SE SALGA DEL PAPEL ─────────────────────────────────
    //
    // Una frase larga se parte en las líneas que hagan falta y la ficha crece
    // hacia abajo. Si la cuenta de lo que ocupa falla, se sale por el pie o
    // por el margen, y eso no se ve hasta que alguien abre el PDF.
    //
    // No basta con mirar dónde EMPIEZA cada texto: hay que saber dónde acaba,
    // y para eso se usa la tabla de anchos que el propio PDF lleva dentro. Se
    // coge el ancho mayor de las tres Roboto para cada letra, así la cuenta
    // nunca se queda corta (puede sobrar, nunca faltar).
    const anchoDeCadaLetra = (pdfTxt) => {
      const anchos = new Map();
      let i = -1;
      while ((i = pdfTxt.indexOf('/W', i + 1)) !== -1) {
        const abre = pdfTxt.indexOf('[', i);
        if (abre === -1 || abre - i > 4) continue;
        let prof = 0, fin2 = abre;
        for (; fin2 < pdfTxt.length; fin2++) {
          if (pdfTxt[fin2] === '[') prof++;
          else if (pdfTxt[fin2] === ']') { prof--; if (prof === 0) break; }
        }
        const re = /(\d+)\s*\[\s*([\d\s]+?)\]/g;
        let m;
        while ((m = re.exec(pdfTxt.slice(abre + 1, fin2)))) {
          const desde = parseInt(m[1], 10);
          m[2].trim().split(/\s+/).forEach((w, k) => {
            const g = desde + k, v = parseInt(w, 10);
            if (!anchos.has(g) || anchos.get(g) < v) anchos.set(g, v);
          });
        }
      }
      return anchos;
    };

    // Se mira SOLO el texto dorado -los títulos de las dos listas y la
    // etiqueta del área de cada ficha- porque va siempre en negrita, que es de
    // donde salen los anchos mayores de la tabla, así que para él la cuenta es
    // exacta. Medir con esa tabla un texto en cursiva daría 4% de más y
    // saltarían falsas alarmas.
    const DORADO = /0\.81\d* 0\.69\d* 0\.50\d* rg/;

    // Y LA ETIQUETA DEL ÁREA NO BAJA DE 270, QUE ES LO QUE PRUEBA QUE LA
    // CUENTA DEL ALTO DE LA FICHA ES LA BUENA.
    //
    // cabe() no deja empezar una ficha si no cabe entera: pyRasgos + alto
    // <= Y_TOPE, y Y_TOPE es 276. La etiqueta es lo último de la ficha y se
    // pinta 6 mm por encima de donde acaba, así que nunca puede caer por
    // debajo de 270. Si loQueOcupaLaFicha se quedara corta —el fallo que no
    // se ve hasta abrir un PDF— la etiqueta bajaría de ahí y aquí se caza.
    //
    // El tope general de abajo (276,5) no vale para esto: un descuadre de
    // 6 mm deja la etiqueta justo en 276 y pasa por debajo del radar.
    const TOPE_DE_LA_ETIQUETA = 270;

    const loQueSeSale = (pdfTxt) => {
      const MM = 72 / 25.4, anchos = anchoDeCadaLetra(pdfTxt), fuera = [];
      for (const bt of pdfTxt.matchAll(/BT([\s\S]*?)ET/g)) {
        const c = bt[1];
        if (!DORADO.test(c)) continue;
        const tf = /\/\w+\s+([\d.]+)\s+Tf/.exec(c);
        const td = /([\d.]+)\s+([\d.]+)\s+Td/.exec(c);
        const tj = /<([0-9a-fA-F]+)>\s*Tj/.exec(c);
        if (!tf || !td || !tj) continue;
        const tam = parseFloat(tf[1]), x = parseFloat(td[1]) / MM, h = tj[1];
        let mil = 0;
        for (let k = 0; k < h.length; k += 4) mil += anchos.get(parseInt(h.slice(k, k + 4), 16)) || 0;
        const acaba = x + (mil / 1000) * tam / MM;
        if (acaba > 192.5) fuera.push(`texto ${x.toFixed(0)}→${acaba.toFixed(0)}`);
        const y = 297 - parseFloat(td[2]) / MM;
        if (tam === 11 && y > TOPE_DE_LA_ETIQUETA) {
          fuera.push(`etiqueta a y=${y.toFixed(0)}, y el tope es ${TOPE_DE_LA_ETIQUETA}`);
        }
      }
      // Y las rayas (el separador entre fichas y la del título). Aquí no hay
      // que medir letras: las coordenadas están escritas tal cual, así que la
      // cuenta es exacta y se miran todas.
      for (const m of pdfTxt.matchAll(/([\d.]+) ([\d.]+) m\s+([\d.]+) ([\d.]+) l/g)) {
        const x1 = parseFloat(m[1]) / MM, x2 = parseFloat(m[3]) / MM;
        if (x2 > 192.5 || x1 < 17.5) fuera.push(`raya ${x1.toFixed(0)}→${x2.toFixed(0)}`);
      }
      // Y por abajo: nada puede pasar del tope de la caja de texto. Si la
      // cuenta de lo que ocupa una ficha se quedara corta, las fichas se
      // seguirían pintando por debajo del pie de página sin que nada lo diga.
      // El número de página va a 281 y es el único que baja de ahí.
      for (const bt of pdfTxt.matchAll(/BT([\s\S]*?)ET/g)) {
        const tf = /\/\w+\s+([\d.]+)\s+Tf/.exec(bt[1]);
        const td = /([\d.]+)\s+([\d.]+)\s+Td/.exec(bt[1]);
        if (!tf || !td || parseFloat(tf[1]) === 9) continue;
        const y = 297 - parseFloat(td[2]) / MM;
        if (y > 276.5) fuera.push(`texto por debajo del tope, y=${y.toFixed(0)}`);
      }
      return fuera;
    };

    // Descripciones de largos muy variados, para que la ficha caiga en una
    // línea, en dos y también en cuatro. Lo normal son dos, que es lo que dan
    // las dos frases que se piden, pero pedirlo no es garantizarlo: una que se
    // pase de largo no puede descuadrar la página.
    const RASGOS_DE_TODOS_LOS_LARGOS = {
      fortalezas: Array.from({ length: 14 }, (_, i) => ({
        nombre: 'Ficha numero ' + i,
        descripcion: 'Una frase de descripcion que ocupa lo suyo y cambia de largo '
          + 'palabra '.repeat((i * 4) % 36),
        area: (i % 7) + 1,
      })),
      desafios: Array.from({ length: 16 }, (_, i) => ({
        nombre: 'Otra ficha ' + i,
        descripcion: 'Descripcion distinta que tambien cambia de largo '
          + 'palabra '.repeat((i * 7) % 38),
        area: (i % 7) + 1,
      })),
    };

    // Se compara contra el informe SIN lista: lo que ya se salía (texto
    // centrado de la rueda, que la cuenta conservadora da por pasado) no es
    // cosa de la lista. Lo que no puede es AÑADIR ninguno.
    // Y que la lista empiece a la misma altura que el texto de las áreas.
    // Empezaba en 45 y se leía más alto que el resto del libro.
    const crudoLista = await crudoDe({ rasgos: {
      fortalezas: [RASGOS.fortalezas[0]], desafios: [RASGOS.desafios[0]] } });
    const MM2 = 72 / 25.4;
    const hojas = [...crudoLista.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
      .map(m => m[1]).filter(x => !x.startsWith('\xff\xd8'));
    const hojaLista = hojas.find(x => /\/\w+ 13 Tf/.test(x));   // el título va a 13
    const primeraY = hojaLista
      ? Math.min(...[...hojaLista.matchAll(/([\d.]+) ([\d.]+) Td/g)].map(m => 297 - parseFloat(m[2]) / MM2))
      : -1;
    comprobar('la lista empieza a la misma altura que el texto de las áreas',
      Math.abs(primeraY - 60) < 0.2, 'la primera línea cae en y = ' + primeraY.toFixed(1) + ' mm (las áreas, en 60)');

    const seSalenSinLista = loQueSeSale(await crudoDe({}));
    const seSalenConLista = loQueSeSale(await crudoDe({ rasgos: RASGOS_DE_TODOS_LOS_LARGOS }));
    comprobar('nada se sale del papel: ni por los lados ni por abajo',
      seSalenConLista.length === seSalenSinLista.length,
      seSalenConLista.length > seSalenSinLista.length
        ? `añade ${seSalenConLista.length - seSalenSinLista.length}: ${seSalenConLista.slice(seSalenSinLista.length, seSalenSinLista.length + 3).join(', ')} mm`
        : `${seSalenSinLista.length} de antes, ${seSalenConLista.length} ahora`);

    // ── Y QUE NINGÚN TÍTULO SE QUEDE SOLO AL PIE ──────────────────
    //
    // Al hacer que la segunda lista siga a la primera, aparece un riesgo que
    // antes no existía: que el título entre justo al final de la página y su
    // primera ficha se vaya a la siguiente. Un título solo al pie se lee como
    // un descuido de imprenta.
    //
    // Por eso antes de abrir la lista se mide lo que ocupa el título MÁS su
    // primera ficha entera, medida de verdad. Con un número fijo quedaba una
    // ventana estrecha en la que esto pasaba.
    //
    // La ficha mas alta de las normales: las dos frases que se piden, escritas
    // todo lo largas que se escriben, y sus dos lineas impresas.
    const FICHA_ALTA = (i) => ({
      nombre: 'Ficha alta ' + i,
      descripcion: 'Las dos frases de una ficha, escritas todo lo largas que se escriben. La segunda dice como se le nota eso en el dia a dia.',
      area: (i % 7) + 1,
    });
    // Y una frase de las lineas que se le pidan, para mover en saltos de 6,5 mm
    // el sitio donde acaba la primera lista. Once palabras por linea, medidas.
    const fraseDe = (lineas) => 'Descripcion que crece ' + 'palabra '.repeat((lineas - 1) * 11);
    const titulosSolos = (pdfTxt) => {
      const MM3 = 72 / 25.4;
      const hojas2 = [...pdfTxt.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
        .map(m => m[1]).filter(x => !x.startsWith('\xff\xd8'));
      let solos = 0;
      for (const hoja of hojas2) {
        const ev = [...hoja.matchAll(/BT([\s\S]*?)ET/g)].map(m => {
          const tf = /\/\w+\s+([\d.]+)\s+Tf/.exec(m[1]);
          const td = /([\d.]+)\s+([\d.]+)\s+Td/.exec(m[1]);
          return tf && td ? { tam: parseFloat(tf[1]), y: 297 - parseFloat(td[2]) / MM3 } : null;
        }).filter(Boolean).filter(e => e.tam !== 9);   // fuera el número de página
        if (!ev.length) continue;
        ev.sort((a, b) => a.y - b.y);
        if (ev[ev.length - 1].tam === 13) solos++;     // el título va a 13
      }
      return solos;
    };
    // La ventana en la que esto pasa es estrecha (unos 9 mm de una página de
    // 216), así que hay que barrer fino o no se ve: se cambia el número de
    // fichas Y las líneas de la última de la primera lista, que mueve el sitio
    // donde acaba en saltos de 6,5 mm. Una ficha alta con su separador ocupa
    // 37 mm y las siete líneas barren 39, así que entre las dos cosas el final
    // de la lista 1 cae en cualquier altura de la página, sin huecos.
    let huerfanos = 0, barridos = 0, desbordes = 0;
    for (const cuantas of [1, 2, 3]) {
      for (let lineas = 1; lineas <= 7; lineas++) {
        const ultima = {
          nombre: 'La ultima de la primera lista',
          descripcion: fraseDe(lineas),
          area: 1,
        };
        barridos++;
        const crudo = await crudoDe({ rasgos: {
          fortalezas: [...Array.from({ length: cuantas }, (_, i) => FICHA_ALTA(i)), ultima],
          desafios: Array.from({ length: 4 }, (_, i) => FICHA_ALTA(i + 40)),
        } });
        huerfanos += titulosSolos(crudo);
        // Ya que están hechos los 21 PDF, se miran también aquí los desbordes:
        // con un solo reparto la ficha nunca cae en la altura justa en la que
        // una cuenta mal hecha se nota, y con 21 sí.
        desbordes += Math.max(0, loQueSeSale(crudo).length - seSalenSinLista.length);
      }
    }
    comprobar('ningún título de lista se queda solo al pie de una página',
      huerfanos === 0,
      huerfanos ? huerfanos + ' huérfano(s)' : barridos + ' repartos distintos, con las fichas más altas posibles');
    comprobar('en ninguno de esos repartos se sale nada del papel',
      desbordes === 0, desbordes ? desbordes + ' desborde(s)' : barridos + ' repartos revisados');

    comprobar('el área de cada ficha se imprime de verdad',
      JSON.stringify(conAreasVariadas) !== JSON.stringify(todasArea1),
      JSON.stringify(conAreasVariadas) === JSON.stringify(todasArea1)
        ? 'cambiar el área no cambia el PDF: no se está pintando' : 'cambiar el área cambia el PDF');

  } catch (err) {
    console.error('  ✘ la parte del PDF reventó:', err.stack || err.message);
    fallos++;
  } finally {
    for (const f of copias) try { fs.unlinkSync(f); } catch {}
  }
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
