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

import { analizarArea, revisarBloques, avisosBloques, negritasDe } from '../lib/bloques.js';

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
// Lo que hacen las negritas ha cambiado a proposito: ya no tiran el area.
// Una negrita que se pasa se desmarca sola, que no toca ni una palabra y no
// puede crear una falta; y un area sin negritas se entrega y se avisa, porque
// se lee bien. Tirar el informe entero por esto es lo que dejo a una clienta
// pagando sin recibir nada. Lo de aqui abajo vigila ese trato.

// ── 5. Un area con su negrita pasa ────────────────────────────────────
{
  const fallosArea = revisarBloques(analizarArea(area('**Nadie te ha pedido nunca que pares**, y por eso llevas anos sin hacerlo, ni siquiera cuando el cuerpo te lo pide a gritos.')));
  comprobar('un area con su negrita no da fallos', fallosArea.length === 0, fallosArea.join(' | '));
}

// ── 6. Un area sin ninguna negrita se entrega, pero avisa ─────────────
{
  const bl = analizarArea(area('Nadie te ha pedido nunca que pares, y por eso llevas anos sin hacerlo, ni siquiera cuando el cuerpo te lo pide a gritos.'));
  comprobar('un area sin negritas NO se rechaza', revisarBloques(bl).length === 0, revisarBloques(bl).join(' | '));
  comprobar('...pero deja aviso', avisosBloques(bl).some(a => a.includes('plana')), avisosBloques(bl).join(' | '));
}

// ── 7. Marcada de mas: se recorta sola hasta el tope ──────────────────
{
  const todoMarcado = area('**Nadie te ha pedido nunca que pares, y por eso llevas anos sin hacerlo, ni siquiera cuando el cuerpo te lo pide a gritos, ni cuando ya no te queda nada que dar y sigues dando.**')
    .replace('Eso no se arregla apretando mas, se arregla mirando de donde viene, y de donde viene es de mucho antes de que tuvieras nada que demostrarle a nadie.',
             '**Eso no se arregla apretando mas, se arregla mirando de donde viene, y de donde viene es de mucho antes de que tuvieras nada que demostrarle a nadie.**');
  const bl = analizarArea(todoMarcado);
  const pal = t => t.replace(/\*\*/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const cuerpo = bl.filter(b => b.tipo === 'texto').reduce((n, b) => n + pal(b.t), 0);
  const marcadas = negritasDe(bl).reduce((n, t) => n + pal(t), 0);
  comprobar('marcada de mas, se recorta al tope', cuerpo === 0 || marcadas <= cuerpo * 0.25, marcadas + ' de ' + cuerpo);
  comprobar('y no se rechaza', revisarBloques(bl).length === 0, revisarBloques(bl).join(' | '));
}

// ── 8. Una negrita del tamano de un parrafo se desmarca ───────────────
{
  const larga = 'Y ahi esta el trabajo de verdad, ' + 'el que no se ve y no se cobra y nadie te agradece nunca, '.repeat(4) + 'que es el que llevas haciendo desde siempre.';
  const bl = analizarArea(area(`Te pasa cada vez, **${larga}**`));
  comprobar('una negrita de un parrafo se desmarca sola', !negritasDe(bl).some(t => t.length > 200));
  comprobar('y no se rechaza', revisarBloques(bl).length === 0, revisarBloques(bl).join(' | '));
}

// ── 9. Un area larga con una sola negrita se entrega y avisa ──────────
{
  const relleno = Array.from({ length: 24 }, (_, i) =>
    `Parrafo numero ${i} de relleno, con la longitud que tiene un parrafo de verdad dentro del area, para que el area entera se acerque a las novecientas palabras que tiene una de cliente y el suelo suba con ella.`).join('\n\n');
  const bl = analizarArea(area('**Nadie te ha pedido nunca que pares**, y por eso llevas anos sin hacerlo.') + '\n\n' + relleno);
  comprobar('un area larga con una sola negrita NO se rechaza', revisarBloques(bl).length === 0, revisarBloques(bl).join(' | '));
  comprobar('...pero deja aviso', avisosBloques(bl).some(a => a.includes('plana')), avisosBloques(bl).join(' | '));
}

console.log(fallos === 0 ? '\nTODO BIEN\n' : `\n${fallos} FALLO(S)\n`);
process.exit(fallos === 0 ? 0 : 1);
