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
  cierre: { revela: 'que la prueba se la puso ella y nadie se la pidio', texto: 'El cierre del area, que golpea y abre.' },
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
  //
  // Desde cinco parrafos, que es cuando hay huecos para las cuatro dejando
  // texto detras de cada una. Con menos, las dos reglas chocan: o una comparte
  // parrafo o alguna se pega al cierre. Manda no pegarse al cierre, que es lo
  // que ve el cliente, y ese caso se prueba justo debajo. Un area de verdad
  // trae once parrafos o mas: por debajo ya se rechaza antes de llegar aqui.
  for (const n of [14, 8, 5]) {
    const b = analizarArea(montarArea(casillas(n, 2)));
    const grandes = b.filter(x => ['remate', 'pregunta'].includes(x.tipo)).length;
    c(`las cuatro al mismo sitio con ${n} parrafos: no se pierde ninguna`,
      grandes === 3 && b.some(x => x.tipo === 'escena') && revisarBloques(b).length === 0,
      grandes + ' grandes, ' + revisarBloques(b).join(' | '));
  }
  // Y un area demasiado corta no revienta ni pierde el cierre.
  for (const n of [1, 2, 3, 4]) {
    const b = analizarArea(montarArea(casillas(n, 2)));
    c(`un area de ${n} parrafo(s) se monta y acaba en cierre`,
      b.length > 0 && b[b.length - 1].tipo === 'cierre',
      b.length ? 'acaba en ' + b[b.length - 1].tipo : 'vacia');
  }
}
{
  // Barrido: las cuatro al mismo sitio, probando TODOS los sitios posibles en
  // areas de todos los tamanos. El hueco se busca hacia delante y, si no lo
  // hay, hacia atras saltando los ocupados.
  let mal = 0;
  for (const n of [5, 6, 8, 12, 20]) {
    for (let sitio = 1; sitio <= n; sitio++) {
      const b = analizarArea(montarArea(casillas(n, sitio)));
      const grandes = b.filter(x => ['remate', 'pregunta'].includes(x.tipo)).length;
      if (grandes !== 3 || !b.some(x => x.tipo === 'escena') || revisarBloques(b).length > 0) {
        mal++;
        if (mal === 1) console.log(`        primera que falla: ${n} parrafos, sitio ${sitio}`);
      }
    }
  }
  c('las cuatro al mismo sitio, en cualquier sitio y tamano', mal === 0, mal + ' combinaciones mal');
}
{
  // DETRAS DEL ULTIMO PARRAFO SOLO VA EL CIERRE.
  //
  // El cierre tambien se imprime grande y centrado. Una frase grande pegada a
  // el deja dos carteles seguidos sin una linea de texto en medio, y el golpe
  // del area se pierde porque llega detras de otro igual. Se pedia en el
  // prompt y no se comprobaba, asi que pasaba.
  //
  // Lo estricto vale para las verdes, remate y pregunta, que son las que
  // compiten con el cierre. La escena va en cursiva gris con su filete y ahi no
  // hace cartel doble, asi que puede caer en el ultimo cuando no queda hueco.
  //
  // Hacen falta cinco parrafos para colocar las cuatro casillas dejando texto
  // detras de cada una; un area de verdad trae once o mas. Por debajo de cinco
  // manda no perder ninguna, que es el fallo gordo, y eso se prueba aparte.
  const VERDES = ['remate', 'pregunta', 'escena'];
  let pegadas = 0;
  for (const n of [5, 6, 8, 12, 20]) {
    // Incluye pedir el ultimo parrafo, uno de mas y un numero inventado.
    for (const sitio of [n, n + 1, 99]) {
      const b = analizarArea(montarArea(casillas(n, sitio)));
      if (b[b.length - 1].tipo !== 'cierre' || VERDES.includes(b[b.length - 2].tipo)) {
        pegadas++;
        if (pegadas === 1) console.log(`        primera pegada: ${n} parrafos, sitio ${sitio}, ${b[b.length - 2].tipo}`);
      }
    }
  }
  c('ninguna casilla queda pegada al cierre', pegadas === 0, pegadas + ' pegadas');

  // Y no solo pidiendo el ultimo: en cualquier sitio de cualquier tamano.
  let mal2 = 0;
  for (const n of [5, 6, 8, 12, 20]) {
    for (let sitio = 1; sitio <= n; sitio++) {
      const b = analizarArea(montarArea(casillas(n, sitio)));
      if (VERDES.includes(b[b.length - 2].tipo)) mal2++;
    }
  }
  c('tampoco en ninguna otra combinacion', mal2 === 0, mal2 + ' combinaciones con una pegada');
}
{
  // Numeros imposibles: el modelo se inventa un parrafo 99 o un -3.
  const raro = { ...casillas(10, 3), escena: { tras_parrafo: 99, texto: 'Son las once.' }, pregunta: { tras_parrafo: -3, texto: '¿Y tu?' } };
  const b = analizarArea(montarArea(raro));
  c('un numero fuera de rango no rompe nada', revisarBloques(b).length === 0, revisarBloques(b).join(' | '));
  c('y nada queda detras del cierre', b[b.length - 1].tipo === 'cierre');
}
// ── LAS CUATRO CASILLAS NO SE AMONTONAN, PASE LO QUE PASE ──────────
//
// POR QUE EXISTE: el informe del 27 de agosto a las 18:17. Se habia pedido
// que una casilla grande solo cayera detras de un parrafo que acabara la
// frase, para que no la partiera por la mitad. Pero se pidio JUNTO con "y
// que este libre", y las dos condiciones no valen lo mismo.
//
// En un area cuyos parrafos iban encadenados -acabados en coma, que es como
// se escribe cuando la idea sigue en el parrafo siguiente- no habia NI UN
// sitio que cumpliera las dos. Las cuatro casillas se amontonaron al final,
// pegadas una detras de otra. Y dos casillas pegadas sin texto en medio se
// leen como un cartel: al sanearlas una deja de ser frase grande y se
// pierde. El area llegaba sin remates, se rechazaba, y se pedia entera otra
// vez. Tres minutos y el doble de gasto por informe.
//
// Partir una frase se lee raro; perder un remate manda el area a rehacer.
// Asi que acabar la frase es una preferencia y no amontonarse es una regla.
{
  // Ningun parrafo acaba en punto: el caso exacto que lo rompio.
  const encadenada = {
    parrafos: [
      { texto: 'Hay una cosa que haces sin darte cuenta,' },
      { texto: 'y es que te adelantas siempre,' },
      { texto: 'antes de que nadie te lo pida,' },
      { texto: 'porque si no lo haces tu no lo hace nadie,' },
      { texto: 'o eso es lo que te has contado,' },
      { texto: 'y llevas asi tanto tiempo que ya ni lo notas,' },
      { texto: 'hasta que llega la noche y la lista sigue igual,' },
      { texto: 'y entonces si lo notas, de golpe.' },
    ],
    escena: { tras_parrafo: 1, texto: 'Son las ocho y sigues contestando mensajes.' },
    remate_herida: { tras_parrafo: 3, texto: 'Eso no es cansancio, es miedo a soltar' },
    remate_fuerza: { tras_parrafo: 5, texto: 'Y aun asi sigues ahi, entera' },
    pregunta: { tras_parrafo: 7, texto: '¿Cuantas veces has dado tres vueltas a algo?' },
    cierre: { texto: 'El dia que dejes de exigirte tanto no pierdes nada.' },
  };
  const b = analizarArea(montarArea(encadenada));
  const cuantos = t => b.filter(x => x.tipo === t).length;
  c('sin un solo parrafo que cierre frase, no se pierde ningun remate',
    cuantos('remate') === 2, cuantos('remate') + ' remate(s)');
  c('ni la escena ni la pregunta se pierden',
    cuantos('escena') === 1 && cuantos('pregunta') === 1,
    `escena ${cuantos('escena')}, pregunta ${cuantos('pregunta')}`);
  c('y el area sigue pasando la revision', revisarBloques(b).length === 0,
    revisarBloques(b).join(' | '));
  // Y ninguna queda pegada a otra: entre dos casillas va texto.
  const tipos = b.map(x => x.tipo);
  const grande = t => t === 'escena' || t === 'remate' || t === 'pregunta';
  c('no hay dos casillas grandes pegadas',
    !tipos.some((t, i) => i > 0 && grande(t) && grande(tipos[i - 1])),
    tipos.join(' '));
}

