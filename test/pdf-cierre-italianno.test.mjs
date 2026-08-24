// ═════════════════════════════════════════════════════════════════
// test/pdf-cierre-italianno.test.mjs
//
// EL CIERRE DE CADA AREA VA EN ITALIANNO, Y ESO SE ROMPE EN SILENCIO.
//
// El cierre es la ultima frase de cada area, la que el lector se lleva
// puesta. Va en una caligrafica distinta del resto del libro, y ahi hay dos
// cosas que fallan sin avisar:
//
//   1. UNA LETRA QUE LA FUENTE NO TENGA SE IMPRIME EN BLANCO. No hay error,
//      no hay aviso: sale un hueco. Italianno trae 221 caracteres frente a
//      los 927 de Roboto, asi que la eñe, los acentos, la apertura de
//      interrogacion o la raya larga hay que comprobarlos, no suponerlos.
//
//   2. LAS LINEAS SE TOCAN. Una caligrafica sube y baja mucho mas que una
//      normal: a 30 puntos, la "Á" sube 7,7 mm sobre la raya y la "g" baja
//      3,7 por debajo. Con el interlineado de la fuente de antes, la cola de
//      una linea se cruzaria con el palo de la de abajo.
//
// Y si el fichero de la fuente no llegara, el cierre tiene que salir
// EXACTAMENTE como salia antes: a 30 puntos en Roboto seria un cartel.
//
// Ejecutar:  node test/pdf-cierre-italianno.test.mjs
// Sin red: las fuentes y las imagenes se leen del propio repo.
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

// Un cierre con todo lo que puede faltarle a una caligrafica.
const CIERRE = 'Y hasta que no veas eso, Raquel, vas a seguir buscando fuera lo que llevaba años esperándote dentro —¿cuánta compañía te has perdido por creerlo?';

const AREA = [
  'Parrafo normal del area con la longitud de siempre para que todo caiga donde cae.',
  '', '## Un ladillo cualquiera',
  'Y el parrafo que va debajo del ladillo, con su largo normal de siempre.',
  '', '[ESCENA] Son las once de la noche y sigues repasando el movil con la luz apagada.',
  '', '[REMATE] Llevas media vida pidiendo permiso para ocupar tu propio sitio',
  '', '[PREGUNTA] ¿Cuantas veces te has callado algo por no montar un lio?',
  '', '[CIERRE] ' + CIERRE,
].join('\n');

const copias = [];
const stripeFalso = path.join(AQUI, '.stripe-falso-cierre.mjs');
fs.writeFileSync(stripeFalso, `
export default function Stripe() {
  return { checkout: { sessions: {
    async retrieve() {
      return { payment_status: 'paid', customer_email: 'prueba@ejemplo.com',
               customer_details: {}, metadata: { generacion_token: 'tok' } };
    },
    async update() {},
  } } };
}`);
copias.push(stripeFalso);

const MARCA = "import Stripe from 'stripe';";
function copiarApi(api, destino) {
  const original = fs.readFileSync(path.join(RAIZ, 'api', api), 'utf8');
  if (!original.includes(MARCA)) {
    console.error(`✘ api/${api} ya no importa Stripe como se esperaba; hay que actualizar esta prueba.`);
    process.exit(1);
  }
  const ruta = path.join(AQUI, destino);
  fs.writeFileSync(ruta, original.replace(MARCA, "import Stripe from './.stripe-falso-cierre.mjs';"));
  copias.push(ruta);
  return ruta;
}

// Se puede hacer que la fuente NO llegue, para probar la vuelta atras.
let laFuenteLlega = true;
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.includes('api.brevo.com')) return { ok: true, status: 201, json: async () => ({}) };
  if (!laFuenteLlega && u.includes('Italianno')) return { ok: false, status: 404 };
  const b = fs.readFileSync(path.join(RAIZ, u.replace('https://origennatal.com', '')));
  return { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
};
process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.BREVO_API_KEY = '';

const limpiar = () => { for (const f of copias) try { fs.unlinkSync(f); } catch {} };

try { await import('jspdf'); } catch {
  limpiar();
  console.log('\n  SALTADA: falta jspdf. Ejecuta "npm install" en la raíz del repo.');
  console.log('  Esta prueba NO ha comprobado nada.\n');
  process.exit(0);
}

