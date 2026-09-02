// ════════════════════════════════════════════════════════════════
// api/p2-plan/escribir.js
//
// ESCRIBE UNA PARTE DEL P2. Una llamada, una parte, y nada mas.
//
// POR QUE UNA Y NO LAS SIETE DE UNA TIRADA. Pedidas de golpe, las ultimas
// salen flojas: el encargo entero se le queda lejos y va apretando el texto
// segun avanza. Ademas, con las siete metidas en una sola peticion, un fallo
// a mitad tira las siete. Asi cada parte se pide sola, se paga sola y se
// vuelve a pedir sola si sale mal.
//
// LO QUE VE: SOLO SU PARTE. El texto de esa area en el P1 y los rasgos que el
// P1 etiqueto con ella. No ve las otras seis, y por eso no puede contar en el
// dinero lo que ya se conto en el amor.
//
// LO QUE NO ESCRIBE EL MODELO: los titulos y los ladillos. Esos estan escritos
// en reglas.js y se pintan desde alli. El modelo escribe lo que es de ella:
// la apertura, lo que tiene que hacer y la frase de cierre.
//
// SIN RAZONAMIENTO, igual que el P1. Aqui no hay nada que deducir: el encargo
// dice exactamente que tiene que salir, y encendido se gastaba el presupuesto
// pensando y devolvia el texto vacio.
// ════════════════════════════════════════════════════════════════

import { REGLAS_COMUNES, EL_P2_NO_ES_EL_P1 } from './reglas.js';

// Techo por parte. Una parte escrita entera ronda las 350 palabras; con esto
// sobra de largo, y es un techo, no un objetivo: solo se paga lo que escribe.
const TECHO_DE_TEXTO = 3000;

// Una parte tarda entre 15 y 30 segundos. Pasado el minuto no esta tardando:
// esta colgada, y esperar mas no la arregla.
const ESPERA_MAXIMA_MS = 60000;

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
                  senal: { type: 'string' },
                },
                required: ['titulo', 'texto', 'senal'],
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

// El encargo de una parte. Se arma con lo que dice reglas.js, para que cambiar
// una caja de sitio sea cambiar una linea alli y no reescribir esto.
function encargo(area) {
  const cajas = area.cajas.map((c, i) => {
    const cuantas = c.min === c.max ? `${c.min}` : `entre ${c.min} y ${c.max}`;
    if (c.tipo === 'comprender') {
      return `CAJA ${i + 1} — "${c.titulo}": ${cuantas} entradas. Es la única caja que no pide hacer nada: le das lo que necesita entender para poder mover esto. Dicho hacia delante -lo que cambia cuando lo entiende-, no como un repaso de lo que le pasó. Cada entrada lleva un título corto y dos o tres frases. La señal va vacía.`;
    }
    return `CAJA ${i + 1} — "${c.titulo}": ${cuantas} entradas. Cada una es algo que hace, no algo que piense. Título corto, y después una o dos frases que digan exactamente qué hacer, de forma que pueda hacerlo en los próximos siete días sin preguntar nada a nadie. En la señal, una frase: en qué va a notar que está funcionando. Algo que pueda ver, no cómo se va a sentir.`;
  }).join('\n\n');

  return `${EL_P2_NO_ES_EL_P1}


LA PARTE QUE ESCRIBES AHORA

Es una de las siete, y solo tienes delante lo suyo. No hables de las otras ni las anuncies.

El título de esta parte ya está puesto y no lo escribes tú: "${area.titulo}". Todo lo que escribas tiene que ir con él.

APERTURA: de dos a cuatro frases, y va hacia delante.

La PRIMERA engancha: una sola frase que le diga por qué esto va con ella en concreto, sacada de algo que su texto ya dice. Tienes que poder señalar de qué frase suya sale; si no puedes, coge otra. Una frase, no dos: aquí no se repasa lo que le pasa, que eso ya se lo contaron.

Las que siguen son lo nuevo: cómo se mueve ella en esta parte de su vida cuando hace las cosas de otra manera. Qué hace distinto y qué le cambia. En presente, como algo que ya puede hacer, no como una promesa de lo que será algún día.

${cajas}

CIERRE: una sola frase, una sola idea, veinte palabras como mucho. No unas dos ideas con "y" ni con un guion. Si te salen dos, quédate con la que más pese y tira la otra.

Su nombre, un par de veces en la parte, separadas y donde caiga natural. Nunca en el cierre.`;
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

export async function escribirParte({ area, nombre, textoDelArea, rasgos, hechas }) {
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
