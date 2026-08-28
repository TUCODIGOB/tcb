// ═════════════════════════════════════════════════════════════════
// /api/captar-lead.js
// Captura silenciosa del lead (nombre + email) en Brevo antes del pago.
// Un fallo aquí nunca debe romper la experiencia del usuario en el formulario.
// ═════════════════════════════════════════════════════════════════

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { nombre, email, telefono, sexo, fecha, hora, municipio, provincia, pais, edad } = req.body || {};

  if (!email || !validarEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  try {
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY no configurada');

    const attributes = { NOMBRE: nombre || '' };
    if (telefono) attributes.SMS = telefono;
    if (sexo) attributes.SEXO = sexo;
    if (fecha) attributes.FECHA_NAC = fecha;
    if (hora) attributes.HORA_NAC = hora;
    const lugarNac = [municipio, provincia, pais].filter(Boolean).join(', ');
    if (lugarNac) attributes.LUGAR_NAC = lugarNac;
    if (edad) attributes.EDAD = parseInt(edad);

    const resp = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        attributes,
        listIds: [11],
        updateEnabled: true,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`❌ Error captando lead en Brevo (${resp.status}):`, errText);
    }
  } catch (err) {
    console.error('❌ Error captando lead en Brevo:', err);
  }

  return res.status(200).json({ ok: true });
}
