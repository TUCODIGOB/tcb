// ═════════════════════════════════════════════════════════════════
// /api/prueba-regalo/reintentar.js
// Vuelve a intentar los regalos que no salieron, por detras.
//
// COMO FUNCIONA. Vercel llama a esta puerta cada cuarto de hora. Ella mira
// quien hay apuntado en p0/pendientes/ y coge al que le toque:
//
//   · el 1º reintento, una hora despues del fallo
//   · el 2º, a las dos horas
//   · el 3º, a las cinco horas
//
// SI SALE: se guarda, se le manda el correo con el boton para verlo y se le
// quita de la lista. SI NO SALE a los tres, se le manda el correo diciendo
// que lo estamos revisando, nos llega el aviso a la tienda, y se deja de
// intentar.
//
// UNO POR VUELTA. Escribir un regalo tarda minutos; con uno por vuelta hay de
// sobra y esta puerta nunca se queda sin tiempo a medias.
//
// CERRADA CON LLAVE. Solo entra quien traiga CRON_SECRET, que es lo que manda
// Vercel. Si no, cualquiera podria hacernos escribir regalos a mansalva.
// ═════════════════════════════════════════════════════════════════

import { leer } from './almacen.js';
import { escribirElRegalo } from './llamadas.js';
import { loQueVaAlModelo, guardarLoEscrito } from './escribir.js';
import { losPendientes, guardarPendiente, quitarPendiente, marcarEnBrevo } from './pendientes.js';
import { leerVeces, sonLosMismos } from './vale.js';
import { crearEnlace } from './mio.js';
import { correoListo, correoRevisando, correoALaTienda } from './avisos.js';

// Cuanto hay que esperar desde el fallo para cada reintento.
const UNA_HORA = 60 * 60 * 1000;
const CUANDO = [1 * UNA_HORA, 2 * UNA_HORA, 5 * UNA_HORA];

// Veces que se vuelve a intentar SOLO LA ENTREGA, cuando el diseño ya esta
// escrito y lo unico que ha fallado es guardar su enlace y mandarle el correo.
// Eso no cuesta dinero y sale a la primera casi siempre.
const MAX_ENTREGAS = 2;

const LA_WEB = 'https://origennatal.com';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function fechaBonita(iso) {
  const [anio, mes, dia] = String(iso || '').split('-').map(Number);
  if (!anio || !mes || !dia) return String(iso || '');
  return dia + ' de ' + MESES[mes - 1] + ' de ' + anio;
}

// ── YA LO TIENE: AVISARLE ──────────────────────────────────────
//
// Se le hace un enlace propio y se le manda. El enlace es lo unico que abre
// su regalo, asi que se crea antes de mandar el correo: si eso fallara, no
// se manda un correo con un boton que no lleva a ningun sitio.
async function entregarlo(ficha) {
  const cuenta = await leerVeces(ficha.huella);
  const codigo = await crearEnlace({ huella: ficha.huella, datos: ficha.datos });
  await correoListo({
    email: ficha.datos.email,
    nombre: ficha.datos.nombre,
    enlace: `${LA_WEB}/tu-diseno-de-origen/tu-diseno?d=${encodeURIComponent(codigo)}`,
  });
  await marcarEnBrevo({ email: ficha.datos.email, estado: 'entregado',
                        intentos: Number(ficha.intentos || 0), veces: cuenta.veces });
  await quitarPendiente(ficha.huella);
  console.log(`[regalo] Entregado por detras: ${ficha.huella}`);
}

// ── NO HA SALIDO ───────────────────────────────────────────────
async function noHaSalido(ficha, motivo) {
  const intentos = Number(ficha.intentos || 0) + 1;
  const seAcabo = intentos >= CUANDO.length;

  await guardarPendiente(ficha.huella, {
    ...ficha,
    intentos,
    acabado: seAcabo,
    motivo: String(motivo || '').slice(0, 300),
    ultimoEn: Date.now(),
  });
  await marcarEnBrevo({
    email: ficha.datos.email,
    estado: seAcabo ? 'fallido' : 'pendiente',
    intentos,
  });

  if (!seAcabo) {
    console.log(`[regalo] Reintento ${intentos} fallido: ${ficha.huella}`);
    return;
  }

  // Tres veces y nada. Se le dice, y nos lo decimos.
  await correoRevisando({ email: ficha.datos.email, nombre: ficha.datos.nombre });
  await correoALaTienda({
    nombre: ficha.datos.nombre,
    email: ficha.datos.email,
    telefono: ficha.datos.telefono,
    nacimiento: `${fechaBonita(ficha.datos.fecha)} · ${ficha.datos.hora} · ${[ficha.datos.municipio, ficha.datos.provincia, ficha.datos.pais].filter(Boolean).join(', ')}`,
    motivo,
    cuando: new Date().toISOString(),
  });
  console.error(`[regalo] Se acabaron los reintentos: ${ficha.huella}`);
}

