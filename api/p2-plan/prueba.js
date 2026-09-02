// ════════════════════════════════════════════════════════════════
// api/p2-plan/prueba.js
//
// TU PLAN DE ORIGEN (P2), ENTERO Y EN UN SOLO FICHERO.
//
// Aqui dentro esta todo lo del producto: como se le habla, sus siete partes,
// como se lee el informe del P1 que ya quedo guardado, como se escribe cada
// parte y la pagina para leerlas.
//
// VA JUNTO A PROPOSITO. El P2 todavia no existe como producto: hay que ver
// primero si el texto que saca vale. Si no vale, se borra la carpeta y no se
// jode nada: no hay un solo trozo de esto repartido por los ficheros del P1.
//
// LO UNICO QUE COGE DE FUERA es el informe del P1, y SOLO PARA LEERLO. No
// escribe nada en ningun sitio, no manda correos, no cobra y no toca la compra.
//
// COMO SE USA: se abre /api/p2-plan/prueba en el navegador, sale la lista de
// los ultimos informes guardados, se pincha uno y las siete partes van
// apareciendo segun se escriben.
//
// NO LLEVA CLAVE, a proposito: el producto no esta lanzado y aqui solo entra
// quien lo esta montando. Pero por aqui pasan informes de clientas reales con
// su nombre, y cada pulsacion gasta dinero del modelo, asi que EL DIA QUE ESTO
// SE LANCE, esta pagina se borra o se le pone una puerta. No se queda abierta.
//
// POR QUE LAS SIETE PARTES SE PIDEN DE UNA EN UNA DESDE EL NAVEGADOR. Cada
// peticion escribe una parte y se acaba: asi ninguna se acerca al tiempo maximo
// que aguanta el servidor, se ven llegar una a una, y cada parte sabe como
// empezaron las anteriores para no sonar igual.
// ════════════════════════════════════════════════════════════════

import crypto from 'crypto';

// ════════════════════════════════════════════════════════════════
// PRIMERA PARTE: COMO SE LE HABLA Y CUALES SON SUS SIETE PARTES
// ════════════════════════════════════════════════════════════════

// ── COMO SE LE HABLA ────────────────────────────────────────
//
// Esto no es del P2: es de la marca. Es lo que ya se aprendio escribiendo el
// primer informe, y aqui se aplica igual para que los dos suenen a lo mismo.

const REGLAS_COMUNES = `AQUÍ NO SE ESCRIBEN ESCENAS

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

const EL_P2_NO_ES_EL_P1 = `QUÉ ES ESTO

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

