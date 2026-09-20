# SPEC 04 — Modo asustado: fantasmas azules y comibles

> **Estado:** Aprobado
> **Depende de:** SPEC 03
> **Fecha:** 2026-09-20
> **Objetivo:** Al comer un power pellet los fantasmas se vuelven azules, lentos
> y erráticos durante ~6 s, comibles por 200/400/800/1600 puntos en cadena, y los
> comidos vuelven a la guarida como ojos.

## Por qué existe esta spec

SPEC 03 colocó los pellets (+50 pts) y dejó el efecto sobre los fantasmas para
esta spec: su lista de aplazados nombra exactamente el modo asustado con la
cadena 200/400/800/1600 y el regreso guionizado de los comidos.

## Alcance

**In:**

- `src/js/game.js`: constantes `FRIGHT_FRAMES`, `FRIGHT_FLASH`, `FRIGHT_SPEED`,
  `EYES_SPEED`, `PEN_REDELAY` y `GHOST_POINTS`.
- `src/js/game.js`: `game.frightUntil` y `game.eatChain`; `g.frightened` por
  fantasma; disparo al comer el pellet en `movePacman`; expiración en `update`.
- `src/js/game.js`: `decideGhost` elige aleatorio si `g.frightened`;
  velocidad efectiva `FRIGHT_SPEED` asustado y `EYES_SPEED` en modo ojos.
- `src/js/game.js`: modos nuevos `'eaten'` (ojos navegan con la IA greedy hacia
  (13,11)) y `'entering'` (descenso guionizado x=13, y 11→14); al llegar,
  `pen` con `releaseAt = game.frame + PEN_REDELAY`.
- `src/js/game.js`: colisión en `update` — asustado → comer (cadena, ojos);
  activo → perder vida (como hoy); `pen`/`eaten`/`entering` → sin interacción.
- `src/js/game.js`: `resetPositions` limpia `frightened`, `frightUntil`, `eatChain`.
- `src/js/render.js`: azul `#2121de` con parpadeo blanco los últimos
  `FRIGHT_FLASH` frames; solo ojos (sin cuerpo) en `'eaten'`/`'entering'`.
- `AGENTS.md`: regla de la puerta actualizada — cruce guionizado en ambos
  sentidos (salida `moveExiting`, regreso del comido `'entering'`).

**Fuera de alcance (specs futuras):**

- Popup con los puntos (200, 400…) en la posición del fantasma comido.
- Pausa/freeze al comer un fantasma.
- Parpadeo del propio power pellet (aplazado ya en SPEC 03).
- Duración decreciente por nivel (solo existe un nivel).
- Fantasmas que huyen de Pac-Man de forma inteligente.
- Cara asustada clásica (pupilas puntiagudas y boca zigzag).

## Modelo de datos

```js
// game.js — constantes nuevas (frames a ~60 fps, como releaseDelay)
const FRIGHT_FRAMES = 360;  // ~6 s de modo asustado
const FRIGHT_FLASH  = 120;  // ~2 s de parpadeo de aviso al final
const FRIGHT_SPEED  = 0.05; // mitad de GHOST_SPEED (1/20 celda/frame)
const EYES_SPEED    = 0.25; // 2.5x: los ojos vuelven rapido (1/4)
const PEN_REDELAY   = 60;   // ~1 s en la guarida antes de re-salir
const GHOST_POINTS  = [ 200, 400, 800, 1600 ]; // cadena por pellet

// game.js — estado nuevo
game.frightUntil = 0; // frame de fin del modo; 0 = inactivo
game.eatChain = 0;    // fantasmas comidos desde el ultimo pellet
// cada fantasma gana frightened: false y mode se amplia:
//   'pen' | 'exiting' | 'active' | 'eaten' | 'entering'

// movePacman — al comer el pellet (v === 4), ademas de los +50:
game.frightUntil = game.frame + FRIGHT_FRAMES;
game.eatChain = 0;
game.ghosts.forEach( ( g ) => {
  if ( g.mode !== 'eaten' && g.mode !== 'entering' ) g.frightened = true;
} );

// update — expiracion al inicio, antes de mover
if ( game.frightUntil && game.frame >= game.frightUntil ) {
  game.frightUntil = 0;
  game.eatChain = 0;
  // cada asustado: flag a false y, si esta 'active', redondeo a celda
}

// decideGhost — asustado: aleatorio entre las choices (misma sin-reversa)
if ( g.frightened ) {
  g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
  return;
}

// ghostTarget — los ojos apuntan a la celda sobre la puerta
if ( g.mode === 'eaten' ) return { x: 13, y: 11 };

// update — colision: comer (pasa a EYES_SPEED y redondea a celda) o morir
if ( g.frightened ) {
  game.score += GHOST_POINTS[ game.eatChain ];
  game.eatChain = Math.min( game.eatChain + 1, 3 );
  g.frightened = false;
  g.mode = 'eaten';
  g.x = Math.round( g.x ); g.y = Math.round( g.y );
}

// moveGhost — modos nuevos, espejo de moveExiting:
// 'eaten':    IA greedy hacia (13,11) a EYES_SPEED; al alinear en
//             y === 11 con |x - 13| <= 1 pasa a 'entering'.
// 'entering': alinear x=13 y bajar hasta y=14; luego 'pen' con
//             releaseAt = game.frame + PEN_REDELAY.

// render.js — color en draw(); drawGhost omite cuerpo en ojos
let color = GHOST_COLORS[ g.kind ] || '#ff0000';
if ( g.frightened ) {
  const left = game.frightUntil - game.frame;
  color = ( left <= FRIGHT_FLASH && Math.floor( frame / 8 ) % 2 === 0 )
    ? '#fff' : '#2121de';
}
```

