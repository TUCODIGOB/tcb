// ═════════════════════════════════════════════════════════════════
// /api/prueba-regalo/vale.js
// El permiso para preparar un regalo.
//
// QUE PROBLEMA RESUELVE. Escribir el regalo cuesta dinero, y hasta ahora
// bastaba con pedirselo al servidor para que lo escribiera. Cualquiera podia
// pedirlo las veces que quisiera, con los datos que quisiera.
//
// COMO. Al mandar el formulario se guardan aqui sus datos y se le devuelve un
// codigo. Ese codigo es lo unico que viaja despues: los datos de nacimiento
// con los que se escribe el regalo salen de aqui, no de lo que mande nadie.
//
// El codigo se quema al usarlo, asi que no sirve dos veces.
// ═════════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { leer, escribir, borrar } from './almacen.js';

// Los vales viven aqui dentro, aparte de los regalos ya escritos.
const VALES = 'vales';

// Un dia de sobra para lo que tarda esto. Un vale mas viejo no se usa.
const CADUCA_MS = 24 * 60 * 60 * 1000;

function nuevoCodigo() {
  return crypto.randomBytes(24).toString('base64url');
}

// EL MISMO SITIO QUE YA USAN LA CARTA Y EL AREA: una huella de su email.
export function huellaDelEmail(email) {
  const limpio = String(email || '').trim().toLowerCase();
  if (!limpio) return '';
  return crypto.createHash('sha256').update(limpio).digest('hex').slice(0, 32);
}

// LO QUE GUARDA EL VALE. Solo lo que hace falta para escribir el regalo.
function loQueGuarda(datos) {
  return {
    nombre: String(datos.nombre || '').trim(),
    sexo: String(datos.sexo || '').trim(),
    email: String(datos.email || '').trim().toLowerCase(),
    telefono: String(datos.telefonoCompleto || datos.telefono || '').trim(),
    fecha: String(datos.fecha || '').trim(),
    hora: String(datos.hora || '').trim(),
    municipio: String(datos.municipio || '').trim(),
    provincia: String(datos.provincia || '').trim(),
    pais: String(datos.pais || '').trim(),
  };
}

function estaCompleto(p) {
  return Boolean(p.nombre && p.sexo && p.email && p.fecha && p.hora
    && p.municipio && p.provincia && p.pais);
}

// Lo que se espera entre coger el vale y comprobar que sigue siendo nuestro.
// Cubre lo que tarda en verse la escritura de otro que leyo a la vez. Es lo
// mismo que hace el P1 en lib/reserva.js.
const ESPERA_MS = 1500;

// Escrituras que se permiten con un mismo vale: la que falla y una mas. Los
// mismos dos que da el P1 por cada compra.
const MAX_INTENTOS = 2;

// ── LO QUE USA QUIEN ESCRIBE EL REGALO ─────────────────────────
//
// Devuelve { datos, marca, ultimo } o null si el vale no sirve: no existe, esta
// caducado, se le han acabado los intentos, o lo tiene cogido otro.
//
// DOS PESTANAS A LA VEZ NO SON DOS REGALOS. No basta con mirar: las dos
// mirarian antes de que ninguna escribiera, y las dos escribirian. Asi que
// primero se coge poniendole una marca, se espera, y se vuelve a mirar: solo
// sigue quien encuentre su propia marca. El que pierde, se queda fuera.
export async function cobrarElVale(codigo) {
  const guardado = await leer(VALES, codigo);
  if (!guardado || !guardado.datos) return null;
  if (Date.now() - Number(guardado.creado || 0) > CADUCA_MS) return null;
  if (guardado.cogidoPor) return null;                       // lo tiene otro
  if (Number(guardado.intentos || 0) >= MAX_INTENTOS) return null;

  const marca = nuevoCodigo();
  const intentos = Number(guardado.intentos || 0) + 1;
  await escribir(VALES, codigo, { ...guardado, cogidoPor: marca, cogidoEn: Date.now(), intentos });
  await new Promise(r => setTimeout(r, ESPERA_MS));

  const comprobar = await leer(VALES, codigo);
  if (!comprobar || comprobar.cogidoPor !== marca) return null;

  // `ultimo` avisa de que este era el ultimo intento: si sale mal, ya no
  // queda ninguno y hay que apuntarlo para reintentarlo por detras.
  return { datos: guardado.datos, marca, ultimo: intentos >= MAX_INTENTOS };
}

// SE SUELTA CUANDO NO HA SALIDO. Asi el boton de volver a intentarlo puede
// usarlo otra vez en el acto, sin esperar a nada. El intento ya esta contado,
// asi que soltarlo no regala escrituras.
export async function soltarElVale(codigo, marca) {
  try {
    const guardado = await leer(VALES, codigo);
    if (!guardado || guardado.cogidoPor !== marca) return;
    await escribir(VALES, codigo, { ...guardado, cogidoPor: '', cogidoEn: 0 });
  } catch (err) {
    console.error('[regalo] No se ha podido soltar el vale:', err.message);
  }
}

// SE QUEMA CUANDO YA HA SALIDO. A partir de aqui ese codigo no sirve de nada.
export async function quemarElVale(codigo) {
  try {
    await borrar(VALES, codigo);
  } catch (err) {
    console.error('[regalo] No se ha podido quemar el vale:', err.message);
  }
}

// ── LA PUERTA: DAR UN VALE ─────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const datos = loQueGuarda(req.body || {});
  if (!estaCompleto(datos)) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    // SI ESE EMAIL YA TIENE SU REGALO, no se da vale nuevo: no hay nada que
    // escribir. Se le dice que ya lo tiene y quien llama le lleva a leerlo.
    // SE LE DEVUELVE EL QUE YA TENIA, tal cual se guardo. Solo llega hasta
    // aqui quien ha escrito su email y sus datos de nacimiento enteros.
    const yaLoTiene = await leer('', huellaDelEmail(datos.email));
    if (yaLoTiene && yaLoTiene.areas && yaLoTiene.areas.length) {
      return res.status(200).json({
        yaLoTiene: true,
        texto: yaLoTiene.areas[0],
        rasgos: yaLoTiene.rasgos || {},
      });
    }

    const codigo = nuevoCodigo();
    await escribir(VALES, codigo, { creado: Date.now(), datos });
    return res.status(200).json({ vale: codigo });

  } catch (err) {
    console.error('[regalo] No se ha podido dar el vale:', err.message);
    return res.status(500).json({ error: 'No se ha podido empezar' });
  }
}
