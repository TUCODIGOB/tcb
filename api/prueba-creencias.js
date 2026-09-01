// ════════════════════════════════════════════════════════════════
// /api/prueba-creencias.js
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
// EN DOS PASOS. Antes iba de una tirada y salian repetidas: juntar las que
// decian lo mismo se le pedia al final, cuando ya las tenia escritas, y
// nadie tira siete paginas hechas. Ahora primero ELIGE -solo una lista, sin
// escribir nada para ella, y ahi juntar no cuesta nada- y luego ESCRIBE solo
// las que quedan.
//
// CADA ENVIO CUESTA DOS LLAMADAS AL MODELO.
// ════════════════════════════════════════════════════════════════

import crypto from 'crypto';

const AREAS = ['IDENTIDAD', 'PATRONES', 'MIEDOS', 'HERIDA', 'AMOR', 'RELACIONES', 'DINERO'];

// Las tres preguntas que se le hacen al cliente al comprar el P2.
const PREGUNTAS = [
  '¿Como seria tu mejor version, y como seria su vida? ¿Como seria su dia a dia?',
  '¿Como es tu vida hoy? ¿Como es una semana normal tuya?',
  '¿Que llevas años intentando cambiar y no cambia?',
];

// ── LOS DOS ENCARGOS ────────────────────────────────────────
//
// Solo reglas. Ni una linea de ejemplo, ni un trozo de informe de muestra:
// lo que se le enseñe escrito, lo copia, y entonces el informe deja de ser de
// quien lo ha comprado.

const ELEGIR = `Estas preparando la segunda parte de un estudio personal. Todavia NO escribes nada para ella: hoy solo decides cuales son sus creencias.

Una creencia es algo que da por cierto sin haberlo puesto nunca en duda, y que decide lo que hace. Ella no lo vive como una creencia suya: lo vive como que las cosas son asi.


DE DONDE SALEN

De sus rasgos y de lo que el estudio cuenta de ellos. De ahi.

No inventas ninguna. No pones ninguna que no puedas señalar en el texto que te paso.


CUALES ENTRAN

Abajo tienes tambien lo que ella ha contestado: como seria su mejor version, como es su vida hoy, y que lleva años intentando cambiar sin conseguirlo.

Una creencia entra SOLO si le esta bloqueando algo de eso que ella misma ha dicho que quiere y no consigue.

Si una creencia no bloquea nada de lo que ella ha nombrado, fuera, por bien que suene y por mucho que este en sus rasgos.

NO HAY NUMERO. Salen las que salgan. Pero pocas y hondas antes que muchas y flojas: si dudas, quita.


BAJA HASTA DONDE DUELE

Esto decide si el trabajo vale algo.

Una creencia tiene dos versiones. La presentable es una regla sobre como funciona el mundo, y suena razonable. Esa no sirve: se lee, se asiente y no pasa nada, porque no acusa a nadie.

Debajo hay otra, que es un veredicto sobre ELLA: lo que cree que es, o que le falta, o que le sobra. Esa no la ha dicho en voz alta nunca.

Esa es la que se elige.

Para llegar: coge la version presentable y preguntate que tiene que ser cierto sobre ella para que se comporte asi. Y vuelve a preguntartelo. Paras cuando llegas a un veredicto sobre lo que ella es o lo que le falta.

COMO SE SABE QUE HAS LLEGADO: esta en primera persona, dice algo sobre ella y no sobre el mundo, y da un poco de verguenza leerla. Si se puede asentir tranquilamente, no has bajado.


SACALAS TODAS, QUE YA SE LIMPIARAN DESPUES

Aqui no tienes que quitar ninguna por miedo a repetirte: de juntar las que digan lo mismo se encarga otro despues, mirando solo la lista.

Lo tuyo es que ninguna se quede fuera y que todas esten bajadas hasta el fondo.


NO SE LE INVENTA NADA DE SU VIDA

Ni su infancia, ni sus padres, ni una pareja, ni hijos, ni un trabajo, ni de donde le viene el dinero, ni un episodio que le paso. Si no esta escrito en lo que te paso, no existe.

El estudio puede traer alguna frase de ese tipo, porque no deberia haberla escrito. Si la ves, no la des por buena.

Y ninguna puede contradecir lo que el estudio ya le dijo: si el estudio dice que se le da bien algo, no vale elegir una que diga que le cuesta.


QUE ENTREGAS

La lista y nada mas. Ni presentacion, ni explicacion, ni comentarios.

Por cada creencia, estas cuatro lineas y una raya:

CREENCIA: el veredicto sobre ella, en primera persona y presente. NUEVE PALABRAS COMO MUCHO. Si te pasas, es que no has llegado al fondo: lo de abajo siempre se dice en menos.
BLOQUEA: que cosa de las que ella ha dicho que quiere y no consigue le esta impidiendo.
CUESTA: que le esta quitando. Concreto.
DONDE SE LE VE: en que partes de su vida aparece, separadas por comas.
SALE DE: el rasgo o la frase del estudio de donde la has sacado.
---`;

