// ═════════════════════════════════════════════════════════════════
// /api/p2-plan/arranque.js
// La unica entrada del P2: "hazme el plan de esta compra".
//
// QUE HACE. Monta el documento entero desde el servidor y lo guarda. Nada
// mas: ni correo, ni reintentos, ni PDF. Eso va por su lado.
//
// POR QUE HACE FALTA. Hasta ahora el P2 solo salia si alguien abria la pagina
// de pruebas y le daba a un boton. Asi no se le puede entregar a nadie: quien
// paga no va a darle a ningun boton, y si quien mira cierra la pestana el
// documento se queda a medias.
//
// QUIEN PUEDE LLAMAR. Solo nuestro propio servidor. Montar un plan cuesta
// dinero, asi que se exige la misma llave interna que ya usa el P1: sin ella,
// cualquiera con el enlace podria mandar montar el plan de otra persona, una
// y otra vez.
//
// Y NO SE MONTA DOS VECES. Dos cosas lo impiden, y las dos miran antes de
// gastar un solo centimo:
//   · si esa compra ya tiene su plan guardado, se contesta que ya esta
//   · y mientras se esta montando, su cerrojo aparta a quien llegue detras
// ═════════════════════════════════════════════════════════════════

import { montarElPlan } from './prueba.js';
import { guardarElPlan, leerElPlan, cogerElCerrojo, soltarElCerrojo } from './almacen.js';

// QUIEN LLAMA AQUI ES NUESTRO PROPIO SERVIDOR, NO UN NAVEGADOR. La misma
// llave que el P1: la conoce el aviso del cobro y nadie mas.
function laLlaveEsBuena(req) {
  const clave = process.env.STRIPE_WEBHOOK_SECRET || '';
  return Boolean(clave) && req.headers['x-origen-interno'] === clave;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!laLlaveEsBuena(req)) return res.status(401).json({ error: 'No autorizado' });

  const compra = String(req.body?.compra || '').trim();
  if (!compra) return res.status(400).json({ error: 'Falta la compra de la que hay que hacer el plan' });

  // ── ¿YA LO TIENE? ────────────────────────────────────────────
  //
  // Antes que nada. El aviso del cobro puede repetirse y un reintento puede
  // llegar tarde: si el plan ya esta guardado, aqui no se vuelve a gastar.
  try {
    const guardado = await leerElPlan(compra);
    if (guardado) {
      return res.status(200).json({ compra, yaEstaba: true, montado: false });
    }
  } catch (err) {
    console.error('[p2-plan/arranque] no se ha podido mirar si ya lo tenía:', err.message);
    return res.status(503).json({ error: 'No se ha podido mirar si ya tenía su plan: ' + err.message });
  }

  // ── EL CERROJO ───────────────────────────────────────────────
  let cerrojo = null;
  try {
    cerrojo = await cogerElCerrojo(compra);
  } catch (err) {
    console.error('[p2-plan/arranque] no se ha podido coger el cerrojo:', err.message);
    return res.status(503).json({ error: 'No se ha podido coger el cerrojo: ' + err.message });
  }
  if (!cerrojo) {
    // No es un fallo: es que ya se le está haciendo. Quien llame que lo
    // vuelva a mirar más tarde.
    return res.status(409).json({ compra, seEstaHaciendo: true, montado: false });
  }

  // ── Y SE MONTA ───────────────────────────────────────────────
  try {
    const { documento, falta, cuaderno, cliente, plan, creencias } = await montarElPlan({ compra });

    // UN PLAN A MEDIAS TAMBIEN SE GUARDA. No se entrega, pero es justo el que
    // hay que mirar despues para saber por donde se torcio.
    await guardarElPlan({ compra, cliente, documento, plan, creencias, cuaderno });

    if (!documento) {
      console.warn(`[p2-plan/arranque] el plan de ${compra} no ha salido entero: ${falta}`);
      return res.status(500).json({ compra, montado: false, falta });
    }

    console.log(`[p2-plan/arranque] el plan de ${compra}: ${documento.partes.length} pruebas y ${documento.creencias.length} creencias`);
    return res.status(200).json({
      compra,
      montado: true,
      pruebas: documento.partes.length,
      creencias: documento.creencias.length,
    });
  } catch (err) {
    console.error('[p2-plan/arranque]', err);
    // Un informe que no da para un plan no es un servidor roto: se dice como
    // lo que es, para no hacer buscar un fallo donde no lo hay.
    return res.status(err.esDelInforme ? 422 : 500).json({ compra, montado: false, error: err.message });
  } finally {
    // EL CERROJO SE SUELTA PASE LO QUE PASE. Si no, esa compra se quedaria
    // diez minutos sin poder intentarse otra vez.
    try {
      await soltarElCerrojo(compra, cerrojo);
    } catch (err) {
      console.warn('[p2-plan/arranque] no se ha podido soltar el cerrojo:', err.message);
    }
  }
}
