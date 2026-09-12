// ═════════════════════════════════════════════════════════════════
// /api/generar-informe.js
//
// ENCADENA LOS PASOS DEL INFORME DESDE EL SERVIDOR.
//
// Hasta ahora los encadenaba el navegador de quien compra: pedia la carta,
// luego el informe, luego el PDF y luego el correo, uno detras de otro y con
// la pagina abierta dos o tres minutos. Si cerraba el movil o perdia
// cobertura a mitad, el informe ya estaba escrito y pagado y no le llegaba
// nada.
//
// Aqui se hace lo mismo, en el mismo orden y llamando a los mismos sitios con
// lo mismo que les mandaba la pagina. No se ha cambiado ni un tiempo ni un
// tope: cada llamada sigue siendo la suya y tiene sus minutos, igual que
// antes.
//
// Y LA PAGINA SIGUE IGUAL, de reserva. Si esto no llegara a arrancar, el
// navegador hace lo de siempre. No pueden salir dos informes: el primero que
// entra coge la reserva y al segundo se le contesta "se esta generando".
// ═════════════════════════════════════════════════════════════════

import Stripe from 'stripe';
import { compraValida, esDelProducto, estado } from '../lib/reserva.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const BASE_URL = 'https://origennatal.com';

// El mismo separador invisible que usa api/chat.js al unir las areas.
const SEPARADOR_AREAS = String.fromCharCode(31);

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// QUIEN LLAMA AQUI ES NUESTRO PROPIO SERVIDOR, NO UN NAVEGADOR. Se exige una
// clave que solo conoce el aviso de Stripe: sin ella, cualquiera con el enlace
// podria disparar la generacion de un informe ajeno.
function laLlaveEsBuena(req) {
  const clave = process.env.STRIPE_WEBHOOK_SECRET || '';
  return Boolean(clave) && req.headers['x-origen-interno'] === clave;
}

async function pedir(camino, cuerpo, segundos) {
  const resp = await fetch(BASE_URL + camino, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(segundos * 1000),
  });
  const datos = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(camino + ' ha contestado ' + resp.status + ': ' + (datos.error || ''));
    err.estado = resp.status;
    err.motivo = datos.motivo;
    throw err;
  }
  return datos;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  if (!laLlaveEsBuena(req)) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const { session_id } = req.body || {};
  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'Falta la compra' });
  }

  // LA MISMA CERRADURA DE SIEMPRE, y antes de gastar nada. Los sitios a los
  // que se llama la vuelven a mirar cada uno por su cuenta; esto solo evita
  // arrancar una cadena que se iba a caer en el primer paso.
  let m;
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!compraValida(session) || !esDelProducto(session, 'p1')) {
      return res.status(403).json({ error: 'Pago no verificado' });
    }
    const st = estado(session);
    if (st.completado) {
      return res.status(200).json({ ok: true, nota: 'ya estaba hecho' });
    }
    if (st.ocupada) {
      return res.status(200).json({ ok: true, nota: 'se esta haciendo' });
    }
    m = session.metadata || {};
  } catch (err) {
    console.error('generar-informe: no se ha podido leer la compra:', err.message);
    return res.status(403).json({ error: 'Pago no verificado' });
  }

  if (!m.nombre || !m.fecha || !m.hora) {
    console.error('generar-informe: la compra ' + session_id + ' no trae los datos de nacimiento');
    return res.status(400).json({ error: 'La compra no trae los datos de nacimiento' });
  }

  const [year, month, day] = String(m.fecha).split('-').map(Number);
  const [hh, mm] = String(m.hora).split(':').map(Number);
  const fechaNice = day + ' de ' + MESES[month - 1] + ' de ' + year;
  const lugar = [m.municipio, m.provincia, m.pais].filter(Boolean).join(', ');
  const edad = parseInt(m.edad, 10) || (new Date().getFullYear() - year);

  try {
    // 1. EL PUNTO DEL MAPA. La pagina usa las coordenadas que guardo el
    //    formulario si las tiene; aqui no hay navegador donde mirar, asi que
    //    se piden siempre, que es justo lo que hace ella cuando no las tiene.
    const geo = await pedir('/api/geocodificar', {
      session_id, municipio: m.municipio, provincia: m.provincia, pais: m.pais,
    }, 30);

    // 2. LA HORA REAL DE ESE SITIO EN ESA FECHA.
    const zona = await pedir('/api/timezone', {
      lat: geo.lat, lon: geo.lon, fechaISO: m.fecha, hora: m.hora,
    }, 30);
    if (typeof zona.offset !== 'number' || !isFinite(zona.offset)) {
      throw new Error('la zona horaria no ha venido');
    }

    // 3. LA CARTA Y EL TEXTO QUE LEE EL MODELO.
    const { cartaTexto, casasTexto, ...carta } = await pedir('/api/calcular-carta', {
      session_id, year, month, day, localHour: hh, localMin: mm,
      latDeg: geo.lat, lonDeg: geo.lon, tzOffset: zona.offset,
    }, 60);

    // 4. EL INFORME. Es el paso largo, y lleva su propio reloj dentro.
    const escrito = await pedir('/api/chat', {
      session_id, nombre: m.nombre, sexo: m.sexo, fechaNice, hora: m.hora,
      lugar, edad, cartaTexto, casasTexto,
    }, 300);
    if (!escrito.texto) throw new Error('el informe ha vuelto vacio');

    const areas = escrito.texto.split(SEPARADOR_AREAS).map(p => p.trim()).filter(p => p.length > 0);

    // 5. EL PDF.
    const pdf = await pedir('/api/generar-pdf', {
      session_id, token: escrito.token, nombre: m.nombre, sexo: m.sexo,
      fechaNice, hora: m.hora, lugar, edad, carta, areas, rasgos: escrito.rasgos || null,
    }, 300);
    if (!pdf.pdfBase64) throw new Error('el PDF no ha llegado');

    // 6. EL CORREO CON EL PDF.
    await pedir('/api/save-pdf', {
      session_id, token: escrito.token, pdfBase64: pdf.pdfBase64,
      nombre: m.nombre, sexo: m.sexo || '', fecha: fechaNice,
      hora: m.hora || '', lugar, edad,
    }, 120);

    console.log('generar-informe: informe entregado desde el servidor (' + session_id + ')');
    return res.status(200).json({ ok: true });

  } catch (err) {
    // SI ALGO SE CAE AQUI, NO SE PIERDE NADA: la pagina de la clienta sigue
    // haciendo lo de siempre, y las redes del P1 -los dos intentos y el aviso
    // a la tienda- siguen donde estaban.
    console.error('generar-informe: se ha parado en el camino (' + session_id + '): ' + err.message);
    return res.status(500).json({ error: err.message });
  }
}
