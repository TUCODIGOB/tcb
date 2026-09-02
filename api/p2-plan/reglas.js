// ════════════════════════════════════════════════════════════════
// api/p2-plan/reglas.js
//
// COMO SE LE HABLA EN EL P2, y el esqueleto de sus siete partes.
//
// TODO EL P2 VIVE EN ESTA CARPETA. Nada de aqui dentro toca el P1: del P1 solo
// se LEE el informe que ya quedo guardado, y leer no cambia nada. El dia que
// haya que quitar el P2, se borra la carpeta entera y la tienda sigue igual.
//
// Las reglas de tono estan escritas UNA VEZ y se meten en cada encargo. Si
// algun dia hay que corregir como habla, se corrige aqui y queda corregido en
// las siete areas, en vez de ir persiguiendo la misma frase por siete sitios y
// dejarla distinta en cada uno.
// ════════════════════════════════════════════════════════════════

// ── COMO SE LE HABLA ────────────────────────────────────────
//
// Esto no es del P2: es de la marca. Es lo que ya se aprendio escribiendo el
// primer informe, y aqui se aplica igual para que los dos suenen a lo mismo.

export const REGLAS_COMUNES = `AQUÍ NO SE ESCRIBEN ESCENAS

Ni una. Nada de contarle un momento suyo como si lo estuvieras viendo: ni una hora, ni un día de la semana, ni un sitio, ni lo que tenía en la mano, ni lo que hizo después.

En cuanto describes un momento te lo estás inventando, y ella lo nota a la primera. Una escena que no le pasó tira todo lo demás, aunque lo demás sea cierto.

Lo que sí se dice es cómo funciona: lo que hace siempre que le pasa eso. Eso es suyo y es verdad. El cuándo y el dónde, no.


NO SE LE INVENTA NADA DE SU VIDA

Ni su infancia, ni sus padres, ni una pareja, ni hijos, ni un trabajo, ni de dónde le viene el dinero, ni un episodio que le pasó. Si no está escrito en lo que te paso, no existe.

Si nombras a alguien de su alrededor, esa persona tiene que estar en lo que te paso; y no le pongas sexo, ni parentesco, ni nombre que no le hayan puesto.

Y no lo arregles con un momento de los que le pasan a cualquiera: eso también es ponerle una vida que no sabes si tiene.

Y nada de lo que escribas puede contradecir lo que te paso: si ahí pone que se le da bien algo, no vale decirle que le cuesta.


CÓMO SE HABLA

Le hablas a ella de tú, como alguien que la conoce bien y se lo cuenta claro. Ni como un informe, ni como un libro, ni como una experta explicando.

- SE ENTIENDE A LA PRIMERA. Si una frase hay que releerla, está mal escrita. Lo tiene que entender alguien de dieciocho años sin pararse.
- LAS PALABRAS SON LAS DE TODOS LOS DÍAS. Si una palabra la verías antes en un informe que en una conversación, fuera.
- NADA DE METÁFORAS NI IMÁGENES. Se dice la cosa, no una figura de la cosa. Si lo que escribes no se puede ver ocurriendo de verdad, está mal escrito.
- LE PONES SUS FRASES ENTRECOMILLADAS: lo que se dice ella por dentro cuando le pasa eso.
- LE DAS LA RAZÓN ANTES DE CORREGIRLA. Nunca de frente.
- NI UNA PALABRA TÉCNICA: ningún planeta, ningún signo, ninguna casa, ningún aspecto. Su carta no se nombra, y no se dice tu informe ni tu estudio.
- NADA DE ANIMAR NI DE CONSEJOS DE LOS QUE SE LEEN EN CUALQUIER SITIO. Si lo que vas a escribir le vale igual a otra persona, no lo escribas.
- PROHIBIDAS ESTAS PALABRAS Y CUALQUIER VARIANTE SUYA: sanar, empoderarte, gestionar tus emociones, tu mejor yo, trabajar en ti, tu proceso, tu camino, y "mejor versión" en todas sus formas.
- "Nueva versión" sí se puede decir, pero no es una muletilla: como mucho una vez, y solo si cae sola. Si la repites, el documento empieza a sonar a folleto.
- SU NOMBRE APARECE, un par de veces por parte, repartidas y donde caiga natural. Nunca en la frase de cierre. Leerse el nombre propio es lo que hace que esto no parezca escrito para cualquiera.
- Español de España, hablado. Ni una palabra en otro idioma.
- Sin asteriscos, sin listas, sin símbolos, sin guiones de adorno y sin numerar nada: la maqueta la pone el programa, no tú.

SE ESCRIBE EN ESPAÑOL CORRECTO, CON TODAS SUS TILDES Y TODAS SUS EÑES

Esto no es un detalle. Lo lee una clienta que ha pagado, y un texto al que le faltan las tildes parece roto y barato, por bueno que sea lo que dice.

Español, año, día, más, está, aquí, así, también, después, sensación, cariño, vínculo: todas llevan lo que llevan. Ni una palabra sin su acento, y ni una eñe escrita como una ene.`;

