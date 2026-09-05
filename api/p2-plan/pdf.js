// ════════════════════════════════════════════════════════════════
// api/p2-plan/pdf.js
//
// EL PDF DEL P2.
//
// Recibe el documento ya escrito -las siete partes y la hoja de ruta- y lo
// monta en un PDF con la marca. No le pide nada al modelo, no lee el
// informe del P1 y no cobra: solo maqueta lo que le llega.
//
// LAS MEDIDAS SON LAS DEL P1, a proposito. Los dos documentos se leen seguidos
// y tienen que verse del mismo sitio: mismo margen, mismo cuerpo de letra,
// mismo renglon, mismo aire entre parrafos y el numero de pagina donde
// siempre. Lo unico que cambia es que aqui todas las paginas van sobre la base
// lisa, porque el P2 no tiene una ilustracion por parte.
//
// CADA SECCION EMPIEZA EN HOJA NUEVA: cada una de las siete partes y la hoja
// de ruta. Ninguna se pega a la anterior.
// ════════════════════════════════════════════════════════════════

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { jsPDF } = require('jspdf');

const BASE_URL = 'https://origennatal.com';

// Las fuentes y la base son iguales para todos, asi que se guardan la primera
// vez y se reaprovechan mientras el contenedor siga vivo. Un fallo no se
// guarda nunca, para que no se repita en todos los PDFs siguientes.
const GUARDADOS = new Map();

