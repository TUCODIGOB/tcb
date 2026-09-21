// ═════════════════════════════════════════════════════════════════
// /api/p2-plan/pagar.js
// Abre el cobro del P2.
//
// QUE COBRA. El P2, su precio y su producto, creados en el panel de Stripe.
// El importe y lo que ve la clienta al pagar salen de ahi, no de aqui.
//
// Y QUE LLEVA DENTRO. El numero de la compra de su P1. El pago es del P2, pero
// ese numero es lo unico que le dice despues al servidor DE QUE INFORME sacar
// su plan: sin el, al cobrar no se sabria a quien hacerselo.
//
// SIN P1 NO HAY P2. Antes de abrir el cobro se comprueba que ese informe existe
// de verdad. Un plan se escribe con lo que dice su informe del P1, asi que
// cobrar sin el seria cobrar por algo que no se puede entregar.
//
// SU EMAIL YA LO SABEMOS. Va puesto en el cobro, sacado de su propio informe,
// para que no tenga que escribirlo otra vez.
//
// POR QUE NO ESTA EN api/create-checkout.js. Ese es el del P1 y no se toca. El
// P2 va por su lado, en su carpeta, igual que el resto del producto.
// ═════════════════════════════════════════════════════════════════

import Stripe from 'stripe';
import { leerInforme } from '../../lib/guardar-informe.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Precio del producto "Tu Plan de Origen", creado en el panel de Stripe. OJO:
// si alli se cambia el importe, Stripe crea un precio nuevo con otro
// identificador y hay que actualizarlo aqui.
const PRICE_ID = 'price_1UI4FB0TJvLtDGUGVNnSqN7w';

// QUE PRODUCTO SE HA COMPRADO. Viaja con la compra desde que se paga hasta que
// se entrega, y es lo que distingue esta venta de las del P1 y del P0.
const PRODUCTO = 'p2';

// El numero de compra forma parte de la ruta que se va a buscar: no puede
// llevar barras ni nada raro.
const limpio = txt => String(txt || '').replace(/[^A-Za-z0-9_-]/g, '');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const suyo = req.body?.p1;
  const compra = typeof suyo === 'string' ? limpio(suyo.trim()) : '';
  if (!compra) {
    return res.status(400).json({ error: 'Para hacer tu plan hace falta tu informe. Entra desde el botón de tu PDF.' });
  }

  try {
    const informe = await leerInforme({ producto: 'p1', sessionId: compra });
    if (!informe) {
      return res.status(404).json({ error: 'No encontramos tu informe. Entra desde el botón de tu PDF.' });
    }

    const email = String(informe.cliente?.email || '').trim();
    const origin = req.headers.origin || 'https://origennatal.com';

    const sesion = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      ...(email ? { customer_email: email } : {}),
      allow_promotion_codes: true,
      locale: 'es',
      metadata: {
        producto: PRODUCTO,
        // De que informe sale su plan. Es lo que se lee al cobrar.
        p1: compra,
      },
      success_url: `${origin}/tu-plan-de-origen/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/tu-plan-de-origen?p1=${encodeURIComponent(compra)}`,
    });

    return res.status(200).json({ url: sesion.url });

  } catch (err) {
    console.error('[p2-plan/pagar] No se ha podido abrir el cobro:', err.message);
    return res.status(500).json({ error: 'No se ha podido abrir el pago. Inténtalo de nuevo.' });
  }
}
