// ═════════════════════════════════════════════════════════════════
// /api/avisar-fallo-mapa.js
// Aviso a la tienda de que el servicio de mapas (Nominatim) no responde.
// El formulario no deja pagar si no puede verificar el lugar de nacimiento,
// asi que un corte del servicio corta las ventas — y sin este aviso no se
// nota desde fuera. El cliente ya esta en Brevo (se capta al escribir el
// email), asi que con esto se le puede escribir y no perder la venta.
// ═════════════════════════════════════════════════════════════════

const RECORTE = 200; // ni un dato del formulario necesita mas

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const datos = req.body || {};
    const campo = valor => String(valor || '-').substring(0, RECORTE);

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      console.error('Sin BREVO_API_KEY: no se puede avisar del fallo del mapa');
      return res.status(200).json({ ok: false });
    }

    const mensaje = [
      'El servicio de mapas no ha respondido y este cliente NO ha podido pagar.',
      'No es un error suyo: sus datos pueden estar perfectamente bien escritos.',
      '',
      'Si el corte es puntual, con reintentarlo en unos minutos basta. Si se',
      'repite, hay un problema con el servicio y conviene mirarlo.',
      '',
      `Cliente:   ${campo(datos.nombre)}`,
      `Email:     ${campo(datos.email)}`,
      `Municipio: ${campo(datos.municipio)}`,
      `Provincia: ${campo(datos.provincia)}`,
      `País:      ${campo(datos.pais)}`,
    ].join('\n');

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: 'hola@origennatal.com', name: 'ORIGEN NATAL — Alertas' },
        to: [{ email: 'hola.origennatal@gmail.com', name: 'ORIGEN NATAL' }],
        subject: 'MAPA CAIDO — UN CLIENTE NO HA PODIDO PAGAR',
        htmlContent: `<pre style="font-family:monospace;background:#fff5f4;padding:16px;border-radius:8px;">${mensaje}</pre>`,
      }),
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    // Este aviso nunca debe estropearle nada al cliente: si falla, se anota y
    // se responde bien igualmente.
    console.error('No se pudo avisar del fallo del mapa:', error.message);
    return res.status(200).json({ ok: false });
  }
}
