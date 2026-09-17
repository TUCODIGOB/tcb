// ═════════════════════════════════════════════════════════════════
// /api/prueba-regalo/escribir.js
// El enchufe: recibe la carta y los datos, y llama a las cuatro llamadas
// que escriben el area 1 del regalo.
//
// AQUI NO SE DECIDE NADA NI SE ESCRIBE NINGUN ENCARGO. Todo eso vive en
// llamadas.js y en tono.js, que no se tocan. Esto solo monta lo que hace
// falta para llamarlas y devuelve lo que sale.
//
// QUE RECIBE: los datos del formulario y la carta que ya calculo
// /api/prueba-regalo/carta. La carta no se vuelve a calcular: seria pedirle
// otra vez el lugar al mapa y podria salir un punto distinto del que se
// entrego.
//
// QUE DEVUELVE: el area escrita y los cinco rasgos con todos sus datos. Nada
// mas: el cuaderno -que llamada ha hecho que, cuanto ha tardado y que quito
// la limpieza- se guarda pero no viaja al navegador, que no lo necesita.
//
// Y QUE GUARDA: lo mismo que ya guardaba la carta -sus datos y la carta
// entera- mas los cinco rasgos y el area escrita. El dia de mañana, cuando
// esa persona pague, el P1 tiene que poder empezar por donde lo dejo el
// regalo y decirle exactamente lo mismo, no otra cosa.
//
// EL TIEMPO: las cuatro llamadas se dan a si mismas 4 minutos y 45 segundos,
// los mismos que el P1, y la funcion tiene 5 minutos en vercel.json.
// ═════════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { waitUntil } from '@vercel/functions';
import { montarCartaTexto, montarCasasTexto } from '../../lib/carta-texto.js';
import { guardarInforme } from '../../lib/guardar-informe.js';
import { escribirElRegalo } from './llamadas.js';
import { cobrarElVale, soltarElVale, quemarElVale,
         leerVeces, apuntarUnaVez, sonLosMismos, MAX_VECES } from './vale.js';
import { leer } from './almacen.js';
import { apuntarElFallo, marcarEnBrevo, quitarPendiente } from './pendientes.js';
import { crearEnlace } from './mio.js';
import { correoListo } from './avisos.js';

// La fecha, el lugar y la edad se montan igual que en el P1 y que en
// carta.js, para que al modelo le llegue lo mismo escrito de la misma forma.
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const LA_WEB = 'https://origennatal.com';

