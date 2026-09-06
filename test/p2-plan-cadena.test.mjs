// ═════════════════════════════════════════════════════════════════
// test/p2-plan-cadena.test.mjs
//
// Pasa el P2 entero de punta a punta con el modelo y R2 simulados: la
// lista de informes, la llamada que decide, las siete que escriben, la
// hoja de ruta y el PDF. Sin red, sin gastar ni un centimo y sin tocar
// ningun informe de nadie.
//
// PARA QUE SIRVE. El P2 son nueve llamadas encadenadas donde lo que sale
// de una entra en la siguiente. Un nombre de casilla cambiado en un sitio
// y no en otro no rompe nada al arrancar: rompe a mitad de una generacion
// de verdad, con la clienta esperando y el dinero ya gastado. Esto lo caza
// antes, en dos segundos.
//
// LO QUE COMPRUEBA, Y LO QUE NO. Comprueba que la cadena esta bien atada:
// que cada paso recibe lo que espera, que salen las siete parcelas con sus
// cinco casillas, que la hoja de ruta las lleva todas y que el PDF se monta.
// NO comprueba que el texto sea bueno: eso solo se sabe leyendolo.
//
// EL MODELO SIMULADO CONTESTA BIEN A PROPOSITO: textos con la largura que
// se les pide, en parrafos y sin quedarse a medias. Asi, si salta una red
// de las de dentro, es que la red esta mal calibrada y no que el texto lo
// este.
//
// Ejecutar:  node test/p2-plan-cadena.test.mjs
// ═════════════════════════════════════════════════════════════════

import test from 'node:test';
import assert from 'node:assert/strict';

// Las variables que el P2 mira antes de hablar con R2. Valores de mentira:
// las peticiones no salen de aqui.
process.env.INFORME_P1_CLOUDFLARE_ACCOUNT_ID ??= 'cuenta-de-prueba';
process.env.INFORME_P1_CLOUDFLARE_ACCESS_KEY_ID ??= 'clave-de-prueba';
process.env.INFORME_P1_CLOUDFLARE_SECRET_ACCESS_KEY ??= 'secreto-de-prueba';
process.env.INFORME_P1_CLOUDFLARE_BUCKET_NAME ??= 'bucket-de-prueba';
process.env.ANTHROPIC_API_KEY ??= 'clave-de-prueba';

const AREAS = ['IDENTIDAD', 'PATRONES', 'MIEDOS', 'HERIDA', 'AMOR', 'RELACIONES', 'DINERO'];
const IDS = ['identidad', 'patrones', 'miedos', 'herida', 'amor', 'relaciones', 'dinero'];
const PUNTOS = ['tuPrueba', 'queHaces', 'cuando', 'dondeTeCaes', 'cuandoTeCaes'];

// Lo minimo que se le pide a cada casilla, y el tope del "cuando". Si esto
// cambia en el fichero de verdad, aqui hay que cambiarlo tambien: el modelo
// simulado tiene que contestar por encima del minimo y por debajo del tope,
// o saltan las redes y la prueba deja de probar la cadena.
const LARGURAS = { tuPrueba: 140, queHaces: 260, cuando: 110, dondeTeCaes: 130, cuandoTeCaes: 110 };

const INFORME = {
  cliente: { nombre: 'Ana', sexo: 'mujer' },
  rasgos: {
    fortalezas: AREAS.map((area, i) => ({
      area, nombre: `Fortaleza ${i}`, descripcion: `Se le da bien lo ${i} de esta parcela.`,
    })),
    desafios: AREAS.map((area, i) => ({
      area, nombre: `Desafío ${i}`, descripcion: `Le cuesta lo ${i} de esta parcela.`,
      causa: `Le viene de lo ${i}.`,
    })),
  },
};

// Un texto con la largura pedida, en dos parrafos, terminado en punto y con
// marcas de que-hacer, que es lo que las redes buscan.
const frase = (sem, i) =>
  `Cuando notes que ${sem} otra vez ${i}, en vez de lo de siempre haces esto y vas a ver que cambia la primera vez que lo pruebes.`;
const parrafo = (cuantas, sem) =>
  Array.from({ length: cuantas }, (_, i) => frase(sem, i)).join(' ');
const bloque = (palabras, sem) => {
  const porParrafo = Math.max(1, Math.round(palabras / 25 / 2));
  return `${parrafo(porParrafo, sem)}\n\n${parrafo(porParrafo, sem)}`;
};

// Cada parcela decide algo SIN NINGUNA PALABRA EN COMUN con las otras seis: si
// se parecieran saltaria la red que mira que no manden hacer lo mismo, y esta
// prueba va del camino bueno, no de esa red.
const PALABRAS = [
  'zafiro cobalto membrillo tejado nutria pizarra brisa',
  'guitarra almendra tornillo cordel avispa ladrillo helecho',
  'faro caramelo tobillo cuerda mejillon adoquin musgo',
  'barniz pistacho rodilla soga libelula travesano junco',
  'linterna canela codo alambre erizo viga liquen',
  'brujula nuez muneca hilo salmon dintel ortiga',
  'timon platano hombro bramante gorrion umbral trebol',
];
const decidido = (id, i) => {
  const o = { area: id };
  PUNTOS.forEach((punto, j) => { o[punto] = `${PALABRAS[i].split(' ')[j]} ${PALABRAS[i].split(' ')[j + 2]}.`; });
  return o;
};

