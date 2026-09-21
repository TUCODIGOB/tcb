// ════════════════════════════════════════════════════════════════
// api/p2-plan/pdf.js
//
// EL PDF DEL P2.
//
// Recibe el documento ya escrito -sus partes- y lo
// monta en un PDF con la marca. No le pide nada al modelo, no lee el
// informe del P1 y no cobra: solo maqueta lo que le llega.
//
// LAS MEDIDAS SON LAS DEL P1, a proposito. Los dos documentos se leen seguidos
// y tienen que verse del mismo sitio: mismo margen, mismo cuerpo de letra,
// mismo renglon, mismo aire entre parrafos y el numero de pagina donde
// siempre. Lo unico que cambia es que aqui todas las paginas van sobre la base
// lisa, porque el P2 no tiene una ilustracion por parte.
//
// CADA SECCION EMPIEZA EN HOJA NUEVA: cada parte en la suya, y ninguna se pega
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

// Y CON RELOJ. Sin el, una descarga que se queda colgada se lleva por delante
// los 60 segundos de la peticion entera y el navegador recibe un error de red
// sin mensaje. Con el, se da por fallada esa pieza a los 15 segundos, se
// apunta en "fallos" y el PDF sale igual: sin esa fuente o sin ese fondo, pero
// sale.
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

  const { nombre, partes, creencias, tablas } = req.body || {};
  if (!Array.isArray(partes) || !partes.length) {
    return res.status(400).json({ error: 'Falta el documento que hay que maquetar' });
  }
  // El otro tema del documento. Si no viene, el PDF sale con las pruebas y ya:
  // aqui no se monta nada a medias, pero tampoco se rompe por lo que falte.
  const suProgramacion = Array.isArray(creencias) ? creencias : [];
  // Y su hoja de ruta: las dos tablas resumen del final.
  const suHojaDeRuta = tablas && typeof tablas === 'object' ? tablas : null;

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

    // LA CABECERA DE CADA PARTE, Y SIEMPRE EN HOJA NUEVA.
    //
    // Va en una sola linea: su numero y el titulo del desafio en el verde de la
    // marca, y detras, mas pequena y en dorado, el area de la que sale. Las dos
    // cosas vienen del P1 tal cual, no las escribe nadie aqui.
    //
    // EL AREA VA PEGADA AL FINAL DEL TITULO, no debajo. Si no cabe en el ultimo
    // renglon, baja ella sola al siguiente: nunca se sale del ancho ni se monta
    // encima de la ultima palabra.
    const TAM_TITULO = 17, TAM_AREA = 11, ALTO_TITULO = 8.5;

    // ── LO QUE SEPARA UNA DE LA SIGUIENTE ─────────────────────
    //
    // ESTO ES DE LAS PRUEBAS, no de las creencias, que van cada una en su hoja.
    //
    // ANTES CADA PRUEBA EMPEZABA EN SU HOJA. Con las largas eso dejaba hojas con
    // tres renglones y el resto en blanco, y el documento parecia mas hueco de
    // lo que es. Ahora van seguidas, y lo que las separa es esto: una raya
    // corta con su rombo, en el dorado de la marca, con el mismo hueco arriba
    // que abajo.
    const AIRE_DEL_SEPARADOR = 15;
    // Lo que sube el titulo por encima de su linea de base. Hace falta para
    // dejar el mismo hueco a los dos lados: debajo del separador lo que se ve
    // no es la linea del titulo, es donde empiezan sus mayusculas.
    const ALTO_MAYUSCULA = TAM_TITULO * 0.72 * 25.4 / 72;

    function separador(cy) {
      const medio = W / 2;
      doc.setDrawColor(DORADO[0], DORADO[1], DORADO[2]);
      doc.setLineWidth(0.25);
      doc.line(medio - 18, cy, medio - 6, cy);
      doc.line(medio + 6, cy, medio + 18, cy);
      doc.setFillColor(DORADO[0], DORADO[1], DORADO[2]);
      doc.triangle(medio, cy - 1.5, medio - 1.5, cy, medio, cy + 1.5, 'F');
      doc.triangle(medio, cy - 1.5, medio + 1.5, cy, medio, cy + 1.5, 'F');
      doc.circle(medio - 22, cy, 0.5, 'F');
      doc.circle(medio + 22, cy, 0.5, 'F');
    }

    function abrirSeccion(numero, titulo, area, primera) {
      const texto = (numero ? numero + '. ' : '') + t(titulo);
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(TAM_TITULO);
      const lineas = doc.splitTextToSize(texto, ANCHO);

      // Y SI EL AREA NO CABE PEGADA AL FINAL DEL TITULO, baja ella sola a la
      // linea siguiente. Se mira aqui porque eso es un renglon mas de alto, y
      // sin contarlo la cuenta de abajo se queda corta.
      const suArea = t(area) ? '(' + String(area).toUpperCase() + ')' : '';
      let areaAbajo = false;
      if (suArea) {
        const ultima = doc.getTextWidth(lineas[lineas.length - 1] || '');
        doc.setFontSize(TAM_AREA);
        areaAbajo = ultima + doc.getTextWidth(' ' + suArea) > ANCHO;
        doc.setFontSize(TAM_TITULO);
      }

      // LO QUE PIDE EMPEZAR ESTA, medido con su titulo ya partido: el titulo
      // entero -uno de dos lineas pide mas que uno de una- y detras el primer
      // subtitulo con los renglones que no quiere dejar solos. Menos que eso al
      // pie no es un comienzo, es un titulo huerfano.
      const pide = ALTO_TITULO * (lineas.length + (areaAbajo ? 1 : 0)) + 3 + 6 + RENGLON * 5;

      if (primera) {
        hojaNueva();
        // DONDE EMPIEZA EL P1, Y POR ESO AQUI TAMBIEN. Los dos documentos se leen
        // seguidos: si uno arranca mas arriba que el otro, se nota al pasar de uno
        // al otro. Es el mismo ARRIBA que usa el resto del documento.
        y = ARRIBA;
      } else {
        // El separador, a la misma distancia de la ultima linea de la anterior
        // que de donde empieza a verse el titulo de esta.
        const cy = y - RENGLON + AIRE_DEL_SEPARADOR;
        const arranque = cy + AIRE_DEL_SEPARADOR + ALTO_MAYUSCULA;
        if (arranque + pide > HASTA) {
          // No cabe el comienzo: pasa de hoja, y alli no hace falta separador
          // porque ya separa la hoja.
          hojaNueva();
        } else {
          separador(cy);
          y = arranque;
        }
      }

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(TAM_TITULO);
      doc.setTextColor(VERDE[0], VERDE[1], VERDE[2]);
      lineas.forEach((linea, i) => {
        doc.text(linea, X, y);
        if (i < lineas.length - 1) y += ALTO_TITULO;
      });

      if (suArea) {
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(TAM_TITULO);
        const ultima = doc.getTextWidth(lineas[lineas.length - 1] || '');
        doc.setFontSize(TAM_AREA);
        doc.setTextColor(DORADO[0], DORADO[1], DORADO[2]);
        if (areaAbajo) {
          y += ALTO_TITULO;
          doc.text(suArea, X, y);
        } else {
          doc.text(' ' + suArea, X + ultima, y);
        }
      }

      y += ALTO_TITULO + 3;
    }

    // ── LAS CAJAS ─────────────────────────────────────────────
    //
    // Un documento de veinte hojas de texto seguido no se lee: el ojo no
    // encuentra donde parar. Lo que se vuelve a buscar -la orden de cada
    // parte- va sobre un fondo beige que lo separa.
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
      const parrafos = t(texto).split(/\n+/).map(p => p.trim()).filter(Boolean);
      parrafos.forEach((parrafo, i) => {
        escribir(parrafo, { ancho: dentro, x });
        if (i < parrafos.length - 1) y += ENTRE_PARRAFOS;
      });
      if (cabeEnUnaHoja) y = antes + alto + ENTRE_CAJAS;
      else y += ENTRE_CAJAS;
    }

    // ── LAS TABLAS DE LA HOJA DE RUTA ─────────────────────────
    //
    // El resumen del final: una fila por cada cosa, con su casilla para
    // marcarla cuando la tenga hecha.
    //
    // LA CASILLA VA LA PRIMERA, antes del numero: es lo que va a usar, y lo
    // primero que mira el ojo al entrar en la fila.
    //
    // UNA FILA NO SE PARTE NUNCA entre dos hojas. Si no cabe entera, se va a la
    // siguiente y alli se vuelve a poner la cabecera: una tabla que sigue en la
    // otra pagina sin sus nombres de columna no se entiende.
    const T_CHECK = 9, T_NUMERO = 8;       // lo que ocupan las dos primeras
    const T_AIRE = 2.5;                    // lo que respira una celda por dentro
    const T_RENGLON = 6;                   // el renglon de dentro de la tabla
    const T_CUERPO = 12, T_CABECERA = 13;
    const T_CASILLA = 3.6;                 // el lado del cuadrado que se marca

    function pintarTabla(columnas) {
      const cabecera = () => {
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(T_CABECERA);
        doc.setTextColor(DORADO[0], DORADO[1], DORADO[2]);
        let x = X + T_CHECK + T_NUMERO;
        for (const col of columnas) {
          doc.text(String(col.nombre).toUpperCase(), x + T_AIRE, y);
          x += col.ancho;
        }
        y += 2.5;
        doc.setDrawColor(DORADO[0], DORADO[1], DORADO[2]);
        doc.setLineWidth(0.3);
        doc.line(X, y, X + ANCHO, y);
        y += T_AIRE + T_RENGLON;
      };

      const alto = fila => {
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(T_CUERPO);
        let renglones = 1;
        for (const col of columnas) {
          renglones = Math.max(renglones, doc.splitTextToSize(t(fila[col.clave]), col.ancho - T_AIRE * 2).length);
        }
        return renglones * T_RENGLON + T_AIRE * 2;
      };

      return filas => {
        cabecera();
        for (const fila of filas) {
          const suyo = alto(fila);
          if (y - T_RENGLON + suyo > HASTA) { hojaNueva(); cabecera(); }
          const arriba = y - T_RENGLON;

          // La casilla y el numero, uno al lado del otro.
          doc.setDrawColor(DORADO[0], DORADO[1], DORADO[2]);
          doc.setLineWidth(0.3);
          doc.roundedRect(X + 1, arriba + T_AIRE, T_CASILLA, T_CASILLA, 0.6, 0.6, 'S');
          doc.setFont('Roboto', 'bold');
          doc.setFontSize(T_CUERPO);
          doc.setTextColor(VERDE[0], VERDE[1], VERDE[2]);
          doc.text(String(fila.numero), X + T_CHECK, y);

          // Y sus celdas, cada una en su columna y sin salirse de ella.
          doc.setFont('Roboto', 'normal');
          doc.setTextColor(TINTA[0], TINTA[1], TINTA[2]);
          let x = X + T_CHECK + T_NUMERO;
          for (const col of columnas) {
            let renglon = y;
            for (const linea of doc.splitTextToSize(t(fila[col.clave]), col.ancho - T_AIRE * 2)) {
              doc.text(linea, x + T_AIRE, renglon);
              renglon += T_RENGLON;
            }
            x += col.ancho;
          }

          y = arriba + suyo;
          doc.setDrawColor(230, 224, 210);
          doc.setLineWidth(0.2);
          doc.line(X, y, X + ANCHO, y);
          y += T_RENGLON;
        }
      };
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

    // ── LAS PARTES ────────────────────────────────────────────
    //
    // Cada una en su hoja, con sus puntos y el nombre de cada uno: sin
    // ellos quien lee no sabe de que le habla cada trozo, ni puede volver a
    // buscar uno el dia que le haga falta.
    const PUNTOS = ['tuPrueba', 'queHaces', 'dondeTeCaes'];
    const PORDEFECTO = {
      tuPrueba: 'Tu prueba', queHaces: 'Qué hacer',
      dondeTeCaes: 'Dónde te vas a caer',
    };

    // EL QUE VA SOBRE BEIGE. Es la orden: lo que tiene que hacer. Es lo que va
    // a volver a buscar cuando ya haya leído el documento entero, y lo que
    // tiene que encontrar pasando páginas sin ponerse a leer. Los otros tres
    // se leen una vez y van en texto corrido: si todo lleva fondo, el fondo
    // deja de señalar nada.
    const SOBRE_BEIGE = new Set(['queHaces']);

    partes.forEach((parte, i) => {
      abrirSeccion(parte?.numero, t(parte?.titulo), parte?.area, i === 0);
      for (const punto of PUNTOS) {
        if (!t(parte?.[punto])) continue;
        subtitulo(parte?.nombres?.[punto] || PORDEFECTO[punto]);
        if (SOBRE_BEIGE.has(punto)) caja('', parte[punto]);
        else corrido(parte[punto]);
      }
    });

    // ── LAS CREENCIAS ─────────────────────────────────────────
    //
    // El otro tema: cada una en su hoja, con su numero, su titulo y sus dos
    // bloques en texto corrido. Aqui no hay ninguna orden que vuelva a buscar,
    // asi que no lleva fondo beige.
    //
    // Y NO SEGUIDAS COMO LAS PRUEBAS, aunque se probo asi: ocupan casi la hoja
    // entera, de manera que casi nunca cabria la siguiente y el separador no se
    // llegaria a ver. Lo que se veria es una de cada dos empezando abajo del
    // todo. Con la hoja entera para cada una se leen todas igual.
    //
    // Y SIN AREA. Una creencia sale de varios desafios a la vez, que pueden ser
    // de areas distintas: no es de ninguna.
    //
    // Y ANTES, UNA HOJA EN BLANCO. Ahi va la explicacion de que es una creencia
    // y como cambia, que es la misma para todos y se pone luego sobre el
    // documento. Se deja hecha, con su fondo y su numero, como las demas.
    const PUNTOS_DE_CREENCIA = ['loQueCreesHoy', 'loQueEsVerdad'];
    const PORDEFECTO_DE_CREENCIA = {
      loQueCreesHoy: 'Lo que crees hoy', loQueEsVerdad: 'Lo que es verdad',
    };

    if (suProgramacion.length) {
      hojaNueva();
      for (const creencia of suProgramacion) {
        abrirSeccion(creencia?.numero, t(creencia?.titulo), '', true);
        for (const punto of PUNTOS_DE_CREENCIA) {
          if (!t(creencia?.[punto])) continue;
          subtitulo(creencia?.nombres?.[punto] || PORDEFECTO_DE_CREENCIA[punto]);
          corrido(creencia[punto]);
        }
      }
    }

    // ── LA HOJA DE RUTA ───────────────────────────────────────
    //
    // Las dos tablas del final, cada una en su hoja y sin titulo encima: el de
    // la seccion va puesto en el fondo, no lo escribe esto.
    //
    // LAS COLUMNAS SE LLAMAN COMO EN EL DOCUMENTO. Son los mismos nombres que
    // ha ido leyendo en cada parte, asi que al llegar aqui ya sabe lo que hay
    // en cada una sin que nadie se lo explique.
    if (suHojaDeRuta) {
      // EL AREA VA AL FINAL DE LA PRIMERA CELDA, entre parentesis, con la misma
      // letra y el mismo color que el texto, y con solo la primera en mayuscula.
      // La pone el programa, igual que en la cabecera de cada parte. Solo en la
      // tabla de las pruebas: la creencia no lleva area.
      const comoNombre = a => {
        const suya = t(a);
        return suya ? suya.charAt(0).toUpperCase() + suya.slice(1).toLowerCase() : '';
      };
      const conSuArea = (filas, clave) => (Array.isArray(filas) ? filas : []).map(f => {
        const suya = comoNombre(f?.area);
        return suya ? { ...f, [clave]: t(f?.[clave]) + ' (' + suya + ')' } : f;
      });

      const conFilas = (filas, columnas) => {
        if (!Array.isArray(filas) || !filas.length) return;
        hojaNueva();
        pintarTabla(columnas)(filas);
      };

      conFilas(conSuArea(suHojaDeRuta.pruebas, 'tuPrueba'), [
        { nombre: 'Tu prueba',           clave: 'tuPrueba',    ancho: 53 },
        { nombre: 'Qué hacer',           clave: 'queHaces',    ancho: 53 },
        { nombre: 'Dónde te vas a caer', clave: 'dondeTeCaes', ancho: 52 },
      ]);

      // Las dos del mismo tamano: aqui ninguna manda sobre la otra.
      conFilas(suHojaDeRuta.creencias, [
        { nombre: 'Lo que crees hoy', clave: 'loQueCreesHoy', ancho: 79 },
        { nombre: 'Lo que es verdad', clave: 'loQueEsVerdad', ancho: 79 },
      ]);
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
