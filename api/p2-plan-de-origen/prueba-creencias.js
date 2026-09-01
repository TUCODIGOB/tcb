// ════════════════════════════════════════════════════════════════
// /api/p2-plan-de-origen/prueba-creencias.js
//
// TODO EL P2 VIVE EN ESTA CARPETA. Lo que se vaya montando de "Tu Plan de
// Origen" nace aqui dentro, y asi el dia que haya que tocarlo -o quitarlo- no
// se anda hurgando en ficheros del P1. La unica excepcion es la pagina
// tu-plan-de-origen.html, que se queda en la raiz porque su direccion va
// impresa dentro de los PDF del P1 que ya se han vendido.
//
// PRUEBA. No es parte de la tienda y se borra cuando cerremos el punto de
// creencias del P2. No lo llama ninguna pagina.
//
// COMO FUNCIONA
//
// Se abre en el navegador y sale un formulario con las tres preguntas. Se
// pegan ahi las respuestas, se envia, y escribe las creencias con ellas.
//
// LAS RESPUESTAS NO ESTAN EN ESTE FICHERO NI LO VAN A ESTAR. Se pegan cada
// vez. Una respuesta escrita aqui dentro se le acabaria colando a otro
// cliente, y entonces el informe deja de ser suyo.
//
// SOLO LOS RASGOS. Las siete areas del P1 no se le mandan: son treinta mil
// caracteres que no aportan ninguna creencia que no este ya en los rasgos.
//
// PRIMERO SE ELIGEN, DESPUES SE ESCRIBEN. Nunca las dos cosas a la vez.
//
// Pedirle las dos en la misma llamada es pedirle lo contrario dos veces: para
// no repetirse tiene que juntar y descartar, y para que salgan varias tiene
// que no hacerlo. Ganaba siempre la de descartar. Con dos clientes distintos
// y cuarenta rasgos delante escribio tres creencias, y una vez dos.
//
// Ahora va en cuatro pasos, y ninguno hace el trabajo del otro:
//
//   1. LISTA todas las que encuentre, dos lineas cada una. No junta ni elige.
//   2. Si se ha quedado por debajo del suelo, se le piden las que faltan.
//   3. JUNTA las que dicen lo mismo, leyendolas enteras y no por el titulo.
//   4. Se corta por el techo y SE ESCRIBEN las que quedan, esas y todas esas.
//
// El numero no se le pide: sale de aqui. Entre cinco y seis, siempre.
//
// Y DESPUES, DOS ARREGLOS DE REDACCION, que en el encargo no se cumplen porque
// escribiendo la sexta no tiene delante lo que dijo en la segunda: los titulos
// que se pasan de diez palabras, y los trozos que empiezan igual que otro. Son
// llamadas de segundos y solo saltan si de verdad hace falta.
// ════════════════════════════════════════════════════════════════

import crypto from 'crypto';

// LOS LADILLOS QUE LLEVA CADA CREENCIA.
//
// Van iguales en todas y en este orden. Son lo que deja respirar la lectura:
// el ojo descansa en ellos y de un vistazo sabe por donde va.
//
// El titulo es la creencia dicha corta. Debajo, el primer ladillo la explica:
// son dos cosas distintas y por eso van separadas. Un titulo que ademas
// tuviera que explicarse se convierte en el parrafo largo que no golpea.
//
// Estan escritos aqui una sola vez. El encargo los pide con estas palabras, y
// al pintar la pagina se cogen de aqui y no de lo que devuelva el modelo, asi
// que salen siempre bien escritos y con sus tildes aunque el se las coma.
// CUANTAS CREENCIAS LLEVA EL INFORME: entre cinco y seis, nunca menos.
//
// Las dos las manda el codigo, no el encargo. Pedido, el numero no se cumple:
// se pidieron cinco y escribio tres. Y el suelo hace falta tanto como el
// techo, porque los repasos solo saben quitar: uno se llevo la tercera
// creencia de un cliente y le quedaron dos.
//
// El suelo se aplica al juntar. Ninguna comprobacion puede bajar de ahi.
const SUELO = 5;
const TECHO = 6;

const LADILLOS = [
  'La creencia',
  'Dónde se te nota y lo que te está costando',
  'Qué parte es verdad y qué parte no',
  'La creencia nueva',
];

// Las tres preguntas que se le hacen al cliente al comprar el P2.
const PREGUNTAS = [
  '¿Como seria tu mejor version, y como seria su vida? ¿Como seria su dia a dia?',
  '¿Como es tu vida hoy? ¿Como es una semana normal tuya?',
  '¿Que llevas años intentando cambiar y no cambia?',
];

// ── REPARTIR EL TEXTO QUE DEVUELVE EL MODELO ────────────────
//
// Cada creencia arranca en su linea CREENCIA: y dentro lleva sus ladillos,
// que son siempre los mismos. Aqui no se adivina nada.
//
// Los ladillos se reconocen por sus palabras con peso, no letra por letra: el
// modelo escribe alguna vez "lo que LE esta costando" donde el encargo pone
// "TE", y con la comparacion exacta ese renglon se quedaba en parrafo suelto,
// asi que la creencia perdia su ladillo y el texto su descanso.

const pelado = t => String(t).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const HUECAS = /\b(el|la|lo|los|las|un|una|unos|unas|y|o|que|de|del|a|al|en|se|te|le|me|tu|su|mi|es|esta|estas|esto)\b/g;
const conPeso = t => pelado(t).replace(HUECAS, ' ').replace(/\s+/g, ' ').trim();

// Solo se mira si el renglon tiene pinta de ladillo: corto y sin puntuacion al
// final. Sin esto, una frase suelta que acabara con las mismas palabras con
// peso se convertiria en ladillo y partiria la creencia en dos.
const pintaDeLadillo = t => t.length < 70 && !/[.:;,!?]$/.test(t);

const LADILLOS_CON_PESO = LADILLOS.map(conPeso);

