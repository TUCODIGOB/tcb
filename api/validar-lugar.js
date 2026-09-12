// ══════════════════════════════════════════════════════════════
// /api/validar-lugar.js
//
// Comprueba que el lugar de nacimiento escrito en el formulario existe de
// verdad, y devuelve sus coordenadas.
//
// ANTES ESTO LO HACIA EL NAVEGADOR DEL CLIENTE. De ese punto salen la hora
// real y el Ascendente, y si el mapa le contesta mal a su movil -red mala,
// un bloqueador puesto, el mapa cortandole a el- se queda sin poder pagar
// sin que aqui se entere nadie.
//
// ES EL MISMO CODIGO, LINEA POR LINEA, que el que estaba en la pagina. No se
// ha cambiado ni una comparacion ni un nombre de campo: cualquier cambio aqui
// cambia que lugares se dan por buenos.
//
// AQUI NO HAY COMPRA QUE MIRAR: esto pasa antes de pagar, asi que no lleva la
// cerradura del P1. Lo unico que hace es preguntarle al mapa por un pueblo.
// ══════════════════════════════════════════════════════════════

// ── Comparar lo escrito con lo que devuelve el mapa ──────────────────
// El buscador de OpenStreetMap "adivina": si el municipio o la provincia
// están mal escritos devuelve igualmente el sitio que más se le parece.
// Antes eso se daba por bueno, el cliente pagaba y el informe se calculaba
// sobre las coordenadas de otro lugar. Aquí comprobamos, con manga ancha,
// que lo devuelto sea de verdad lo que el cliente escribió.

// Palabras que no distinguen un lugar de otro: quitándolas, "Barcelona"
// coincide con "Provincia de Barcelona" y "La Coruña" con "A Coruña".
const RELLENO_LUGAR = /\b(provincia|departamento|estado|comunidad|comunitat|autonoma|autonomo|region|regiao|municipio|municipality|canton|prefectura|condado|county|area|metropolitana|de|del|la|el|los|las|do|da|dos|das)\b/g;

// Nombres con dos formas igual de válidas (lengua propia / castellano, o
// abreviaturas de uso corriente). Sin esto rechazaríamos a un cliente que
// escribe su provincia bien, pero en la otra lengua.
const ALIAS_LUGAR = {
  'lleida': 'lerida', 'girona': 'gerona', 'ourense': 'orense',
  'araba': 'alava', 'gipuzkoa': 'guipuzcoa', 'bizkaia': 'vizcaya',
  'nafarroa': 'navarra', 'alacant': 'alicante', 'castello': 'castellon',
  'illes balears': 'islas baleares', 'eivissa': 'ibiza',
  'donostia': 'san sebastian', 'a coruna': 'coruna',
  'cdmx': 'ciudad mexico', 'distrito federal': 'ciudad mexico',
  'caba': 'buenos aires', 'eeuu': 'estados unidos', 'usa': 'estados unidos',
  'estados unidos america': 'estados unidos', 'uk': 'reino unido',
  'holanda': 'paises bajos',
};