Convenciones: velocidades recíprocas de enteros (1/20, 1/4) para alinear
exacto como las existentes; los cambios de velocidad a mitad de celda
(comer un fantasma, expirar el modo) redondean a celda porque un offset no
múltiplo de la nueva velocidad jamás vuelve a alinear; `frightened` es flag
por fantasma (no derivado del timer global) para que los ojos no sean azules
ni comestibles.

## Plan de implementación

1. `src/js/game.js` — estado y disparo: constantes, campos en `createGame`,
   disparo al comer el pellet, expiración al inicio de `update`, limpieza en
   `resetPositions`. Manual: comer pellet con consola abierta;
   `game.frightUntil > game.frame` pasa a true y vuelve a false ~6 s después.
2. `src/js/game.js` + `src/js/render.js` — comportamiento y visual: rama
   aleatoria en `decideGhost`, velocidad efectiva en `moveGhost`, azul con
   parpadeo final en `draw`. Manual: al comer un pellet los no comidos se
   vuelven azules, van lento y sin rumbo, parpadean blanco los últimos ~2 s y
   a los ~6 s recuperan color y persecución (tocarlos aún quita vida).
3. `src/js/game.js` + `src/js/render.js` — comer y regreso: rama de colisión
   (comer con cadena / perder vida), modos `'eaten'` y `'entering'` en
   `moveGhost` con captura en fila 11, rama de `ghostTarget`, ojos-solo en
   `drawGhost`. Manual: tocar un azul lo convierte en ojos que cruzan el
   laberinto hasta la puerta, bajan y re-salen ~1 s después normales; la
   cadena 200→400→800→1600 se ve en el SCORE con un mismo pellet.
4. `AGENTS.md` — regla de la puerta: cruce guionizado en ambos sentidos
   (salida `moveExiting`, regreso del comido `'entering'`), ninguno consulta
   `canMove`. Manual: releer "Reglas del grid" y confirmar que describe el código.

## Criterios de aceptación

- [ ] El juego carga sin errores en la consola.
- [ ] Comer un power pellet vuelve azules a todos los fantasmas no comidos
      (los de la guarida salen ya azules).
- [ ] Un fantasma asustado se mueve a mitad de velocidad y sin perseguir
      (rumbo aleatorio).
- [ ] Tocar un fantasma azul suma puntos en vez de quitar vida: 200 el
      primero y 400/800/1600 los siguientes con el mismo pellet.
- [ ] El mínimo de la cadena (200) es mayor que el power pellet (50) y el
      dot (10): el fantasma siempre puntúa más que un pellet.
- [ ] El fantasma comido se dibuja como ojos sin cuerpo, llega a la guarida
      y re-sale ~1 s después con su color normal, sin ser comestible.
- [ ] Los ojos cruzan a Pac-Man sin interactuar (ni comen ni matan).
- [ ] El modo dura ~6 s: parpadeo blanco los últimos ~2 s y recuperación de
      color y persecución al expirar.