export function repartir(texto) {
  const bloques = [];
  const meter = (parte) => {
    if (!bloques.length) bloques.push({ titulo: '', partes: [] });
    bloques[bloques.length - 1].partes.push(parte);
  };

  for (const trozo of String(texto).split(/\n{2,}/)) {
    // Dentro de un trozo, un ladillo puede venir pegado a su parrafo con un
    // solo salto de linea. Se miran las lineas una a una, y las que no son ni
    // cabecera ni ladillo se vuelven a juntar en el parrafo del que venian,
    // para no partir en dos lo que era uno.
    let suelto = [];
    const soltar = () => {
      const p = suelto.join(' ').trim();
      suelto = [];
      if (p) meter({ parrafo: p });
    };
    for (const linea of trozo.split('\n')) {
      const t = linea.trim();
      if (!t) continue;
      // La cabecera se reconoce aunque venga adornada. El encargo prohibe los
      // asteriscos, pero si un dia se le escapa un "**CREENCIA: ...**" y aqui
      // se exige la palabra pegada al principio de la linea, esa creencia se
      // queda sin titulo, y sin titulo se descarta entera. Paso: se descartaron
      // todas y el cliente se quedo sin informe por dos asteriscos.
      const marca = t.match(/^[*_#>\s-]*CREENCIA\s*:\s*(.*)$/i);
      if (marca) {
        soltar();
        // Y sin el punto final: un titulo no lo lleva. Se quita aqui y no se le pide
        // en el encargo, porque contar un punto no falla y pedirlo si.
        bloques.push({ titulo: marca[1].replace(/^[*_#\s]+|[*_#\s.]+$/g, '').trim(), partes: [] });
        continue;
      }
      const cual = pintaDeLadillo(t) ? LADILLOS_CON_PESO.indexOf(conPeso(t)) : -1;
      if (cual >= 0) { soltar(); meter({ ladillo: LADILLOS[cual] }); continue; }
      suelto.push(t);
    }
    soltar();
  }
  return bloques;
}

// ── LAS REGLAS QUE VALEN PARA TODO EL P2 ────────────────────
//
// Esto no es de las creencias: es como se le habla y que no se le puede
// inventar. Vale igual para los otros puntos del informe.
//
// Escrito UNA VEZ y metido en cada encargo. Si el tono hay que corregirlo, se
// corrige aqui y queda corregido en todos, en vez de ir persiguiendo la misma
// frase por ocho sitios y dejarla distinta en cada uno.

const REGLAS_COMUNES = `AQUÍ NO SE ESCRIBEN ESCENAS

Ni una. Nada de contarle un momento suyo como si lo estuvieras viendo: ni una hora, ni un día de la semana, ni un sitio, ni lo que tenia en la mano, ni lo que hizo después.

En cuanto describes un momento te lo estas inventando, y ella lo nota a la primera. Una escena que no le paso tira todo lo demas, aunque lo demas sea cierto.

Lo que si se dice es como funciona: lo que hace siempre que le pasa eso. Eso es suyo y es verdad. El cuando y el donde, no.


NO SE LE INVENTA NADA DE SU VIDA

Ni su infancia, ni sus padres, ni una pareja, ni hijos, ni un trabajo, ni de donde le viene el dinero, ni un episodio que le paso. Si no esta escrito en lo que te paso, no existe.

Si nombras a alguien de su alrededor, esa persona tiene que estar en lo que te paso; y no le pongas sexo, ni parentesco, ni nombre que no le hayan puesto.

Y no lo arregles con un momento de los que le pasan a cualquiera: eso también es ponerle una vida que no sabes si tiene.

Y ninguna puede contradecir lo que sus rasgos dicen: si en ellos pone que se le da bien algo, no vale decirle que le cuesta.


COMO SE HABLA

Le hablas a ella de tu, como alguien que la conoce bien y se lo cuenta claro. Ni como un informe, ni como un libro, ni como una experta explicando.

- SE ENTIENDE A LA PRIMERA. Si una frase hay que releerla, esta mal escrita. Lo tiene que entender alguien de dieciocho años sin pararse.
- LAS PALABRAS SON LAS DE TODOS LOS DÍAS. Si una palabra la verias antes en un informe que en una conversacion, fuera.
- NADA DE METAFORAS NI IMAGENES. Se dice la cosa, no una figura de la cosa. Si lo que escribes no se puede ver ocurriendo de verdad, esta mal escrito.
- LE PONES SUS FRASES ENTRECOMILLADAS: lo que se dice ella por dentro cuando le pasa eso.
- LE DAS LA RAZÓN ANTES DE CORREGIRLA. Nunca de frente.
- FRASES SUELTAS PARA REMATAR. Una línea corta, en su propio párrafo, cuando algo tiene que aterrizar.
- NI UNA PALABRA TÉCNICA: ningun planeta, ningun signo, ninguna casa, ningun aspecto. Su carta no se nombra, y no se dice tu informe ni tu estudio.
- NADA DE ANIMAR NI DE CONSEJOS DE LOS QUE SE LEEN EN CUALQUIER SITIO. Si lo que vas a escribir le vale igual a otra persona, no lo escribas.
- Español de España, hablado. Ni una palabra en otro idioma.
- Sin asteriscos, sin listas, sin simbolos, sin guiones de adorno y sin numerar nada. Fuera de la línea de la creencia y de los cuatro ladillos, todo va en texto corrido.

SE ESCRIBE EN ESPAÑOL CORRECTO, CON TODAS SUS TILDES Y TODAS SUS EÑES

Esto no es un detalle. Lo lee una clienta que ha pagado, y un texto al que le faltan las tildes parece roto y barato, por bueno que sea lo que dice.

Español, año, día, más, está, aquí, así, también, después, sensación, cariño, vínculo: todas llevan lo que llevan. Ni una palabra sin su acento, y ni una eñe escrita como una ene.


CUANTO OCUPA: lo que necesite para entenderse, ni una línea más. Pero corto no es apretado: lo que sobra es repetir con otras palabras algo ya dicho; lo que no sobra es explicarse.`;

// ── EL ENCARGO, EN TRES TROZOS ──────────────────────────────
//
// Antes era uno solo, y le pedia elegir y escribir a la vez. Son ordenes
// contrarias: para elegir tiene que juntar y descartar, para que salgan varias
// tiene que no hacerlo. Siempre ganaba la de descartar y se quedaba en tres.
//
// Aqui no se cruzan en ningun momento:
//
//   LISTA    saca todas las que encuentre, y no puede juntar ni descartar.
//   JUNTAR   junta las que dicen lo mismo, y no puede escribir.
//   REDACTAR escribe las que le den, y no puede elegir.
//
// Lo que se le enseña a cada uno es distinto tambien, y a proposito: el que
// junta ve las creencias enteras y no un titular, que es como se ve de verdad
// si dos dicen lo mismo.
//
// SOLO REGLAS. Ni una linea de ejemplo, ni un trozo de informe de muestra: lo
// que se le enseñe escrito, lo copia, y entonces el informe deja de ser de
// quien lo ha comprado.

const LISTA = `Preparas la segunda parte de un estudio personal. Ella ya leyo la primera, que le contaba como es y por que. Esta es para que cambie.

Aqui no se escribe el estudio todavia. Aqui SE SACA LA LISTA de sus creencias, para elegir despues cuales entran.

Una creencia es algo que da por cierto sin haberlo puesto nunca en duda, y que decide lo que hace. Ella no lo vive como una creencia suya: lo vive como que las cosas son asi.


DE DONDE SALEN

De sus rasgos y de lo que ella ha contestado hoy. De ahi y de nada mas.

No inventas ninguna. No pones ninguna que no puedas señalar en lo que te paso.


LAS SACAS TODAS

Aqui no juntas, no eliges y no descartas. Eso viene despues y lo hace otro. Tu trabajo es justo el contrario: que no se quede ninguna suya fuera.

Coges sus dos listados de rasgos y los repasas UNO POR UNO, los que se le dan bien y los que le cuestan, de arriba abajo y sin saltarte ninguno. De cada uno te preguntas: ¿qué da por cierto sobre sí misma alguien a quien le pasa esto?

No pares hasta el final de los dos listados. Aqui no hay un numero al que llegar ni uno que no pasar: son las que encuentres, y de eso todavia no se ha limpiado nada.

DOS QUE TE PAREZCAN PARECIDAS LAS PONES LAS DOS, cada una por su lado. Juntarlas no es cosa tuya, y la que juntes aqui ya no la recupera nadie.

Lo unico que no entra es la mania que no le quita nada, por bien que suene y por mucho que este escrita en sus rasgos. Tiene que estarle costando algo de verdad: tiempo, salud, dinero, gente, calma. Con que le cueste algo gordo en una sola parcela de su vida basta, no hace falta que le salga en varias.


EN QUE ORDEN VAN

Primero las que le estan bloqueando algo de lo que ella ha contestado hoy: son las que va a reconocer antes, porque hablan de lo que acaba de escribir.

Detras van las demas, de la que mas le cuesta a la que menos.


BAJA HASTA DONDE DUELE

Esto decide si el trabajo vale algo.

Una creencia tiene dos versiones. La presentable es una regla sobre como funciona el mundo, y suena razonable. Esa no sirve: se lee, se asiente y no pasa nada, porque no acusa a nadie.

Debajo hay otra, que es un veredicto sobre ELLA: lo que cree que es, o que le falta, o que le sobra. Esa no la ha dicho en voz alta nunca.

Esa es la que se elige.

Para llegar: coge la versión presentable y preguntate que tiene que ser cierto sobre ella para que se comporte así. Y vuelve a preguntartelo. Paras cuando llegas a un veredicto sobre lo que ella es o lo que le falta.

COMO SE SABE QUE HAS LLEGADO: esta en primera persona, dice algo sobre ella y no sobre el mundo, y da un poco de vergüenza leerla. Si se puede asentir tranquilamente, no has bajado.


QUE ENTREGAS

Una detras de otra, cada una en dos lineas y nada mas:

En la primera, la palabra CREENCIA, dos puntos, y lo que da por cierto sobre si misma, en primera persona y en una sola frase.

En la segunda, la palabra CUESTA, dos puntos, y lo que le esta costando por creerlo, concreto: las horas, la salud, el dinero, la gente, la conversacion que no tuvo, lo que no pidio.

Sin numerar, sin titulos, sin explicaciones, sin comentarios y sin despedida. Y en español correcto, con sus tildes y sus eñes.`;


const JUNTAR = `Te paso las creencias de una misma persona, numeradas. De cada una tienes dos cosas: lo que ella da por cierto sobre si misma, y lo que le esta costando.

Tu unico trabajo es decir CUALES DE ELLAS SON LA MISMA.

DOS SON LA MISMA cuando debajo dan por cierto lo mismo sobre ella, aunque cambien las palabras. Y esto lo miras en las dos lineas, no en la primera sola: la primera es la creencia dicha corta y dos maneras de decirla se parecen poco.

Y EL CASO QUE MÁS SE ESCAPA ES ESTE: la misma creencia repetida en dos parcelas de su vida. Una con el trabajo y otra con la gente. Una con el dinero y otra con la pareja. Suenan a dos porque hablan de dos sitios, pero debajo dicen lo mismo sobre ella. Esas son UNA, siempre. El sitio donde le ocurre no las hace distintas.

AL REVES TAMBIÉN, Y AQUÍ NO TE PASES: dos creencias distintas pueden costarle lo mismo, porque en una vida casi todo desemboca en las mismas cuatro cosas. Que le cuesten lo mismo no las hace una. Juntar dos que eran distintas le borra una creencia suya, y esa ya no vuelve.

La pregunta es siempre la misma, y no hay otra: lo que da por cierto SOBRE SI MISMA en una, es lo mismo que da por cierto en la otra?

Ante la duda, se quedan separadas.

QUE ENTREGAS: un grupo por linea. En cada linea, los numeros de las que son la misma, unidos por el signo +, y delante de todos el de la que llega mas abajo, la que mas duele. Las que no repiten con ninguna no las nombras. Si no hay ninguna repetida, escribes NINGUNA. Ni explicacion, ni comentarios.`;


const REDACTAR = `Escribes la segunda parte de un estudio personal. Ella ya leyo la primera, que le contaba como es y por que. Esta es para que cambie.

Sus creencias ya estan elegidas y te las paso abajo, cada una en dos lineas: lo que da por cierto sobre si misma, y lo que le esta costando. Tu trabajo es escribirlas.

ESCRIBES ESAS Y TODAS ESAS. Ni una menos, ni una mas, ni cambiadas por otras, ni juntadas entre ellas. Aqui no se elige ni se descarta: eso ya esta hecho y no es cosa tuya.

Van en el mismo orden en que te las paso.

Te paso tambien sus rasgos y lo que ella ha contestado hoy, que es de donde han salido. Eso es todo lo que sabes de ella: lo que no este ahi, no existe.


COMO VA MONTADA CADA CREENCIA

Todas van montadas igual, y esto no cambia de una a otra.

Primero una línea que empieza por CREENCIA: y detras, en esa misma línea, la creencia. Nada más en esa línea.

Debajo van cuatro ladillos, en este orden y con estas palabras exactas, cada uno solo en su línea y con sus párrafos debajo:

${LADILLOS[0]}
${LADILLOS[1]}
${LADILLOS[2]}
${LADILLOS[3]}

Ni un ladillo más, ni uno menos, ni cambiados de sitio, ni con otras palabras. Ninguno se queda sin nada debajo.


EL TITULO, LA LÍNEA DE ARRIBA

Es lo que ella se dice por dentro cuando le pasa eso, con sus palabras. Primera persona y presente. Es lo que decide si sigue leyendo.

LO QUE CIERRA EL TITULO ES LO QUE ELLA CONCLUYE, NO LO QUE SE LE VE HACER. Aquí se decide si el titulo vale o no vale. Si acaba contando una conducta suya, se queda en una observacion hecha desde fuera, se lee sin que le pase nada por dentro y no acusa a nadie. Tiene que acabar en el veredicto que saca ella, dicho en seco.

CORTO Y PLANO. Ocho palabras esta bien, diez es el techo, y las cuentas. Cuanto más corto, más cae.

Y NO SE EXPLICA NADA DENTRO. En cuanto aparece un "es que", un "porque", un "así que", un "antes que" o un "en vez de", deja de caer y se convierte en un razonamiento. Ni condiciones metidas dentro, ni dos frases pegadas con una coma para que quepa todo. Si no te cabe, llevas dos creencias en una: o las separas, o bajas hasta la que sostiene a las dos.

CON PALABRAS DE TODOS LOS DÍAS. Si al leerlo hay que rellenar con la cabeza a que se refiere, esta mal escrito. Las palabras que no se pueden ver -confiar, valer, merecer, servir- no dicen nada solas y no entra ninguna.

Al leerlo tiene que apartar un poco la vista. Si se lee entero sin que se le mueva nada, esta suavizado y hay que bajarlo.

Aquí no se explica: explicarlo es el trabajo del primer ladillo. Sin número, sin raya y sin comillas.


DEBAJO DEL PRIMER LADILLO

Aquí se le cuenta que es eso que acaba de leer arriba. Que da por cierto sobre ella misma, dicho entero y con sus palabras, hasta que lo reconozca.

Ella no lo vive como una creencia suya: lo vive como que las cosas son así. Eso es justo lo que hay que enseñarle aquí, que es una idea que lleva dentro y no una descripción del mundo.

Todavia no cuentas donde se le ve ni lo que le cuesta: eso viene en el ladillo siguiente y aquí sobra.


DEBAJO DEL SEGUNDO

Lo que esta creencia le hace hacer, lo que le hace no hacer, y lo que eso le quita.

Señalale en cuantas partes de su vida la encuentres, siempre que esten en sus rasgos o en lo que ella ha contado. Si le sale en varias, mejor: así ve que lo que creia un problema de una zona suya le esta gobernando media vida. Y si de verdad solo le sale en una, se cuenta esa y ya, bien contada. No se le añade ni un sitio más para que parezcan más: eso seria inventarle vida.

Pero no las vacies todas de golpe. Coges lo que más le pese y lo cuentas; lo demas se queda fuera. Una lista larga de sitios, uno detras de otro, deja de leerse a la tercera.

Los precios, concretos: las horas, la salud, el dinero, la conversacion que no tuvo, lo que no pidio. Nada de que le limita o le frena: eso no es un precio, es una palabra.


DEBAJO DEL TERCERO

Lleva años en pie porque una parte es cierta. Se le dice cual y se le da la razón ahí de verdad. Y luego se le señala el punto exacto donde deja de ser cierta.

Si se le dice que es mentira entera, no se lo cree y deja de leer.


DEBAJO DEL CUARTO

Aquí el estudio deja de mirar hacia atrás. Todo lo anterior le explica lo que le pasa; esto es lo único que se lleva, así que no se despacha en una línea suelta.

NO EMPIEZA CON UNA FRASE-LEMA. Nada de resumir la creencia nueva en una línea suelta antes de empezar: la suya puesta del reves, o un lema de los que valen para cualquiera, se lee, no dice nada y se salta. Aquí se entra directamente por lo que se le abre.

Y lo que va aquí es lo que cambia en su vida. Que deja de pasarle. Que puede hacer que hoy no hace. Como es ella cuando esto ya no le manda, y eso no es un futuro bonito inventado: es lo que ella misma ha dicho que quiere, ahí puesto y al alcance, sin la creencia delante tapandolo.

Que lo cierre sabiendo por donde tira, no solo entendiendo por que esta atascada.

Pero sin irse de largo y sin convertirlo en un plan: ni ejercicios, ni pasos, ni pruebas para esta semana, ni consejos. El como se hace va en otra parte.


NINGUNA SE PARECE A OTRA AL LEERLA

El montaje es el mismo en todas, y justo por eso lo que va escrito dentro tiene que ser distinto de verdad. Si además suenan igual, a la tercera sabe lo que viene y deja de leer.

- LO QUE CUENTAS EN UNA NO LO VUELVES A CONTAR EN OTRA. Ni la misma idea con otras palabras, ni el mismo precio, ni el mismo detalle suyo.
- NINGUN PÁRRAFO ARRANCA COMO OTRO QUE VAYA DEBAJO DEL MISMO LADILLO. Los que van debajo del tercer ladillo son los que más se te van a ir por el mismo molde: mirate los suyos juntos antes de entregar y cambialos.
- EL PÁRRAFO NO ARRANCA CON LAS PALABRAS DE SU LADILLO. Acaba de leerlo justo encima; si el párrafo empieza diciendo lo mismo, lee dos veces la misma frase.
- Y DENTRO DE UN BLOQUE, NO EMPIECES TRES FRASES SEGUIDAS IGUAL. En cuanto se ve la misma entrada una y otra vez, aquello se lee como una lista.
- CAMBIAR EL ARRANQUE NO PUEDE CAMBIAR LO QUE DICE LA FRASE. Esto manda sobre todas las reglas de no repetirse: antes que escribir algo que no es cierto para no empezar como otra, la empiezas igual. Si vas a decirle que algo suyo es cierto, se dice que es cierto, con las palabras que sean.
- No empieces dos igual y no cierres dos igual.
- Si una formula ya la has usado en una creencia, en las demas no aparece.
- Unas más largas y otras más cortas. La que más le pesa se lleva más sitio.

Antes de entregar, lee la primera frase de cada creencia seguidas, y luego la última de cada una. Si se parecen, reescribelas.


${REGLAS_COMUNES}


QUE ENTREGAS

Las creencias escritas y nada más. Ni presentación, ni titulo general, ni la lista de las que has elegido, ni explicación de lo que has hecho, ni comentarios.

Empiezas directamente con la línea CREENCIA: de la primera. Acabas con el último párrafo de la última, sin resumen, sin despedida y sin buscar la creencia que hay debajo de todas.

Y todo ello en español correcto, con sus tildes y sus eñes.`;

// ── LA LISTA QUE DEVUELVE, LEIDA ────────────────────────────
//
// Cada creencia viene en dos lineas suyas, CREENCIA: y CUESTA:. La que no
// traiga las dos no se coge: media ficha no se puede ni comparar ni escribir.
//
// Se admiten adornadas. El encargo prohibe los asteriscos, pero ya paso una
// vez que se le escaparon y, exigiendo la palabra pegada al principio de la
// linea, se perdio la lista entera.

const sinAdornos = t => t.replace(/^[*_#\s]+|[*_#\s]+$/g, '').trim();

export function repartirFichas(texto) {
  const fichas = [];
  for (const linea of String(texto).split('\n')) {
    const t = linea.trim();
    if (!t) continue;
    const cre = t.match(/^[*_#>\s-]*CREENCIA\s*:\s*(.*)$/i);
    if (cre) { fichas.push({ creencia: sinAdornos(cre[1]), cuesta: '' }); continue; }
    const cue = t.match(/^[*_#>\s-]*CUESTA\s*:\s*(.*)$/i);
    if (cue && fichas.length) fichas[fichas.length - 1].cuesta = sinAdornos(cue[1]);
  }
  return fichas.filter(f => f.creencia && f.cuesta);
}

// Asi se le enseñan a los dos pasos siguientes: numeradas y con sus dos
// lineas. Nunca un titular suelto, que es por lo que se decidia antes.
export const enLista = fichas => fichas
  .map((f, i) => `${i + 1}. ${f.creencia}\n   Le cuesta: ${f.cuesta}`).join('\n\n');


// ── SI SE HA QUEDADO CORTO, SE LE PIDEN LAS QUE FALTAN ──────
//
// Solo salta por debajo del suelo. Al listar no se le pide ningun numero -eso
// seria rellenar antes de haber limpiado-, asi que la red esta aqui: si de lo
// que ha encontrado no salen ni las del suelo, se le enseña lo que ya tiene
// para que no lo repita y saca lo que falta.

async function lasQueFaltan(fichas, material) {
  let tengo = fichas;
  let buscadas = 0;
  const gasto = { input_tokens: 0, output_tokens: 0 };

  // Dos intentos como mucho. Uno solo no basta: si vuelve corto otra vez, la
  // clienta se queda por debajo del suelo y no hay quien lo levante despues.
  // Y mas de dos no se hacen: si con cuarenta rasgos delante no las encuentra
  // en dos vueltas, seguir pidiendo solo gasta su tiempo.
  for (let vuelta = 0; vuelta < 2 && tengo.length < SUELO; vuelta++) {
    const { texto, uso } = await pedir({
      sistema: LISTA,
      mensaje: `${material}\n\n────────────────\n\nESTAS YA LAS TIENE, NO LAS REPITAS:\n\n${enLista(tengo)}\n\nSaca las que faltan: en sus rasgos hay mas.`,
      tope: 3000,
    });
    gasto.input_tokens += uso.input_tokens || 0;
    gasto.output_tokens += uso.output_tokens || 0;

    const tenia = new Set(tengo.map(f => f.creencia));
    const nuevas = repartirFichas(texto).filter(f => !tenia.has(f.creencia));
    if (!nuevas.length) break;          // no saca mas: insistir no lo cambia
    tengo = [...tengo, ...nuevas];
    buscadas += nuevas.length;
  }

  return { fichas: tengo, buscadas, uso: gasto };
}


// ── SI HA ESCRITO MENOS DE LAS QUE SE LE DIERON ─────────────
//
// El encargo le dice que escriba esas y todas esas, pero eso es una orden y
// las ordenes se saltan: es justo lo que ha pasado todo el rato. Y una que no
// escriba se la lleva por delante al suelo.
//
// Escribe en el orden en que se le dan, asi que las que faltan son las de
// abajo. Se le piden esas y se pegan detras.
//
// Solo salta por debajo del suelo. Escribiendolas todas, no existe.

async function lasQueFaltanPorEscribir(bloques, elegidas, material) {
  if (bloques.length >= SUELO || bloques.length >= elegidas.length) {
    return { bloques, rehechas: 0, uso: {} };
  }

  const faltan = elegidas.slice(bloques.length);
  const { texto, uso } = await pedir({
    sistema: REDACTAR,
    mensaje: `${material}\n\n────────────────\n\nSUS CREENCIAS, LAS QUE ESCRIBES:\n\n${enLista(faltan)}\n\nEscribelas.`,
    tope: 8000,
  });

  const nuevas = quitarLasCortadas(repartir(texto));
  if (!nuevas.length) return { bloques, rehechas: 0, uso };
  return { bloques: [...bloques, ...nuevas], rehechas: nuevas.length, uso };
}


// ── DOS CREENCIAS QUE DICEN LO MISMO ────────────────────────
//
// Juntarlas no se le puede pedir mientras escribe, porque para no repetirse
// tiene que reducir, y reduciendo se quedaba en tres. Aqui no escribe: mira
// las creencias enteras, en fila, y dice cuales son la misma.
//
// De cada grupo se queda la primera, que es la que el pone delante por ser la
// que llega mas abajo. Las demas se van.
//
// Y EL SUELO MANDA SOBRE ESTO. Antes que dejarla con menos de las que lleva el
// informe, se deja una parecida dentro: leer dos que se rozan es mucho menos
// malo que abrir el estudio y encontrarse dos creencias contadas.

async function juntarLasIguales(fichas) {
  if (fichas.length <= SUELO) return { fichas, juntadas: 0, uso: {} };

  const { texto, uso } = await pedir({ sistema: JUNTAR, mensaje: enLista(fichas), tope: 400 });

  const fuera = new Set();
  for (const linea of String(texto).split('\n')) {
    if (!linea.includes('+')) continue;
    const grupo = (linea.match(/\d{1,3}/g) || [])
      .map(n => Number(n) - 1)
      .filter(i => i >= 0 && i < fichas.length);
    if (grupo.length < 2) continue;
    for (const i of grupo.slice(1)) {
      if (fichas.length - fuera.size <= SUELO) break;
      fuera.add(i);
    }
  }

  if (!fuera.size) return { fichas, juntadas: 0, uso };
  return { fichas: fichas.filter((_, i) => !fuera.has(i)), juntadas: fuera.size, uso };
}


// ── LOS TITULOS QUE SE PASAN DE LARGOS ──────────────────────
//
// El encargo pide diez palabras como mucho y se lo salta, igual que se saltaba
// lo de las tildes. Salieron de doce y de catorce, y un titulo largo no
// golpea: se lee como una explicacion y se pasa por encima.
//
// Contar palabras no falla nunca, asi que se cuentan. Y solo se le devuelven
// los que se pasan, sueltos, para que los acorte. Los que ya caben ni se
// tocan, y si no hay ninguno largo esto no cuesta nada.

const TOPE_TITULO = 10;

const TITULOS = `Te paso unos titulos de un estudio personal, numerados. Cada uno es lo que una persona da por cierto sobre si misma, dicho en primera persona.

Todos se han pasado de largo. Tu unico trabajo es acortarlos.

CADA UNO EN DIEZ PALABRAS COMO MUCHO, y cuentalas. Ocho esta mejor.

LO QUE DICE NO SE TOCA. Es la misma idea, dicha en menos. Si al acortarlo dice otra cosa, no vale.

SI NO CABE, ES QUE LLEVA DOS IDEAS DENTRO: te quedas con la que mas pesa y sueltas la otra. No las pegues con una coma ni con un "y" para que quepan las dos.

Ni "es que", ni "porque", ni "asi que": eso alarga y convierte el titulo en un razonamiento.

Español de España, con sus tildes y sus eñes.

QUE ENTREGAS: los mismos titulos, con su mismo numero, uno por linea y nada mas. Ni explicacion, ni comentarios.`;

async function acortarTitulos(bloques) {
  const largos = bloques.filter(b => b.titulo.split(/\s+/).filter(Boolean).length > TOPE_TITULO);
  if (!largos.length) return { acortados: 0, uso: {} };

  const { texto, uso } = await pedir({
    sistema: TITULOS,
    mensaje: largos.map((b, i) => `${i + 1}. ${b.titulo}`).join('\n'),
    tope: 500,
  });

  // Lo que no vuelva, o vuelva sin acortar, se queda como estaba: un titulo
  // largo se lee peor, pero uno cambiado a peor se lee muchisimo peor.
  const nuevos = new Map();
  for (const linea of String(texto).split('\n')) {
    const m = linea.trim().match(/^(\d{1,2})\s*[.)-]\s*(.+)$/);
    if (m) nuevos.set(Number(m[1]), m[2].replace(/^[*_#\s]+|[*_#\s]+$/g, '').trim());
  }

  let acortados = 0;
  largos.forEach((b, i) => {
    const nuevo = nuevos.get(i + 1);
    if (!nuevo) return;
    const cuantas = nuevo.split(/\s+/).filter(Boolean).length;
    if (cuantas > TOPE_TITULO || cuantas < 3) return;
    b.titulo = nuevo;
    acortados++;
  });

  return { acortados, uso };
}

// ── LOS TROZOS QUE ENTRAN IGUAL ─────────────────────────────
//
// El molde de los arranques es lo que mas canta al leer seguido: los bloques
// de "que parte es verdad" salieron los DOCE empezando igual.
//
// NO SE COMPARAN PALABRAS. Comparar las primeras palabras solo pilla el
// repetido literal, y el molde casi nunca es literal: "es verdad que" y "es
// cierto que" no comparten ni una palabra y son la misma entrada. Por
// palabras se escapaba, asi que se juzga, igual que con las creencias.
//
// Se le enseñan SOLO las primeras frases, agrupadas por el punto al que
// pertenecen. Ahi, una debajo de otra, el molde se ve; escribiendo la sexta
// creencia no tiene delante como empezo la segunda, y por eso cae en el.
//
// Solo se comparan las del MISMO punto: que el bloque de la creencia y el de
// lo que le cuesta empiecen parecido no canta, porque van separados.
//
// Vuelven reescritas solo por donde entran, con lo que dicen intacto, y se
// sustituye unicamente la primera frase de cada parrafo.

const ARRANQUES = `Te paso las primeras frases de los trozos de un mismo estudio, numeradas y repartidas en grupos. Los trozos de un mismo grupo van seguidos cuando ella lee.

Tu trabajo es que dentro de cada grupo NINGUNA ENTRE COMO OTRA.

DOS ENTRAN IGUAL cuando arrancan de la misma manera, aunque no compartan ni una palabra. No mires si repiten palabras: mira por donde entran. Empezar las dos dandole la razón, o las dos nombrando un sitio donde le pasa, o las dos anunciando lo que viene, es entrar igual, y a la tercera sabe lo que va a leer y se lo salta.

LAS QUE ENTREN IGUAL QUE OTRA DE SU GRUPO, LAS REESCRIBES. Las demas las devuelves tal cual te las paso, sin tocarles una coma.

LO QUE DICE UNA FRASE NO SE TOCA NUNCA. Los mismos datos, lo mismo contado, sin añadir nada y sin quitar nada. Lo único que cambia es por donde entra.

Y AL CAMBIARLA, CAMBIA LA MANERA DE ENTRAR, no la primera palabra. Una puede entrar por lo que ella hace, otra por lo que se dice por dentro, otra por lo que evita, otra nombrando la cosa en seco, otra por lo que se le va en ello.

Ninguna empieza repitiendo las palabras del titulo de su grupo.

Español de España, hablado, de tu a tu, y con todas sus tildes y sus eñes. Ni una palabra que no dirias en una conversacion.

QUE ENTREGAS: TODAS las frases, con su mismo número, una por línea y en el mismo orden. Sin los grupos y sin nada más: ni titulos, ni explicación, ni comentarios.`;

// La primera frase de un parrafo. Si no hay punto, el parrafo entero.
const primeraFrase = p => (String(p).match(/^[^.!?]*[.!?]/) || [String(p)])[0].trim();

// Los primeros parrafos de cada ladillo, que son los que se comparan entre si.
function primerosParrafos(bloques) {
  const lista = [];
  for (const b of bloques) {
    let bajo = null;
    for (const parte of b.partes) {
      if (parte.ladillo) { bajo = parte.ladillo; continue; }
      if (bajo === null) continue;
      lista.push({ bajo, parte });
      bajo = null;
    }
  }
  return lista;
}

// UNA CREENCIA A MEDIAS NO SE ENTREGA.
//
// Si el modelo llega al techo de escritura, la ultima se queda cortada a mitad
// de frase -paso, y se lo llevo el cliente-. Vale mas que lea cinco enteras
// que cinco y media: lo cortado se nota a la primera y tira todo lo demas.
//
// Entera es que tenga titulo, que lleve sus cuatro ladillos y que ninguno se
// quede vacio. Solo se miran las del final, que son las unicas que se pueden
// haber cortado.
export function quitarLasCortadas(bloques) {
  const entera = b => {
    if (!b.titulo) return false;
    const suyos = b.partes.filter(p => p.ladillo).map(p => p.ladillo);
    if (LADILLOS.some(l => !suyos.includes(l))) return false;
    return b.partes.every((parte, i) => !parte.ladillo || Boolean(b.partes[i + 1]?.parrafo));
  };
  const limpio = [...bloques];
  while (limpio.length && !entera(limpio[limpio.length - 1])) limpio.pop();
  return limpio;
}

async function desmoldarArranques(bloques) {
  const trozos = primerosParrafos(bloques);
  // Con una sola creencia no hay nada con lo que chocar.
  if (bloques.length < 2 || !trozos.length) return { arreglados: 0, uso: {} };

  // Agrupadas por ladillo, que es como las lee ella.
  //
  // Y NUMERADAS SEGUIDAS TAL COMO SE VEN, no en el orden en que estaban en el
  // texto. Al agrupar se reordenan, asi que numerar por su sitio de origen
  // dejaria la lista salteada (1, 5, 2, 6...), y con eso es facil que devuelva
  // una frase con el numero de otra: entonces se cambiaria el parrafo que no
  // era. "orden" guarda a que trozo corresponde cada numero.
  const frases = trozos.map(t => primeraFrase(t.parte.parrafo));
  const porGrupo = new Map();
  trozos.forEach((t, i) => {
    if (!porGrupo.has(t.bajo)) porGrupo.set(t.bajo, []);
    porGrupo.get(t.bajo).push(i);
  });

  const orden = [];
  const mensaje = [...porGrupo].map(([ladillo, indices]) => {
    const lineas = indices.map(i => `${orden.push(i)}. ${frases[i]}`);
    return `BAJO "${ladillo}"\n${lineas.join('\n')}`;
  }).join('\n\n');

  const { texto, uso } = await pedir({ sistema: ARRANQUES, mensaje, tope: 3000 });

  // Se lee lo que vuelve por su numero. Lo que no vuelva se queda como estaba:
  // un arranque repetido se lee peor, pero perder la frase se lee muchisimo
  // peor.
  const nuevas = new Map();
  for (const linea of String(texto).split('\n')) {
    const m = linea.trim().match(/^(\d{1,2})\s*[.)-]\s*(.+)$/);
    if (m) nuevas.set(Number(m[1]), m[2].trim());
  }

  // SE COGE SOLO LA PRIMERA FRASE DE LO QUE DEVUELVE, aunque devuelva mas.
  //
  // Se le pide una frase, pero a veces devuelve el parrafo entero. Pegando eso
  // delante del resto que ya teniamos, la cola sale escrita dos veces y esa
  // repeticion se la lleva la clienta en su informe. Cortando por la primera
  // frase no puede pasar, devuelva lo que devuelva.
  let arreglados = 0;
  orden.forEach((i, sitio) => {
    const vuelve = nuevas.get(sitio + 1);
    if (!vuelve) return;
    const nueva = primeraFrase(vuelve);
    if (!nueva || nueva === frases[i]) return;
    trozos[i].parte.parrafo = nueva + trozos[i].parte.parrafo.slice(frases[i].length);
    arreglados++;
  });

  return { arreglados, uso };
}

// ── R2: leer un informe guardado ─────────────────────────────
function ajustes() {
  const cuenta = process.env.INFORME_P1_CLOUDFLARE_ACCOUNT_ID;
  const clave = process.env.INFORME_P1_CLOUDFLARE_ACCESS_KEY_ID;
  const secreto = process.env.INFORME_P1_CLOUDFLARE_SECRET_ACCESS_KEY;
  const bucket = process.env.INFORME_P1_CLOUDFLARE_BUCKET_NAME;
  if (!cuenta || !clave || !secreto || !bucket) return null;
  return { cuenta, clave, secreto, bucket };
}

function firmaDelDia(secreto, dia, region, servicio) {
  const a = crypto.createHmac('sha256', `AWS4${secreto}`).update(dia).digest();
  const b = crypto.createHmac('sha256', a).update(region).digest();
  const c = crypto.createHmac('sha256', b).update(servicio).digest();
  return crypto.createHmac('sha256', c).update('aws4_request').digest();
}

async function pedirR2(cfg, ruta, consulta = '') {
  const host = `${cfg.cuenta}.r2.cloudflarestorage.com`;
  const ahora = new Date();
  const dia = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const marca = ahora.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const ambito = `${dia}/auto/s3/aws4_request`;
  const vacio = crypto.createHash('sha256').update('').digest('hex');
  const cabeceras = `host:${host}\nx-amz-content-sha256:${vacio}\nx-amz-date:${marca}\n`;
  const firmadas = 'host;x-amz-content-sha256;x-amz-date';
  const uri = `/${cfg.bucket}${ruta}`;
  const peticion = ['GET', uri, consulta, cabeceras, firmadas, vacio].join('\n');
  const aFirmar = ['AWS4-HMAC-SHA256', marca, ambito,
    crypto.createHash('sha256').update(peticion).digest('hex')].join('\n');
  const firma = crypto.createHmac('sha256', firmaDelDia(cfg.secreto, dia, 'auto', 's3'))
    .update(aFirmar).digest('hex');

  const resp = await fetch(`https://${host}${uri}${consulta ? '?' + consulta : ''}`, {
    signal: AbortSignal.timeout(15000),
    headers: {
      'x-amz-content-sha256': vacio,
      'x-amz-date': marca,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${cfg.clave}/${ambito}, SignedHeaders=${firmadas}, Signature=${firma}`,
    },
  });
  if (!resp.ok) throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return resp.text();
}

// Los informes guardados, del mas nuevo al mas viejo, con el nombre de cada
// uno para poder elegir de quien se prueba. Solo se abren los diez ultimos:
// abrir cada fichero es una peticion, y en la prueba no hacen falta mas.
async function informesGuardados(cfg) {
  // La consulta va firmada tal cual, y AWS exige que dentro de un valor la
  // barra vaya escrita como %2F. Sin eso la firma no cuadra y R2 responde 403.
  const xml = await pedirR2(cfg, '/', 'list-type=2&prefix=p1%2F');
  const claves = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map(m => m[1]);
  const fechas = [...xml.matchAll(/<LastModified>([^<]+)<\/LastModified>/g)].map(m => m[1]);
  const todos = claves
    .map((clave, i) => ({ clave, fecha: fechas[i] || '' }))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .slice(0, 10);

  // Si un informe no se puede abrir, se lista igual sin nombre: mejor eso que
  // quedarse sin lista entera por uno malo.
  return Promise.all(todos.map(async item => {
    try {
      const info = JSON.parse(await pedirR2(cfg, `/${item.clave}`));
      return { ...item, nombre: (info.cliente?.nombre || '').split(/\s+/)[0] || '' };
    } catch {
      return { ...item, nombre: '' };
    }
  }));
}

// ── Pedirle algo al modelo ──────────────────────────────────
async function pedir({ sistema, mensaje, tope }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(180000),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      thinking: { type: 'disabled' },
      max_tokens: tope,
      system: sistema,
      messages: [{ role: 'user', content: mensaje }],
    }),
  });
  if (!resp.ok) throw new Error(`Modelo ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  // corte: si vale 'max_tokens' es que se le acabo el sitio a media frase.
  // Sin mirarlo, la ultima creencia se caia despues en silencio.
  return { texto: data.content?.[0]?.text || '', corte: data.stop_reason || '', uso: data.usage || {} };
}

async function escribirCreencias(informe, respuestas) {
  const rasgo = r => `- ${r.nombre}: ${r.descripcion}${r.causa ? ` (por que le pasa: ${r.causa})` : ''}`;
  const f = (informe.rasgos?.fortalezas || []).map(rasgo).join('\n');
  const d = (informe.rasgos?.desafios || []).map(rasgo).join('\n');

  const quien = `Nombre de pila: ${(informe.cliente?.nombre || '').split(/\s+/)[0]}\nSexo: ${informe.cliente?.sexo || ''}`;

  // SOLO LOS RASGOS. Las siete areas del P1 no entran: son treinta mil
  // caracteres que no aportan una creencia que no este ya en los rasgos, y con
  // todo eso delante cada creencia parece justificada por su lado y acaban
  // repitiendose. Fuera, tarda menos, cuesta menos y se repite menos.
  const rasgos =
    `SUS RASGOS, LOS QUE SE LE DIJO QUE SE LE DAN BIEN:\n${f}\n\n` +
    `SUS RASGOS, LOS QUE SE LE DIJO QUE LE CUESTAN:\n${d}`;

  const contestado = `LO QUE ELLA HA CONTESTADO HOY:\n\n` +
    respuestas.map((r, i) => `${PREGUNTAS[i]}\n${r}`).join('\n\n');

  // Lo mismo lo ve el que lista y el que escribe: de ahi salen las creencias y
  // eso es todo lo que se sabe de ella.
  const material = `${quien}\n\n${rasgos}\n\n────────────────\n\n${contestado}`;

  // 1. TODAS LAS QUE HAYA. Dos lineas por creencia, sin juntar y sin descartar.
  //    Barato: ocho creencias asi no llegan a quinientas palabras-token.
  const uno = await pedir({
    sistema: LISTA,
    mensaje: `${material}\n\nSaca la lista de sus creencias.`,
    tope: 3000,
  });
  const listadas = repartirFichas(uno.texto);
  if (!listadas.length) throw new Error('No ha devuelto ninguna creencia');

  // 2. Y si aun asi se ha quedado corto, se le piden las que faltan.
  const dos = await lasQueFaltan(listadas, material);

  // 3. JUNTAR las que dicen lo mismo, leyendolas enteras. Con suelo.
  const tres = await juntarLasIguales(dos.fichas);

  // 4. Y EL TECHO. Vienen ordenadas -primero las de sus respuestas, detras las
  //    que mas le cuestan-, asi que se queda con las primeras.
  const sobraban = Math.max(0, tres.fichas.length - TECHO);
  const elegidas = tres.fichas.slice(0, TECHO);

  // 5. ESCRIBIRLAS. Aqui ya no elige: escribe las que le damos y todas.
  //    Seis creencias de cuatro bloques rondan las 8500 palabras-token. Con
  //    12000 no se queda a medias, y solo se paga lo que escribe de verdad.
  const cuatro = await pedir({
    sistema: REDACTAR,
    mensaje: `${material}\n\n────────────────\n\nSUS CREENCIAS, LAS QUE ESCRIBES:\n\n${enLista(elegidas)}\n\nEscribelas.`,
    tope: 12000,
  });
  if (!cuatro.texto.trim()) throw new Error('No ha escrito ninguna creencia');

  const escritas = repartir(cuatro.texto);
  const enteras = quitarLasCortadas(escritas);

  // SI EL FILTRO SE LAS LLEVA TODAS, NO SE TIRA LO ESCRITO.
  //
  // Paso: las descarto todas, solto un error y el texto se perdio, asi que no
  // hubo manera de saber por que las habia rechazado. Un filtro que se queda a
  // cero no esta diciendo que el texto sea malo, esta diciendo que YO no lo he
  // sabido leer. Se entrega lo que hay y se avisa.
  const bloques = enteras.length ? enteras : escritas;
  const cortadas = enteras.length ? escritas.length - enteras.length : 0;
  const sinFiltrar = enteras.length ? 0 : escritas.length;
  if (!bloques.length) throw new Error('El modelo no ha devuelto nada que se pueda leer');

  // Si ha entregado menos de las que se le dieron, se le piden las que faltan.
  // Va antes de los arreglos porque los arreglos tienen que verlas todas.
  //
  // No se pide cuando el texto salio mal montado: ahi lo que hay no se sabe
  // leer, asi que no se puede saber cuantas faltan ni pedir mas encima.
  const cinco = sinFiltrar ? { bloques, rehechas: 0, uso: {} }
                           : await lasQueFaltanPorEscribir(bloques, elegidas, material);
  const finales = cinco.bloques;

  // Y por ultimo los dos arreglos de redaccion, que van aqui a proposito: solo
  // se gastan en las creencias que de verdad van a salir.
  const seis = await acortarTitulos(finales);
  const siete = await desmoldarArranques(finales);

  const suma = k => [uno.uso, dos.uso, tres.uso, cuatro.uso, cinco.uso, seis.uso, siete.uso]
    .reduce((t, u) => t + (u[k] || 0), 0);
  return {
    bloques: finales,
    rasgos,
    listadas: listadas.length,
    buscadas: dos.buscadas,
    juntadas: tres.juntadas,
    sobraban,
    pedidas: elegidas.length,
    sinSitio: cuatro.corte === 'max_tokens',
    cortadas,
    sinFiltrar,
    rehechas: cinco.rehechas,
    acortados: seis.acortados,
    desmoldados: siete.arreglados,
    uso: { dentro: suma('input_tokens'), fuera: suma('output_tokens') },
  };
}

// ── La pagina ───────────────────────────────────────────
// El encargo prohibe los asteriscos, pero si alguno se cuela se veria tal
// cual en la pagina y parece un fallo. Se quitan al pintar.
const escapar = t => String(t)
  .replace(/\*\*?/g, '')
  .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function pagina(cuerpo) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Prueba — creencias</title>
<style>
 body{margin:0;background:#fffbef;color:#1d2b2f;font:17px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
 main{max-width:44rem;margin:0 auto;padding:3rem 1.5rem 6rem}
 .aviso{font-size:.8rem;color:#8a8578;border-bottom:1px solid #e7e0d0;padding-bottom:1rem;margin-bottom:2.5rem}
 h1{font-size:1.55rem;color:#0e3f4b;margin:0 0 1.6rem;line-height:1.25;font-weight:700}
 h2{font-size:1rem;color:#bd9048;margin:2.2rem 0 .8rem;line-height:1.3;font-weight:700}
 .creencia{padding:2.5rem 0 2rem;border-top:1px solid #e0d8c6}
 .creencia:first-of-type{border-top:0;padding-top:0}
 p{margin:0 0 1.1rem}
 label{display:block;font-size:.95rem;font-weight:600;color:#0e3f4b;margin:2rem 0 .5rem}
 textarea,input,select{width:100%;box-sizing:border-box;font:inherit;font-size:.95rem;padding:.7rem;
   border:1px solid #d8d0bd;border-radius:6px;background:#fff;color:inherit}
 textarea{min-height:8rem;resize:vertical}
 button{margin-top:2rem;background:#0e3f4b;color:#fffbef;border:0;border-radius:6px;
   padding:.9rem 1.6rem;font:inherit;font-weight:700;cursor:pointer}
 details{margin:0 0 2rem;font-size:.85rem;color:#6d675c}
 pre{white-space:pre-wrap;font:inherit;font-size:.85rem;background:#f5efdf;padding:1rem;border-radius:6px}
 .err{background:#fff0ee;border-left:3px solid #c0392b;padding:1rem 1.2rem;white-space:pre-wrap;font-size:.9rem}
</style></head><body><main>${cuerpo}</main></body></html>`;
}

function formulario(datos = {}, aviso = '', informes = []) {
  const campo = (i) => `<label>${escapar(PREGUNTAS[i])}</label>
    <textarea name="r${i + 1}" required>${escapar(datos[`r${i + 1}`] || '')}</textarea>`;

  const opcion = ({ clave, nombre, fecha }) => {
    const dia = (fecha || '').slice(0, 10).split('-').reverse().join('/');
    const quien = nombre || clave.replace(/^p1\//, '').slice(0, 18);
    return `<option value="${escapar(clave)}"${datos.informe === clave ? ' selected' : ''}
      >${escapar(quien)}${dia ? ' — ' + dia : ''}</option>`;
  };

  const elegir = informes.length
    ? `<label>De quien se prueba</label>
       <select name="informe">${informes.map(opcion).join('')}</select>`
    : `<label>Compra del informe P1</label>
       <input name="informe" value="${escapar(datos.informe || '')}" placeholder="p1/cs_live_...">`;

  return pagina(`${aviso}
    <div class="aviso">PRUEBA — lo que pegues aqui no se guarda en ningun sitio.
      Cada envio es una llamada al modelo, y una segunda corta solo si hay arranques repetidos.</div>
    <form method="POST">
      ${elegir}
      ${campo(0)}${campo(1)}${campo(2)}
      <button type="submit">Escribir sus creencias</button>
    </form>`);
}

// El cuerpo de un formulario llega como texto: nombre=valor separados por &,
// con los espacios como + y lo demas en %XX.
function leerFormulario(txt) {
  const datos = {};
  for (const par of String(txt || '').split('&')) {
    if (!par) continue;
    const i = par.indexOf('=');
    const k = decodeURIComponent((i < 0 ? par : par.slice(0, i)).replace(/\+/g, ' '));
    const v = i < 0 ? '' : decodeURIComponent(par.slice(i + 1).replace(/\+/g, ' '));
    datos[k] = v;
  }
  return datos;
}

async function cuerpoDe(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return leerFormulario(req.body);
  let txt = '';
  for await (const trozo of req) txt += trozo;
  return leerFormulario(txt);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const cfg = ajustes();

  // La lista de informes se saca para pintar el desplegable. Si no se puede,
  // el formulario sale igual con una casilla donde escribir la ruta a mano.
  const listar = async () => {
    try { return cfg ? await informesGuardados(cfg) : []; } catch { return []; }
  };

  if (req.method !== 'POST') {
    return res.status(200).send(formulario({}, '', await listar()));
  }

  let datos = {};
  try {
    datos = await cuerpoDe(req);
    const respuestas = [datos.r1, datos.r2, datos.r3].map(t => String(t || '').trim());
    if (respuestas.some(t => !t)) {
      return res.status(200).send(formulario(datos,
        '<div class="err">Faltan respuestas: hacen falta las tres.</div>', await listar()));
    }

    if (!cfg) throw new Error('Faltan las variables INFORME_P1_CLOUDFLARE_*');
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta ANTHROPIC_API_KEY');

    // Solo se admite lo que hay guardado del P1: la ruta llega del propio
    // desplegable, pero se filtra igual para que nadie pueda pedir otra cosa.
    const clave = String(datos.informe || '').trim();
    if (!/^p1\/[A-Za-z0-9_-]+\.json$/.test(clave)) throw new Error('Elige de quien se prueba');
    const informe = JSON.parse(await pedirR2(cfg, `/${clave}`));

    const t0 = Date.now();
    const { bloques, rasgos, listadas, buscadas, juntadas, sobraban, pedidas, sinSitio,
            cortadas, sinFiltrar, rehechas, acortados, desmoldados, uso } =
      await escribirCreencias(informe, respuestas);
    const seg = ((Date.now() - t0) / 1000).toFixed(0);

    const creencias = bloques.map(b => `<section class="creencia">
      ${b.titulo ? `<h1>${escapar(b.titulo)}</h1>` : ''}
      ${b.partes.map(p => p.ladillo
        ? `<h2>${escapar(p.ladillo)}</h2>`
        : `<p>${escapar(p.parrafo)}</p>`).join('\n')}
    </section>`).join('\n');

    return res.status(200).send(pagina(
      `<div class="aviso">PRUEBA — informe ${escapar(clave)} · ${seg}s ·
        ${uso.dentro} dentro / ${uso.fuera} fuera ·
        listo ${listadas}${buscadas ? ` + ${buscadas} que se le habian quedado` : ''},
        junto ${juntadas}, entraron ${pedidas}
        ${sobraban ? `· ${sobraban} por encima del techo de ${TECHO}, fuera` : ''}
        ${rehechas ? `· ${rehechas} que no escribio, pedida(s) aparte` : ''}
        ${desmoldados ? `· ${desmoldados} arranque(s) reescrito(s)` : ''}
        ${acortados ? `· ${acortados} titulo(s) largo(s), acortado(s)` : ''}
        ${sinSitio ? `· AVISO: se quedo sin sitio al escribir` : ''}
        ${cortadas ? `· AVISO: ${cortadas} escrita(s) a medias, fuera` : ''}
        ${sinFiltrar ? `· AVISO: las ${sinFiltrar} salieron mal montadas y se entregan sin filtrar` : ''}</div>
       <details><summary>Chuleta: el material con el que ha escrito</summary>
         <pre>${escapar(rasgos)}</pre>
       </details>
       ${creencias}`));

  } catch (err) {
    return res.status(200).send(formulario(datos,
      `<div class="err">No se pudo: ${escapar(err.message)}</div>`, await listar()));
  }
}
