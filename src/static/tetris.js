// Métodos de ayuda
function obtener(id)        { return document.getElementById(id);  }
function ocultar(id)       { obtener(id).style.visibility = 'hidden'; }
function mostrar(id)       { obtener(id).style.visibility = null;     }
function html(id, html) { obtener(id).innerHTML = html;            }
function marcaDeTiempo()           { return new Date().getTime();                             }
function aleatorio(min, max)      { return (min + (Math.random() * (max - min)));            }
function eleccionAleatoria(choices) { return choices[Math.round(aleatorio(0, choices.length-1))]; }

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
                                 window.mozRequestAnimationFrame    ||
                                 window.oRequestAnimationFrame      ||
                                 window.msRequestAnimationFrame     ||
                                 function(callback, element) {
                                   window.setTimeout(callback, 1000 / 60);
                                 }
}

// Constantes del juego
var TECLA     = { ESC: 27, ESPACIO: 32, IZQUIERDA: 37, ARRIBA: 38, DERECHA: 39, ABAJO: 40 },
    DIR     = { ARRIBA: 0, DERECHA: 1, ABAJO: 2, IZQUIERDA: 3, MIN: 0, MAX: 3 },
    canvas  = obtener('canvas'),
    ctx     = canvas.getContext('2d'),
    ucanvas = obtener('proximo'),
    uctx    = ucanvas.getContext('2d'),
    velocidad   = { inicio: 0.6, decremento: 0.005, min: 0.1 }, // tiempo antes de que la pieza caiga por una fila (segundos)
    nx      = 10, // ancho de la cancha de tetris (en bloques)
    ny      = 20, // altura de la cancha de tetris (en bloques)
    nu      = 5;  // ancho/alto de la vista previa de la próxima pieza (en bloques)

// Variables del juego (inicializadas durante el reinicio)
var dx, dy,        // tamaño en píxeles de un solo bloque de tetris
    bloques,        // array bidimensional (nx*ny) que representa la cancha de tetris - bloque vacío o ocupado por una 'pieza'
    acciones,       // cola de acciones del usuario (entradas)
    jugando,       // true|false - el juego está en progreso
    dt,            // tiempo desde el inicio de este juego
    actual,       // la pieza actual
    siguiente,    // la próxima pieza
    puntuacion,         // la puntuación actual
    vpuntuacion,        // la puntuación actualmente mostrada (se pone al día con la puntuación en pequeños incrementos - como una máquina tragamonedas giratoria)
    filas,          // número de filas completadas en el juego actual
    paso;          // tiempo antes de que la pieza actual caiga por una fila

