// ═════════════════════════════════════════════════════════════════
// /api/prueba-regalo/avisos.js
// Los correos del regalo. Tres para quien lo pide y uno para la tienda.
//
//   listo      — el regalo ya esta, con el boton para verlo
//   problema   — ha fallado, se sigue intentando por detras
//   revisando  — se han agotado los intentos, se mira a mano
//   aLaTienda  — el aviso para nosotros, con los datos del contacto
//
// Van por Brevo, igual que los del P1. Aqui no se decide nada: quien llame a
// estas funciones es quien sabe en que punto esta cada cosa.
//
// NINGUNO DE ESTOS CORREOS PUEDE ROMPER NADA. Si Brevo no contesta, se
// apunta en el registro y se sigue: quedarse sin correo es malo, pero
// quedarse sin regalo por culpa del correo es peor.
// ═════════════════════════════════════════════════════════════════

const DE       = { email: 'hola@origennatal.com', name: 'ORIGEN NATAL' };
const ALERTAS  = { email: 'hola@origennatal.com', name: 'ORIGEN NATAL — Alertas' };
const LA_TIENDA = { email: 'hola.origennatal@gmail.com', name: 'Origen Natal' };

const RECORTE = 200;   // ni un dato del formulario necesita mas

// ── HABLAR CON BREVO ───────────────────────────────────────────
async function mandar(cuerpo, que) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    console.error(`[regalo] Sin BREVO_API_KEY: no sale el correo de ${que}`);
    return false;
  }
  try {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(cuerpo),
    });
    if (!resp.ok) {
      const detalle = await resp.text();
      console.error(`[regalo] Brevo ${resp.status} en el correo de ${que}: ${detalle.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[regalo] No ha salido el correo de ${que}:`, err.message);
    return false;
  }
}

// Lo que escribe quien rellena el formulario no puede colarse como HTML.
function limpio(texto) {
  return String(texto == null ? '' : texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── EL SOBRE, CON LOS COLORES DE LA MARCA ──────────────────────
function carta({ titulo, parrafos, boton }) {
  const cuerpo = parrafos
    .map(t => `<p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#0c0c0c;">${t}</p>`)
    .join('');
  const llamada = boton
    ? `<p style="margin:32px 0 0;"><a href="${boton.url}" style="display:inline-block; background:#bd9048; color:#ffffff; font-size:15px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; text-decoration:none; padding:16px 32px; border-radius:6px;">${boton.texto}</a></p>`
    : '';
  return `<div style="margin:0; padding:32px 16px; background:#fffbef; font-family:'Open Sans',Arial,sans-serif;">
  <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid rgba(189,144,72,.25); border-radius:12px; padding:40px 32px;">
    <h1 style="margin:0 0 24px; font-family:Georgia,serif; font-size:26px; line-height:1.25; color:#0e3f4b;">${titulo}</h1>
    ${cuerpo}${llamada}
  </div>
  <p style="max-width:560px; margin:24px auto 0; text-align:center; font-size:12px; color:#8a8a8a;">
    ORIGEN NATAL · <a href="mailto:hola@origennatal.com" style="color:#bd9048;">hola@origennatal.com</a>
  </p>
</div>`;
}

// Quien lee puede ser hombre o mujer, asi que nada de adjetivos con genero.
const saludo = nombre => (nombre ? `Hola, ${limpio(nombre)}:` : 'Hola:');

// ── A · EL REGALO YA ESTA ──────────────────────────────────────
// El mismo correo tanto si sale a la primera como si sale en un reintento.
// NO LLEVA EL TEXTO DENTRO, lleva el enlace: en su pagina estan las otras
// seis areas y la oferta, y en un correo eso se pierde.
export function correoListo({ email, nombre, enlace }) {
  return mandar({
    sender: DE,
    to: [{ email, name: nombre || '' }],
    subject: 'Tu Diseño de Origen ya está aquí',
    htmlContent: carta({
      titulo: 'Tu Diseño de Origen ya está aquí',
      parrafos: [
        saludo(nombre),
        'Ya puedes leer la primera área de tu Diseño de Origen: tu identidad, y por qué eres como eres.',
        'Se queda guardado, así que puedes volver a leerlo cuando quieras.',
      ],
      boton: { texto: 'Ver mi diseño', url: enlace },
    }),
  }, 'el regalo listo');
}

// ── B · HA FALLADO Y SE SIGUE INTENTANDO ───────────────────────
export function correoProblema({ email, nombre }) {
  return mandar({
    sender: DE,
    to: [{ email, name: nombre || '' }],
    subject: 'Estamos preparando tu Diseño de Origen',
    htmlContent: carta({
      titulo: 'Estamos preparando tu diseño',
      parrafos: [
        saludo(nombre),
        'Hemos tenido un problema al generar tu Diseño de Origen. No es cosa tuya y no se ha perdido nada: tus datos están guardados.',
        'Seguimos con ello y te avisamos por aquí en cuanto esté.',
      ],
    }),
  }, 'el problema');
}

// ── C · SE HAN AGOTADO LOS INTENTOS ────────────────────────────
export function correoRevisando({ email, nombre }) {
  return mandar({
    sender: DE,
    to: [{ email, name: nombre || '' }],
    subject: 'Seguimos con tu Diseño de Origen',
    htmlContent: carta({
      titulo: 'Seguimos con tu diseño',
      parrafos: [
        saludo(nombre),
        'Hemos tenido problemas con el servidor y lo hemos intentado tres veces sin conseguirlo.',
        'Lo estamos revisando y te lo haremos llegar en cuanto esté resuelto. No tienes que hacer nada.',
      ],
    }),
  }, 'la revision');
}

// ── EL AVISO PARA NOSOTROS ─────────────────────────────────────
// Va con su emoji delante para distinguirlo de un vistazo entre el resto.
export function correoALaTienda({ nombre, email, telefono, nacimiento, motivo, cuando }) {
  const campo = v => limpio(String(v == null || v === '' ? '-' : v).substring(0, RECORTE));
  const mensaje = [
    'Este contacto no ha recibido su regalo después de 3 intentos.',
    '',
    `Nombre: ${campo(nombre)}`,
    `Email: ${campo(email)}`,
    `Teléfono: ${campo(telefono)}`,
    `Nacimiento: ${campo(nacimiento)}`,
    '',
    `Último fallo: ${campo(motivo)}`,
    `Fecha del último intento: ${campo(cuando)}`,
    '',
    'En Brevo está marcado como fallido.',
  ].join('\n');

  return mandar({
    sender: ALERTAS,
    to: [LA_TIENDA],
    subject: `🚨 P0 no entregado — ${String(nombre || 'sin nombre').substring(0, 60)} (${String(email || 'sin email').substring(0, 80)})`,
    htmlContent: `<pre style="font-family:monospace;background:#fff5f4;padding:16px;border-radius:8px;">${mensaje}</pre>`,
  }, 'la tienda');
}
