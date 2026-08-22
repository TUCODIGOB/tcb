// ═════════════════════════════════════════════════════════════════
// test/negritas.test.mjs
//
// Las negritas del cuerpo del area: que lleguen enteras hasta el PDF y
// que un area rota por ellas no se de por buena.
//
// Por que existe este fichero: la negrita no es un adorno, es lo unico
// que rompe cuatro paginas del mismo cuerpo y el mismo color. Y se
// perdia sin hacer ruido: una negrita que abria parrafo se quedaba sin
// su marca de abrir, la de cerrar se limpiaba como asterisco suelto al
// maquetar, y la frase salia impresa igual que el resto. No fallaba
// nada, no avisaba nadie, simplemente no estaba.
//
// Ejecutar:  node test/negritas.test.mjs
// Sin red y sin dependencias: solo lib/bloques.js.
// ═════════════════════════════════════════════════════════════════

import { analizarArea, revisarBloques, negritasDe } from '../lib/bloques.js';

let fallos = 0;
function comprobar(titulo, condicion, detalle) {
  if (condicion) {
    console.log(`  ok   ${titulo}`);
  } else {
    fallos++;
    console.log(`  FALLA ${titulo}${detalle ? `\n        ${detalle}` : ''}`);
  }
}

// Un area minima bien montada, con el hueco marcado por %NEGRITAS% para
// poder cambiarle solo eso en cada caso.
function area(cuerpo) {
  return [
    'Te levantas y lo primero que haces es repasar la lista de lo que tienes pendiente, no porque haga falta, sino porque asi empieza el dia con algo bajo control.',
    '',
    cuerpo,
    '',
    '[SUBTITULO] La cuenta que no llevas',
    'Y de ahi sale todo lo demas, que es lo que nadie te ha contado nunca y llevas media vida pagando sin enterarte de que lo pagabas.',
    '',
    '[ESCENA] Son las once de la noche y todavia estas repasando el movil, con la luz apagada, buscando algo que ya has leido dos veces.',
    '',
    '[REMATE] Llevas media vida pidiendo permiso para ocupar tu propio sitio',
    '',
    '[SUBTITULO] Donde empezo esto',
    'Eso no se arregla apretando mas, se arregla mirando de donde viene, y de donde viene es de mucho antes de que tuvieras nada que demostrarle a nadie.',
    '',
    '[PREGUNTA] ¿Cuantas veces te has callado algo por no montar un lio?',
    '',
    'Y hasta que no veas eso, vas a seguir buscando fuera lo que lleva anos esperandote dentro.',
  ].join('\n');
}

console.log('\nNEGRITAS DEL CUERPO\n');

// ── 1. La negrita que abre parrafo llega entera ───────────────────────
// Es el caso que se perdia: la marca de abrir estaba en la primera
// posicion del parrafo y se limpiaba junto con las de maquetacion.
{
  const bloques = analizarArea(area('**Nadie te ha pedido nunca que pares**, y por eso llevas anos sin hacerlo, ni siquiera cuando el cuerpo te lo pide a gritos.'));
  const negritas = negritasDe(bloques);
  comprobar(
    'una negrita que abre parrafo no se pierde',
    negritas.includes('Nadie te ha pedido nunca que pares'),
    `negritas encontradas: ${JSON.stringify(negritas)}`,
  );
  const conAsterisco = bloques.some(b => /\*/.test(b.t) && !/\*\*[\s\S]+?\*\*/.test(b.t));
  comprobar('no queda ningun asterisco suelto', !conAsterisco);
}

// ── 2. La negrita en mitad del parrafo sigue funcionando ──────────────
{
  const negritas = negritasDe(analizarArea(area('Y mientras asientes, por dentro **estas calculando cuanto has ensenado de mas**, que es un trabajo que no descansa nunca.')));
  comprobar(
    'una negrita en mitad del parrafo llega igual',
    negritas.includes('estas calculando cuanto has ensenado de mas'),
    `negritas encontradas: ${JSON.stringify(negritas)}`,
  );
}

// ── 3. Un asterisco de verdad suelto se limpia ────────────────────────
// El modelo abre y no cierra. Impreso saldria un asterisco en mitad de
// la frase, asi que se quita.
{
  const bloques = analizarArea(area('**Nadie te ha pedido nunca que pares, y por eso llevas anos sin hacerlo, ni siquiera cuando el cuerpo te lo pide.'));
  const parrafo = bloques.find(b => b.t.includes('Nadie te ha pedido'));
  comprobar('una marca sin cerrar se limpia', parrafo && !parrafo.t.includes('*'), `quedo: ${parrafo && parrafo.t}`);
}