function calcularEdad(fechaISO) {
  const nacimiento = new Date(fechaISO);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

// EL MISMO SITIO QUE YA USO LA CARTA: una huella de su email. Asi lo que se
// guarda aqui completa lo que se guardo alli en vez de quedar en otro lado.
function huellaDelEmail(email) {
  const limpio = String(email || '').trim().toLowerCase();
  if (!limpio) return '';
  return crypto.createHash('sha256').update(limpio).digest('hex').slice(0, 32);
}

// SE VUELVE A ESCRIBIR EL FICHERO ENTERO, no solo lo nuevo: sus datos y la
// carta van otra vez, montados igual que en carta.js, para que al añadir los
// rasgos y el area no se pierda lo que ya habia.
//
// SI FALLA, NO PASA NADA: el area ya esta escrita y se entrega igual.
export async function guardarLoEscrito({ datos, carta, texto, rasgos, cuaderno, avisar }) {
  const huella = huellaDelEmail(datos.email);
  if (!huella) {
    console.warn('[prueba-regalo] Sin email: no se guarda el area.');
    return;
  }
  const [anio, mes, dia] = String(datos.fecha || '').split('-').map(Number);
  try {
    const guardado = await guardarInforme({
      producto: 'p0',
      sessionId: huella,
      cliente: {
        nombre: datos.nombre || '',
        sexo: datos.sexo || '',
        email: String(datos.email || '').trim().toLowerCase(),
        fecha: dia + ' de ' + MESES[mes - 1] + ' de ' + anio,
        hora: datos.hora,
        lugar: [datos.municipio, datos.provincia, datos.pais].filter(Boolean).join(', '),
        edad: calcularEdad(datos.fecha),
      },
      carta,
      // Una sola area, pero en lista, igual que el P1 guarda las siete.
      areas: [texto],
      rasgos,
      // EL CUADERNO: que hizo cada llamada, cuanto tardo, cuanto costo y que
      // quito la limpieza. Es para mirarlo despues desde la pagina de
      // informes; no entra en lo que se le entrega ni cambia nada. Si no
      // viniera, se guarda igual sin el.
      cuaderno,
    });
    if (guardado.guardado) {
      console.log(`[prueba-regalo] Guardada el area: ${guardado.ruta} (${guardado.bytes} bytes)`);
      // SE APUNTA LA VEZ, y con que datos. Es lo que impide que un mismo
      // email saque diseños sin parar, y lo que permite saber si vuelve con
      // los mismos datos o con otros.
      await apuntarUnaVez(huella, datos);
      // Y SE BORRA LO QUE HUBIERA PENDIENTE SUYO: ya tiene su diseño, asi que
      // no hay nada que reintentar. Si mañana corrige sus datos y aquello
      // falla, se apunta de cero y le vuelve a llegar todo como la primera
      // vez; con el apunte viejo ahi, no le llegaria nada.
      await quitarPendiente(huella);

      // SU CORREO CON SU ENLACE, siempre que se le escribe un diseño. Lo haya
      // visto en pantalla o no: si cerro la pestaña, si refresco, o si se
      // quedo sin cobertura, lo tiene en su correo.
      //
      // Va aqui y no antes a proposito: el enlace no puede salir hasta que lo
      // guardado este de verdad guardado.
      if (avisar) await mandarleSuEnlace(huella, datos);
    } else {
      console.warn(`[prueba-regalo] El area no se ha guardado: ${guardado.motivo}`);
    }
  } catch (err) {
    console.error('[prueba-regalo] No se ha podido guardar el area:', err.message);
  }
}

// SU ENLACE Y SU CORREO. Envuelto: el diseño ya esta escrito y guardado, asi
// que un fallo aqui no le quita nada. La carta no viaja al enlace, que ahi
// solo hacen falta sus datos.
async function mandarleSuEnlace(huella, datos) {
  try {
    const { carta: laCarta, ...susDatos } = datos;
    const codigo = await crearEnlace({ huella, datos: susDatos });
    await correoListo({
      email: susDatos.email,
      nombre: susDatos.nombre,
      enlace: `${LA_WEB}/tu-diseno-de-origen/tu-diseno?d=${encodeURIComponent(codigo)}`,
    });
  } catch (err) {
    console.error('[prueba-regalo] No se ha podido mandarle su enlace:', err.message);
  }
}

// LO QUE SE LE DA AL MODELO. Esta aqui suelto porque lo usan dos sitios: esta
// puerta y el reintento de por detras. Los dos tienen que mandarle lo mismo.
export function loQueVaAlModelo(datos, carta) {
  const [anio, mes, dia] = String(datos.fecha || '').split('-').map(Number);
  return {
    nombre: datos.nombre,
    sexo: datos.sexo,
    fechaNice: dia + ' de ' + MESES[mes - 1] + ' de ' + anio,
    hora: datos.hora,
    lugar: [datos.municipio, datos.provincia, datos.pais].filter(Boolean).join(', '),
    edad: calcularEdad(datos.fecha),
    cartaTexto: montarCartaTexto(carta),
    casasTexto: montarCasasTexto(carta),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // ── EL VALE ────────────────────────────────────────────────
  //
  // Escribir un regalo cuesta dinero, asi que no se escribe ninguno sin un
  // vale que hayamos dado nosotros y que no este gastado. SUS DATOS SALEN DEL
  // VALE, no de lo que llegue en la peticion: asi nadie puede pedir un regalo
  // de una persona que se invente.
  const codigo = String((req.body || {}).vale || '').trim();
  if (!codigo) {
    return res.status(400).json({ error: 'Falta el permiso' });
  }

  let cobrado;
  try {
    cobrado = await cobrarElVale(codigo);
  } catch (err) {
    console.error('[prueba-regalo] No se ha podido leer el vale:', err.message);
    return res.status(500).json({ error: 'No se ha podido comprobar el permiso' });
  }
  if (!cobrado) {
    return res.status(403).json({ error: 'Este permiso no vale' });
  }
  const delVale = cobrado.datos;

  // ── LO QUE SE LE ESCRIBE A UN MISMO EMAIL ──────────────────
  //
  // El suyo, y una correccion si se equivoco al escribir sus datos. Si vuelve
  // con los mismos datos, o si ya gasto su correccion, no se escribe nada
  // nuevo: se le devuelve el que ya tenia. El modelo no elige los mismos
  // rasgos dos veces, asi que escribir otro le daria una persona distinta de
  // la que ya leyo.
  //
  // La misma cuenta que lleva la puerta del vale, comprobada otra vez aqui:
  // esta es la que cuesta dinero.
  let vecesAntes = 0;
  try {
    const huella = huellaDelEmail(delVale.email);
    const cuenta = await leerVeces(huella);
    vecesAntes = cuenta.veces;
    const yaLoTiene = await leer('', huella);

    if (yaLoTiene && yaLoTiene.areas && yaLoTiene.areas.length) {
      // Sin la cuenta no se sabe con que datos se le escribio: no se le
      // escribe otro, se le devuelve el suyo.
      const losMismos = !cuenta.datos || sonLosMismos(cuenta.datos, delVale);
      if (losMismos || cuenta.veces >= MAX_VECES) {
        await quemarElVale(codigo);
        return res.status(200).json({
          yaLoTenia: true,
          texto: yaLoTiene.areas[0],
          rasgos: yaLoTiene.rasgos || {},
          puedeCorregir: Boolean(cuenta.datos) && losMismos && cuenta.veces < MAX_VECES,
        });
      }
    }
  } catch (err) {
    // Si el almacen no contesta no se le deja sin regalo: se sigue y, como
    // mucho, se le escribe otra vez.
    console.error('[prueba-regalo] No se ha podido mirar si ya lo tenia:', err.message);
  }

  const datos = { ...delVale, carta: (req.body || {}).carta };
  const { nombre, sexo, fecha, hora, municipio, provincia, pais, carta } = datos;

  // SI ALGO NO CUADRA, EL VALE SE SUELTA: no se ha escrito nada, asi que no
  // tiene por que perder el intento por un fallo que no es suyo.
  const noVale = async (mensaje) => {
    await soltarElVale(codigo, cobrado.marca);
    return res.status(400).json({ error: mensaje });
  };

  if (!nombre || !sexo) return noVale('Faltan el nombre o el sexo');

  const [anio, mes, dia] = String(fecha || '').split('-').map(Number);
  if (!anio || !mes || !dia || mes < 1 || mes > 12 || !hora) {
    return noVale('Falta la fecha o la hora de nacimiento');
  }
  if (!municipio || !provincia || !pais) return noVale('Falta el lugar de nacimiento');

  // Sin carta no hay nada que leer: el modelo se inventaria la persona entera.
  if (!carta || typeof carta !== 'object' || !carta.sol || !carta.ascendente || !carta.casas) {
    return noVale('Falta la carta natal');
  }

  try {
    const salida = await escribirElRegalo(loQueVaAlModelo(datos, carta));

    // Se guarda por detras, sin hacer esperar a nadie, y envuelto: el area ya
    // esta escrita y se entrega pase lo que pase con el guardado.
    try {
      waitUntil(guardarLoEscrito({ datos, carta, texto: salida.texto, rasgos: salida.rasgos, cuaderno: salida.cuaderno, avisar: true }));
    } catch (err) {
      console.error('[prueba-regalo] No se ha podido lanzar el guardado del area:', err.message);
    }

    // YA ESTA ESCRITO: el vale se quema y no sirve nunca mas.
    await quemarElVale(codigo);

    // Y SE MARCA EN BREVO COMO ENTREGADO. Es lo que distingue a quien tiene
    // su diseño de quien se quedo por el camino. Va por detras y envuelto:
    // el diseño ya esta escrito y se entrega pase lo que pase con la marca.
    try {
      waitUntil(marcarEnBrevo({ email: delVale.email, estado: 'entregado', intentos: 0,
                                veces: vecesAntes + 1 }));
    } catch (e) {
      console.error('[prueba-regalo] No se ha podido marcar el entregado:', e.message);
    }

    return res.status(200).json({
      texto: salida.texto,
      rasgos: salida.rasgos,
      // Con este ya van vecesAntes + 1. Si aun no ha llegado al tope, le
      // queda la correccion y su pagina se lo puede ofrecer.
      puedeCorregir: (vecesAntes + 1) < MAX_VECES,
    });

  } catch (err) {
    console.error('[prueba-regalo] No ha salido el area:', err.message);
    // NO HA SALIDO: se suelta el vale para que el boton de volver a
    // intentarlo pueda usarlo en el acto. El intento ya esta contado.
    await soltarElVale(codigo, cobrado.marca);

    // Y SI ERA EL ULTIMO INTENTO, esa persona se queda sin nada delante. Se
    // apunta para seguir intentandolo por detras y se le avisa por correo.
    // Va por detras y envuelto: la respuesta no espera por esto ni se rompe.
    if (cobrado.ultimo) {
      try {
        waitUntil(apuntarElFallo({ datos: delVale, carta, motivo: err.message }));
      } catch (e) {
        console.error('[prueba-regalo] No se ha podido apuntar el fallo:', e.message);
      }
    }
    return res.status(500).json({ error: err.message || 'No ha salido el área' });
  }
}
