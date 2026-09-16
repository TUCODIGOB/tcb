// ═════════════════════════════════════════════════════════════════
// /api/reintentar-informe.js
// Vuelve a lanzar los informes del P1 que no salieron, por detras.
//
// COMO FUNCIONA. Vercel llama a esta puerta cada cuarto de hora. Ella mira
// quien hay apuntado en p1/pendientes/ y coge al que le toque:
//
//   · el 1º reintento, diez minutos despues de pagar
//   · el 2º, a las tres horas
//
// DOS Y NO MAS. El primero recoge el tropiezo del momento, que es lo que pasa
// casi siempre; el segundo cubre una caida larga. Con la generacion del cobro
// son tres en total, y cada una se paga.
//
// POR QUE ASI Y NO COMO EL REGALO. El regalo escribe un trozo corto y su
// reintento lo hace el mismo. Un informe del P1 son siete areas, un PDF de
// mas de cuarenta paginas y varios minutos de trabajo: aqui no se escribe
// nada. Esta puerta solo le da al boton de arranque -la misma llamada que
// hace el aviso de Stripe al cobrar- y se va. Quien escribe sigue siendo
// /api/generar-informe, con sus propios tiempos.
//
// UNO POR VUELTA, y el que lleva mas tiempo esperando. Con una vuelta cada
// quince minutos hay de sobra, y asi dos informes no se ponen a generarse a
// la vez.
//
// ANTES DE GASTAR NADA SE MIRA SI YA LO TIENE. Entre que se apunto y ahora
// puede haber salido: en ese caso se le quita de la lista y no se gasta ni un
// centimo en repetirlo.
//
// CERRADA CON LLAVE. Solo entra quien traiga CRON_SECRET, que es lo que manda
// Vercel. Sin eso, cualquiera con la direccion podria hacernos generar
// informes a mansalva.
// ═════════════════════════════════════════════════════════════════

import Stripe from 'stripe';
import { estado } from '../lib/reserva.js';
import { losPendientes, guardarPendiente, quitarPendiente } from '../lib/pendientes-p1.js';
import { correoRevisando, correoALaTienda } from '../lib/correos-p1.js';
import { leerInforme } from '../lib/guardar-informe.js';
import { leerLaFicha } from '../lib/ficha-del-lead.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const UN_MINUTO = 60 * 1000;
const UNA_HORA = 60 * UN_MINUTO;

// Cuanto hay que esperar desde el cobro para cada reintento.
const CUANDO = [10 * UN_MINUTO, 3 * UNA_HORA];

// Veces que se vuelve a intentar SOLO LA ENTREGA, cuando el informe ya esta
// escrito y guardado y lo unico que fallo fue el correo. Eso no cuesta ni una
// llamada al modelo: se vuelve a montar el PDF con lo que hay guardado y se
// manda. Por eso no gasta ninguno de los intentos de generacion.
const MAX_ENTREGAS = 2;

// Cuanto se espera desde el ultimo intento antes de darlo por perdido y
// avisar. Media hora es de sobra: escribir un informe entero, con su PDF y su
// correo, no pasa de unos minutos.
const CIERRE_MS = 30 * UN_MINUTO;

// ── DARLE AL BOTON DE ARRANQUE ───────────────────────────────────
//
// Es la misma llamada que hace el aviso de Stripe cuando se cobra. No se
// espera a que termine -tarda minutos y esta puerta no puede quedarse ahi-:
// basta con que la peticion salga. Al otro lado, generar-informe sigue su
// camino aunque aqui ya se haya contestado.
function arrancarElInforme(sessionId) {
  const clave = process.env.STRIPE_WEBHOOK_SECRET;
  if (!clave) throw new Error('Falta STRIPE_WEBHOOK_SECRET');

  return fetch('https://origennatal.com/api/generar-informe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-origen-interno': clave },
    body: JSON.stringify({ session_id: sessionId }),
    // Cinco segundos para entregar la peticion. Lo que tarde el informe en
    // escribirse ya no es cosa de aqui, asi que cortar la espera no lo para.
    signal: AbortSignal.timeout(5000),
  }).catch(err => {
    // Un corte por tiempo es lo normal y lo esperado: significa que la
    // peticion llego y el informe se esta haciendo.
    if (err.name === 'TimeoutError' || err.name === 'AbortError') return null;
    throw err;
  });
}

