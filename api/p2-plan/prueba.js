// ════════════════════════════════════════════════════════════════
// api/p2-plan/prueba.js
//
// LA PAGINA PARA VER COMO SALE EL P2, y nada mas.
//
// No es la tienda. No la enlaza ninguna pagina, no manda correos, no cobra, no
// escribe nada en ningun sitio y no toca la compra. Solo lee informes del P1 ya
// guardados y enseña en pantalla lo que saldria. Se borra el dia que el P2 este
// cerrado y no deja rastro.
//
// COMO SE USA: se abre en el navegador con la clave detras,
//   /api/p2-plan/prueba?clave=LA_QUE_SEA
// sale la lista de los ultimos informes guardados, se pincha uno y las siete
// partes van apareciendo segun se escriben.
//
// POR QUE LLEVA CLAVE. Detras de esto hay informes enteros de clientas reales,
// con su nombre. Una direccion que se pueda adivinar es una direccion que
// alguien acaba abriendo. Sin la variable P2_CLAVE puesta, esto no abre: mas
// vale que no funcione a que se quede abierto de par en par.
//
// POR QUE LAS SIETE PARTES SE PIDEN DE UNA EN UNA DESDE EL NAVEGADOR. Cada
// peticion escribe una parte y se acaba: asi ninguna se acerca al tiempo maximo
// que aguanta el servidor, se ven llegar una a una, y cada parte sabe como
// empezaron las anteriores para no sonar igual.
// ════════════════════════════════════════════════════════════════

import { AREAS } from './reglas.js';
import { listar, leer } from './informe.js';
import { escribirParte } from './escribir.js';

function laClaveEsBuena(req) {
  const buena = process.env.P2_CLAVE;
  if (!buena) return false;
  const dada = (req.query?.clave || req.body?.clave || '').toString();
  return dada.length > 0 && dada === buena;
}

