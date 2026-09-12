// ═════════════════════════════════════════════════════════════════
// lib/carta-texto.js
//
// Convierte la carta calculada -numeros- en el texto que lee el modelo.
//
// ANTES ESTO LO MONTABA EL NAVEGADOR DEL CLIENTE. Es lo unico que el modelo
// llega a ver de su carta: si sale mal o sale a medias, el informe entero se
// escribe sobre otra persona. Eso no puede depender del movil de quien
// compra, asi que se monta aqui, al lado del calculo del que sale.
//
// EL TEXTO ES EL MISMO, LETRA POR LETRA, que el que se montaba en el
// navegador. No se ha cambiado ni el orden de las lineas ni una palabra:
// cualquier cambio aqui cambia lo que se le escribe a la clienta.
// ═════════════════════════════════════════════════════════════════

// QUE HAY EN CADA CASA. Esto va SOLO a las listas de rasgos, no al informe de
// las siete areas, que recibe exactamente el mismo texto de siempre.
//
// Sin esto, el modelo no sabe que hay dentro de cada casa ni en cual cae el
// Nodo Norte, y se lo inventa. Son datos que ya se calculan de su fecha, hora
// y lugar; solo faltaba pasarlos.
const CUERPOS_DE_LA_CASA = {
  sol: 'Sol', luna: 'Luna', mercurio: 'Mercurio', venus: 'Venus', marte: 'Marte',
  jupiter: 'Júpiter', saturno: 'Saturno', urano: 'Urano', neptuno: 'Neptuno',
  pluton: 'Plutón', quiron: 'Quirón', nodo: 'Nodo Norte',
};

const SIGNOS = ['Aries','Tauro','Géminis','Cáncer','Leo','Virgo','Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'];

export function montarCasasTexto(carta) {
  if (!carta || !carta.casaDe) return '';
  const dentro = {};
  for (const [clave, nombreCuerpo] of Object.entries(CUERPOS_DE_LA_CASA)) {
    const n = carta.casaDe[clave];
    if (!n) continue;
    (dentro[n] = dentro[n] || []).push(nombreCuerpo);
  }
  const lineas = [];
  for (let n = 1; n <= 12; n++) {
    lineas.push(`- Casa ${n}: ${dentro[n] ? dentro[n].join(', ') : 'vacía'}`);
  }
  return `Que hay en cada casa (esto es lo que hay, y la casa que pone vacía esta vacía de verdad):
${lineas.join('\n')}`;
}

export function montarCartaTexto(carta) {
  // La casa dice en que parcela de la vida se nota cada planeta, y los aspectos
  // como se relacionan entre si. Sin esto el modelo solo tenia el signo, que es
  // lo mismo para una de cada doce personas.
  const casa = (n) => (carta.casaDe && carta.casaDe[n]) ? ` (casa ${carta.casaDe[n]})` : '';
  const retro = (r) => r ? ' (retrógrado)' : '';
  const listaAspectos = (carta.aspectos || [])
    .map(a => `- ${a.a} ${a.tipo} ${a.b} (orbe ${a.orbe}°)`)
    .join('\n');

  // El signo que rige cada una de las doce casas. Sale de carta.casas, que ya
  // se calculaba pero no llegaba al modelo.
  const cuspidesTexto = (Array.isArray(carta.casas) && carta.casas.length === 12)
    ? `\n\nSigno que rige cada casa (son casas de signo completo: por eso el MC no tiene por que caer en la casa 10, y cuando cae en otra es correcto, no un fallo):\n` +
      carta.casas.map((grados, i) => `- Casa ${i + 1}: ${SIGNOS[Math.floor(grados / 30)]}`).join('\n')
    : '';

  return `Carta natal calculada:
- Ascendente: ${carta.ascendente}
- Sol: ${carta.sol}${casa('sol')}
- Luna: ${carta.luna}${casa('luna')}
- Mercurio: ${carta.mercurio}${casa('mercurio')}${retro(carta.mercRetro)}
- Venus: ${carta.venus}${casa('venus')}${retro(carta.venRetro)}
- Marte: ${carta.marte}${casa('marte')}${retro(carta.marRetro)}
- Júpiter: ${carta.jupiter}${casa('jupiter')}${retro(carta.jupRetro)}
- Saturno: ${carta.saturno}${casa('saturno')}${retro(carta.satRetro)}
- Urano: ${carta.urano}${casa('urano')}${retro(carta.uraRetro)}
- Neptuno: ${carta.neptuno}${casa('neptuno')}${retro(carta.nepRetro)}
- Plutón: ${carta.pluton}${casa('pluton')}${retro(carta.plutRetro)}
- Quirón: ${carta.quiron}${casa('quiron')}${retro(carta.quirRetro)}
- Nodo Norte: ${carta.nodoNorte}${casa('nodo')}
- Nodo Sur: ${carta.nodoSur}${casa('nodoSur')}
- Medio Cielo (MC): ${carta.medioCielo}${casa('mc')}
- Inicio del Cielo (IC): ${carta.inicioCielo}${cuspidesTexto}

Aspectos (que partes de la persona chocan entre si y cuales se apoyan):
${listaAspectos || '- sin aspectos dentro de orbe'}`;
}
