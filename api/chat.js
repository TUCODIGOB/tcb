import Stripe from 'stripe';
import { MAX_INTENTOS, estado, reservar, liberar } from '../lib/reserva.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { session_id } = req.body;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
  }

  // Este endpoint es el unico que cuesta dinero (7 llamadas al modelo por
  // peticion), asi que aqui es donde se decide si se genera o no. Las tres
  // puertas van en este orden a proposito: primero lo definitivo, luego lo
  // temporal, y el contador de intentos el ultimo, para que una recarga
  // mientras se genera no consuma intentos ni dispare avisos en falso.
  let reserva;
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session || session.payment_status !== 'paid') {
      return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
    }

    const st = estado(session);

    // 1. Ya se genero: definitivo. Ni recargando, ni con el enlace, ni nunca.
    if (st.completado) {
      return res.status(403).json({ error: 'Este informe ya fue generado.', motivo: 'completado' });
    }

    // 2. Se esta generando ahora mismo. No es un error: el informe viene en
    //    camino y llegara por correo. Sin gasto.
    if (st.ocupada) {
      return res.status(409).json({ error: 'Tu informe se esta generando ahora mismo.', motivo: 'en_curso' });
    }

    // 3. Se agotaron los intentos de verdad (los dos fallaron y liberaron la
    //    reserva, o caducaron). Aqui si hay que avisar al admin.
    if (st.intentos >= MAX_INTENTOS) {
      if (session.metadata?.aviso_agotado !== 'si') {
        try {
          const m = session.metadata || {};
          const emailCliente = session.customer_email || session.customer_details?.email || '(desconocido)';
          await enviarEmailAdmin({
            asunto: `⚠️ URGENTE — Cliente sin informe tras ${MAX_INTENTOS} intentos — ${m.nombre || 'Cliente'}`,
            mensaje: [
              `Este cliente HA PAGADO y NO tiene su informe. Hay que generarselo a mano.`,
              ``,
              `Email:    ${emailCliente}`,
              `Nombre:   ${m.nombre || '-'}`,
              `Telefono: ${m.telefono || '-'}`,
              `Sexo:     ${m.sexo || '-'}`,
              `Nacio:    ${m.fecha || '-'} a las ${m.hora || '-'}`,
              `Lugar:    ${[m.municipio, m.provincia, m.pais].filter(Boolean).join(', ') || '-'}`,
              `Edad:     ${m.edad || '-'}`,
              ``,
              `Session:  ${session_id}`,
              `Intentos: ${st.intentos} de ${MAX_INTENTOS}`,
            ].join('\n'),
          });
          await stripe.checkout.sessions.update(session_id, {
            metadata: { ...session.metadata, aviso_agotado: 'si' }
          });
        } catch (avisoErr) {
          console.error('No se pudo avisar al admin de intentos agotados:', avisoErr.message);
        }
      }
      return res.status(429).json({ error: 'Se ha alcanzado el limite de intentos para este informe. Escribenos a hola@origennatal.com y te lo enviamos.', motivo: 'agotado' });
    }

    // Coger la reserva ANTES de gastar. Si otra peticion simultanea se la
    // lleva, cedemos sin gastar nada.
    reserva = await reservar(stripe, session_id, session);
    if (!reserva.ok) {
      return res.status(409).json({ error: 'Tu informe se esta generando ahora mismo.', motivo: 'en_curso' });
    }
  } catch (err) {
    return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
  }

  const { nombre, sexo, fechaNice, hora, lugar, edad, cartaTexto } = req.body;

  if (!nombre || !cartaTexto) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  const SYSTEM_PROMPT = `Eres una experta en psicología, astrología y neurociencia. Generas diagnósticos de autoconocimiento muy personalizados basados en la carta natal.

IMPORTANTE: Escribe siempre en español de España. Nunca uses voseo ni expresiones latinoamericanas. Usa tú, no vos.

ESTILO DE ESCRITURA:
- Habla como una persona de confianza, directo y cercano
- Lenguaje sencillo, que lo entienda cualquier persona aunque no haya leído un libro en años
- Conecta ideas con comas, no con puntos ni guiones largos
- Sin listas, sin viñetas, sin símbolos, sin asteriscos, todo en párrafos corridos
- No uses nombres de planetas ni casas astrológicas. Pero SÍ tienes que apoyarte en ellos: la casa de cada planeta dice en qué parcela concreta de la vida se nota (trabajo, pareja, dinero, familia, cuerpo, amigos, casa, estudios), y los aspectos dicen qué partes de la persona chocan entre sí y cuáles se apoyan. Traduce eso a situaciones reales de su vida, sin nombrarlo nunca. Un texto escrito solo con el signo de cada planeta le vale igual a una de cada doce personas, y se nota al leerlo
- No empieces dos párrafos con la misma estructura. Varía los arranques
- Escribe como un humano, no como una IA: menos puntos, más comas, frases que fluyen

REGLA DE PÁRRAFOS (CRÍTICA, se cumple siempre):
- Párrafos cortos. Ninguno pasa de 70 palabras. Al maquetarse en el PDF final, 70 palabras ocupan 5 líneas, y 5 líneas es el máximo absoluto. El punto bueno está entre 55 y 70 palabras por párrafo, que son 4 o 5 líneas.
- Entre párrafo y párrafo hay doble salto de línea (línea en blanco visible)
- Si un párrafo se te va por encima de 70 palabras, pártelo en dos párrafos cortos. Nunca lo dejes largo.
- REGLA CRÍTICA DE LONGITUD: esta área tiene OBLIGATORIAMENTE entre 850 y 900 palabras. No hay un número fijo de párrafos: salen los que hagan falta. Y como cada párrafo es corto, de 55 a 70 palabras, para llegar a 850-900 palabras hacen falta MUCHOS párrafos, entre 13 y 16. Son bastantes más de los que te va a pedir el instinto, y es correcto que sean tantos. Un área con menos de 850 palabras es un ERROR GRAVE que rompe el producto final. Si te sale corta, AMPLÍA con más detalle, más ejemplos, más variaciones de la misma idea, y hazlo AÑADIENDO párrafos cortos nuevos, nunca engordando los que ya tienes.

OBJETIVO: Que la persona lea y piense que eso es exactamente ella, que por fin alguien se lo explica.

ESCENA REAL OBLIGATORIA:
Tienes que incluir una escena concreta, específica y visual que el lector reconozca de inmediato como propia. No vale una situación genérica ni tonta. Debe ser una escena tan concreta que el lector diga "joder, esto me pasa literalmente".

Ejemplos de escenas BUENAS (úsalas de inspiración, no las copies):
- Para MIEDOS: "Llega el domingo por la tarde y ya notas ese peso raro en el pecho pensando en el lunes, haces una lista mental de todo lo que tienes que controlar, no porque haga falta, sino porque si no lo repasas todo cien veces sientes que algo malo va a pasar, y cuando te metes en la cama te pones a revisar el móvil para no pensar."
- Para AMOR: "Estás con alguien que te gusta de verdad, todo va bien dos meses, y un día esa persona tarda cuatro horas en contestar un mensaje, y sin darte cuenta ya estás construyendo una historia entera en tu cabeza, ya estás pensando que se acabó, que no le importas, que era demasiado bonito, y cuando por fin responde con un simple 'perdona, he estado liado', tu cuerpo se relaja de golpe y te das cuenta de lo agotada que estabas."
- Para DINERO: "Te ofrecen un trabajo mejor pagado, la propuesta está encima de la mesa, y antes de alegrarte ya estás pensando en todas las razones por las que no vas a poder con él, en todo lo que puede salir mal, en qué van a pensar los demás si fracasas, y acabas diciendo que no, o pidiendo menos de lo que te ofrecían, con una sensación extraña de alivio."

Las escenas BUENAS son específicas (hora del día, gesto concreto, diálogo interno, objeto real), visuales, y tocan una inseguridad real. Las escenas MALAS son abstractas ("cuando te sientes mal, piensas cosas"), obvias ("a veces dudas de ti mismo") o vacías.

La escena ocupa uno o dos párrafos completos dentro del área, integrada de forma natural, sin avisar de que es un ejemplo.

ESTRUCTURA INTERNA (sin títulos ni numeración visible, todo fluido):
Cubre estos puntos pero NUNCA empieces con las frases de abajo. Son guías para ti, no para el texto. Varía radicalmente cómo abres cada párrafo.
- Cómo se manifiesta en su vida ahora
- La escena real concreta y visual (OBLIGATORIA)
- El origen: cuándo empezó y por qué
- El bucle que se repite
- Qué le está costando
- Una verdad incómoda que provoca el clic (nunca empieces con "la verdad incómoda es")
- Qué creencia o autoengaño tiene que soltar (nunca empieces con "tienes que soltar")

CIERRE DE CADA ÁREA (OBLIGATORIO):
El área termina con un párrafo de cierre potente, no con una frase suave o vaga. El cierre tiene que hacer clic en la cabeza del lector, dejarle pensando, como esa frase que alguien te dice una vez y no se te olvida. Puede ser una verdad directa, una imagen contundente, una paradoja, una frase corta que golpea. No debe ser un resumen, ni un consejo, ni motivación barata. Es la frase que el lector subrayaría si tuviera un lápiz.

Ejemplos del tono que busco para los cierres:
- "Y hasta que no veas eso, vas a seguir buscando fuera lo que lleva años esperándote dentro."
- "Porque en el fondo lo sabes. Siempre lo has sabido. Solo que mirar para otro lado era más cómodo."
- "El día que dejes de demostrar, empiezas a existir."

PROHIBICIONES ABSOLUTAS:
- No repetir el título del área en el texto
- No causas vagas sin explicar cómo y cuándo
- No frases de autoayuda ni coaching
- No decir qué debe hacer la persona
- PROHIBIDO empezar párrafos con "La verdad incómoda es", "Tienes que soltar", "Esto ocurre porque", "Esto empezó cuando" u otras fórmulas repetitivas
- PROHIBIDO escribir párrafos de más de 5 líneas. Parte en 2 si hace falta
- PROHIBIDO poner escenas tontas, genéricas o abstractas. Si no es específica y visual, no vale
- PROHIBIDO cerrar un área con una frase suave o vaga. El cierre siempre golpea`;

  const AREAS = [
    {
      id: 1,
      prompt: `Genera ÚNICAMENTE el ÁREA 1 — IDENTIDAD para esta persona: quién es por dentro, cómo se vive a sí misma, cómo se valora cuando nadie la mira, su diálogo interno.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos cortos de 55 a 70 palabras.`
    },
    {
      id: 2,
      prompt: `Genera ÚNICAMENTE el ÁREA 2 — PATRONES para esta persona: qué hace automáticamente cuando algo pasa, cómo reacciona, cómo se sabotea, por qué siempre acaba en los mismos sitios.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos cortos de 55 a 70 palabras.`
    },
    {
      id: 3,
      prompt: `Genera ÚNICAMENTE el ÁREA 3 — MIEDOS para esta persona: el miedo que más gobierna su vida sin que lo nombre, qué evita por ese miedo, qué gana al tenerlo.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos cortos de 55 a 70 palabras.`
    },
    {
      id: 4,
      prompt: `Genera ÚNICAMENTE el ÁREA 4 — HERIDA para esta persona: qué duele hoy, cuándo se dispara, qué situaciones lo reactivan, cómo afecta su presente.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos cortos de 55 a 70 palabras.`
    },
    {
      id: 5,
      prompt: `Genera ÚNICAMENTE el ÁREA 5 — AMOR para esta persona: cómo ama en pareja, qué patrón repite, por qué atrae siempre el mismo tipo de personas, qué pasa con el deseo y la intimidad.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos cortos de 55 a 70 palabras.`
    },
    {
      id: 6,
      prompt: `Genera ÚNICAMENTE el ÁREA 6 — RELACIONES para esta persona: qué rol ocupa con los demás, cómo encaja o no en grupos, qué personas atrae, por qué se acerca o se aleja.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos cortos de 55 a 70 palabras.`
    },
    {
      id: 7,
      prompt: `Genera ÚNICAMENTE el ÁREA 7 — DINERO para esta persona: cómo se relaciona con el dinero, qué pasa cuando empieza a irle bien, qué creencias tiene que no ve, cómo actúa en el trabajo.

Después del cierre normal del área, añade UN SOLO párrafo final de despedida de todo el estudio, corto y contundente (máximo 2 líneas, entre 20 y 35 palabras). Como cuando alguien que te conoce bien te dice algo al final de una conversación larga y te deja tocado. Sin consejos, sin motivación, solo una verdad que resuena.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos cortos de 55 a 70 palabras.`
    },
  ];

  const contextoPersona = `Persona:
Nombre: ${nombre}
Sexo: ${sexo}
Fecha de nacimiento: ${fechaNice}
Hora: ${hora}
Lugar: ${lugar}
Edad: ${edad} años

${cartaTexto}`;

  // Las 7 areas se piden a la vez, asi que un fallo puntual en una sola tumbaba
  // el informe entero y gastaba un intento del cliente. Ahora cada area se
  // reintenta hasta 3 veces cuando el fallo es temporal (saturacion, error del
  // servidor, corte de red). Los fallos permanentes (clave mal, peticion mal
  // formada) no se reintentan: no van a mejorar por repetirlos.
  const INTENTOS_POR_AREA = 3;

  async function pedirArea(area) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `${contextoPersona}\n\n${area.prompt}`,
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`Error en área ${area.id}: ${response.status} — ${errorText}`);
      err.temporal = response.status === 429 || response.status >= 500;
      throw err;
    }

    const data = await response.json();
    const texto = data.content?.[0]?.text || '';

    if (!texto || texto.trim().length < 100) {
      const err = new Error(`Área ${area.id} devolvió texto vacío o demasiado corto`);
      err.temporal = true;
      throw err;
    }

    return texto.trim();
  }

  async function generarArea(area) {
    let ultimoError;
    for (let intento = 1; intento <= INTENTOS_POR_AREA; intento++) {
      try {
        return await pedirArea(area);
      } catch (err) {
        ultimoError = err;
        // Un corte de red llega sin marca; se trata como temporal.
        const temporal = err.temporal !== false;
        if (!temporal || intento === INTENTOS_POR_AREA) break;
        console.warn(`Área ${area.id}: intento ${intento} fallido (${err.message.slice(0, 80)}), reintentando`);
        await new Promise(r => setTimeout(r, 1500 * intento));
      }
    }
    throw ultimoError;
  }

  try {
    // Lanzar las 7 llamadas en paralelo
    const resultados = await Promise.all(
      AREAS.map(area => generarArea(area))
    );

    // Unir con el separador que ya usa el frontend
    const textoCompleto = resultados.join('\n\n===AREA===\n\n');

    // El token viaja al navegador y de ahi a generar-pdf y save-pdf: es lo
    // que demuestra que quien pide el PDF es quien tiene la reserva.
    return res.status(200).json({ texto: textoCompleto, token: reserva.token });

  } catch (err) {
    console.error('Error generando áreas:', err.message);
    // Soltar la reserva para que el cliente pueda reintentar en el acto en
    // vez de esperar a que caduque.
    await liberar(stripe, session_id, reserva.token);
    return res.status(500).json({ error: 'Error generando el informe: ' + err.message });
  }
}


// ═════════════════════════════════════════════════════════════════
// AVISO AL ADMIN (via Brevo) — mismo formato que save-pdf.js
// ═════════════════════════════════════════════════════════════════
async function enviarEmailAdmin({ asunto, mensaje }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

  const body = {
    sender: { email: 'hola@origennatal.com', name: 'Origen Natal — Alertas' },
    to: [{ email: 'hola@origennatal.com', name: 'Admin' }],
    subject: asunto,
    htmlContent: `<pre style="font-family:monospace;background:#fff5f4;padding:16px;border-radius:8px;">${mensaje}</pre>`,
  };

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });
}