// De los glifos del PDF a letras, con la tabla que el propio PDF lleva dentro.
function tablaDeLetras(pdf) {
  const mapa = {};
  for (const cm of pdf.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
    for (const m of cm[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g))
      mapa[parseInt(m[1], 16)] = String.fromCodePoint(parseInt(m[2], 16));
  for (const cm of pdf.matchAll(/beginbfrange([\s\S]*?)endbfrange/g))
    for (const m of cm[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const a = parseInt(m[1], 16), b = parseInt(m[2], 16), c = parseInt(m[3], 16);
      for (let k = a; k <= b; k++) mapa[k] = String.fromCodePoint(c + k - a);
    }
  return mapa;
}

// Los trozos de texto de un tamaño dado, con su posición.
function trozosDe(pdf, tam) {
  const mapa = tablaDeLetras(pdf), MM = 72 / 25.4, out = [];
  for (const bt of pdf.matchAll(/BT([\s\S]*?)ET/g)) {
    const tf = /\/\w+\s+([\d.]+)\s+Tf/.exec(bt[1]);
    const td = /([\d.]+)\s+([\d.]+)\s+Td/.exec(bt[1]);
    const tj = /<([0-9a-fA-F]+)>\s*Tj/.exec(bt[1]);
    if (!tf || !td || !tj || parseFloat(tf[1]) !== tam) continue;
    const h = tj[1];
    let txt = '';
    for (let i = 0; i < h.length; i += 4) {
      const g = parseInt(h.slice(i, i + 4), 16);
      txt += Object.prototype.hasOwnProperty.call(mapa, g) ? mapa[g] : '⬚';  // hueco
    }
    out.push({ txt, y: +(297 - parseFloat(td[2]) / MM).toFixed(2) });
  }
  return out;
}

try {
  const { default: calcularCarta } = await import(copiarApi('calcular-carta.js', '.carta-cierre.mjs'));
  const { default: generarPdf } = await import(copiarApi('generar-pdf.js', '.pdf-cierre.mjs'));

  const resp = () => {
    const r = { code: 0, body: null };
    r.status = c => { r.code = c; return r; };
    r.json = b => { r.body = b; return r; };
    r.setHeader = () => {};
    return r;
  };

  const rc = resp();
  await calcularCarta({ method: 'POST', body: { session_id: 'x', year: 1990, month: 6, day: 12, localHour: 9, localMin: 30, latDeg: 40.4168, lonDeg: -3.7038, tzOffset: 2 } }, rc);

  const haz = async () => {
    const r = resp();
    await generarPdf({ method: 'POST', body: {
      session_id: 'x', token: 'tok', nombre: 'Raquel', sexo: 'Mujer',
      fechaNice: '12 de junio de 1990', hora: '09:30', lugar: 'Madrid, España',
      edad: 35, carta: rc.body, areas: Array(7).fill(AREA),
    } }, r);
    return { code: r.code, pdf: r.code === 200 ? Buffer.from(r.body.pdfBase64.split(',')[1], 'base64') : null };
  };

  console.log('\n  api/generar-pdf.js — el cierre en Italianno\n');

  const con = await haz();
  comprobar('el PDF se genera', con.code === 200, 'HTTP ' + con.code);

  if (con.pdf) {
    const s = con.pdf.toString('latin1');

    comprobar('la fuente Italianno va dentro del PDF', /\/BaseFont\s*\/Italianno/.test(s));

    const enCierre = trozosDe(s, 30);
    comprobar('el cierre se pinta a 30 puntos', enCierre.length > 0, enCierre.length + ' trozos');

    // Que la fuente esté DENTRO del PDF no quiere decir que el cierre se
    // escriba con ella. Aquí se busca con qué nombre se llama a Italianno
    // (/F16, /F17...) y se comprueba que es el que usa el cierre.
    // Que la fuente esté DENTRO del PDF no quiere decir que el cierre se
    // escriba con ella. Aquí se busca con qué nombre se la llama (/F16,
    // /F18...) y se comprueba que ese es el nombre que usa el cierre.
    //
    // Se recorre el diccionario de fuentes de la página y se mira objeto por
    // objeto cuál declara Italianno. Al revés no vale: "/BaseFont /Italianno"
    // aparece DOS veces, en el objeto de dentro y en el de fuera, y solo el
    // de fuera es el que tiene nombre en el diccionario.
    const nombreItalianno = (() => {
      const dic = /\/Font\s*<<([\s\S]*?)>>/.exec(s);
      if (!dic) return null;
      for (const m of dic[1].matchAll(/\/(F\d+)\s+(\d+) 0 R/g)) {
        const obj = new RegExp('(^|[^\\d])' + m[2] + ' 0 obj([\\s\\S]{0,400}?)endobj').exec(s);
        if (obj && /\/BaseFont\s*\/Italianno/.test(obj[2])) return m[1];
      }
      return null;
    })();
    const cierreEnItalianno = nombreItalianno
      ? [...s.matchAll(/BT([\s\S]*?)ET/g)].some(bt =>
          new RegExp('/' + nombreItalianno + '\\s+30\\s+Tf').test(bt[1]))
      : false;
    comprobar('y se escribe CON Italianno, no solo la lleva dentro',
      cierreEnItalianno, nombreItalianno ? 'la fuente se llama /' + nombreItalianno : 'no encuentro la fuente');

    // ── 1. NI UNA LETRA EN BLANCO ─────────────────────────────────
    const impreso = enCierre.map(t => t.txt).join(' ');
    const huecos = (impreso.match(/⬚/g) || []).length;
    comprobar('ni una letra del cierre sale en blanco', huecos === 0, huecos + ' hueco(s)');

    const DELICADOS = [...'áéíóúüñÑ¿¡—«»'].filter(c => CIERRE.includes(c));
    const faltan = DELICADOS.filter(c => !impreso.includes(c));
    comprobar(`los ${DELICADOS.length} caracteres delicados salen todos`,
      faltan.length === 0, faltan.length ? 'faltan: ' + faltan.join(' ') : DELICADOS.join(' '));

    // Y el cierre entero, letra por letra: se pinta palabra a palabra, así
    // que se junta y se compara sin espacios contra el original repetido.
    const sinEspacios = x => x.replace(/\s+/g, '');
    const unaVez = sinEspacios(CIERRE);
    const todo = sinEspacios(impreso);
    comprobar('el cierre sale entero y en las 7 áreas',
      todo === unaVez.repeat(7), `${Math.round(todo.length / unaVez.length)} de 7 veces`);

    // ── 2. LAS LÍNEAS NO SE TOCAN ─────────────────────────────────
    // De las letras que salen de verdad, la que más sube a 30 puntos ocupa
    // 7,7 mm sobre la raya y la que más baja 3,7 por debajo: 11,4 mm.
    const alturas = [...new Set(enCierre.map(t => t.y))].sort((a, b) => a - b);
    let masJuntas = Infinity;
    for (let i = 1; i < alturas.length; i++) {
      const d = alturas[i] - alturas[i - 1];
      if (d > 0.5 && d < 40 && d < masJuntas) masJuntas = d;   // dos líneas del mismo cierre
    }
    comprobar('entre dos líneas del cierre caben la cola de una y el palo de la otra',
      masJuntas >= 11.4, 'la menor separación es ' + (masJuntas === Infinity ? '(una sola línea)' : masJuntas.toFixed(1) + ' mm') + ', hacen falta 11,4');
  }

  // ── 3. EL CIERRE VA SOLO EN SU PÁGINA Y CENTRADO ────────────────
  //
  // El filete y la frase se centran JUNTOS, como un bloque: arriba del bloque
  // está el filete, no la primera línea, y abajo lo que baja la última letra.
  // Contando solo las líneas, el conjunto se leería bajo.
  //
  // Se prueba con cierres de una, dos y tres líneas, porque el alto del
  // bloque cambia con cada uno y el centrado tiene que salir en los tres.
  console.log('\n  el cierre, solo en su página y centrado\n');

  const CIERRES = [
    'Y ahora ya lo sabes.',
    'Y hasta que no veas eso, vas a seguir buscando fuera lo que llevaba años esperándote dentro.',
    'Esa creencia es la que convierte cada relación tuya en un trabajo silencioso, y es ella, y solo ella, la que tiene que caer del todo hoy.',
  ];
  const rCentro = resp();
  await generarPdf({ method: 'POST', body: {
    session_id: 'x', token: 'tok', nombre: 'Raquel', sexo: 'Mujer',
    fechaNice: '12 de junio de 1990', hora: '09:30', lugar: 'Madrid, España',
    edad: 35, carta: rc.body,
    areas: [0, 1, 2, 0, 1, 2, 0].map(i => AREA.replace('[CIERRE] ' + CIERRE, '[CIERRE] ' + CIERRES[i])),
  } }, rCentro);
  comprobar('el PDF con los tres largos de cierre se genera', rCentro.code === 200, 'HTTP ' + rCentro.code);

  if (rCentro.code === 200) {
    const sC = Buffer.from(rCentro.body.pdfBase64.split(',')[1], 'base64').toString('latin1');
    const MM = 72 / 25.4, ALTO = 297;
    const hojas = [...sC.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
      .map(m => m[1]).filter(x => !x.startsWith('\xff\xd8'));
    const BAJA = 3.7;   // lo que cae la "g" de Italianno a 30 puntos
    let paginasDeCierre = 0, descentradas = [], acompanadas = 0;
    for (const hoja of hojas) {
      const textos = [...hoja.matchAll(/BT([\s\S]*?)ET/g)].map(m => {
        const tf = /\/\w+\s+([\d.]+)\s+Tf/.exec(m[1]);
        const td = /([\d.]+)\s+([\d.]+)\s+Td/.exec(m[1]);
        return tf && td ? { tam: parseFloat(tf[1]), y: ALTO - parseFloat(td[2]) / MM } : null;
      }).filter(Boolean);
      const delCierre = textos.filter(x => x.tam === 30);
      if (!delCierre.length) continue;
      paginasDeCierre++;
      // Nada más en la página: ni texto de área, ni ladillos. El número de
      // página (9 pt) no cuenta, que va en el margen.
      if (textos.some(x => x.tam !== 30 && x.tam !== 9)) acompanadas++;
      const rayas = [...hoja.matchAll(/([\d.]+) ([\d.]+) m\s+([\d.]+) ([\d.]+) l/g)]
        .map(m => ALTO - parseFloat(m[2]) / MM);
      const alturas = [...new Set(delCierre.map(x => x.y))].sort((a, b) => a - b);
      const arriba = Math.min(...rayas);                      // el filete
      const abajo = ALTO - (alturas[alturas.length - 1] + BAJA);
      if (Math.abs(arriba - abajo) > 0.5) descentradas.push(`${alturas.length} línea(s): ${arriba.toFixed(1)} arriba / ${abajo.toFixed(1)} abajo`);
    }
    comprobar('cada área acaba con su cierre en una página propia',
      paginasDeCierre === 7, paginasDeCierre + ' de 7');
    comprobar('y en esa página no hay nada más que el cierre',
      acompanadas === 0, acompanadas ? acompanadas + ' con más cosas' : 'las 7 limpias');
    comprobar('el filete y la frase quedan centrados en la página, juntos',
      descentradas.length === 0,
      descentradas.length ? descentradas.join(' | ') : 'mismo hueco arriba y abajo en las 7');
  }

  // ── 4. SI LA FUENTE NO LLEGA, COMO ANTES ────────────────────────
  console.log('\n  y si el fichero de la fuente no llegara\n');
  laFuenteLlega = false;
  // Hace falta OTRA copia del módulo: generar-pdf guarda en memoria los
  // ficheros que ya ha cargado (bien hecho: en producción la función se
  // reutiliza y así no vuelve a bajarse las fuentes en cada informe), y esa
  // memoria le daría la Italianno del informe anterior aunque ahora no llegue.
  const { default: generarPdfSinFuente } = await import(copiarApi('generar-pdf.js', '.pdf-cierre-sin.mjs'));
  const haz2 = async () => {
    const r = resp();
    await generarPdfSinFuente({ method: 'POST', body: {
      session_id: 'x', token: 'tok', nombre: 'Raquel', sexo: 'Mujer',
      fechaNice: '12 de junio de 1990', hora: '09:30', lugar: 'Madrid, España',
      edad: 35, carta: rc.body, areas: Array(7).fill(AREA),
    } }, r);
    return { code: r.code, pdf: r.code === 200 ? Buffer.from(r.body.pdfBase64.split(',')[1], 'base64') : null };
  };
  const sin = await haz2();
  comprobar('el informe se genera igual', sin.code === 200, 'HTTP ' + sin.code);
  if (sin.pdf) {
    const s2 = sin.pdf.toString('latin1');
    comprobar('el cierre NO se pinta a 30 puntos (sería un cartel)', trozosDe(s2, 30).length === 0);
    comprobar('vuelve a los 16,5 de Roboto, como estaba antes', trozosDe(s2, 16.5).length > 0,
      trozosDe(s2, 16.5).length + ' trozos a 16,5');
    comprobar('y no se cuela ninguna letra en blanco',
      (trozosDe(s2, 16.5).map(t => t.txt).join(' ').match(/⬚/g) || []).length === 0);
  }

} catch (err) {
  console.error('\n  ✘ la prueba reventó:', err.stack || err.message);
  fallos++;
} finally {
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
