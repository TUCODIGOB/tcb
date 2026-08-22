// ═════════════════════════════════════════════════════════════════
// test/bloques.test.mjs
//
// La maquetacion del area: que un fallo de colocacion se arregle solo en
// vez de tirar el area entera.
//
// POR QUE EXISTE: en la generacion del 22 de agosto a las 18:13 dos areas
// llegaron con un ladillo en la primera linea. Eso las descartaba, se
// pedia el repaso tres veces a cada una, y entre las dos se gastaron
// quince llamadas, dos minutos y un euro. El cliente se quedo sin informe
// por un ladillo mal puesto, que es maquetacion y no contenido.
//
// Ejecutar:  node test/bloques.test.mjs
// Sin red y sin dependencias.
// ═════════════════════════════════════════════════════════════════

import { analizarArea, revisarBloques, avisosBloques, negritasDe, montarArea } from '../lib/bloques.js';

let fallos = 0;
const c = (titulo, ok, det) => {
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${titulo}${ok || !det ? '' : `\n        ${det}`}`);
  if (!ok) fallos++;
};

const CUERPO = [
  'Te levantas y ya has repasado la lista entera antes de poner los pies en el suelo, y eso lo haces desde hace tanto que ya ni lo notas.',
  '',
  'Y mientras asientes por fuera, por dentro **estas calculando cuanto has ensenado de mas**, que es un trabajo que no descansa nunca.',
  '',
  '[SUBTITULO] Donde empezo esto',
  'De ahi sale todo lo demas, Ana, que es lo que nadie te ha contado en cuarenta anos de aguantar.',
  '',
  '[ESCENA] Son las once de la noche y sigues con el movil en la mano sin mirar nada en concreto.',
  '',
  '[REMATE] Llevas media vida pidiendo permiso para ocupar tu propio sitio',
  '',
  '[SUBTITULO] Lo que se cae',
  'Eso no se arregla apretando mas, se arregla mirando de donde viene y quien te enseno a hacerlo.',
  '',
  '[PREGUNTA] ¿Cuantas veces te has callado algo por no montar un lio?',
  '',
  'Y hasta que no veas eso, vas a seguir buscando fuera el permiso que llevas anos pudiendo darte tu sola.',
];

console.log('\nUN LADILLO EN LA PRIMERA LINEA\n');
{
  const b = analizarArea(['[SUBTITULO] La calculadora que no descansa', ...CUERPO].join('\n'));
  c('el area ya no empieza por el ladillo', b[0].tipo === 'texto', 'empieza por ' + b[0].tipo);
  c('el ladillo no se pierde, se baja', b.some(x => x.t.includes('calculadora')));
  c('queda detras del primer parrafo', b.findIndex(x => x.t.includes('calculadora')) === 1);
  c('y el area pasa la revision', revisarBloques(b).length === 0, revisarBloques(b).join(' | '));
}
{
  // La misma area sin el ladillo de mas: tiene que salir igual de bien.
  const b = analizarArea(CUERPO.join('\n'));
  c('un area bien puesta no se toca', b[0].tipo === 'texto' && revisarBloques(b).length === 0,
    revisarBloques(b).join(' | '));
}
{
  // Un titulo en markdown cuenta como ladillo y se baja igual.
  const b = analizarArea(['## La calculadora que no descansa', ...CUERPO].join('\n'));
  c('un titulo en markdown tambien se baja', b[0].tipo === 'texto', 'empieza por ' + b[0].tipo);
}

console.log('\nQUE NO REVIENTE EN LOS BORDES\n');
c('area vacia', analizarArea('').length === 0);
c('solo un ladillo y nada mas', analizarArea('[SUBTITULO] Solo esto').length <= 1);
c('ladillo y un unico parrafo', (() => {
  const b = analizarArea('[SUBTITULO] Uno\n\nUn solo parrafo y se acaba el area.');
  return b.length >= 1 && b[b.length - 1].tipo === 'cierre';
})());
c('dos ladillos seguidos al principio', (() => {
  const b = analizarArea(['[SUBTITULO] Uno', '[SUBTITULO] Dos', ...CUERPO].join('\n'));
  return b[0].tipo !== 'sub';
})());

console.log('\nLO QUE SIGUE SIENDO UN FALLO DE VERDAD\n');
{
  // Empezar por una frase grande tampoco tira el area: baja a parrafo normal
  // y sirve de entradilla, que es como se lee esa misma frase dentro del texto.
  const b = analizarArea(['[REMATE] Llevas media vida pidiendo permiso para ocupar tu sitio', ...CUERPO].join('\n'));
  c('empezar por un remate se arregla solo', b[0].tipo === 'texto', 'empieza por ' + b[0].tipo);
  c('y el area sigue pasando', revisarBloques(b).length === 0, revisarBloques(b).join(' | '));
}
{
  // Un remate sin marcar se reconoce solo, como ya se hacia con las preguntas,
  // para no tirar el area por una marca olvidada. Solo se hace si no hay
  // NINGUNO: si lo hiciera siempre, el area se llenaria de frases grandes.
  const sinRemate = CUERPO.filter(l => !l.startsWith('[REMATE]'));
  const b = analizarArea(sinRemate.join('\n'));
  c('un remate sin marcar se reconoce solo', b.some(x => x.tipo === 'remate'));
  c('y el area ya no se rechaza', revisarBloques(b).length === 0, revisarBloques(b).join(' | '));
  c('el elegido es una sola frase corta', (() => {
    const r = b.find(x => x.tipo === 'remate');
    return r && r.t.length <= 160 && !/[.!?]/.test(r.t.replace(/\*\*/g, '').trim().slice(0, -1));
  })());
}
{
  // Y si el area YA trae su remate, no se toca ningun parrafo mas.
  const b = analizarArea(CUERPO.join('\n'));
  c('con remate marcado no se asciende ningun parrafo', b.filter(x => x.tipo === 'remate').length === 1,
    b.filter(x => x.tipo === 'remate').length + ' remates');
}

console.log('\nLO QUE SOBRA SE COLOCA SOLO, SIN GASTAR UNA LLAMADA\n');
const pal = t => t.replace(/\*\*/g, ' ').trim().split(/\s+/).length;
const conCuerpo = (...lineas) => analizarArea([...lineas, ...CUERPO].join('\n'));

{
  const b = conCuerpo('[SUBTITULO] ' + 'palabra '.repeat(30));
  c('un ladillo larguisimo baja a texto normal', !b.some(x => x.tipo === 'sub' && x.t.length > 80));
}
{
  const muchos = Array.from({ length: 14 }, (_, i) => `[SUBTITULO] Ladillo numero ${i}\nUn parrafo detras del ladillo para que tenga cuerpo.\n`);
  const b = analizarArea([...CUERPO, ...muchos].join('\n'));
  c('catorce ladillos se quedan en ocho', b.filter(x => x.tipo === 'sub').length <= 8,
    b.filter(x => x.tipo === 'sub').length + ' ladillos');
}
{
  const b = analizarArea([CUERPO[0], '', '[ESCENA] Una.', '', '[ESCENA] Dos.', '', '[ESCENA] Tres.', '', '[ESCENA] Cuatro.', '', ...CUERPO.slice(2)].join('\n'));
  c('cuatro escenas se quedan en dos', b.filter(x => x.tipo === 'escena').length === 2);
}
{
  const b = conCuerpo('Apertura normal del area para que no empiece por marca.', '', '[REMATE] ' + 'palabra '.repeat(60));
  c('un remate de tres lineas baja a texto', !b.some(x => x.tipo === 'remate' && x.t.length > 220));
}
{
  const b = analizarArea([CUERPO[0], '', '[REMATE] Uno', '', '[PREGUNTA] ¿Dos?', '', ...CUERPO.slice(2)].join('\n'));
  const seguidas = b.some((x, i) => i > 0 && ['remate','pregunta'].includes(x.tipo) && ['remate','pregunta'].includes(b[i-1].tipo));
  c('dos frases grandes seguidas se separan', !seguidas);
}
{
  const larga = 'palabra '.repeat(45).trim();
  const b = conCuerpo('Apertura del area, texto corrido.', '', 'Y aqui **' + larga + '** dentro.');
  c('una negrita larguisima se desmarca', !negritasDe(b).some(t => t.length > 200));
}
{
  const b = analizarArea(['Apertura corta del area aqui.', '', '**' + 'uno '.repeat(25).trim() + '**', '', '**' + 'dos '.repeat(25).trim() + '**', '', 'Cierre.'].join('\n'));
  const cuerpo = b.filter(x => x.tipo === 'texto').reduce((n, x) => n + pal(x.t), 0);
  const marc = negritasDe(b).reduce((n, x) => n + pal(x), 0);
  c('media area en negrita se recorta al tope', cuerpo === 0 || marc <= cuerpo * 0.25, marc + ' de ' + cuerpo);
}

console.log('\nLO QUE PARA EL AREA (y solo eso)\n');
const tira = (nombre, quitar) => {
  const b = analizarArea(CUERPO.filter(l => !l.startsWith(quitar)).join('\n'));
  c('sin ' + nombre + ' se para', revisarBloques(b).length > 0, revisarBloques(b).join(' | '));
};
tira('escena', '[ESCENA]');
// El remate ya no se prueba aqui: se reconoce solo aunque venga sin marcar,
// y su caso esta arriba.
tira('pregunta', '[PREGUNTA]');
c('un area entera pasa sin fallos', revisarBloques(analizarArea(CUERPO.join('\n'))).length === 0);

console.log('\nLO QUE SE ENTREGA Y SOLO AVISA\n');
{
  const unLadillo = CUERPO.filter(l => !l.startsWith('[SUBTITULO] Lo que se cae'));
  const b = analizarArea(unLadillo.join('\n'));
  c('con un ladillo de menos NO se para', revisarBloques(b).length === 0, revisarBloques(b).join(' | '));
  c('...pero avisa', avisosBloques(b).some(a => a.includes('ladillo')), avisosBloques(b).join(' | '));
}
{
  const b = analizarArea(CUERPO.join('\n'));
  c('con un solo remate NO se para', revisarBloques(b).length === 0);
  c('...pero avisa', avisosBloques(b).some(a => a.includes('remate')), avisosBloques(b).join(' | '));
}
{
  const b = analizarArea(CUERPO.map(l => l.replace(/\*\*/g, '')).join('\n'));
  c('sin negritas NO se para', revisarBloques(b).length === 0);
  c('...pero avisa', avisosBloques(b).some(a => a.includes('plana')), avisosBloques(b).join(' | '));
}

console.log('\nMONTAR EL AREA DESDE SUS CASILLAS\n');
// El modelo rellena casillas y dice detras de que parrafo va cada cosa.
// Colocarlas es de aqui, y aqui no se pierde ninguna.
const casillas = (nParrafos, sitio) => ({
  parrafos: Array.from({ length: nParrafos }, (_, i) => ({
    ladillo: i === 1 ? 'Un ladillo corto' : null,
    texto: `Parrafo ${i + 1} con su texto normal y su desarrollo entero para que tenga cuerpo de verdad.`,
  })),
  escena: { tras_parrafo: sitio, texto: 'Son las once de la noche y sigues de pie sin sentarte.' },
  remate_herida: { tras_parrafo: sitio, texto: 'Llevas media vida pidiendo permiso' },
  remate_fuerza: { tras_parrafo: sitio, texto: 'Nadie aguanta tanto sin que eso sea una fuerza' },
  pregunta: { tras_parrafo: sitio, texto: '¿Cuantas veces te has callado algo?' },
  cierre: 'El cierre del area, que golpea y abre.',
});
{
  const b = analizarArea(montarArea(casillas(12, 4)));
  c('un area montada pasa la revision', revisarBloques(b).length === 0, revisarBloques(b).join(' | '));
  c('no empieza por un ladillo', b[0].tipo === 'texto', 'empieza por ' + b[0].tipo);
  c('el cierre es lo ultimo', b[b.length - 1].tipo === 'cierre');
}
{
  // El peor caso: el modelo manda las cuatro detras del MISMO parrafo. Si se
  // dejaran pegadas, al sanearlo una frase grande se perderia.
  for (const n of [14, 8, 5, 4, 3]) {
    const b = analizarArea(montarArea(casillas(n, 2)));
    const grandes = b.filter(x => ['remate', 'pregunta'].includes(x.tipo)).length;
    c(`las cuatro al mismo sitio con ${n} parrafos: no se pierde ninguna`,
      grandes === 3 && b.some(x => x.tipo === 'escena') && revisarBloques(b).length === 0,
      grandes + ' grandes, ' + revisarBloques(b).join(' | '));
  }
}
{
  // Numeros imposibles: el modelo se inventa un parrafo 99 o un -3.
  const raro = { ...casillas(10, 3), escena: { tras_parrafo: 99, texto: 'Son las once.' }, pregunta: { tras_parrafo: -3, texto: '¿Y tu?' } };
  const b = analizarArea(montarArea(raro));
  c('un numero fuera de rango no rompe nada', revisarBloques(b).length === 0, revisarBloques(b).join(' | '));
  c('y nada queda detras del cierre', b[b.length - 1].tipo === 'cierre');
}
c('sin parrafos devuelve vacio', montarArea({ parrafos: [] }) === '');
c('sin datos no revienta', montarArea(null) === '' && montarArea(undefined) === '');

console.log(fallos === 0 ? '\nTODO BIEN\n' : `\n${fallos} FALLO(S)\n`);
process.exit(fallos === 0 ? 0 : 1);
