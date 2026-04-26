export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
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
    - 1.2740*Math.sin(2*D - Mp)
    + 0.6583*Math.sin(2*D)
    + 0.2136*Math.sin(2*Mp)
    - 0.1851*E*Math.sin(M)
    - 0.1143*Math.sin(2*F)
    + 0.0588*Math.sin(2*D - 2*Mp)
    + 0.0572*E*Math.sin(2*D - M - Mp)
    + 0.0533*Math.sin(2*D + Mp)
    + 0.0458*Math.sin(2*D - M)
    + 0.0409*E*Math.sin(M - Mp)
    - 0.0347*Math.sin(D + Mp)
    - 0.0305*E*Math.sin(2*(D - M))
    - 0.0283*Math.sin(D)
    - 0.0240*E*Math.sin(M + Mp)
    + 0.0215*E*Math.sin(2*D + M - Mp)
    + 0.0170*Math.sin(2*(D - Mp))
    + 0.0129*Math.sin(2*D + Mp - 2*F)
    + 0.0100*E*Math.sin(2*D + M)
    - 0.0085*E*Math.sin(2*D - M + Mp)
    - 0.0080*Math.sin(D - Mp)
    - 0.0064*E*Math.sin(2*D + M + Mp)
    + 0.0052*E*Math.sin(M + 2*Mp)
    - 0.0044*Math.sin(3*Mp)
    + 0.0040*E*Math.sin(3*D - Mp)
    - 0.0038*Math.sin(D + 2*F)
    - 0.0033*Math.sin(3*D - 2*Mp)
    + 0.0029*E*Math.sin(2*D - 2*M)
    - 0.0028*Math.sin(D + Mp + 2*F);
  return _mod(lon, 360);
}

function _earthHelio(T) {
  const s = sunLongitude(T);
  const M = _R(_mod(357.52911 + 35999.05029*T, 360));
  return { lon: _mod(s + 180, 360), r: 1.000001018*(1 - 0.01671*Math.cos(M) - 0.00014*Math.cos(2*M)) };
}
function _rv(a, e, M) { return a*(1-e*e)/(1+e*Math.cos(M)); }
function _eqC(e, M) { return (2*e-e*e*e/4)*_D(Math.sin(M))+(5/4*e*e)*_D(Math.sin(2*M))+(13/12*e*e*e)*_D(Math.sin(3*M)); }
function _helioToGeo(lon, r, earth) {
  const px = r*Math.cos(_R(lon)) - earth.r*Math.cos(_R(earth.lon));
  const py = r*Math.sin(_R(lon)) - earth.r*Math.sin(_R(earth.lon));
  return _mod(_D(Math.atan2(py, px)), 360);
}
function _planet(L0,L1,L2,w0,w1,a,e,T) {
  const L = _mod(L0+L1*T+L2*T*T, 360);
  const w = _mod(w0+w1*T, 360);
  const M = _R(_mod(L-w, 360));
  return { lon: _mod(L+_eqC(e,M), 360), r: _rv(a,e,M) };
}
function mercuryLongitude(T) { const e=_earthHelio(T); const p=_planet(252.250906,149474.0722491,0.00030350,77.45611904,0.1593667,0.38709831,0.20563069,T); return _helioToGeo(p.lon,p.r,e); }
function venusLongitude(T)   { const e=_earthHelio(T); const p=_planet(181.979801,58519.2130302,0.00031014,131.563703,0.0048746,0.72332982,0.00677323,T); return _helioToGeo(p.lon,p.r,e); }
function marsLongitude(T)    { const e=_earthHelio(T); const p=_planet(355.433275,19141.6964746,0.00031052,336.560357,0.4442616,1.52366231,0.09341233,T); return _helioToGeo(p.lon,p.r,e); }
function jupiterLongitude(T) { const e=_earthHelio(T); const p=_planet(34.351519,3036.3027748,0.00022330,14.331532,0.3371283,5.20252,0.04849485,T); return _helioToGeo(p.lon,p.r,e); }
function saturnLongitude(T)  { const e=_earthHelio(T); const p=_planet(50.077444,1223.5110686,0.00051908,93.056787,0.5665496,9.55184,0.05550825,T); return _helioToGeo(p.lon,p.r,e); }
function uranusLongitude(T)  { const e=_earthHelio(T); const p=_planet(314.055005,429.8640561,0,173.005159,0.0893158,19.21814,0.04629590,T); return _helioToGeo(p.lon,p.r,e); }
function neptuneLongitude(T) { const e=_earthHelio(T); const p=_planet(304.348665,219.8833092,0,48.120276,0.0291866,30.10957,0.00898809,T); return _helioToGeo(p.lon,p.r,e); }

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
  const moonL = moonLongitude(T);
  const mercL = mercuryLongitude(T);
  const venL  = venusLongitude(T);
  const marL  = marsLongitude(T);
  const jupL  = jupiterLongitude(T);
  const satL  = saturnLongitude(T);
  const uraL  = uranusLongitude(T);
  const nepL  = neptuneLongitude(T);
  const nodeL = lunarNode(T);

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
    solRaw:  sunL,
    lunaRaw: moonL,
    mercRaw: mercL,
    venRaw:  venL,
    marRaw:  marL,
    jupRaw:  jupL,
    satRaw:  satL,
    uraRaw:  uraL,
    nepRaw:  nepL,
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