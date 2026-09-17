// ═════════════════════════════════════════════════════════════════
// /api/brevo-pendientes.js
// EL RELOJ QUE TERMINA DE METER EN BREVO LO QUE NO ENTRO A LA PRIMERA.
//
// Cuando Brevo no acepta un contacto -esta caido, va saturado, corta la
// conexion-, quien lo intento lo deja apuntado. Esto se despierta cada 15
// minutos, coge esos apuntes y los vuelve a intentar: a los 15 minutos, a la
// hora y a las tres horas del primer fallo.
//
// En cuanto entra, el apunte se borra. Si a las tres horas sigue sin entrar,
// se avisa por correo a la tienda con el email de esa persona, para que no se
// quede nadie fuera sin que se sepa.
//
// NO TOCA NADA DEL CLIENTE. Solo reintenta el alta en Brevo, que es una copia
// para el marketing: sus datos y su compra ya estan guardados en R2 y en
// Stripe desde el primer momento.
// ═════════════════════════════════════════════════════════════════

import {
  ESPERAS_MS,
  guardarContactoEnBrevo,
  listarPendientes,
  leerPendiente,
  guardarPendiente,
  borrarPendiente,
} from '../lib/brevo-contactos.js';

// Cuantos se miran en una pasada. De sobra: si un dia hubiera mas, los que
// queden se cogen en la siguiente vuelta, quince minutos despues.
const POR_VUELTA = 50;

// AVISO A LA TIENDA cuando uno se ha quedado fuera del todo.
async function avisarALaTienda({ email, listas, motivo, desde }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

  const mensaje = [
    'Este contacto no ha entrado en Brevo despues de tres reintentos.',
    '',
    `Email: ${email || '-'}`,
    `Lista: ${listas || '-'}`,
    `Primer fallo: ${desde || '-'}`,
    `Ultimo motivo: ${motivo || '-'}`,
    '',
    'Sus datos NO se han perdido: estan guardados como siempre. Lo unico que',
    'falta es darlo de alta en Brevo, que se puede hacer a mano.',
  ].join('\n');

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: 'hola@origennatal.com', name: 'ORIGEN NATAL — Alertas' },
        to: [{ email: 'hola.origennatal@gmail.com', name: 'Admin' }],
        subject: `⚠️ Un contacto no ha entrado en Brevo — ${String(email || 'sin email').slice(0, 80)}`,
        htmlContent: `<pre style="font-family:monospace;background:#fff5f4;padding:16px;border-radius:8px;">${mensaje}</pre>`,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error('[brevo] No se ha podido avisar a la tienda:', err.message);
  }
}

export default async function handler(req, res) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    console.error('[brevo] Sin CRON_SECRET: el reintento no se ejecuta');
    return res.status(500).json({ error: 'Sin llave' });
  }
  if (req.headers.authorization !== `Bearer ${secreto}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    console.error('[brevo] Sin BREVO_API_KEY: no se puede reintentar nada');
    return res.status(500).json({ error: 'Sin llave de Brevo' });
  }

  let nombres;
  try {
    nombres = await listarPendientes();
  } catch (err) {
    console.error('[brevo] No se ha podido leer la lista de pendientes:', err.message);
    return res.status(500).json({ error: 'No se ha podido leer la lista' });
  }

  const ahora = Date.now();
  let entrados = 0, esperando = 0, rendidos = 0;

  for (const nombre of nombres.slice(0, POR_VUELTA)) {
    try {
      const ficha = await leerPendiente(nombre);
      // Si ya no esta, es que otra vuelta lo metio: no hay nada que hacer.
      if (!ficha || !ficha.body) { await borrarPendiente(nombre); continue; }

      const intentos = Number(ficha.intentos || 0);
      const creado = Number(ficha.creado || 0);

      // SE RINDE: ya se han gastado los tres reintentos. Se avisa y se quita
      // de la lista, para que no se quede dando vueltas para siempre.
      if (intentos >= ESPERAS_MS.length) {
        await avisarALaTienda({
          email: ficha.body.email,
          listas: (ficha.body.listIds || []).join(', '),
          motivo: ficha.motivo,
          desde: creado ? new Date(creado).toISOString() : '',
        });
        await borrarPendiente(nombre);
        rendidos++;
        continue;
      }

      // TODAVIA NO LE TOCA. Los tiempos se cuentan desde el primer fallo.
      if (ahora < creado + ESPERAS_MS[intentos]) { esperando++; continue; }

      try {
        await guardarContactoEnBrevo(ficha.body, BREVO_API_KEY, 8000);
        await borrarPendiente(nombre);
        entrados++;
        console.log(`[brevo] Entrado al reintento ${intentos + 1}: ${ficha.body.email}`);
      } catch (err) {
        await guardarPendiente(nombre, {
          ...ficha,
          intentos: intentos + 1,
          motivo: String(err.message || '').slice(0, 300),
        });
        esperando++;
        console.warn(`[brevo] Sigue sin entrar (${intentos + 1}/${ESPERAS_MS.length}): ${err.message}`);
      }
    } catch (err) {
      // Un apunte que da guerra no puede parar a los demas.
      console.error(`[brevo] Problema con el pendiente ${nombre}:`, err.message);
    }
  }

  return res.status(200).json({ mirados: nombres.length, entrados, esperando, rendidos });
}