async function enBase64(ruta) {
  if (GUARDADOS.has(ruta)) return GUARDADOS.get(ruta);
  const r = await fetch(`${BASE_URL}${ruta}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  let binario = '';
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
  const b64 = btoa(binario);
  GUARDADOS.set(ruta, b64);
  return b64;
}

// ── LAS MEDIDAS, LAS MISMAS QUE EL P1 ───────────────────────
const W = 210, H = 297;          // A4 en milimetros
const X = 18;                    // margen izquierdo
const ANCHO = 175;               // lo que ocupa un renglon
const CUERPO = 12;               // cuerpo del texto corrido
const RENGLON = 7;               // lo que baja de un renglon al siguiente
const ENTRE_PARRAFOS = 7;        // el aire que queda entre un parrafo y el otro
const ARRIBA = 60;               // donde arranca el texto al pasar de pagina
const AIRE_SOBRE_NUMERO = 5;     // lo que se deja libre encima del numero
const HASTA = H - 16 - AIRE_SOBRE_NUMERO;

const VERDE = [14, 63, 75];
const DORADO = [207, 177, 128];
const TINTA = [40, 40, 40];

// EL BEIGE DE LAS CAJAS. Es el dorado de la marca muy rebajado, el mismo tono
// que tienen en la pantalla. Lo justo para que el ojo vea donde acaba una cosa
// y empieza otra, sin que parezca una tabla.
const BEIGE = [250, 245, 234];

// Lo que respira una caja por dentro y lo que la separa de la de abajo.
const CAJA_LADOS = 6;
const CAJA_ARRIBA = 6;
const CAJA_ABAJO = 5;
const ENTRE_CAJAS = 5;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, hoja, partes } = req.body || {};
  if (!hoja || !Array.isArray(partes) || !partes.length) {
    return res.status(400).json({ error: 'Falta el documento que hay que maquetar' });
  }

  try {
    const fallos = [];
    const fuente = async ruta => {
      try { return await enBase64(ruta); }
      catch (e) { fallos.push(`${ruta} (${e.message})`); return null; }
    };
    const imagen = async ruta => {
      try { return 'data:image/jpeg;base64,' + await enBase64(ruta); }
      catch (e) { fallos.push(`${ruta} (${e.message})`); return null; }
    };

    const [normal, negrita, base] = await Promise.all([
      fuente('/fonts/Roboto-Regular.ttf'),
      fuente('/fonts/Roboto-Bold.ttf'),
      imagen('/images/5-base-pdf.jpg'),
    ]);

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    // Si una fuente no carga, jsPDF pinta con la suya en vez de reventar: el
    // documento sale menos bonito, pero sale.
    if (normal)  { doc.addFileToVFS('Roboto-Regular.ttf', normal); doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal'); }
    if (negrita) { doc.addFileToVFS('Roboto-Bold.ttf', negrita);   doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold'); }

    // Y si la base no carga, las paginas salen en blanco en vez de romperse.
    const _addImage = doc.addImage.bind(doc);
    doc.addImage = (img, ...resto) => (img ? _addImage(img, ...resto) : doc);

    const t = v => String(v == null ? '' : v).trim();

    // ── LAS PIEZAS DE DIBUJO ──────────────────────────────────
    // La portada no lleva numero, asi que se empieza a contar en cero y la
    // primera pagina numerada es la del principio.
    let pagina = 0, y = ARRIBA;

    function numeroDePagina() {
      if (pagina < 1) return;
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(String(pagina), W - 16, H - 16, { align: 'right' });
    }

    // Hoja nueva, con su base puesta y el numero de la anterior ya escrito.
    function hojaNueva() {
      numeroDePagina();
      pagina++;
      doc.addPage();
      doc.addImage(base, 'JPEG', 0, 0, W, H);
      y = ARRIBA;
    }

    // Antes de escribir se mira si cabe; si no cabe, se pasa de hoja. "loQueViene"
    // es lo que ocupa lo que se va a escribir, para que un titulo no se quede
    // solo al pie de la pagina con su texto en la siguiente.
    function cabe(loQueViene) {
      if (y + loQueViene > HASTA) hojaNueva();
    }

    function escribir(texto, { fuente = 'normal', tam = CUERPO, color = TINTA, alto = RENGLON, ancho = ANCHO, x = X } = {}) {
      doc.setFont('Roboto', fuente);
      doc.setFontSize(tam);
      doc.setTextColor(color[0], color[1], color[2]);
      for (const linea of doc.splitTextToSize(t(texto), ancho)) {
        if (y > HASTA) {
          hojaNueva();
          doc.setFont('Roboto', fuente);
          doc.setFontSize(tam);
          doc.setTextColor(color[0], color[1], color[2]);
        }
        doc.text(linea, x, y);
        y += alto;
      }
    }

    // Un texto corrido, con sus parrafos separados como en el P1.
    function corrido(texto) {
      const trozos = t(texto).split(/\n+/).map(p => p.trim()).filter(Boolean);
      for (let i = 0; i < trozos.length; i++) {
        escribir(trozos[i]);
        if (i < trozos.length - 1) y += ENTRE_PARRAFOS;
      }
    }

    // LA CABECERA DE CADA SECCION, Y SIEMPRE EN HOJA NUEVA. Arriba la etiqueta
    // pequena en dorado, que dice de que parcela se habla, y debajo el titulo
    // en el verde de la marca.
    function abrirSeccion(etiqueta, titulo) {
      hojaNueva();
      y = 42;
      if (etiqueta) {
        escribir(String(etiqueta).toUpperCase(), { fuente: 'bold', tam: 11, color: DORADO, alto: 10 });
      }
      escribir(titulo, { fuente: 'bold', tam: 17, color: VERDE, alto: 8.5 });
      y += 10;
    }

    // ── LAS CAJAS ─────────────────────────────────────────────
    //
    // Un documento de veinte hojas de texto seguido no se lee: el ojo no
    // encuentra donde parar. Los pasos de la hoja de ruta, que se leen sueltos
    // y se vuelven a buscar, van sobre un fondo beige que los separa.
    //
    // UNA CAJA NO SE PARTE NUNCA entre dos hojas: se mide antes, y si no cabe
    // entera se va a la siguiente. Media caja al pie es peor que un hueco.
    function alturaDeCaja(titulo, texto) {
      let alto = CAJA_ARRIBA + CAJA_ABAJO;
      const dentro = ANCHO - CAJA_LADOS * 2;
      if (t(titulo)) {
        doc.setFont('Roboto', 'bold'); doc.setFontSize(13);
        alto += doc.splitTextToSize(t(titulo), dentro).length * RENGLON + 1;
      }
      doc.setFont('Roboto', 'normal'); doc.setFontSize(CUERPO);
      for (const parrafo of t(texto).split(/\n+/).map(x => x.trim()).filter(Boolean)) {
        alto += doc.splitTextToSize(parrafo, dentro).length * RENGLON;
      }
      return alto;
    }

    function caja(titulo, texto) {
      const alto = alturaDeCaja(titulo, texto);
      const cabeEnUnaHoja = alto <= HASTA - ARRIBA;
      if (y + alto > HASTA && cabeEnUnaHoja) hojaNueva();

      // Si fuera tan larga que no cabe ni en una hoja vacia, se pinta el texto
      // sin fondo: el fondo se quedaria en la hoja de antes y el texto seguiria
      // en la siguiente, que es peor que no tener caja.
      if (cabeEnUnaHoja) {
        doc.setFillColor(BEIGE[0], BEIGE[1], BEIGE[2]);
        doc.roundedRect(X, y - RENGLON + 1.5, ANCHO, alto, 2.5, 2.5, 'F');
      }

      const antes = y;
      const x = X + CAJA_LADOS;
      const dentro = ANCHO - CAJA_LADOS * 2;
      y += CAJA_ARRIBA - 1.5;
      if (t(titulo)) {
        escribir(titulo, { fuente: 'bold', tam: 13, color: VERDE, ancho: dentro, x });
        y += 1;
      }
      for (const parrafo of t(texto).split(/\n+/).map(p => p.trim()).filter(Boolean)) {
        escribir(parrafo, { ancho: dentro, x });
      }
      if (cabeEnUnaHoja) y = antes + alto + ENTRE_CAJAS;
      else y += ENTRE_CAJAS;
    }

    // El subtitulo de dentro de una parte, igual que los del P1: dorado, en
    // mayusculas, con aire por arriba y pegado a lo que presenta.
    function subtitulo(texto) {
      y += 6;
      // Y NO SE QUEDA SOLO AL PIE: si no caben el y cuatro renglones de lo que
      // presenta, se va entero a la hoja siguiente y se lleva su contenido.
      cabe(RENGLON * 5);
      escribir(String(texto).toUpperCase(), { fuente: 'bold', tam: 13, color: DORADO, alto: 7 });
      y += 3;
    }

    // ── LA PORTADA ────────────────────────────────────────────
    doc.addImage(base, 'JPEG', 0, 0, W, H);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(VERDE[0], VERDE[1], VERDE[2]);
    doc.text('TU PLAN DE ORIGEN', W / 2, 130, { align: 'center' });
    if (t(nombre)) {
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(DORADO[0], DORADO[1], DORADO[2]);
      doc.text(t(nombre).toUpperCase(), W / 2, 145, { align: 'center' });
    }

    // ── LAS SIETE PARTES ──────────────────────────────────────
    //
    // Cada una en su hoja, con sus cinco puntos y el nombre de cada uno: sin
    // ellos quien lee no sabe de que le habla cada trozo, ni puede volver a
    // buscar uno el dia que le haga falta.
    const PUNTOS = ['adondeVas', 'queTeFrena', 'elPlan', 'dondeTeCaes', 'comoTeLevantas'];
    const PORDEFECTO = {
      adondeVas: 'Adónde vas', queTeFrena: 'Qué te frena', elPlan: 'El plan',
      dondeTeCaes: 'Dónde te vas a caer', comoTeLevantas: 'Cómo te levantas',
    };

    for (const parte of partes) {
      abrirSeccion(parte?.etiqueta, t(parte?.titulo));
      for (const punto of PUNTOS) {
        if (!t(parte?.[punto])) continue;
        subtitulo(parte?.nombres?.[punto] || PORDEFECTO[punto]);
        corrido(parte[punto]);
      }
    }

    // ── LA HOJA DE RUTA ───────────────────────────────────────
    //
    // La ultima hoja y la que se queda a mano: por donde empieza, las siete en
    // orden con lo que hace en cada una, y que hacer si lo deja del todo.
    abrirSeccion('Para tener a mano', 'Tu hoja de ruta');

    if (t(hoja.porDondeEmpiezas)) {
      subtitulo('Por dónde empiezas');
      if (t(hoja.tituloDelPrimero)) {
        escribir(t(hoja.tituloDelPrimero), { fuente: 'bold', tam: 13, color: VERDE });
        y += 2;
      }
      corrido(hoja.porDondeEmpiezas);
    }

    const elOrden = Array.isArray(hoja.elOrden) ? hoja.elOrden : [];
    if (elOrden.length) {
      subtitulo('El orden');
      // Cada una en su caja: se leen sueltas, una detras de otra, y asi se ve
      // donde acaba una y empieza la siguiente.
      elOrden.forEach((paso, i) => caja(`${i + 1}. ${t(paso?.titulo)}`, t(paso?.queHaces)));
    }

    if (t(hoja.siLoDejas)) {
      subtitulo('Si lo dejas del todo');
      corrido(hoja.siLoDejas);
    }

    numeroDePagina();

    return res.status(200).json({
      pdfBase64: doc.output('datauristring'),
      // Si algo no cargo, el PDF sale igual y aqui se dice cual, para poder
      // mirarlo en vez de descubrirlo en el documento del cliente.
      fallos: fallos.length ? fallos : undefined,
    });
  } catch (err) {
    console.error('[p2-plan/pdf]', err);
    return res.status(500).json({ error: err.message });
  }
}
