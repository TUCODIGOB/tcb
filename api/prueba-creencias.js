// ═════════════════════════════════════════════════════════════════
// /api/prueba-creencias.js
//
// PRUEBA. Este fichero NO es parte de la tienda y se borra cuando
// terminemos de decidir el punto 2 del P2. No lo llama ninguna pagina.
//
// Lee un informe ya guardado en R2 y escribe con el sus creencias, para
// poder leer lo que sale del modelo de verdad y no lo que escribiria yo.
//
// Se abre en el navegador: /api/prueba-creencias?p1=<numero de la compra>
// Sin numero, coge el ultimo informe guardado.
//
// CADA VEZ QUE SE ABRE CUESTA UNA LLAMADA AL MODELO.
// ═════════════════════════════════════════════════════════════════

import crypto from 'crypto';

const AREAS = ['IDENTIDAD', 'PATRONES', 'MIEDOS', 'HERIDA', 'AMOR', 'RELACIONES', 'DINERO'];

// ── EL ENCARGO, EN DOS PASOS ─────────────────────────────────────
//
// Antes iba de una tirada: leia el informe y escribia las creencias del
// primer viaje. Salian repetidas -dos y dos decian lo mismo debajo-, y
// todas con el mismo ritmo, porque juntarlas se le pedia AL FINAL, cuando
// ya las tenia escritas, y nadie tira siete paginas ya hechas.
//
// Ahora son dos: primero ELIGE, sin escribir ni una linea para ella, y ahi
// juntar no le cuesta nada. Y luego ESCRIBE solo las que han quedado.
//
// Solo reglas. Ni una linea de ejemplo, ni un trozo de informe de muestra:
// lo que se le enseñe escrito, lo copia, y entonces el informe deja de ser
// de quien lo ha comprado.

