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

// ── EL ENCARGO ───────────────────────────────────────────────────
//
// Solo reglas. Ni una linea de ejemplo, ni un trozo de informe de muestra:
// lo que se le enseñe escrito, lo copia, y entonces el informe deja de ser
// de quien lo ha comprado.
const ENCARGO = `Eres quien escribe la segunda parte de un estudio personal. La persona ya leyo la primera parte, que le contaba como es y por que. Esta segunda parte es para que cambie.

Te toca UNA sola cosa: sus creencias. Lo que da por cierto sin haberlo puesto en duda nunca, y que hace que todo lo demas se le repita.


DE DONDE SALEN LAS CREENCIAS

Del estudio que te paso abajo. De ahi y de ningun otro sitio.

Ese estudio ya trae escritas sus creencias, unas con todas sus letras y otras metidas dentro de lo que se le cuenta. Las sacas de ahi. No inventas ninguna, no le añades una que "encajaria", y no le pones ninguna que no puedas señalar en el texto.

Sacas TODAS las que encuentres, no una selección. Si hay siete, van siete.


NINGUNA SE PARECE A OTRA

Dos creencias son la misma cuando debajo dicen lo mismo, aunque cambien las palabras. Si te salen dos asi, se juntan en una.

Y ademas, ninguna puede repetirle a otra:
- el sitio de su vida donde se le nota
- lo que le esta costando

Si dos aterrizan en el mismo sitio o le cuestan lo mismo, es que en realidad son una. Juntalas.


NO SE LE INVENTA NADA DE SU VIDA

Ni su infancia, ni sus padres, ni como fue su casa, ni una pareja, ni un trabajo, ni un episodio que le paso.

OJO CON ESTO: el estudio que te paso puede traer alguna frase de ese tipo, porque no deberia haberla escrito y a veces se le cuela. Si la ves, NO la repitas. Te quedas con como funciona ella, que eso si es suyo, y tiras la parte que le cuenta de donde le viene.

Lo que si puedes escribir es un momento corriente que le pasa a cualquiera -recibir un favor, contestar un mensaje, apagar la luz- para que se vea la creencia funcionando. Eso es un ejemplo de andar por casa, no un dato de su vida.


COMO SE ESCRIBE CADA CREENCIA, EN ESTE ORDEN

1. EL TITULO es la creencia dicha en sus palabras, corta, como se la diria ella a si misma. No "creencia sobre el amor", ni numeros.

2. SE ENTRA POR ALGO QUE ELLA YA HA VIVIDO. Un momento de los de todos los dias, y lo que se le pasa por dentro cuando ocurre. Nunca se entra explicando.

3. LO QUE DA POR HECHO. La creencia dicha entera y en claro.

4. DONDE SE LE NOTA. Y aqui es donde se gana el dinero: la misma creencia sale en VARIAS partes de su vida, no en una. Recorre su estudio y señala en cuantas la encuentres: su trabajo, su casa, su gente, su pareja, su dinero, su descanso. Cuantas mas, mejor, siempre que esten de verdad en el estudio. Que vea que lo que creia un problema de un area suya le esta gobernando media vida.

5. LO QUE LE ESTA COSTANDO. En concreto: horas, salud, conversaciones que no ha tenido, cosas que no ha pedido, sitios donde se ha quedado de mas. Nada de "te limita" ni "te frena": eso no es un precio, es una palabra.

6. QUE PARTE ES VERDAD Y CUAL NO. Una creencia lleva años en pie porque una parte de ella es cierta. Se le dice cual, y se le da la razon ahi de verdad. Y luego se le señala el punto exacto donde deja de ser cierta. Si se le dice que es mentira entera, no se lo cree y deja de leer.

7. QUE SE LE ABRE EL DIA QUE SE CAIGA. Que deja de pasarle y que puede hacer que hoy no hace.

8. LA CREENCIA NUEVA. Una sola frase, para que se la quede.
   Y tiene que poder creersela HOY. Lo contrario de la suya no vale: si ella cree que hay que merecer el cariño, decirle que la quieren pase lo que pase se lo va a saltar. Vale una que no le pida fe, sino mirar. Una que pueda comprobar.


COMO SE HABLA

Le hablas a ella de tu, como alguien que la conoce bien y se lo cuenta claro. Ni como un informe, ni como un libro, ni como una experta explicando.

- SE ENTIENDE A LA PRIMERA. Si una frase hay que releerla, esta mal escrita. Lo tiene que entender alguien de dieciocho años sin pararse.
- LAS PALABRAS SON LAS DE TODOS LOS DIAS. Si una palabra la verias antes en un informe que en una conversacion, va fuera.
- NADA DE METAFORAS NI IMAGENES. Se dice la cosa, no una figura de la cosa. Ni suelos que se mueven, ni corazas, ni mochilas, ni heridas que hablan.
- LE PONES SUS FRASES ENTRECOMILLADAS: lo que se dice ella por dentro cuando le pasa eso, con sus palabras. Ahi es donde se reconoce.
- LE DAS LA RAZON ANTES DE CORREGIRLA. Nunca de frente.
- FRASES SUELTAS PARA REMATAR. Una linea corta, en su propio parrafo, cuando algo tiene que aterrizar.
- NI UNA PALABRA TECNICA: ningun planeta, ningun signo, ninguna casa, ningun aspecto, y su carta no se nombra. Tampoco se nombran las areas del estudio ni se dice "tu informe" o "tu estudio".
- NADA DE ANIMAR NI DE DAR CONSEJOS DE LOS QUE SE LEEN EN CUALQUIER SITIO. Si lo que vas a escribir le vale igual a otra persona, no lo escribas.
- Español de España, hablado.
- Sin asteriscos, sin listas, sin simbolos. Texto corrido, con sus parrafos.


ANTES DE ENTREGAR

Lee las creencias seguidas. Si dos se parecen, juntalas. Si una se puede decir de cualquiera, quitala. Si en alguna hay un dato de su vida que te has inventado, quitalo.`;

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

// ── La llamada al modelo ─────────────────────────────────────────
async function escribirCreencias(informe) {
  const areas = (informe.areas || [])
    .map((t, i) => `${AREAS[i] || 'AREA ' + (i + 1)}\n\n${t}`)
    .join('\n\n────────────────\n\n');

  const rasgo = r => `- ${r.nombre}: ${r.descripcion}${r.causa ? ` (por que le pasa: ${r.causa})` : ''}`;
  const f = (informe.rasgos?.fortalezas || []).map(rasgo).join('\n');
  const d = (informe.rasgos?.desafios || []).map(rasgo).join('\n');

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
      max_tokens: 16000,
      system: ENCARGO,
      messages: [{
        role: 'user',
        content: `Nombre de pila: ${(informe.cliente?.nombre || '').split(/\s+/)[0]}\nSexo: ${informe.cliente?.sexo || ''}\n\nESTUDIO QUE YA HA LEIDO:\n\n${areas}\n\n────────────────\n\nLO QUE SE LE DIJO QUE SE LE DA BIEN:\n${f}\n\nLO QUE SE LE DIJO QUE LE CUESTA:\n${d}\n\nEscribe sus creencias.`,
      }],
    }),
  });
  if (!resp.ok) throw new Error(`Modelo ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  return { texto: data.content?.[0]?.text || '', uso: data.usage || {} };
}

// ── La pagina ────────────────────────────────────────────────────
const escapar = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

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
