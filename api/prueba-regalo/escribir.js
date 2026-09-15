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
// QUE DEVUELVE: el area escrita, los cinco rasgos con todos sus datos, y el
// cuaderno -que llamada ha hecho que, cuanto ha tardado y que quito la
// limpieza-. El cuaderno es para mirar, no decide nada.
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
import { cobrarElVale, soltarElVale, quemarElVale } from './vale.js';
import { leer } from './almacen.js';

// La fecha, el lugar y la edad se montan igual que en el P1 y que en
// carta.js, para que al modelo le llegue lo mismo escrito de la misma forma.
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

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
async function guardarLoEscrito({ datos, carta, texto, rasgos }) {
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
    });
    if (guardado.guardado) console.log(`[prueba-regalo] Guardada el area: ${guardado.ruta} (${guardado.bytes} bytes)`);
    else console.warn(`[prueba-regalo] El area no se ha guardado: ${guardado.motivo}`);
  } catch (err) {
    console.error('[prueba-regalo] No se ha podido guardar el area:', err.message);
  }
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

  // ── UN REGALO POR EMAIL ────────────────────────────────────
  //
  // Si ese email ya tiene el suyo, no se escribe otro: se devuelve el que ya
  // habia. El modelo no elige los mismos rasgos dos veces, asi que escribir
  // otro le daria una persona distinta de la que ya leyo.
  try {
    const yaLoTiene = await leer('', huellaDelEmail(delVale.email));
    if (yaLoTiene && yaLoTiene.areas && yaLoTiene.areas.length) {
      await quemarElVale(codigo);
      return res.status(200).json({
        yaLoTenia: true,
        texto: yaLoTiene.areas[0],
        rasgos: yaLoTiene.rasgos || {},
        cuaderno: {},
        segundos: 0,
      });
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

  const arranque = Date.now();

  try {
    const salida = await escribirElRegalo({
      nombre,
      sexo,
      fechaNice: dia + ' de ' + MESES[mes - 1] + ' de ' + anio,
      hora,
      lugar: [municipio, provincia, pais].filter(Boolean).join(', '),
      edad: calcularEdad(fecha),
      cartaTexto: montarCartaTexto(carta),
      casasTexto: montarCasasTexto(carta),
    });

    // Se guarda por detras, sin hacer esperar a nadie, y envuelto: el area ya
    // esta escrita y se entrega pase lo que pase con el guardado.
    try {
      waitUntil(guardarLoEscrito({ datos, carta, texto: salida.texto, rasgos: salida.rasgos }));
    } catch (err) {
      console.error('[prueba-regalo] No se ha podido lanzar el guardado del area:', err.message);
    }

    // YA ESTA ESCRITO: el vale se quema y no sirve nunca mas.
    await quemarElVale(codigo);

    return res.status(200).json({
      texto: salida.texto,
      rasgos: salida.rasgos,
      cuaderno: salida.cuaderno,
      segundos: Math.round((Date.now() - arranque) / 100) / 10,
    });

  } catch (err) {
    console.error('[prueba-regalo] No ha salido el area:', err.message);
    // NO HA SALIDO: se suelta el vale para que el boton de volver a
    // intentarlo pueda usarlo en el acto. El intento ya esta contado.
    await soltarElVale(codigo, cobrado.marca);
    return res.status(500).json({ error: err.message || 'No ha salido el área' });
  }
}
