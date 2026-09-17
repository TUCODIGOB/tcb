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
// Y SE MANDA LIMPIO, sin espacios ni guiones: es lo que Brevo entiende. Antes
// lo limpiaba la pagina antes de mandarlo; ahora que viene del servidor se
// limpia aqui, para que nunca pueda llegar de otra forma.
function telefonoLimpio(telefono) {
  return String(telefono || '').replace(/[\s\-()]/g, '');
}

function telefonoValido(telefono) {
  return /^\+\d{7,15}$/.test(telefonoLimpio(telefono));
}

// ¿SE QUEJA POR EL TELEFONO REPETIDO? Brevo no admite el mismo movil en dos
// contactos -una pareja, el movil de casa, un numero de empresa- y cuando pasa
// contesta esto.
function esElTelefonoRepetido(estado, queja) {
  return estado === 400 && /duplicate_parameter/i.test(queja) && /\bSMS\b/i.test(queja);
}

function mandarABrevo(body, apiKey) {
  return fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
    // SU TOPE. Con esto delante esta el cliente esperando su diseño, y la
    // funcion entera tiene su limite de tiempo: si Brevo no contesta pronto,
    // se corta y se sigue. Nunca se le deja mirando la pantalla por esto.
    signal: AbortSignal.timeout(4000),
  });
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

  let resp = await mandarABrevo(body, BREVO_API_KEY);

  // EL TELEFONO NO PUEDE COSTARLE LA FICHA A UN LEAD. Si ese movil ya esta en
  // otro contacto, Brevo rechaza este ENTERO: ni la lista 14, ni sus datos de
  // nacimiento, ni nada. Asi que se guarda otra vez sin el telefono, que es un
  // dato de mas: el numero ya esta en el otro contacto, y lo que importa es
  // que el lead quede registrado.
  if (!resp.ok && attributes.SMS) {
    const queja = await resp.text();
    if (!esElTelefonoRepetido(resp.status, queja)) {
      throw new Error(`Brevo ha contestado ${resp.status}: ${queja}`);
    }
    console.warn('⚠️ Ese telefono ya estaba en otro contacto de Brevo: se guarda sin el.');
    const { SMS, ...sinTelefono } = attributes;
    resp = await mandarABrevo({ ...body, attributes: sinTelefono }, BREVO_API_KEY);
  }

  if (!resp.ok) {
    throw new Error(`Brevo ha contestado ${resp.status}: ${await resp.text()}`);
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
