// ═════════════════════════════════════════════════════════════════
// /api/timezone.js
// Devuelve el desfase horario REAL que regia en el lugar y la fecha
// de nacimiento, usando la base de datos oficial de zonas horarias
// (IANA / tz database), que recoge todos los cambios historicos de
// cada pais: cuando empezaba y acababa el horario de verano cada ano,
// los anos en que un pais no lo tuvo, y los cambios de huso.
//
// Dos piezas, ninguna necesita internet:
//   - tz-lookup  : coordenadas -> nombre de zona (p.ej. "Europe/Madrid")
//   - Intl       : zona + fecha -> desfase real de esa fecha (datos IANA
//                  incluidos en Node, sin dependencias)
// ═════════════════════════════════════════════════════════════════

import tzlookup from 'tz-lookup';

// Desfase en minutos de una zona en un instante concreto (marca de tiempo UTC).
function offsetEnInstante(zona, ts) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = {};
  for (const parte of dtf.formatToParts(new Date(ts))) p[parte.type] = parte.value;
  const comoUTC = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
  return (comoUTC - ts) / 60000;
}

// Desfase en horas que regia a una hora LOCAL concreta. Se itera porque para
// saber el desfase hace falta el instante, y para el instante hace falta el
// desfase; en tres pasadas converge, tambien en los dias de cambio de hora.
function offsetHistorico(zona, y, m, d, h, mi) {
  const local = Date.UTC(y, m - 1, d, h, mi);
  let ts = local;
  for (let i = 0; i < 3; i++) ts = local - offsetEnInstante(zona, ts) * 60000;
  return offsetEnInstante(zona, ts) / 60;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { lat, lon, fechaISO, hora } = req.body || {};

  try {
    const la = Number(lat), lo = Number(lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) {
      return res.status(400).json({ error: 'Coordenadas no validas' });
    }

    const [y, m, d] = String(fechaISO || '').split('-').map(Number);
    if (!y || !m || !d) {
      return res.status(400).json({ error: 'Fecha no valida' });
    }

    // La hora solo cambia el resultado si el nacimiento cae justo en el dia
    // del cambio de hora; si no llega, se usa el mediodia.
    const [hRaw, miRaw] = String(hora || '').split(':').map(Number);
    const h = Number.isFinite(hRaw) ? hRaw : 12;
    const mi = Number.isFinite(miRaw) ? miRaw : 0;

    const zona = tzlookup(la, lo);
    const offset = offsetHistorico(zona, y, m, d, h, mi);

    if (!Number.isFinite(offset)) {
      return res.status(500).json({ error: 'No se pudo calcular el desfase horario' });
    }

    return res.status(200).json({ offset, zona });
  } catch (e) {
    console.error('Error calculando zona horaria:', e.message);
    return res.status(500).json({ error: 'No se pudo calcular el desfase horario' });
  }
}
