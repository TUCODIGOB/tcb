// ═════════════════════════════════════════════════════════════════
// lib/correos-p1.js
// Los correos del P1 que no llevan el PDF.
//
// CUALES SON:
//   · P1-1  bienvenida, en cuanto entra el dinero.
//   · P1-3  "no ha salido", cuando se acaban los reintentos.
//   · el aviso a la tienda de ese mismo caso, para poder sacarlo a mano.
//
// El correo que entrega el PDF -el P1-2- no esta aqui: ese sale de
// /api/save-pdf.js con su plantilla de Brevo y no se toca.
//
// SIN PLANTILLA. Estos dos van escritos aqui mismo, en texto sencillo, porque
// todavia no tienen plantilla en Brevo. Cuando la tengan, se cambia el cuerpo
// por su numero y lo demas se queda igual.
//
// NINGUNO PUEDE CORTAR NADA. Si Brevo no contesta, se deja aviso en el
// registro y se sigue: el informe es lo que importa, no el correo.
// ═════════════════════════════════════════════════════════════════

const REMITENTE = { email: 'hola@origennatal.com', name: 'ORIGEN NATAL' };
const LA_TIENDA = 'hola.origennatal@gmail.com';

async function mandar(cuerpo, que) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    console.error(`[p1] Sin BREVO_API_KEY: no se manda ${que}`);
    return false;
  }

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({ sender: REMITENTE, ...cuerpo }),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    throw new Error(`Brevo ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  return true;
}

// Lo que escriba una persona en su nombre no puede colarse como HTML.
const esc = txt => String(txt == null ? '' : txt)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// El mismo marco para los dos correos del cliente, con los colores de la web.
function carta(cuerpo) {
  return `<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#fffbef;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbef;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3ddd2;border-radius:12px;">
<tr><td style="padding:32px 28px;font-family:'Open Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#3a3a3a;">
${cuerpo}
<p style="margin:28px 0 0;font-size:14px;color:#6e7b7f;">Origen Natal · <a href="mailto:hola@origennatal.com" style="color:#bd9048;">hola@origennatal.com</a></p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}

// ── P1-1 · BIENVENIDA ────────────────────────────────────────────
// Se manda en cuanto Stripe confirma el cobro, mientras su informe se esta
// escribiendo por detras. Dice lo mismo que la pantalla de gracias.
export async function correoBienvenida({ email, nombre }) {
  if (!email) return false;
  return mandar({
    to: [{ email, name: nombre || '' }],
    subject: '¡Gracias por tu compra! Estamos preparando tu Diseño de Origen',
    htmlContent: carta(`
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;line-height:1.3;color:#0e3f4b;">¡Ya está! Acabas de dar un paso importante por ti</p>
<p style="margin:0 0 16px;">Hola${nombre ? ' ' + esc(nombre) : ''},</p>
<p style="margin:0 0 16px;">Estamos preparando <b style="color:#bd9048;">Tu Diseño de Origen</b>. Te llegará directo a este email en unos minutos, con tu PDF adjunto.</p>
<p style="margin:0 0 16px;">No tienes que hacer nada: cuando esté, te lo mandamos aquí.</p>
<p style="margin:0;"><b style="color:#bd9048;">Guarda hola@origennatal.com en los contactos de tu email, para que no se vaya a spam.</b></p>`),
  }, 'la bienvenida');
}

// ── P1-3 · NO HA SALIDO ──────────────────────────────────────────
// Se manda cuando se han agotado los reintentos y su informe sigue sin salir.
// No se le pide nada: se le dice que lo sacamos nosotros y se lo mandamos.
export async function correoRevisando({ email, nombre }) {
  if (!email) return false;
  return mandar({
    to: [{ email, name: nombre || '' }],
    subject: 'Tu Diseño de Origen está tardando más de lo normal',
    htmlContent: carta(`
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;line-height:1.3;color:#0e3f4b;">Lo estamos revisando</p>
<p style="margin:0 0 16px;">Hola${nombre ? ' ' + esc(nombre) : ''},</p>
<p style="margin:0 0 16px;">Tu Diseño de Origen no ha terminado de prepararse y estamos mirando qué ha pasado. Lo sacamos nosotros a mano y te lo mandamos a este mismo email.</p>
<p style="margin:0 0 16px;">No tienes que hacer nada ni volver a pagar. Tu compra está registrada.</p>
<p style="margin:0;">Si quieres preguntarnos cualquier cosa, escríbenos a <a href="mailto:hola@origennatal.com" style="color:#bd9048;">hola@origennatal.com</a>.</p>`),
  }, 'el aviso de que se revisa');
}

// ── EL AVISO A LA TIENDA ─────────────────────────────────────────
// El mismo caso, contado para dentro: con todo lo que hace falta para sacar
// ese informe a mano.
export async function correoALaTienda({ compra, email, nombre, telefono, sexo, nacimiento, intentos, motivo }) {
  return mandar({
    to: [{ email: LA_TIENDA, name: 'Admin' }],
    subject: `⚠️ URGENTE — Cliente sin informe tras ${intentos} intentos — ${nombre || 'Cliente'}`,
    htmlContent: `<pre style="font-family:monospace;background:#fff5f4;padding:16px;border-radius:8px;">${esc([
      'Este cliente HA PAGADO y NO tiene su informe. Hay que generarselo a mano.',
      '',
      `Email:    ${email || '(desconocido)'}`,
      `Nombre:   ${nombre || '-'}`,
      `Telefono: ${telefono || '-'}`,
      `Sexo:     ${sexo || '-'}`,
      `Nacio:    ${nacimiento || '-'}`,
      `Compra:   ${compra}`,
      `Intentos: ${intentos}`,
      `Motivo:   ${motivo || '-'}`,
      '',
      `Cuando:   ${new Date().toISOString()}`,
    ].join('\n'))}</pre>`,
  }, 'el aviso a la tienda');
}
