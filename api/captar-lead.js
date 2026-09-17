// ═════════════════════════════════════════════════════════════════
// /api/captar-lead.js
// Captura silenciosa del lead (nombre + email) en Brevo antes del pago.
// Un fallo aquí nunca debe romper la experiencia del usuario en el formulario.
// ═════════════════════════════════════════════════════════════════

import { guardarContactoEnBrevo, apuntarPendiente } from '../lib/brevo-contactos.js';

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Brevo rechaza el contacto ENTERO si el telefono no le vale, y entonces la
// compra no se guarda: ni la lista de compradores, ni los datos de nacimiento,
// ni nada. Cuando el campo era opcional y el cliente lo dejaba vacio se le
// mandaba el prefijo suelto ("+34"), y eso es justo lo que tumbaba el registro.
// Ahora el telefono vuelve a ser obligatorio, pero la comprobacion se queda:
// un dato de contacto nunca debe poder cargarse una venta.
// Y SE MANDA LIMPIO, sin espacios ni guiones: es lo que Brevo entiende. Antes
// lo limpiaba la pagina antes de mandarlo; ahora que viene del servidor se
// limpia aqui, para que nunca pueda llegar de otra forma.
function telefonoLimpio(telefono) {
  return String(telefono || '').replace(/[\s\-()]/g, '');
}

function telefonoValido(telefono) {
  return /^\+\d{7,15}$/.test(telefonoLimpio(telefono));
}

// ── EL REGISTRO EN BREVO ─────────────────────────────────────────
//
// SALE AQUI FUERA PARA QUE LO HAGA EL SERVIDOR. Esto lo pedia el navegador
// justo cuando la pagina saltaba a la pantalla siguiente, y si no le daba
// tiempo a salir el lead se perdia sin que nadie se enterara. Ahora lo llama
// tambien /api/prueba-regalo/vale, que es quien da permiso para escribir el
// diseño: ahi ya no hay pagina yendose.
//
// SI BREVO FALLA, SE AVISA HACIA ARRIBA -no se traga aqui- para que quien
// llame lo deje escrito en los registros. Nunca corta nada: quien llama lo
// recoge y sigue.
export async function registrarLead({ nombre, email, telefono, sexo, fecha, hora, municipio, provincia, pais, edad }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY no configurada');

  const attributes = { NOMBRE: nombre || '' };
  if (telefonoValido(telefono)) attributes.SMS = telefonoLimpio(telefono);
  if (sexo) attributes.SEXO = sexo;
  if (fecha) attributes.FECHA_NAC = fecha;
  if (hora) attributes.HORA_NAC = hora;
  const lugarNac = [municipio, provincia, pais].filter(Boolean).join(', ');
  if (lugarNac) attributes.LUGAR_NAC = lugarNac;
  if (edad) attributes.EDAD = parseInt(edad);

  const body = {
    email,
    attributes,
    // 14 = "0 P1 Lead Magnet", la lista de quien pide su regalo. Al
    // comprar el P1, el webhook le saca de aqui y le pasa a la suya.
    listIds: [14],
    updateEnabled: true,
  };

  // SI NO ENTRA AHORA, ENTRA DESPUES. Se apunta y el reloj lo reintenta a los
  // 15 minutos, a la hora y a las tres horas. Ningun lead se pierde porque
  // Brevo estuviera caido justo en ese segundo.
  try {
    await guardarContactoEnBrevo(body, BREVO_API_KEY);
  } catch (err) {
    await apuntarPendiente(body, err.message);
    throw err;
  }
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
    await registrarLead({ nombre, email, telefono, sexo, fecha, hora, municipio, provincia, pais, edad });
  } catch (err) {
    console.error('❌ Error captando lead en Brevo:', err.message);
  }

  return res.status(200).json({ ok: true });
}