export default async function handler(req, res) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    console.error('[regalo] Sin CRON_SECRET: el reintento no se ejecuta');
    return res.status(500).json({ error: 'Sin llave' });
  }
  if (req.headers.authorization !== `Bearer ${secreto}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  let fichas;
  try {
    fichas = await losPendientes();
  } catch (err) {
    console.error('[regalo] No se ha podido leer la lista de pendientes:', err.message);
    return res.status(500).json({ error: 'No se ha podido mirar' });
  }

  const ahora = Date.now();
  const leToca = fichas
    .filter(f => !f.acabado && f.datos && f.datos.email)
    .filter(f => {
      const intentos = Number(f.intentos || 0);
      return intentos < CUANDO.length && ahora - Number(f.creado || 0) >= CUANDO[intentos];
    })
    .sort((a, b) => Number(a.creado || 0) - Number(b.creado || 0));

  if (!leToca.length) {
    return res.status(200).json({ mirados: fichas.length, hecho: 0 });
  }

  const ficha = leToca[0];

  try {
    // POR SI YA LO TIENE. Puede haberlo sacado por su cuenta mientras tanto;
    // escribirle otro le daria una persona distinta de la que ya leyo.
    //
    // OJO: solo cuenta si lo guardado es DE ESTOS DATOS. Si corrigio su hora
    // y lo que hay guardado es el de antes, lo suyo esta sin escribir y hay
    // que escribirlo; mandarle el viejo seria darle lo que ya sabe que esta
    // mal.
    const guardado = await leer('', ficha.huella);
    const cuenta = await leerVeces(ficha.huella);
    if (guardado && guardado.areas && guardado.areas.length
        && sonLosMismos(cuenta.datos, ficha.datos)) {
      await entregarlo(ficha);
      return res.status(200).json({ mirados: fichas.length, hecho: 1, yaLoTenia: true });
    }

    const salida = await escribirElRegalo(loQueVaAlModelo(ficha.datos, ficha.carta));
    await guardarLoEscrito({
      datos: ficha.datos,
      carta: ficha.carta,
      texto: salida.texto,
      rasgos: salida.rasgos,
    });
    await entregarlo(ficha);
    return res.status(200).json({ mirados: fichas.length, hecho: 1 });

  } catch (err) {
    console.error('[regalo] Ha fallado el reintento:', err.message);
    try {
      // SI SU DISEÑO YA ESTA ESCRITO, lo que ha fallado no es el diseño sino
      // la entrega: guardar el codigo de su enlace y mandarle el correo. Eso
      // no gasta ninguno de los tres intentos de escribirlo, que son los que
      // cuestan dinero.
      const guardado = await leer('', ficha.huella);
      const cuenta = await leerVeces(ficha.huella);
      if (guardado && guardado.areas && guardado.areas.length
          && sonLosMismos(cuenta.datos, ficha.datos)) {
        const entregas = Number(ficha.entregas || 0) + 1;

        if (entregas <= MAX_ENTREGAS) {
          await guardarPendiente(ficha.huella, { ...ficha, entregas, ultimoEn: Date.now() });
          console.warn(`[regalo] Escrito pero sin entregar (${entregas}), se entrega en la siguiente vuelta: ${ficha.huella}`);
          return res.status(200).json({ mirados: fichas.length, hecho: 0, sinEntregar: entregas });
        }

        // Se acabaron las vueltas de la entrega. Se para y nos lo decimos:
        // su diseño esta hecho y hay que mandarselo a mano.
        await guardarPendiente(ficha.huella, { ...ficha, entregas, acabado: true, ultimoEn: Date.now() });
        await correoALaTienda({
          nombre: ficha.datos.nombre,
          email: ficha.datos.email,
          telefono: ficha.datos.telefono,
          nacimiento: `${fechaBonita(ficha.datos.fecha)} · ${ficha.datos.hora} · ${[ficha.datos.municipio, ficha.datos.provincia, ficha.datos.pais].filter(Boolean).join(', ')}`,
          motivo: 'SU DISEÑO ESTA ESCRITO Y GUARDADO, lo que no se ha podido es entregarselo: ' + err.message,
          cuando: new Date().toISOString(),
        });
        console.error(`[regalo] Escrito y sin poder entregar: ${ficha.huella}`);
        return res.status(200).json({ mirados: fichas.length, hecho: 0, sinEntregar: entregas, acabado: true });
      }

      await noHaSalido(ficha, err.message);
    } catch (e) {
      console.error('[regalo] Y tampoco se ha podido apuntar el fallo:', e.message);
    }
    return res.status(200).json({ mirados: fichas.length, hecho: 0, fallo: true });
  }
}
