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
// LO QUE SE DA POR BUENO NO HA CAMBIADO: es la misma comprobacion, con las
// mismas comparaciones, que la que estaba en la pagina. Lo unico que se ha
// rehecho es lo de despues: cuando el lugar no sale, que casillas se le
// marcan en rojo. Antes se marcaban de mas.
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

// TODOS LOS NOMBRES DE UN SITIO: el oficial, los alternativos, los de otras
// lenguas y el de la casilla que le toque en la direccion.
function nombresDelSitio(res) {
  const dir = res.address || {};
  const nombres = [];
  if (res.name) nombres.push(res.name);
  if (res.namedetails) {
    for (const clave in res.namedetails) {
      if (/^(name|official_name|alt_name|short_name)(:|$)/.test(clave)) nombres.push(res.namedetails[clave]);
    }
  }
  CAMPOS_MUNICIPIO.forEach(campo => { if (dir[campo]) nombres.push(dir[campo]); });
  if (res.display_name) nombres.push(res.display_name.split(',')[0]);
  return nombres;
}

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
  const nombres = nombresDelSitio(res);
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

  // CADA CONSULTA TIENE SU TOPE. El cliente esta esperando delante de la
  // pantalla: si el mapa tarda mas de esto, no se le deja colgado, se corta y
  // se le vuelve a preguntar. Sin tope, una sola consulta lenta se lleva ella
  // sola toda la espera.
  const TOPE = 4000;
  const INTENTOS = 2; // 1 intento inicial + 1 reintento
  for (let intento = 1; intento <= INTENTOS; intento++) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'TuDisenoDeOrigen/1.0' },
        signal: AbortSignal.timeout(TOPE),
      });
      if (!r.ok) throw new Error('Nominatim respondió ' + r.status);
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      // Antes de darlo por caído, se absorbe un fallo pasajero con un
      // reintento. La espera es corta a proposito: es tiempo que el cliente
      // pasa mirando una pantalla parada.
      if (intento === INTENTOS) return null;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}

// ¿ESO QUE HA ESCRITO ES UN PAIS DE VERDAD?
//
// No basta con que el mapa devuelva algo: escribiendo cuatro letras sueltas
// devuelve cualquier cosa que las lleve -un edificio, una empresa- y dando
// eso por pais bueno acabariamos buscando su pueblo "dentro" de esa cosa, no
// encontrandolo, y marcandole en rojo el municipio y la provincia, que ha
// escrito bien. Es un pais solo si algun resultado esta EN un pais que se
// llama como lo que ha escrito.
function hayUnPaisAsi(resultados, pais) {
  return (resultados || []).some(res => {
    // Lo normal: el resultado dice en que pais esta.
    if (coincideLugar(pais, (res.address || {}).country || '')) return true;
    // Y por si algun pais viniera sin esa casilla, vale tambien que el
    // resultado sea un pais y se llame asi.
    return res.addresstype === 'country'
      && (coincideLugar(pais, res.name || '')
          || coincideLugar(pais, String(res.display_name || '').split(',')[0]));
  });
}

// ¿CUADRA ESA CASILLA, ELLA SOLA?
//
// Se le pregunta al mapa por esa consulta y se mira si algun resultado se
// llama DE VERDAD asi. No basta con que el mapa devuelva algo: buscando "Val"
// devuelve cualquier sitio que se le parezca, y darlo por bueno es lo que
// hacia que el rojo acabara en una casilla bien escrita.
//
// Devuelve null si el mapa no ha contestado, que no es lo mismo que no
// encontrarlo: eso no es culpa de lo que ha escrito el cliente.
async function casillaCuadra(consulta, campo, municipio, provincia) {
  const data = await consultarMapa(consulta);
  if (data === null) return null;
  if (!data.length) return false;
  // La casilla que no se pregunta va vacia a proposito: aqui solo se mira la
  // que se pregunta.
  return data.some(res => !camposQueFallan(res, municipio, provincia, '').includes(campo));
}

// ¿EL MUNICIPIO Y LA PROVINCIA SON UN SITIO DE VERDAD, JUNTOS?
// Se pregunta por los dos sin pais. Si de ahi sale ese mismo sitio, los dos
// estan bien escritos y el que sobra es el pais.
async function elParCuadra(municipio, provincia) {
  const data = await consultarMapa(municipio + ', ' + provincia);
  if (data === null) return null;
  if (!data.length) return false;
  // El pais va vacio a proposito: aqui solo se miran esas dos casillas.
  return data.some(res => {
    const falla = camposQueFallan(res, municipio, provincia, '');
    return !falla.includes('municipio') && !falla.includes('provincia');
  });
}

// ¿HAY ALGO QUE SE LLAME ASI? Aqui no se le pide que sea un municipio: es
// para cuando ya no queda provincia buena donde buscarlo, y basta con que el
// nombre exista de verdad en alguna parte para NO marcarlo en rojo. Lo que no
// se sabe no se marca.
async function hayAlgoLlamadoAsi(consulta, nombre) {
  const data = await consultarMapa(consulta);
  if (data === null) return null;
  return data.some(res => nombresDelSitio(res).some(n => coincideLugar(nombre, n)));
}

