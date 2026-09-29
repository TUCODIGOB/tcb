// ═════════════════════════════════════════════════════════════════
// lib/nombre.js
// El nombre y los apellidos, que llegan por separado desde el formulario.
//
// LO DE ANTES VENIA JUNTO, en una sola casilla con el nombre entero, y lo que
// ya estaba guardado asi no lleva apellidos. Aqui se sigue entendiendo.
// ═════════════════════════════════════════════════════════════════

// EL NOMBRE ENTERO, para la portada y todo lo que lo lleva junto.
export function nombreCompleto(nombre, apellidos) {
  return [nombre, apellidos].map(s => String(s || '').trim()).filter(Boolean).join(' ');
}

// EL DE PILA, que es con el que se le llama. Con los apellidos aparte es la
// casilla del nombre entera, tal cual la escribio: "María Pilar". Sin ellos,
// lo de antes: la primera palabra de lo que escribio.
export function nombreDePila(nombre, apellidos) {
  const n = String(nombre || '').trim();
  if (String(apellidos || '').trim()) return n;
  return n.split(/\s+/)[0] || n;
}