const AREAS = [
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

// ════════════════════════════════════════════════════════════════
// SEGUNDA PARTE: LEER EL INFORME DEL P1 QUE YA ESTA GUARDADO
// ════════════════════════════════════════════════════════════════

function ajustes() {
  const cuenta = process.env.INFORME_P1_CLOUDFLARE_ACCOUNT_ID;
  const clave = process.env.INFORME_P1_CLOUDFLARE_ACCESS_KEY_ID;
  const secreto = process.env.INFORME_P1_CLOUDFLARE_SECRET_ACCESS_KEY;
  const bucket = process.env.INFORME_P1_CLOUDFLARE_BUCKET_NAME;
  if (!cuenta || !clave || !secreto || !bucket) return null;
  return { cuenta, clave, secreto, bucket };
}

function firmaDelDia(secreto, dia, region, servicio) {
  const kFecha = crypto.createHmac('sha256', `AWS4${secreto}`).update(dia).digest();
  const kRegion = crypto.createHmac('sha256', kFecha).update(region).digest();
  const kServicio = crypto.createHmac('sha256', kRegion).update(servicio).digest();
  return crypto.createHmac('sha256', kServicio).update('aws4_request').digest();
}

// El numero de compra forma la ruta del fichero, asi que se filtra: sin esto,
// un "../" escrito a mano en la direccion sacaria ficheros de otro sitio.
const limpio = txt => String(txt || '').replace(/[^A-Za-z0-9_-]/g, '');

// Una peticion GET firmada a R2. El cuerpo va siempre vacio, que es lo unico
// que se hace aqui: pedir.
async function pedir(cfg, ruta, consulta = {}) {
  const host = `${cfg.cuenta}.r2.cloudflarestorage.com`;
  const region = 'auto', servicio = 's3';
  const ahora = new Date();
  const dia = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const marca = ahora.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const ambito = `${dia}/${region}/${servicio}/aws4_request`;

  // El cuerpo vacio tiene un hash fijo, pero se calcula igual para no dejar
  // aqui una constante magica que nadie sepa de donde sale.
  const hash = crypto.createHash('sha256').update('').digest('hex');

  // La firma exige los parametros ordenados alfabeticamente y codificados uno
  // a uno. Cualquier otro orden da una firma que R2 rechaza.
  const query = Object.keys(consulta).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(consulta[k])}`)
    .join('&');

  const cabeceras =
    `host:${host}\n` +
    `x-amz-content-sha256:${hash}\n` +
    `x-amz-date:${marca}\n`;
  const firmadas = 'host;x-amz-content-sha256;x-amz-date';
  const peticion = ['GET', ruta, query, cabeceras, firmadas, hash].join('\n');
  const aFirmar = ['AWS4-HMAC-SHA256', marca, ambito,
    crypto.createHash('sha256').update(peticion).digest('hex')].join('\n');
  const firma = crypto.createHmac('sha256', firmaDelDia(cfg.secreto, dia, region, servicio))
    .update(aFirmar).digest('hex');

  return fetch(`https://${host}${ruta}${query ? `?${query}` : ''}`, {
    method: 'GET',
    signal: AbortSignal.timeout(15000),
    headers: {
      'x-amz-content-sha256': hash,
      'x-amz-date': marca,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${cfg.clave}/${ambito}, SignedHeaders=${firmadas}, Signature=${firma}`,
    },
  });
}

// Los informes guardados, del mas nuevo al mas viejo.
//
// R2 los devuelve en XML y ordenados por nombre, no por fecha, asi que se
// ordenan aqui por la fecha que trae cada uno.
//
// Solo saca el nombre y la fecha: para elegir en una lista no hace falta
// bajarse los informes enteros, que son decenas de KB cada uno.
async function listar(cuantos = 40) {
  const cfg = ajustes();
  if (!cfg) throw new Error('Faltan las variables INFORME_P1_CLOUDFLARE_*');

  const resp = await pedir(cfg, `/${cfg.bucket}`, {
    'list-type': '2',
    'prefix': 'p1/',
    'max-keys': String(Math.min(Math.max(cuantos, 1), 1000)),
  });
  if (!resp.ok) {
    throw new Error(`R2 no deja listar (${resp.status}): ${(await resp.text()).slice(0, 200)}`);
  }

  const xml = await resp.text();
  const informes = [];
  for (const trozo of xml.split('<Contents>').slice(1)) {
    const clave = (trozo.match(/<Key>([^<]+)<\/Key>/) || [])[1];
    const fecha = (trozo.match(/<LastModified>([^<]+)<\/LastModified>/) || [])[1];
    if (!clave || !clave.endsWith('.json')) continue;
    informes.push({ compra: clave.slice('p1/'.length, -'.json'.length), fecha: fecha || '' });
  }
  informes.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  return informes.slice(0, cuantos);
}

// Un informe entero. Devuelve lo mismo que se guardo: cliente, carta, las
// siete areas y los rasgos.
async function leer(compra) {
  const cfg = ajustes();
  if (!cfg) throw new Error('Faltan las variables INFORME_P1_CLOUDFLARE_*');

  const cual = limpio(compra);
  if (!cual) throw new Error('Numero de compra vacio');

  const resp = await pedir(cfg, `/${cfg.bucket}/p1/${cual}.json`);
  if (resp.status === 404) throw new Error(`No hay informe guardado de la compra ${cual}`);
  if (!resp.ok) {
    throw new Error(`R2 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  return resp.json();
}

// ════════════════════════════════════════════════════════════════
// TERCERA PARTE: ESCRIBIR UNA DE LAS SIETE
// ════════════════════════════════════════════════════════════════

// Techo por parte. Es un techo, no un objetivo: solo se paga lo que escribe.
//
// Estuvo en 3.500 y el texto salia telegrafico: consejos de una linea, de los
// que da cualquier herramienta gratis. No era culpa del modelo, era del sitio
// que le dejabamos. Aqui cada cosa que se le pide a la clienta va explicada
// entera, y para eso hace falta espacio.
const TECHO_DE_TEXTO = 8000;

// Una parte escrita a fondo tarda entre 40 y 70 segundos. Pasados dos minutos
// no esta tardando: esta colgada, y esperar mas no la arregla.
const ESPERA_MAXIMA_MS = 120000;

// El molde de la respuesta. Pedido asi, no hay que adivinar donde empieza cada
// cosa: viene cada trozo en su casilla y se pinta directamente.
function esquema(area) {
  return {
    type: 'object',
    properties: {
      apertura: { type: 'string' },
      cajas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            entradas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  titulo: { type: 'string' },
                  texto: { type: 'string' },
                  resistencia: { type: 'string' },
                  senal: { type: 'string' },
                },
                required: ['titulo', 'texto', 'resistencia', 'senal'],
                additionalProperties: false,
              },
            },
          },
          required: ['entradas'],
          additionalProperties: false,
        },
      },
      cierre: { type: 'string' },
    },
    required: ['apertura', 'cajas', 'cierre'],
    additionalProperties: false,
  };
}

