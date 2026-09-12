// ═════════════════════════════════════════════════════════════════
// /api/geocodificar.js
//
// Busca en el mapa las coordenadas del lugar de nacimiento.
//
// ANTES ESTO LO HACIA EL NAVEGADOR DEL CLIENTE, y por eso esta aqui: el
// movil de quien compra no tiene por que poder hablar con el mapa -esta en
// el metro, en la montana, con la red mala o con un bloqueador puesto- y de
// ese punto salen la hora real y el Ascendente. Lo que decide como sale la
// carta no puede depender de su cobertura.
//
// SOLO SE USA CUANDO EL PEDIDO NO TRAE COORDENADAS. El formulario ya las
// comprobo antes de pagar y las guarda; esto es el respaldo de cuando el
// enlace se abre desde otro movil o se reintenta.
//
// UNA SOLA CONSULTA AL MAPA POR PETICION. Quien llama ya reintenta por su
// cuenta, asi que repetir aqui dentro multiplicaria las consultas: el mapa
// es gratis y limita cuantas acepta.
// ═════════════════════════════════════════════════════════════════

import Stripe from 'stripe';
import { estado, compraValida, esDelProducto } from '../lib/reserva.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { session_id, municipio, provincia, pais } = req.body || {};

  if (!session_id || typeof session_id !== 'string') {
    return res.status(403).json({ error: 'Pago no verificado.' });
  }

  // LA MISMA CERRADURA QUE EL RESTO DEL P1, y en el mismo orden: pagado, del
  // P1, no generado ya y no generandose ahora. Sin esto cualquiera podria
  // usar nuestro cupo del mapa desde fuera.
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!compraValida(session) || !esDelProducto(session, 'p1')) {
      return res.status(403).json({ error: 'Pago no verificado.' });
    }
    const st = estado(session);
    if (st.completado) {
      return res.status(403).json({ error: 'Este informe ya fue generado.' });
    }
    if (st.ocupada) {
      return res.status(409).json({ error: 'Tu informe se esta generando ahora mismo.' });
    }
  } catch (err) {
    return res.status(403).json({ error: 'Pago no verificado.' });
  }

  // La misma consulta que se hacia en el navegador, con las mismas piezas y en
  // el mismo orden: municipio, provincia y pais separados por comas.
  const query = [municipio, provincia, pais].filter(Boolean).join(', ');

  if (!query) {
    return res.status(400).json({ error: 'Falta el lugar de nacimiento' });
  }

  try {
    const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(query) + '&format=json&limit=1&addressdetails=1';
    const r = await fetch(url, { headers: { 'User-Agent': 'TuDisenoDeOrigen/1.0' } });

    if (!r.ok) {
      return res.status(502).json({ error: 'El servicio de mapas no contesta' });
    }

    const data = await r.json();

    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat), lon = parseFloat(data[0].lon);
      if (isFinite(lat) && isFinite(lon)) {
        return res.status(200).json({ lat, lon, ok: true });
      }
    }

    // NI COORDENADAS INVENTADAS NI UN SITIO POR DEFECTO. Quien llama sabe que
    // sin punto no hay carta y para el informe; devolver algo aqui seria
    // calcular la carta sobre otro sitio sin que nadie se enterase.
    return res.status(404).json({ error: 'No se ha encontrado ese lugar' });

  } catch (err) {
    console.error('Error buscando el lugar en el mapa:', err.message);
    return res.status(502).json({ error: 'El servicio de mapas no contesta' });
  }
}
