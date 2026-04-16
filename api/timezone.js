export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { lat, lon, fechaISO } = req.body;

  try {
    const url = `https://secure.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&date=${fechaISO}&username=${process.env.GEONAMES_USER}`;
    const r = await fetch(url);
    const data = await r.json();
    if (data && typeof data.rawOffset === 'number') {
      const month = parseInt(fechaISO.split('-')[1]);
      const isDST = typeof data.dstOffset === 'number' && month >= 4 && month <= 10;
      return res.status(200).json({ offset: isDST ? data.dstOffset : data.rawOffset });
    }
    return res.status(500).json({ error: 'No offset' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}