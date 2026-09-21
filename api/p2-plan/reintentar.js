// ═════════════════════════════════════════════════════════════════
// /api/p2-plan/reintentar.js
// Vuelve a intentar los planes del P2 que no han llegado, por detras.
//
// COMO FUNCIONA. El reloj llama a esta puerta cada cuarto de hora. Ella mira
// quien sigue esperando en p2/pendientes/ y coge al que le toque.
//
// DOS COSAS DISTINTAS, Y NO CUESTAN LO MISMO:
//
//   · VOLVER A MANDARLO. Su plan ya esta escrito y guardado; lo que fallo fue
//     el correo. Eso no se arregla escribiendolo otra vez -seria pagarlo dos
//     veces y darle un documento distinto del que ya tiene guardado-: se
//     vuelve a montar su PDF con lo que hay y se manda. No cuesta ni una
//     llamada al modelo, asi que no gasta ninguno de los reintentos.
//     DOS VECES Y NO MAS.
//
//   · VOLVER A MONTARLO. Su plan no llego a salir. Eso si se paga, asi que se
//     cuenta: el primero a los diez minutos, el segundo a las tres horas. Con
//     el del cobro son tres en total. Los mismos que el P1, y por lo mismo: el
//     primero recoge el tropiezo del momento, que es lo que pasa casi siempre;
//     el segundo cubre una caida larga.
//
// UNO POR VUELTA, y el que lleva mas tiempo esperando. Con una vuelta cada
// quince minutos hay de sobra, y asi dos planes no se montan a la vez.
//
// ANTES DE GASTAR NADA SE MIRA SI YA LO TIENE. Entre que se apunto y ahora
// puede haber salido: en ese caso se le quita de la lista y no se gasta ni un
// centimo en repetirlo.
//
// CERRADA CON LLAVE. Solo entra quien traiga CRON_SECRET, que es lo que manda
// el reloj. Igual que el reintento del P1 y el del regalo.
//
// SOLO DEL P2. No mira ni toca nada del P1 ni del regalo.
// ═════════════════════════════════════════════════════════════════

import { leerElPlan, losPendientes, guardarElPendiente, quitarElPendiente } from './almacen.js';
import { mandarSuPlan } from './correo.js';

const UN_MINUTO = 60 * 1000;
const UNA_HORA = 60 * UN_MINUTO;

// Cuanto hay que esperar desde que empezo para cada vez que se vuelve a
// montar. Los mismos que el P1.
const CUANDO = [10 * UN_MINUTO, 3 * UNA_HORA];

// Veces que se vuelve a intentar SOLO LA ENTREGA, cuando el plan ya esta
// escrito y guardado y lo unico que fallo fue el correo.
const MAX_ENTREGAS = 2;

const NUESTRA_WEB = 'https://origennatal.com';

// ── DARLE AL BOTON DE ARRANQUE ───────────────────────────────────
//
// Es la misma llamada que hace el aviso del cobro. No se espera a que termine
// -tarda minutos y esta puerta no puede quedarse ahi-: basta con que la
// peticion salga. Al otro lado, el arranque sigue su camino aunque aqui ya se
// haya contestado.
function volverAMontarlo(compra) {
  const clave = process.env.STRIPE_WEBHOOK_SECRET;
  if (!clave) throw new Error('Falta STRIPE_WEBHOOK_SECRET');

  return fetch(`${NUESTRA_WEB}/api/p2-plan/arranque`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-origen-interno': clave },
    body: JSON.stringify({ compra }),
    // Cinco segundos para entregar la peticion. Lo que tarde el plan en
    // montarse ya no es cosa de aqui, asi que cortar la espera no lo para.
    signal: AbortSignal.timeout(5000),
  }).catch(err => {
    // Un corte por tiempo es lo normal y lo esperado: significa que la
    // peticion llego y el plan se esta montando.
    if (err.name === 'TimeoutError' || err.name === 'AbortError') return null;
    throw err;
  });
}

