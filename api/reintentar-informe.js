// ═════════════════════════════════════════════════════════════════
// /api/reintentar-informe.js
// Vuelve a lanzar los informes del P1 que no salieron, por detras.
//
// COMO FUNCIONA. Vercel llama a esta puerta cada cuarto de hora. Ella mira
// quien hay apuntado en p1/pendientes/ y coge al que le toque:
//
//   · el 1º reintento, diez minutos despues de pagar
//   · el 2º, a la hora
//   · el 3º, a las tres horas
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const UN_MINUTO = 60 * 1000;
const UNA_HORA = 60 * UN_MINUTO;

// Cuanto hay que esperar desde el cobro para cada reintento.
const CUANDO = [10 * UN_MINUTO, 1 * UNA_HORA, 3 * UNA_HORA];

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
    const st = await estado(stripe, ficha.compra);
    if (st.completado || st.emailEnviado) {
      await quitarPendiente(ficha.compra);
      console.log(`[p1] ${ficha.compra} ya estaba entregado: fuera de pendientes`);
      return res.status(200).json({ mirados: fichas.length, hecho: 0, yaEstaba: ficha.compra });
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
