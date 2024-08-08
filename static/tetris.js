const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scale = 20;
context.scale(scale, scale);

function crearMatriz(ancho, alto) {
    const matriz = [];
    while (alto--) {
        matriz.push(new Array(ancho).fill(0));
    }
    return matriz;
}

function dibujar() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    dibujarMatriz(tablero, {x: 0, y: 0});
    dibujarMatriz(jugador.matriz, jugador.pos);
}

function dibujarMatriz(matriz, offset) {
    matriz.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = 'red';
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function actualizar(time = 0) {
    const deltaTime = time - ultimoTiempo;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        jugadorDrop();
    }
    ultimoTiempo = time;
    dibujar();
    requestAnimationFrame(actualizar);
}

function colision(tablero, jugador) {
    const [m, o] = [jugador.matriz, jugador.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (tablero[y + o.y] &&
                tablero[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function fusionar(tablero, jugador) {
    jugador.matriz.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                tablero[y + jugador.pos.y][x + jugador.pos.x] = value;
            }
        });
    });
}

function jugadorDrop() {
    jugador.pos.y++;
    if (colision(tablero, jugador)) {
        jugador.pos.y--;
        fusionar(tablero, jugador);
        jugadorReset();
        tableroLimpiar();
    }
    dropCounter = 0;
}

function jugadorMover(direccion) {
    jugador.pos.x += direccion;
    if (colision(tablero, jugador)) {
        jugador.pos.x -= direccion;
    }
}

function jugadorReset() {
    const piezas = 'ILJOTSZ';
    jugador.matriz = crearPieza(piezas[piezas.length * Math.random() | 0]);
    jugador.pos.y = 0;
    jugador.pos.x = (tablero[0].length / 2 | 0) -
                   (jugador.matriz[0].length / 2 | 0);
    if (colision(tablero, jugador)) {
        tablero.forEach(row => row.fill(0));
    }
}

function jugadorRotar(direccion) {
    const pos = jugador.pos.x;
    let offset = 1;
    rotar(jugador.matriz, direccion);
    while (colision(tablero, jugador)) {
        jugador.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > jugador.matriz[0].length) {
            rotar(jugador.matriz, -direccion);
            jugador.pos.x = pos;
            return;
        }
    }
}

function rotar(matriz, direccion) {
    for (let y = 0; y < matriz.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matriz[x][y],
                matriz[y][x],
            ] = [
                matriz[y][x],
                matriz[x][y],
            ];
        }
    }

    if (direccion > 0) {
        matriz.forEach(row => row.reverse());
    } else {
        matriz.reverse();
    }
}

function crearPieza(tipo) {
    if (tipo === 'I') {
        return [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
        ];
    } else if (tipo === 'L') {
        return [
            [0, 2, 0],
            [0, 2, 0],
            [0, 2, 2],
        ];
    } else if (tipo === 'J') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [3, 3, 0],
        ];
    } else if (tipo === 'O') {
        return [
            [4, 4],
            [4, 4],
        ];
    } else if (tipo === 'Z') {
        return [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0],
        ];
    } else if (tipo === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (tipo === 'T') {
        return [
            [0, 7, 0],
            [7, 7, 7],
            [0, 0, 0],
        ];
    }
}

function tableroLimpiar() {
    outer: for (let y = tablero.length - 1; y > 0; --y) {
        for (let x = 0; x < tablero[y].length; ++x) {
            if (tablero[y][x] === 0) {
                continue outer;
            }
        }

        const row = tablero.splice(y, 1)[0].fill(0);
        tablero.unshift(row);
        ++y;
    }
}

const tablero = crearMatriz(10, 20);
const jugador = {
    pos: {x: 0, y: 0},
    matriz: null,
};

let dropCounter = 0;
let dropInterval = 1000;
let ultimoTiempo = 0;

document.addEventListener('keydown', event => {
    if (event.keyCode === 37) {
        jugadorMover(-1);
    } else if (event.keyCode === 39) {
        jugadorMover(1);
    } else if (event.keyCode === 40) {
        jugadorDrop();
    } else if (event.keyCode === 81) {
        jugadorRotar(-1);
    } else if (event.keyCode === 87) {
        jugadorRotar(1);
    }
});

jugadorReset();
actualizar();
