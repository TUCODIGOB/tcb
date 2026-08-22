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

import { analizarArea, revisarBloques } from '../lib/bloques.js';

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
  // Empezar por un remate no es maquetacion: es que el area arranca por el
  // golpe, y eso hay que reescribirlo.
  const b = analizarArea(['[REMATE] Llevas media vida pidiendo permiso', ...CUERPO].join('\n'));
  c('empezar por un remate se sigue rechazando',
    revisarBloques(b).some(f => f.includes('empieza por una frase destacada')), revisarBloques(b).join(' | '));
}
{
  const sinRemate = CUERPO.filter(l => !l.startsWith('[REMATE]'));
  c('un area sin remate se sigue rechazando',
    revisarBloques(analizarArea(sinRemate.join('\n'))).some(f => f.includes('remate')));
}

console.log(fallos === 0 ? '\nTODO BIEN\n' : `\n${fallos} FALLO(S)\n`);
process.exit(fallos === 0 ? 0 : 1);
