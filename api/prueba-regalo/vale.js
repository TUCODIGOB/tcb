// ═════════════════════════════════════════════════════════════════
// /api/prueba-regalo/vale.js
// El permiso para preparar un regalo.
//
// QUE PROBLEMA RESUELVE. Escribir el regalo cuesta dinero, y hasta ahora
// bastaba con pedirselo al servidor para que lo escribiera. Cualquiera podia
// pedirlo las veces que quisiera, con los datos que quisiera.
//
// COMO. Al mandar el formulario se guardan aqui sus datos, se le devuelve un
// codigo y, desde aqui mismo, se empieza a preparar su regalo en el servidor:
// sigue aunque la pagina se cierre o se quede sin cobertura. Los datos de
// nacimiento con los que se escribe salen de aqui, no de lo que mande nadie.
//
// Con ese codigo la pagina solo puede preguntar como va y, si no sale, pedir
// el segundo intento con el boton. Cuando esta escrito, el vale guarda lo que
// se le enseña y sus datos se quitan, asi que no sirve para escribir otro.
// ═════════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { waitUntil } from '@vercel/functions';
import { leer, escribir } from './almacen.js';
import { registrarLead } from '../captar-lead.js';
import { crearReloj } from './llamadas.js';
import { prepararEnElServidor } from './escribir.js';

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

// Y aqui, por cada email, el vale del diseño que se le esta haciendo.
const EN_MARCHA = 'marcha';

// Lo mas que puede durar un intento: los 5 minutos de Vercel, y uno de
// margen. Un intento que lleva mas, es que el servidor se corto a medias.
const VIVO_MS = 6 * 60 * 1000;

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

// Los años que tiene hoy quien nacio ese dia.
function laEdad(fecha) {
  const [anio, mes, dia] = String(fecha || '').split('-').map(Number);
  if (!anio || !mes || !dia) return '';
  const hoy = new Date();
  let edad = hoy.getFullYear() - anio;
  const m = (hoy.getMonth() + 1) - mes;
  if (m < 0 || (m === 0 && hoy.getDate() < dia)) edad--;
  return edad;
}

