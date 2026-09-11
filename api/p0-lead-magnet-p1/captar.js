// ═════════════════════════════════════════════════════════════════
// /api/p0-lead-magnet-p1/captar.js
// Apunta en Brevo a quien pide el regalo.
//
// ES EL MISMO TRABAJO QUE /api/captar-lead, PERO DE ESTE PRODUCTO.
//
// No se reaprovecha aquel a proposito: aquel escribe en la lista del carrito
// abandonado del P1, y este en la del regalo. Si un dia el regalo se quita,
// se borra esta carpeta y el P1 no se entera de nada.
//
// SE LLAMA DOS VECES, Y NO HACEN LO MISMO:
//
//   1. Cuando ella sale de la casilla del email o del telefono. Ahi solo hay
//      su nombre, su email y su telefono: se apunta eso y nada mas. Si
//      abandona el formulario a medias, al menos queda el contacto.
//
//   2. Cuando le da al boton, con todo relleno. Ahi va tambien su sexo, su
//      fecha, su hora y su lugar de nacimiento, y la marca de que ya se ha
//      llevado el regalo.
//
// LA MARCA ES LO QUE IMPIDE QUE LO SAQUE DOS VECES. Va en el contacto, no en
// la lista: asi el dia que compre el P1 y pase a la lista de compradores, la
// marca sigue con ella y se la sigue reconociendo.
//
// Y SI FALLA, NO SE ROMPE NADA. Se deja aviso en el registro y se contesta que
// si: esto es para nosotros, y ella no tiene la culpa de que Brevo no conteste.
// ═════════════════════════════════════════════════════════════════

// La lista "0 P1 Lead Magnet" de Brevo.
const LISTA_DEL_REGALO = 14;

// LA MARCA. Se escribe igual que P1_COMPRADO y P2_COMPRADO, que son las que ya
// hay: una casilla de texto con un "si" dentro.
//
// OJO: esta casilla tiene que existir en Brevo antes. Si no existe, Brevo no
// se queja solo de ella: rechaza el contacto ENTERO y no se guarda nada.
const MARCA_DEL_REGALO = 'P0_SACADO';

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Brevo rechaza el contacto ENTERO si el telefono no le vale, y entonces no se
// guarda ni el email. Por eso se mira antes y, si no cuadra, se manda sin el.
function telefonoValido(telefono) {
  const limpio = String(telefono || '').replace(/[\s\-()]/g, '');
  return /^\+\d{7,15}$/.test(limpio);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const {
    nombre, email, telefono, sexo, fecha, hora,
    municipio, provincia, pais, edad,
    // Lo manda la pagina cuando ella ya le ha dado al boton con todo relleno.
    completo,
  } = req.body || {};

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

    // LA MARCA SOLO EN LA SEGUNDA LLAMADA. Quien se queda a medias no se lleva
    // nada, asi que no se le puede cerrar la puerta para siempre.
    if (completo === true) attributes[MARCA_DEL_REGALO] = 'si';

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
      console.error(`❌ Error apuntando el regalo en Brevo (${resp.status}):`, errText);
    }
  } catch (err) {
    console.error('❌ Error apuntando el regalo en Brevo:', err);
  }

  return res.status(200).json({ ok: true });
}