- [ ] Comer un segundo pellet durante el modo reinicia el temporizador y la
      cadena a 200.
- [ ] Tocar un fantasma normal sigue quitando vida y reiniciando posiciones.
- [ ] Perder una vida con el modo activo lo limpia: nadie azul tras el reset.
- [ ] En una partida larga (>2 min) ningún fantasma-ojo queda clavado sin
      llegar a la guarida.
- [ ] `MAZE` sigue pristino; victoria y derrota funcionan igual que en SPEC 03.
- [ ] `AGENTS.md` refleja el cruce de la puerta en ambos sentidos.

## Decisiones

- **Sí:** flag `g.frightened` por fantasma + timer global `game.frightUntil`.
  Un derivado puramente global volvería azules y comestibles a los ojos que
  vuelven; el flag los excluye por construcción.
- **Sí:** 360 frames (~6 s) y parpadeo los últimos 120. Nivel 1 del arcade;
  sin parpadeo, el fin del modo es abrupto y mata jugadores.
- **Sí:** movimiento aleatorio reutilizando las `choices` de `decideGhost`
  (sin reversa, 180 en callejón). Es el arcade y evita una segunda IA.
- **No:** huir de Pac-Man maximizando distancia. Más "listo" pero no es el
  arcade y duplica la lógica de decisión.
- **Sí:** `FRIGHT_SPEED` 0.05 y `EYES_SPEED` 0.25. Recíprocas de enteros como
  las existentes (alinean exacto); ojos rápidos acortan la ausencia (a 0.1
  cruzar el mapa tarda >8 s).
- **Sí:** redondeo a celda al comer y al expirar. Cambiar de velocidad a
  mitad de celda deja offsets que jamás vuelven a alinear (p.ej. 0.05→0.1);
  sin redondeo, el fantasma atraviesa paredes en línea recta para siempre.
- **Sí:** cadena `GHOST_POINTS = [ 200, 400, 800, 1600 ]` con `eatChain`
  reseteado por pellet. La cadena exacta quedó anunciada en SPEC 03;
  `Math.min( ..., 3 )` defiende el índice.
- **Sí:** regreso en dos modos: `'eaten'` navega con la greedy existente
  hacia (13,11) y `'entering'` baja x=13 de y=11 a y=14, espejo de
  `moveExiting`. SPEC 02 dejó diseñado el hueco ("modo guionizado de bajada").
- **Sí:** captura amplia en fila 11 (`y === 11 && |x - 13| <= 1`) antes de
  `decideGhost`. La greedy con prohibición de reversa puede pasarse de largo
  junto a la puerta y oscilar; capturar 12/13/14 lo impide.
- **Sí:** re-salida a ~1 s (`PEN_REDELAY` 60) reutilizando `exiting`.
- **Sí:** solo los ojos atraviesan a Pac-Man sin interactuar; `exiting`
  mantiene la regla actual (puede matar o ser comido en (13,11), como hoy).
- **Sí:** azul `#2121de` (dossier del arcade) con los ojos actuales. La cara
  asustada clásica es cosmética.
- **No:** popup de puntos, freeze al comer y parpadeo del pellet. Cosméticos,
  aplazables sin tocar el bucle jugable.
- **Sí:** actualizar `AGENTS.md`. La regla actual dice que la puerta "solo se
  cruza al salir"; con `'entering'` quedaría falsa.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La greedy de los ojos puede oscilar lejos de la puerta (mínimo local) y no llegar | Misma heurística ya validada en persecución (SPEC 01: >2 min sin clavarse); con diana fija (13,11) es más estable que la actual, móvil. Lo cubre el criterio de la partida larga. |
| El redondeo puede meter al fantasma en una celda-pared durante un frame | `decideGhost` evalúa celdas vecinas, no la actual: sale al primer giro. Autocorrectivo y cosmético. |
| Fantasma azul y fantasma normal solapados con Pac-Man en el mismo frame | El bucle procesa por fantasma en orden de array: el azul se come, el rojo mata. Determinista. |

## Lo que **no** está en esta spec

- Popup de puntos, freeze y parpadeo del pellet.
- Huida inteligente y cara asustada clásica.
- Duración por nivel y niveles nuevos.
- Velocidades diferenciales por personalidad (aplazado desde SPEC 01).

Cada uno, si llega, va en su propia spec.
