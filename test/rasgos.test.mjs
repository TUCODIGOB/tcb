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
  ['Buscador de verdades', 'Necesitas entender el porque de lo que te pasa antes de poder aceptarlo del todo'],
  ['Leal hasta el agotamiento', 'Sostienes a los tuyos mucho despues de que a ti ya no te quede nada dentro'],
  ['Memoria para el detalle', 'Retienes lo que dijo cada uno y en que tono, semanas despues de la conversacion'],
  ['Instinto para el peligro', 'Hueles el problema mucho antes de que se vea, y casi siempre aciertas'],
  ['Aguante fuera de lo normal', 'Sigues de pie en sitios donde cualquiera se habria bajado hace tiempo'],
  ['Talento para ordenar el caos', 'Entras donde todo esta revuelto y en dos dias aquello funciona solo'],
  ['Palabra que calma', 'Hablas y la gente baja el tono sin darse cuenta de que lo ha bajado'],
  ['Curiosidad que no se apaga', 'Empiezas algo por saber como funciona y acabas sabiendo mas que nadie'],
  ['Ojo para el talento ajeno', 'Ves de que es capaz alguien antes de que esa persona lo sepa'],
  ['Mano para lo practico', 'Coges un problema abstracto y lo conviertes en cuatro pasos que se pueden hacer'],
  ['Humor que desarma', 'Sueltas la broma justa en el momento en que la tension iba a estallar'],
  ['Firmeza sin ruido', 'Dices que no sin levantar la voz y sin que nadie se sienta atacado'],
  ['Paciencia con los procesos lentos', 'Esperas a que las cosas maduren mientras el resto se pone nervioso'],
  ['Generosidad silenciosa', 'Das sin contarlo y sin que quien lo recibe llegue a enterarse del todo'],
  ['Cabeza fria en la urgencia', 'Cuando todo se tuerce eres la que piensa mientras los demas gritan'],
  ['Gusto por el trabajo bien hecho', 'Te niegas a entregar algo que sabes que podria estar mejor rematado'],
  ['Facilidad para empezar de cero', 'Cierras una etapa y arrancas otra sin arrastrar el peso de la anterior'],
  ['Lectura rapida de las salas', 'Entras en un sitio y en un minuto sabes quien manda y quien esta incomodo'],
  ['Miedo a decepcionar', 'Dices que si a cosas que no quieres solo por no ver la cara del otro'],
  ['Control que no descansa', 'Repasas por dentro lo que ya esta hecho, por si acaso se te escapo algo'],
  ['Cuenta pendiente con el descanso', 'Te sientas a parar y a los diez minutos ya estas buscando algo que hacer'],
  ['Dureza contigo que no aplicas a nadie', 'Perdonas a cualquiera un fallo que a ti no te perdonarias nunca'],
  ['Dificultad para pedir', 'Prefieres cargar tu sola antes que decir en voz alta que necesitas ayuda'],
  ['Tendencia a explicarte de mas', 'Justificas decisiones tuyas ante gente que no te habia pedido explicaciones'],
  ['Prisa por resolver el conflicto', 'Cedes rapido con tal de que la tension se acabe cuanto antes'],
  ['Peso de las expectativas heredadas', 'Mides tu vida con una vara que te dieron y que nunca elegiste'],
  ['Desconfianza de lo que llega facil', 'Cuando algo sale bien sin esfuerzo buscas donde esta la trampa'],
  ['Silencio con lo que te duele', 'Cuentas lo tuyo cuando ya esta resuelto, nunca mientras esta pasando'],
  ['Exigencia con los tiempos', 'Te enfadas contigo por no haber llegado donde creias que ya deberias estar'],
  ['Culpa al poner un limite', 'Dices que no y te pasas el resto del dia dandole vueltas'],
  ['Cansancio de ser la fuerte', 'Todos acuden a ti y nadie te pregunta a ti como lo llevas'],
  ['Postergar lo que te toca a ti', 'Resuelves lo de los demas y lo tuyo se queda para un dia que no llega'],
  ['Relacion tensa con el dinero', 'Ganas mas y en vez de soltar el aire aprietas todavia un poco mas'],
  ['Necesidad de tenerlo todo cerrado', 'Lo que queda abierto te ocupa la cabeza aunque no sea urgente'],
  ['Vergüenza por lo que te ilusiona', 'Rebajas lo que te hace ilusion antes de que otro pueda rebajartelo'],
  ['Poca costumbre de recibir', 'Te incomoda que te cuiden y cambias de tema en cuanto empieza'],
];