// COMO VA UNA COMPRA. Se trae de Stripe y se lee su estado: si ya se genero,
// si el correo salio, si se esta generando ahora mismo. Y de paso se queda con
// lo que la compra trae escrito de esa persona: sus datos de nacimiento son lo
// que hace falta para sacarle el informe a mano si un dia hay que hacerlo.
async function comoVa(compra) {
  const session = await stripe.checkout.sessions.retrieve(compra);
  return { ...estado(session), datos: session.metadata || {} };
}

// SUS DATOS, COMO VAN EN EL AVISO. Salen de la compra, que es donde quedaron
// escritos al pagar.
function comoNacio(datos = {}) {
  const lugar = [datos.municipio, datos.provincia, datos.pais].filter(Boolean).join(', ');
  return {
    telefono: datos.telefono || '',
    sexo: datos.sexo || '',
    nacimiento: `${datos.fecha || '-'} a las ${datos.hora || '-'} en ${lugar || '-'}`,
  };
}

// ── VOLVER A MANDARLO, SIN ESCRIBIR NADA NUEVO ───────────────────
//
// El informe ya esta escrito y guardado: sus siete areas y sus rasgos estan en
// su fichero, y sus datos y su carta en el de su email. Con eso se vuelve a
// montar el PDF y se manda. No se llama al modelo ni una sola vez.
//
// NO SE ESPERA A QUE TERMINE, igual que al arrancar un informe: montar el PDF
// lleva su rato y esta puerta no puede quedarse ahi. Si sale, la compra queda
// marcada como enviada y en la vuelta siguiente se le quita de pendientes.
async function volverAMandarlo(ficha) {
  const clave = process.env.STRIPE_WEBHOOK_SECRET;
  if (!clave) throw new Error('Falta STRIPE_WEBHOOK_SECRET');

  const informe = await leerInforme({ producto: 'p1', sessionId: ficha.compra });
  if (!informe || !Array.isArray(informe.areas) || !informe.areas.length) {
    throw new Error('no hay informe guardado con el que volver a montarlo');
  }

  const suFicha = await leerLaFicha(ficha.email || informe.cliente?.email || '');
  const cliente = suFicha && suFicha.cliente ? suFicha.cliente : null;
  if (!cliente || !cliente.nombre || !suFicha.carta) {
    throw new Error('no estan sus datos o su carta para volver a montarlo');
  }

  return fetch('https://origennatal.com/api/generar-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-origen-interno': clave },
    body: JSON.stringify({
      session_id: ficha.compra,
      nombre: cliente.nombre,
      sexo: cliente.sexo || '',
      fechaNice: cliente.fecha || '',
      hora: cliente.hora || '',
      lugar: cliente.lugar || '',
      edad: cliente.edad || '',
      carta: suFicha.carta,
      areas: informe.areas,
      rasgos: informe.rasgos || null,
    }),
    signal: AbortSignal.timeout(5000),
  }).catch(err => {
    // Un corte por tiempo es lo normal: la peticion llego y el PDF se esta
    // montando al otro lado.
    if (err.name === 'TimeoutError' || err.name === 'AbortError') return null;
    throw err;
  });
}