// ── PASO 1: elegir ───────────────────────────────────────────────
const ELEGIR = `Estas preparando la segunda parte de un estudio personal. Todavia NO escribes nada para la persona: hoy solo decides.

Abajo tienes el estudio que ella ya leyo, el que le contaba como es y por que. De ahi tienes que sacar sus creencias: lo que da por cierto sin haberlo puesto en duda nunca, y que hace que todo lo demas se le repita.


DE DONDE SALEN

Del estudio y de ningun otro sitio.

Ese estudio ya trae escritas sus creencias, unas con todas sus letras y otras metidas dentro de lo que se le cuenta. Las sacas de ahi. No inventas ninguna, no le añades una que "encajaria", y no pones ninguna que no puedas señalar en el texto.


CUALES ENTRAN Y CUALES NO

Esto no es una lista de todo lo que se le pueda llamar creencia. Es lo que la tiene atascada.

Una entra solo si cumple las TRES:

1. LE ESTA COSTANDO ALGO. Algo que se puede nombrar: tiempo, salud, dinero, gente, conversaciones que no ha tenido. Si no le quita nada, no es una creencia que cambiar: es una manera de ser, y las maneras de ser se dejan en paz.

2. NO ES CIERTA. Si lo que cree es verdad y ademas le funciona, fuera. Aqui solo van las que le estan cobrando por algo que no es asi.

3. NO LA HA ELEGIDO. Funciona sola, sin que ella decida nada. Lo que ha decidido a proposito no es una creencia, es una postura.


BAJA HASTA DONDE DUELE

Esto es lo que decide si el trabajo vale algo o no.

Una creencia tiene dos versiones. La presentable es una regla sobre como funciona el mundo, y suena razonable, casi sensata. Esa no sirve: se lee, se asiente y no pasa nada, porque no acusa a nadie.

Y debajo hay otra, que es un veredicto sobre ELLA. Lo que cree que es, o que le falta, o que le sobra. Y esa no la ha dicho en voz alta nunca, ni a su mejor amiga.

Esa es la que se elige.

Para encontrarla: coge la version presentable y preguntate que tiene que ser cierto sobre ella para que se comporte asi. Y luego preguntatelo otra vez. Se para cuando llegas a un veredicto sobre lo que ella es o lo que le falta, algo que la deja sin sitio.

COMO SE SABE QUE HAS LLEGADO: esta en primera persona, dice algo sobre ella y no sobre el mundo, y da un poco de verguenza leerla. Si al leerla se puede asentir tranquilamente, no has bajado.


AHORA JUNTA, Y JUNTA SIN PENA

Esta es la parte que de verdad importa hoy, y por eso se hace aqui: todavia no has escrito nada para ella, asi que tachar una linea no te cuesta nada.

Cuando bajas a ese fondo, muchas se juntan solas: varias reglas distintas resultan ser el mismo veredicto.

Dos son la misma cuando debajo dicen lo mismo, aunque cambien las palabras y aunque una hable de su trabajo y la otra de su pareja. El sitio donde ocurre no las hace distintas.

Y ademas, ninguna puede repetirle a otra:
- el sitio de su vida donde se le nota
- lo que le esta costando

Si dos aterrizan en el mismo sitio o le cuestan lo mismo, es que son una.

REPASO OBLIGATORIO ANTES DE ENTREGAR. Coge tu lista y compara cada una con TODAS las demas, una por una, sin saltarte ningun par. De cada par preguntate: si se lo cuento primero una y luego la otra, ¿va a pensar "esto ya me lo has dicho con otras palabras"? Si la respuesta es que si, las juntas en una sola y te quedas con la version que mas abajo llega.

Vale mas tres que peguen que siete que se pisen. Quedarte con pocas no es quedarte corta: es haber hecho el trabajo.

NO HAY NUMERO. No rellenes. Pero tampoco te dejes fuera una que cumpla las tres y no se parezca a ninguna: esa se la lleva puesta y nadie se la va a nombrar. Manda el filtro, no la cantidad.


NO SE LE INVENTA NADA DE SU VIDA

Ni su infancia, ni sus padres, ni como fue su casa, ni una pareja, ni si tiene hijos, ni un trabajo concreto, ni dinero que venga de algun sitio, ni un episodio que le paso.

OJO: el estudio que te paso puede traer alguna frase de ese tipo, porque no deberia haberla escrito y a veces se le cuela. Si la ves, no la des por buena. Te quedas con como funciona ella, que eso si es suyo, y tiras la parte que le cuenta de donde le viene.

Y NINGUNA PUEDE CONTRADECIR LO QUE EL ESTUDIO YA LE DIJO. Si el estudio dice que se le da bien algo, no vale elegir una que diga que le cuesta.


QUE ENTREGAS

La lista, y NADA MAS. Ni presentacion, ni explicacion, ni comentarios tuyos.

Por cada creencia que sobreviva, exactamente estas cuatro lineas y una raya al final:

VEREDICTO: el veredicto sobre ella, en primera persona, presente y corto.
CUESTA: que le esta quitando. Concreto.
SE NOTA: en que partes de su vida aparece, separadas por comas. Solo las que esten de verdad en el estudio.
SALE DE: la frase del estudio de la que la has sacado.
---`;

