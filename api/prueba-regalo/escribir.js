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
// EL TIEMPO: las cuatro llamadas se dan a si mismas 4 minutos y 45 segundos,
// los mismos que el P1, y la funcion tiene 5 minutos en vercel.json.
// ═════════════════════════════════════════════════════════════════

import { montarCartaTexto, montarCasasTexto } from '../../lib/carta-texto.js';
import { escribirElRegalo } from './llamadas.js';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { nombre, sexo, fecha, hora, municipio, provincia, pais, carta } = req.body || {};

  if (!nombre || !sexo) {
    return res.status(400).json({ error: 'Faltan el nombre o el sexo' });
  }

  const [anio, mes, dia] = String(fecha || '').split('-').map(Number);
  if (!anio || !mes || !dia || mes < 1 || mes > 12 || !hora) {
    return res.status(400).json({ error: 'Falta la fecha o la hora de nacimiento' });
  }
  if (!municipio || !provincia || !pais) {
    return res.status(400).json({ error: 'Falta el lugar de nacimiento' });
  }

  // Sin carta no hay nada que leer: el modelo se inventaria la persona entera.
  if (!carta || typeof carta !== 'object' || !carta.sol || !carta.ascendente || !carta.casas) {
    return res.status(400).json({ error: 'Falta la carta natal' });
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

    return res.status(200).json({
      texto: salida.texto,
      rasgos: salida.rasgos,
      cuaderno: salida.cuaderno,
      segundos: Math.round((Date.now() - arranque) / 100) / 10,
    });

  } catch (err) {
    console.error('[prueba-regalo] No ha salido el area:', err.message);
    return res.status(500).json({ error: err.message || 'No ha salido el área' });
  }
}