// El encargo de una parte.
//
// LO QUE AQUI SE ARREGLO. La primera version pedia "titulo corto y una o dos
// frases" por cada cosa que hacer. Con ese corse solo caben consejos sueltos:
// "pon una hora fija", "deja una tarea a medias". Eso lo da cualquier
// herramienta gratis y no vale lo que cuesta este informe.
//
// Ahora cada cosa que se le pide va entera: que hacer, en que momento suyo,
// QUE SE LE VA A PONER EN CONTRA cuando lo intente y que hace con eso, y en
// que lo nota. Esa tercera parte es la que separa un metodo de un consejo:
// sin ella, la clienta lo intenta una vez, le sale la resistencia de siempre,
// lo deja, y piensa que el fallo es suyo.
//
// Y AQUI NO SE ESCRIBE NI UN EJEMPLO. Ni una frase de muestra, ni un trozo de
// informe de otra persona. Lo que se le enseñe escrito lo copia, y entonces el
// informe deja de ser de quien lo ha comprado. Solo reglas.
function encargo(area) {
  const cajas = area.cajas.map((c, i) => {
    const cuantas = c.min === c.max
      ? `${c.min} ${c.min === 1 ? 'entrada' : 'entradas'}`
      : `entre ${c.min} y ${c.max} entradas`;
    if (c.tipo === 'comprender') {
      return `CAJA ${i + 1} — "${c.titulo}": ${cuantas}. Es la única caja que no pide hacer nada: le das lo que necesita entender para poder mover esto. Dicho hacia delante -lo que cambia cuando lo entiende-, no como un repaso de lo que le pasó.

Cada entrada lleva un título corto y, debajo, la explicación entera: qué es lo que ella da por cierto ahí sin haberlo puesto nunca en duda, por qué se lo cree con lo que ha vivido -eso está en su texto-, y qué parte de eso no se sostiene. Explicado hasta el final, no apuntado. Cuatro o cinco frases, y si hace falta una más para que se entienda, va.

En esta caja, la resistencia y la señal van vacías.`;
    }
    return `CAJA ${i + 1} — "${c.titulo}": ${cuantas}. Cada una es algo que hace, no algo que piense, y cada una va EXPLICADA ENTERA. Esto es lo que ha comprado: si lo lees y te quedas con ganas de preguntar "¿y cómo hago eso exactamente?", está mal escrito.

Cada entrada lleva cuatro cosas, y las cuatro son obligatorias:

TÍTULO: corto, y que diga la acción, no el tema.

TEXTO: de cuatro a seis frases. Empieza por el momento exacto de su vida en el que esto se aplica -uno que salga de su texto, no uno inventado ni uno que le pase a cualquiera-, y sigue con qué hace ahí exactamente: qué dice, qué deja de hacer, cuándo. Tan claro que pueda hacerlo mañana sin preguntarle a nadie. Y dentro, en una frase, por qué a ella en concreto esto le va a mover algo. Si lo que escribes le vale igual a otra persona, bórralo y empieza otra vez.

RESISTENCIA: de dos a cuatro frases. Qué se le va a poner en contra la primera vez que lo intente -lo que va a sentir, lo que se va a decir por dentro para no hacerlo, o lo que va a hacer en su lugar-, y qué hace cuando eso aparezca. Sin esto no sirve de nada: lo intenta una vez, le sale lo de siempre, lo deja, y se queda pensando que el fallo es suyo. Sale de su texto, que ahí está escrito lo que hace cuando algo le remueve.

SEÑAL: una frase. Un hecho que ella pueda ver desde fuera, no cómo se va a sentir. Y no es repetir la acción con otras palabras: es lo que va a pasar alrededor cuando lo haga. No empieza con "sabrás que funciona cuando" ni con "vas a notar que": se dice el hecho y ya.`;
  }).join('\n\n');

  return `${EL_P2_NO_ES_EL_P1}


ESTO SE LEE UNA VEZ Y SE ENTIENDE

Lo lee una persona que ha pagado por ello y que no sabe nada de esto. No tiene a quién preguntarle.

Así que no des nada por sabido y no dejes nada a medio explicar. Cortar una explicación no es escribir conciso, es dejarla coja. Cada cosa que le pides tiene que quedar entendida del todo, y si para eso hace falta una frase más, va esa frase.

Lo que sí sobra es repetir con otras palabras algo ya dicho. Eso fuera, siempre.


LA PARTE QUE ESCRIBES AHORA

Es una de las siete, y solo tienes delante lo suyo. No hables de las otras ni las anuncies.

El título de esta parte ya está puesto y no lo escribes tú: "${area.titulo}". Todo lo que escribas tiene que ir con él.

APERTURA: de cuatro a seis frases, y va hacia delante.

Arranca enganchando: por qué esto va con ella en concreto y no con cualquiera, sacado de algo que su texto ya dice. Tienes que poder señalar de qué frase suya sale; si no puedes, coge otra. Pero es un enganche, no un repaso: aquí no se le vuelve a contar lo que le pasa, que eso ya se lo contaron entero.

El resto es lo nuevo: cómo se mueve ella en esta parte de su vida cuando hace las cosas de otra manera, qué hace distinto, y qué le cambia alrededor cuando lo hace. En presente, como algo que ya puede hacer, no como una promesa de lo que será algún día.

NO EMPIECES LA APERTURA CON SU NOMBRE seguido de "tú". Esa construcción no se usa aquí.

${cajas}

CIERRE: una sola frase, una sola idea, veinte palabras como mucho. No unas dos ideas con "y" ni con un guion. Si te salen dos, quédate con la que más pese y tira la otra.

EL CIERRE NO PUEDE SER DEL TIPO "esto no te quita A, te da B" ni "no te hace A, te hace B". Esa forma está prohibida: dale la vuelta y dilo derecho.

Su nombre, un par de veces en la parte, separadas y donde caiga natural. Nunca en el cierre y nunca en la primera palabra.`;
}