export default async function handler(req, res) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    console.error('[p2] Sin CRON_SECRET: el reintento no se ejecuta');
    return res.status(500).json({ error: 'Sin llave' });
  }
  if (req.headers.authorization !== `Bearer ${secreto}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  // SE COMPRUEBA ANTES DE TOCAR NADA. Sin la llave interna no se puede
  // arrancar ningun plan, y un intento que no se llega a lanzar no puede
  // darse por gastado: si no, una variable mal puesta se comeria los dos.
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[p2] Sin STRIPE_WEBHOOK_SECRET: no se puede arrancar ningun plan');
    return res.status(500).json({ error: 'Sin llave interna' });
  }

  let fichas;
  try {
    fichas = await losPendientes();
  } catch (err) {
    console.error('[p2] No se ha podido leer la lista de los que esperan:', err.message);
    return res.status(500).json({ error: 'No se ha podido mirar' });
  }

  const ahora = Date.now();
  const porAntiguedad = (a, b) => Number(a.creado || 0) - Number(b.creado || 0);

  // ── LOS QUE YA ESTAN ESCRITOS Y SOLO FALTA MANDARLOS ─────────────
  //
  // Su plan salio y se guardo, y lo que fallo fue el correo. Se vuelve a
  // montar su PDF con lo guardado y se manda. Sin llamar al modelo.
  for (const ficha of [...fichas].sort(porAntiguedad)) {
    if (!ficha.compra) continue;

    let guardado;
    try {
      guardado = await leerElPlan(ficha.compra);
    } catch (err) {
      console.error(`[p2] No se ha podido mirar el plan de ${ficha.compra}:`, err.message);
      continue;
    }

    // Todavia no esta escrito: eso lo lleva la parte de abajo.
    if (!guardado || !guardado.documento) continue;

    const entregas = Number(ficha.entregas || 0);
    if (entregas >= MAX_ENTREGAS) continue;

    // SE APUNTA LA VEZ ANTES DE LANZARLA: si esto fallara, vale mas dejarlo
    // para la vuelta siguiente que mandar sin poder contar las veces.
    try {
      await guardarElPendiente({ ...ficha, entregas: entregas + 1, ultimo: ahora });
    } catch (err) {
      console.error(`[p2] No se ha podido apuntar la entrega de ${ficha.compra}:`, err.message);
      return res.status(500).json({ error: 'No se ha podido apuntar la entrega' });
    }

    try {
      const { email } = await mandarSuPlan({ compra: ficha.compra, documento: guardado.documento });
      await quitarElPendiente(ficha.compra);
      console.log(`[p2] Entrega ${entregas + 1} hecha: ${ficha.compra} hacia ${email}`);
      return res.status(200).json({ mirados: fichas.length, entregado: ficha.compra, entregas: entregas + 1 });
    } catch (err) {
      console.error(`[p2] La entrega ${entregas + 1} no ha salido (${ficha.compra}):`, err.message);
      return res.status(200).json({ mirados: fichas.length, sinEntregar: ficha.compra, entregas: entregas + 1 });
    }
  }

  // ── Y LOS QUE NI SIQUIERA ESTAN ESCRITOS ─────────────────────────
  //
  // Su plan no llego a salir. Se vuelve a montar, y esto si se paga: por eso
  // se cuenta y por eso se espera lo que se espera antes de cada vez.
  const leToca = [...fichas]
    .filter(f => f.compra)
    .filter(f => {
      const intentos = Number(f.intentos || 0);
      return intentos < CUANDO.length && ahora - Number(f.creado || 0) >= CUANDO[intentos];
    })
    .sort(porAntiguedad);

  if (!leToca.length) {
    return res.status(200).json({ mirados: fichas.length, hecho: 0 });
  }

  const ficha = leToca[0];

  // ¿YA LO TIENE? Entre que se apunto y ahora puede haber salido. Aqui no se
  // gasta un centimo en repetir lo que ya esta.
  try {
    const guardado = await leerElPlan(ficha.compra);
    if (guardado && guardado.documento) {
      console.log(`[p2] ${ficha.compra} ya esta escrito: lo lleva la entrega`);
      return res.status(200).json({ mirados: fichas.length, hecho: 0, yaEstaba: ficha.compra });
    }
  } catch (err) {
    console.error(`[p2] No se ha podido mirar si ${ficha.compra} ya lo tenia:`, err.message);
    return res.status(500).json({ error: 'No se ha podido mirar' });
  }

  const intentos = Number(ficha.intentos || 0);

  // SE APUNTA EL INTENTO ANTES DE LANZARLO. Si se apuntara despues y algo
  // fallara por el camino, la vuelta siguiente volveria a intentarlo sin
  // haberlo contado, y se acabarian gastando mas de los que hay.
  try {
    await guardarElPendiente({ ...ficha, intentos: intentos + 1, ultimo: ahora });
  } catch (err) {
    console.error(`[p2] No se ha podido apuntar el intento de ${ficha.compra}:`, err.message);
    return res.status(500).json({ error: 'No se ha podido apuntar el intento' });
  }

  try {
    await volverAMontarlo(ficha.compra);
    console.log(`[p2] Intento ${intentos + 1} lanzado: ${ficha.compra}`);
    return res.status(200).json({ mirados: fichas.length, hecho: 1, compra: ficha.compra, intentos: intentos + 1 });
  } catch (err) {
    console.error(`[p2] El intento ${intentos + 1} no se ha podido lanzar (${ficha.compra}):`, err.message);
    return res.status(500).json({ error: 'No se ha podido lanzar el intento' });
  }
}
