
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { jsPDF } = require('jspdf');

const BASE_URL = 'https://origennatal.com';

const GUARDADOS = new Map();

const ESPERA_DE_UNA_PIEZA_MS = 15000;

async function enBase64(ruta) {
  if (GUARDADOS.has(ruta)) return GUARDADOS.get(ruta);
  const r = await fetch(`${BASE_URL}${ruta}`, { signal: AbortSignal.timeout(ESPERA_DE_UNA_PIEZA_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  let binario = '';
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
  const b64 = btoa(binario);
  GUARDADOS.set(ruta, b64);
  return b64;
}

const W = 210, H = 297;
const X = 18;
const ANCHO = 175;
const CUERPO = 12;
const RENGLON = 7;
const ENTRE_PARRAFOS = 7;
const ARRIBA = 60;
const AIRE_SOBRE_NUMERO = 5;
const HASTA = H - 16 - AIRE_SOBRE_NUMERO;

const VERDE = [14, 63, 75];
const DORADO = [207, 177, 128];
const TINTA = [40, 40, 40];

const BEIGE = [250, 245, 234];

const CAJA_LADOS = 6;
const CAJA_ARRIBA = 6;
const CAJA_ABAJO = 5;
const ENTRE_CAJAS = 5;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, partes } = req.body || {};
  if (!Array.isArray(partes) || !partes.length) {
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
    if (normal)  { doc.addFileToVFS('Roboto-Regular.ttf', normal); doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal'); }
    if (negrita) { doc.addFileToVFS('Roboto-Bold.ttf', negrita);   doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold'); }

    const _addImage = doc.addImage.bind(doc);
    doc.addImage = (img, ...resto) => (img ? _addImage(img, ...resto) : doc);

    const t = v => String(v == null ? '' : v).trim();

    let pagina = 0, y = ARRIBA;

    function numeroDePagina() {
      if (pagina < 1) return;
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(String(pagina), W - 16, H - 16, { align: 'right' });
    }

    function hojaNueva() {
      numeroDePagina();
      pagina++;
      doc.addPage();
      doc.addImage(base, 'JPEG', 0, 0, W, H);
      y = ARRIBA;
    }

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

    function corrido(texto) {
      const trozos = t(texto).split(/\n+/).map(p => p.trim()).filter(Boolean);
      for (let i = 0; i < trozos.length; i++) {
        escribir(trozos[i]);
        if (i < trozos.length - 1) y += ENTRE_PARRAFOS;
      }
    }

    function abrirSeccion(etiqueta, titulo) {
      hojaNueva();
      y = 42;
      if (etiqueta) {
        escribir(String(etiqueta).toUpperCase(), { fuente: 'bold', tam: 11, color: DORADO, alto: 10 });
      }
      escribir(titulo, { fuente: 'bold', tam: 17, color: VERDE, alto: 8.5 });
      y += 10;
    }

    function alturaDeCaja(titulo, texto) {
      let alto = CAJA_ARRIBA + CAJA_ABAJO;
      const dentro = ANCHO - CAJA_LADOS * 2;
      if (t(titulo)) {
        doc.setFont('Roboto', 'bold'); doc.setFontSize(13);
        alto += doc.splitTextToSize(t(titulo), dentro).length * RENGLON + 1;
      }
      doc.setFont('Roboto', 'normal'); doc.setFontSize(CUERPO);
      const trozos = t(texto).split(/\n+/).map(x => x.trim()).filter(Boolean);
      trozos.forEach((parrafo, i) => {
        alto += doc.splitTextToSize(parrafo, dentro).length * RENGLON;
        if (i < trozos.length - 1) alto += ENTRE_PARRAFOS;
      });
      return alto;
    }

    function caja(titulo, texto) {
      const alto = alturaDeCaja(titulo, texto);
      const cabeEnUnaHoja = alto <= HASTA - ARRIBA;
      if (y + alto > HASTA && cabeEnUnaHoja) hojaNueva();

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
      const parrafos = t(texto).split(/\n+/).map(p => p.trim()).filter(Boolean);
      parrafos.forEach((parrafo, i) => {
        escribir(parrafo, { ancho: dentro, x });
        if (i < parrafos.length - 1) y += ENTRE_PARRAFOS;
      });
      if (cabeEnUnaHoja) y = antes + alto + ENTRE_CAJAS;
      else y += ENTRE_CAJAS;
    }

    function subtitulo(texto) {
      y += 6;
      cabe(RENGLON * 5);
      escribir(String(texto).toUpperCase(), { fuente: 'bold', tam: 13, color: DORADO, alto: 7 });
      y += 3;
    }

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

    const PUNTOS = ['tuPrueba', 'queHaces', 'dondeTeCaes'];
    const PORDEFECTO = {
      tuPrueba: 'Tu prueba', queHaces: 'Qué haces',
      dondeTeCaes: 'Dónde te vas a caer y qué hacer cuando te caigas',
    };

    const SOBRE_BEIGE = new Set(['queHaces']);

    for (const parte of partes) {
      abrirSeccion(parte?.etiqueta, t(parte?.titulo));
      for (const punto of PUNTOS) {
        if (!t(parte?.[punto])) continue;
        subtitulo(parte?.nombres?.[punto] || PORDEFECTO[punto]);
        if (SOBRE_BEIGE.has(punto)) caja('', parte[punto]);
        else corrido(parte[punto]);
      }
    }

    numeroDePagina();

    return res.status(200).json({
      pdfBase64: doc.output('datauristring'),
      fallos: fallos.length ? fallos : undefined,
    });
  } catch (err) {
    console.error('[p2-plan/pdf]', err);
    return res.status(500).json({ error: err.message });
  }
}