const unRasgo = (i, area) => ({
  nombre: CATALOGO[i % CATALOGO.length][0],
  descripcion: CATALOGO[i % CATALOGO.length][1],
  explicacion: `De donde le viene esto segun la carta, contado en una frase o dos que expliquen el porque sin nombrar planetas ni casas, que es lo que se pide en el prompt. Ficha ${i}.`,
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
    { nombre: 'Instintos para los peligros', descripcion: 'Hueles los problemas mucho antes de que se vean, y casi siempre aciertas', explicacion: 'Esta ficha dice lo mismo que "Instinto para el peligro", que ya esta mas arriba en esta misma lista.', area: 3 },
  ],
  desafios: Array.from({ length: 16 }, (_, i) => unRasgo(i + 18, (i % 7) + 1)),
};

// Y otra con el mismo rasgo en las DOS listas, que es el peor repetido de
// todos: ademas de decir dos veces lo mismo, se contradice a si mismo.
const RASGOS_REPETIDO_CRUZADO = {
  fortalezas: Array.from({ length: 14 }, (_, i) => unRasgo(i, (i % 7) + 1)),
  desafios: [
    ...Array.from({ length: 15 }, (_, i) => unRasgo(i + 18, (i % 7) + 1)),
    { nombre: 'Aguantes fuera de lo normal', descripcion: 'Sigues de pie en los sitios donde cualquiera se habria bajado hace tiempo', explicacion: 'Esto es lo mismo que "Aguante fuera de lo normal", que esta en la lista de fortalezas: el mismo rasgo puesto en las dos listas a la vez.', area: 2 },
  ],
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
    if (comoSalePedirLaLista === 'repetido') {
      // La primera vez repite; si se le vuelve a pedir, lo arregla.
      const cuerpoBueno = vecesQueSeHaPedidoLaLista === 1 ? RASGOS_CON_REPETIDO : RASGOS;
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(cuerpoBueno) }] }) };
    }
    if (comoSalePedirLaLista === 'cruzado') {
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(RASGOS_REPETIDO_CRUZADO) }] }) };
    }
    if (comoSalePedirLaLista === 'repite_siempre') {
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(RASGOS_CON_REPETIDO) }] }) };
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
  comprobar('cada rasgo llega con sus cuatro casillas',
    Boolean(uno?.nombre && uno?.descripcion && uno?.explicacion && uno?.area >= 1 && uno?.area <= 7));

  // ── 5. EL TONO ES EL MISMO QUE EL DE LAS ÁREAS ──────────────────
  //
  // No "parecido": el MISMO TEXTO. Las reglas de voz están escritas una vez
  // en api/chat.js y las usan los dos prompts. Si algún día alguien las copia
  // y las edita solo en un sitio, la última página del informe empieza a
  // sonar a otra persona y nadie se entera hasta que lo lee un cliente.
  console.log('\n  api/chat.js — la lista habla con la voz del estudio\n');

  const areaEnviada = enviadas.find(c => Array.isArray(c.system)
    && String((c.system[0] || {}).text || '').startsWith('Eres una experta en psicología'));
  const promptAreas = String((areaEnviada?.system?.[0] || {}).text || '');
  const promptLista = String(lista?.system || '');

  comprobar('se capturan los dos prompts', promptAreas.length > 1000 && promptLista.length > 1000,
    `${promptAreas.length} y ${promptLista.length} caracteres`);

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

  // (c) Llega corta → se vuelve a pedir.
  const corta = await pedirInforme('corta', 'corta');
  comprobar('una lista corta hace que se vuelva a pedir',
    vecesQueSeHaPedidoLaLista === 2, vecesQueSeHaPedidoLaLista + ' llamada(s)');
  comprobar('y se le dice cuántas faltan',
    /se piden al menos/.test(encargosDeLaLista[1] || ''));
  comprobar('el informe sale igual aunque la lista venga corta las dos veces',
    corta.code === 200, 'HTTP ' + corta.code);

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
  /if\s*\(\s*rasgos\s*&&/.test(pdf));

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
    const iRasgos = pdf.indexOf('if (rasgos &&');
    const iFrase = pdf.indexOf("img_frase,'JPEG'");
    comprobar('la lista se pinta DESPUÉS de las 7 áreas y ANTES de la página de la frase',
      iAreas > 0 && iRasgos > iAreas && iFrase > iRasgos,
      iRasgos < iAreas ? 'está ANTES de las áreas' : iRasgos > iFrase ? 'está detrás de la frase' : 'en su sitio');

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
    const todoJunto = await cuantasPaginas({ rasgos: { fortalezas: [...RASGOS.fortalezas, ...RASGOS.desafios], desafios: [] } });
    comprobar('las dos listas van separadas, cada una empieza página',
      conLista > todoJunto,
      `30 fichas en una sola lista: ${todoJunto} páginas; repartidas en dos: ${conLista}`);

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
