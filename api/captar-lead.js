// ═════════════════════════════════════════════════════════════════
// /api/captar-lead.js
// Captura silenciosa del lead (nombre + email) en Brevo antes del pago.
// Un fallo aquí nunca debe romper la experiencia del usuario en el formulario.
// ═════════════════════════════════════════════════════════════════

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Brevo rechaza el contacto ENTERO si el telefono no le vale, y entonces la
// compra no se guarda: ni la lista de compradores, ni los datos de nacimiento,
// ni nada. Cuando el campo era opcional y el cliente lo dejaba vacio se le
// mandaba el prefijo suelto ("+34"), y eso es justo lo que tumbaba el registro.
// Ahora el telefono vuelve a ser obligatorio, pero la comprobacion se queda:
// un dato de contacto nunca debe poder cargarse una venta.
function telefonoValido(telefono) {
  const limpio = String(telefono || '').replace(/[\s\-()]/g, '');
  return /^\+\d{7,15}$/.test(limpio);
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
    if (telefonoValido(telefono)) attributes.SMS = telefono;
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