// Piezas de tetris
var i = { tamaño: 4, bloques: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan'   };
var j = { tamaño: 3, bloques: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue'   };
var l = { tamaño: 3, bloques: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' };
var o = { tamaño: 2, bloques: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' };
var s = { tamaño: 3, bloques: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green'  };
var t = { tamaño: 3, bloques: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' };
var z = { tamaño: 3, bloques: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red'    };

// Iterar a través de cada bloque ocupado (x,y) para una pieza dada
function cadaBloque(tipo, x, y, dir, fn) {
  var bit, resultado, fila = 0, col = 0, bloques = tipo.bloques[dir];
  for(bit = 0x8000 ; bit > 0 ; bit = bit >> 1) {
    if (bloques & bit) {
      fn(x + col, y + fila);
    }
    if (++col === 4) {
      col = 0;
      ++fila;
    }
  }
}

// Comprobar si una pieza puede caber en una posición en la cuadrícula
function ocupado(tipo, x, y, dir) {
  var resultado = false
  cadaBloque(tipo, x, y, dir, function(x, y) {
    if ((x < 0) || (x >= nx) || (y < 0) || (y >= ny) || obtenerBloque(x,y))
      resultado = true;
  });
  return resultado;
}

function desocupado(tipo, x, y, dir) {
  return !ocupado(tipo, x, y, dir);
}

// Comenzar con 4 instancias de cada pieza y elegir al azar hasta que la 'bolsa esté vacía'
var piezas = [];
function piezaAleatoria() {
  if (piezas.length == 0)
    piezas = [i,i,i,i,j,j,j,j,l,l,l,l,o,o,o,o,s,s,s,s,t,t,t,t,z,z,z,z];
  var tipo = piezas.splice(aleatorio(0, piezas.length-1), 1)[0];
  return { tipo: tipo, dir: DIR.ARRIBA, x: Math.round(aleatorio(0, nx - tipo.tamaño)), y: 0 };
}

// BUCLE DEL JUEGO
function ejecutar() {
  agregarEventos(); // adjuntar eventos keydown y resize

  var ultimo = ahora = marcaDeTiempo();
  function cuadro() {
    ahora = marcaDeTiempo();
    actualizar(Math.min(1, (ahora - ultimo) / 1000.0)); // usando requestAnimationFrame se debe poder manejar grandes deltas causados cuando 'hibernar' en una pestaña en segundo plano o no visible
    dibujar();
    ultimo = ahora;
    requestAnimationFrame(cuadro, canvas);
  }

  redimensionar(); // configurar toda nuestra información de tamaño
  reiniciar();  // reiniciar las variables por juego
  cuadro();  // iniciar el primer cuadro
}

function agregarEventos() {
  document.addEventListener('keydown', teclaPresionada, false);
  window.addEventListener('resize', redimensionar, false);
}

function redimensionar(event) {
  canvas.width   = canvas.clientWidth;  // establecer tamaño lógico del canvas igual a su tamaño físico
  canvas.height  = canvas.clientHeight; // (ídem)
  ucanvas.width  = ucanvas.clientWidth;
  ucanvas.height = ucanvas.clientHeight;
  dx = canvas.width  / nx; // tamaño en píxeles de un solo bloque de tetris
  dy = canvas.height / ny; // (ídem)
  invalidar();
  invalidarProximo();
}

function teclaPresionada(ev) {
  var manejado = false;
  if (jugando) {
    switch(ev.keyCode) {
      case TECLA.IZQUIERDA:   acciones.push(DIR.IZQUIERDA);  manejado = true; break;
      case TECLA.DERECHA:  acciones.push(DIR.DERECHA); manejado = true; break;
      case TECLA.ARRIBA:     acciones.push(DIR.ARRIBA);    manejado = true; break;
      case TECLA.ABAJO:   acciones.push(DIR.ABAJO);  manejado = true; break;
      case TECLA.ESC:    perder();                  manejado = true; break;
    }
  }
  else if (ev.keyCode == TECLA.ESPACIO) {
    iniciar();
    manejado = true;
  }
  if (manejado)
    ev.preventDefault(); // prevenir que las teclas de flecha desplacen la página (compatible con IE9+ y todos los demás navegadores)
}

// LÓGICA DEL JUEGO
function iniciar() { ocultar('inicio'); reiniciar(); jugando = true;  }
function perder() { mostrar('inicio'); establecerPuntuacionVisual(); jugando = false; }

function establecerPuntuacionVisual(n)      { vpuntuacion = n || puntuacion; invalidarPuntuacion(); }
function establecerPuntuacion(n)            { puntuacion = n; establecerPuntuacionVisual(n);  }
function agregarPuntuacion(n)            { puntuacion = puntuacion + n;   }
function borrarPuntuacion()           { establecerPuntuacion(0); }
function borrarFilas()            { establecerFilas(0); }
function establecerFilas(n)             { filas = n; paso = Math.max(velocidad.min, velocidad.inicio - (velocidad.decremento*filas)); invalidarFilas(); }
function agregarFilas(n)             { establecerFilas(filas + n); }
function obtenerBloque(x,y)          { return (bloques && bloques[x] ? bloques[x][y] : null); }
function establecerBloque(x,y,tipo)     { bloques[x] = bloques[x] || []; bloques[x][y] = tipo; invalidar(); }
function borrarBloques()          { bloques = []; invalidar(); }
function borrarAcciones()         { acciones = []; }
function establecerPiezaActual(pieza) { actual = pieza || piezaAleatoria(); invalidar();     }
function establecerProximaPieza(pieza)    { siguiente    = pieza || piezaAleatoria(); invalidarProximo(); }

function reiniciar() {
  dt = 0;
  borrarAcciones();
  borrarBloques();
  borrarFilas();
  borrarPuntuacion();
  establecerPiezaActual(siguiente);
  establecerProximaPieza();
}

function actualizar(idt) {
  if (jugando) {
    if (vpuntuacion < puntuacion)
      establecerPuntuacionVisual(vpuntuacion + 1);
    manejar(acciones.shift());
    dt = dt + idt;
    if (dt > paso) {
      dt = dt - paso;
      dejarCaer();
    }
  }
}

function manejar(accion) {
  switch(accion) {
    case DIR.IZQUIERDA:  mover(DIR.IZQUIERDA);  break;
    case DIR.DERECHA: mover(DIR.DERECHA); break;
    case DIR.ARRIBA:    rotar();        break;
    case DIR.ABAJO:  dejarCaer();          break;
  }
}

function mover(dir) {
  var x = actual.x, y = actual.y;
  switch(dir) {
    case DIR.DERECHA: x = x + 1; break;
    case DIR.IZQUIERDA:  x = x - 1; break;
    case DIR.ABAJO:  y = y + 1; break;
  }
  if (desocupado(actual.tipo, x, y, actual.dir)) {
    actual.x = x;
    actual.y = y;
    invalidar();
    return true;
  }
  else {
    return false;
  }
}

function rotar() {
  var nuevaDir = (actual.dir == DIR.MAX ? DIR.MIN : actual.dir + 1);
  if (desocupado(actual.tipo, actual.x, actual.y, nuevaDir)) {
    actual.dir = nuevaDir;
    invalidar();
  }
}

function dejarCaer() {
  if (!mover(DIR.ABAJO)) {
    agregarPuntuacion(10);
    dejarCaerPieza();
    removerFilas();
    establecerPiezaActual(siguiente);
    establecerProximaPieza(piezaAleatoria());
    borrarAcciones();
    if (ocupado(actual.tipo, actual.x, actual.y, actual.dir)) {
      perder();
    }
  }
}

function dejarCaerPieza() {
  cadaBloque(actual.tipo, actual.x, actual.y, actual.dir, function(x, y) {
    establecerBloque(x, y, actual.tipo);
  });
}

function removerFilas() {
  var x, y, completo, n = 0;
  for(y = ny ; y > 0 ; --y) {
    completo = true;
    for(x = 0 ; x < nx ; ++x) {
      if (!obtenerBloque(x, y))
        completo = false;
    }
    if (completo) {
      removerFila(y);
      y = y + 1; // volver a comprobar la misma línea
      n++;
    }
  }
  if (n > 0) {
    agregarFilas(n);
    agregarPuntuacion(100*Math.pow(2,n-1)); // 1: 100, 2: 200, 3: 400, 4: 800
  }
}

function removerFila(n) {
  var x, y;
  for(y = n ; y >= 0 ; --y) {
    for(x = 0 ; x < nx ; ++x)
      establecerBloque(x, y, (y == 0) ? null : obtenerBloque(x, y-1));
  }
}

// RENDERIZADO
var invalido = {};

function invalidar()         { invalido.corte  = true; }
function invalidarProximo()     { invalido.proximo   = true; }
function invalidarPuntuacion()    { invalido.puntuacion  = true; }
function invalidarFilas()     { invalido.filas   = true; }

function dibujar() {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.translate(0.5, 0.5); // para líneas negras nítidas de 1px
  dibujarCorte();
  dibujarProximo();
  dibujarPuntuacion();
  dibujarFilas();
  ctx.restore();
}

function dibujarCorte() {
  if (invalido.corte) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (jugando)
      dibujarPieza(ctx, actual.tipo, actual.x, actual.y, actual.dir);
    var x, y, bloque;
    for(y = 0 ; y < ny ; y++) {
      for (x = 0 ; x < nx ; x++) {
        if (bloque = obtenerBloque(x,y))
          dibujarBloque(ctx, x, y, bloque.color);
      }
    }
    ctx.strokeRect(0, 0, nx*dx - 1, ny*dy - 1); // límite de la cancha
    invalido.corte = false;
  }
}

function dibujarProximo() {
  if (invalido.proximo) {
    var relleno = (nu - siguiente.tipo.tamaño) / 2; // intento a medias de centrar la vista previa de la próxima pieza
    uctx.save();
    uctx.translate(0.5, 0.5);
    uctx.clearRect(0, 0, nu*dx, nu*dy);
    dibujarPieza(uctx, siguiente.tipo, relleno, relleno, siguiente.dir);
    uctx.strokeStyle = 'black';
    uctx.strokeRect(0, 0, nu*dx - 1, nu*dy - 1);
    uctx.restore();
    invalido.proximo = false;
  }
}

function dibujarPuntuacion() {
  if (invalido.puntuacion) {
    html('puntuacion', ("00000" + Math.floor(vpuntuacion)).slice(-5));
    invalido.puntuacion = false;
  }
}

function dibujarFilas() {
  if (invalido.filas) {
    html('filas', filas);
    invalido.filas = false;
  }
}

function dibujarPieza(ctx, tipo, x, y, dir) {
  cadaBloque(tipo, x, y, dir, function(x, y) {
    dibujarBloque(ctx, x, y, tipo.color);
  });
}

function dibujarBloque(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x*dx, y*dy, dx, dy);
  ctx.strokeRect(x*dx, y*dy, dx, dy)
}

// Finalmente, ejecutar el juego
ejecutar();
