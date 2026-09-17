// ═════════════════════════════════════════════════════════════════
// /api/prueba-regalo/mio.js
// Entrega un regalo ya escrito a cambio del codigo de su enlace.
//
// PARA QUE. Cuando el regalo no sale a la primera y se escribe por detras
// horas despues, se le manda por correo. Al pulsar el boton de ese correo,
// la pagina del resultado tiene que poder pedirle a alguien lo suyo: ese
// alguien es esto.
//
// EL CODIGO NO ES SU EMAIL NI NADA QUE SE PUEDA ADIVINAR: son 24 bytes al
// azar que solo viajan dentro de su correo. Sin el codigo exacto, aqui no se
// entrega nada. Y con el solo se entrega ese regalo, no el de nadie mas.
//
// AQUI NO SE ESCRIBE NINGUN REGALO NI SE LLAMA A NINGUN MODELO: solo se lee
// lo que ya estaba guardado, asi que abrir el enlace no cuesta dinero.
// ═════════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { leer, escribir } from './almacen.js';
import { leerVeces, MAX_VECES } from './vale.js';

// La edad, contada aqui mismo. Es la misma cuenta de siempre, pero escrita
// aparte a proposito: quien escribe el diseño llama a esta puerta, y si cada
// uno dependiera del otro se quedarian enganchados al arrancar.
function calcularEdad(fechaISO) {
  const nacimiento = new Date(fechaISO);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

// Los enlaces viven aparte de los vales y de los regalos.
const ENLACES = 'enlaces';

// ── HACER UN ENLACE ────────────────────────────────────────────
//
// Devuelve el codigo. Lo guarda apuntando a la huella del email, que es
// donde esta el regalo, y con sus datos tal y como los escribio en el
// formulario: la pagina del resultado los necesita para la portada y para el
// boton de comprar.
export async function crearEnlace({ huella, datos }) {
  const codigo = crypto.randomBytes(24).toString('base64url');
  await escribir(ENLACES, codigo, { creado: Date.now(), huella, datos });
  return codigo;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const codigo = String((req.query && req.query.d) || '').trim();
  // Un codigo nuestro solo lleva estas letras. Cualquier otra cosa se para
  // aqui, sin llegar a pedirle nada al almacen.
  if (!codigo || !/^[A-Za-z0-9_-]{16,64}$/.test(codigo)) {
    return res.status(400).json({ error: 'Enlace no válido' });
  }

  try {
    const enlace = await leer(ENLACES, codigo);
    if (!enlace || !enlace.huella) {
      return res.status(404).json({ error: 'Enlace no válido' });
    }

    const guardado = await leer('', enlace.huella);
    if (!guardado || !guardado.areas || !guardado.areas.length) {
      return res.status(404).json({ error: 'Todavía no está listo' });
    }

    // Si todavia le queda su correccion, su pagina se la puede ofrecer.
    const cuenta = await leerVeces(enlace.huella);

    // LOS DATOS SON LOS DEL ULTIMO DISEÑO QUE SE LE ESCRIBIO, no los que
    // llevaba este enlace. Si corrigio sus datos, el correo viejo sigue
    // valiendo y le lleva a lo ultimo suyo, con los datos que cuadran con lo
    // que va a leer. Los del enlace quedan de respaldo por si no hubiera
    // cuenta guardada.
    const datos = cuenta.datos || enlace.datos || {};
    return res.status(200).json({
      datos: {
        nombre: datos.nombre || '',
        sexo: datos.sexo || '',
        email: datos.email || '',
        telefonoCompleto: datos.telefono || '',
        fecha: datos.fecha || '',
        hora: datos.hora || '',
        municipio: datos.municipio || '',
        provincia: datos.provincia || '',
        pais: datos.pais || '',
        edadCalculada: datos.fecha ? calcularEdad(datos.fecha) : '',
      },
      salida: {
        texto: guardado.areas[0],
        rasgos: guardado.rasgos || {},
        puedeCorregir: cuenta.veces < MAX_VECES,
      },
    });

  } catch (err) {
    console.error('[regalo] No se ha podido entregar el enlace:', err.message);
    return res.status(500).json({ error: 'No se ha podido abrir' });
  }
}