export default async function handler(req, res) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    console.error('[p1] Sin CRON_SECRET: el reintento no se ejecuta');
    return res.status(500).json({ error: 'Sin llave' });
  }
  if (req.headers.authorization !== `Bearer ${secreto}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  // SE COMPRUEBA ANTES DE TOCAR NADA. Sin la llave interna no se puede
  // arrancar ningun informe, y un intento que no se llega a lanzar no puede
  // darse por gastado: si no, una variable mal puesta se comeria los tres.
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[p1] Sin STRIPE_WEBHOOK_SECRET: no se puede arrancar ningun informe');
    return res.status(500).json({ error: 'Sin llave interna' });
  }

  let fichas;
  try {
    fichas = await losPendientes();
  } catch (err) {
    console.error('[p1] No se ha podido leer la lista de pendientes:', err.message);
    return res.status(500).json({ error: 'No se ha podido mirar' });
  }

  const ahora = Date.now();

  // ── LOS QUE YA ESTAN ESCRITOS Y SOLO FALTA MANDARLOS ─────────────
  //
  // El informe salio, se guardo, y lo que fallo fue el correo. Eso no se
  // arregla escribiendolo otra vez -seria pagar dos veces por lo mismo y
  // darle un informe distinto del que ya esta guardado-: se vuelve a montar
  // el PDF con lo guardado y se manda, y ya esta.
  //
  // DOS VECES Y NO MAS. Si a las dos sigue sin salir, se le dice a la clienta
  // que lo estamos revisando y nos llega el aviso para mandarlo a mano.
  //
  // SE MIRA COMO VA CADA UNO, uno por uno: la lista de pendientes es corta y
  // esto es lo unico que dice si un informe esta escrito o no.
  for (const ficha of [...fichas].sort((a, b) => Number(a.creado || 0) - Number(b.creado || 0))) {
    if (!ficha.compra) continue;

    let st;
    try {
      st = await comoVa(ficha.compra);
    } catch (err) {
      console.error(`[p1] No se ha podido mirar como va ${ficha.compra}:`, err.message);
      continue;
    }

    // Su correo salio: ya no esta pendiente de nada.
    if (st.emailEnviado) {
      await quitarPendiente(ficha.compra);
      console.log(`[p1] ${ficha.compra} ya estaba entregado: fuera de pendientes`);
      return res.status(200).json({ mirados: fichas.length, hecho: 0, yaEstaba: ficha.compra });
    }

    // Todavia no esta escrito, o se esta escribiendo: no es cosa de aqui.
    if (!st.completado || st.ocupada) continue;

    const entregas = Number(ficha.entregas || 0);

    if (entregas < MAX_ENTREGAS) {
      // SE APUNTA LA VEZ ANTES DE LANZARLA, igual que con los reintentos: si
      // esto fallara, vale mas dejarlo para la vuelta siguiente que mandar sin
      // poder contar las veces.
      try {
        await guardarPendiente({ ...ficha, entregas: entregas + 1, ultimo: ahora });
      } catch (err) {
        console.error(`[p1] No se ha podido apuntar la entrega de ${ficha.compra}:`, err.message);
        return res.status(500).json({ error: 'No se ha podido apuntar la entrega' });
      }
      try {
        await volverAMandarlo(ficha);
        console.log(`[p1] Entrega ${entregas + 1} lanzada: ${ficha.compra}`);
        return res.status(200).json({ mirados: fichas.length, hecho: 0, reenviado: ficha.compra, entregas: entregas + 1 });
      } catch (err) {
        console.error(`[p1] La entrega ${entregas + 1} no se ha podido lanzar (${ficha.compra}):`, err.message);
        continue;
      }
    }

    // SE ACABARON LAS ENTREGAS y su correo sigue sin salir. Se le avisa a ella
    // y a nosotros, con su informe ya escrito y guardado esperando.
    if (!ficha.avisado) {
      try {
        await correoRevisando({ email: ficha.email, nombre: ficha.nombre });
        await correoALaTienda({
          compra: ficha.compra,
          email: ficha.email,
          nombre: ficha.nombre,
          ...comoNacio(st.datos),
          intentos: Number(ficha.intentos || 0),
          motivo: `Su informe ESTA escrito y guardado; lo que no ha salido es el correo, tras ${entregas} entregas`,
        });
        await guardarPendiente({ ...ficha, avisado: true, avisadoEn: Date.now() });
        console.error(`[p1] Escrito y sin poder entregar: ${ficha.compra}`);
        return res.status(200).json({ mirados: fichas.length, hecho: 0, sinEntregar: ficha.compra });
      } catch (err) {
        console.error(`[p1] No se ha podido avisar de ${ficha.compra}:`, err.message);
        return res.status(500).json({ error: 'No se ha podido avisar' });
      }
    }
  }

  // ── LOS QUE YA NO TIENEN MAS INTENTOS ────────────────────────────
  //
  // Se les dio el ultimo hace rato y siguen sin entregarse. Se mira si salio
  // -puede haber salido despues- y, si no, se le dice a la clienta que lo
  // estamos revisando y nos lo decimos a nosotros para sacarlo a mano.
  //
  // UNO POR VUELTA, igual que los reintentos. Y si el correo no sale, no se
  // marca como avisado: se vuelve a intentar en la siguiente vuelta.
  const paraCerrar = fichas
    .filter(f => f.compra && f.acabado && !f.avisado)
    .filter(f => ahora - Number(f.ultimo || f.creado || 0) >= CIERRE_MS)
    .sort((a, b) => Number(a.creado || 0) - Number(b.creado || 0));

  if (paraCerrar.length) {
    const ficha = paraCerrar[0];
    try {
      const st = await comoVa(ficha.compra);
      if (st.emailEnviado) {
        await quitarPendiente(ficha.compra);
        console.log(`[p1] ${ficha.compra} acabo saliendo: fuera de pendientes`);
        return res.status(200).json({ mirados: fichas.length, hecho: 0, yaEstaba: ficha.compra });
      }
      // Escrito y sin entregar: de eso se encarga la entrega de mas arriba.
      if (st.completado) {
        console.log(`[p1] ${ficha.compra} esta escrito y sin entregar: lo lleva la entrega`);
        return res.status(200).json({ mirados: fichas.length, hecho: 0, sinEntregar: ficha.compra });
      }
      if (st.ocupada) {
        console.log(`[p1] ${ficha.compra} todavia se esta generando: se mira en la proxima vuelta`);
        return res.status(200).json({ mirados: fichas.length, hecho: 0, ocupada: ficha.compra });
      }

      await correoRevisando({ email: ficha.email, nombre: ficha.nombre });
      await correoALaTienda({
        compra: ficha.compra,
        email: ficha.email,
        nombre: ficha.nombre,
        ...comoNacio(st.datos),
        intentos: Number(ficha.intentos || 0),
        motivo: 'Se agotaron los intentos y el informe sigue sin entregarse',
      });
      await guardarPendiente({ ...ficha, avisado: true, avisadoEn: Date.now() });
      console.error(`[p1] Sin informe tras ${ficha.intentos} intentos, avisados: ${ficha.compra}`);
      return res.status(200).json({ mirados: fichas.length, hecho: 0, avisado: ficha.compra });

    } catch (err) {
      console.error(`[p1] No se ha podido cerrar ${ficha.compra}:`, err.message);
      return res.status(500).json({ error: 'No se ha podido cerrar' });
    }
  }

  const leToca = fichas
    .filter(f => !f.acabado && f.compra)
    .filter(f => {
      const intentos = Number(f.intentos || 0);
      return intentos < CUANDO.length && ahora - Number(f.creado || 0) >= CUANDO[intentos];
    })
    .sort((a, b) => Number(a.creado || 0) - Number(b.creado || 0));

  if (!leToca.length) {
    return res.status(200).json({ mirados: fichas.length, hecho: 0 });
  }

  const ficha = leToca[0];

  // ¿YA LO TIENE? Si su informe salio mientras tanto, deja de estar pendiente
  // y aqui no se toca nada mas.
  try {
    const st = await comoVa(ficha.compra);
    if (st.emailEnviado) {
      await quitarPendiente(ficha.compra);
      console.log(`[p1] ${ficha.compra} ya estaba entregado: fuera de pendientes`);
      return res.status(200).json({ mirados: fichas.length, hecho: 0, yaEstaba: ficha.compra });
    }
    // Escrito y sin entregar: no se escribe otra vez, lo lleva la entrega.
    if (st.completado) {
      console.log(`[p1] ${ficha.compra} esta escrito y sin entregar: no se genera otra vez`);
      return res.status(200).json({ mirados: fichas.length, hecho: 0, sinEntregar: ficha.compra });
    }
    // Y SI SE ESTA GENERANDO AHORA MISMO, no se toca: se deja pasar esta
    // vuelta y se mira en la siguiente.
    if (st.ocupada) {
      console.log(`[p1] ${ficha.compra} se esta generando ahora mismo: se deja para la proxima vuelta`);
      return res.status(200).json({ mirados: fichas.length, hecho: 0, ocupada: ficha.compra });
    }
  } catch (err) {
    console.error(`[p1] No se ha podido mirar como va ${ficha.compra}:`, err.message);
    return res.status(500).json({ error: 'No se ha podido mirar la compra' });
  }

  const intentos = Number(ficha.intentos || 0) + 1;
  const seAcabo = intentos >= CUANDO.length;

  // SE APUNTA EL INTENTO ANTES DE LANZARLO. Si esto fallara, no se lanza:
  // vale mas dejarlo para la vuelta siguiente que arrancar sin poder contar
  // las veces y acabar reintentando sin fin.
  try {
    await guardarPendiente({ ...ficha, intentos, ultimo: ahora, acabado: seAcabo });
  } catch (err) {
    console.error(`[p1] No se ha podido apuntar el intento de ${ficha.compra}:`, err.message);
    return res.status(500).json({ error: 'No se ha podido apuntar el intento' });
  }

  try {
    await arrancarElInforme(ficha.compra);
    console.log(`[p1] Reintento ${intentos} lanzado: ${ficha.compra}`);
  } catch (err) {
    console.error(`[p1] Reintento ${intentos} no se ha podido lanzar (${ficha.compra}):`, err.message);
    return res.status(500).json({ error: 'No se ha podido lanzar' });
  }

  if (seAcabo) {
    console.error(`[p1] Se acabaron los reintentos: ${ficha.compra}`);
  }

  return res.status(200).json({ mirados: fichas.length, hecho: 1, compra: ficha.compra, intentos });
}
