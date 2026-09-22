// ═════════════════════════════════════════════════════════════════
// /api/p2-plan/analitica.js
// Apuntar en Google Analytics que se ha vendido un P2.
//
// PARA QUE. Sin esto se vende a ciegas: no se sabe cuanta gente entra en la
// landing, cuantas compran, ni si un cambio la mejora o la empeora.
//
// POR QUE DESDE EL SERVIDOR Y NO DESDE LA PAGINA. Lo que cuenta es el dinero
// cobrado, y eso solo lo sabe Stripe. Una venta apuntada desde el navegador se
// pierde si la clienta cierra antes de que cargue, y se cuenta dos veces si
// recarga la pantalla de gracias. Esto se apunta una vez, cuando el cobro esta
// confirmado. Es lo mismo que hace el P1.
//
// PEGADA A SU VISITA. En el cobro viaja el numero que Analytics le puso a esa
// visitante. Con el, Google sabe que esta venta sale de esa visita y de por
// donde llego. Si no viniera, la venta se apunta igual pero suelta.
//
// LO QUE VALIO, DE VERDAD. El importe sale de lo que Stripe cobro, no de un
// numero escrito aqui: asi, si se cambia el precio o se usa un cupon, lo
// apuntado es lo que de verdad entro.
//
// NO PUEDE CORTAR NADA. Su plan es lo que ha pagado; esto es una anotacion. Si
// Google no contesta, se deja aviso y se sigue.
//
// SOLO DEL P2. Su carpeta y su venta. No toca lo del P1.
// ═════════════════════════════════════════════════════════════════

import crypto from 'crypto';

// La misma propiedad de Analytics que el resto de la web.
const MEDIDOR = 'G-EJSDFDFZ3G';

// Diez segundos. Esto va por detras, pero no puede quedarse colgado.
const TOPE_MS = 10000;

export async function apuntarLaVenta(session) {
  const GA4_API_SECRET = process.env.GA4_API_SECRET;
  if (!GA4_API_SECRET) {
    console.error('[p2] Sin GA4_API_SECRET: la venta no se apunta en Analytics');
    return false;
  }

  const compra = String(session?.id || '').trim();
  if (!compra) {
    console.error('[p2] Una venta sin numero no se puede apuntar en Analytics');
    return false;
  }

  // LO QUE SE COBRO, en euros. Stripe lo da en centimos.
  const cobrado = Number(session?.amount_total);
  const cuanto = Number.isFinite(cobrado) ? cobrado / 100 : 0;
  const moneda = String(session?.currency || 'eur').toUpperCase();

  // DE QUE VISITA SALE. Si no viene, Google pide uno igualmente: se le da uno
  // de usar y tirar para que la venta no se pierda, aunque quede suelta.
  const visita = String(session?.metadata?.visita || '').trim();

  try {
    const resp = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${MEDIDOR}&api_secret=${GA4_API_SECRET}`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(TOPE_MS),
        body: JSON.stringify({
          client_id: visita || crypto.randomUUID(),
          events: [{
            name: 'purchase',
            params: {
              // El numero de la compra. Si este aviso llegara repetido, Google
              // ve el mismo y no la cuenta dos veces.
              transaction_id: compra,
              value: cuanto,
              currency: moneda,
            },
          }],
        }),
      }
    );

    if (!resp.ok) {
      console.error(`[p2] Analytics ${resp.status} al apuntar la venta: ${(await resp.text()).slice(0, 200)}`);
      return false;
    }
    console.log(`[p2] Venta apuntada en Analytics: ${compra} (${cuanto} ${moneda})`);
    return true;
  } catch (err) {
    console.error('[p2] No se ha podido apuntar la venta en Analytics:', err.message);
    return false;
  }
}
