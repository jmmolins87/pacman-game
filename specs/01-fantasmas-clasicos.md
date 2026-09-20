# SPEC 01 — Personalidades clásicas de los cuatro fantasmas

> **Estado:** Aprobado
> **Depende de:** ninguna
> **Fecha:** 2026-09-20
> **Objetivo:** Los cuatro fantasmas clásicos (Blinky, Pinky, Inky y Clyde) con su
> personalidad de persecución propia y salida escalonada de la guarida.

## Por qué existe esta spec

El juego tiene solo 2 fantasmas (`hunter` y `random`). Esta spec los convierte en el
elenco canónico de cuatro, cada uno con un objetivo de persecución distinto, sin tocar
modos globales (scatter/chase, asustado) que no existen aún.

## Alcance

**In:**

- 4 fantasmas con `kind` clásico: `blinky`, `pinky`, `inky`, `clyde`.
- Objetivo de persecución propio de cada uno (ver Modelo de datos).
- Salida escalonada de la guarida por temporizador de frames: 0 / ~2 s / ~5 s / ~8 s.
- Ruta de salida guionizada desde la guarida (alinearse a la columna de la puerta y subir).
- Color por `kind` en render.js (hoy por índice de array).
- Reinicio de posiciones y temporizadores al perder una vida.
- Contador `game.frame` de frames de juego (solo avanza con `state === 'playing'`).

**Fuera de alcance (specs futuras):**

- Alternancia periódica scatter/chase.
- Modo asustado y power pellets (no existen en el laberinto).
- Blinky acelerado ("Cruise Elroy") y velocidades diferenciales.
- Animación de balanceo de los fantasmas dentro de la guarida (esperan quietos).
- Delta-time / independencia de la tasa de refresco.

## Modelo de datos

```js
// maze.js — GHOST_STARTS pasa de 2 a 4 entradas
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky', releaseDelay: 0 },   // fuera, sobre la puerta
  { x: 13, y: 14, kind: 'pinky',  releaseDelay: 120 }, // ~2 s a 60 fps
  { x: 12, y: 14, kind: 'inky',   releaseDelay: 300 }, // ~5 s
  { x: 15, y: 14, kind: 'clyde',  releaseDelay: 480 }, // ~8 s
];

// game.js — cada fantasma gana estado de guarida; game gana contador de frames
const ghost = {
  x: 13, y: 14, dir: 'up', speed: GHOST_SPEED,
  kind: 'blinky',                          // 'blinky' | 'pinky' | 'inky' | 'clyde'
  mode: 'pen',                             // 'pen' | 'exiting' | 'active'
  releaseAt: 120,                          // frame de juego en que sale
};
// game.frame = 0  (se incrementa en cada update() con el juego en marcha)

// Objetivo por personalidad (celdas; pueden caer en muro: son solo diana de distancia)
// blinky: celda de Pac-Man.
// pinky:  celda de Pac-Man + 4 * DIRS[ pacman.dir ].
// inky:   2 * (celda de Pac-Man + 2 * dir) - celda de blinky (flanqueo).
// clyde:  celda de Pac-Man si distancia Manhattan > 8; si no, esquina { x: 1, y: 29 }.

// render.js — color por kind en vez de por índice
const GHOST_COLORS = {
  blinky: '#ff0000',
  pinky: '#ffb8ff',
  inky: '#00ffff',
  clyde: '#ffb852',
};
```

Convenciones: coordenadas de celda con origen arriba-izquierda; distancias Manhattan
en celdas; `releaseDelay` en frames asumiendo ~60 fps (riesgo preexistente, ver Riesgos).

## Plan de implementación

1. `src/js/maze.js`: sustituir `GHOST_STARTS` por las 4 entradas con `kind` y
   `releaseDelay`; actualizar el comentario de cabecera. Manual: el juego carga con 4
   fantasmas visibles y la consola queda limpia (comportamiento aún no final).
2. `src/js/render.js`: `GHOST_COLORS` pasa de array a objeto por `kind` (con fallback).
   Manual: rojo, rosa, cian y naranja visibles desde el arranque.
3. `src/js/game.js`: añadir `game.frame`; en `createGame` dar a cada fantasma `mode` y
   `releaseAt` (blinky nace `active`); máquina de estados en `moveGhost`:
   `pen` quieto hasta `game.frame >= releaseAt`, `exiting` con ruta guionizada
   (alinearse a x=13 y subir hasta y=11), `active` con la IA actual. Manual: Blinky
   persigue desde el inicio; los otros tres salen por la puerta a ~2/~5/~8 s.
