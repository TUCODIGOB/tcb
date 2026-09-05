// ════════════════════════════════════════════════════════════════
// api/p2-plan/pdf.js
//
// EL PDF DEL P2.
//
// Recibe el documento ya escrito -el principio, las siete partes, lo primero
// que hace y el final- y lo monta en un PDF con la marca. No le pide nada al modelo, no lee el
// informe del P1 y no cobra: solo maqueta lo que le llega.
//
// LAS MEDIDAS SON LAS DEL P1, a proposito. Los dos documentos se leen seguidos
// y tienen que verse del mismo sitio: mismo margen, mismo cuerpo de letra,
// mismo renglon, mismo aire entre parrafos y el numero de pagina donde
// siempre. Lo unico que cambia es que aqui todas las paginas van sobre la base
// lisa, porque el P2 no tiene una ilustracion por parte.
//
// CADA SECCION EMPIEZA EN HOJA NUEVA: el principio, cada una de las siete
// partes, lo primero que hace, el orden y el dia que lo deje. Ninguna se pega
// a la anterior.
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, marco, partes, empiezaPor } = req.body || {};
  if (!marco || !Array.isArray(partes) || !partes.length) {
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

    function escribir(texto, { fuente = 'normal', tam = CUERPO, color = TINTA, alto = RENGLON, ancho = ANCHO } = {}) {
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
        doc.text(linea, X, y);
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

    // El subtitulo de dentro de una parte, igual que los del P1: dorado, en
    // mayusculas, con aire por arriba y pegado a lo que presenta.
    function subtitulo(texto) {
      y += 6;
      cabe(20);
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

    // ── EL PRINCIPIO ──────────────────────────────────────────
    abrirSeccion('Antes de nada', 'Por dónde empiezas');
    for (const pieza of [marco.laConducta, marco.porQueEsa, marco.soloEsto]) {
      if (!t(pieza)) continue;
      corrido(pieza);
      y += ENTRE_PARRAFOS;
    }

    // ── LAS SIETE PARTES ──────────────────────────────────────
    for (const parte of partes) {
      abrirSeccion(parte?.etiqueta, t(parte?.titulo));
      corrido(parte?.texto);

      const movimientos = Array.isArray(parte?.movimientos) ? parte.movimientos : [];
      if (movimientos.length) {
        subtitulo(t(parte?.bloque) || 'Qué haces');
        for (const m of movimientos) {
          // El titulo del movimiento no se queda solo al pie: si no caben el y
          // dos renglones de lo suyo, se van los dos a la hoja siguiente.
          cabe(RENGLON * 3);
          escribir(m?.titulo, { fuente: 'bold', tam: 13, color: VERDE, alto: 7 });
          y += 1;
          corrido(m?.texto);
          y += ENTRE_PARRAFOS;
        }
      }
    }

    // ── LO PRIMERO QUE HACE ───────────────────────────────────
    //
    // Es la hoja por la que este documento deja de leerse y empieza a hacerse,
    // asi que va sola y con su sitio, delante del orden.
    const arranque = [marco.conQue, marco.comoEmpiezas, marco.cuandoSumas].filter(x => t(x));
    if (arranque.length) {
      abrirSeccion('Para terminar', 'Lo primero que haces');
      for (let i = 0; i < arranque.length; i++) {
        corrido(arranque[i]);
        if (i < arranque.length - 1) y += ENTRE_PARRAFOS;
      }
    }

    // ── EL ORDEN ──────────────────────────────────────────────
    const orden = Array.isArray(marco.orden) ? marco.orden : [];
    if (orden.length) {
      abrirSeccion('Para terminar', 'Y después, en este orden');
      // EMPIEZA POR LA PARTE POR LA QUE EMPIEZA. Al principio del documento se
      // le cuenta la conducta por la que arranca, pero sin decirle de que parte
      // sale; sin esto la lista empieza por la segunda y no ata una con otra.
      if (t(empiezaPor)) {
        escribir('Empiezas por:');
        escribir(t(empiezaPor), { fuente: 'bold', color: VERDE });
        y += ENTRE_PARRAFOS;
      }
      for (const paso of orden) {
        cabe(RENGLON * 2);
        // Primero la condicion y despues a donde pasa, como en la pantalla: al
        // reves se lee como si la condicion fuera de esa parte, y no lo es.
        if (t(paso?.saltas)) {
          escribir(`Cuando ${t(paso.saltas)}, pasas a:`);
          escribir(t(paso?.titulo), { fuente: 'bold', color: VERDE });
        } else {
          escribir(t(paso?.titulo), { fuente: 'bold', color: VERDE });
        }
        y += ENTRE_PARRAFOS;
      }
    }

    // ── EL DIA QUE LO DEJE ────────────────────────────────────
    if (t(marco.recaida)) {
      abrirSeccion('Para terminar', 'El día que lo dejes');
      corrido(marco.recaida);
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
