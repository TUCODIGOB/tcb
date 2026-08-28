// ═════════════════════════════════════════════════════════════════
// /api/create-checkout.js
// Crea una sesión de Stripe Checkout con los datos del formulario
// como metadata. El webhook los usará después para guardar en Brevo.
// ═════════════════════════════════════════════════════════════════

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// EL PRECIO NO VIVE AQUI, VIVE EN STRIPE.
//
// Lo que se guarda es el PRODUCTO, y el identificador de un producto no cambia
// nunca. El del precio si: cada vez que se toca el importe en el panel, Stripe
// se inventa un precio nuevo con otro identificador. Por eso guardar el precio
// (ni el importe ni su id) obliga a tocar el codigo y desplegar cada vez que
// cambia la tarifa, y a que durante un rato la web cobre una cosa distinta de
// la que pone Stripe.
//
// Asi que aqui se guarda el producto y se le pregunta a Stripe cual es su
// precio de hoy. Cambiar el importe en el panel de Stripe, marcandolo como
// precio predeterminado del producto, es lo unico que hay que hacer: la web se
// entera sola en la siguiente compra.
//
// Si algun dia hubiera que apuntar a otro producto distinto, se pone en la
// variable de entorno STRIPE_PRODUCT_ID desde el panel de Vercel y tampoco hay
// que tocar el codigo.
const PRODUCT_ID = process.env.STRIPE_PRODUCT_ID || 'prod_UOVl3LcgYSnAle';

// Le pregunta a Stripe el precio vigente del producto.
//
// Si el producto no tiene precio predeterminado, esto revienta a proposito y el
// cliente ve "Error al procesar el pago" en vez de que se le cobre un importe
// equivocado. Cobrar de menos, o cobrar lo que ya no vale, es peor que no
// cobrar: el dinero mal cobrado hay que devolverlo uno por uno.
async function precioVigente() {
  const producto = await stripe.products.retrieve(PRODUCT_ID);
  const precio = producto.default_price;
  if (!precio) {
    throw new Error(`El producto ${PRODUCT_ID} no tiene precio predeterminado en Stripe`);
  }
  // Stripe lo devuelve como texto, o como objeto entero si se pidio expandido.
  return typeof precio === 'string' ? precio : precio.id;
}

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
    const origin = req.headers.origin || 'https://origennatal.com';

    // Crear sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          // El nombre, la descripcion y el importe que ve el cliente al pagar
          // salen del producto de Stripe, no de aqui.
          price: await precioVigente(),
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
        gaClientId: (datos.gaClientId || '').substring(0, 50),
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