4. `src/js/game.js`: extraer `ghostTarget( game, g )` con las 4 fórmulas y generalizar
   `decideGhost` para elegir la dirección válida (sin reversa) que minimice la distancia
   Manhattan al objetivo — misma lógica que el `hunter` actual. Manual: cada
   personalidad se distingue en juego (Pinky corta por delante, Inky flanquea, Clyde se
   retira al acercarse).
5. `src/js/game.js`: `resetPositions` restaura `x`, `y`, `dir`, `mode` y
   `releaseAt = game.frame + releaseDelay`. Manual: perder una vida devuelve a los
   cuatro a la guarida y reescalona las salidas.

## Criterios de aceptación

- [ ] El juego carga sin errores en la consola.
- [ ] Hay 4 fantasmas: rojo (Blinky), rosa (Pinky), cian (Inky) y naranja (Clyde).
- [ ] Blinky empieza en (13,11), fuera de la guarida, y persigue a Pac-Man directamente.
- [ ] Pinky, Inky y Clyde esperan quietos en la guarida y salen por la puerta en ese
      orden a ~2, ~5 y ~8 segundos.
- [ ] Ningún fantasma atraviesa paredes; la puerta solo la cruzan fantasmas.
- [ ] Con Pac-Man quieto, Pinky converge hacia 4 celdas por delante de su mirada, no
      hacia su celda actual.
- [ ] Clyde persigue de lejos y se retira hacia la esquina inferior izquierda al estar
      a 8 celdas o menos de Pac-Man.
- [ ] El objetivo de Inky se calcula como 2·(2 celdas delante de Pac-Man) − posición de
      Blinky (verificable revisando `ghostTarget`).
- [ ] Al perder una vida, los cuatro vuelven a sus celdas de origen y se repiten los
      retrasos 0 / ~2 / ~5 / ~8 s.
- [ ] En una partida larga (>2 min) ningún fantasma queda clavado ni oscila
      indefinidamente en el mismo sitio.

## Decisiones

- **Sí:** personalidades clásicas con `kind` `blinky`/`pinky`/`inky`/`clyde`. Mapean 1:1
  con los colores ya presentes en render.js y dan fórmulas de objetivo conocidas.
- **No:** nombres descriptivos (`hunter`, `ambusher`…). Menos reconocibles que el
  elenco original.
- **Sí:** salida escalonada por temporizador de frames con ruta guionizada
  (alinear a x=13 y subir). Determinista y evita que la IA greedy decida dentro de la
  guarida, donde puede estancarse.
- **No:** contador de dots para la salida. Más fiel al arcade pero más complejo; el
  temporizador produce el mismo ritmo jugable.
- **Sí:** velocidad uniforme `GHOST_SPEED` para los cuatro. La diferenciación es solo
  de comportamiento.
- **No:** Blinky acelerado ("Cruise Elroy"). Refuerzo extra de agresividad que puede
  esperar a otra spec.
- **No:** mantener un fantasma aleatorio (el `random` actual desaparece). El set
  clásico no incluye uno y el hueco lo ocupa Clyde.
- **No:** reproducir el bug histórico de overflow de Pinky. Objetivo "4 delante"
  simple.
- **Sí:** colores mapeados por `kind` en render.js. Por índice sería frágil al reordenar
  `GHOST_STARTS`.
- **Sí:** reiniciar temporizadores al perder vida, relativos a `game.frame`. Da
  respiro al jugador y es consistente con el arranque.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Targeting greedy (Manhattan, sin pathfinding) puede estancar u oscilar | Es el comportamiento del arcade; la prohibición de reversa y el giro en callejón ya lo limitan. Lo verifica el criterio de partida larga. |
| 4 fantasmas suben la dificultad frente a los 2 actuales | La salida escalonada da ventana de respiro y solo Blinky es agresor constante. |
| `releaseDelay` en frames asume ~60 fps (riesgo preexistente: velocidades ya por frame) | Aceptado. Si algún día se añade delta-time, se corrigen juntos velocidades y temporizadores. |

## Lo que **no** está en esta spec

- Alternancia scatter/chase.
- Modo asustado y power pellets.
- Blinky acelerado y velocidades diferenciales.
- Animación dentro de la guarida.
- Delta-time / independencia de la tasa de refresco.

Cada uno de estos, si llega, va en su propia spec.
