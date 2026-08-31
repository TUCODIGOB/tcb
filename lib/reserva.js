// ═════════════════════════════════════════════════════════════════
// lib/reserva.js
// Reserva de generacion: garantiza que un informe pagado se genera
// UNA sola vez, pase lo que pase.
//
// El problema que resuelve: antes, la marca "informe_completado" se
// escribia al TERMINAR el PDF, unos 95 segundos despues de empezar a
// gastar en el modelo. Durante esos 95 segundos, una recarga o el
// enlace abierto en otro sitio pasaba todas las comprobaciones y
// lanzaba una segunda generacion completa.
//
// Ahora se reserva ANTES de gastar un solo centimo, y los tres
// endpoints que cuestan dinero (chat, generar-pdf, save-pdf) van
// encadenados a esa misma reserva mediante un token.
//
// Campos que se guardan en la metadata de la sesion de Stripe:
//   generacion_token    quien tiene la reserva ahora mismo
//   generacion_desde    cuando la cogio (epoch ms), para que caduque
//   informe_completado  'si' = terminado. Definitivo, no se borra nunca.
//   intentos_informe    cuantas generaciones se han llegado a lanzar
//   email_enviado       'si' = el PDF ya salio por correo
// ═════════════════════════════════════════════════════════════════

// Techo de maxDuration en vercel.json: 300 s para chat + 300 s para
// generar-pdf. Con 10 minutos, una reserva solo caduca si la funcion
// murio sin poder liberarla (timeout duro o caida del contenedor).
export const VENTANA_MS = 10 * 60 * 1000;

// Generaciones que se permiten por compra: el intento que falla + 1 mas.
export const MAX_INTENTOS = 2;

// Espera entre reservar y comprobar que la reserva es nuestra. Cubre el
// tiempo que tarda en propagarse la escritura de un competidor que leyo
// la metadata a la vez que nosotros. Ver "confirmarReserva" mas abajo.
const ESPERA_CONFIRMACION_MS = 1500;

export function nuevoToken() {
  // Sin dependencias: suficiente para distinguir dos peticiones
  // simultaneas, que es lo unico para lo que se usa.
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

// Dice si una compra da derecho a informe. No hace red.
//
// Stripe cierra una compra de dos maneras: "paid" cuando ha entrado dinero, y
// "no_payment_required" cuando el total era 0 porque se uso un cupon del 100%.
// Las dos son compras legitimas, asi que las dos valen; con la segunda se
// pueden regalar informes sin que la herramienta los rechace.
//
// La diferencia esta en lo que hay que exigir a cada una. "paid" ya prueba por
// si sola que el cobro se hizo. "no_payment_required", en cambio, es el valor
// con el que NACEN todas las sesiones de importe cero, aun sin terminar, asi
// que ahi ademas se exige que Stripe de la sesion por COMPLETADA: una abierta o
// caducada no pasa. Sin eso, un enlace a medias daria informe gratis.
export function compraValida(session) {
  if (!session) return false;
  if (session.payment_status === 'paid') return true;
  return session.payment_status === 'no_payment_required' && session.status === 'complete';
}

// Dice de QUE producto es una compra. No hace red.
//
// compraValida dice si se pago; esto dice que se pago. Los dos hacen falta:
// cada producto se entrega por su camino, y un camino solo atiende lo suyo.
// Sin esto, el recibo de un producto abriria la entrega de otro.
//
// Una compra sin marca es del p1: las de antes de empezar a marcarlas solo
// pueden serlo, porque era el unico producto que existia.
export function esDelProducto(session, producto) {
  return (session?.metadata?.producto || 'p1') === producto;
}

// Lee el estado de una sesion ya recuperada de Stripe. No hace red.
export function estado(session, ahora = Date.now()) {
  const m = session?.metadata || {};
  const desde = parseInt(m.generacion_desde || '0', 10) || 0;
  return {
    completado: m.informe_completado === 'si',
    // "ocupada" = alguien la reservo hace poco y sigue trabajando
    ocupada: Boolean(m.generacion_token) && desde > 0 && ahora - desde < VENTANA_MS,
    token: m.generacion_token || '',
    intentos: parseInt(m.intentos_informe || '0', 10) || 0,
    emailEnviado: m.email_enviado === 'si',
  };
}

// Escribe metadata SIN pisar lo que hayan escrito otros mientras tanto:
// vuelve a leer la sesion justo antes de escribir, en vez de usar una
// foto vieja. Stripe reemplaza el objeto metadata entero en cada update,
// asi que partir de una foto de hace 95 segundos borra todo lo escrito
// en ese hueco.
async function fusionarMetadata(stripe, session_id, cambios) {
  const fresca = await stripe.checkout.sessions.retrieve(session_id);
  return stripe.checkout.sessions.update(session_id, {
    metadata: { ...(fresca.metadata || {}), ...cambios },
  });
}

// Coge la reserva. Devuelve { ok: true, token } o { ok: false, code }.
//
// Dos peticiones que lleguen con menos de ~350 ms de diferencia leen las
// dos la metadata antes de que ninguna haya escrito, asi que las dos se
// creen ganadoras. Por eso, despues de escribir, esperamos y volvemos a
// leer: si el token guardado ya no es el nuestro, es que llego otra
// detras y cedemos. Como la ultima escritura es la que queda, de N
// peticiones simultaneas sobrevive exactamente una.
export async function reservar(stripe, session_id, session) {
  const token = nuevoToken();
  const previos = estado(session).intentos;

  await fusionarMetadata(stripe, session_id, {
    generacion_token: token,
    generacion_desde: String(Date.now()),
    intentos_informe: String(previos + 1),
  });

  await new Promise(r => setTimeout(r, ESPERA_CONFIRMACION_MS));

  // Si no se puede confirmar (un fallo de red de Stripe justo aqui), se suelta
  // la reserva y se cede. Dejarla cogida sin poder confirmarla dejaria al
  // cliente esperando a que caduque, diez minutos, sin motivo.
  let comprobar;
  try {
    comprobar = await stripe.checkout.sessions.retrieve(session_id);
  } catch (err) {
    console.error('No se pudo confirmar la reserva:', err.message);
    await liberar(stripe, session_id, token);
    return { ok: false, code: 409 };
  }

  if (comprobar?.metadata?.generacion_token !== token) {
    return { ok: false, code: 409 };
  }
  return { ok: true, token };
}

// Suelta la reserva para que el cliente pueda reintentar en el acto.
// Solo la suelta si sigue siendo nuestra: si otro la cogio ya, no la
// tocamos. Nunca lanza: liberar es siempre secundario a lo que estaba
// haciendo quien llama.
export async function liberar(stripe, session_id, token) {
  try {
    const fresca = await stripe.checkout.sessions.retrieve(session_id);
    if (fresca?.metadata?.generacion_token !== token) return;
    await stripe.checkout.sessions.update(session_id, {
      metadata: { ...(fresca.metadata || {}), generacion_desde: '' },
    });
  } catch (err) {
    console.error('No se pudo liberar la reserva:', err.message);
  }
}

// Marca el informe como terminado. Definitivo: a partir de aqui nadie
// vuelve a generar nada para esta compra. Se deja generacion_token para
// que save-pdf pueda comprobar que quien envia el correo es el mismo que
// genero el PDF, y se borra generacion_desde para que no quede "ocupada".
export async function completar(stripe, session_id) {
  return fusionarMetadata(stripe, session_id, {
    informe_completado: 'si',
    generacion_desde: '',
  });
}

export async function marcarEmailEnviado(stripe, session_id) {
  return fusionarMetadata(stripe, session_id, { email_enviado: 'si' });
}