// ── 4. Solo cuenta el texto corrido ───────────────────────────────────
// En la escena manda la cursiva y en los remates la negrita del bloque
// entero: una negrita ahi no se ve, asi que no cuenta como negrita.
{
  const texto = [
    'Te levantas y lo primero que haces es repasar la lista de lo que tienes pendiente, no porque haga falta, sino porque asi el dia empieza con algo bajo control.',
    '',
    '[SUBTITULO] La cuenta que no llevas',
    'Y de ahi sale todo lo demas, que es lo que nadie te ha contado y llevas media vida pagando sin enterarte de que lo pagabas.',
    '',
    '[ESCENA] Son las once de la noche y **todavia estas repasando el movil**, con la luz apagada.',
    '',
    '[REMATE] **Llevas media vida pidiendo permiso para ocupar tu propio sitio**',
    '',
    '[SUBTITULO] Donde empezo esto',
    'Eso no se arregla apretando mas, se arregla mirando de donde viene, y viene de mucho antes de que tuvieras nada que demostrarle a nadie.',
    '',
    '[PREGUNTA] ¿Cuantas veces te has callado algo por no montar un lio?',
    '',
    'Y hasta que no veas eso, vas a seguir buscando fuera lo que lleva anos esperandote dentro.',
  ].join('\n');
  const negritas = negritasDe(analizarArea(texto));
  comprobar('las negritas de la escena y del remate no cuentan', negritas.length === 0, `contadas: ${JSON.stringify(negritas)}`);
}

console.log('\nREVISION DEL AREA\n');

// ── 5. Un area con su negrita pasa ────────────────────────────────────
{
  const fallosArea = revisarBloques(analizarArea(area('**Nadie te ha pedido nunca que pares**, y por eso llevas anos sin hacerlo, ni siquiera cuando el cuerpo te lo pide a gritos.')));
  comprobar('un area con su negrita no da fallos', fallosArea.length === 0, fallosArea.join(' | '));
}

// ── 6. Un area sin ninguna negrita no pasa ────────────────────────────
{
  const fallosArea = revisarBloques(analizarArea(area('Nadie te ha pedido nunca que pares, y por eso llevas anos sin hacerlo, ni siquiera cuando el cuerpo te lo pide a gritos.')));
  comprobar('un area sin negritas se rechaza', fallosArea.some(f => f.includes('negrita')), fallosArea.join(' | '));
}

// ── 7. Un area marcada de mas tampoco pasa ────────────────────────────
// Marcada media area, la negrita deja de destacar nada: lo que resalta
// es lo que va solo.
{
  const todoMarcado = area('**Nadie te ha pedido nunca que pares, y por eso llevas anos sin hacerlo, ni siquiera cuando el cuerpo te lo pide a gritos, ni cuando ya no te queda nada que dar y sigues dando.**')
    .replace('Eso no se arregla apretando mas, se arregla mirando de donde viene, y de donde viene es de mucho antes de que tuvieras nada que demostrarle a nadie.',
             '**Eso no se arregla apretando mas, se arregla mirando de donde viene, y de donde viene es de mucho antes de que tuvieras nada que demostrarle a nadie.**');
  const fallosArea = revisarBloques(analizarArea(todoMarcado));
  comprobar('un area marcada de mas se rechaza', fallosArea.some(f => f.includes('demasiado texto en negrita')), fallosArea.join(' | '));
}

// ── 8. Una negrita del tamano de un parrafo no pasa ───────────────────
{
  const larga = 'Y ahi esta el trabajo de verdad, ' + 'el que no se ve y no se cobra y nadie te agradece nunca, '.repeat(4) + 'que es el que llevas haciendo desde siempre.';
  const fallosArea = revisarBloques(analizarArea(area(`Te pasa cada vez, **${larga}**`)));
  comprobar('una negrita del tamano de un parrafo se rechaza', fallosArea.some(f => f.includes('se ha ido de largo')), fallosArea.join(' | '));
}

console.log(fallos === 0 ? '\nTODO BIEN\n' : `\n${fallos} FALLO(S)\n`);
process.exit(fallos === 0 ? 0 : 1);