function normalizarLugar(texto) {
  return (texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // fuera tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')                      // fuera puntuación
    .trim();
}

function canonizarLugar(texto) {
  let t = normalizarLugar(texto).replace(RELLENO_LUGAR, ' ').replace(/\s+/g, ' ').trim();
  for (const alias in ALIAS_LUGAR) {
    t = t.replace(new RegExp('(^| )' + alias + '( |$)', 'g'), '$1' + ALIAS_LUGAR[alias] + '$2');
  }
  return t.replace(/\s+/g, ' ').trim();
}

// Todas las palabras de `buscado`, seguidas y en orden, dentro de `texto`.
// Comparamos palabras enteras y no trozos sueltos: si no, una provincia
// inventada como "Val" colaría dentro de "Valencia".
function contienePalabras(texto, buscado) {
  const t = texto.split(' '), q = buscado.split(' ');
  if (!q[0] || q.length > t.length) return false;
  for (let i = 0; i + q.length <= t.length; i++) {
    let igual = true;
    for (let j = 0; j < q.length; j++) {
      if (t[i + j] !== q[j]) { igual = false; break; }
    }
    if (igual) return true;
  }
  return false;
}

function coincideLugar(escrito, devuelto) {
  const a = canonizarLugar(escrito), b = canonizarLugar(devuelto);
  if (!a || !b) return false;
  return a === b || contienePalabras(b, a) || contienePalabras(a, b);
}

// Campos de la respuesta donde puede venir el nombre del municipio...
const CAMPOS_MUNICIPIO = ['city', 'town', 'village', 'hamlet', 'municipality', 'city_district', 'suburb', 'neighbourhood', 'locality'];
// ...y dónde puede venir la provincia, el estado o la región.
const CAMPOS_PROVINCIA = ['province', 'state', 'county', 'state_district', 'region', 'city', 'town', 'municipality'];
// Un resultado de este tamaño no es un municipio: quiere decir que el mapa
// no ha encontrado lo que el cliente escribió y ha devuelto la zona entera.
const RESULTADOS_DEMASIADO_GRANDES = ['country', 'continent', 'state', 'region'];

// Devuelve qué campos no cuadran con este resultado del mapa (lista vacía
// si el resultado es de verdad el lugar escrito). Se comprueban los tres
// siempre, sin parar en el primero que falle: así, si el municipio y la
// provincia están mal pero el país bien, se puede marcar solo lo que falla.
function camposQueFallan(res, municipio, provincia, pais) {
  const dir = res.address || {};
  const falla = [];

  // 1) El país devuelto tiene que ser el escrito. Pedimos los nombres en
  //    castellano (accept-language), así "Francia" no choca con "France".
  if (dir.country && !coincideLugar(pais, dir.country)) falla.push('pais');

  // 2) El municipio devuelto tiene que ser el escrito. Miramos todos sus
  //    nombres: el oficial, los alternativos y los de otras lenguas. Si el
  //    mapa ha devuelto una región entera en vez de un municipio, es el
  //    municipio escrito lo que no ha sabido encontrar.
  const nombres = [];
  if (res.name) nombres.push(res.name);
  if (res.namedetails) {
    for (const clave in res.namedetails) {
      if (/^(name|official_name|alt_name|short_name)(:|$)/.test(clave)) nombres.push(res.namedetails[clave]);
    }
  }
  CAMPOS_MUNICIPIO.forEach(campo => { if (dir[campo]) nombres.push(dir[campo]); });
  if (res.display_name) nombres.push(res.display_name.split(',')[0]);
  const demasiadoGrande = RESULTADOS_DEMASIADO_GRANDES.includes(res.addresstype);
  if (demasiadoGrande || !nombres.some(nombre => coincideLugar(municipio, nombre))) falla.push('municipio');

  // 3) La provincia escrita tiene que aparecer en la dirección devuelta.
  //    Es lo que distingue dos municipios con el mismo nombre. Si el
  //    resultado no trae ninguna división de ese nivel (países pequeños
  //    que no las tienen), no hay nada que contradecir y pasa.
  const provinciasDevueltas = CAMPOS_PROVINCIA.map(c => dir[c]).filter(Boolean);
  if (provinciasDevueltas.length && !provinciasDevueltas.some(p => coincideLugar(provincia, p))) falla.push('provincia');

  return falla;
}

// El mapa devuelve varios resultados. Un campo solo se puede dar por malo
// si no cuadra en NINGUNO de ellos: si alguno lo da por bueno, el problema
// esta en otro sitio y marcarlo confundiria al cliente.
function camposCulpables(fallosPorResultado) {
  return ['municipio', 'provincia', 'pais']
    .filter(campo => fallosPorResultado.every(falla => falla.includes(campo)));
}

// Una consulta al mapa. Devuelve la lista de resultados (vacía si no
// existe lo preguntado) o null si el servicio no ha respondido, que no es
// lo mismo: lo primero es culpa de lo escrito, lo segundo no.
// limit=5: el primer resultado no siempre es el municipio (puede ser un
// barrio o una calle con ese nombre), así que revisamos los cinco.
async function consultarMapa(consulta) {
  const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(consulta) +
    '&format=json&limit=5&addressdetails=1&namedetails=1&accept-language=es';

  const INTENTOS = 3; // 1 intento inicial + 2 reintentos
  for (let intento = 1; intento <= INTENTOS; intento++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'TuDisenoDeOrigen/1.0' } });
      if (!r.ok) throw new Error('Nominatim respondió ' + r.status);
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      // Antes de darlo por caído, absorbemos fallos pasajeros con 2 reintentos.
      if (intento === INTENTOS) return null;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Cuando la consulta con los tres campos no encuentra nada, no hay ningún