// ── PASO 2: juntar ─────────────────────────────────────────
//
// Este solo ve la lista. Nada de informe y nada de respuestas: con treinta
// mil caracteres delante, cada creencia parece justificada por su lado y no
// junta ninguna. A pelo, una al lado de otra, un duplicado canta.
const JUNTAR = `Te paso una lista de creencias de una misma persona. Solo la lista.

Tu unico trabajo es dejar las que son de verdad distintas.

DOS SON LA MISMA cuando debajo dicen lo mismo, aunque cambien las palabras y aunque una hable de su trabajo y la otra de su gente. El sitio donde ocurre no las hace distintas.

Y ademas son la misma si le bloquean lo mismo o si le cuestan lo mismo. Miralo en sus lineas de BLOQUEA y de CUESTA: si dos coinciden ahi, son una, por distintas que suenen las dos frases de arriba.

COMO SE HACE, Y NO VALE SALTARSELO. Compara la primera con la segunda, la primera con la tercera, y asi hasta el final. Luego la segunda con todas las que van detras. Todos los pares, sin excepcion.

De cada par te preguntas: si se lo cuento primero una y luego la otra, va a pensar que eso ya se lo he dicho con otras palabras. Si la respuesta es que si, son una.

CUANDO JUNTES DOS: te quedas con la que llega mas abajo, la que mas duele, y le sumas lo que la otra traiga de nuevo en sus lineas de BLOQUEA, CUESTA y DONDE SE LE VE. No se pierde nada de eso.

JUNTA SIN PENA. Vale mas tres que peguen que siete que se pisen. Si dudas de un par, junta.

QUE ENTREGAS: la lista que queda, con las mismas lineas y en el mismo formato que te la paso, ordenada de la que mas le cuesta a la que menos. Nada mas: ni explicacion, ni que has juntado, ni comentarios.`;