// ── PASO 2: escribir ─────────────────────────────────────────────
//
// Aqui ya no decide nada: recibe la lista cerrada del paso 1 y solo la
// escribe. Y no lleva lista numerada de apartados: la de antes la usaba
// como molde y las siete salian con la misma forma, una detras de otra.
const ESCRIBIR = `Eres quien escribe la segunda parte de un estudio personal. La persona ya leyo la primera parte, que le contaba como es y por que. Esta segunda parte es para que cambie.

Te paso dos cosas: sus creencias, YA ELEGIDAS, y el estudio del que salieron.

Las creencias no se tocan. No añades ninguna, no quitas ninguna, no las juntas ni las partes. Esa decision ya esta tomada. Tu trabajo es escribirlas, en el orden en que te las paso.

El estudio esta ahi para que saques de el los momentos concretos de ella, los sitios de su vida y sus palabras. De ahi y de ningun otro sitio.


QUE TIENE QUE QUEDAR DICHO EN CADA UNA

Esto no es un guion ni un orden. Es lo que no puede faltar.

EL TITULO. El veredicto que te paso, dicho por ella y sobre ella, en primera persona y corto: si no cabe de un vistazo, no golpea. Al leerlo tiene que apartar un poco la vista; si se puede leer entero sin que se le mueva nada, esta suavizado y hay que bajarlo. No es una norma sobre el mundo, ni una etiqueta que la clasifica desde fuera, ni una frase larga con condiciones dentro. Va solo, en su propia linea, sin numero, sin raya y sin comillas.

POR DONDE SE ENTRA. El estudio le describe momentos concretos suyos: una hora, un sitio, algo que esta haciendo. Coge el que corresponda a esta creencia y entra por ahi, con tus palabras pero sin cambiar lo que pasa. Si para esta no hay ninguno escrito, entra directamente por lo que da por hecho. Antes eso que inventarle una escena.

LO QUE DA POR HECHO. La creencia dicha entera y en claro.

DONDE SE LE NOTA. La misma creencia sale en varias partes de su vida, no en una. Recorre el estudio y señala en cuantas la encuentres, siempre que esten de verdad ahi. Que vea que lo que creia un problema de una zona suya le esta gobernando media vida.

LA RUEDA EN LA QUE ESTA METIDA. Esta es la parte que mas le sirve y la que mas se suele quedar a medias. No vale soltarle lo que le cuesta en frases sueltas: eso son consecuencias tiradas encima de la mesa y no se ve dentro de ellas. Se le cuenta la vuelta entera, en orden y de un tiron: como empieza, que hace ella entonces, que pasa despues, donde acaba, y como eso mismo la devuelve al principio. Tiene que reconocer la vuelta que lleva años dando. Y dentro de esa vuelta van los precios concretos: las horas, la salud, la conversacion que no tuvo, lo que no pidio. Contados dentro del recorrido, no en una lista. Nada de "te limita" ni "te frena": eso no es un precio, es una palabra.

QUE PARTE ES VERDAD Y CUAL NO. Una creencia lleva años en pie porque una parte de ella es cierta. Se le dice cual y se le da la razon ahi de verdad. Y luego se le señala el punto exacto donde deja de ser cierta. Si se le dice que es mentira entera, no se lo cree y deja de leer.

DONDE VA A ACABAR SI SIGUE IGUAL. En concreto y sin suavizarlo: que se le apaga, que deja de intentar, en que se le va la vida. Esto es lo que la mueve, asi que no se escribe bonito.

LO QUE TIENE QUE HACER, DICHO A LA CARA. Una o dos frases directas: lo que tiene que hacer en vez de lo que hace. Una instruccion, no una posibilidad. Aqui te mojas: si hay algo que esta haciendo mal, se lo dices. Con cariño, pero se lo dices. No es un plan ni son pasos.

LA CREENCIA NUEVA. Una sola frase, para que se la quede. Y tiene que poder creersela HOY: lo contrario de la suya no vale, porque eso le pide un salto de fe que no va a dar. Vale una que no le pida creer, sino mirar; algo que pueda comprobar por si misma.

Y nada mas. No añadas apartados que no esten aqui: ni ejercicios, ni pruebas para esta semana, ni consejos sueltos al final.


NINGUNA PUEDE PARECERSE A OTRA AL LEERLA

Las creencias ya son distintas por dentro. Si ademas salen todas con la misma forma, a la tercera ya sabe lo que viene y deja de leer.

Asi que:

- El orden de las partes de arriba CAMBIA en cada creencia. Una puede empezar por la escena, otra por lo que da por hecho, otra por donde va a acabar. Ninguna sigue el mismo recorrido que la anterior.
- No empieces dos de la misma manera y no cierres dos de la misma manera.
- Ni un giro repetido para presentar lo que da por hecho. Si en dos creencias lo presentas con las mismas palabras, canta.
- Lo mismo con la parte de que es verdad y que no, y con la de donde va a acabar: distintas cada vez.
- Prohibido usar dos veces en todo el texto una misma formula de enlace. Si una expresion ya la has usado en una creencia, en las demas no aparece.
- Unas mas largas y otras mas cortas. La que mas le pesa se lleva mas sitio; una que se dice en cuatro parrafos, se dice en cuatro y se acaba.
- Una imagen o un detalle concreto que uses en una creencia no se repite en otra.

Antes de entregar, lee la primera frase de cada creencia una detras de otra, y luego la ultima de cada una. Si se parecen, reescribelas.


NO SE LE INVENTA NADA DE SU VIDA

Ni su infancia, ni sus padres, ni como fue su casa, ni una pareja, ni si tiene hijos, ni un trabajo concreto, ni de donde le viene el dinero, ni un episodio que le paso. Si no esta escrito en el estudio, no existe.

No le pongas a nadie al lado. Si escribes una escena con otra persona dentro, esa persona tiene que estar en el estudio; y si esta, no le pongas sexo, ni parentesco, ni nombre que el estudio no le haya puesto.

Y no lo arregles inventandote un momento "de los que le pasan a cualquiera": eso tambien es ponerle una vida que no sabes si tiene.

OJO: el estudio puede traer alguna frase de ese tipo, porque no deberia haberla escrito y a veces se le cuela. Si la ves, NO la repitas.

Y NINGUNA PUEDE CONTRADECIR LO QUE EL ESTUDIO YA LE DIJO. Se acordara, porque lo leyo hace poco, y a partir de ahi no se cree nada.


COMO SE HABLA

Le hablas a ella de tu, como alguien que la conoce bien y se lo cuenta claro. Ni como un informe, ni como un libro, ni como una experta explicando.

- SE ENTIENDE A LA PRIMERA. Si una frase hay que releerla, esta mal escrita. Lo tiene que entender alguien de dieciocho años sin pararse.
- LAS PALABRAS SON LAS DE TODOS LOS DIAS. Si una palabra la verias antes en un informe que en una conversacion, va fuera.
- NADA DE METAFORAS NI IMAGENES. Se dice la cosa, no una figura de la cosa. Si lo que escribes no se puede ver ocurriendo de verdad, esta mal escrito.
- LE PONES SUS FRASES ENTRECOMILLADAS: lo que se dice ella por dentro cuando le pasa eso, con sus palabras. Ahi es donde se reconoce.
- LE DAS LA RAZON ANTES DE CORREGIRLA. Nunca de frente.
- FRASES SUELTAS PARA REMATAR. Una linea corta, en su propio parrafo, cuando algo tiene que aterrizar.
- NI UNA PALABRA TECNICA: ningun planeta, ningun signo, ninguna casa, ningun aspecto, y su carta no se nombra. Tampoco se nombran las areas del estudio ni se dice "tu informe" o "tu estudio".
- NADA DE ANIMAR NI DE DAR CONSEJOS DE LOS QUE SE LEEN EN CUALQUIER SITIO. Si lo que vas a escribir le vale igual a otra persona, no lo escribas.
- Español de España, hablado. Ni una palabra en otro idioma.
- Sin asteriscos, sin listas, sin simbolos, sin guiones de adorno. Texto corrido, con sus parrafos.

CUANTO OCUPA: lo que necesite para entenderse, ni una linea mas. Pero corto no es apretado: lo que sobra es repetir con otras palabras algo ya dicho; lo que NO sobra es explicarse. Si por acortar dejas una frase que dice mucho y no se entiende nada, has hecho lo peor de todo: eso no se relee, se abandona.


COMO EMPIEZA Y COMO ACABA

Empieza directamente con el titulo de la primera creencia. Sin titulo general, sin presentacion, sin explicarle lo que va a leer.

Y acaba con la ultima. Sin resumen, sin despedida y sin buscar la que hay debajo de todas.`;