// Lo que se le enseña: su texto de esta area y sus rasgos de esta area.
//
// Los rasgos vienen etiquetados por el P1 y la etiqueta no siempre acierta,
// asi que van como material de apoyo: lo que manda es su texto, que es lo que
// ella leyo de verdad.
function material(area, nombre, textoDelArea, rasgos) {
  const suyos = lista => (lista || []).filter(r => r && r.area === area.del_p1);
  const linea = r => `- ${r.nombre}: ${r.descripcion}${r.causa ? ` POR QUÉ LE PASA: ${r.causa}` : ''}`;
  const f = suyos(rasgos?.fortalezas).map(linea);
  const d = suyos(rasgos?.desafios).map(linea);

  const conRasgos = (f.length || d.length)
    ? `\n\nSUS RASGOS DE ESTA PARTE (apoyo; manda el texto de arriba)\n\nFORTALEZAS\n${f.join('\n') || '(ninguna)'}\n\nDESAFÍOS\n${d.join('\n') || '(ninguno)'}`
    : '';

  return `Se llama ${nombre}.

ESTO ES LO QUE ELLA YA LEYÓ EN SU ESTUDIO SOBRE ESTA PARTE DE SU VIDA:

${textoDelArea}${conRasgos}`;
}

// Lo ya escrito en las partes anteriores, para que esta no salga con la misma
// forma. No se le enseña el contenido -no lo necesita y le daria pie a
// repetirlo-: solo como empezaban y como cerraban.
function noRepitasLaForma(hechas) {
  if (!hechas || hechas.length === 0) return '';
  const frases = hechas
    .map(p => `- "${String(p.apertura || '').split(/(?<=\.)\s/)[0]}" ... "${p.cierre || ''}"`)
    .join('\n');
  return `\n\nASÍ EMPEZARON Y CERRARON LAS PARTES YA ESCRITAS DE ESTE MISMO DOCUMENTO:

${frases}

Tu apertura y tu cierre tienen que arrancar con otra construcción distinta a todas esas. No es que no puedan decir lo mismo: es que no pueden SONAR igual. Si al escribirla ves que se parece a una de arriba, bórrala y empiézala de otra forma.`;
}