const ESCRIBIR = `Escribes la segunda parte de un estudio personal. Ella ya leyo la primera, que le contaba como es y por que. Esta es para que cambie.

Te paso sus creencias YA ELEGIDAS y su estudio.

Cada creencia viene con lo que le bloquea, lo que le cuesta y donde se le ve. Eso es lo que hay: no tienes su vida entera delante y no te hace falta.

Las creencias no se tocan: no añades, no quitas, no juntas ni partes. Las escribes en el orden en que te las paso.


QUE TIENE QUE QUEDAR DICHO EN CADA UNA

Cuatro cosas. Ni una mas.

LA CREENCIA. Va sola en su linea, es el titulo, y es lo que decide si sigue leyendo. El veredicto dicho por ella y sobre ella: primera persona y presente. NUEVE PALABRAS COMO MUCHO, y cuentalas: un titulo largo no golpea, se lee como una explicacion y se pasa por encima. Al leerlo tiene que apartar un poco la vista; si se lee entero sin que se le mueva nada, esta suavizado y hay que bajarlo. No es una norma sobre el mundo, ni una etiqueta que la clasifica desde fuera, ni una frase larga con condiciones dentro. Sin numero, sin raya y sin comillas.

DONDE SE LE VE Y QUE LE ESTA COSTANDO. Lo que esta creencia le hace hacer, lo que le hace no hacer, y lo que eso le quita. Sale en varias partes de su vida, no en una: señala en cuantas la encuentres, siempre que esten en el estudio o en lo que ella ha contado. Que vea que lo que creia un problema de una zona suya le esta gobernando media vida. Los precios, concretos: las horas, la salud, el dinero, la conversacion que no tuvo, lo que no pidio. Nada de que le limita o le frena: eso no es un precio, es una palabra.

QUE PARTE ES VERDAD Y DONDE DEJA DE SERLO. Lleva años en pie porque una parte es cierta. Se le dice cual y se le da la razon ahi de verdad. Y luego se le señala el punto exacto donde deja de ser cierta. Si se le dice que es mentira entera, no se lo cree y deja de leer.

LA CREENCIA NUEVA. Una frase, para que se la quede. Y tiene que poder creersela HOY: lo contrario de la suya no vale, porque le pide un salto de fe que no va a dar. Vale una que no le pida creer, sino mirar; algo que pueda comprobar por si misma.

Y nada mas. Ni ejercicios, ni pruebas para esta semana, ni consejos al final. El plan va en otro sitio.


AQUI NO SE ESCRIBEN ESCENAS

Ni una. Nada de contarle un momento suyo como si lo estuvieras viendo: ni una hora, ni un dia de la semana, ni un sitio, ni lo que tenia en la mano, ni lo que hizo despues.

En cuanto describes un momento te lo estas inventando, y ella lo nota a la primera. Una escena que no le paso tira todo lo demas, aunque lo demas sea cierto.

Lo que si se dice es como funciona: lo que hace siempre que le pasa eso. Eso es suyo y es verdad. El cuando y el donde, no.


NINGUNA SE PARECE A OTRA AL LEERLA

Las creencias ya son distintas por dentro. Si ademas salen con la misma forma, a la tercera sabe lo que viene y deja de leer.

- El orden de las cuatro cosas CAMBIA en cada creencia. Ninguna sigue el mismo recorrido que la anterior.
- No empieces dos igual y no cierres dos igual.
- Si una formula ya la has usado en una creencia, en las demas no aparece.
- Unas mas largas y otras mas cortas. La que mas le pesa se lleva mas sitio.
- Un detalle concreto que uses en una no se repite en otra.

Antes de entregar, lee la primera frase de cada creencia seguidas, y luego la ultima de cada una. Si se parecen, reescribelas.


NO SE LE INVENTA NADA DE SU VIDA

Ni su infancia, ni sus padres, ni una pareja, ni hijos, ni un trabajo, ni de donde le viene el dinero, ni un episodio que le paso. Si no esta escrito en lo que te paso, no existe.

Si escribes una escena con otra persona dentro, esa persona tiene que estar en lo que te paso; y no le pongas sexo, ni parentesco, ni nombre que no le hayan puesto.

Y no lo arregles con un momento de los que le pasan a cualquiera: eso tambien es ponerle una vida que no sabes si tiene.

Y ninguna puede contradecir lo que el estudio ya le dijo: se acordara, porque lo leyo hace poco, y a partir de ahi no se cree nada.


COMO SE HABLA

Le hablas a ella de tu, como alguien que la conoce bien y se lo cuenta claro. Ni como un informe, ni como un libro, ni como una experta explicando.

- SE ENTIENDE A LA PRIMERA. Si una frase hay que releerla, esta mal escrita. Lo tiene que entender alguien de dieciocho años sin pararse.
- LAS PALABRAS SON LAS DE TODOS LOS DIAS. Si una palabra la verias antes en un informe que en una conversacion, fuera.
- NADA DE METAFORAS NI IMAGENES. Se dice la cosa, no una figura de la cosa. Si lo que escribes no se puede ver ocurriendo de verdad, esta mal escrito.
- LE PONES SUS FRASES ENTRECOMILLADAS: lo que se dice ella por dentro cuando le pasa eso.
- LE DAS LA RAZON ANTES DE CORREGIRLA. Nunca de frente.
- FRASES SUELTAS PARA REMATAR. Una linea corta, en su propio parrafo, cuando algo tiene que aterrizar.
- NI UNA PALABRA TECNICA: ningun planeta, ningun signo, ninguna casa, ningun aspecto. Su carta no se nombra, ni las areas del estudio, y no se dice tu informe ni tu estudio.
- NADA DE ANIMAR NI DE CONSEJOS DE LOS QUE SE LEEN EN CUALQUIER SITIO. Si lo que vas a escribir le vale igual a otra persona, no lo escribas.
- Español de España, hablado. Ni una palabra en otro idioma.
- Sin asteriscos, sin listas, sin simbolos, sin guiones de adorno. Texto corrido.

CUANTO OCUPA: lo que necesite para entenderse, ni una linea mas. Pero corto no es apretado: lo que sobra es repetir con otras palabras algo ya dicho; lo que no sobra es explicarse. Si por acortar dejas una frase que dice mucho y no se entiende, eso no se relee, se abandona.


COMO EMPIEZA Y COMO ACABA

Empieza directamente con el titulo de la primera creencia. Sin titulo general, sin presentacion.

Y acaba con la ultima. Sin resumen, sin despedida, y sin buscar la creencia que hay debajo de todas.`;

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

