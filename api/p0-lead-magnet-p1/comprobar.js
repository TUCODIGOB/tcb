// ═════════════════════════════════════════════════════════════════
// /api/p0-lead-magnet-p1/comprobar.js
// Dice si esta persona ya se ha llevado el regalo.
//
// POR QUE HACE FALTA.
//
// El regalo lo pagamos nosotros: cada uno cuesta una llamada al modelo. Sin
// esto, la misma persona podria pedirlo una y otra vez cambiando la fecha de
// nacimiento, y el gasto no tendria fondo.
//
// SE MIRA POR DOS SITIOS: su correo y su telefono. Con que uno de los dos ya
// tenga la marca, es ella y no se le genera otro. Cambiar solo el correo, o
// solo el telefono, no vale.
//
// LA MARCA VA EN EL CONTACTO, NO EN LA LISTA. Por eso sigue encontrandola el
// dia que compre el P1 y pase a la lista de compradores.
//
// Y SI BREVO NO CONTESTA, SE LE DEJA PASAR. Un fallo nuestro no puede dejar sin
// su regalo a alguien que viene por primera vez: cuesta un centimo y vale mas
// eso que perder a una clienta por una caida que no es culpa suya.
// ═════════════════════════════════════════════════════════════════

const MARCA_DEL_REGALO = 'P0_SACADO';

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function telefonoValido(telefono) {
  const limpio = String(telefono || '').replace(/[\s\-()]/g, '');
  return /^\+\d{7,15}$/.test(limpio);
}

// Busca un contacto en Brevo y dice si lleva la marca.
//
// Devuelve false tambien cuando no existe (404) y cuando la peticion falla: lo
// que decide es encontrar la marca, nunca no encontrarla.
async function tieneLaMarca(identificador, tipo, clave) {
  const url = `https://api.brevo.com/v3/contacts/${encodeURIComponent(identificador)}`
            + `?identifierType=${tipo}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: { 'accept': 'application/json', 'api-key': clave },
  });
  if (resp.status === 404) return false;
  if (!resp.ok) {
    console.error(`❌ Brevo no ha contestado al buscar ${tipo} (${resp.status})`);
    return false;
  }
  const contacto = await resp.json();
  return String(contacto?.attributes?.[MARCA_DEL_REGALO] || '').toLowerCase() === 'si';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email, telefono } = req.body || {};

  if (!email || !validarEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  try {
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY no configurada');

    // Las dos busquedas a la vez: tardan lo que la mas lenta, no lo que las dos.
    const busquedas = [tieneLaMarca(email, 'email_id', BREVO_API_KEY)];
    if (telefonoValido(telefono)) {
      busquedas.push(tieneLaMarca(String(telefono).replace(/[\s\-()]/g, ''), 'phone_id', BREVO_API_KEY));
    }

    const resultados = await Promise.all(busquedas);
    return res.status(200).json({ yaLoTiene: resultados.some(Boolean) });

  } catch (err) {
    console.error('❌ Error comprobando el regalo en Brevo:', err.message);
    // Se le deja pasar. Ver la nota de arriba.
    return res.status(200).json({ yaLoTiene: false });
  }
}
