import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { jsPDF } = require('jspdf');
import Stripe from 'stripe';
import { compraValida, esDelProducto, estado, liberar, completar } from '../lib/reserva.js';
import { guardarInforme } from '../lib/guardar-informe.js';

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
      // La cerradura del P1: se exige que este pagado Y que sea del P1. El
      // recibo de otro producto no abre este camino.
      if (!compraValida(session) || !esDelProducto(session, 'p1')) {
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
      img_frase, img_proximo, img_proximo2, img_trasera, img_rasgos
    ] = await Promise.all([
      loadFontBase64('/fonts/Roboto-Regular.ttf'),
      loadFontBase64('/fonts/Roboto-Bold.ttf'),
      loadFontBase64('/fonts/Roboto-Italic.ttf'),
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
      loadImageBase64('/images/10-rasgos-pdf.jpg'),
    ]);

    // Fondos de la primera pagina de cada area, en el mismo orden que areaTitles
    const img_areas = [img_identidad, img_patrones, img_miedos, img_herida, img_amor, img_relaciones, img_dinero];

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    // Si una fuente no se ha podido cargar no se registra: jsPDF dibuja ese texto
    // con la fuente por defecto en lugar de fallar, y el informe sigue siendo legible.
    if (regular) { doc.addFileToVFS('Roboto-Regular.ttf', regular); doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal'); }
    if (bold)    { doc.addFileToVFS('Roboto-Bold.ttf', bold);       doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold'); }
    if (italic)  { doc.addFileToVFS('Roboto-Italic.ttf', italic);   doc.addFont('Roboto-Italic.ttf', 'Roboto', 'italic'); }
    // La caligrafica del cierre de cada area.
    if (italianno) { doc.addFileToVFS('Italianno-Regular.ttf', italianno); doc.addFont('Italianno-Regular.ttf', 'Italianno', 'normal'); }

    // Si un fondo no se ha podido cargar, esa pagina sale sin fondo en vez de
    // romper el PDF entero. Se envuelve addImage una sola vez para no tener que
    // tocar ninguna de las llamadas de dibujo que ya existen.
    const _addImage = doc.addImage.bind(doc);
    doc.addImage = function (img, ...resto) { return img ? _addImage(img, ...resto) : doc; };

    function fx(s) { return s || ''; }
    var W = 210, H = 297;

    // Aire que queda entre el ultimo renglon de la redaccion y el numero de
    // pagina, en milimetros.
    var AIRE_SOBRE_NUMERO = 5;

    // Altura a la que arranca la redaccion en cada pagina. Es la misma que usan
    // las siete areas (el "ay=60" de mas abajo): los rasgos empiezan al mismo
    // nivel que ellas.
    var ALTO_INICIO = 60;

    // Aire que queda a cada lado de la linea que separa un rasgo del siguiente.
    // Los dos numeros son distintos para que el hueco se vea igual: por arriba
    // la linea se mide desde el renglon del area, que no baja de el, y por
    // abajo hasta el nombre del rasgo, que si sube por encima del suyo.
    var AIRE_SOBRE_LINEA = 4;
    var AIRE_BAJO_LINEA = 11;

    // Hueco que separa el final de una lista del titulo de la siguiente.
    var AIRE_ENTRE_LISTAS = 35;

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

    function anchoPalabra(pal, size, todoNegrita, cursiva, caligrafica) {
      doc.setFontSize(size);
      if (caligrafica) doc.setFont('Italianno', 'normal');
      else doc.setFont('Roboto', cursiva ? 'italic' : ((todoNegrita || pal.b) ? 'bold' : 'normal'));
      return doc.getTextWidth(pal.t);
    }

    function anchoLinea(linea, size, todoNegrita, cursiva, caligrafica) {
      var a = 0;
      for (var i = 0; i < linea.length; i++) a += anchoPalabra(linea[i], size, todoNegrita, cursiva, caligrafica);
      return a;
    }

    // Lo mismo que splitTextToSize, pero midiendo cada palabra con su fuente.
    function lineasConNegrita(txt, maxW, size, todoNegrita, cursiva, caligrafica) {
      var pals = palabrasConNegrita(txt), lineas = [], linea = [], ancho = 0;
      for (var i = 0; i < pals.length; i++) {
        var w = anchoPalabra(pals[i], size, todoNegrita, cursiva, caligrafica);
        if (pals[i].esp) {
          if (linea.length === 0) continue;
          linea.push(pals[i]); ancho += w; continue;
        }
        if (ancho + w > maxW && linea.length > 0) {
          while (linea.length > 0 && linea[linea.length - 1].esp) {
            ancho -= anchoPalabra(linea.pop(), size, todoNegrita, cursiva, caligrafica);
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

      function dibujarSigno(idx, centerX, centerY, size) {
        doc.setDrawColor(COL_VERDE[0],COL_VERDE[1],COL_VERDE[2]);
        doc.setLineWidth(0.3);
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
        doc.setDrawColor(COL_VERDE[0],COL_VERDE[1],COL_VERDE[2]); doc.setLineWidth(0.28);
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
    var pageC=6;
    // NINGUN SUBTITULO SE REPITE ENTRE AREAS. Las siete se escriben por
    // separado y ninguna sabe lo que ponen las otras, asi que el que ya haya
    // salido antes no se pinta: el parrafo empieza sin el y nadie lo echa de
    // menos. Es la unica manera de garantizarlo sin pedir nada otra vez.
    var subsUsados = {};
    for(var ai2=0;ai2<areaTitles.length;ai2++){
      var areaText=areas[ai2]||'';
      var rawParas=areaText.split(/\n\n+/).filter(p=>p.trim().length>0);
      // El ultimo parrafo de cada area es el CIERRE, la frase que se destaca.
      var idxCierre = rawParas.length-1;
      var paras=[];
      for(var rp=0;rp<rawParas.length;rp++){
        var chunk=rawParas[rp].trim();
        var esCierre=(rp===idxCierre);
        // LO QUE SE SACA DEL BLOQUE DE TEXTO.
        //
        // Un area seguida es un muro de parrafos iguales y el ojo no descansa.
        // Se sacan las preguntas que se le hacen al lector y se pintan centradas,
        // mas grandes y en el verde de la marca. Van solas en su parrafo, asi que
        // se reconocen por eso, y no se parten nunca.
        // El subtitulo viene marcado con "## " delante. Es corto, va en dorado
        // y en mayusculas, y sirve para que el ojo sepa que empieza otra cosa.
        if(!esCierre && /^##\s+/.test(chunk)){
          var elSub=chunk.replace(/^##\s+/,'').replace(/[.:]+$/,'').toUpperCase();
          var clave=elSub.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9 ]/g,'').replace(/\s+/g,' ').trim();
          // Y NUNCA ABRE EL AREA: si el modelo lo pone el primero, no se pinta.
          if(clave && !subsUsados[clave] && paras.length>0){ subsUsados[clave]=true; paras.push({t:elSub,cierre:false,sub:true}); }
          continue;
        }
        var esDestacado=!esCierre && /^¿[\s\S]*\?$/.test(chunk);
        if(esDestacado){ paras.push({t:chunk,cierre:false,dest:true}); continue; }
        // La escena viene marcada con un ">" delante, y va en cursiva con una
        // linea dorada al lado. Se reconoce aqui y tampoco se parte.
        if(!esCierre && /^>\s*/.test(chunk)){ paras.push({t:chunk.replace(/^>\s*/,''),cierre:false,escena:true}); continue; }
        // EL CIERRE NO SE PARTE NUNCA: va entero en su propia pagina,
        // asi que aunque sea largo se queda como un solo parrafo.
        if(chunk.length>500 && !esCierre){
          var sentences=chunk.split(/(?<=\.)\s+/);
          var trozos=[],group='',sCount=0;
          for(var si2=0;si2<sentences.length;si2++){
            group+=(group?' ':'')+sentences[si2]; sCount++;
            if(sCount>=3&&group.length>200){trozos.push(group);group='';sCount=0;}
          }
          if(group.length>0) trozos.push(group);
          // Si el modelo dejo una marca sin cerrar, no se cuadra nada: el
          // asterisco suelto se limpia al maquetar, igual que hasta ahora.
          if((((chunk.match(/\*\*/g)||[]).length)%2)===0) trozos=cuadrarNegritas(trozos);
          for(var tz=0;tz<trozos.length;tz++) paras.push({t:trozos[tz],cierre:esCierre});
        } else { paras.push({t:chunk,cierre:esCierre}); }
      }
      doc.addPage(); doc.addImage(img_areas[ai2],'JPEG',0,0,W,H);
      var ay=60, areaPageCount=1;
      // La raya dorada de la escena es UNA para toda ella, no una por parrafo:
      // se guarda aqui donde arranco y se dibuja cuando la escena se acaba.
      var lineaDesde=0;
      for(var pi2=0;pi2<paras.length;pi2++){
        if(!paras[pi2]||!paras[pi2].t) continue;
        var esC=paras[pi2].cierre;
        var esD=paras[pi2].dest;
        var esE=paras[pi2].escena;
        var esS=paras[pi2].sub;
        // El cierre es la frase que el lector se lleva puesta: se saca del
        // bloque de texto y se pinta en negrita dorada, centrada y con aire.
        // Los destacados van igual de centrados y de grandes, pero en el verde
        // de la marca y sin negrita, que son del cuerpo del area y no el final.
        var cuerpo=esS?13:(esD?14:(esC?30:12));
        var color=(esC||esS)?[207,177,128]:(esD?[14,63,75]:[40,40,40]);
        var ancho=(esC||esD)?150:(esE?167:175), alto=esC?13:(esD?7:7);
        if(esD) ay+=8;
        // El subtitulo respira por arriba y va pegado al parrafo que abre.
        if(esS) ay+=6;
        // Y NO SE QUEDA SOLO AL PIE: si no cabe el con dos renglones de lo que
        // presenta, pasa entero a la pagina siguiente y arrastra su parrafo.
        if(esS && ay > H-16-AIRE_SOBRE_NUMERO-20){
          addPageNum(pageC);pageC++;areaPageCount++;
          doc.addPage();doc.addImage(img_base,'JPEG',0,0,W,H);
          ay=60;
        }
        var vieneEscena=pi2>0 && paras[pi2-1] && paras[pi2-1].escena;
        var sigueEscena=pi2+1<paras.length && paras[pi2+1] && paras[pi2+1].escena;
        if(esE && !vieneEscena) { ay+=4; lineaDesde=ay-4.5; }
        doc.setFontSize(cuerpo); doc.setTextColor(color[0],color[1],color[2]);
        var plines=lineasConNegrita(fx(paras[pi2].t.trim()),ancho,cuerpo,esD||esS,esE,esC);
        // EL CIERRE VA SOLO EN SU PAGINA, CENTRADO. Se abre pagina nueva y se
        // baja hasta la mitad, restando lo que el cierre ocupa.
        if(esC){
          addPageNum(pageC);pageC++;areaPageCount++;
          doc.addPage();doc.addImage(img_base,'JPEG',0,0,W,H);
          doc.setFontSize(cuerpo);doc.setTextColor(color[0],color[1],color[2]);
          ay=(H-plines.length*alto)/2;
        }
        for(var pl2=0;pl2<plines.length;pl2++){
          // La redaccion no baja hasta el numero de pagina: se corta 5 mm antes,
          // que es el aire que tiene que quedar entre el ultimo renglon y el numero.
          if(ay>H-16-AIRE_SOBRE_NUMERO){
            // Si la escena se parte entre dos paginas, su linea se cierra aqui
            // y vuelve a empezar arriba en la siguiente.
            if(esE){ doc.setDrawColor(207,177,128); doc.setLineWidth(0.8); doc.line(18,lineaDesde,18,ay-alto+2); lineaDesde=60-4.5; }
            addPageNum(pageC);pageC++;areaPageCount++;doc.addPage();doc.addImage(img_base,'JPEG',0,0,W,H);doc.setFontSize(cuerpo);doc.setTextColor(color[0],color[1],color[2]);ay=60;
          }
          var lin=plines[pl2];
          var cx=(esC||esD)?(105-anchoLinea(lin,cuerpo,esD,false,esC)/2):(esE?26:18);
          for(var wi=0;wi<lin.length;wi++){
            if(!lin[wi].esp){ if(esC){doc.setFont('Italianno','normal');} else {doc.setFont('Roboto',esE?'italic':((esD||esS||lin[wi].b)?'bold':'normal'));} doc.text(lin[wi].t,cx,ay); }
            cx+=anchoPalabra(lin[wi],cuerpo,esD||esS,esE,esC);
          }
          ay+=alto;
        }
        if(esE && !sigueEscena){ doc.setDrawColor(207,177,128); doc.setLineWidth(0.8); doc.line(18,lineaDesde,18,ay-alto+2); }
        // 4. Y mas aire entre parrafos, que iban demasiado juntos.
        ay+=esS?3:((esC||esD)?8:(esE&&sigueEscena?6:7));
      }
      if(areaPageCount<2){addPageNum(pageC);pageC++;doc.addPage();doc.addImage(img_base,'JPEG',0,0,W,H);}
      addPageNum(pageC); pageC++;
    }

    // ── LAS DOS LISTAS DE RASGOS ──────────────────────────────────────────────
    //
    // Van despues de las siete areas y por separado: primero las FORTALEZAS
    // enteras y debajo los DESAFIOS. Cada rasgo lleva sus cuatro casillas.
    //
    // "origen" (de donde sale el rasgo en la carta) se imprime a la vista a
    // proposito, para poder revisar si lo que dice es correcto. Cuando se de por
    // bueno, se decidira que parte de esto ve el cliente.
    //
    // Toda la seccion va dentro de un "if": si las listas no llegan, el informe
    // sale igual, solo que sin estas paginas.
    // EN EL PDF SOLO SE VEN EL NOMBRE Y LA DESCRIPCION.
    //
    // El rasgo sigue llevando su causa, su origen en la carta y su area: eso lo
    // necesitan las siete areas del informe y se les manda igual desde
    // api/chat.js. Aqui solo se decide QUE SE DIBUJA, y esas tres cosas no se
    // dibujan: el cliente no las lee, alargaban las listas tres o cuatro
    // paginas, y la etiqueta del area acertaba en el noventa por ciento de los
    // rasgos, asi que una mal puesta cantaba mas de lo que sumaba tenerla.
    //
    // Lo que ocupa la ficha entera y los renglones ya partidos, para no partirla
    // entre dos paginas: se mide antes de escribir nada.
    function medirFicha(r) {
      doc.setFontSize(12);
      var lDesc = doc.splitTextToSize(fx(r.descripcion), 175);
      return { desc: lDesc, alto: 8 + lDesc.length*5.5 };
    }

    // Las dos listas van seguidas: los desafios NO empiezan pagina nueva, siguen
    // debajo de las fortalezas con un hueco amplio. Por eso la altura y la
    // pagina abierta se comparten entre las dos.
    var ry = ALTO_INICIO;
    var hayPaginaDeRasgos = false;

    function pintarListaRasgos(titulo, lista) {
      if (!Array.isArray(lista) || lista.length === 0) return;

      if (!hayPaginaDeRasgos) {
        // Solo la primera pagina de las listas lleva este fondo; las que vengan
        // detras siguen con el de siempre.
        doc.addPage(); doc.addImage(img_rasgos,'JPEG',0,0,W,H);
        ry = ALTO_INICIO;
        hayPaginaDeRasgos = true;
      } else {
        // La segunda lista sigue donde acabo la primera, con el hueco amplio.
        // Solo pasa de pagina si ahi ya no cabrian el titulo y su primer rasgo.
        ry += AIRE_ENTRE_LISTAS;
        if (ry + 14 + medirFicha(lista[0] || {}).alto > H - 22) {
          addPageNum(pageC); pageC++;
          doc.addPage(); doc.addImage(img_base,'JPEG',0,0,W,H);
          ry = ALTO_INICIO;
        }
      }

      // Cabecera de la lista, a la izquierda y en dorado, en la misma linea de
      // margen que los rasgos que van debajo.
      doc.setFont('Roboto','bold'); doc.setFontSize(13); doc.setTextColor(207,177,128);
      doc.text(fx(titulo), 18, ry);
      ry += 14;

      // Entre un rasgo y el siguiente va una linea divisoria, con el mismo aire
      // por arriba que por abajo. Solo se pinta entre dos rasgos que se vean
      // juntos: nunca al final de una pagina, ni al final de la lista, ni justo
      // debajo del titulo.
      var primeroDeLaPagina = true;

      for (var i = 0; i < lista.length; i++) {
        var r = lista[i] || {};

        var ficha = medirFicha(r);
        var lDesc = ficha.desc;
        var alto = ficha.alto;
        var divisor = !primeroDeLaPagina;

        if (ry + alto + (divisor ? AIRE_SOBRE_LINEA + AIRE_BAJO_LINEA : 0) > H - 22) {
          addPageNum(pageC); pageC++;
          doc.addPage(); doc.addImage(img_base,'JPEG',0,0,W,H);
          ry = ALTO_INICIO;
          divisor = false;
        }

        // 0. La linea que separa este rasgo del de arriba.
        if (divisor) {
          ry += AIRE_SOBRE_LINEA;
          doc.setDrawColor(228,228,228); doc.setLineWidth(0.2);
          doc.line(35, ry, 175, ry);
          ry += AIRE_BAJO_LINEA;
        }

        // 1. El nombre del rasgo
        doc.setFont('Roboto','bold'); doc.setFontSize(13); doc.setTextColor(14,63,75);
        doc.text(fx(r.nombre), 18, ry);
        ry += 8;

        // 2. La descripcion
        doc.setFont('Roboto','normal'); doc.setFontSize(12); doc.setTextColor(40,40,40);
        for (var d = 0; d < lDesc.length; d++) { doc.text(lDesc[d], 18, ry); ry += 5.5; }

        primeroDeLaPagina = false;
      }
    }

    if (rasgos) {
      pintarListaRasgos('TUS FORTALEZAS', rasgos.fortalezas);
      pintarListaRasgos('TUS DESAFIOS', rasgos.desafios);
      // El numero de la ultima pagina de rasgos, ya con las dos listas dentro.
      if (hayPaginaDeRasgos) { addPageNum(pageC); pageC++; }
    }

    // ── PÁGINAS FINALES ───────────────────────────────────────────────────────
    doc.addPage(); doc.addImage(img_frase,'JPEG',0,0,W,H); addPageNum(pageC); pageC++;
    doc.addPage(); doc.addImage(img_proximo,'JPEG',0,0,W,H); addPageNum(pageC); pageC++;
    doc.addPage(); doc.addImage(img_proximo2,'JPEG',0,0,W,H); addPageNum(pageC); pageC++;
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

    // Guardar lo que se le ha entregado, para que el siguiente producto pueda
    // apoyarse en ESTE informe y no en una tirada nueva. Va aqui, con el PDF ya
    // hecho, y nunca corta: si falla, el cliente recibe su informe igual.
    try {
      const guardado = await guardarInforme({
        producto: 'p1',
        sessionId: session_id,
        cliente: { nombre, sexo, email: sessionEmail, fecha: fechaNice, hora, lugar, edad },
        areas,
        rasgos: rasgos || null,
      });
      if (guardado.guardado) console.log(`Informe guardado: ${guardado.ruta} (${guardado.bytes} bytes)`);
    } catch (err) {
      console.error('No se pudo guardar el informe:', err.message);
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
    sender: { email: 'hola@origennatal.com', name: 'ORIGEN NATAL — Alertas' },
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
    sender: { email: 'hola@origennatal.com', name: 'ORIGEN NATAL — Alertas' },
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
