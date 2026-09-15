// ═════════════════════════════════════════════════════════════════
// /api/prueba-regalo/pendientes.js
// La lista de quien se ha quedado sin su regalo.
//
// QUE PROBLEMA RESUELVE. Cuando el servidor falla las dos veces que se le
// dan delante, esa persona se va con las manos vacias. Aqui se apunta, para
// que /api/prueba-regalo/reintentar lo vuelva a intentar por detras y se lo
// mande por correo cuando salga.
//
// DONDE VIVE. En p0/pendientes/<huella del email>.json, dentro de la carpeta
// del regalo y de nadie mas. Uno por email: si ya estaba apuntado no se
// apunta otra vez ni se le avisa dos veces.
//
// LA MARCA DE BREVO es solo para mirar: P0_ESTADO dice como va y P0_INTENTOS
// cuantas veces se ha probado. No se mete a nadie en ninguna lista ni se
// toca nada mas de su ficha.
//
// NADA DE AQUI PUEDE ROMPER EL REGALO. Todo esto pasa por detras, despues de
// que la pagina ya haya contestado.
// ═════════════════════════════════════════════════════════════════

import { leer, escribir, borrar, listar } from './almacen.js';
import { huellaDelEmail } from './vale.js';
import { correoProblema } from './avisos.js';

const PENDIENTES = 'pendientes';

// ── LA MARCA EN BREVO ──────────────────────────────────────────
//
// updateEnabled deja actualizar a quien ya esta. Sin listIds a proposito: no
// queremos meter a nadie en ninguna lista desde aqui, solo dejar escrito como
// va lo suyo. Si Brevo no contesta, se apunta en el registro y se sigue.
export async function marcarEnBrevo({ email, estado, intentos }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    console.error('[regalo] Sin BREVO_API_KEY: no se marca el contacto');
    return false;
  }
  if (!email) return false;

  try {
    const resp = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        attributes: { P0_ESTADO: estado, P0_INTENTOS: Number(intentos || 0) },
        updateEnabled: true,
      }),
    });
    if (!resp.ok) {
      console.error(`[regalo] Brevo ${resp.status} al marcar el contacto: ${(await resp.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[regalo] No se ha podido marcar el contacto:', err.message);
    return false;
  }
}

// ── APUNTARLO ──────────────────────────────────────────────────
//
// Se guarda su ficha entera -sus datos y su carta- para que el reintento no
// tenga que volver a preguntarle el lugar al mapa: ese punto ya se calculo y
// tiene que salir el mismo.
export async function apuntarElFallo({ datos, carta, motivo }) {
  const huella = huellaDelEmail(datos && datos.email);
  if (!huella) return false;

  try {
    // Si ya estaba apuntado, no se toca ni se le avisa otra vez.
    const yaEsta = await leer(PENDIENTES, huella);
    if (yaEsta) return false;

    await escribir(PENDIENTES, huella, {
      creado: Date.now(),
      intentos: 0,
      acabado: false,
      datos,
      carta,
      motivo: String(motivo || '').slice(0, 300),
    });
  } catch (err) {
    console.error('[regalo] No se ha podido apuntar el pendiente:', err.message);
    return false;
  }

  // Lo de abajo es de adorno comparado con lo de arriba: si falla, esa
  // persona sigue apuntada y el reintento la cogera igual.
  await marcarEnBrevo({ email: datos.email, estado: 'pendiente', intentos: 0 });
  await correoProblema({ email: datos.email, nombre: datos.nombre });
  return true;
}

// ── LEER, GUARDAR Y QUITAR ─────────────────────────────────────
export async function losPendientes() {
  const nombres = await listar(PENDIENTES);
  const fichas = [];
  for (const huella of nombres) {
    try {
      const ficha = await leer(PENDIENTES, huella);
      if (ficha) fichas.push({ ...ficha, huella });
    } catch (err) {
      console.error(`[regalo] No se ha podido leer el pendiente ${huella}:`, err.message);
    }
  }
  return fichas;
}

export async function guardarPendiente(huella, ficha) {
  const { huella: fuera, ...limpia } = ficha;
  return escribir(PENDIENTES, huella, limpia);
}

export async function quitarPendiente(huella) {
  try {
    await borrar(PENDIENTES, huella);
  } catch (err) {
    console.error('[regalo] No se ha podido quitar el pendiente:', err.message);
  }
}