// resultado con el que comparar y no se puede saber qué campo está mal:
// por eso antes se marcaban los tres, incluido el país estando bien.
// Aquí se le pregunta al mapa por partes, que es la única forma de saberlo:
// lo que no encuentra ni él solo, es lo que está mal escrito.
async function camposQueNoExisten(municipio, provincia, pais) {
  const resultadoPais = await consultarMapa(pais);
  if (resultadoPais === null) return [];           // no se ha podido comprobar
  if (resultadoPais.length === 0) return ['pais']; // el país no existe

  // El país existe: a partir de aquí nunca se marca.
  const resultadoMunicipio = await consultarMapa(municipio + ', ' + pais);
  const resultadoProvincia = await consultarMapa(provincia + ', ' + pais);
  if (resultadoMunicipio === null || resultadoProvincia === null) return [];

  const malos = [];
  if (resultadoMunicipio.length === 0) malos.push('municipio');
  if (resultadoProvincia.length === 0) malos.push('provincia');

  // Los dos existen por separado pero no juntos: el municipio no está en
  // esa provincia. No se puede saber cuál de los dos escribió mal, así que
  // se marcan los dos — pero el país no, que ya sabemos que existe.
  return malos.length ? malos : ['municipio', 'provincia'];
}

// Validar lugar con Nominatim (OpenStreetMap) — gratis
async function validarLugar(municipio, provincia, pais) {
  // Un país de 1-2 caracteres nunca es un nombre real (el país más corto
  // del mundo tiene 3+ letras) — lo rechazamos sin consultar la API.
  if (pais.trim().length < 3) return { ok: false, motivo: 'no_encontrado', campos: ['pais'] };

  const data = await consultarMapa([municipio, provincia, pais].filter(Boolean).join(', '));

  // Un lugar no verificable nunca debe dejar avanzar al pago, ni siquiera
  // si el fallo es del servicio externo. Pero aquí el cliente no ha hecho
  // nada mal, así que no se le marca ningún campo en rojo.
  if (data === null) return { ok: false, motivo: 'sin_respuesta', campos: [] };

  if (data.length) {
    const fallosPorResultado = data.map(res => camposQueFallan(res, municipio, provincia, pais));
    const bueno = fallosPorResultado.findIndex(falla => falla.length === 0);
    if (bueno !== -1) return { ok: true, lat: parseFloat(data[bueno].lat), lon: parseFloat(data[bueno].lon) };

    const campos = camposCulpables(fallosPorResultado);
    if (campos.length) return { ok: false, motivo: 'no_encontrado', campos };
  }

  // Ni un solo resultado, o resultados que no coinciden en qué falla:
  // se pregunta por partes.
  return { ok: false, motivo: 'no_encontrado', campos: await camposQueNoExisten(municipio, provincia, pais) };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { municipio, provincia, pais } = req.body || {};

  if (!municipio || !provincia || !pais) {
    return res.status(400).json({ error: 'Falta el lugar de nacimiento' });
  }

  try {
    const salida = await validarLugar(String(municipio).trim(), String(provincia).trim(), String(pais).trim());
    return res.status(200).json(salida);
  } catch (err) {
    // SI ESTO SE CAE, NO SE DEJA PASAR AL PAGO. Un lugar no comprobado nunca
    // debe llegar a cobrarse, pero el cliente no ha hecho nada mal, asi que no
    // se le marca ningún campo en rojo. Es lo mismo que hacia la pagina.
    console.error('Error comprobando el lugar:', err.message);
    return res.status(200).json({ ok: false, motivo: 'sin_respuesta', campos: [] });
  }
}