function respuestaEnTrozos(objeto) {
  const texto = JSON.stringify(objeto);
  return new Response(new ReadableStream({
    start(c) {
      const linea = o => c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(o)}\n`));
      linea({ type: 'content_block_delta', delta: { type: 'text_delta', text: texto } });
      linea({ type: 'message_delta', delta: { stop_reason: 'end_turn' } });
      c.close();
    },
  }), { status: 200 });
}

test('el P2 entero, de la lista al PDF', async () => {
  const llamadas = [];
  const fetchDeVerdad = globalThis.fetch;

  globalThis.fetch = async (url, opciones) => {
    const donde = String(url);

    if (donde.includes('r2.cloudflarestorage.com')) {
      return donde.includes('list-type')
        ? new Response('<Contents><Key>p1/COMPRA1.json</Key><LastModified>2026-09-01T10:00:00Z</LastModified></Contents>', { status: 200 })
        : new Response(JSON.stringify(INFORME), { status: 200 });
    }

    const cuerpo = JSON.parse(opciones.body);
    llamadas.push({ modelo: cuerpo.model, piensa: cuerpo.output_config?.effort || '' });
    const campos = cuerpo.output_config.format.schema.properties;

    if (campos.partes) return respuestaEnTrozos({ partes: IDS.map(decidido) });
    if (campos.elOrden) {
      return respuestaEnTrozos({
        empiezaPor: 'miedos',
        porDondeEmpiezas: parrafo(5, 'empieza'),
        elOrden: IDS.map(id => ({ area: id, queHaces: parrafo(3, id) })),
        siLoDejas: parrafo(5, 'vuelve'),
      });
    }
    const parte = {};
    for (const punto of PUNTOS) parte[punto] = bloque(LARGURAS[punto], punto);
    return respuestaEnTrozos(parte);
  };

  try {
    const { default: plan } = await import('../api/p2-plan/prueba.js');
    const { default: maqueta } = await import('../api/p2-plan/pdf.js');

    const llamar = async (handler, body) => {
      let salida, codigo;
      await handler({ method: 'POST', body }, {
        status(c) { codigo = c; return this; },
        json(d) { salida = d; return this; },
        setHeader() {}, send() { return this; },
      });
      return { codigo, salida };
    };

    // 1. La lista de informes guardados, con el nombre de quien compro.
    const lista = await llamar(plan, { accion: 'lista' });
    assert.equal(lista.codigo, 200);
    assert.equal(lista.salida.informes[0].nombre, 'Ana');

    // 2. La que decide: las siete parcelas, cada una con sus cinco casillas.
    const elPlan = await llamar(plan, { accion: 'plan', compra: 'COMPRA1' });
    assert.equal(elPlan.codigo, 200, `la que decide ha fallado: ${elPlan.salida.error}`);
    assert.equal(elPlan.salida.plan.partes.length, AREAS.length, 'tienen que salir las siete parcelas');
    assert.equal(elPlan.salida.quien.nombre, 'Ana');
    for (const parte of elPlan.salida.plan.partes) {
      for (const punto of PUNTOS) assert.ok(parte[punto], `${parte.area} viene sin ${punto}`);
    }

    // 3. Las siete que escriben, cada una con su parcela decidida.
    const escritas = [];
    for (const suyo of elPlan.salida.plan.partes) {
      const r = await llamar(plan, { accion: 'parte', nombre: 'Ana', sexo: 'mujer', decidido: suyo });
      assert.equal(r.codigo, 200, `la parte de ${suyo.area} ha fallado: ${r.salida.error}`);
      for (const punto of PUNTOS) assert.ok(r.salida.parte[punto], `${suyo.area} escrita sin ${punto}`);
      escritas.push(r.salida.parte);
    }
    assert.equal(escritas.length, AREAS.length);

    // 4. La hoja de ruta, que lee las siete ya escritas.
    const hoja = await llamar(plan, { accion: 'hoja', nombre: 'Ana', sexo: 'mujer', partes: escritas });
    assert.equal(hoja.codigo, 200, `la hoja de ruta ha fallado: ${hoja.salida.error}`);
    assert.equal(hoja.salida.hoja.elOrden.length, AREAS.length, 'el orden lleva las siete');
    assert.equal(hoja.salida.hoja.elOrden[0].area, hoja.salida.hoja.empiezaPor,
      'la primera del orden tiene que ser por la que empieza');
    for (const paso of hoja.salida.hoja.elOrden) assert.ok(paso.titulo, 'un paso sin titulo');

    // 5. Y el PDF, montado con todo lo anterior.
    let pdf, codigoPdf;
    await maqueta({
      method: 'POST',
      body: {
        nombre: 'Ana',
        hoja: hoja.salida.hoja,
        partes: escritas.map(p => ({ ...p, etiqueta: p.id.toUpperCase() })),
      },
    }, { status(c) { codigoPdf = c; return this; }, json(d) { pdf = d; return this; } });
    assert.equal(codigoPdf, 200, `el PDF ha fallado: ${pdf?.error}`);
    assert.ok(pdf.pdfBase64.startsWith('data:application/pdf'), 'el PDF no sale como PDF');

    // 6. Y que cada llamada la haga quien tiene que hacerla. La que decide es
    //    la unica que piensa a fondo; las que escriben no piensan, que es de
    //    donde sale que esto no tarde diez minutos.
    const laQueDecide = llamadas[0];
    assert.equal(laQueDecide.modelo, 'claude-opus-5');
    assert.equal(laQueDecide.piensa, 'medium');
    const lasQueEscriben = llamadas.filter(c => c.modelo === 'claude-sonnet-5' && c.piensa === '');
    assert.ok(lasQueEscriben.length >= AREAS.length,
      `las siete que escriben no pueden pensar, y solo ${lasQueEscriben.length} no piensan`);
  } finally {
    globalThis.fetch = fetchDeVerdad;
  }
});
