// ═════════════════════════════════════════════════════════════════
// /api/p2-plan/brevo.js
// Dejar dicho en Brevo que esta clienta ha comprado el P2.
//
// QUE HACE. Tres cosas y ninguna mas:
//   · la mete en la lista 13, la del P2 comprado
//   · le pone el atributo P2_COMPRADO
//   · y la saca de la 3, la del P1 comprado, para que no este en las dos
//
// POR QUE EN DOS PASOS. El alta de un contacto solo sabe meter en listas, no
// sacar de ellas. Sacarla va en otra llamada, igual que ya hace el P1 para
// sacarla del carrito abandonado.
//
// PRIMERO METER Y DESPUES SACAR. Si fallara el orden contrario y el alta no
// entrara, se quedaria sin ninguna lista. Asi, lo peor que puede pasar es que
// se quede un rato en las dos, que se ve y se arregla.
//
// NO PUEDE CORTAR NADA. Su plan es lo que ha pagado; esto es la copia para el
// marketing. Si Brevo no contesta, el alta queda apuntada y el reloj que ya
// existe -/api/brevo-pendientes- la reintenta a los 15 minutos, a la hora y a
// las tres horas. Lo de sacarla de la 3 no se reintenta: es una lista sin
// limpiar, no un contacto perdido.
//
// SOLO DEL P2. No toca ni una lista ni un atributo del P1: el suyo,
// P1_COMPRADO, se queda en su ficha como estaba.
// ═════════════════════════════════════════════════════════════════

import { leerInforme } from '../../lib/guardar-informe.js';
import { guardarContactoEnBrevo, apuntarPendiente } from '../../lib/brevo-contactos.js';

// Las listas de Brevo, con el nombre que tienen alli.
const LA_DEL_P2 = 13; // "4 P2-comprado"
const LA_DEL_P1 = 3;  // "2 P1-comprado"

export async function marcarLaCompraDelP2({ compra }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    console.error('[p2] Sin BREVO_API_KEY: no se marca la compra del P2');
    return false;
  }

  // A QUIEN. Su email sale de su informe del P1, que es el mismo con el que
  // esta dada de alta en Brevo: si se cogiera el del cobro y hubiera puesto
  // otro, se crearia un contacto nuevo y el suyo se quedaria en la lista del
  // P1 para siempre.
  let email = '';
  try {
    const informe = await leerInforme({ producto: 'p1', sessionId: compra });
    email = String(informe?.cliente?.email || '').trim();
  } catch (err) {
    console.error(`[p2] No se ha podido mirar de quién es ${compra}:`, err.message);
    return false;
  }
  if (!email) {
    console.error(`[p2] ${compra} no tiene email: no se marca la compra en Brevo`);
    return false;
  }

  // ── A LA LISTA DEL P2, CON SU ATRIBUTO ───────────────────────
  //
  // Solo el atributo del P2. Los que ya tenga -su nombre, su nacimiento, el
  // P1_COMPRADO- no se tocan: Brevo los deja como estaban.
  const body = {
    email,
    attributes: { P2_COMPRADO: 'si' },
    listIds: [LA_DEL_P2],
    updateEnabled: true,
  };

  try {
    await guardarContactoEnBrevo(body, BREVO_API_KEY, 8000);
  } catch (err) {
    // SI NO ENTRA AHORA, ENTRA DESPUES. Se apunta y el reloj lo reintenta.
    await apuntarPendiente(body, err.message);
    console.error(`[p2] Brevo no ha aceptado la compra de ${compra}:`, err.message);
    return false;
  }

  // ── Y FUERA DE LA DEL P1 ─────────────────────────────────────
  //
  // Ya esta en la del P2, asi que la del P1 sobra. Si esto falla no se corta
  // nada: queda en las dos listas y se arregla a mano.
  try {
    const quitar = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({ unlinkListIds: [LA_DEL_P1] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!quitar.ok) {
      console.error(`[p2] No se ha podido sacar de la lista del P1 (${quitar.status}):`, (await quitar.text()).slice(0, 200));
    }
  } catch (err) {
    console.error('[p2] No se ha podido sacar de la lista del P1:', err.message);
  }

  return true;
}
