// ═════════════════════════════════════════════════════════════════
// /api/p2-plan/informes.js
// Lee los planes del P2 ya guardados, para poder mirarlos.
//
// PARA QUE. El plan se monta por detras y nadie ve como ha ido. Al terminar
// queda guardado todo: lo que se decidio, que quito cada corte, de que desafio
// sale cada cosa y lo que tardo y costo cada llamada. Esta puerta es lo unico
// que hace falta para leerlo desde la pagina de control.
//
// SOLO LEE. No monta nada, no borra nada y no toca ningun plan. Si esto
// desapareciera manana, el P2 seguiria funcionando igual.
//
// DOS MANERAS DE PEDIR:
//   · sin nada          -> la lista de planes, de mas nuevo a mas viejo
//   · ?compra=cs_...    -> el plan entero de esa compra
//
// CERRADA CON LLAVE. Lleva dentro el nombre y el documento entero de una
// persona, asi que no puede quedar abierta. Entra quien traiga
// P2_INFORMES_CLAVE, igual que en las puertas del P0 y del P1.
//
// POR QUE ESTA AQUI Y NO EN api/. Es solo del P2 y vive en su carpeta, igual
// que el resto del producto. Lee de su almacen y de ningun sitio mas.
// ═════════════════════════════════════════════════════════════════

import { leerElPlan, losPlanes } from './almacen.js';

// Lo que llega de fuera no puede llevar barras ni nada raro: es lo que forma
// el nombre del fichero que se va a buscar.
const limpio = txt => String(txt || '').replace(/[^A-Za-z0-9_-]/g, '');

// CUANTOS SE ABREN PARA SABER DE QUIEN SON. El nombre no esta en la lista de
// R2, hay que abrir el plan. Se abren los ultimos, que son los que se miran, y
// todos a la vez para que no se note.
const CON_NOMBRE = 15;

// LA LISTA. Los nombres y la fecha de cada plan guardado. A los ultimos se les
// pone ademas de quien son; si alguno no se puede abrir, se queda sin nombre y
// la lista sale igual.
async function laLista() {
  const planes = await losPlanes(200);

  await Promise.all(planes.slice(0, CON_NOMBRE).map(async plan => {
    try {
      const suyo = await leerElPlan(plan.compra);
      plan.nombre = String(suyo?.cliente?.nombre || '').trim();
      // Si no salio entero, que se vea en la lista sin tener que abrirlo.
      plan.entero = Boolean(suyo?.documento);
    } catch (err) {
      console.error(`[p2-plan/informes] No se ha podido saber de quién es ${plan.compra}:`, err.message);
    }
  }));

  return planes;
}

export default async function handler(req, res) {
  const clave = process.env.P2_INFORMES_CLAVE;
  if (!clave) {
    console.error('[p2-plan/informes] Sin P2_INFORMES_CLAVE: la puerta no se abre');
    return res.status(500).json({ error: 'Sin llave' });
  }
  const traida = req.headers['x-p2-clave'] || (req.query && req.query.clave) || '';
  if (traida !== clave) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const compra = limpio((req.query && req.query.compra) || '');

  try {
    // SIN COMPRA: la lista.
    if (!compra) {
      return res.status(200).json({ planes: await laLista() });
    }

    // CON COMPRA: ese plan entero.
    const suyo = await leerElPlan(compra);
    if (!suyo) {
      return res.status(404).json({ error: 'No hay ningún plan guardado con ese número' });
    }
    return res.status(200).json(suyo);

  } catch (err) {
    console.error('[p2-plan/informes] No se ha podido leer:', err.message);
    return res.status(500).json({ error: 'No se ha podido leer' });
  }
}
