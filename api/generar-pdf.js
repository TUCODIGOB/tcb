import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { jsPDF } = require('jspdf');
import Stripe from 'stripe';
import { estado, liberar, completar, compraValida } from '../lib/reserva.js';
import { analizarArea } from '../lib/bloques.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const BASE_URL = 'https://origennatal.com';

// Las 16 imagenes y las 3 fuentes del PDF son identicas para todos los clientes,
// asi que se guardan la primera vez y se reutilizan en las generaciones siguientes
// del mismo contenedor. Solo se guarda lo que se ha descargado bien: un fallo
// nunca se cachea, para que no se repita en todos los PDFs posteriores.
const ASSET_CACHE = new Map();
 
export const config = {
  api: {
    bodyParser: { sizeLimit: '2mb' },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let sessionEmail = '';
  {
    const { session_id, token } = req.body;

    if (!session_id || typeof session_id !== 'string') {
      return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (!compraValida(session)) {
        return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
      }

      const st = estado(session);
      if (st.completado) {
        return res.status(403).json({ error: 'Este informe ya fue generado.' });
      }
      // Sin la reserva que dio chat.js no se genera nada. Tener el enlace
      // (el session_id) no basta: el token solo lo tiene el navegador que
      // acaba de pasar por chat.js con la reserva en la mano.
      if (!token || typeof token !== 'string' || token !== st.token) {
        return res.status(403).json({ error: 'Este informe ya fue generado.' });
      }

      sessionEmail = session.customer_email || session.customer_details?.email || '';
    } catch (err) {
      return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
    }
  }

  const { nombre, sexo, fechaNice, hora, lugar, edad, carta, areas, rasgos, session_id, token } = req.body;

  if (!nombre || !areas || !session_id) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  try {
    // Ficheros que no se han podido cargar en esta generacion
    const fallosCarga = [];

    // ── Descarga con cache. Devuelve el mismo base64 que se usaba antes ───────
    async function loadAssetBase64(path) {
      if (ASSET_CACHE.has(path)) return ASSET_CACHE.get(path);
      const r = await fetch(`${BASE_URL}${path}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = await r.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      ASSET_CACHE.set(path, b64);
      return b64;
    }

    // ── Cargar fuentes ────────────────────────────────────────────────────────
    async function loadFontBase64(path) {
      try {
        return await loadAssetBase64(path);
      } catch (err) {
        fallosCarga.push(`${path} (${err.message})`);
        return null;
      }
    }

    // ── Cargar imágenes ───────────────────────────────────────────────────────
    async function loadImageBase64(path) {
      try {
        return 'data:image/jpeg;base64,' + await loadAssetBase64(path);
      } catch (err) {
        fallosCarga.push(`${path} (${err.message})`);
        return null;
      }
    }

    const [regular, bold, italic, italianno,
      img_portada, img_indice, img_bienvenido, img_rueda, img_base,
      img_identidad, img_patrones, img_miedos, img_herida, img_amor, img_relaciones, img_dinero,
      img_frase, img_proximo, img_proximo2, img_trasera
    ] = await Promise.all([
      loadFontBase64('/fonts/Roboto-Regular.ttf'),
      loadFontBase64('/fonts/Roboto-Bold.ttf'),
      loadFontBase64('/fonts/Roboto-Italic.ttf'),
      // La caligrafica del cierre de cada area. Ver ESTILOS.cierre.
      loadFontBase64('/fonts/Italianno-Regular.ttf'),
      loadImageBase64('/images/1-portada-pdf.jpg'),
      loadImageBase64('/images/2-indice-pdf.jpg'),
      loadImageBase64('/images/3-bienvenido-pdf.jpg'),
      loadImageBase64('/images/4-rueda-pdf.jpg'),
      loadImageBase64('/images/5-base-pdf.jpg'),
      loadImageBase64('/images/5A-base-identidad-pdf.jpg'),
      loadImageBase64('/images/5B-base-patrones-pdf.jpg'),
      loadImageBase64('/images/5C-base-miedos-pdf.jpg'),
      loadImageBase64('/images/5D-base-herida-pdf.jpg'),
      loadImageBase64('/images/5E-base-amor-pdf.jpg'),
      loadImageBase64('/images/5F-base-relaciones-pdf.jpg'),
      loadImageBase64('/images/5G-base-dinero-pdf.jpg'),
      loadImageBase64('/images/7-frase-pdf.jpg'),
      loadImageBase64('/images/8-proximo-paso-pdf.jpg'),
      loadImageBase64('/images/8a-proximo-paso-pdf.jpg'),
      loadImageBase64('/images/9-trasera-pdf.jpg'),
    ]);

    // Fondos de la primera pagina de cada area, en el mismo orden que areaTitles
    const img_areas = [img_identidad, img_patrones, img_miedos, img_herida, img_amor, img_relaciones, img_dinero];

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    // Si una fuente no se ha podido cargar no se registra: jsPDF dibuja ese texto
    // con la fuente por defecto en lugar de fallar, y el informe sigue siendo legible.
    if (regular) { doc.addFileToVFS('Roboto-Regular.ttf', regular); doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal'); }
    if (bold)    { doc.addFileToVFS('Roboto-Bold.ttf', bold);       doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold'); }
    if (italic)  { doc.addFileToVFS('Roboto-Italic.ttf', italic);   doc.addFont('Roboto-Italic.ttf', 'Roboto', 'italic'); }
    // Italianno solo tiene un peso: se registra como 'normal' y no hay negrita
    // ni cursiva suyas. Si el fichero no llegara, el cierre se pinta con la
    // Roboto de siempre: ver comoSePinta.
    var hayItalianno = false;
    if (italianno) {
      doc.addFileToVFS('Italianno-Regular.ttf', italianno);
      doc.addFont('Italianno-Regular.ttf', 'Italianno', 'normal');
      hayItalianno = true;
    }

    // Si un fondo no se ha podido cargar, esa pagina sale sin fondo en vez de
    // romper el PDF entero. Se envuelve addImage una sola vez para no tener que
    // tocar ninguna de las llamadas de dibujo que ya existen.
    const _addImage = doc.addImage.bind(doc);
    doc.addImage = function (img, ...resto) { return img ? _addImage(img, ...resto) : doc; };

    function fx(s) { return s || ''; }
    var W = 210, H = 297;

    function addPageNum(n) {
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(String(n), W - 16, H - 16, { align: 'right' });
    }

    function wrapText(txt, x, y, maxW, lh) {
      var lines = doc.splitTextToSize(txt, maxW);
      for (var i = 0; i < lines.length; i++) {
        if (y > H - 20) { doc.addPage(); y = 25; }
        doc.text(fx(lines[i]), x, y);
        y += lh;
      }
      return y;
    }

    // ── NEGRITAS DENTRO DEL TEXTO ────────────────────────────────────────────
    // El modelo marca lo que destaca con **dos asteriscos**. jsPDF pinta cada
    // llamada a text() con una sola fuente, asi que no basta con partir el
    // parrafo en lineas: hay que partirlo en palabras, cada una sabiendo si va
    // en negrita, y colocarlas una detras de otra midiendo lo que ocupan.
    function palabrasConNegrita(txt) {
      var segs = [], resto = String(txt || ''), m;
      var marca = /\*\*([\s\S]+?)\*\*/;
      while ((m = marca.exec(resto)) !== null) {
        if (m.index > 0) segs.push({ t: resto.slice(0, m.index), b: false });
        segs.push({ t: m[1], b: true });
        resto = resto.slice(m.index + m[0].length);
      }
      if (resto) segs.push({ t: resto, b: false });
      var out = [];
      for (var i = 0; i < segs.length; i++) {
        // Asterisco suelto: marca sin cerrar, o cortada al partir el parrafo por
        // longitud. Se limpia, porque al cliente no le puede llegar impreso.
        var trozos = segs[i].t.replace(/\*/g, '').split(/(\s+)/);
        for (var j = 0; j < trozos.length; j++) {
          if (trozos[j] === '') continue;
          out.push({ t: trozos[j], b: segs[i].b, esp: /^\s+$/.test(trozos[j]) });
        }
      }
      return out;
    }

    // La fuente base dice como se pinta el bloque entero: 'normal' deja que
    // las palabras marcadas salgan en negrita, y 'bold' o 'italic' mandan
    // sobre todo el bloque (dentro de una cursiva no cabe una negrita: la
    // fuente negrita-cursiva no esta cargada, y mezclarlas descuadraria la
    // medida de la linea).
    // QUE FUENTE TOCA, Y CON QUE PESO.
    //
    // Hasta ahora todo se pintaba con Roboto y la familia iba escrita a mano
    // en cada sitio. El cierre usa Italianno, que solo tiene un peso: pedirle
    // negrita la dejaria sin dibujar. Aqui se decide una vez, y se decide
    // igual al medir que al pintar, que es lo que importa: si se midiera con
    // una fuente y se pintara con otra, las lineas saldrian de otro largo.
    //
    // Si el fichero de Italianno no llegara, se cae a Roboto negrita, que es
    // como estaba antes: un cierre sin fuente no se pinta, y ese es el golpe
    // final del area.
    function comoSePinta(fuenteBase, familia, enNegrita) {
      if (familia === 'Italianno' && hayItalianno) return ['Italianno', 'normal'];
      return ['Roboto', (fuenteBase === 'normal' && enNegrita) ? 'bold' : fuenteBase];
    }

    function anchoPalabra(pal, size, fuenteBase, familia) {
      doc.setFontSize(size);
      var f = comoSePinta(fuenteBase, familia, pal.b);
      doc.setFont(f[0], f[1]);
      return doc.getTextWidth(pal.t);
    }

    function anchoLinea(linea, size, fuenteBase, familia) {
      var a = 0;
      for (var i = 0; i < linea.length; i++) a += anchoPalabra(linea[i], size, fuenteBase, familia);
      return a;
    }

    // Lo mismo que splitTextToSize, pero midiendo cada palabra con su fuente.
    function lineasConNegrita(txt, maxW, size, fuenteBase, familia) {
      var pals = palabrasConNegrita(txt), lineas = [], linea = [], ancho = 0;
      for (var i = 0; i < pals.length; i++) {
        var w = anchoPalabra(pals[i], size, fuenteBase, familia);
        if (pals[i].esp) {
          if (linea.length === 0) continue;
          linea.push(pals[i]); ancho += w; continue;
        }
        if (ancho + w > maxW && linea.length > 0) {
          while (linea.length > 0 && linea[linea.length - 1].esp) {
            ancho -= anchoPalabra(linea.pop(), size, fuenteBase);
          }
          lineas.push(linea); linea = []; ancho = 0;
        }
        linea.push(pals[i]); ancho += w;
      }
      while (linea.length > 0 && linea[linea.length - 1].esp) linea.pop();
      if (linea.length > 0) lineas.push(linea);
      return lineas;
    }

    // Al partir un parrafo largo en trozos, el corte puede caer dentro de una
    // negrita y dejar la marca de abrir en un trozo y la de cerrar en el
    // siguiente. Sin su pareja las dos se limpian y la negrita se pierde, asi
    // que se cierra al final del trozo y se vuelve a abrir en el de despues.
    function cuadrarNegritas(trozos) {
      var abierta = false;
      return trozos.map(function (t) {
        var salida = abierta ? '**' + t : t;
        var marcas = (salida.match(/\*\*/g) || []).length;
        abierta = (marcas % 2) === 1;
        return abierta ? salida + '**' : salida;
      });
    }

    function dibujarCarta(cx, cy, r) {
      var PI = Math.PI;
      var asc = carta.ascRaw || 0;
      function lonToRad(lon) { return PI - ((lon - asc) * PI / 180); }
      function px(rr, a) { return cx + rr * Math.cos(a); }
      function py(rr, a) { return cy + rr * Math.sin(a); }

      var rOut   = r;
      var rSigno = r * 0.87;
      var rCasa  = r * 0.70;
      var rInner = r * 0.62;

      var COL_VERDE  = [14, 63, 75];
      var COL_DORADO = [189, 144, 72];
      var COL_CREMA  = [255, 251, 239];
      var COL_GRIS   = [140, 140, 140];

      var GROSOR_SIMBOLO = 0.25;

      doc.setFillColor(COL_CREMA[0], COL_CREMA[1], COL_CREMA[2]);
      doc.circle(cx, cy, rOut, 'F');

      var elemFills = [
        [253,235,220],[238,245,232],[245,240,230],[230,242,245],
        [253,235,220],[238,245,232],[245,240,230],[230,242,245],
        [253,235,220],[238,245,232],[245,240,230],[230,242,245]
      ];

      for (var s = 0; s < 12; s++) {
        var c = elemFills[s];
        doc.setFillColor(c[0], c[1], c[2]);
        doc.setDrawColor(c[0], c[1], c[2]);
        var steps = 10;
        for (var k = 0; k < steps; k++) {
          var ak1 = lonToRad(s * 30 + (30 / steps) * k);
          var ak2 = lonToRad(s * 30 + (30 / steps) * (k + 1));
          doc.triangle(px(rSigno,ak1),py(rSigno,ak1),px(rOut,ak1),py(rOut,ak1),px(rOut,ak2),py(rOut,ak2),'FD');
          doc.triangle(px(rSigno,ak1),py(rSigno,ak1),px(rOut,ak2),py(rOut,ak2),px(rSigno,ak2),py(rSigno,ak2),'FD');
        }
      }

      doc.setDrawColor(COL_DORADO[0],COL_DORADO[1],COL_DORADO[2]);
      doc.setLineWidth(0.5); doc.circle(cx,cy,rOut);
      doc.setLineWidth(0.25); doc.circle(cx,cy,rSigno);
      doc.setLineWidth(0.3); doc.circle(cx,cy,rCasa);
      doc.setLineWidth(0.25); doc.circle(cx,cy,rInner);

      doc.setDrawColor(COL_DORADO[0],COL_DORADO[1],COL_DORADO[2]);
      doc.setLineWidth(0.15);
      for (var gm = 0; gm < 72; gm++) {
        var gma = lonToRad(gm * 5);
        var rMark2 = (gm % 6 === 0) ? rOut - 2.5 : rOut - 1.2;
        doc.line(px(rOut,gma),py(rOut,gma),px(rMark2,gma),py(rMark2,gma));
      }

      doc.setDrawColor(COL_DORADO[0],COL_DORADO[1],COL_DORADO[2]);
      doc.setLineWidth(0.3);
      for (var d = 0; d < 12; d++) {
        var da = lonToRad(d * 30);
        doc.line(px(rSigno,da),py(rSigno,da),px(rOut,da),py(rOut,da));
      }

      doc.setDrawColor(180,160,130); doc.setLineWidth(0.2);
      for (var h = 0; h < 12; h++) {
        var ha = lonToRad(h * 30);
        doc.line(px(rInner,ha),py(rInner,ha),px(rCasa,ha),py(rCasa,ha));
      }

      // Los simbolos se dibujan a trazo, y el trazo era tan gordo que los
      // que llevan lineas juntas se cerraban solos: Mercurio pegaba los
      // cuernos al circulo (quedaban 0,015 mm de blanco) y a Escorpio le
      // quedaban 0,155 mm entre palo y palo, o sea una mancha. Con 0,25 mm
      // -el mismo grosor de los aros de la rueda, que si se ven bien- el
      // blanco mas estrecho pasa a 0,215 mm y cada simbolo se lee.
      function dibujarSigno(idx, centerX, centerY, size) {
        doc.setDrawColor(COL_VERDE[0],COL_VERDE[1],COL_VERDE[2]);
        doc.setLineWidth(GROSOR_SIMBOLO);
        var sz = size, x = centerX, y = centerY;
        if (idx===0){doc.line(x-sz*.7,y+sz*.5,x,y-sz*.3);doc.line(x,y-sz*.3,x+sz*.7,y+sz*.5);doc.line(x-sz*.7,y+sz*.5,x-sz*.5,y+sz*.1);doc.line(x+sz*.7,y+sz*.5,x+sz*.5,y+sz*.1);}
        else if(idx===1){doc.circle(x,y+sz*.25,sz*.35);doc.line(x-sz*.5,y-sz*.1,x-sz*.7,y-sz*.5);doc.line(x+sz*.5,y-sz*.1,x+sz*.7,y-sz*.5);}
        else if(idx===2){doc.line(x-sz*.3,y-sz*.5,x-sz*.3,y+sz*.5);doc.line(x+sz*.3,y-sz*.5,x+sz*.3,y+sz*.5);doc.line(x-sz*.5,y-sz*.5,x+sz*.5,y-sz*.5);doc.line(x-sz*.5,y+sz*.5,x+sz*.5,y+sz*.5);}
        else if(idx===3){doc.circle(x-sz*.35,y-sz*.15,sz*.18,'F');doc.circle(x+sz*.35,y+sz*.15,sz*.18,'F');doc.line(x-sz*.35,y-sz*.35,x+sz*.4,y-sz*.25);doc.line(x+sz*.35,y+sz*.35,x-sz*.4,y+sz*.25);}
        else if(idx===4){doc.circle(x-sz*.15,y+sz*.1,sz*.3);doc.line(x+sz*.1,y-sz*.1,x+sz*.4,y-sz*.4);doc.line(x+sz*.4,y-sz*.4,x+sz*.6,y-sz*.2);doc.line(x+sz*.6,y-sz*.2,x+sz*.5,y+sz*.1);}
        else if(idx===5){doc.line(x-sz*.5,y-sz*.4,x-sz*.5,y+sz*.5);doc.line(x-sz*.2,y-sz*.4,x-sz*.2,y+sz*.5);doc.line(x+sz*.1,y-sz*.4,x+sz*.1,y+sz*.5);doc.line(x-sz*.5,y-sz*.4,x-sz*.35,y-sz*.2);doc.line(x-sz*.35,y-sz*.2,x-sz*.2,y-sz*.4);doc.line(x-sz*.2,y-sz*.4,x-sz*.05,y-sz*.2);doc.line(x-sz*.05,y-sz*.2,x+sz*.1,y-sz*.4);doc.line(x+sz*.1,y+sz*.3,x+sz*.35,y+sz*.5);doc.line(x+sz*.35,y+sz*.5,x+sz*.25,y+sz*.25);}
        else if(idx===6){doc.line(x-sz*.55,y+sz*.35,x+sz*.55,y+sz*.35);doc.line(x-sz*.5,y,x-sz*.3,y-sz*.25);doc.line(x-sz*.3,y-sz*.25,x+sz*.3,y-sz*.25);doc.line(x+sz*.3,y-sz*.25,x+sz*.5,y);doc.line(x-sz*.5,y,x-sz*.5,y+sz*.1);doc.line(x+sz*.5,y,x+sz*.5,y+sz*.1);doc.line(x-sz*.5,y+sz*.1,x-sz*.55,y+sz*.15);doc.line(x+sz*.5,y+sz*.1,x+sz*.55,y+sz*.15);}
        else if(idx===7){doc.line(x-sz*.55,y+sz*.4,x-sz*.55,y-sz*.3);doc.line(x-sz*.55,y-sz*.3,x-sz*.3,y-sz*.3);doc.line(x-sz*.3,y-sz*.3,x-sz*.3,y+sz*.4);doc.line(x-sz*.3,y+sz*.4,x-sz*.05,y+sz*.4);doc.line(x-sz*.05,y+sz*.4,x-sz*.05,y-sz*.3);doc.line(x-sz*.05,y-sz*.3,x+sz*.25,y-sz*.3);doc.line(x+sz*.25,y-sz*.3,x+sz*.25,y+sz*.5);doc.line(x+sz*.25,y+sz*.5,x+sz*.55,y+sz*.25);doc.line(x+sz*.55,y+sz*.25,x+sz*.4,y+sz*.2);doc.line(x+sz*.55,y+sz*.25,x+sz*.5,y+sz*.4);}
        else if(idx===8){doc.line(x-sz*.5,y+sz*.5,x+sz*.5,y-sz*.5);doc.line(x+sz*.5,y-sz*.5,x+sz*.2,y-sz*.45);doc.line(x+sz*.5,y-sz*.5,x+sz*.45,y-sz*.2);doc.line(x-sz*.1,y+sz*.1,x+sz*.15,y-sz*.2);}
        else if(idx===9){doc.line(x-sz*.5,y-sz*.3,x-sz*.2,y+sz*.3);doc.line(x-sz*.2,y+sz*.3,x+sz*.1,y-sz*.3);doc.line(x+sz*.1,y-sz*.3,x+sz*.1,y+sz*.2);doc.circle(x+sz*.3,y+sz*.3,sz*.22);doc.line(x+sz*.1,y+sz*.2,x+sz*.15,y+sz*.35);}
        else if(idx===10){for(var wv=0;wv<2;wv++){var yOff=wv===0?-sz*.15:sz*.2;doc.line(x-sz*.5,yOff+y,x-sz*.3,yOff+y-sz*.15);doc.line(x-sz*.3,yOff+y-sz*.15,x-sz*.1,yOff+y);doc.line(x-sz*.1,yOff+y,x+sz*.1,yOff+y-sz*.15);doc.line(x+sz*.1,yOff+y-sz*.15,x+sz*.3,yOff+y);doc.line(x+sz*.3,yOff+y,x+sz*.5,yOff+y-sz*.15);}}
        else if(idx===11){doc.line(x-sz*.5,y-sz*.4,x-sz*.35,y-sz*.1);doc.line(x-sz*.35,y-sz*.1,x-sz*.35,y+sz*.1);doc.line(x-sz*.35,y+sz*.1,x-sz*.5,y+sz*.4);doc.line(x+sz*.5,y-sz*.4,x+sz*.35,y-sz*.1);doc.line(x+sz*.35,y-sz*.1,x+sz*.35,y+sz*.1);doc.line(x+sz*.35,y+sz*.1,x+sz*.5,y+sz*.4);doc.line(x-sz*.35,y,x+sz*.35,y);}
      }

      var sgSize = (rOut - rSigno) * 0.42;
      for (var sg = 0; sg < 12; sg++) {
        var sga = lonToRad(sg * 30 + 15);
        var rMid = (rSigno + rOut) / 2;
        dibujarSigno(sg, px(rMid,sga), py(rMid,sga), sgSize);
      }

      doc.setDrawColor(COL_VERDE[0],COL_VERDE[1],COL_VERDE[2]); doc.setLineWidth(0.9);
      doc.line(px(rOut,PI),py(rOut,PI),px(rOut,0),py(rOut,0));
      doc.line(cx,cy-rOut,cx,cy+rOut);

      doc.setFont('Roboto','bold'); doc.setFontSize(8);
      doc.setTextColor(COL_VERDE[0],COL_VERDE[1],COL_VERDE[2]);
      doc.text('AC',cx-rOut-4,cy+1,{align:'right'});
      doc.text('DC',cx+rOut+4,cy+1,{align:'left'});
      doc.text('MC',cx,cy-rOut-3,{align:'center'});
      doc.text('IC',cx,cy+rOut+5,{align:'center'});

      doc.setFontSize(6); doc.setFont('Roboto','normal');
      doc.setTextColor(COL_GRIS[0],COL_GRIS[1],COL_GRIS[2]);
      for (var hn = 0; hn < 12; hn++) {
        var hna = lonToRad(hn * 30 + 15);
        var rNum = rInner - 4;
        doc.text(String(hn+1),cx+rNum*Math.cos(hna),cy+rNum*Math.sin(hna)+1,{align:'center'});
      }

      function dibujarPlaneta(tipo, centerX, centerY, size) {
        doc.setDrawColor(COL_VERDE[0],COL_VERDE[1],COL_VERDE[2]); doc.setLineWidth(GROSOR_SIMBOLO);
        var sz=size, x=centerX, y=centerY;
        if(tipo==='sol'){doc.circle(x,y,sz*.55);doc.setFillColor(COL_VERDE[0],COL_VERDE[1],COL_VERDE[2]);doc.circle(x,y,sz*.1,'F');}
        else if(tipo==='luna'){doc.setFillColor(COL_VERDE[0],COL_VERDE[1],COL_VERDE[2]);doc.circle(x-sz*.1,y,sz*.55,'F');doc.setFillColor(COL_CREMA[0],COL_CREMA[1],COL_CREMA[2]);doc.circle(x+sz*.15,y,sz*.5,'F');}
        else if(tipo==='mercurio'){doc.line(x-sz*.3,y-sz*.7,x-sz*.15,y-sz*.5);doc.line(x+sz*.3,y-sz*.7,x+sz*.15,y-sz*.5);doc.circle(x,y-sz*.05,sz*.3);doc.line(x,y+sz*.25,x,y+sz*.7);doc.line(x-sz*.25,y+sz*.5,x+sz*.25,y+sz*.5);}
        else if(tipo==='venus'){doc.circle(x,y-sz*.2,sz*.35);doc.line(x,y+sz*.15,x,y+sz*.7);doc.line(x-sz*.25,y+sz*.45,x+sz*.25,y+sz*.45);}
        else if(tipo==='marte'){doc.circle(x-sz*.1,y+sz*.15,sz*.35);doc.line(x+sz*.15,y-sz*.1,x+sz*.5,y-sz*.45);doc.line(x+sz*.5,y-sz*.45,x+sz*.25,y-sz*.45);doc.line(x+sz*.5,y-sz*.45,x+sz*.5,y-sz*.2);}
        else if(tipo==='jupiter'){doc.line(x-sz*.5,y-sz*.15,x+sz*.1,y-sz*.15);doc.line(x-sz*.25,y-sz*.4,x-sz*.25,y+sz*.55);doc.line(x+sz*.1,y-sz*.15,x+sz*.35,y-sz*.4);doc.line(x+sz*.35,y-sz*.4,x+sz*.35,y-sz*.15);doc.line(x+sz*.35,y-sz*.15,x+sz*.45,y);}
        else if(tipo==='saturno'){doc.line(x-sz*.25,y-sz*.5,x-sz*.25,y+sz*.4);doc.line(x-sz*.5,y-sz*.3,x,y-sz*.3);doc.line(x-sz*.25,y+sz*.4,x+sz*.1,y+sz*.55);doc.line(x+sz*.1,y+sz*.55,x+sz*.3,y+sz*.4);doc.line(x+sz*.3,y+sz*.4,x+sz*.3,y+sz*.1);}
        else if(tipo==='urano'){doc.line(x-sz*.35,y-sz*.5,x-sz*.35,y+sz*.15);doc.line(x+sz*.35,y-sz*.5,x+sz*.35,y+sz*.15);doc.line(x-sz*.35,y-sz*.15,x+sz*.35,y-sz*.15);doc.line(x,y+sz*.15,x,y+sz*.35);doc.circle(x,y+sz*.5,sz*.15);}
        else if(tipo==='neptuno'){doc.line(x-sz*.5,y-sz*.3,x-sz*.35,y+sz*.2);doc.line(x+sz*.5,y-sz*.3,x+sz*.35,y+sz*.2);doc.line(x,y-sz*.3,x,y+sz*.4);doc.line(x-sz*.5,y-sz*.3,x+sz*.5,y-sz*.3);doc.line(x-sz*.25,y+sz*.4,x+sz*.25,y+sz*.4);doc.line(x-sz*.5,y-sz*.3,x-sz*.3,y-sz*.55);doc.line(x-sz*.3,y-sz*.55,x+sz*.3,y-sz*.55);doc.line(x+sz*.3,y-sz*.55,x+sz*.5,y-sz*.3);}
        else if(tipo==='pluton'){doc.line(x-sz*.25,y-sz*.55,x-sz*.25,y+sz*.5);doc.line(x-sz*.25,y-sz*.55,x+sz*.15,y-sz*.55);doc.line(x+sz*.15,y-sz*.55,x+sz*.15,y-sz*.1);doc.line(x+sz*.15,y-sz*.1,x-sz*.25,y-sz*.1);doc.line(x-sz*.25,y+sz*.5,x+sz*.35,y+sz*.5);}
        else if(tipo==='quiron'){doc.circle(x,y+sz*.35,sz*.28);doc.line(x,y-sz*.6,x,y+sz*.07);doc.line(x,y-sz*.15,x+sz*.35,y-sz*.55);doc.line(x,y-sz*.15,x+sz*.35,y+sz*.15);}
        else if(tipo==='nodo'){doc.line(x-sz*.4,y+sz*.4,x-sz*.4,y-sz*.2);doc.line(x-sz*.4,y-sz*.2,x-sz*.15,y-sz*.45);doc.line(x-sz*.15,y-sz*.45,x+sz*.15,y-sz*.45);doc.line(x+sz*.15,y-sz*.45,x+sz*.4,y-sz*.2);doc.line(x+sz*.4,y-sz*.2,x+sz*.4,y+sz*.4);doc.line(x-sz*.4,y+sz*.4,x-sz*.55,y+sz*.5);doc.line(x+sz*.4,y+sz*.4,x+sz*.55,y+sz*.5);}
      }

      var planetDefs = [
        {raw:carta.solRaw,tipo:'sol'},{raw:carta.lunaRaw,tipo:'luna'},
        {raw:carta.mercRaw,tipo:'mercurio'},{raw:carta.venRaw,tipo:'venus'},
        {raw:carta.marRaw,tipo:'marte'},{raw:carta.jupRaw,tipo:'jupiter'},
        {raw:carta.satRaw,tipo:'saturno'},{raw:carta.uraRaw,tipo:'urano'},
        {raw:carta.nepRaw,tipo:'neptuno'},{raw:carta.plutRaw,tipo:'pluton'},
        {raw:carta.quirRaw,tipo:'quiron'},{raw:carta.nodeRaw,tipo:'nodo'}
      ];

      var active = planetDefs.filter(p => p.raw !== undefined && p.raw !== null);
      active.sort((a,b) => a.raw - b.raw);

      var rPlanet = (rCasa + rSigno) / 2 - 1;
      var minSep = 7;
      var pasoR = 4.5;

      // Distancia angular real sobre el circulo: 359 y 1 estan a 2 grados, no a 358.
      function sepAngular(a, b) {
        var d = Math.abs(a - b) % 360;
        return d > 180 ? 360 - d : d;
      }

      // Cada planeta se coloca en el primer anillo donde no quede a menos de
      // minSep de NINGUNO de los ya colocados en ese mismo anillo, comparando
      // contra todos y no solo contra el anterior de la lista.
      var anillos = [];
      for (var q = 0; q < active.length; q++) {
        var nivel = 0;
        for (;;) {
          var ocupantes = anillos[nivel] || [];
          var libre = true;
          for (var z = 0; z < ocupantes.length; z++) {
            if (sepAngular(active[q].raw, ocupantes[z].raw) < minSep) { libre = false; break; }
          }
          if (libre) break;
          nivel++;
        }
        if (!anillos[nivel]) anillos[nivel] = [];
        anillos[nivel].push(active[q]);
        active[q].r = rPlanet - nivel * pasoR;
      }

      var plSize = (rSigno - rCasa) * 0.38;
      for (var pp = 0; pp < active.length; pp++) {
        var pl = active[pp];
        var pa = lonToRad(pl.raw);
        var ppx2 = px(pl.r, pa), ppy2 = py(pl.r, pa);
        doc.setDrawColor(180,160,130); doc.setLineWidth(0.15);
        doc.line(px(rCasa,pa),py(rCasa,pa),ppx2,ppy2);
        dibujarPlaneta(pl.tipo, ppx2, ppy2, plSize);
        var grado = Math.floor(pl.raw % 30);
        doc.setFontSize(4.5); doc.setFont('Roboto','normal');
        doc.setTextColor(COL_GRIS[0],COL_GRIS[1],COL_GRIS[2]);
        var lblR = pl.r - plSize - 2;
        doc.text(grado+'°', cx+lblR*Math.cos(pa), cy+lblR*Math.sin(pa)+0.5, {align:'center'});
      }

      var aspDefs = [
        {deg:60,orb:6,color:[120,155,145],w:0.2},
        {deg:90,orb:8,color:[180,95,85],w:0.3},
        {deg:120,orb:8,color:[120,155,145],w:0.3},
        {deg:180,orb:10,color:[180,95,85],w:0.3}
      ];
      for (var ai3 = 0; ai3 < active.length; ai3++) {
        for (var aj = ai3+1; aj < active.length; aj++) {
          var diffAsp = Math.abs(active[ai3].raw - active[aj].raw) % 360;
          if (diffAsp > 180) diffAsp = 360 - diffAsp;
          for (var ak3 = 0; ak3 < aspDefs.length; ak3++) {
            if (Math.abs(diffAsp - aspDefs[ak3].deg) <= aspDefs[ak3].orb) {
              var col3 = aspDefs[ak3].color;
              doc.setDrawColor(col3[0],col3[1],col3[2]); doc.setLineWidth(aspDefs[ak3].w);
              doc.line(px(rInner,lonToRad(active[ai3].raw)),py(rInner,lonToRad(active[ai3].raw)),px(rInner,lonToRad(active[aj].raw)),py(rInner,lonToRad(active[aj].raw)));
              break;
            }
          }
        }
      }
    }

    // Casa Whole Sign de un planeta, a partir de su longitud cruda y del array "casas" que
    // calcular-carta.js ya calcula (cúspides whole-sign, en grados, indexadas 0=Casa1...11=Casa12)
    function casaDe(raw) {
      if (!carta.casas || raw === undefined || raw === null) return '-';
      var signStart = Math.floor((((raw % 360) + 360) % 360) / 30) * 30;
      var idx = carta.casas.indexOf(signStart);
      return idx >= 0 ? String(idx + 1) : '-';
    }

    // Formato grados/minutos + N/S, mismo estilo que ya usaba la tabla (p.ej. "3 45 N")
    function formatGradosNS(val) {
      if (val === undefined || val === null) return '-';
      var abs = Math.abs(val), deg = Math.floor(abs), min = Math.round((abs - deg) * 60);
      if (min === 60) { deg += 1; min = 0; }
      return deg + ' ' + min + ' ' + (val >= 0 ? 'N' : 'S');
    }

    function tablaPositions(sx, sy) {
      var cols = [sx, sx+30, sx+65, sx+80, sx+96];
      var rH = 5.5, y = sy;
      doc.setFillColor(14,63,75); doc.rect(sx,y,110,rH,'F');
      doc.setFont('Roboto','bold'); doc.setFontSize(7); doc.setTextColor(255,255,255);
      var heads = ['Planeta','Longitud','Casa','Latitud','Decl.'];
      for (var h2=0;h2<heads.length;h2++) doc.text(heads[h2],cols[h2]+1,y+3.8);
      y += rH;
      var rows = [
        ['Sol',carta.sol||'-',casaDe(carta.solRaw),formatGradosNS(carta.solLatDeg),formatGradosNS(carta.solDeclDeg)],
        ['Luna',carta.luna||'-',casaDe(carta.lunaRaw),formatGradosNS(carta.lunaLatDeg),formatGradosNS(carta.lunaDeclDeg)],
        ['Mercurio',(carta.mercurio||'-')+(carta.mercRetro?' R':''),casaDe(carta.mercRaw),formatGradosNS(carta.mercLatDeg),formatGradosNS(carta.mercDeclDeg)],
        ['Venus',(carta.venus||'-')+(carta.venRetro?' R':''),casaDe(carta.venRaw),formatGradosNS(carta.venLatDeg),formatGradosNS(carta.venDeclDeg)],
        ['Marte',(carta.marte||'-')+(carta.marRetro?' R':''),casaDe(carta.marRaw),formatGradosNS(carta.marLatDeg),formatGradosNS(carta.marDeclDeg)],
        ['Júpiter',(carta.jupiter||'-')+(carta.jupRetro?' R':''),casaDe(carta.jupRaw),formatGradosNS(carta.jupLatDeg),formatGradosNS(carta.jupDeclDeg)],
        ['Saturno',(carta.saturno||'-')+(carta.satRetro?' R':''),casaDe(carta.satRaw),formatGradosNS(carta.satLatDeg),formatGradosNS(carta.satDeclDeg)],
        ['Urano',(carta.urano||'-')+(carta.uraRetro?' R':''),casaDe(carta.uraRaw),formatGradosNS(carta.uraLatDeg),formatGradosNS(carta.uraDeclDeg)],
        ['Neptuno',(carta.neptuno||'-')+(carta.nepRetro?' R':''),casaDe(carta.nepRaw),formatGradosNS(carta.nepLatDeg),formatGradosNS(carta.nepDeclDeg)],
        ['Plutón',(carta.pluton||'-')+(carta.plutRetro?' R':''),casaDe(carta.plutRaw),formatGradosNS(carta.plutLatDeg),formatGradosNS(carta.plutDeclDeg)],
        ['Quirón',(carta.quiron||'-')+(carta.quirRetro?' R':''),casaDe(carta.quirRaw),formatGradosNS(carta.quirLatDeg),formatGradosNS(carta.quirDeclDeg)],
        ['Ascendente',carta.ascendente||'-','-','-','-'],
      ];
      for (var r3=0;r3<rows.length;r3++) {
        var fill = r3%2===0?[252,249,240]:[255,255,255];
        doc.setFillColor(fill[0],fill[1],fill[2]); doc.rect(sx,y,110,rH,'F');
        doc.setFont('Roboto',r3===11?'bold':'normal'); doc.setFontSize(7);
        doc.setTextColor(r3===11?14:40,r3===11?63:40,r3===11?75:40);
        for (var c3=0;c3<rows[r3].length;c3++) doc.text(fx(String(rows[r3][c3])),cols[c3]+1,y+3.8);
        doc.setDrawColor(220,210,190); doc.setLineWidth(0.1); doc.line(sx,y+rH,sx+110,y+rH);
        y += rH;
      }
      return y;
    }

    // ── PAG 1 PORTADA ────────────────────────────────────────────────────────
    doc.addImage(img_portada,'JPEG',0,0,W,H);
    doc.setFont('Roboto','bold'); doc.setFontSize(16); doc.setTextColor(14,63,75);
    doc.text(fx(nombre.toUpperCase()),W/2,250,{align:'center'});
    doc.setFont('Roboto','normal'); doc.setFontSize(11); doc.setTextColor(14,63,75);
    doc.text(fx(fechaNice+' a las '+hora),W/2,260,{align:'center'});
    var lugarFmt = lugar.split(',').map(p=>p.trim().charAt(0).toUpperCase()+p.trim().slice(1).toLowerCase()).join(', ');
    doc.text(fx(lugarFmt),W/2,270,{align:'center'});

    // ── PAG 2 INDICE ─────────────────────────────────────────────────────────
    doc.addPage(); doc.addImage(img_indice,'JPEG',0,0,W,H); addPageNum(2);

    // ── PAG 3 BIENVENIDO ─────────────────────────────────────────────────────
    doc.addPage(); doc.addImage(img_bienvenido,'JPEG',0,0,W,H); addPageNum(3);

    // ── PAG 4 CONFIGURACION INICIAL ──────────────────────────────────────────
    doc.addPage(); doc.addImage(img_rueda,'JPEG',0,0,W,H);
    // La rueda se colocaba a partir de cy4, que salia de medir palabra por palabra
    // unos parrafos que ya no se dibujan: su texto esta incluido en la imagen de
    // fondo 4-rueda-pdf.jpg desde el commit 81ad818. Se conserva el valor exacto
    // que producia aquel calculo, 151.5 mm, para que la rueda no se mueva.
    var cy4 = 151.5;
    var cartaR=48, cartaCX=W/2, cartaCY=cy4+cartaR+5;
    dibujarCarta(cartaCX,cartaCY,cartaR);
    var textoY=cartaCY+cartaR+15;
    doc.setFont('Roboto','bold'); doc.setFontSize(8); doc.setTextColor(14,63,75);
    doc.text(fx('Sol: '+(carta.sol||'-')+'   Luna: '+(carta.luna||'-')+'   Ascendente: '+(carta.ascendente||'-')),W/2,textoY,{align:'center'});
    textoY+=5;
    function formatCoord(val,posChar,negChar){var abs=Math.abs(val),deg=Math.floor(abs),min=Math.round((abs-deg)*60);if(min===60){deg+=1;min=0;}var dir=val>=0?posChar:negChar;return deg+dir+(min<10?'0'+min:min);}
    function formatSidereal(lstDeg){var hours=lstDeg/15;if(hours<0)hours+=24;var h=Math.floor(hours),m=Math.floor((hours-h)*60),s=Math.round(((hours-h)*60-m)*60);if(s===60){s=0;m+=1;}if(m===60){m=0;h+=1;}return h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s;}
    function formatUT(h,m){var hh=((h%24)+24)%24;return(hh<10?'0':'')+hh+':'+(m<10?'0':'')+m;}
    doc.text(fx('Lat: '+formatCoord(carta.lat,'n','s')+'  ·  Lon: '+formatCoord(carta.lon,'e','w')+'  ·  UT: '+formatUT(carta.utH,carta.utM)+'  ·  T. Sidéreo: '+formatSidereal(carta.LST)+'  ·  JD: '+carta.JD.toFixed(2)),W/2,textoY,{align:'center'});
    textoY+=7;
    doc.setFont('Roboto','italic'); doc.setFontSize(8); doc.setTextColor(100,100,100);
    var captLines=doc.splitTextToSize(fx('Representación visual de tu programación inicial: el mapa del instante en que comenzó tu historia.'),155);
    for(var cl2=0;cl2<captLines.length;cl2++) doc.text(fx(captLines[cl2]),W/2,textoY+cl2*4.5,{align:'center'});
    addPageNum(4);

    // ── PAG 5 POSICIONES ─────────────────────────────────────────────────────
    doc.addPage(); doc.addImage(img_base,'JPEG',0,0,W,H);
    doc.setFont('Roboto','bold'); doc.setFontSize(11); doc.setTextColor(207,177,128);
    doc.text(fx('POSICIONES: Configuración funcional de tu programación inicial'),18,30);
    var py5=45; py5=tablaPositions(18,py5); py5+=5;
    doc.setFont('Roboto','italic'); doc.setFontSize(9); doc.setTextColor(60,60,60);
    py5=wrapText(fx('Las posiciones reflejan cómo funciona tu forma de pensar, sentir y actuar, y qué partes de ti tienen más peso en la manera en que percibes y respondes a la vida.'),18,py5,175,5.5);
    py5+=8;
    doc.setFont('Roboto','bold'); doc.setFontSize(11); doc.setTextColor(207,177,128);
    doc.text(fx('ASPECTOS: Dinámicas internas de tu programación inicial'),18,py5);
    py5+=15;
    var aspTipos=['sol','luna','mercurio','venus','marte','jupiter','saturno','urano','neptuno','pluton','quiron','asc'];
    var aspRaws=[carta.solRaw,carta.lunaRaw,carta.mercRaw,carta.venRaw,carta.marRaw,carta.jupRaw,carta.satRaw,carta.uraRaw,carta.nepRaw,carta.plutRaw,carta.quirRaw,carta.ascRaw];
    var aspDefs2=[{deg:0,orb:8,symbol:'=',color:[120,120,120]},{deg:60,orb:6,symbol:'S',color:[90,140,120]},{deg:90,orb:8,symbol:'C',color:[180,95,85]},{deg:120,orb:8,symbol:'T',color:[90,140,120]},{deg:180,orb:10,symbol:'O',color:[180,95,85]}];
    function dibujarMini(tipo,cx2,cy2,sz){
      doc.setDrawColor(14,63,75); doc.setLineWidth(0.3);
      var x=cx2,y=cy2;
      if(tipo==='sol'){doc.circle(x,y,sz*.55);doc.setFillColor(14,63,75);doc.circle(x,y,sz*.12,'F');}
      else if(tipo==='luna'){doc.setFillColor(14,63,75);doc.circle(x-sz*.1,y,sz*.55,'F');doc.setFillColor(255,251,239);doc.circle(x+sz*.15,y,sz*.5,'F');}
      else if(tipo==='mercurio'){doc.line(x-sz*.3,y-sz*.7,x-sz*.15,y-sz*.5);doc.line(x+sz*.3,y-sz*.7,x+sz*.15,y-sz*.5);doc.circle(x,y-sz*.05,sz*.3);doc.line(x,y+sz*.25,x,y+sz*.7);doc.line(x-sz*.25,y+sz*.5,x+sz*.25,y+sz*.5);}
      else if(tipo==='venus'){doc.circle(x,y-sz*.2,sz*.35);doc.line(x,y+sz*.15,x,y+sz*.7);doc.line(x-sz*.25,y+sz*.45,x+sz*.25,y+sz*.45);}
      else if(tipo==='marte'){doc.circle(x-sz*.1,y+sz*.15,sz*.35);doc.line(x+sz*.15,y-sz*.1,x+sz*.5,y-sz*.45);doc.line(x+sz*.5,y-sz*.45,x+sz*.25,y-sz*.45);doc.line(x+sz*.5,y-sz*.45,x+sz*.5,y-sz*.2);}
      else if(tipo==='jupiter'){doc.line(x-sz*.5,y-sz*.15,x+sz*.1,y-sz*.15);doc.line(x-sz*.25,y-sz*.4,x-sz*.25,y+sz*.55);doc.line(x+sz*.1,y-sz*.15,x+sz*.35,y-sz*.4);doc.line(x+sz*.35,y-sz*.4,x+sz*.35,y-sz*.15);doc.line(x+sz*.35,y-sz*.15,x+sz*.45,y);}
      else if(tipo==='saturno'){doc.line(x-sz*.25,y-sz*.5,x-sz*.25,y+sz*.4);doc.line(x-sz*.5,y-sz*.3,x,y-sz*.3);doc.line(x-sz*.25,y+sz*.4,x+sz*.1,y+sz*.55);doc.line(x+sz*.1,y+sz*.55,x+sz*.3,y+sz*.4);doc.line(x+sz*.3,y+sz*.4,x+sz*.3,y+sz*.1);}
      else if(tipo==='urano'){doc.line(x-sz*.35,y-sz*.5,x-sz*.35,y+sz*.15);doc.line(x+sz*.35,y-sz*.5,x+sz*.35,y+sz*.15);doc.line(x-sz*.35,y-sz*.15,x+sz*.35,y-sz*.15);doc.line(x,y+sz*.15,x,y+sz*.35);doc.circle(x,y+sz*.5,sz*.15);}
      else if(tipo==='neptuno'){doc.line(x-sz*.5,y-sz*.3,x-sz*.35,y+sz*.2);doc.line(x+sz*.5,y-sz*.3,x+sz*.35,y+sz*.2);doc.line(x,y-sz*.3,x,y+sz*.4);doc.line(x-sz*.5,y-sz*.3,x+sz*.5,y-sz*.3);doc.line(x-sz*.25,y+sz*.4,x+sz*.25,y+sz*.4);doc.line(x-sz*.5,y-sz*.3,x-sz*.3,y-sz*.55);doc.line(x-sz*.3,y-sz*.55,x+sz*.3,y-sz*.55);doc.line(x+sz*.3,y-sz*.55,x+sz*.5,y-sz*.3);}
      else if(tipo==='pluton'){doc.line(x-sz*.25,y-sz*.55,x-sz*.25,y+sz*.5);doc.line(x-sz*.25,y-sz*.55,x+sz*.15,y-sz*.55);doc.line(x+sz*.15,y-sz*.55,x+sz*.15,y-sz*.1);doc.line(x+sz*.15,y-sz*.1,x-sz*.25,y-sz*.1);doc.line(x-sz*.25,y+sz*.5,x+sz*.35,y+sz*.5);}
      else if(tipo==='quiron'){doc.circle(x,y+sz*.35,sz*.28);doc.line(x,y-sz*.6,x,y+sz*.07);doc.line(x,y-sz*.15,x+sz*.35,y-sz*.55);doc.line(x,y-sz*.15,x+sz*.35,y+sz*.15);}
      else if(tipo==='asc'){doc.line(x-sz*.6,y,x+sz*.4,y);doc.line(x+sz*.4,y,x+sz*.2,y-sz*.25);doc.line(x+sz*.4,y,x+sz*.2,y+sz*.25);}
    }
    var cellS=100/aspTipos.length,aspX=30,aspY=py5,miniSz=2.2;   // el total sigue midiendo 100 mm
    var nAsp=aspTipos.length;
    for(var ai4=0;ai4<aspTipos.length;ai4++) dibujarMini(aspTipos[ai4],aspX+ai4*cellS+cellS/2,aspY-3,miniSz);
    for(var row=0;row<nAsp;row++){
      dibujarMini(aspTipos[row],aspX-4,aspY+row*cellS+cellS/2,miniSz);
      for(var col=0;col<=row;col++){
        var cx3=aspX+col*cellS,cy3=aspY+row*cellS;
        doc.setDrawColor(210,195,165); doc.setLineWidth(0.15); doc.rect(cx3,cy3,cellS,cellS);
        if(col<row){
          var diffA=Math.abs(aspRaws[row]-aspRaws[col])%360;
          if(diffA>180) diffA=360-diffA;
          for(var ak4=0;ak4<aspDefs2.length;ak4++){
            if(Math.abs(diffA-aspDefs2[ak4].deg)<=aspDefs2[ak4].orb){
              var col4=aspDefs2[ak4].color;
              doc.setFont('Roboto','bold'); doc.setFontSize(8);
              doc.setTextColor(col4[0],col4[1],col4[2]);
              doc.text(aspDefs2[ak4].symbol,cx3+cellS/2,cy3+cellS/2+1.5,{align:'center'});
              doc.setFontSize(6.5); break;
            }
          }
        } else {
          doc.setFillColor(245,238,225); doc.rect(cx3,cy3,cellS,cellS,'F');
          doc.setDrawColor(210,195,165); doc.rect(cx3,cy3,cellS,cellS);
        }
      }
    }
    py5=aspY+nAsp*cellS+6;
    doc.setFont('Roboto','normal'); doc.setFontSize(7); doc.setTextColor(100,100,100);
    doc.text('T = Trígono   C = Cuadratura   S = Sextil   O = Oposición   = = Conjunción',W/2,py5,{align:'center'});
    py5+=6;
    doc.setFont('Roboto','italic'); doc.setFontSize(9); doc.setTextColor(60,60,60);
    wrapText(fx('Los aspectos muestran cómo se relacionan esas partes entre sí: los equilibrios, las tensiones y las conexiones que forman tu manera de vincularte, decidir y reaccionar.'),18,py5,175,5.5);
    addPageNum(5);

    // Estado de la maquetacion: en que altura vamos y por que pagina
    var Y_TOPE = H - 21;
    var maq = { y: 60, pag: 6, paginas: 1 };

    // ── PAGS 6-19 LAS 7 AREAS ────────────────────────────────────────────────
    var areaTitles=[
      {tit:fx('IDENTIDAD'),sub:fx('Por que eres como eres y por que tu vida es como es')},
      {tit:fx('PATRONES'),sub:fx('Por que siempre te pasa lo mismo y que repites sin poder parar')},
      {tit:fx('MIEDOS'),sub:fx('Lo que gobierna tu vida sin que lo sepas')},
      {tit:fx('HERIDA'),sub:fx('Lo que hoy sigue bloqueando tu vida en silencio')},
      {tit:fx('AMOR'),sub:fx('Por que amas como amas y por que atraes a quien atraes')},
      {tit:fx('RELACIONES'),sub:fx('Como te vinculas con los demas y que rol ocupas sin darte cuenta')},
      {tit:fx('DINERO'),sub:fx('Por que el dinero no termina de fluir en tu vida')},
    ];
    // ── ESTILOS DE CADA BLOQUE ───────────────────────────────────────────────
    // Un area son 900 palabras. Puestas todas seguidas en el mismo cuerpo y el
    // mismo color, el cliente ve cuatro paginas de muro gris y el ojo se cansa
    // antes de llegar a lo que ha pagado. Cada bloque se pinta distinto para
    // que la pagina respire y para que lo importante se vea desde lejos.
    // Los colores son los de la marca: dorado cfb180 y verde oscuro 0e3f4b.
    // El dorado va en un solo tono en todo el estudio, el cfb180. El otro
    // dorado de la marca, el bd9048, se saco de aqui: en texto pequeno y en
    // los filetes tiraba a mostaza y desentonaba con el dorado de las
    // portadas y de los ladillos impresos en las paginas.
    // Las preguntas y los remates son la misma familia
    // (frases sueltas que se destacan) y por eso van del mismo color y las dos
    // centradas: dos verdes distintos en la misma pagina se leen como un
    // descuido. El verde oscuro da 11 a 1 de contraste sobre el crema, asi que
    // se lee perfecto tambien impreso.
    // Lo que separa el filete del cierre de su primera linea. Se usa al
    // dibujarlo y al centrar el bloque: si fueran dos numeros escritos a mano,
    // cambiar uno y no el otro descentraria el cierre sin que se notara.
    var FILETE_SOBRE_EL_CIERRE = 16;

    var ESTILOS = {
      texto:    { size: 12,   color: [40, 40, 40],   x: 18, ancho: 175, alto: 7,   antes: 0,  despues: 4,  fuente: 'normal' },
      sub:      { size: 12,   color: [207, 177, 128], x: 18, ancho: 175, alto: 6,   antes: 11, despues: 6,  fuente: 'bold',   mayus: true, filete: true, juntar: true },
      escena:   { size: 12,   color: [70, 70, 70],   x: 27, ancho: 157, alto: 7,   antes: 8,  despues: 9,  fuente: 'italic', barra: true },
      pregunta: { size: 13,   color: [14, 63, 75],  x: 30, ancho: 150, alto: 7.4, antes: 10, despues: 10, fuente: 'bold', centrado: true, juntar: true },
      remate:   { size: 13.5, color: [14, 63, 75],  x: 30, ancho: 150, alto: 7.8, antes: 10, despues: 10, fuente: 'bold', centrado: true, juntar: true },
      // EL CIERRE VA EN ITALIANNO, la caligrafica, y por eso lleva su propia
      // linea aparte de las demas.
      //
      // Los numeros no estan puestos a ojo, salen de medir las dos fuentes:
      //  - 30 puntos, porque la x de Italianno mide 0,273 em y la de Roboto
      //    negrita 0,528: casi el doble. A 30 los cierres de verdad ocupan las
      //    mismas lineas que ocupaban a 16,5 con Roboto.
      //  - 13 mm de interlineado, porque de las letras que salen de verdad la
      //    que mas sube es la "Á" (0,73 em) y la que mas baja la "g" (-0,35),
      //    o sea 11,4 mm a este tamaño: por debajo de eso dos lineas se tocan.
      //
      // Y si el fichero de la fuente no llegara, el cierre se pinta EXACTAMENTE
      // como estaba antes. Un cierre a 30 puntos en Roboto seria un cartel.
      // "baja" es lo que la ultima linea cae por debajo de su raya: la letra
      // que mas baja de las que salen de verdad. Hace falta para centrar el
      // cierre en la pagina sin que quede alto: si no se contara, el hueco de
      // abajo seria mayor que el de arriba por esos milimetros.
      cierre: hayItalianno
        ? { size: 30,   color: [207, 177, 128], x: 18, ancho: 152, alto: 13,  despues: 8, baja: 3.7, fuente: 'bold', familia: 'Italianno', centrado: true, juntar: true }
        : { size: 16.5, color: [207, 177, 128], x: 18, ancho: 152, alto: 9.5, despues: 8, baja: 1.2, fuente: 'bold', centrado: true, juntar: true },
    };

    function paginaNueva() {
      addPageNum(maq.pag); maq.pag++;
      maq.paginas++;
      doc.addPage(); doc.addImage(img_base, 'JPEG', 0, 0, W, H);
      maq.y = 60;
    }

    // Un parrafo largo se parte en trozos para que el corte de pagina caiga en
    // un sitio decente. Solo se parte el texto corrido: los bloques marcados
    // van enteros, que para eso estan marcados.
    function trocearLargos(bloques) {
      var salida = [];
      for (var i = 0; i < bloques.length; i++) {
        var b = bloques[i];
        if (b.tipo !== 'texto' || b.t.length <= 500) { salida.push(b); continue; }
        var frases = b.t.split(/(?<=\.)\s+/);
        var trozos = [], grupo = '', nFrases = 0;
        for (var f = 0; f < frases.length; f++) {
          grupo += (grupo ? ' ' : '') + frases[f]; nFrases++;
          if (nFrases >= 3 && grupo.length > 200) { trozos.push(grupo); grupo = ''; nFrases = 0; }
        }
        if (grupo.length > 0) trozos.push(grupo);
        // Si el modelo dejo una marca de negrita sin cerrar, no se cuadra nada:
        // el asterisco suelto se limpia al maquetar, igual que hasta ahora.
        if ((((b.t.match(/\*\*/g) || []).length) % 2) === 0) trozos = cuadrarNegritas(trozos);
        for (var t = 0; t < trozos.length; t++) salida.push({ tipo: 'texto', t: trozos[t] });
      }
      return salida;
    }

    // Ni una linea suelta al final de una pagina, ni una sola arrastrada al
    // principio de la siguiente: las dos cosas se leen como un error de
    // imprenta. Devuelve por que linea hay que cambiar de pagina, o -1 si el
    // bloque cabe entero. Si no queda sitio ni para partirlo bien, baja el
    // bloque entero a la pagina siguiente.
    function corteSinLineasSueltas(lineas, e) {
      for (var vuelta = 0; vuelta < 2; vuelta++) {
        var caben = Math.floor((Y_TOPE - maq.y) / e.alto) + 1;
        if (caben >= lineas.length) return -1;
        if (caben >= 2 && lineas.length - caben >= 2) return caben;
        if (caben >= 3 && lineas.length - caben === 1) return caben - 1;
        paginaNueva();
      }
      return -1;
    }

    function pintarBloque(bloque, siguiente) {
      var e = ESTILOS[bloque.tipo] || ESTILOS.texto;
      var texto = e.mayus ? bloque.t.toUpperCase() : bloque.t;
      var lineas = lineasConNegrita(fx(texto), e.ancho, e.size, e.fuente, e.familia);
      if (lineas.length === 0) return;

      var altoBloque = lineas.length * e.alto + (e.filete ? 2.5 : 0);

      // ── EL CIERRE VA SOLO EN SU PAGINA, Y CENTRADO ─────────────────
      //
      // Es la ultima frase del area, la que el lector se lleva puesta. Antes
      // se quedaba donde cayera y solo pasaba de pagina si no cabia con aire.
      //
      // El filete y la frase se centran JUNTOS, como un solo bloque: la parte
      // de arriba del bloque es el filete, no la primera linea, y la de abajo
      // es lo que baja la ultima letra. Centrando solo las lineas, el filete
      // quedaria fuera de la cuenta y el conjunto se leeria bajo.
      if (bloque.tipo === 'cierre') {
        paginaNueva();
        var altoConFilete = FILETE_SOBRE_EL_CIERRE
          + (lineas.length - 1) * e.alto
          + (e.baja || 0);
        var arriba = (H - altoConFilete) / 2;
        // Centrar un bloque mas alto que la pagina lo empujaria hacia arriba
        // hasta sacarlo del papel. Con un cierre normal no llega a pasar,
        // pero si alguna vez llegara uno larguisimo es preferible que baje
        // entero y se parta por donde se parte cualquier otro bloque, a que
        // el filete acabe fuera de la hoja. El aire minimo de arriba es el
        // mismo que la pagina ya deja por abajo, para no inventar otro.
        var AIRE_MINIMO = H - Y_TOPE;
        if (arriba < AIRE_MINIMO) arriba = AIRE_MINIMO;
        maq.y = arriba + FILETE_SOBRE_EL_CIERRE;
      } else {
        if (maq.y > 60) maq.y += e.antes;
        // Un subtitulo, una pregunta o un remate colgando en la ultima linea de
        // la pagina se leen como un descuido: bajan enteros a la siguiente.
        // Y un subtitulo no se queda nunca solo al pie de la pagina: se le
        // exige sitio para el y para las dos primeras lineas de lo que va
        // debajo, que es de lo que es el titulo.
        var reserva = 0;
        if (bloque.tipo === 'sub' && siguiente) {
          var eSig = ESTILOS[siguiente.tipo] || ESTILOS.texto;
          reserva = e.despues + eSig.antes + 2 * eSig.alto;
        }
        if (e.juntar && lineas.length <= 5 && maq.y + altoBloque + reserva > Y_TOPE) paginaNueva();
      }

      // El cierre lleva un filete corto encima, centrado: separa el golpe del
      // texto que venia antes y avisa de que el area se acaba aqui. Va a
      // FILETE_SOBRE_EL_CIERRE de la primera linea, porque las mayusculas del
      // dorado suben desde ahi y con menos se lee pegado a ellas.
      if (bloque.tipo === 'cierre') {
        doc.setDrawColor(207, 177, 128); doc.setLineWidth(0.4);
        doc.line(105 - 16, maq.y - FILETE_SOBRE_EL_CIERRE, 105 + 16, maq.y - FILETE_SOBRE_EL_CIERRE);
      }

      var corte = corteSinLineasSueltas(lineas, e);

      doc.setFontSize(e.size);
      doc.setTextColor(e.color[0], e.color[1], e.color[2]);

      for (var li = 0; li < lineas.length; li++) {
        if ((corte >= 0 && li === corte) || maq.y > Y_TOPE) {
          paginaNueva();
          doc.setFontSize(e.size);
          doc.setTextColor(e.color[0], e.color[1], e.color[2]);
        }
        var linea = lineas[li];
        var cx = e.centrado ? (105 - anchoLinea(linea, e.size, e.fuente, e.familia) / 2) : e.x;
        // La escena lleva un filete dorado a la izquierda, dibujado linea a
        // linea para que siga a la escena si cambia de pagina. Va en el dorado
        // claro de la marca, el mismo del cierre: en el dorado fuerte, una
        // barra maciza de casi un milimetro tira a mostaza.
        if (e.barra) {
          doc.setDrawColor(207, 177, 128); doc.setLineWidth(0.8);
          // El trozo mide exactamente lo que separa una linea de la siguiente,
          // sacado de e.alto: puesto a mano, al cambiar el cuerpo de la escena
          // la barra se quedaba a trozos con un hueco entre linea y linea.
          doc.line(e.x - 7, maq.y - (e.alto - 1.8), e.x - 7, maq.y + 1.8);
        }
        for (var wi = 0; wi < linea.length; wi++) {
          if (!linea[wi].esp) {
            var f = comoSePinta(e.fuente, e.familia, linea[wi].b);
            doc.setFont(f[0], f[1]);
            doc.text(linea[wi].t, cx, maq.y);
          }
          cx += anchoPalabra(linea[wi], e.size, e.fuente, e.familia);
        }
        maq.y += e.alto;
      }

      if (e.filete) {
        doc.setDrawColor(207, 177, 128); doc.setLineWidth(0.4);
        doc.line(e.x, maq.y - 3.2, e.x + 24, maq.y - 3.2);
        maq.y += 1;
      }
      maq.y += e.despues;
    }

    for(var ai2=0;ai2<areaTitles.length;ai2++){
      // El texto del area llega marcado por bloques (subtitulos, escena,
      // remates, pregunta) y chat.js no lo entrega si le falta alguno, asi que
      // aqui solo hay que pintarlos. Un area sin marcas se pintaria como el
      // muro de texto de antes, pero no llega ninguna: se vuelve a pedir.
      var bloques = trocearLargos(analizarArea(areas[ai2] || ''));
      doc.addPage(); doc.addImage(img_areas[ai2],'JPEG',0,0,W,H);
      maq.y = 60; maq.paginas = 1;
      for (var bi = 0; bi < bloques.length; bi++) pintarBloque(bloques[bi], bloques[bi + 1]);
      if(maq.paginas<2){addPageNum(maq.pag);maq.pag++;doc.addPage();doc.addImage(img_base,'JPEG',0,0,W,H);}
      addPageNum(maq.pag); maq.pag++;
    }

    // ── LA PÁGINA DE LA FRASE ────────────────────────────────────────────────
    //
    // Cierra las siete areas, asi que va pegada al final del area 7 y no
    // detras de las listas: es el punto y final del texto, y las listas son
    // lo que viene despues.
    doc.addPage(); doc.addImage(img_frase,'JPEG',0,0,W,H); addPageNum(maq.pag); maq.pag++;

    // ── LAS DOS LISTAS DE RASGOS ─────────────────────────────────────────────
    //
    // Van detras de las siete areas y de su pagina de cierre. Puestas antes de
    // las areas, que es donde estaban, el cliente se encontraba treinta fichas
    // sueltas sobre si mismo sin haber leido una sola linea que las explicara.
    //
    // LO QUE LLEGA AQUI VIENE DEL NAVEGADOR, ASI QUE SE MIRA ANTES DE PINTARLO.
    //
    // Una sola entrada que no fuera una ficha (un null, un numero suelto) hacia
    // saltar la generacion entera al leerle el nombre: HTTP 500 y el cliente sin
    // el informe que ya ha pagado, por una lista que es un extra. Aqui se coge
    // solo lo que es una ficha de verdad y lo demas se cae solo.
    function fichasDe(lista) {
      return (Array.isArray(lista) ? lista : []).filter(function (r) {
        return r && typeof r === 'object' && String(r.nombre || '').trim();
      });
    }
    var lasFortalezas = fichasDe(rasgos && rasgos.fortalezas);
    var losDesafios = fichasDe(rasgos && rasgos.desafios);

    // Con las dos vacias no se abre ni una pagina: si se abriera el bloque y
    // luego no se pintara nada, el numero de pagina de abajo se estamparia dos
    // veces en la ultima del area 7 y todo lo que viene detras iria corrido.
    if (lasFortalezas.length > 0 || losDesafios.length > 0) {
      // La misma altura a la que arranca el texto de las areas (ver maq.y en
      // paginaNueva y al abrir cada area). Empezaba en 45 y se leia mas alto
      // que el resto del libro, con la primera linea pegada al borde de arriba.
      var ARRIBA_DEL_TODO = 60;
      var pyRasgos = ARRIBA_DEL_TODO;

      // Abrir pagina nueva de la lista, con su fondo y su numero.
      function paginaDeRasgos(primera) {
        if (!primera) { addPageNum(maq.pag); maq.pag++; }
        doc.addPage();
        doc.addImage(img_base, 'JPEG', 0, 0, W, H);
        pyRasgos = ARRIBA_DEL_TODO;
      }

      // Antes de pintar algo, mirar si cabe. Antes esto estaba escrito tres
      // veces dentro del bucle, una por cada trozo de la ficha, y era donde
      // habia que acordarse de tocar las tres si se cambiaba una.
      function cabe(alto) {
        if (pyRasgos + alto > Y_TOPE) paginaDeRasgos(false);
      }

      // LAS DOS LISTAS VAN SEPARADAS Y CADA UNA EN SU PAGINA.
      //
      // Antes se pegaba una detras de otra sin nada en medio, y con un solo
      // titulo, RASGOS, encima de las dos: las treinta fichas se leian como
      // una sola lista y no habia manera de ver donde acababa lo bueno y
      // empezaba lo que pesa. Ahora cada lista empieza pagina y lleva su
      // nombre en ese mismo titulo, en el mismo sitio y del mismo dorado.
      var LAS_DOS_LISTAS = [
        { titulo: fx('TUS FORTALEZAS'), rasgos: lasFortalezas },
        { titulo: fx('TUS DESAFÍOS'), rasgos: losDesafios },
      ];

      // Lo que ocupa el titulo de una lista con su rayita.
      var LO_QUE_OCUPA_UN_TITULO = 13 + 3.2 + 9.8;

      // Y lo que ocupa una ficha entera. Se mide de verdad, no a ojo: la
      // altura depende de en cuantas lineas caiga cada trozo, y de si la
      // etiqueta del area cabe detras del porque o tiene que bajar sola.
      //
      // Hace falta saberlo en DOS sitios: antes de pintar la ficha, para no
      // partirla entre dos paginas, y antes de abrir la segunda lista, para no
      // dejar su titulo solo al pie. Con un numero fijo para lo segundo (60 mm)
      // quedaba una ventana de 9,5 mm en la que el titulo se escribia y la
      // primera ficha se iba a la pagina siguiente.
      function loQueOcupaLaFicha(rasgo) {
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(12);
        var lineasD = doc.splitTextToSize(rasgo.descripcion || '', 170).length;
        doc.setFont('Roboto', 'italic');
        doc.setFontSize(11);
        var lineasP = doc.splitTextToSize(rasgo.explicacion || '', 170);
        var ultimaP = lineasP.length > 0 ? lineasP[lineasP.length - 1] : '';
        var acaba = 22 + doc.getTextWidth(ultimaP);
        doc.setFont('Roboto', 'bold');
        var etiquetaDetras = lineasP.length > 0
          && (acaba + doc.getTextWidth(' — ' + areaTitles[0].tit)) <= 192;
        return 6.5 + lineasD * 6.5 + lineasP.length * 6 + (etiquetaDetras ? 0 : 6);
      }

      var primeraLista = true;
      for (var li = 0; li < LAS_DOS_LISTAS.length; li++) {
        var laLista = LAS_DOS_LISTAS[li];
        if (laLista.rasgos.length === 0) continue;

        // La primera abre pagina. La segunda NO: sigue donde acabo la primera,
        // dejando aire. Una pagina nueva por lista dejaba media pagina en
        // blanco en medio del informe.
        if (primeraLista) {
          paginaDeRasgos(true);
          primeraLista = false;
        } else {
          pyRasgos += 16;
          cabe(LO_QUE_OCUPA_UN_TITULO + loQueOcupaLaFicha(laLista.rasgos[0]));
        }

        doc.setFont('Roboto', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(207, 177, 128);
        doc.text(laLista.titulo, 18, pyRasgos);
        // La misma rayita dorada que llevan los ladillos de las areas: 24 mm,
        // a 3,2 mm por debajo y del mismo grosor. Ver ESTILOS.sub y su filete.
        pyRasgos += 3.2;
        doc.setDrawColor(207, 177, 128);
        doc.setLineWidth(0.4);
        doc.line(18, pyRasgos, 42, pyRasgos);
        pyRasgos += 9.8;

        for (var ri = 0; ri < laLista.rasgos.length; ri++) {
          var rasgo = laLista.rasgos[ri];
          // CADA TROZO SE MIDE CON SU PROPIA LETRA.
          //
          // splitTextToSize parte el texto con el tamaño que este puesto en
          // ese momento, no con el que se va a pintar. Aqui se median los dos
          // con la letra que hubiera quedado de la ficha anterior, asi que las
          // lineas salian calculadas para un tamaño y escritas en otro: con
          // letra pequeña colaba de milagro, y a 12 se sale del margen.
          doc.setFont('Roboto', 'normal');
          doc.setFontSize(12);
          var dl = doc.splitTextToSize(rasgo.descripcion || '', 170);
          doc.setFont('Roboto', 'italic');
          doc.setFontSize(11);
          var el = doc.splitTextToSize(rasgo.explicacion || '', 170);

          // A QUE AREA PERTENECE, que es lo que ata la ficha al informe: sin
          // esto son treinta frases sueltas sobre ella; con esto, cada una
          // remite a las paginas donde eso se le ha contado entero. Va pegada
          // al final del porque, en dorado, como " — AMOR".
          var cual = Number(rasgo.area);
          var elArea = areaTitles[(cual >= 1 && cual <= 7 ? cual : 1) - 1];
          var laEtiqueta = ' — ' + elArea.tit;

          // Y hay que saber ANTES de pintar si le va a caber detras de la
          // ultima linea, porque de eso depende lo que ocupa la ficha entera.
          doc.setFont('Roboto', 'italic');
          doc.setFontSize(11);
          var ultima = el.length > 0 ? el[el.length - 1] : '';
          var acabaEn = 22 + doc.getTextWidth(ultima);
          doc.setFont('Roboto', 'bold');
          var cabeDetras = el.length > 0 && (acabaEn + doc.getTextWidth(laEtiqueta)) <= 192;

          // La ficha entera va junta: el nombre de una y la explicacion de
          // otra en paginas distintas se lee como un error de imprenta.
          //
          // La cuenta la hace loQueOcupaLaFicha y no se repite aqui: escrita
          // en los dos sitios, el dia que cambie el alto de una linea habria
          // que acordarse de los dos, y el que se quedara viejo no se notaria
          // hasta ver un PDF con una ficha partida.
          cabe(loQueOcupaLaFicha(rasgo));

          doc.setFont('Roboto', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(14, 63, 75);
          doc.text('• ' + (rasgo.nombre || ''), 18, pyRasgos);
          pyRasgos += 6.5;

          doc.setFont('Roboto', 'normal');
          doc.setFontSize(12);
          doc.setTextColor(60, 60, 60);
          for (var dli = 0; dli < dl.length; dli++) { doc.text(dl[dli], 22, pyRasgos); pyRasgos += 6.5; }

          doc.setFont('Roboto', 'italic');
          doc.setFontSize(11);
          doc.setTextColor(100, 100, 100);
          for (var eli = 0; eli < el.length; eli++) { doc.text(el[eli], 22, pyRasgos); pyRasgos += 6; }

          // La etiqueta, detras de la ultima linea del porque. Si esa linea
          // llega demasiado a la derecha no cabe, y entonces baja sola a la
          // linea siguiente pegada al margen: sacarla del papel no es opcion.
          doc.setFont('Roboto', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(207, 177, 128);
          if (cabeDetras) {
            doc.text(laEtiqueta, acabaEn, pyRasgos - 6);
          } else {
            doc.text(laEtiqueta, 192, pyRasgos, { align: 'right' });
            pyRasgos += 6;
          }

          // EL SEPARADOR ENTRE FICHAS. Sin el, treinta fichas seguidas se leen
          // como un muro y no se ve donde acaba una y empieza la siguiente.
          // Gris muy claro y de todo el ancho: tiene que separar, no decorar,
          // asi que se nota sin que se vea.
          // EL AIRE, IGUAL POR ARRIBA QUE POR ABAJO.
          //
          // No son el mismo numero porque no se mide desde el mismo sitio: por
          // arriba se cuenta desde la ultima linea del porque, que baja 1,5 mm
          // por debajo de su raya; por abajo, hasta el nombre de la ficha
          // siguiente, que sube 3 mm por encima de la suya. Con 8 y 9,5 queda
          // el mismo hueco blanco a los dos lados. Con 4 y 6, que es lo que
          // habia, la raya se leia pegada al titulo de abajo.
          pyRasgos += 2;
          if (ri < laLista.rasgos.length - 1 && pyRasgos <= Y_TOPE) {
            doc.setDrawColor(234, 231, 225);
            doc.setLineWidth(0.2);
            doc.line(18, pyRasgos, 192, pyRasgos);
            pyRasgos += 9.5;
          } else {
            pyRasgos += 8;
          }
        }
      }

      addPageNum(maq.pag);
      maq.pag++;
    }

    // ── PÁGINAS FINALES ───────────────────────────────────────────────────────
    doc.addPage(); doc.addImage(img_proximo,'JPEG',0,0,W,H); addPageNum(maq.pag); maq.pag++;
    doc.addPage(); doc.addImage(img_proximo2,'JPEG',0,0,W,H); addPageNum(maq.pag); maq.pag++;
    doc.addPage(); doc.addImage(img_trasera,'JPEG',0,0,W,H);

    // ── Devolver PDF en base64 ────────────────────────────────────────────────
    const pdfBase64 = doc.output('datauristring');

    // Si algun fichero no se ha podido cargar, el PDF va igualmente al cliente
    // pero puede tener alguna pagina sin fondo, asi que se avisa para revisarlo.
    if (fallosCarga.length > 0) {
      console.error('PDF generado con ficheros que fallaron:', fallosCarga.join(', '));
      try {
        await enviarAvisoFalloPDF({
          nombre,
          email: sessionEmail,
          sessionId: session_id,
          fallos: fallosCarga,
        });
      } catch (avisoErr) {
        console.error('Tampoco se pudo avisar del fallo del PDF:', avisoErr.message);
      }
    }

    // Marcar el informe como completado para bloquear generaciones repetidas.
    // completar() vuelve a leer la metadata justo antes de escribir, para no
    // pisar lo que se haya guardado mientras se construia el PDF.
    try {
      await completar(stripe, session_id);
    } catch (err) {
      console.error('Error marcando informe_completado:', err.message);
    }

    return res.status(200).json({ pdfBase64 });

  } catch (err) {
    console.error('Error generando PDF:', err.message);
    // El PDF no salio: soltar la reserva para que quede un intento util.
    await liberar(stripe, session_id, token);
    // Y avisar. Sin esto el cliente se queda sin informe y sin correo, y aqui
    // no se entera nadie: el navegador solo escribia el fallo en su consola.
    try {
      await enviarAvisoPDFNoGenerado({ nombre, email: sessionEmail, sessionId: session_id, motivo: err.message });
    } catch (avisoErr) {
      console.error('Tampoco se pudo avisar de que el PDF no salio:', avisoErr.message);
    }
    return res.status(500).json({ error: 'Error generando el PDF: ' + err.message });
  }
}


// ═════════════════════════════════════════════════════════════════
// AVISO DE PDF NO GENERADO (via Brevo)
// Distinto del de arriba: alli el PDF si sale y solo falla algun fichero.
// Aqui el cliente ha pagado y NO tiene nada.
// ═════════════════════════════════════════════════════════════════
async function enviarAvisoPDFNoGenerado({ nombre, email, sessionId, motivo }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

  const mensaje = [
    'Este cliente HA PAGADO y NO tiene su PDF. El informe se genero pero el',
    'PDF fallo al montarse, asi que no ha recibido nada.',
    '',
    'Le queda un intento: si vuelve a abrir su enlace, se regenera solo.',
    'Si no vuelve, hay que generarselo a mano.',
    '',
    `Cliente:    ${nombre || '-'}`,
    `Email:      ${email || '(desconocido)'}`,
    `Session ID: ${sessionId || '-'}`,
    `Motivo:     ${motivo || '-'}`,
  ].join('\n');

  const body = {
    sender: { email: 'hola@origennatal.com', name: 'Origen Natal — Alertas' },
    to: [{ email: 'hola.origennatal@gmail.com', name: 'Origen Natal' }],
    subject: 'PDF NO GENERADO — CLIENTE SIN INFORME',
    htmlContent: `<pre style="font-family:monospace;background:#fff5f4;padding:16px;border-radius:8px;">${mensaje}</pre>`,
  };

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });
}


// ═════════════════════════════════════════════════════════════════
// AVISO DE FALLO AL MONTAR EL PDF (via Brevo)
// El PDF se entrega igualmente; esto solo sirve para poder revisarlo y,
// si hace falta, reenviarlo a mano.
// ═════════════════════════════════════════════════════════════════
async function enviarAvisoFalloPDF({ nombre, email, sessionId, fallos }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

  const mensaje = [
    'El PDF se ha generado y enviado al cliente, pero algun fichero no cargo.',
    'Revisa el PDF y reenvialo a mano si hace falta.',
    '',
    `Cliente:    ${nombre || '-'}`,
    `Email:      ${email || '(desconocido)'}`,
    `Session ID: ${sessionId || '-'}`,
    '',
    `Ficheros que fallaron (${fallos.length}):`,
    ...fallos.map(f => `  - ${f}`),
  ].join('\n');

  const body = {
    sender: { email: 'hola@origennatal.com', name: 'Origen Natal — Alertas' },
    to: [{ email: 'hola.origennatal@gmail.com', name: 'Origen Natal' }],
    subject: 'FALLO PDF CLIENTE',
    htmlContent: `<pre style="font-family:monospace;background:#fff5f4;padding:16px;border-radius:8px;">${mensaje}</pre>`,
  };

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });
}
