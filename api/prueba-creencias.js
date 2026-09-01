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


AHORA JUNTA, Y JUNTA SIN PENA

Esta es la parte que importa hoy, y se hace aqui porque todavia no has escrito nada: tachar una linea no te cuesta nada, tirar una pagina escrita si.

Dos son la misma cuando debajo dicen lo mismo, aunque cambien las palabras y aunque una hable de su trabajo y la otra de su gente. El sitio donde ocurre no las hace distintas.

Y ninguna puede repetirle a otra lo que le esta costando.

REPASO OBLIGATORIO: compara cada creencia con TODAS las demas, par por par, sin saltarte ninguno. De cada par preguntate si al leer la segunda va a pensar que eso ya se lo has dicho con otras palabras. Si la respuesta es que si, las juntas en una y te quedas con la que mas abajo llega.

Vale mas tres que peguen que siete que se pisen.


NO SE LE INVENTA NADA DE SU VIDA

Ni su infancia, ni sus padres, ni una pareja, ni hijos, ni un trabajo, ni de donde le viene el dinero, ni un episodio que le paso. Si no esta escrito en lo que te paso, no existe.

El estudio puede traer alguna frase de ese tipo, porque no deberia haberla escrito. Si la ves, no la des por buena.

Y ninguna puede contradecir lo que el estudio ya le dijo: si el estudio dice que se le da bien algo, no vale elegir una que diga que le cuesta.


QUE ENTREGAS

La lista y nada mas. Ni presentacion, ni explicacion, ni comentarios.

Por cada creencia, estas cuatro lineas y una raya:

CREENCIA: el veredicto sobre ella, en primera persona, presente y corto.
BLOQUEA: que cosa de las que ella ha dicho que quiere y no consigue le esta impidiendo.
CUESTA: que le esta quitando. Concreto.
SALE DE: el rasgo o la frase del estudio de donde la has sacado.
---`;

const ESCRIBIR = `Escribes la segunda parte de un estudio personal. Ella ya leyo la primera, que le contaba como es y por que. Esta es para que cambie.

Te paso sus creencias YA ELEGIDAS, su estudio, y lo que ella ha contestado sobre su vida.

Las creencias no se tocan: no añades, no quitas, no juntas ni partes. Las escribes en el orden en que te las paso.


QUE TIENE QUE QUEDAR DICHO EN CADA UNA

Cuatro cosas. Ni una mas.

LA CREENCIA. Va sola en su linea, es el titulo, y es lo que decide si sigue leyendo. El veredicto dicho por ella y sobre ella: primera persona, presente, corto. Al leerlo tiene que apartar un poco la vista; si se lee entero sin que se le mueva nada, esta suavizado y hay que bajarlo. No es una norma sobre el mundo, ni una etiqueta que la clasifica desde fuera, ni una frase larga con condiciones dentro. Sin numero, sin raya y sin comillas.

DONDE SE LE VE Y QUE LE ESTA COSTANDO. Lo que esta creencia le hace hacer, lo que le hace no hacer, y lo que eso le quita. Sale en varias partes de su vida, no en una: señala en cuantas la encuentres, siempre que esten en el estudio o en lo que ella ha contado. Que vea que lo que creia un problema de una zona suya le esta gobernando media vida. Los precios, concretos: las horas, la salud, el dinero, la conversacion que no tuvo, lo que no pidio. Nada de que le limita o le frena: eso no es un precio, es una palabra.

QUE PARTE ES VERDAD Y DONDE DEJA DE SERLO. Lleva años en pie porque una parte es cierta. Se le dice cual y se le da la razon ahi de verdad. Y luego se le señala el punto exacto donde deja de ser cierta. Si se le dice que es mentira entera, no se lo cree y deja de leer.

LA CREENCIA NUEVA. Una frase, para que se la quede. Y tiene que poder creersela HOY: lo contrario de la suya no vale, porque le pide un salto de fe que no va a dar. Vale una que no le pida creer, sino mirar; algo que pueda comprobar por si misma.

Y nada mas. Ni ejercicios, ni pruebas para esta semana, ni consejos al final. El plan va en otro sitio.


LO QUE ELLA HA CONTESTADO NO SE LE REPITE

Sus respuestas son para saber donde apuntar, no para devolverselas.

Nunca le digas que ella ha dicho tal cosa, ni le cites lo que escribio, ni se lo resumas. Acaba de escribirlo: si se lo repites, ve que le estas devolviendo su propio texto y se le cae el trabajo en la mano.