// ── Las dos llamadas al modelo ──────────────────────────────
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
  return { texto: data.content?.[0]?.text || '', uso: data.usage || {} };
}

async function escribirCreencias(informe, respuestas) {
  const areas = (informe.areas || [])
    .map((t, i) => `${AREAS[i] || 'AREA ' + (i + 1)}\n\n${t}`)
    .join('\n\n────────────────\n\n');

  const rasgo = r => `- ${r.nombre}: ${r.descripcion}${r.causa ? ` (por que le pasa: ${r.causa})` : ''}`;
  const f = (informe.rasgos?.fortalezas || []).map(rasgo).join('\n');
  const d = (informe.rasgos?.desafios || []).map(rasgo).join('\n');

  const quien = `Nombre de pila: ${(informe.cliente?.nombre || '').split(/\s+/)[0]}\nSexo: ${informe.cliente?.sexo || ''}`;

  // El material del P1: lo que ella leyo. De ahi salen las creencias.
  const estudio =
    `SUS RASGOS, LOS QUE SE LE DIJO QUE SE LE DAN BIEN:\n${f}\n\n` +
    `SUS RASGOS, LOS QUE SE LE DIJO QUE LE CUESTAN:\n${d}\n\n` +
    `────────────────\n\nEL ESTUDIO QUE YA HA LEIDO:\n\n${areas}`;

  // Lo que ha contestado hoy. Solo lo ve el paso de elegir: sirve para saber
  // que le esta bloqueando, no para contarselo. Quien escribe no lo recibe, y
  // por eso no puede devolverle su propio texto.
  const contestado = `LO QUE ELLA HA CONTESTADO:\n\n` +
    respuestas.map((r, i) => `${PREGUNTAS[i]}\n${r}`).join('\n\n');

  // Paso 1. Saca las candidatas, sin quitar ninguna por miedo a repetirse.
  const uno = await pedir({
    sistema: ELEGIR,
    mensaje: `${quien}\n\n${estudio}\n\n────────────────\n\n${contestado}\n\nElige sus creencias y entrega la lista.`,
    tope: 2500,
  });
  const candidatas = uno.texto.trim();
  if (!candidatas) throw new Error('El primer paso no ha devuelto ninguna creencia');

  // Paso 2. Junta las que dicen lo mismo. Ve la lista y nada mas: con el
  // informe delante, cada creencia parece justificada y no junta ninguna.
  // Es una llamada corta, unos segundos.
  const dos = await pedir({ sistema: JUNTAR, mensaje: candidatas, tope: 2500 });
  const lista = dos.texto.trim() || candidatas;

  // Paso 3. Escribe las que han quedado.
  const tres = await pedir({
    sistema: ESCRIBIR,
    mensaje: `${quien}\n\nSUS CREENCIAS, YA ELEGIDAS:\n\n${lista}\n\n────────────────\n\n${estudio}\n\nEscribelas.`,
    // Techo de escritura. El tiempo lo marca lo que escribe, no lo que
    // piensa: unas 75 palabras-token por segundo. Con 10000 este paso no
    // puede pasar de dos minutos y medio, y la funcion se corta a los cinco.
    // Con tres o cuatro creencias de cuatro partes, lo esperable son 4000.
    tope: 10000,
  });

  const suma = k => [uno.uso, dos.uso, tres.uso].reduce((t, u) => t + (u[k] || 0), 0);
  return {
    texto: tres.texto,
    candidatas,
    lista,
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
 h1{font-size:1.55rem;color:#0e3f4b;margin:0 0 1.2rem;line-height:1.25;font-weight:700}
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
      Cada envio son dos llamadas al modelo.</div>
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
    const { texto, candidatas, lista, uso } = await escribirCreencias(informe, respuestas);
    const seg = ((Date.now() - t0) / 1000).toFixed(0);

    // Que renglon es el titulo de una creencia. No se adivina por la pinta:
    // se compara con los titulos que el paso de juntar dejo cerrados. Se
    // miran las cuatro primeras palabras, porque al escribirlo puede
    // cambiarle alguna. Si aun asi no cuadra, vale un renglon corto y suelto.
    const pelado = t => t.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const arranque = t => pelado(t).split(' ').slice(0, 4).join(' ');
    const cerrados = [...lista.matchAll(/^\s*CREENCIA:\s*(.+)$/gmi)]
      .map(m => arranque(m[1])).filter(a => a.split(' ').length === 4);
    // Si hay lista cerrada, manda ella y solo ella: el encargo pide frases
    // sueltas y cortas para rematar, y esas no son titulos aunque lo parezcan.
    const esTitulo = t => cerrados.length
      ? cerrados.includes(arranque(t))
      : t.length < 80 && !/[.:;,]$/.test(t);

    // El texto llega en parrafos. Cada vez que aparece un titulo empieza una
    // creencia nueva, y se pinta separada de la anterior.
    const bloques = [];
    for (const trozo of texto.split(/\n{2,}/)) {
      const t = trozo.trim();
      if (!t) continue;
      if (esTitulo(t)) bloques.push({ titulo: t, parrafos: [] });
      else if (bloques.length) bloques[bloques.length - 1].parrafos.push(t);
      else bloques.push({ titulo: '', parrafos: [t] });
    }

    const creencias = bloques.map(b => `<section class="creencia">
      ${b.titulo ? `<h1>${escapar(b.titulo)}</h1>` : ''}
      ${b.parrafos.map(t => `<p>${escapar(t)}</p>`).join('\n')}
    </section>`).join('\n');

    return res.status(200).send(pagina(
      `<div class="aviso">PRUEBA — informe ${escapar(clave)} · ${seg}s ·
        ${uso.dentro} dentro / ${uso.fuera} fuera</div>
       <details><summary>Chuleta: lo que saco y lo que dejo al juntar</summary>
         <pre>SACO:\n\n${escapar(candidatas)}\n\n\nDEJO:\n\n${escapar(lista)}</pre>
       </details>
       ${creencias}`));

  } catch (err) {
    return res.status(200).send(formulario(datos,
      `<div class="err">No se pudo: ${escapar(err.message)}</div>`, await listar()));
  }
}