async function escribirParte({ area, nombre, textoDelArea, rasgos, hechas }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      thinking: { type: 'disabled' },
      max_tokens: TECHO_DE_TEXTO,
      system: `${REGLAS_COMUNES}\n\n\n${encargo(area)}`,
      output_config: { format: { type: 'json_schema', schema: esquema(area) } },
      messages: [{
        role: 'user',
        content: `${material(area, nombre, textoDelArea, rasgos)}${noRepitasLaForma(hechas)}`,
      }],
    }),
  });

  if (!resp.ok) {
    throw new Error(`${area.id}: ${resp.status} — ${(await resp.text()).slice(0, 300)}`);
  }

  const data = await resp.json();
  const texto = (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  let escrito;
  try {
    escrito = JSON.parse(texto);
  } catch {
    throw new Error(`${area.id}: la respuesta no vino en su molde`);
  }

  // Las cajas vuelven a colocarse contra las que pide reglas.js: si el modelo
  // devuelve una de mas, se cae; si devuelve una de menos, queda vacia y se
  // ve al momento en la pagina, en vez de descuadrar la maqueta en silencio.
  const cajas = area.cajas.map((c, i) => ({
    titulo: c.titulo,
    entradas: (escrito.cajas?.[i]?.entradas || []).map(e => ({
      titulo: String(e.titulo || '').trim(),
      texto: String(e.texto || '').trim(),
      resistencia: String(e.resistencia || '').trim(),
      senal: String(e.senal || '').trim(),
    })).filter(e => e.titulo || e.texto),
  }));

  return {
    id: area.id,
    titulo: area.titulo,
    apertura: String(escrito.apertura || '').trim(),
    cajas,
    cierre: String(escrito.cierre || '').trim(),
  };
}

