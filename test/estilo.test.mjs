// ═════════════════════════════════════════════════════════════════
// test/estilo.test.mjs
//
// Los dos retoques de lib/estilo.js: la coma antes de "y" y la cuenta
// del nombre.
//
// Lo que mas se vigila aqui no es lo que quita, es lo que NO quita. Una
// coma sobrante se lee un poco rara; una coma quitada donde hacia falta
// es una falta de ortografia impresa en un producto de 47 euros, asi que
// el criterio es no tocar ante la duda. Si algun dia se amplia la lista
// de casos, estas pruebas son las que avisan de que se ha ido de la mano.
//
// Ejecutar:  node test/estilo.test.mjs
// Sin red y sin dependencias.
// ═════════════════════════════════════════════════════════════════

import { quitarComaAntesDeY, vecesQueSaleElNombre } from '../lib/estilo.js';

let fallos = 0;
function comprobar(titulo, ok, detalle) {
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${titulo}${ok || !detalle ? '' : `\n        ${detalle}`}`);
  if (!ok) fallos++;
}
const quita = (a, b) => comprobar(`quita: ${a}`, quitarComaAntesDeY(a) === b, `salio: ${quitarComaAntesDeY(a)}`);
const deja  = (a)    => comprobar(`deja:  ${a}`, quitarComaAntesDeY(a) === a, `salio: ${quitarComaAntesDeY(a)}`);

console.log('\nLA COMA ANTES DE "Y" — LAS QUE SOBRAN\n');
// Detras de la "y" sigue mandando el mismo sujeto: la coma no pinta nada.
quita('No pides ayuda, y lo haces sin decirlo.', 'No pides ayuda y lo haces sin decirlo.');
quita('Te callas, y te aislas un poco.',          'Te callas y te aislas un poco.');
quita('Revisas la lista, y acabas agotada.',      'Revisas la lista y acabas agotada.');
quita('Lo dejas hecho, y luego te sientas.',      'Lo dejas hecho y luego te sientas.');
quita('No lo pides, y por eso te extrana.',       'No lo pides y por eso te extrana.');

console.log('\nLAS QUE LLEVAN TILDE, QUE ERAN LAS QUE SE COLABAN\n');
// En JavaScript \b no marca fin de palabra detras de una vocal acentuada,
// asi que con \b estas cuatro se escapaban todas. Por eso estan aqui.
quita('Sabes lo que hay, y ahí te sientes segura.',    'Sabes lo que hay y ahí te sientes segura.');
quita('Te lo tragas, y así te ahorras el lío.',        'Te lo tragas y así te ahorras el lío.');
quita('Lo haces igual, y después te arrepientes.',     'Lo haces igual y después te arrepientes.');
quita('No lo pides, y aún así acabas resolviéndolo.',  'No lo pides y aún así acabas resolviéndolo.');

console.log('\nLAS QUE NO SE TOCAN NUNCA\n');
// Detras hay otro sujeto o empieza una subordinada: la coma es correcta.
deja('No pides ayuda, y eso te deja sola.');
deja('Lo sostienes todo, y nadie lo nota.');
deja('Llega el lunes, y cuando llega ya estas cansada.');
deja('Esa capacidad es tuya, y muy pocas personas la tienen.');
deja('Dices que estas bien, y es verdad.');
deja('Te da miedo fallar, y si fallas te hundes.');
deja('Cuidas de todos, y tu madre es la primera.');
deja('Sostienes el peso, y aunque el cuerpo te pida parar sigues.');
// Sin coma no hay nada que quitar.
deja('Te callas y sigues.');

console.log('\nQUE NO ROMPA NADA MAS\n');
{
  const t = 'Primero esto, luego lo otro. Y al final, nada. No pides, y lo haces sola.';
  const s = quitarComaAntesDeY(t);
  comprobar('solo cambian comas, ni una palabra', t.replace(/,/g, '') === s.replace(/,/g, ''), s);
  comprobar('no toca la coma que no va antes de "y"', s.includes('Primero esto, luego lo otro'), s);
  comprobar('no toca una "Y" que abre frase', s.includes('Y al final, nada.'), s);
}
comprobar('texto vacio no revienta', quitarComaAntesDeY('') === '');
comprobar('nulo no revienta', quitarComaAntesDeY(null) === '');
{
  const conNegrita = 'Lo sostienes, y **lo haces sin que nadie lo vea**.';
  comprobar('no se come los asteriscos de una negrita',
    quitarComaAntesDeY(conNegrita) === 'Lo sostienes y **lo haces sin que nadie lo vea**.',
    quitarComaAntesDeY(conNegrita));
}

console.log('\nLA CUENTA DEL NOMBRE\n');
comprobar('lo encuentra dentro de una frase', vecesQueSaleElNombre('Y ahi esta, Raquel, lo que no ves.', 'Raquel') === 1);
comprobar('no le importan las mayusculas', vecesQueSaleElNombre('y ahi esta, raquel, lo que no ves', 'Raquel') === 1);
comprobar('no le importan las tildes', vecesQueSaleElNombre('Ya lo sabes, Maria.', 'María') === 1);
comprobar('no cuenta dentro de otra palabra', vecesQueSaleElNombre('Manana por la manana.', 'Ana') === 0);
comprobar('cuenta las veces que sale', vecesQueSaleElNombre('Ana, mira. Y otra vez Ana.', 'Ana') === 2);
comprobar('si no sale, cero', vecesQueSaleElNombre('Aqui no hay ningun nombre.', 'Raquel') === 0);
comprobar('nombre vacio no revienta', vecesQueSaleElNombre('lo que sea', '') === 0);

console.log(fallos === 0 ? '\nTODO BIEN\n' : `\n${fallos} FALLO(S)\n`);
process.exit(fallos === 0 ? 0 : 1);
