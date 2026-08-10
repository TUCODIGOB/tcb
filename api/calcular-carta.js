import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { session_id } = req.body;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session || session.payment_status !== 'paid') {
      return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
    }
    if (session.metadata?.informe_completado === 'si') {
      return res.status(403).json({ error: 'Este informe ya fue generado.' });
    }
  } catch (err) {
    return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
  }

  const CAMPOS_REQUERIDOS = ['year', 'month', 'day', 'localHour', 'localMin', 'latDeg', 'lonDeg', 'tzOffset'];
  const campoFaltante = CAMPOS_REQUERIDOS.find(campo => req.body[campo] === undefined || req.body[campo] === null);

  if (campoFaltante) {
    return res.status(400).json({ error: 'Faltan datos para calcular la carta natal' });
  }

  try {
    const { year, month, day, localHour, localMin, latDeg, lonDeg, tzOffset } = req.body;

// ─── CÁLCULO ASTRONÓMICO PRECISO (Jean Meeus + VSOP87 truncado) ───────────────

const _R = x => x * Math.PI / 180;
const _D = x => x * 180 / Math.PI;
const _mod = (x, n) => ((x % n) + n) % n;

// Julian Day Number desde fecha gregoriana + hora UT (decimal)
function julianDay(y, m, d, utH) {
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + utH / 24;
}

// Oblicuidad real de la eclíptica (IAU 1980)
function obliquity(T) {
  return 23.439291111 - 0.013004167*T - 0.0000001639*T*T + 0.0000005036*T*T*T;
}

// GMST en grados (IAU 1982)
function gmst(JD, T) {
  return _mod(280.46061837 + 360.98564736629*(JD - 2451545.0) + 0.000387933*T*T - T*T*T/38710000.0, 360);
}

// Nutación en longitud y oblicuidad (IAU 1980, términos principales)
function nutation(T) {
  const O  = _R(_mod(125.04452  - 1934.136261*T + 0.0020708*T*T, 360));
  const L  = _R(_mod(280.4665   + 36000.7698*T, 360));
  const Lp = _R(_mod(218.3165   + 481267.8813*T, 360));
  const dpsi = (-17.20*Math.sin(O) - 1.319*Math.sin(2*L) - 0.227*Math.sin(2*Lp) + 0.206*Math.sin(2*O)) / 3600;
  const deps = (  9.20*Math.cos(O) + 0.574*Math.cos(2*L) + 0.098*Math.cos(2*Lp) - 0.090*Math.cos(2*O)) / 3600;
  return { dpsi, deps };
}

// Sol geocéntrico en eclíptica (Meeus cap.25, precisión ~0.01°)
function sunLongitude(T) {
  const L0 = _mod(280.46646  + 36000.76983*T + 0.0003032*T*T, 360);
  const M  = _R(_mod(357.52911 + 35999.05029*T - 0.0001537*T*T, 360));
  const C  = (1.914602 - 0.004817*T - 0.000014*T*T)*Math.sin(M)
           + (0.019993 - 0.000101*T)*Math.sin(2*M)
           + 0.000289*Math.sin(3*M);
  const Theta = L0 + C;
  // Aberración anual
  const aberr = -0.00569 - 0.00478*Math.sin(_R(_mod(125.04 - 1934.136*T, 360)));
  return _mod(Theta + aberr, 360);
}

// Luna geocéntrica en eclíptica (ELP2000/82, 30+ términos, precisión ~0.3°)
function moonLongitude(T) {
  const Lp = _mod(218.3165 + 481267.8813*T - 0.001133*T*T, 360);
  const D  = _R(_mod(297.8502 + 445267.1115*T - 0.00163*T*T + T*T*T/538841, 360));
  const M  = _R(_mod(357.5291 + 35999.0503*T - 0.0001559*T*T, 360));
  const Mp = _R(_mod(134.9634 + 477198.8676*T + 0.008997*T*T + T*T*T/69699, 360));
  const F  = _R(_mod( 93.2721 + 483202.0175*T - 0.003403*T*T - T*T*T/3526000, 360));
  const E  = 1 - 0.002516*T - 0.0000074*T*T;

  const lon = Lp
    + 6.2888*Math.sin(Mp)
    + 1.2740*Math.sin(2*D - Mp)
    + 0.6583*Math.sin(2*D)
    + 0.2136*Math.sin(2*Mp)
    - 0.1851*E*Math.sin(M)
    - 0.1143*Math.sin(2*F)
    + 0.0588*Math.sin(2*D - 2*Mp)
    + 0.0572*E*Math.sin(2*D - M - Mp)
    + 0.0533*Math.sin(2*D + Mp)
    + 0.0458*Math.sin(2*D - M)
    - 0.0409*E*Math.sin(M - Mp)
    - 0.0347*Math.sin(D)
    - 0.0304*E*Math.sin(M + Mp)
    + 0.0153*Math.sin(2*D - 2*F)
    - 0.0125*Math.sin(Mp + 2*F)
    + 0.0110*Math.sin(Mp - 2*F)
    + 0.0107*Math.sin(4*D - Mp)
    + 0.0100*Math.sin(3*Mp)
    + 0.0085*Math.sin(4*D - 2*Mp)
    - 0.0079*E*Math.sin(2*D + M - Mp)
    - 0.0068*E*Math.sin(2*D + M)
    - 0.0052*Math.sin(D - Mp)
    + 0.0050*E*Math.sin(D + M)
    + 0.0040*E*Math.sin(2*D - M + Mp)
    + 0.0040*Math.sin(2*D + 2*Mp)
    + 0.0039*Math.sin(4*D)
    + 0.0037*Math.sin(2*D - 3*Mp)
    - 0.0027*E*Math.sin(M - 2*Mp)
    - 0.0026*Math.sin(2*D - Mp + 2*F);
  return _mod(lon, 360);
}

// Latitud eclíptica geocéntrica de la Luna (Meeus cap.47, tabla Σβ, ~60 términos periódicos
// + términos aditivos A1/A3). Recalcula D, M, M', F, E de forma independiente (mismas fórmulas
// que moonLongitude(), sin tocar esa función) para no depender de nada ya verificado hoy.
function moonLatitude(T) {
  const LpDeg = _mod(218.3165 + 481267.8813*T - 0.001133*T*T, 360);
  const D  = _R(_mod(297.8502 + 445267.1115*T - 0.00163*T*T + T*T*T/538841, 360));
  const M  = _R(_mod(357.5291 + 35999.0503*T - 0.0001559*T*T, 360));
  const Mp = _R(_mod(134.9634 + 477198.8676*T + 0.008997*T*T + T*T*T/69699, 360));
  const F  = _R(_mod( 93.2721 + 483202.0175*T - 0.003403*T*T - T*T*T/3526000, 360));
  const E  = 1 - 0.002516*T - 0.0000074*T*T;

  const Lp = _R(LpDeg);
  const A1 = _R(_mod(119.75 + 131.849*T, 360));
  const A3 = _R(_mod(313.45 + 481266.484*T, 360));

  // [D, M, M', F, coeficiente en unidades de 0.000001°] — Meeus, "Astronomical Algorithms", Σβ
  const TERMS_BETA = [
    [0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],
    [2,0,-1,1,55413],[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],
    [2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],
    [2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],
    [2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],
    [0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],
    [0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],
    [4,0,0,-1,1021],[4,0,-1,1,833],[0,0,1,-3,777],[4,0,-2,1,671],
    [2,0,0,-3,607],[2,0,2,-1,596],[2,-1,1,-1,491],[2,0,-2,1,-451],
    [0,0,3,-1,439],[2,0,2,1,422],[2,0,-3,-1,421],[2,1,-1,1,-366],
    [2,1,0,1,-351],[4,0,0,1,331],[2,-1,1,1,315],[2,-2,0,-1,302],
    [0,0,1,3,-283],[2,1,1,-1,-229],[1,1,0,-1,223],[1,1,0,1,223],
    [0,1,-2,-1,-220],[2,1,-1,-1,-220],[1,0,1,1,-185],[2,-1,-2,-1,181],
    [0,1,2,1,-177],[4,0,-2,-1,176],[4,-1,-1,-1,166],[1,0,1,-1,-164],
    [4,0,1,-1,132],[1,0,-1,-1,-119],[4,-1,0,-1,115],[2,-2,0,1,107]
  ];

  let sumBeta = 0;
  for (let i = 0; i < TERMS_BETA.length; i++) {
    const t = TERMS_BETA[i];
    const arg = t[0]*D + t[1]*M + t[2]*Mp + t[3]*F;
    let amp = t[4];
    if (Math.abs(t[1]) === 1) amp *= E;
    else if (Math.abs(t[1]) === 2) amp *= E*E;
    sumBeta += amp * Math.sin(arg);
  }

  // Términos aditivos (perturbaciones de Venus/Júpiter y achatamiento terrestre, Meeus cap.47)
  sumBeta += -2235*Math.sin(Lp) + 382*Math.sin(A3) + 175*Math.sin(A1-F) + 175*Math.sin(A1+F)
           +  127*Math.sin(Lp-Mp) - 115*Math.sin(Lp+Mp);

  return sumBeta / 1000000; // de 0.000001° a grados
}

function _earthHelio(T) {
  const s = sunLongitude(T);
  const M = _R(_mod(357.52911 + 35999.05029*T, 360));
  return { lon: _mod(s + 180, 360), r: 1.000001018*(1 - 0.01671*Math.cos(M) - 0.00014*Math.cos(2*M)) };
}
function _rv(a, e, M) { return a*(1-e*e)/(1+e*Math.cos(M)); }
function _eqC(e, M) { return (2*e-e*e*e/4)*_D(Math.sin(M))+(5/4*e*e)*_D(Math.sin(2*M))+(13/12*e*e*e)*_D(Math.sin(3*M)); }
function _helioToGeo(p, earth) {
  const ex = earth.r*Math.cos(_R(earth.lon));
  const ey = earth.r*Math.sin(_R(earth.lon));
  return _mod(_D(Math.atan2(p.y - ey, p.x - ex)), 360);
}
// Inclinación (I) y longitud del nodo ascendente (Ω) J2000 + tasa por siglo juliano
// Fuente: Standish, E.M. (1992), "Keplerian Elements for Approximate Positions of the
// Major Planets", JPL/NASA Solar System Dynamics (válida 1800-2050 EC)
function _planet(L0,L1,L2,w0,w1,a,e,I0,I1,O0,O1,T) {
  const L = _mod(L0+L1*T+L2*T*T, 360);
  const w = _mod(w0+w1*T, 360);           // ϖ, longitud del perihelio
  const O = _mod(O0+O1*T, 360);           // Ω, longitud del nodo ascendente
  const I = _R(I0+I1*T);                  // inclinación orbital respecto a la eclíptica
  const M = _R(_mod(L-w, 360));
  const r = _rv(a,e,M);
  const nu = M + _R(_eqC(e,M));           // anomalía verdadera
  const u  = nu + _R(_mod(w-O, 360));     // argumento de latitud (desde el nodo ascendente)
  const OR = _R(O);
  const x = r*(Math.cos(OR)*Math.cos(u) - Math.sin(OR)*Math.sin(u)*Math.cos(I));
  const y = r*(Math.sin(OR)*Math.cos(u) + Math.cos(OR)*Math.sin(u)*Math.cos(I));
  const z = r*Math.sin(u)*Math.sin(I);    // componente fuera del plano eclíptico (para latitud)
  return { x, y, z };
}
// Latitud eclíptica geocéntrica a partir de la posición heliocéntrica 3D del planeta (p.x,p.y,p.z)
// y la posición heliocéntrica de la Tierra (siempre con z=0, la Tierra define el plano eclíptico)
function _eclipticLatitude(p, earth) {
  const ex = earth.r*Math.cos(_R(earth.lon));
  const ey = earth.r*Math.sin(_R(earth.lon));
  const dx = p.x - ex, dy = p.y - ey;
  return _D(Math.atan2(p.z, Math.sqrt(dx*dx + dy*dy)));
}
// Declinación ecuatorial a partir de longitud + latitud eclíptica y la oblicuidad (fórmula estándar)
function _declinacion(lambdaDeg, betaDeg, epsR) {
  const lam = _R(lambdaDeg), bet = _R(betaDeg);
  return _D(Math.asin(Math.sin(bet)*Math.cos(epsR) + Math.cos(bet)*Math.sin(epsR)*Math.sin(lam)));
}
function mercuryLongitude(T) { const e=_earthHelio(T); const p=_planet(252.250906,149474.0722491,0.00030350,77.45611904,0.1593667,0.38709831,0.20563069, 7.00497902,-0.00594749, 48.33076593,-0.12534081,T); return _helioToGeo(p,e); }
function venusLongitude(T)   { const e=_earthHelio(T); const p=_planet(181.979801,58519.2130302,0.00031014,131.563703,0.0048746,0.72332982,0.00677323, 3.39467605,-0.00078890, 76.67984255,-0.27769418,T); return _helioToGeo(p,e); }
function marsLongitude(T)    { const e=_earthHelio(T); const p=_planet(355.433275,19141.6964746,0.00031052,336.560357,0.4442616,1.52366231,0.09341233, 1.84969142,-0.00813131, 49.55953891,-0.29257343,T); return _helioToGeo(p,e); }
function jupiterLongitude(T) { const e=_earthHelio(T); const p=_planet(34.351519,3036.3027748,0.00022330,14.331532,0.3371283,5.20252,0.04849485, 1.30439695,-0.00183714, 100.47390909,0.20469106,T); return _helioToGeo(p,e); }
function saturnLongitude(T)  { const e=_earthHelio(T); const p=_planet(50.077444,1223.5110686,0.00051908,93.056787,0.5665496,9.55184,0.05550825, 2.48599187,0.00193609, 113.66242448,-0.28867794,T); return _helioToGeo(p,e); }
function uranusLongitude(T)  { const e=_earthHelio(T); const p=_planet(314.055005,429.8640561,0,173.005159,0.0893158,19.21814,0.04629590, 0.77263783,-0.00242939, 74.01692503,0.04240589,T); return _helioToGeo(p,e); }
function neptuneLongitude(T) { const e=_earthHelio(T); const p=_planet(304.348665,219.8833092,0,48.120276,0.0291866,30.10957,0.00898809, 1.77004347,0.00035372, 131.78422574,-0.00508664,T); return _helioToGeo(p,e); }

// Latitud eclíptica geocéntrica de cada planeta (mismos elementos orbitales que sus funciones
// de longitud de arriba, sin tocarlas — aquí solo se usa la componente z, antes descartada)
function mercuryLatitude(T) { const e=_earthHelio(T); const p=_planet(252.250906,149474.0722491,0.00030350,77.45611904,0.1593667,0.38709831,0.20563069, 7.00497902,-0.00594749, 48.33076593,-0.12534081,T); return _eclipticLatitude(p,e); }
function venusLatitude(T)   { const e=_earthHelio(T); const p=_planet(181.979801,58519.2130302,0.00031014,131.563703,0.0048746,0.72332982,0.00677323, 3.39467605,-0.00078890, 76.67984255,-0.27769418,T); return _eclipticLatitude(p,e); }
function marsLatitude(T)    { const e=_earthHelio(T); const p=_planet(355.433275,19141.6964746,0.00031052,336.560357,0.4442616,1.52366231,0.09341233, 1.84969142,-0.00813131, 49.55953891,-0.29257343,T); return _eclipticLatitude(p,e); }
function jupiterLatitude(T) { const e=_earthHelio(T); const p=_planet(34.351519,3036.3027748,0.00022330,14.331532,0.3371283,5.20252,0.04849485, 1.30439695,-0.00183714, 100.47390909,0.20469106,T); return _eclipticLatitude(p,e); }
function saturnLatitude(T)  { const e=_earthHelio(T); const p=_planet(50.077444,1223.5110686,0.00051908,93.056787,0.5665496,9.55184,0.05550825, 2.48599187,0.00193609, 113.66242448,-0.28867794,T); return _eclipticLatitude(p,e); }
function uranusLatitude(T)  { const e=_earthHelio(T); const p=_planet(314.055005,429.8640561,0,173.005159,0.0893158,19.21814,0.04629590, 0.77263783,-0.00242939, 74.01692503,0.04240589,T); return _eclipticLatitude(p,e); }
function neptuneLatitude(T) { const e=_earthHelio(T); const p=_planet(304.348665,219.8833092,0,48.120276,0.0291866,30.10957,0.00898809, 1.77004347,0.00035372, 131.78422574,-0.00508664,T); return _eclipticLatitude(p,e); }

// Nodo Norte de la Luna
function lunarNode(T) {
  return _mod(125.04452 - 1934.136261*T + 0.0020708*T*T, 360);
}

// Función principal de carta natal
function calcularCartaNatal(year, month, day, localHour, localMin, latDeg, lonDeg, tzOffset) {
  // Convertir a UT
  let ut = localHour + localMin / 60 - tzOffset;
  let dyUT = day;
  if (ut < 0)  { ut += 24; dyUT--; }
  if (ut >= 24) { ut -= 24; dyUT++; }

  const JD = julianDay(year, month, dyUT, ut);
  const T  = (JD - 2451545.0) / 36525.0;

  const eps0 = obliquity(T);
  const { dpsi, deps } = nutation(T);
  const epsTrue = eps0 + deps;
  const epsTR = _R(epsTrue);

  // GAST → LAST
  const GMST_deg = gmst(JD, T);
  const GAST = _mod(GMST_deg + dpsi * Math.cos(epsTR), 360);
  const LAST = _mod(GAST + lonDeg, 360);
  const LASTR = _R(LAST);
  const latR  = _R(latDeg);

  // Ascendente (Meeus fórmula exacta)
  const yAsc = -Math.cos(LASTR);
  const xAsc = Math.sin(LASTR)*Math.cos(epsTR) + Math.tan(latR)*Math.sin(epsTR);
  const ASC  = _mod(_D(Math.atan2(yAsc, xAsc)) + 180, 360);
 // Casas Whole Sign (la más precisa de implementar, 0° error por definición)
  const ascSignIdx = Math.floor(ASC / 30);
  const casas = [];
  for (let i = 0; i < 12; i++) {
    casas.push((ascSignIdx + i) % 12 * 30);
  }

  // Planetas
  const sunL  = sunLongitude(T);
  // Declinación del Sol (latitud eclíptica del Sol ≈ 0° por definición del propio eclíptico)
  const sunDeclDeg = _D(Math.asin(Math.sin(epsTR) * Math.sin(_R(sunL))));
  const moonL = moonLongitude(T);
  // Latitud eclíptica y declinación de la Luna (aditivo, ver moonLatitude() arriba)
  const moonLatDeg = moonLatitude(T);
  const moonDeclDeg = _declinacion(moonL, moonLatDeg, epsTR);
  const mercL = mercuryLongitude(T);
  const venL  = venusLongitude(T);
  const marL  = marsLongitude(T);
  const jupL  = jupiterLongitude(T);
  const satL  = saturnLongitude(T);
  const uraL  = uranusLongitude(T);
  const nepL  = neptuneLongitude(T);
  const nodeL = lunarNode(T);

  // Latitud eclíptica y declinación de Mercurio a Neptuno (aditivo, ver funciones xxxLatitude arriba)
  const mercLatDeg = mercuryLatitude(T);
  const mercDeclDeg = _declinacion(mercL, mercLatDeg, epsTR);
  const venLatDeg  = venusLatitude(T);
  const venDeclDeg  = _declinacion(venL, venLatDeg, epsTR);
  const marLatDeg  = marsLatitude(T);
  const marDeclDeg  = _declinacion(marL, marLatDeg, epsTR);
  const jupLatDeg  = jupiterLatitude(T);
  const jupDeclDeg  = _declinacion(jupL, jupLatDeg, epsTR);
  const satLatDeg  = saturnLatitude(T);
  const satDeclDeg  = _declinacion(satL, satLatDeg, epsTR);
  const uraLatDeg  = uranusLatitude(T);
  const uraDeclDeg  = _declinacion(uraL, uraLatDeg, epsTR);
  const nepLatDeg  = neptuneLatitude(T);
  const nepDeclDeg  = _declinacion(nepL, nepLatDeg, epsTR);

  const signoNombre = (d) => {
    const signos = ['Aries','Tauro','Géminis','Cáncer','Leo','Virgo','Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'];
    d = _mod(d, 360);
    const idx = Math.floor(d / 30);
    const g   = (d % 30).toFixed(1);
    return g + '° de ' + signos[idx];
  };

  return {
    ascendente: signoNombre(ASC),
    sol:        signoNombre(sunL),
    luna:       signoNombre(moonL),
    mercurio:   signoNombre(mercL),
    venus:      signoNombre(venL),
    marte:      signoNombre(marL),
    jupiter:    signoNombre(jupL),
    saturno:    signoNombre(satL),
    urano:      signoNombre(uraL),
    neptuno:    signoNombre(nepL),
    nodoNorte:  signoNombre(nodeL),
    ascRaw:  ASC,
    casas:   casas,
    solRaw:  sunL,
    solLatDeg:  0,
    solDeclDeg: sunDeclDeg,
    lunaRaw: moonL,
    lunaLatDeg: moonLatDeg,
    lunaDeclDeg: moonDeclDeg,
    mercRaw: mercL,
    mercLatDeg: mercLatDeg,
    mercDeclDeg: mercDeclDeg,
    venRaw:  venL,
    venLatDeg: venLatDeg,
    venDeclDeg: venDeclDeg,
    marRaw:  marL,
    marLatDeg: marLatDeg,
    marDeclDeg: marDeclDeg,
    jupRaw:  jupL,
    jupLatDeg: jupLatDeg,
    jupDeclDeg: jupDeclDeg,
    satRaw:  satL,
    satLatDeg: satLatDeg,
    satDeclDeg: satDeclDeg,
    uraRaw:  uraL,
    uraLatDeg: uraLatDeg,
    uraDeclDeg: uraDeclDeg,
    nepRaw:  nepL,
    nepLatDeg: nepLatDeg,
    nepDeclDeg: nepDeclDeg,
    nodeRaw: nodeL,
    lat:     latDeg,
    lon:     lonDeg,
    LST:     LAST,
    JD:      JD,
    utH:     localHour - tzOffset,
    utM:     localMin
  };
}

const carta = calcularCartaNatal(year, month, day, localHour, localMin, latDeg, lonDeg, tzOffset);
    return res.status(200).json(carta);

  } catch (error) {
    console.error('Error calculando carta:', error);
    return res.status(500).json({ error: 'Error en el cálculo' });
  }
}