// ════════════════════════════════════════════════════════════════
// CUARTA PARTE: LA PAGINA
// ════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Que no se quede guardada en ningun sitio: aqui salen datos de clientas.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return res.status(200).send(PAGINA);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { accion } = req.body || {};

    if (accion === 'lista') {
      const informes = await listar(40);
      // Se abre cada uno solo para saber de quien es: en la lista tiene que
      // verse el nombre, que un numero de compra no dice nada.
      const conNombre = await Promise.all(informes.map(async inf => {
        try {
          const datos = await leer(inf.compra);
          return { ...inf, nombre: datos?.cliente?.nombre || '(sin nombre)' };
        } catch {
          return { ...inf, nombre: '(no se pudo abrir)' };
        }
      }));
      return res.status(200).json({ informes: conNombre });
    }

    if (accion === 'parte') {
      const { compra, indice, hechas } = req.body || {};
      const area = AREAS[Number(indice)];
      if (!area) return res.status(400).json({ error: 'Esa parte no existe' });

      const informe = await leer(compra);
      const textoDelArea = (informe?.areas || [])[Number(indice)];
      if (!textoDelArea) {
        return res.status(422).json({ error: `Este informe no tiene guardada la parte de ${area.id}` });
      }

      const parte = await escribirParte({
        area,
        nombre: informe?.cliente?.nombre || 'ella',
        textoDelArea,
        rasgos: informe?.rasgos,
        hechas: Array.isArray(hechas) ? hechas : [],
      });
      return res.status(200).json({ parte });
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (err) {
    console.error('[p2-plan/prueba]', err);
    return res.status(500).json({ error: err.message });
  }
}

