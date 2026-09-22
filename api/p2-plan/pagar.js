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

// A DONDE VUELVE DESPUES DE PAGAR. Puesto aqui y no sacado de la peticion:
// quien llama puede decir que viene de donde quiera, y con eso mandaria a la
// clienta a otra web -con su numero de compra encima- despues de cobrarle.
const NUESTRA_WEB = 'https://origennatal.com';

// El numero de compra forma parte de la ruta que se va a buscar: no puede
// llevar barras ni nada raro.
const limpio = txt => String(txt || '').replace(/[^A-Za-z0-9_-]/g, '');

// COMO ES EL NUMERO DE UNA VISITA EN ANALYTICS: dos numeros con un punto en
// medio. Lo que no sea asi no se manda, para no meter en la compra texto de
// fuera sin mirar.
const LA_VISITA = /^\d{1,20}\.\d{1,20}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const suyo = req.body?.p1;
  const compra = typeof suyo === 'string' ? limpio(suyo.trim()) : '';
  if (!compra) {
    return res.status(400).json({ error: 'Para hacer tu plan hace falta tu informe. Entra desde el botón de tu PDF.' });
  }

  // DE QUE VISITA SALE ESTA COMPRA. El numero que Analytics le pone a cada
  // visitante, para que la venta quede pegada a la visita que la trajo. Si no
  // viene, o viene algo raro, se manda vacio: esto no puede impedir un cobro.
  const deLaVisita = req.body?.visita;
  const visita = typeof deLaVisita === 'string' && LA_VISITA.test(deLaVisita.trim())
    ? deLaVisita.trim() : '';

  try {
    const informe = await leerInforme({ producto: 'p1', sessionId: compra });
    if (!informe) {
      return res.status(404).json({ error: 'No encontramos tu informe. Entra desde el botón de tu PDF.' });
    }

    const email = String(informe.cliente?.email || '').trim();

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
        // Y de que visita sale la venta, para poder contarla en Analytics.
        visita,
      },
      success_url: `${NUESTRA_WEB}/tu-plan-de-origen/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${NUESTRA_WEB}/tu-plan-de-origen?p1=${encodeURIComponent(compra)}`,
    });

    return res.status(200).json({ url: sesion.url });

  } catch (err) {
    console.error('[p2-plan/pagar] No se ha podido abrir el cobro:', err.message);
    return res.status(500).json({ error: 'No se ha podido abrir el pago. Inténtalo de nuevo.' });
  }
}
