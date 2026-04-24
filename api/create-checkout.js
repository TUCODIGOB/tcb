// ═════════════════════════════════════════════════════════════════
// /api/create-checkout.js
// Crea una sesión de Stripe Checkout con los datos del formulario
// como metadata. El webhook los usará después para guardar en Brevo.
// ═════════════════════════════════════════════════════════════════

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Precio del producto "Tu Diseño de Origen" en céntimos (27€ = 2700)
const PRECIO_CENTIMOS = 2700;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const datos = req.body;

    // Validación básica server-side
    if (!datos.nombre || !datos.email || !datos.fecha || !datos.hora) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    // Construir origen dinámico (para redirecciones)
    const origin = req.headers.origin || 'https://tcb-iota.vercel.app';

    // Crear sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Tu Diseño de Origen',
              description: 'Pago único · Entrega inmediata tras el pago',
            },
            unit_amount: PRECIO_CENTIMOS,
          },
          quantity: 1,
        },
      ],
      customer_email: datos.email,
      allow_promotion_codes: true,
      locale: 'es',
      // Metadata: datos del formulario que el webhook usará
      metadata: {
        nombre: (datos.nombre || '').substring(0, 500),
        sexo: (datos.sexo || '').substring(0, 20),
        fecha: (datos.fecha || '').substring(0, 20),
        hora: (datos.hora || '').substring(0, 10),
        municipio: (datos.municipio || '').substring(0, 100),
        provincia: (datos.provincia || '').substring(0, 100),
        pais: (datos.pais || '').substring(0, 100),
        telefono: (datos.telefonoCompleto || '').substring(0, 30),
        edad: String(datos.edadCalculada || ''),
      },
      success_url: `${origin}/generando-informe?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/tu-diseno-de-origen`,
    });

    // Devolver la URL de Stripe para que el navegador redirija
    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Error creando sesión Stripe:', error);
    return res.status(500).json({ error: 'Error al procesar el pago. Inténtalo de nuevo.' });
  }
}