Se usan al reves: sabes que es lo que no consigue, y le enseñas por que.


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

  const material =
    `SUS RASGOS, LOS QUE SE LE DIJO QUE SE LE DAN BIEN:\n${f}\n\n` +
    `SUS RASGOS, LOS QUE SE LE DIJO QUE LE CUESTAN:\n${d}\n\n` +
    `────────────────\n\nEL ESTUDIO QUE YA HA LEIDO:\n\n${areas}\n\n` +
    `────────────────\n\nLO QUE ELLA HA CONTESTADO:\n\n` +
    respuestas.map((r, i) => `${PREGUNTAS[i]}\n${r}`).join('\n\n');

  // Paso 1. Solo la lista: unos cientos de palabras. Es donde se juntan las
  // que dicen lo mismo, antes de que escribirlas cueste tirarlas.
  const uno = await pedir({
    sistema: ELEGIR,
    mensaje: `${quien}\n\n${material}\n\nElige sus creencias y entrega la lista.`,
    tope: 2000,
  });
  const lista = uno.texto.trim();
  if (!lista) throw new Error('El primer paso no ha devuelto ninguna creencia');

  // Paso 2. Escribe solo las que han quedado.
  const dos = await pedir({
    sistema: ESCRIBIR,
    mensaje: `${quien}\n\nSUS CREENCIAS, YA ELEGIDAS:\n\n${lista}\n\n────────────────\n\n${material}\n\nEscribelas.`,
    // Techo de escritura. El tiempo lo marca lo que escribe, no lo que
    // piensa: unas 75 palabras-token por segundo. Con 10000 el paso de
    // escribir no puede pasar de unos dos minutos y medio, y la funcion se
    // corta a los cinco. Con tres o cuatro creencias de cuatro partes, lo
    // esperable son 4000 o 5000.
    tope: 10000,
  });

  return {
    texto: dos.texto,
    lista,
    uso: {
      dentro: (uno.uso.input_tokens || 0) + (dos.uso.input_tokens || 0),
      fuera: (uno.uso.output_tokens || 0) + (dos.uso.output_tokens || 0),
    },
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
 h1{font-size:1.5rem;color:#0e3f4b;margin:0 0 .3rem;line-height:1.3}
 p{margin:0 0 1.1rem}
 label{display:block;font-size:.95rem;font-weight:600;color:#0e3f4b;margin:2rem 0 .5rem}
 textarea,input{width:100%;box-sizing:border-box;font:inherit;font-size:.95rem;padding:.7rem;
   border:1px solid #d8d0bd;border-radius:6px;background:#fff;color:inherit}
 textarea{min-height:8rem;resize:vertical}
 button{margin-top:2rem;background:#0e3f4b;color:#fffbef;border:0;border-radius:6px;
   padding:.9rem 1.6rem;font:inherit;font-weight:700;cursor:pointer}
 details{margin:0 0 2rem;font-size:.85rem;color:#6d675c}
 pre{white-space:pre-wrap;font:inherit;font-size:.85rem;background:#f5efdf;padding:1rem;border-radius:6px}
 .err{background:#fff0ee;border-left:3px solid #c0392b;padding:1rem 1.2rem;white-space:pre-wrap;font-size:.9rem}
</style></head><body><main>${cuerpo}</main></body></html>`;
}

function formulario(datos = {}, aviso = '') {
  const campo = (i) => `<label>${escapar(PREGUNTAS[i])}</label>
    <textarea name="r${i + 1}" required>${escapar(datos[`r${i + 1}`] || '')}</textarea>`;
  return pagina(`${aviso}
    <div class="aviso">PRUEBA — lo que pegues aqui no se guarda en ningun sitio.
      Cada envio son dos llamadas al modelo.</div>
    <form method="POST">
      <label>Compra del informe P1 (vacio = el ultimo guardado)</label>
      <input name="p1" value="${escapar(datos.p1 || '')}" placeholder="cs_live_...">
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

  if (req.method !== 'POST') {
    return res.status(200).send(formulario({ p1: req.query?.p1 || '' }));
  }

  let datos = {};
  try {
    datos = await cuerpoDe(req);
    const respuestas = [datos.r1, datos.r2, datos.r3].map(t => String(t || '').trim());
    if (respuestas.some(t => !t)) {
      return res.status(200).send(formulario(datos,
        '<div class="err">Faltan respuestas: hacen falta las tres.</div>'));
    }

    const cfg = ajustes();
    if (!cfg) throw new Error('Faltan las variables INFORME_P1_CLOUDFLARE_*');
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta ANTHROPIC_API_KEY');

    const pedido = String(datos.p1 || '').replace(/[^A-Za-z0-9_-]/g, '');
    const clave = pedido ? `p1/${pedido}.json` : await ultimoInforme(cfg);
    const informe = JSON.parse(await pedirR2(cfg, `/${clave}`));

    const t0 = Date.now();
    const { texto, lista, uso } = await escribirCreencias(informe, respuestas);
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
        ${uso.dentro} dentro / ${uso.fuera} fuera</div>
       <details><summary>Las creencias que eligio antes de escribir</summary>
         <pre>${escapar(lista)}</pre></details>
       <div class="texto">${parrafos}</div>`));

  } catch (err) {
    return res.status(200).send(formulario(datos,
      `<div class="err">No se pudo: ${escapar(err.message)}</div>`));
  }
}
