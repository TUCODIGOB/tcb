// ═════════════════════════════════════════════════════════════════
// /api/prueba-regalo/contacto.js
// Guarda el contacto del regalo en Brevo.
//
// ES EL MISMO CODIGO QUE api/captar-lead.js, COPIADO TAL CUAL, con dos
// diferencias a proposito:
//   · la lista es la 0 P1 Lead Magnet (14), no la del carrito abandonado
//   · cuando el regalo ya ha salido, se le pone la etiqueta P0_SACADO
//
// No se toca api/captar-lead.js: aquel es del P1 y manda a su lista.
// Un fallo aqui nunca debe romper el formulario.
// ═════════════════════════════════════════════════════════════════

const LISTA_DEL_REGALO = 14; // "0 P1 Lead Magnet" en Brevo

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Brevo rechaza el contacto ENTERO si el telefono no le vale, y entonces no se
// guarda nada: ni el nombre, ni los datos de nacimiento. Asi que un telefono
// que no cuadre se deja fuera en vez de tumbar el registro.
function telefonoValido(telefono) {
  const limpio = String(telefono || '').replace(/[\s\-()]/g, '');
  return /^\+\d{7,15}$/.test(limpio);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { nombre, email, telefono, sexo, fecha, hora, municipio, provincia, pais, edad, sacado } = req.body || {};

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
    // La etiqueta solo cuando el regalo ha salido de verdad. Si se pusiera al
    // escribir el email, quedarian marcadas personas que no han visto nada.
    if (sacado) attributes.P0_SACADO = 'si';

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
        listIds: [LISTA_DEL_REGALO],
        updateEnabled: true,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`❌ Error guardando el contacto del regalo en Brevo (${resp.status}):`, errText);
    }
  } catch (err) {
    console.error('❌ Error guardando el contacto del regalo en Brevo:', err);
  }

  return res.status(200).json({ ok: true });
}
