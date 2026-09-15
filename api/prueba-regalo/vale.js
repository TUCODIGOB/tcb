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

// Y aqui se apunta cuantas veces se le ha escrito un diseño a cada email, con
// los datos que se usaron la ultima vez.
const VECES = 'veces';

// LO QUE SE LE ESCRIBE A UN MISMO EMAIL: el suyo y una correccion, por si se
// equivoco al escribir su hora o su lugar. Ni uno mas.
export const MAX_VECES = 2;

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

// ── LAS VECES QUE SE LE HA ESCRITO ─────────────────────────────
//
// Se lleva la cuenta en el servidor, en la carpeta del regalo. El navegador
// no pinta nada aqui: por mucho que se borre, la cuenta sigue siendo la
// misma.
export async function leerVeces(huella) {
  if (!huella) return { veces: 0, datos: null };
  try {
    const guardado = await leer(VECES, huella);
    if (!guardado) return { veces: 0, datos: null };
    return { veces: Number(guardado.veces || 0), datos: guardado.datos || null };
  } catch (err) {
    console.error('[regalo] No se ha podido leer las veces:', err.message);
    return { veces: 0, datos: null };
  }
}

// Se apunta una vez mas, y con que datos. Si esto fallara, como mucho le
// quedaria una correccion de mas; nunca deja a nadie sin su diseño.
export async function apuntarUnaVez(huella, datos) {
  if (!huella) return false;
  try {
    const ahora = await leerVeces(huella);
    await escribir(VECES, huella, { veces: ahora.veces + 1, datos: loQueGuarda(datos), cuando: Date.now() });
    return true;
  } catch (err) {
    console.error('[regalo] No se ha podido apuntar la vez:', err.message);
    return false;
  }
}

// ¿SON LOS MISMOS DATOS? Solo se miran los que cambian lo que se escribe. El
// telefono no: cambiarlo no cambia ni una palabra de su diseño.
const igual = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export function sonLosMismos(a, b) {
  if (!a || !b) return false;
  return ['nombre', 'sexo', 'fecha', 'hora', 'municipio', 'provincia', 'pais']
    .every(campo => igual(a[campo], b[campo]));
}

// COMO LOS ESPERA EL FORMULARIO. Lo guardado se devuelve con los mismos
// nombres que usa la pagina, para que la portada y el boton de comprar
// enseñen exactamente los datos con los que se calculo su carta.
function comoLosPideLaPagina(datos) {
  if (!datos) return null;
  const [anio, mes, dia] = String(datos.fecha || '').split('-').map(Number);
  let edad = '';
  if (anio && mes && dia) {
    const hoy = new Date();
    edad = hoy.getFullYear() - anio;
    const m = (hoy.getMonth() + 1) - mes;
    if (m < 0 || (m === 0 && hoy.getDate() < dia)) edad--;
  }
  return {
    nombre: datos.nombre || '',
    sexo: datos.sexo || '',
    email: datos.email || '',
    telefonoCompleto: datos.telefono || '',
    fecha: datos.fecha || '',
    hora: datos.hora || '',
    municipio: datos.municipio || '',
    provincia: datos.provincia || '',
    pais: datos.pais || '',
    edadCalculada: edad,
  };
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
    const huella = huellaDelEmail(datos.email);
    const yaLoTiene = await leer('', huella);
    const tieneDiseno = Boolean(yaLoTiene && yaLoTiene.areas && yaLoTiene.areas.length);

    if (tieneDiseno) {
      const cuenta = await leerVeces(huella);
      // Sin la cuenta no se sabe con que datos se le escribio, asi que no se
      // le escribe otro: se le devuelve el suyo. Antes escribir de mas que
      // darle una persona distinta de la que ya leyo.
      const losMismos = !cuenta.datos || sonLosMismos(cuenta.datos, datos);

      // SE LE DEVUELVE EL QUE YA TENIA cuando no hay nada nuevo que escribir:
      // porque vuelve con los mismos datos, o porque ya ha gastado su
      // correccion. Se devuelve tambien CON QUE DATOS se escribio, no con los
      // que acaba de teclear, para que lo que lea y lo que vea cuadren.
      if (losMismos || cuenta.veces >= MAX_VECES) {
        return res.status(200).json({
          yaLoTiene: true,
          texto: yaLoTiene.areas[0],
          rasgos: yaLoTiene.rasgos || {},
          datos: comoLosPideLaPagina(cuenta.datos),
          puedeCorregir: Boolean(cuenta.datos) && losMismos && cuenta.veces < MAX_VECES,
        });
      }
      // Datos distintos y le queda su correccion: se le escribe de nuevo.
    }

    const codigo = nuevoCodigo();
    await escribir(VALES, codigo, { creado: Date.now(), datos });
    return res.status(200).json({ vale: codigo });

  } catch (err) {
    console.error('[regalo] No se ha podido dar el vale:', err.message);
    return res.status(500).json({ error: 'No se ha podido empezar' });
  }
}