// La pagina. Los colores y las letras son los de la marca, para leerlo como se
// va a leer. No carga nada de fuera: ni fuentes, ni librerias, ni imagenes.
const PAGINA = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>P2 — prueba</title>
<style>
  :root { --teal:#0e3f4b; --gold:#bd9048; --gold-claro:#cfb180; --crema:#fffbef; --tinta:#0c0c0c; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--crema); color:var(--tinta); font:16px/1.7 Georgia, 'Times New Roman', serif; padding:2rem 1rem 5rem; }
  .caja { max-width:760px; margin-inline:auto; }
  h1 { font-size:1.5rem; color:var(--teal); margin-bottom:.3rem; }
  .sub { color:#6b6b6b; font-size:.85rem; margin-bottom:2rem; font-family:system-ui,sans-serif; }
  select, button { font:inherit; font-family:system-ui,sans-serif; font-size:.95rem; }
  select { width:100%; padding:.7rem; border:1px solid rgba(14,63,75,.3); border-radius:6px; background:#fff; margin-bottom:1rem; }
  button { background:var(--gold); color:#fff; border:0; border-radius:6px; padding:.8rem 1.6rem; cursor:pointer; font-weight:600; letter-spacing:.03em; }
  button:disabled { opacity:.45; cursor:default; }
  .aviso { font-family:system-ui,sans-serif; font-size:.9rem; color:#6b6b6b; margin:1.2rem 0; }
  .error { color:#c0392b; }
  .parte { background:#fff; border:1px solid rgba(189,144,72,.25); border-left:4px solid var(--gold); border-radius:8px; padding:1.6rem 1.8rem; margin-top:1.6rem; }
  .parte h2 { font-size:1.25rem; color:var(--teal); margin-bottom:.9rem; line-height:1.35; }
  .apertura { margin-bottom:1.4rem; }
  .cajita { background:rgba(189,144,72,.07); border-radius:6px; padding:1rem 1.2rem; margin-bottom:1rem; }
  .cajita h3 { font-family:system-ui,sans-serif; font-size:.78rem; text-transform:uppercase; letter-spacing:.08em; color:var(--gold); margin-bottom:.8rem; }
  .entrada { margin-bottom:1.5rem; }
  .entrada:last-child { margin-bottom:0; }
  .entrada b { color:var(--teal); }
  .resistencia, .senal { font-size:.92rem; margin-top:.5rem; padding-left:.9rem; border-left:2px solid rgba(189,144,72,.35); }
  .resistencia span, .senal span { display:block; font-family:system-ui,sans-serif; font-size:.7rem; text-transform:uppercase; letter-spacing:.09em; color:var(--gold); margin-bottom:.15rem; }
  .senal { color:#4a4a4a; }
  .cierre { font-style:italic; color:var(--teal); border-top:1px solid rgba(189,144,72,.25); padding-top:1rem; margin-top:.4rem; }
  /* Al imprimir solo sale el texto. Sin esto, el aviso de la pantalla -"Listo."-
     se colaba arriba del todo en el PDF. */
  @media print {
    h1, .sub, select, button, .aviso { display:none !important; }
    body { padding:0; }
    .parte { border:0; box-shadow:none; padding:0 0 1.5rem; page-break-inside:avoid; }
  }
</style>
</head>
<body>
<div class="caja">
  <h1>Tu Plan de Origen — prueba</h1>
  <p class="sub">Solo para ver cómo sale. No manda nada a nadie.</p>

  <select id="quien"><option>Cargando informes…</option></select>
  <button id="ir" disabled>Escribir su plan</button>

  <p class="aviso" id="aviso"></p>
  <div id="salida"></div>
</div>
<script>
const quien = document.getElementById('quien');
const ir = document.getElementById('ir');
const aviso = document.getElementById('aviso');
const salida = document.getElementById('salida');

const escapar = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

async function llamar(cuerpo) {
  const r = await fetch(location.pathname, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(cuerpo),
  });
  const d = await r.json().catch(() => ({ error:'Respuesta ilegible' }));
  if (!r.ok) throw new Error(d.error || ('Error ' + r.status));
  return d;
}

(async function cargarLista() {
  try {
    const { informes } = await llamar({ accion:'lista' });
    if (!informes.length) {
      quien.innerHTML = '<option>No hay ningún informe guardado todavía</option>';
      aviso.textContent = 'El guardado es reciente: solo están los informes hechos desde que se puso.';
      return;
    }
    quien.innerHTML = informes.map(i =>
      '<option value="' + escapar(i.compra) + '">' + escapar(i.nombre) + ' — ' + escapar((i.fecha||'').slice(0,10)) + '</option>'
    ).join('');
    ir.disabled = false;
  } catch (e) {
    quien.innerHTML = '<option>No se pudo cargar la lista</option>';
    aviso.className = 'aviso error';
    aviso.textContent = e.message;
  }
})();

ir.addEventListener('click', async () => {
  ir.disabled = true; quien.disabled = true;
  salida.innerHTML = '';
  aviso.className = 'aviso';
  const compra = quien.value;
  const hechas = [];

  for (let i = 0; i < 7; i++) {
    aviso.textContent = 'Escribiendo la parte ' + (i+1) + ' de 7…';
    try {
      const { parte } = await llamar({ accion:'parte', compra, indice:i, hechas });
      hechas.push({ apertura: parte.apertura, cierre: parte.cierre });
      salida.insertAdjacentHTML('beforeend', pintar(parte));
    } catch (e) {
      salida.insertAdjacentHTML('beforeend',
        '<div class="parte"><h2>Parte ' + (i+1) + '</h2><p class="error">' + escapar(e.message) + '</p></div>');
    }
  }

  aviso.textContent = 'Listo.';
  ir.disabled = false; quien.disabled = false;
});

function pintar(p) {
  const cajas = (p.cajas||[]).map(c =>
    '<div class="cajita"><h3>' + escapar(c.titulo) + '</h3>' +
    (c.entradas||[]).map(e =>
      '<div class="entrada"><p><b>' + escapar(e.titulo) + '</b> — ' + escapar(e.texto) + '</p>' +
      (e.resistencia ? '<p class="resistencia"><span>Cuando te cueste</span> ' + escapar(e.resistencia) + '</p>' : '') +
      (e.senal ? '<p class="senal"><span>Lo notas en</span> ' + escapar(e.senal) + '</p>' : '') + '</div>'
    ).join('') + '</div>'
  ).join('');
  return '<div class="parte"><h2>' + escapar(p.titulo) + '</h2>' +
    '<p class="apertura">' + escapar(p.apertura) + '</p>' + cajas +
    '<p class="cierre">' + escapar(p.cierre) + '</p></div>';
}
</script>
</body>
</html>`;