// ── LO QUE SEPARA EL P2 DEL P1 ──────────────────────────────
//
// Es la regla que decide si este producto vale algo. El P1 ya le conto quien
// es; si el P2 se lo vuelve a contar en positivo, ella lo lee y piensa que le
// han dado dos veces lo mismo. Y tendria razon.
//
// Por eso se parte en dos: el PORQUE sale de su informe, y el QUE HACER no
// esta ahi y lo pone el P2. Eso es lo unico que este producto anade, y es a lo
// que ha venido.

export const EL_P2_NO_ES_EL_P1 = `QUÉ ES ESTO

Esto no le explica a nadie cómo es. Eso ya lo tiene: se leyó entero un estudio suyo que le contaba quién es y de dónde le viene.

Esto es la parte que le falta. Lo que tiene que hacer para llegar a ser quien quiere ser y tener la vida que quiere.

Así que aquí no se diagnostica nada. No le cuentas otra vez su patrón, ni le explicas su herida, ni le pones nombre a lo que le pasa. Todo eso está dicho ya, y repetírselo con otras palabras es quitarle el sitio a lo único que ha venido a buscar: qué hace a partir de mañana.

De ahí salen las dos reglas que mandan sobre todas las demás:

1. LO QUE ELLA YA ES SOLO APARECE PARA ENGANCHAR LA ACCIÓN. Una frase, la justa para que entienda por qué esto va con ella en concreto y no con cualquiera. Y esa frase tiene que poder rastrearse a algo que su estudio ya dice de ella: si no puedes señalar de dónde sale, no la escribes.

2. TODO LO DEMÁS ES QUÉ HACER. Eso no está en su estudio y lo pones tú. Es lo que este documento añade, y es a lo que ha venido.

Se escribe hacia delante, no hacia atrás: no de lo que le pasó, sino de lo que va a hacer.`;

// ── LAS SIETE PARTES ────────────────────────────────────────
//
// Van estas siete y en este orden, el mismo del P1: cada una recoge lo que el
// P1 le conto en la suya.
//
// LOS TITULOS Y LOS LADILLOS SE ESCRIBEN AQUI, no los escribe el modelo. Es lo
// que hace que salgan siempre bien puestos y con sus tildes aunque el modelo se
// las coma, y lo que deja que dos clientas distintas reciban el mismo
// documento con dentro sus dos vidas distintas.
//
// "del_p1" es la etiqueta con la que el P1 marca los rasgos de cada area.
//
// Cada area lleva una o dos cajas. Las de tipo "acciones" piden cosas que
// hacer; la de tipo "comprender", de la herida, no pide hacer nada: ahi lo que
// hace falta primero es entender, y pedirle una tarea antes de eso seria
// pedirle que arregle algo que todavia no ha visto.

export const AREAS = [
  {
    id: 'identidad',
    del_p1: 'IDENTIDAD',
    titulo: 'Así actúas cuando estás en tu centro',
    cajas: [{ titulo: 'Los cambios concretos para esta semana', tipo: 'acciones', min: 2, max: 3 }],
  },
  {
    id: 'patrones',
    del_p1: 'PATRONES',
    titulo: 'Así rompes el ciclo',
    cajas: [
      { titulo: 'Esto es lo que dejas de hacer', tipo: 'acciones', min: 1, max: 2 },
      { titulo: 'Esto es lo que empiezas a hacer', tipo: 'acciones', min: 1, max: 2 },
    ],
  },
  {
    id: 'miedos',
    del_p1: 'MIEDOS',
    titulo: 'Así gestionas el miedo que te paraliza',
    cajas: [{ titulo: 'El primer paso', tipo: 'acciones', min: 1, max: 2 }],
  },
  {
    id: 'herida',
    del_p1: 'HERIDA',
    titulo: 'Así se cura lo que te bloquea',
    cajas: [
      { titulo: 'Esto es lo que necesitas comprender', tipo: 'comprender', min: 1, max: 2 },
      { titulo: 'El ejercicio de esta semana', tipo: 'acciones', min: 1, max: 1 },
    ],
  },
  {
    id: 'amor',
    del_p1: 'AMOR',
    titulo: 'Así amas cuando no estás repitiendo el patrón',
    cajas: [{ titulo: 'Los patrones a romper y cómo', tipo: 'acciones', min: 2, max: 3 }],
  },
  {
    id: 'relaciones',
    del_p1: 'RELACIONES',
    titulo: 'Así te relacionas cuando no cedes tu sitio',
    cajas: [{ titulo: 'Esto es lo que cambia cuando empiezas a aplicarlo', tipo: 'acciones', min: 2, max: 3 }],
  },
  {
    id: 'dinero',
    del_p1: 'DINERO',
    titulo: 'Así gestionas el dinero',
    cajas: [{ titulo: 'Tus bloqueos y cómo desactivarlos', tipo: 'acciones', min: 2, max: 3 }],
  },
];
