// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Modo asustado (frames a ~60 fps, como releaseDelay).
const FRIGHT_FRAMES = 360;  // ~6 s de modo asustado
const FRIGHT_FLASH = 120;   // ~2 s de parpadeo de aviso al final
const FRIGHT_SPEED = 0.05;  // mitad de GHOST_SPEED (1/20 celda/frame)
const EYES_SPEED = 0.25;    // 2.5x: los ojos vuelven rapido (1/4)
const PEN_REDELAY = 60;     // ~1 s en la guarida antes de re-salir
const GHOST_POINTS = [ 200, 400, 800, 1600 ]; // cadena por pellet

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    frame: 0,
    frightUntil: 0, // frame de fin del modo; 0 = inactivo
    eatChain: 0,    // fantasmas comidos desde el ultimo pellet
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      frightened: false,
      // Blinky nace fuera (activo); el resto espera en la pen.
      mode: g.releaseDelay === 0 ? 'active' : 'pen',
      releaseDelay: g.releaseDelay,
      releaseAt: g.releaseDelay,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro? Pared (1) y puerta (3) bloquean a todos los actores;
// la puerta solo se cruza con la ruta guionizada de salida (moveExiting,
// que no consulta paredes).
function isWall( grid, x, y ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 ) return true; // puerta: pared para la IA; solo se cruza guionizado (moveExiting)
  return false;
}

// Puede avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot (10) o power pellet (50). El pellet ademas dispara el
    // modo asustado: reinicia temporizador y cadena, y asusta a todos
    // los no comidos (los ojos que vuelven no son azules ni comestibles).
    const v = grid[ p.y ][ p.x ];
    if ( v === 2 || v === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += v === 2 ? 10 : 50;
      game.dotsRemaining--;
      if ( v === 4 ) {
        game.frightUntil = game.frame + FRIGHT_FRAMES;
        game.eatChain = 0;
        game.ghosts.forEach( ( g ) => {
          if ( g.mode !== 'eaten' && g.mode !== 'entering' ) g.frightened = true;
        } );
      }
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Celda objetivo de cada personalidad (puede caer en muro: es solo diana
// de distancia para la persecucion greedy).
//   blinky: celda de Pac-Man.
//   pinky:  celda de Pac-Man + 4 celdas en su direccion.
//   inky:   2 * (Pac-Man + 2 celdas en su direccion) - celda de Blinky.
//   clyde:  Pac-Man de lejos; esquina inferior izquierda ({x:1,y:29}) de cerca.
function ghostTarget( game, g ) {
  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );
  const d = DIRS[ p.dir ] || { x: 0, y: 0 };

  if ( g.kind === 'pinky' ) {
    return { x: px + 4 * d.x, y: py + 4 * d.y };
  }
  if ( g.kind === 'inky' ) {
    const blinky = game.ghosts.find( ( o ) => o.kind === 'blinky' );
    const bx = blinky ? Math.round( blinky.x ) : px;
    const by = blinky ? Math.round( blinky.y ) : py;
    const ax = px + 2 * d.x;
    const ay = py + 2 * d.y;
    return { x: 2 * ax - bx, y: 2 * ay - by };
  }
  if ( g.kind === 'clyde' ) {
    const dist = Math.abs( Math.round( g.x ) - px ) + Math.abs( Math.round( g.y ) - py );
    if ( dist > 8 ) return { x: px, y: py };
    return { x: 1, y: 29 };
  }
  return { x: px, y: py };
}

function decideGhost( game, g ) {
  const grid = game.grid;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Todas las personalidades eligen la direccion valida (sin reversa) que
  // minimice la distancia Manhattan al objetivo.
  const target = ghostTarget( game, g );
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - target.x ) + Math.abs( ny - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

// Salida guionizada de la pen: alinearse a la columna de la puerta (x=13)
// y subir hasta (13,11), ya fuera. Evita que la IA greedy decida dentro de
// la guarida, donde puede estancarse.
function moveExiting( g ) {
  const step = g.speed;
  if ( Math.abs( g.x - 13 ) > step / 2 ) {
    g.dir = g.x < 13 ? 'right' : 'left';
    g.x += g.x < 13 ? step : -step;
    if ( Math.abs( g.x - 13 ) <= step / 2 ) g.x = 13;
    return;
  }
  g.x = 13;
  g.dir = 'up';
  g.y -= step;
  if ( g.y <= 11 ) {
    g.y = 11;
    g.mode = 'active';
    g.dir = 'left';
  }
}

function moveGhost( game, g ) {
  // En la pen esperan quietos hasta su frame de salida.
  if ( g.mode === 'pen' ) {
    if ( game.frame >= g.releaseAt ) g.mode = 'exiting';
    else return;
  }
  if ( g.mode === 'exiting' ) {
    moveExiting( g );
    return;
  }

  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  // Perder una vida limpia el modo asustado: nadie azul tras el reset.
  game.frightUntil = 0;
  game.eatChain = 0;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.frightened = false;
    // Vuelven a la guarida y se reescalonan las salidas desde ahora.
    g.mode = GHOST_STARTS[ i ].releaseDelay === 0 ? 'active' : 'pen';
    g.releaseAt = game.frame + GHOST_STARTS[ i ].releaseDelay;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  // Contador de frames de juego: solo avanza con la partida en marcha
  // (update solo se llama con state === 'playing').
  game.frame++;
  // Expiracion del modo asustado al inicio, antes de mover. Cambiar de
  // velocidad a mitad de celda deja offsets que jamas vuelven a alinear,
  // asi que los asustados 'active' se redondean a celda.
  if ( game.frightUntil && game.frame >= game.frightUntil ) {
    game.frightUntil = 0;
    game.eatChain = 0;
    game.ghosts.forEach( ( g ) => {
      g.frightened = false;
      if ( g.mode === 'active' ) {
        g.x = Math.round( g.x );
        g.y = Math.round( g.y );
      }
    } );
  }
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.ghostTarget = ghostTarget;
window.DIRS = DIRS;