export default async function handler(req, res) {
  if (!laClaveEsBuena(req)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(403).send(
      process.env.P2_CLAVE
        ? 'Clave incorrecta.'
        : 'Sin la variable P2_CLAVE puesta en el servidor, esta pagina no abre.'
    );
  }

  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Que no se quede guardada en ningun sitio: aqui salen datos de clientas.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return res.status(200).send(PAGINA);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { accion } = req.body || {};

    if (accion === 'lista') {
      const informes = await listar(40);
      // Se abre cada uno solo para saber de quien es: en la lista tiene que
      // verse el nombre, que un numero de compra no dice nada.
      const conNombre = await Promise.all(informes.map(async inf => {
        try {
          const datos = await leer(inf.compra);
          return { ...inf, nombre: datos?.cliente?.nombre || '(sin nombre)' };
        } catch {
          return { ...inf, nombre: '(no se pudo abrir)' };
        }
      }));
      return res.status(200).json({ informes: conNombre });
    }

    if (accion === 'parte') {
      const { compra, indice, hechas } = req.body || {};
      const area = AREAS[Number(indice)];
      if (!area) return res.status(400).json({ error: 'Esa parte no existe' });

      const informe = await leer(compra);
      const textoDelArea = (informe?.areas || [])[Number(indice)];
      if (!textoDelArea) {
        return res.status(422).json({ error: `Este informe no tiene guardada la parte de ${area.id}` });
      }

      const parte = await escribirParte({
        area,
        nombre: informe?.cliente?.nombre || 'ella',
        textoDelArea,
        rasgos: informe?.rasgos,
        hechas: Array.isArray(hechas) ? hechas : [],
      });
      return res.status(200).json({ parte });
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (err) {
    console.error('[p2-plan/prueba]', err);
    return res.status(500).json({ error: err.message });
  }
}

// La pagina. Los colores y las letras son los de la marca, para leerlo como se
// va a leer. No carga nada de fuera: ni fuentes, ni librerias, ni imagenes.
const PAGINA = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>P2 — prueba</title>
<style>
  :root { --teal:#0e3f4b; --gold:#bd9048; --gold-claro:#cfb180; --crema:#fffbef; --tinta:#0c0c0c; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--crema); color:var(--tinta); font:16px/1.7 Georgia, 'Times New Roman', serif; padding:2rem 1rem 5rem; }
  .caja { max-width:760px; margin-inline:auto; }
  h1 { font-size:1.5rem; color:var(--teal); margin-bottom:.3rem; }
  .sub { color:#6b6b6b; font-size:.85rem; margin-bottom:2rem; font-family:system-ui,sans-serif; }
  select, button { font:inherit; font-family:system-ui,sans-serif; font-size:.95rem; }
  select { width:100%; padding:.7rem; border:1px solid rgba(14,63,75,.3); border-radius:6px; background:#fff; margin-bottom:1rem; }
  button { background:var(--gold); color:#fff; border:0; border-radius:6px; padding:.8rem 1.6rem; cursor:pointer; font-weight:600; letter-spacing:.03em; }
  button:disabled { opacity:.45; cursor:default; }
  .aviso { font-family:system-ui,sans-serif; font-size:.9rem; color:#6b6b6b; margin:1.2rem 0; }
  .error { color:#c0392b; }
  .parte { background:#fff; border:1px solid rgba(189,144,72,.25); border-left:4px solid var(--gold); border-radius:8px; padding:1.6rem 1.8rem; margin-top:1.6rem; }
  .parte h2 { font-size:1.25rem; color:var(--teal); margin-bottom:.9rem; line-height:1.35; }
  .apertura { margin-bottom:1.4rem; }
  .cajita { background:rgba(189,144,72,.07); border-radius:6px; padding:1rem 1.2rem; margin-bottom:1rem; }
  .cajita h3 { font-family:system-ui,sans-serif; font-size:.78rem; text-transform:uppercase; letter-spacing:.08em; color:var(--gold); margin-bottom:.8rem; }
  .entrada { margin-bottom:.9rem; }
  .entrada:last-child { margin-bottom:0; }
  .entrada b { color:var(--teal); }
  .senal { display:block; font-family:system-ui,sans-serif; font-size:.85rem; color:#6b6b6b; margin-top:.25rem; }
  .cierre { font-style:italic; color:var(--teal); border-top:1px solid rgba(189,144,72,.25); padding-top:1rem; margin-top:.4rem; }
</style>
</head>
<body>
<div class="caja">
  <h1>Tu Plan de Origen — prueba</h1>
  <p class="sub">Solo para ver cómo sale. No manda nada a nadie.</p>

  <select id="quien"><option>Cargando informes…</option></select>
  <button id="ir" disabled>Escribir su plan</button>

  <p class="aviso" id="aviso"></p>
  <div id="salida"></div>
</div>
<script>
const clave = new URLSearchParams(location.search).get('clave') || '';
const quien = document.getElementById('quien');
const ir = document.getElementById('ir');
const aviso = document.getElementById('aviso');
const salida = document.getElementById('salida');

const escapar = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

async function llamar(cuerpo) {
  const r = await fetch(location.pathname, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ clave, ...cuerpo }),
  });
  const d = await r.json().catch(() => ({ error:'Respuesta ilegible' }));
  if (!r.ok) throw new Error(d.error || ('Error ' + r.status));
  return d;
}

(async function cargarLista() {
  try {
    const { informes } = await llamar({ accion:'lista' });
    if (!informes.length) {
      quien.innerHTML = '<option>No hay ningún informe guardado todavía</option>';
      aviso.textContent = 'El guardado es reciente: solo están los informes hechos desde que se puso.';
      return;
    }
    quien.innerHTML = informes.map(i =>
      '<option value="' + escapar(i.compra) + '">' + escapar(i.nombre) + ' — ' + escapar((i.fecha||'').slice(0,10)) + '</option>'
    ).join('');
    ir.disabled = false;
  } catch (e) {
    quien.innerHTML = '<option>No se pudo cargar la lista</option>';
    aviso.className = 'aviso error';
    aviso.textContent = e.message;
  }
})();

ir.addEventListener('click', async () => {
  ir.disabled = true; quien.disabled = true;
  salida.innerHTML = '';
  aviso.className = 'aviso';
  const compra = quien.value;
  const hechas = [];

  for (let i = 0; i < 7; i++) {
    aviso.textContent = 'Escribiendo la parte ' + (i+1) + ' de 7…';
    try {
      const { parte } = await llamar({ accion:'parte', compra, indice:i, hechas });
      hechas.push({ apertura: parte.apertura, cierre: parte.cierre });
      salida.insertAdjacentHTML('beforeend', pintar(parte));
    } catch (e) {
      salida.insertAdjacentHTML('beforeend',
        '<div class="parte"><h2>Parte ' + (i+1) + '</h2><p class="error">' + escapar(e.message) + '</p></div>');
    }
  }

  aviso.textContent = 'Listo.';
  ir.disabled = false; quien.disabled = false;
});

function pintar(p) {
  const cajas = (p.cajas||[]).map(c =>
    '<div class="cajita"><h3>' + escapar(c.titulo) + '</h3>' +
    (c.entradas||[]).map(e =>
      '<p class="entrada"><b>' + escapar(e.titulo) + '</b> — ' + escapar(e.texto) +
      (e.senal ? '<span class="senal">Lo notas en: ' + escapar(e.senal) + '</span>' : '') + '</p>'
    ).join('') + '</div>'
  ).join('');
  return '<div class="parte"><h2>' + escapar(p.titulo) + '</h2>' +
    '<p class="apertura">' + escapar(p.apertura) + '</p>' + cajas +
    '<p class="cierre">' + escapar(p.cierre) + '</p></div>';
}
</script>
</body>
</html>`;
