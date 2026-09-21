// ═════════════════════════════════════════════════════════════════
// /api/p2-plan/correo.js
// El correo que le entrega su plan, con el PDF dentro.
//
// PARA QUE. El plan se monta por detras y se guarda, pero eso ella no lo ve.
// Lo que ha pagado le llega por aqui.
//
// COMO. Se maqueta su PDF con lo que se acaba de guardar y se manda con el
// correo. A quien va escrito en su informe del P1, que es de donde sale todo
// lo suyo: no hace falta que lo escriba en ningun sitio.
//
// SIN PLANTILLA DE BREVO. El cuerpo va escrito aqui, con los colores de la
// web, igual que los otros correos que todavia no tienen plantilla. Cuando la
// tenga, se cambia el cuerpo por su numero y lo demas se queda igual.
//
// POR QUE ESTA AQUI. Es solo del P2 y vive en su carpeta, como el resto del
// producto. El correo del P1 no se toca.
// ═════════════════════════════════════════════════════════════════

import { leerInforme } from '../../lib/guardar-informe.js';

const REMITENTE = { email: 'hola@origennatal.com', name: 'ORIGEN NATAL' };

// Nuestra web, puesta aqui y no sacada de la peticion: esto lo llama nuestro
// propio servidor y no hay nadie de fuera a quien creerle la direccion.
const NUESTRA_WEB = 'https://origennatal.com';

// Lo que escriba una persona en su nombre no puede colarse como HTML.
const esc = txt => String(txt == null ? '' : txt)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// El nombre del fichero que le llega: solo letras y numeros, que es lo que
// aguanta cualquier correo y cualquier movil.
function comoSeLlamaElFichero(nombre) {
  const suyo = String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return `TuPlanDeOrigen${suyo ? '_' + suyo : ''}.pdf`;
}

// El mismo marco que los otros correos, con los colores de la web.
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

// ── SU PDF ────────────────────────────────────────────────────
//
// Se monta con el documento que se acaba de guardar, sin volver a pedirle
// nada al modelo: es exactamente lo que se ha escrito para ella.
async function maquetarSuPDF(documento) {
  const resp = await fetch(`${NUESTRA_WEB}/api/p2-plan/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(documento),
    signal: AbortSignal.timeout(60000),
  });
  if (!resp.ok) {
    throw new Error(`El PDF no se ha podido montar (${resp.status}): ${(await resp.text()).slice(0, 200)}`);
  }
  const datos = await resp.json();
  const suyo = String(datos?.pdfBase64 || '');
  if (!suyo) throw new Error('El PDF ha venido vacío');

  // Lo que devuelve viene como direccion de datos; el correo quiere solo el
  // contenido, y sin espacios ni saltos de linea.
  const coma = suyo.indexOf(',');
  const limpio = (suyo.startsWith('data:') && coma > -1 ? suyo.slice(coma + 1) : suyo)
    .replace(/[\r\n\t\s]/g, '');
  if (!limpio) throw new Error('El PDF ha venido vacío');
  return limpio;
}

// ── Y SE LO MANDAMOS ──────────────────────────────────────────
//
// Devuelve a quien se le ha mandado. Si algo falla, lo dice: quien llama
// decide, porque el plan ya esta guardado y se puede volver a mandar.
export async function mandarSuPlan({ compra, documento }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) throw new Error('Sin BREVO_API_KEY no se puede mandar el correo');
  if (!documento) throw new Error('Sin documento no hay nada que mandar');

  // A QUIEN. Sale de su informe del P1, que es el mismo del que sale su plan.
  const informe = await leerInforme({ producto: 'p1', sessionId: compra });
  const email = String(informe?.cliente?.email || '').trim();
  if (!email) throw new Error('Ese informe no tiene email al que mandarlo');

  const nombre = String(documento.nombre || '').trim();
  const deDia = nombre.split(' ')[0] || '';

  const pdf = await maquetarSuPDF(documento);

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      sender: REMITENTE,
      to: [{ email, name: nombre }],
      subject: 'Aquí tienes Tu Plan de Origen',
      htmlContent: carta(`
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;line-height:1.3;color:#0e3f4b;">Aquí lo tienes</p>
<p style="margin:0 0 16px;">Hola${deDia ? ' ' + esc(deDia) : ''},</p>
<p style="margin:0 0 16px;">Te adjuntamos <b style="color:#bd9048;">Tu Plan de Origen</b> en PDF. Dentro tienes tus pruebas, qué hacer con cada una y dónde te vas a caer, además de tu hoja de ruta para verlo todo de un vistazo.</p>
<p style="margin:0 0 16px;">Guárdalo donde lo tengas a mano: está hecho para volver a él, no para leerlo una vez.</p>
<p style="margin:0;">Si necesitas cualquier cosa, escríbenos a <a href="mailto:hola@origennatal.com" style="color:#bd9048;">hola@origennatal.com</a>.</p>`),
      attachment: [{ name: comoSeLlamaElFichero(nombre), content: pdf }],
    }),
  });

  if (!resp.ok) {
    throw new Error(`Brevo ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  return { email };
}
