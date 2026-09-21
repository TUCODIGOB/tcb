// ═════════════════════════════════════════════════════════════════
// /api/p2-plan/brevo.js
// Dejar dicho en Brevo que esta clienta ha comprado el P2.
//
// QUE HACE. Dos cosas, y las dos tienen que salir:
//   · la mete en la lista 13, la del P2 comprado, con el atributo P2_COMPRADO
//   · y la saca de la 3, la del P1 comprado, para que no este en las dos
//
// POR QUE EN DOS LLAMADAS. El alta de un contacto solo sabe meter en listas,
// no sacar de ellas. Sacarla va aparte.
//
// PRIMERO METER Y DESPUES SACAR. Al reves, si el alta no entrara se quedaria
// sin ninguna lista.
//
// Y SI ALGUNA DE LAS DOS NO SALE, NO SE DA POR HECHO. Queda apuntada en la
// carpeta del P2 y el reloj del P2 lo vuelve a intentar entero cada vuelta.
// Repetirlo no hace dano: meterla donde ya esta y sacarla de donde ya no esta
// no cambian nada. Deja de estar apuntada cuando las dos han salido bien.
//
// NO PUEDE CORTAR NADA. Su plan es lo que ha pagado; esto es la copia para el
// marketing y va por detras.
//
// SOLO DEL P2. Su carpeta, su reloj y su apunte. No toca ni una lista ni un
// atributo del P1: el suyo, P1_COMPRADO, se queda en su ficha como estaba.
// ═════════════════════════════════════════════════════════════════

import { leerInforme } from '../../lib/guardar-informe.js';
import { apuntarLoDeBrevo, quitarLoDeBrevo } from './almacen.js';

// Las listas de Brevo, con el nombre que tienen alli.
const LA_DEL_P2 = 13; // "4 P2-comprado"
const LA_DEL_P1 = 3;  // "2 P1-comprado"

// Veces que se prueba en total. Con una vuelta cada cuarto de hora son mas de
// dos horas: si en ese rato Brevo no lo ha cogido, no es un tropiezo y seguir
// llamando no lo va a arreglar. El apunte se queda, para poder verlo.
export const MAX_VECES = 8;

// Lo que se espera a Brevo. Esto va por detras, sin nadie mirando la pantalla,
// pero el reloj tiene su limite de tiempo y no puede quedarse aqui colgado.
const TOPE_MS = 8000;

function cabeceras(apiKey) {
  return { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': apiKey };
}

// ── METERLA EN LA SUYA ────────────────────────────────────────
//
// Solo el atributo del P2. Los que ya tenga -su nombre, su nacimiento, el
// P1_COMPRADO- no se tocan: Brevo los deja como estaban.
async function meterlaEnLaDelP2(email, apiKey) {
  const resp = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: cabeceras(apiKey),
    body: JSON.stringify({
      email,
      attributes: { P2_COMPRADO: 'si' },
      listIds: [LA_DEL_P2],
      updateEnabled: true,
    }),
    signal: AbortSignal.timeout(TOPE_MS),
  });
  if (!resp.ok) {
    throw new Error(`no ha entrado en la lista ${LA_DEL_P2} (Brevo ${resp.status}): ${(await resp.text()).slice(0, 200)}`);
  }
}

// ── Y SACARLA DE LA DEL P1 ────────────────────────────────────
async function sacarlaDeLaDelP1(email, apiKey) {
  const resp = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: cabeceras(apiKey),
    body: JSON.stringify({ unlinkListIds: [LA_DEL_P1] }),
    signal: AbortSignal.timeout(TOPE_MS),
  });
  if (!resp.ok) {
    throw new Error(`no ha salido de la lista ${LA_DEL_P1} (Brevo ${resp.status}): ${(await resp.text()).slice(0, 200)}`);
  }
}

// ── DE QUIEN ES ESTA COMPRA ───────────────────────────────────
//
// Su email sale de su informe del P1, que es el mismo con el que esta dada de
// alta en Brevo: si se cogiera el del cobro y hubiera puesto otro, se crearia
// un contacto nuevo y el suyo se quedaria en la lista del P1 para siempre.
async function suEmail(compra) {
  const informe = await leerInforme({ producto: 'p1', sessionId: compra });
  return String(informe?.cliente?.email || '').trim();
}

// ── Y SE DEJA DICHO ───────────────────────────────────────────
//
// Devuelve true solo si las dos cosas han salido. Nunca lanza: quien llama
// -el aviso del cobro o el reloj- no puede romperse por esto.
//
// intentos = las veces que ya se ha probado antes de esta.
// creado   = cuando se apunto la primera vez, para no perderlo al reintentar.
export async function marcarLaCompraDelP2({ compra, intentos = 0, creado }) {
  const yaVan = Number(intentos) || 0;
  const desdeCuando = Number(creado) || Date.now();

  const noHaPodido = async motivo => {
    console.error(`[p2] Las listas de ${compra} no han quedado bien: ${motivo}`);
    const van = yaVan + 1;
    try {
      await apuntarLoDeBrevo({
        compra,
        // CUANDO EMPEZO, no cuando ha fallado esta vez: es por lo que el reloj
        // atiende antes a la que lleva mas tiempo a medias.
        creado: desdeCuando,
        intentos: van,
        motivo: String(motivo).slice(0, 300),
        // SE DEJA DE PROBAR, PERO NO DE CONSTAR. La ficha se queda apuntada
        // con lo que paso, para poder verlo y arreglarlo a mano.
        ...(van >= MAX_VECES ? { rendido: true } : {}),
      });
      if (van >= MAX_VECES) {
        console.error(`[p2] ${compra} se queda con las listas a medias tras ${van} veces: hay que mirarlo a mano`);
      }
    } catch (err) {
      console.error(`[p2] Y tampoco se ha podido apuntar lo de ${compra}:`, err.message);
    }
    return false;
  };

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    console.error('[p2] Sin BREVO_API_KEY: no se marca la compra del P2');
    return false;
  }

  let email = '';
  try {
    email = await suEmail(compra);
  } catch (err) {
    return noHaPodido('no se ha podido leer su informe: ' + err.message);
  }
  if (!email) {
    // Sin email no hay contacto que mover, y volver a intentarlo no lo va a
    // cambiar. Se dice y no se apunta nada.
    console.error(`[p2] ${compra} no tiene email: no se marca la compra en Brevo`);
    return false;
  }

  try {
    await meterlaEnLaDelP2(email, BREVO_API_KEY);
  } catch (err) {
    // NO SE LA SACA DE LA 3 SI NO HA ENTRADO EN LA 13: se quedaria sin
    // ninguna lista.
    return noHaPodido(err.message);
  }

  try {
    await sacarlaDeLaDelP1(email, BREVO_API_KEY);
  } catch (err) {
    return noHaPodido(err.message);
  }

  // LAS DOS HAN SALIDO. Si quedaba algo apuntado de un intento anterior, deja
  // de constar. Si esto fallara, el reloj lo volveria a probar y se
  // encontraria con que ya esta todo en su sitio.
  try {
    await quitarLoDeBrevo(compra);
  } catch (err) {
    console.error(`[p2] No se ha podido quitar el apunte de las listas de ${compra}:`, err.message);
  }
  return true;
}
