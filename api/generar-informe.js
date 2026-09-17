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
import { waitUntil } from '@vercel/functions';
import { compraValida, esDelProducto, estado } from '../lib/reserva.js';
import { asegurarLaFicha, leerLaFicha } from '../lib/ficha-del-lead.js';
import { montarCartaTexto, montarCasasTexto } from '../lib/carta-texto.js';

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

// ── LO QUE YA TIENE GUARDADO ─────────────────────────────────────
//
// Si paso por el regalo, sus datos y su carta ya estan escritos en el fichero
// de su email. De ahi salen los dos: son los mismos con los que se le escribio
// el regalo que ya ha leido, asi que su informe habla de la misma persona y le
// llama igual.
//
// Y ADEMAS NO SE VUELVE A CALCULAR NADA. Calcular la carta son tres llamadas
// -el mapa, la hora de ese sitio y el calculo- y, lo que importa mas, el mapa
// puede devolver un punto algo distinto del de aquel dia: saldria una carta
// que no es la que ella leyo.
//
// O ESTA TODO O NO ESTA NADA. Hacen falta sus datos enteros y una carta con
// las tres posiciones sin las que no se puede escribir -las mismas que
// comprueba el regalo antes de ponerse-. Si falta algo se devuelve null, y
// entonces el informe saca y guarda todo, igual que para quien no paso por el
// regalo.
//
// Y NO PUEDE CORTAR NADA: si el almacen no contesta, se deja aviso y se hace
// todo, que es lo que se hacia hasta ahora.
async function loSuyoGuardado(email) {
  if (!email) return null;
  try {
    const ficha = await leerLaFicha(email);
    const carta = ficha && ficha.carta;
    const cliente = ficha && ficha.cliente;
    if (!carta || !carta.sol || !carta.ascendente || !carta.casas) return null;
    if (!cliente || !cliente.nombre || !cliente.fecha || !cliente.hora || !cliente.lugar) return null;
    return { carta, cliente };
  } catch (err) {
    console.error('generar-informe: no se ha podido leer lo suyo guardado:', err.message);
    return null;
  }
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
  let m, suEmail = '';
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
    suEmail = session.customer_email || session.customer_details?.email || '';
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

  // LO QUE YA TIENE GUARDADO MANDA. Si esta ahi, sus datos salen de su fichero
  // y no de la compra: son los mismos con los que se le escribio el regalo. Si
  // no esta, salen de la compra y se monta todo como siempre.
  const suyo = await loSuyoGuardado(suEmail);

  const nombre    = suyo ? suyo.cliente.nombre : m.nombre;
  const sexo      = suyo ? (suyo.cliente.sexo || '') : (m.sexo || '');
  const hora      = suyo ? suyo.cliente.hora : m.hora;
  const fechaNice = suyo ? suyo.cliente.fecha : day + ' de ' + MESES[month - 1] + ' de ' + year;
  const lugar     = suyo ? suyo.cliente.lugar : [m.municipio, m.provincia, m.pais].filter(Boolean).join(', ');
  const edad      = suyo ? (suyo.cliente.edad || '') : (parseInt(m.edad, 10) || (new Date().getFullYear() - year));

  try {
    let carta = suyo ? suyo.carta : null;
    let cartaTexto, casasTexto;

    if (carta) {
      // YA LA TENIA. No se pide el mapa, ni la hora de ese sitio, ni se
      // calcula nada: se monta el texto que lee el modelo con la carta
      // guardada, con las mismas dos funciones que usa el calculo.
      cartaTexto = montarCartaTexto(carta);
      casasTexto = montarCasasTexto(carta);
      console.log('generar-informe: su carta ya estaba guardada, no se vuelve a calcular');

    } else {
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
      ({ cartaTexto, casasTexto, ...carta } = await pedir('/api/calcular-carta', {
        session_id, year, month, day, localHour: hh, localMin: mm,
        latDeg: geo.lat, lonDeg: geo.lon, tzOffset: zona.offset,
      }, 60));

      // 3 bis. SU FICHA, QUE NO LA TIENE.
      //
      // Sus datos y su carta se guardan en un fichero suyo, uno por email. Si
      // se ha llegado hasta aqui es que no lo tenia -o lo tenia sin carta-,
      // asi que se crea ahora, que es cuando hay algo que guardar.
      //
      // SI YA ESTABA, NO SE TOCA: dentro puede estar lo que el regalo le
      // escribio, y volver a guardarlo lo borraria.
      //
      // NO SE ESPERA A QUE TERMINE, igual que hace el regalo: guardar no puede
      // retrasar ni un segundo el informe, que es lo que ha pagado.
      waitUntil(
        asegurarLaFicha({
          email: suEmail,
          cliente: { nombre, sexo, fecha: fechaNice, hora, lugar, edad },
          carta,
        })
          .then(ficha => { if (ficha.creada) console.log('generar-informe: ficha creada (' + ficha.ruta + ')'); })
          .catch(err => console.error('generar-informe: no se ha podido crear la ficha:', err.message))
      );
    }

    // 4. EL INFORME. Es el paso largo, y lleva su propio reloj dentro.
    const escrito = await pedir('/api/chat', {
      session_id, nombre, sexo, fechaNice, hora,
      lugar, edad, cartaTexto, casasTexto,
    }, 300);
    if (!escrito.texto) throw new Error('el informe ha vuelto vacio');

    const areas = escrito.texto.split(SEPARADOR_AREAS).map(p => p.trim()).filter(p => p.length > 0);

    // 5. EL PDF.
    const pdf = await pedir('/api/generar-pdf', {
      session_id, token: escrito.token, nombre, sexo,
      fechaNice, hora, lugar, edad, carta, areas, rasgos: escrito.rasgos || null,
      // El cuaderno de como ha ido: viaja hasta el guardado y ahi se queda.
      cuaderno: escrito.cuaderno || null,
    }, 300);
    if (!pdf.pdfBase64) throw new Error('el PDF no ha llegado');

    // 6. EL CORREO CON EL PDF.
    await pedir('/api/save-pdf', {
      session_id, token: escrito.token, pdfBase64: pdf.pdfBase64,
      nombre, sexo, fecha: fechaNice,
      hora: hora || '', lugar, edad,
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
