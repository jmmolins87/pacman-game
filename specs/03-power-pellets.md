# SPEC 03 — Power pellets en las cuatro esquinas

> **Estado:** Aprobado
> **Depende de:** ninguna
> **Fecha:** 2026-09-20
> **Objetivo:** Los cuatro power pellets del arcade en las esquinas del laberinto,
> comibles por 50 puntos y contando para ganar, sin modo asustado (spec futura).

## Por qué existe esta spec

SPEC 01 y SPEC 02 aplazaron "modo asustado y power pellets" a una spec propia. Esta
spec añade la mitad de datos del dúo —colocación, puntos y condición de victoria—
y deja explícitamente el efecto sobre los fantasmas para la siguiente.

## Alcance

**In:**

- `src/js/maze.js`: char `o` (power pellet, valor 4) en (1,3), (26,3), (1,23) y
  (26,23); `parseTile` devuelve 4; comentario de cabecera actualizado.
- `src/js/game.js`: `createGame` cuenta los valores 4 en `dotsRemaining`;
  `movePacman` come el 4 (+50 puntos, decremento, celda a 0).
- `src/js/render.js`: `drawDots` dibuja el valor 4 como círculo grande estático.
- `AGENTS.md`: la regla de valores de celda en "Reglas del grid" añade `4`.

**Fuera de alcance (specs futuras):**

- Modo asustado: fantasmas azules, comibles y puntos en cadena 200/400/800/1600.
- Regreso de fantasmas comidos a la guarida (ruta guionizada de bajada).
- Parpadeo/pulsación del pellet.
- Cambiar valor o comportamiento de los dots normales.

## Modelo de datos

```js
// maze.js — dos filas de MAZE_STR cambian '.' por 'o' en cols 1 y 26
'#o####.#####.##.#####.####o#', // 3
'#o..##................##..o#', // 23  fila inicio Pacman

function parseTile( ch ) {
  // ...
  if ( ch === 'o' ) return 4; // power pellet
}

// game.js — createGame cuenta dots y pellets
for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) dots++;

// game.js — movePacman come dot (10) o pellet (50)
const v = grid[ p.y ][ p.x ];
if ( v === 2 || v === 4 ) {
  grid[ p.y ][ p.x ] = 0;
  game.score += v === 2 ? 10 : 50;
  game.dotsRemaining--;
}

// render.js — drawDots: radio según valor de celda
const r = grid[ y ][ x ] === 4 ? 6.5 : 2.5;
```

Convenciones: el pellet es una celda más del grid (valor 4), igual que el dot (2);
`MAZE` sigue pristino y `game.grid` es lo único que se muta.

## Plan de implementación

1. `src/js/maze.js`: sustituir `.` por `o` en las 4 celdas, añadir la rama de `o` en
   `parseTile` y el char a la cabecera. Manual: el juego carga con consola limpia; en
   consola, `MAZE[3][1] === 4` y `MAZE[23][26] === 4` son true.
2. `src/js/render.js`: en `drawDots`, radio 6.5 para el valor 4. Manual: 4 círculos
   grandes visibles en las esquinas, mismo color que los dots; Pac-Man pasa por
   encima sin comerlos todavía.
3. `src/js/game.js`: contar 2 y 4 en `dotsRemaining` y unificar el comer en
   `movePacman`. Manual: comer un pellet suma 50 y lo borra; comer todos los dots y
   los 4 pellets muestra GANASTE.
4. `AGENTS.md`: añadir `4` power pellet a la lista de valores de celda. Manual:
   releer "Reglas del grid" y confirmar que describe el código.

## Criterios de aceptación

- [ ] El juego carga sin errores en la consola.
- [ ] Hay 4 círculos grandes visibles al inicio en (1,3), (26,3), (1,23) y (26,23),
      distinguibles de los dots normales.
- [ ] Comer un power pellet suma exactamente 50 puntos y lo borra del tablero.
- [ ] Comer un dot normal sigue sumando exactamente 10 puntos.
- [ ] La partida solo se gana comidos todos los dots y los 4 pellets (no queda
      ningún pellet visible al ganar).
- [ ] Tras reiniciar desde el overlay, los 4 pellets reaparecen en su sitio.
- [ ] `MAZE` sigue pristino: `MAZE[3][1] === 4` sigue siendo true tras comer el
      pellet (se muta `game.grid`, no `MAZE`).
- [ ] `AGENTS.md` documenta el valor de celda 4.

## Decisiones

- **Sí:** celda `4` con char `o` en `MAZE_STR`. Consistente con la arquitectura
  grid (0/1/2/3 ya existen); render y lógica ya leen `game.grid`.
- **No:** lista de coordenadas de pellets aparte. Duplicaría estado frente al grid
  y complicaría comer y reiniciar.
- **Sí:** pellets contando en `dotsRemaining`. Como el arcade; la victoria exige
  comerlos y el hook de "pellet comido" queda listo para la spec de modo asustado.
- **Sí:** +50 puntos por pellet (arcade), no los 10 del dot.
- **Sí:** círculo grande estático (radio 6.5, color de dot). Cambio mínimo en
  `drawDots`.
- **No:** modo asustado en esta spec. Toca IA, estados de fantasma y regreso
  guionizado a la guarida (SPEC 02 lo aplazó); merece spec propia.
- **No:** parpadeo del pellet. Cosmético; puede llegar con el modo asustado.
- **Sí:** actualizar `AGENTS.md`. Si no, el documento contradiría al código.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El jugador espera que el pellet asuste a los fantasmas y no pasa nada | Aceptado: el efecto va en la spec siguiente; el pellet da 50 pts visibles, no es decorativo. |

## Lo que **no** está en esta spec

- Modo asustado y comer fantasmas.
- Regreso de fantasmas comidos a la guarida.
- Parpadeo del pellet.
- Otros niveles o laberintos alternativos.

Cada uno de estos, si llega, va en su propia spec.