// Y LO QUE EL ARREGLO NO PUEDE DESHACER: cuando SI hay sitio, la casilla no
// parte la frase. Es el fallo del informe del 30, area 2: la pregunta cayo
// entre "envuelto en un" y la frase que lo cerraba.
{
  const partida = {
    parrafos: [
      { texto: 'Hay una cosa que haces sin darte cuenta.' },
      { texto: 'Te adelantas, siempre.' },
      { texto: 'Acaba saliendo a medias, envuelto en un' },
      { texto: '"no importa, tampoco es para tanto".' },
      { texto: 'Y ahi se queda todo.' },
      { texto: 'Lo notas por la noche.' },
      { texto: 'La lista sigue igual de larga.' },
      { texto: 'Eso cansa de otra manera.' },
      { texto: 'Y no es culpa tuya.' },
      { texto: 'Nunca lo fue.' },
    ],
    escena: { tras_parrafo: 1, texto: 'Son las ocho y sigues contestando mensajes.' },
    remate_herida: { tras_parrafo: 6, texto: 'Eso no es cansancio, es miedo a soltar' },
    remate_fuerza: { tras_parrafo: 8, texto: 'Y aun asi sigues ahi, entera' },
    pregunta: { tras_parrafo: 3, texto: '¿Cuantas veces has dado tres vueltas a algo?' },
    cierre: { texto: 'El dia que dejes de exigirte tanto no pierdes nada.' },
  };
  const trozos = montarArea(partida).split('\n\n');
  const i = trozos.findIndex(t => t.startsWith('[PREGUNTA]'));
  c('la pregunta baja al parrafo que SI acaba la frase',
    /[.?!…]["»)\]]*$/.test(trozos[i - 1].trim()), 'va detras de: ' + trozos[i - 1]);
}

c('sin parrafos devuelve vacio', montarArea({ parrafos: [] }) === '');
c('sin datos no revienta', montarArea(null) === '' && montarArea(undefined) === '');

console.log(fallos === 0 ? '\nTODO BIEN\n' : `\n${fallos} FALLO(S)\n`);
process.exit(fallos === 0 ? 0 : 1);