// ── R2: leer un informe guardado ─────────────────────────────────
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

// El ultimo informe guardado, si no se dice cual.
async function ultimoInforme(cfg) {
  // La consulta va firmada tal cual, y AWS exige que dentro de un valor la
  // barra vaya escrita como %2F. Sin eso la firma no cuadra y R2 responde 403.
  const xml = await pedirR2(cfg, '/', 'list-type=2&prefix=p1%2F');
  const claves = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map(m => m[1]);
  const fechas = [...xml.matchAll(/<LastModified>([^<]+)<\/LastModified>/g)].map(m => m[1]);
  if (claves.length === 0) throw new Error('No hay ningun informe guardado todavia');
  let mejor = 0;
  for (let i = 1; i < claves.length; i++) if (fechas[i] > fechas[mejor]) mejor = i;
  return claves[mejor];
}

// ── Las dos llamadas al modelo ───────────────────────────────────
const MODELO = 'https://api.anthropic.com/v1/messages';

async function pedir({ sistema, mensaje, tope }) {
  const resp = await fetch(MODELO, {
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
  return { texto: data.content?.[0]?.text || '', uso: data.usage || {} };
}

async function escribirCreencias(informe) {
  const areas = (informe.areas || [])
    .map((t, i) => `${AREAS[i] || 'AREA ' + (i + 1)}\n\n${t}`)
    .join('\n\n────────────────\n\n');

  const rasgo = r => `- ${r.nombre}: ${r.descripcion}${r.causa ? ` (por que le pasa: ${r.causa})` : ''}`;
  const f = (informe.rasgos?.fortalezas || []).map(rasgo).join('\n');
  const d = (informe.rasgos?.desafios || []).map(rasgo).join('\n');

  const quien = `Nombre de pila: ${(informe.cliente?.nombre || '').split(/\s+/)[0]}\nSexo: ${informe.cliente?.sexo || ''}`;
  const estudio = `ESTUDIO QUE YA HA LEIDO:\n\n${areas}\n\n────────────────\n\nLO QUE SE LE DIJO QUE SE LE DA BIEN:\n${f}\n\nLO QUE SE LE DIJO QUE LE CUESTA:\n${d}`;

  // Paso 1. Solo la lista: unos cientos de palabras. Barato y rapido, y es
  // donde se juntan las que dicen lo mismo, antes de que escribir nada
  // cueste tirarlo.
  const uno = await pedir({
    sistema: ELEGIR,
    mensaje: `${quien}\n\n${estudio}\n\nElige sus creencias y entrega la lista.`,
    tope: 2000,
  });
  const lista = uno.texto.trim();
  if (!lista) throw new Error('El primer paso no ha devuelto ninguna creencia');

  // Paso 2. Escribe solo las que han quedado.
  const dos = await pedir({
    sistema: ESCRIBIR,
    mensaje: `${quien}\n\nSUS CREENCIAS, YA ELEGIDAS:\n\n${lista}\n\n────────────────\n\n${estudio}\n\nEscribelas.`,
    tope: 12000,
  });

  return {
    texto: dos.texto,
    lista,
    uso: {
      input_tokens: (uno.uso.input_tokens || 0) + (dos.uso.input_tokens || 0),
      output_tokens: (uno.uso.output_tokens || 0) + (dos.uso.output_tokens || 0),
    },
  };
}

// ── La pagina ────────────────────────────────────────────────────
// El encargo prohibe los asteriscos, pero si alguno se cuela se veria tal cual
// en la pagina y parece un fallo. Se quitan al pintar.
const escapar = t => String(t)
  .replace(/\*\*?/g, '')
  .replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function pagina(cuerpo) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Prueba — creencias</title>
<style>
 body{margin:0;background:#fffbef;color:#1d2b2f;font:17px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
 main{max-width:44rem;margin:0 auto;padding:3rem 1.5rem 6rem}
 .aviso{font-size:.8rem;color:#8a8578;border-bottom:1px solid #e7e0d0;padding-bottom:1rem;margin-bottom:2.5rem}
 h1{font-size:1.5rem;color:#0e3f4b;margin:0 0 .3rem}
 p{margin:0 0 1.1rem}
 .texto p:first-line{}
 .err{background:#fff0ee;border-left:3px solid #c0392b;padding:1rem 1.2rem;white-space:pre-wrap;font-size:.9rem}
</style></head><body><main>${cuerpo}</main></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const cfg = ajustes();
    if (!cfg) throw new Error('Faltan las variables INFORME_P1_CLOUDFLARE_*');
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta ANTHROPIC_API_KEY');

    const pedido = (req.query?.p1 || '').replace(/[^A-Za-z0-9_-]/g, '');
    const clave = pedido ? `p1/${pedido}.json` : await ultimoInforme(cfg);
    const informe = JSON.parse(await pedirR2(cfg, `/${clave}`));

    const t0 = Date.now();
    const { texto, uso } = await escribirCreencias(informe);
    const seg = ((Date.now() - t0) / 1000).toFixed(0);

    const parrafos = texto.split(/\n{2,}/).map(p => {
      const t = p.trim();
      if (!t) return '';
      // Un renglon corto y suelto se lee como titulo de la creencia.
      if (t.length < 70 && !/[.:;]$/.test(t)) return `<h1>${escapar(t)}</h1>`;
      return `<p>${escapar(t)}</p>`;
    }).join('\n');

    return res.status(200).send(pagina(
      `<div class="aviso">PRUEBA — informe ${escapar(clave)} · ${seg}s ·
        ${uso.input_tokens || '?'} dentro / ${uso.output_tokens || '?'} fuera ·
        cada recarga es otra llamada</div>
       <div class="texto">${parrafos}</div>`));

  } catch (err) {
    return res.status(200).send(pagina(
      `<div class="err">No se pudo: ${escapar(err.message)}</div>`));
  }
}
