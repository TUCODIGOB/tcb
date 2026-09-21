// ═════════════════════════════════════════════════════════════════
// /api/p2-plan/quien.js
// De quien es el enlace con el que se llega al P2.
//
// PARA QUE. En el PDF del P1 hay un boton que lleva a la landing del P2, y ese
// enlace trae dentro el numero de su compra. Con el, la pagina puede saludarla
// por su nombre sin pedirle nada ni que escriba su correo.
//
// SOLO DEVUELVE EL NOMBRE DE PILA. Nada mas: ni su email, ni su fecha de
// nacimiento, ni una linea de su informe. Lo justo para el saludo.
//
// DE DONDE SALE. Del informe del P1 que ya se le guardo -que es el mismo del
// que saldra su plan-, y si ahi no estuviera, de la ficha de su email. Es lo
// mismo que mira el P2 al montar el documento, asi que el nombre del saludo y
// el del documento son siempre el mismo.
//
// Y SI NO SE SABE, NO SE INVENTA. Sin informe guardado o sin nombre dentro, se
// contesta que no se sabe y la pagina no saluda a nadie. Antes eso que
// saludarla con un nombre que no es el suyo.
//
// POR QUE NO PIDE LLAVE. El numero de compra de Stripe es largo y aleatorio:
// quien lo tiene es porque le llego su propio PDF. Es la misma cerradura que
// ya protege ese boton, y aqui no se devuelve nada que no vaya a leer ella
// misma en su propia pantalla.
// ═════════════════════════════════════════════════════════════════

import { leerInforme } from '../../lib/guardar-informe.js';
import { leerLaFicha } from '../../lib/ficha-del-lead.js';

// El numero de compra forma parte de la ruta que se va a buscar: no puede
// llevar barras ni nada raro.
const limpio = txt => String(txt || '').replace(/[^A-Za-z0-9_-]/g, '');

// SOLO EL NOMBRE DE PILA. Si en su ficha esta el nombre entero, para el saludo
// va la primera palabra: a nadie se le llama por el apellido.
function elDePila(entero) {
  const limpiado = String(entero || '').trim().replace(/\s+/g, ' ');
  if (!limpiado) return '';
  return limpiado.split(' ')[0];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const suyo = req.body?.p1;
  const compra = typeof suyo === 'string' ? limpio(suyo.trim()) : '';
  if (!compra) return res.status(400).json({ error: 'Falta el número de su informe' });

  try {
    const informe = await leerInforme({ producto: 'p1', sessionId: compra });
    if (!informe) {
      return res.status(404).json({ error: 'No hay ningún informe con ese número' });
    }

    const dentro = informe.cliente || {};
    let nombre = elDePila(dentro.nombre);

    // En los informes de antes el nombre no venia dentro: esta en la ficha de
    // su email, que es donde lo busca tambien el P2 al escribir.
    if (!nombre && dentro.email) {
      const ficha = await leerLaFicha(dentro.email);
      nombre = elDePila(ficha?.cliente?.nombre);
    }

    return res.status(200).json({ nombre });

  } catch (err) {
    console.error('[p2-plan/quien] No se ha podido saber de quién es:', err.message);
    // La pagina se apaña sin el nombre, asi que un fallo aqui no la rompe.
    return res.status(500).json({ error: 'No se ha podido leer' });
  }
}