// COMO LOS ESPERA EL FORMULARIO. Lo guardado se devuelve con los mismos
// nombres que usa la pagina, para que la portada y el boton de comprar
// enseñen exactamente los datos con los que se calculo su carta.
function comoLosPideLaPagina(datos) {
  if (!datos) return null;
  const edad = laEdad(datos.fecha);
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

// SE SUELTA EN FALLO CUANDO NO HA SALIDO. Es lo que hace salir el boton de
// volver a intentarlo, que puede usarlo en el acto, sin esperar a nada. El
// intento ya esta contado, asi que soltarlo no regala escrituras.
export async function dejarEnFallo(codigo, marca) {
  try {
    const guardado = await leer(VALES, codigo);
    if (!guardado || guardado.cogidoPor !== marca) return;
    await escribir(VALES, codigo, { ...guardado, cogidoPor: '', cogidoEn: 0, fallo: Date.now() });
  } catch (err) {
    console.error('[regalo] No se ha podido soltar el vale:', err.message);
  }
}

// EL BOTON. Solo vale si el vale esta en fallo esperando que lo pulsen: le
// quita el fallo y dice que se puede lanzar el siguiente intento.
export async function volverAIntentarlo(codigo) {
  const guardado = await leer(VALES, codigo);
  if (!guardado || !guardado.datos || !guardado.fallo || guardado.cogidoPor) return false;
  if (Date.now() - Number(guardado.creado || 0) > CADUCA_MS) return false;
  await escribir(VALES, codigo, { ...guardado, fallo: 0 });
  return true;
}

// YA HA SALIDO: el vale se queda solo con lo que enseña la pagina. Sin sus
// datos no se puede volver a cobrar, asi que no sirve para escribir otro.
export async function dejarListo(codigo, salida) {
  await escribir(VALES, codigo, { creado: Date.now(), estado: 'listo', salida });
}

// NO HA SALIDO Y SE SIGUE POR DETRAS: el vale lo dice, para que la pagina no
// se quede esperando. Tampoco sirve para escribir otro.
export async function dejarPendiente(codigo) {
  try {
    await escribir(VALES, codigo, { creado: Date.now(), estado: 'pendiente' });
  } catch (err) {
    console.error('[regalo] No se ha podido dejar pendiente el vale:', err.message);
  }
}

// ¿SE LE ESTA HACIENDO YA UNO? Si vuelve a mandar el formulario mientras
// tanto, con los mismos datos o con otros, se le lleva al que ya esta en
// marcha en vez de empezar otro. Cuando termine, puede corregir como siempre.
// Devuelve su vale, o '' si no hay ninguno vivo.
async function elQueEstaEnMarcha(huella) {
  try {
    const marcha = await leer(EN_MARCHA, huella);
    if (!marcha || !marcha.vale) return '';
    const guardado = await leer(VALES, marcha.vale);
    // Ya salio, o ya esta apuntado para mandarselo: no hay nada en marcha.
    if (!guardado || !guardado.datos) return '';
    if (Date.now() - Number(guardado.creado || 0) > CADUCA_MS) return '';
    // Haciendose, esperando el boton de volver a intentarlo, o a punto de
    // empezar: vivo si no pasa del tope desde lo ultimo que hizo. Un fallo
    // que nadie ha vuelto a intentar no le deja atascada: pasado el tope, el
    // formulario funciona normal.
    const desde = guardado.cogidoPor ? Number(guardado.cogidoEn || 0)
      : Number(guardado.fallo || guardado.creado || 0);
    return Date.now() - desde < VIVO_MS ? marcha.vale : '';
  } catch (err) {
    console.error('[regalo] No se ha podido mirar si ya tenia uno en marcha:', err.message);
    return '';
  }
}

// ── COMO VA ────────────────────────────────────────────────────
//
// Lo unico que puede pedir la pagina con su codigo. No escribe nada ni cuesta
// dinero: solo lee.
async function comoVa(req, res) {
  const codigo = String((req.query && req.query.v) || '').trim();
  // Un codigo nuestro solo lleva estas letras. Cualquier otra cosa se para
  // aqui, sin llegar a pedirle nada al almacen.
  if (!codigo || !/^[A-Za-z0-9_-]{16,64}$/.test(codigo)) {
    return res.status(400).json({ estado: 'no' });
  }
  try {
    const guardado = await leer(VALES, codigo);
    if (!guardado || Date.now() - Number(guardado.creado || 0) > CADUCA_MS) {
      return res.status(404).json({ estado: 'no' });
    }
    if (guardado.estado === 'listo') {
      return res.status(200).json({ estado: 'listo', salida: guardado.salida });
    }
    if (guardado.estado === 'pendiente') {
      return res.status(200).json({ estado: 'pendiente' });
    }
    if (guardado.fallo && !guardado.cogidoPor) {
      return res.status(200).json({ estado: 'fallo' });
    }
    return res.status(200).json({ estado: 'preparando' });
  } catch (err) {
    console.error('[regalo] No se ha podido mirar el vale:', err.message);
    return res.status(500).json({ error: 'No se ha podido mirar' });
  }
}

// ── LA PUERTA: DAR UN VALE Y EMPEZAR ───────────────────────────
export default async function handler(req, res) {
  if (req.method === 'GET') return comoVa(req, res);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // EL RELOJ ARRANCA AQUI, al entrar el formulario: es cuando empieza a
  // contar el tope de Vercel para todo lo que viene detras.
  const reloj = crearReloj();

  const datos = loQueGuarda(req.body || {});
  if (!estaCompleto(datos)) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const huella = huellaDelEmail(datos.email);

    // SI YA SE LE ESTA HACIENDO UNO, se le lleva a ese: nunca dos a la vez. Va
    // lo primero: mientras se hace su correccion, lo guardado es el anterior.
    const enMarcha = await elQueEstaEnMarcha(huella);
    if (enMarcha) return res.status(200).json({ vale: enMarcha });

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

    // Se apunta que este es el que se le esta haciendo. Si falla, se sigue:
    // como mucho, un segundo envio empezaria otro, como antes.
    try {
      await escribir(EN_MARCHA, huella, { vale: codigo });
    } catch (err) {
      console.error('[regalo] No se ha podido apuntar el que esta en marcha:', err.message);
    }

    // SUS DATOS A BREVO, DESDE AQUI. Se le va a escribir un diseño con estos
    // datos, asi que en Brevo tienen que estar estos mismos y no otros: es lo
    // que hace que lo guardado y lo que se le escribe cuadren. Si vuelve a
    // corregirlos, se pasa por aqui otra vez y se actualizan.
    //
    // ANTES LO PEDIA EL NAVEGADOR justo cuando la pagina saltaba a la
    // siguiente pantalla, y si no le daba tiempo a salir, ese lead no llegaba
    // a Brevo. Aqui no hay pantalla yendose.
    //
    // SI BREVO FALLA, NO SE LE QUITA SU DISEÑO: queda escrito en los
    // registros y se sigue.
    try {
      await registrarLead({
        nombre: datos.nombre,
        email: datos.email,
        telefono: datos.telefono,
        sexo: datos.sexo,
        fecha: datos.fecha,
        hora: datos.hora,
        municipio: datos.municipio,
        provincia: datos.provincia,
        pais: datos.pais,
        edad: laEdad(datos.fecha),
      });
    } catch (err) {
      console.error('[regalo] No se ha podido registrar el lead en Brevo:', err.message);
    }

    // SU REGALO SE EMPIEZA A PREPARAR AQUI, en el servidor. Sigue por detras
    // despues de contestar, este o no la pagina abierta.
    waitUntil(prepararEnElServidor(codigo, reloj));

    return res.status(200).json({ vale: codigo });

  } catch (err) {
    console.error('[regalo] No se ha podido dar el vale:', err.message);
    return res.status(500).json({ error: 'No se ha podido empezar' });
  }
}