// QUE CASILLAS ESTAN MAL, UNA POR UNA.
//
// Se comprueban de fuera hacia dentro -pais, provincia, municipio- y cada una
// DENTRO de lo que ya se ha dado por bueno: la provincia dentro de su pais si
// el pais esta bien, y el municipio dentro de su provincia si la provincia
// esta bien. Asi cada casilla responde por si misma y se marca en rojo solo
// la que falla, sea cual sea la combinacion.
//
// Devuelve null si el mapa no ha contestado a alguna: entonces no se marca
// nada, porque no se sabe.
async function camposMalos(municipio, provincia, pais) {
  // 1) EL PAIS. Uno de 1-2 letras no es un pais real -el mas corto del mundo
  //    tiene 3- asi que se da por malo sin gastar una consulta.
  let paisBueno = false;
  if (pais.length >= 3) {
    const data = await consultarMapa(pais);
    if (data === null) return null;
    paisBueno = hayUnPaisAsi(data, pais);
  }

  // EL PAIS NO EXISTE. Lo de dentro no se puede buscar ahi, asi que la
  // provincia se comprueba sola y el municipio dentro de esa provincia.
  if (!paisBueno) {
    const provinciaBuena = await casillaCuadra(provincia, 'provincia', '', provincia);
    if (provinciaBuena === null) return null;

    // El municipio, dentro de esa provincia si la provincia vale. Si tampoco
    // vale, se queda sin sitio donde buscarlo y solo se puede mirar si el
    // nombre existe en alguna parte.
    const municipioBueno = provinciaBuena
      ? await casillaCuadra(municipio + ', ' + provincia, 'municipio', municipio, '')
      : await hayAlgoLlamadoAsi(municipio, municipio);
    if (municipioBueno === null) return null;

    const malos = [];
    if (!municipioBueno) malos.push('municipio');
    if (!provinciaBuena) malos.push('provincia');
    malos.push('pais');
    return malos;
  }

  // 2) LA PROVINCIA, dentro de su pais.
  const provinciaEnElPais = await casillaCuadra(provincia + ', ' + pais, 'provincia', '', provincia);
  if (provinciaEnElPais === null) return null;

  // 3) EL MUNICIPIO, dentro de su provincia. Preguntar por el solo lo daria
  //    por bueno solo por parecerse a un sitio cualquiera del mundo.
  if (provinciaEnElPais) {
    const municipioBueno = await casillaCuadra(
      municipio + ', ' + provincia + ', ' + pais, 'municipio', municipio, '');
    if (municipioBueno === null) return null;
    return municipioBueno ? [] : ['municipio'];
  }

  // ESA PROVINCIA NO ESTA EN ESE PAIS. O el pais no es el suyo, o la
  // provincia esta mal escrita. Si el municipio y la provincia son un sitio
  // de verdad, los dos estan bien y el unico que sobra es el pais.
  const parBueno = await elParCuadra(municipio, provincia);
  if (parBueno === null) return null;
  if (parBueno) return ['pais'];

  // La provincia esta mal. Del municipio solo se puede saber si hay algo que
  // se llame asi en ese pais, que es lo unico que ha quedado en pie. Aqui no
  // se le pide que sea un municipio: sin su provincia, el mapa devuelve lo
  // que sea que lleve ese nombre, y con eso basta para NO marcarlo en rojo.
  const hayAlgoAsi = await hayAlgoLlamadoAsi(municipio + ', ' + pais, municipio);
  if (hayAlgoAsi === null) return null;
  return hayAlgoAsi ? ['provincia'] : ['municipio', 'provincia'];
}

// Validar lugar con Nominatim (OpenStreetMap) — gratis
async function validarLugar(municipio, provincia, pais) {
  // Lo que no cuadra en NINGUNO de los resultados de la consulta con las tres
  // casillas. Solo se usa en el ultimo caso de todos, el de aqui abajo.
  let culpables = [];

  // Con un pais de 1-2 letras esta consulta no puede salir bien: se va
  // derecho a mirar casilla por casilla.
  if (pais.length >= 3) {
    const data = await consultarMapa([municipio, provincia, pais].filter(Boolean).join(', '));

    // Un lugar no verificable nunca debe dejar avanzar al pago, ni siquiera
    // si el fallo es del servicio externo. Pero aquí el cliente no ha hecho
    // nada mal, así que no se le marca ningún campo en rojo.
    if (data === null) return { ok: false, motivo: 'sin_respuesta', campos: [] };

    if (data.length) {
      const fallosPorResultado = data.map(res => camposQueFallan(res, municipio, provincia, pais));
      const bueno = fallosPorResultado.findIndex(falla => falla.length === 0);
      if (bueno !== -1) return { ok: true, lat: parseFloat(data[bueno].lat), lon: parseFloat(data[bueno].lon) };
      culpables = camposCulpables(fallosPorResultado);
    }
  }

  // NO ES EL SITIO QUE HA ESCRITO. Cual de las tres casillas esta mal no lo
  // dice esa consulta, asi que se miran una por una: es la unica forma de
  // marcar en rojo exactamente la que falla y ninguna mas.
  const malos = await camposMalos(municipio, provincia, pais);
  if (malos === null) return { ok: false, motivo: 'sin_respuesta', campos: [] };
  if (malos.length) return { ok: false, motivo: 'no_encontrado', campos: malos };

  // Las tres existen, pero juntas no son ese sitio: el municipio no esta en
  // esa provincia. Cual de las dos escribio mal solo puede decirlo la
  // consulta con las tres; si esa tampoco devolvio nada, no hay forma de
  // saberlo y se marcan las dos. El pais no, que ya se sabe que esta bien.
  const soloDeDentro = culpables.filter(campo => campo !== 'pais');
  return {
    ok: false,
    motivo: 'no_encontrado',
    campos: soloDeDentro.length ? soloDeDentro : ['municipio', 'provincia'],
  };
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
