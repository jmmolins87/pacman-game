# SPEC 02 — La guarida se sella a la re-entrada: la puerta solo se cruza al salir

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-09-20
> **Objetivo:** Los fantasmas activos no pueden volver a entrar en la guarida: la puerta (celda 3) pasa a ser pared para todos los actores en `canMove` y solo se cruza con la ruta guionizada de salida.

## Por qué existe esta spec

El síntoma reportado es "los fantasmas se quedan atrapados en la pen", pero la salida guionizada de SPEC 01 (`moveExiting`, `src/js/game.js:179`) funciona: verificado por simulación en node, Pinky llega a (13,11) y pasa a `active` correctamente.

La causa real es la **re-entrada**: `isWall` (`src/js/game.js:61`) solo bloquea la puerta (celda `3`) a Pac-Man. En cuanto un fantasma queda `active` en (13,11), `decideGhost` puede elegir `down` cuando su objetivo queda abajo (Pac-Man empieza en (13,23)) y el fantasma vuelve a bajar por la puerta. Dentro, la guarida es una caja sellada (interior 6×3, única apertura = la puerta) y la IA greedy con prohibición de reversa oscila indefinidamente: queda atrapado hasta que se pierde una vida (`resetPositions`). Traza de la simulación: activo en el frame 150, gira a `down` en el 155, dentro de la guarida en el 170, atrapado hasta el reset del frame 236.

## Alcance

**In:**

- `src/js/game.js`: en `isWall`, la celda `3` bloquea a todo actor; eliminar el parámetro `actor` (queda muerto) de `isWall`/`canMove` y sus 5 llamadas; actualizar comentarios afectados.
- `AGENTS.md`: actualizar la regla de la puerta en "Reglas del grid".

**Fuera de alcance (specs futuras):**

- Modo asustado y regreso de fantasmas comidos a la guarida (irá con su propio modo guionizado de bajada).
- Animación de balanceo dentro de la guarida (fuera también en SPEC 01).
- Cambios en retrasos, velocidades o personalidades (SPEC 01, cerrado).

## Modelo de datos

No introduce datos nuevos; reutiliza el modelo de SPEC 01 (`mode: 'pen' | 'exiting' | 'active'`). El cambio es solo semántico:

```js
// game.js — antes
if ( v === 3 && actor === 'pacman' ) return true;
// game.js — después
if ( v === 3 ) return true; // puerta: pared para la IA; solo se cruza guionizado (moveExiting)
```

## Plan de implementación

1. `src/js/game.js`: cambiar `isWall` (puerta = pared para todos), eliminar el parámetro `actor` de `isWall`/`canMove` y ajustar las 5 llamadas y el comentario de cabecera. Manual: abrir `src/index.html`; Pinky/Inky/Clyde salen a ~2/~5/~8 s y persiguen por el mapa; con Pac-Man quieto mirando arriba (repro del bug), nadie vuelve a bajar por la puerta.
2. `AGENTS.md`: reescribir la regla de la puerta: bloquea a todos los actores en `canMove`; los fantasmas solo la cruzan mediante la ruta guionizada de salida, que no consulta paredes. Manual: releer "Reglas del grid" y confirmar que describe el código.

## Criterios de aceptación

- [ ] El juego carga sin errores en la consola.
- [ ] Pinky, Inky y Clyde salen por la puerta a ~2/~5/~8 s y persiguen por el mapa.
- [ ] Con Pac-Man quieto en (13,23) mirando arriba, ningún fantasma re-entra por la puerta tras activarse.
- [ ] Blinky, al pasar por (13,11)/(14,11) con Pac-Man debajo, sigue de largo sin colarse.
- [ ] En una partida larga (>2 min) ningún fantasma queda clavado u oscilando dentro de la guarida.
- [ ] Pac-Man sigue sin poder cruzar la puerta.
- [ ] `AGENTS.md` refleja la regla nueva.

## Decisiones

- **Sí:** puerta = pared para todos en `canMove`. La re-entrada era la causa del atrapamiento; sellarla la elimina por construcción. Los cruces de puerta ya son guionizados (`moveExiting` no consulta paredes), así que no se pierde capacidad alguna.
- **No:** puerta de sentido único (subir sí, bajar no). Añade lógica direccional que ningún modo actual necesita.
- **No:** filtrar `down` en `decideGhost` desde (13,11)/(14,11). Regla repartida por casos especiales, frágil ante modos futuros.
- **Sí:** eliminar el parámetro `actor`. Tras el cambio no queda ninguna regla por actor; conservarlo dejaría un parámetro muerto.
- **Sí:** actualizar `AGENTS.md` en la misma spec. Si no, el documento contradiría al código.
- **Sí:** reutilizar `moveExiting` tal cual. La simulación confirma que la salida nunca fue el problema.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Un futuro "fantasma comido vuelve a la guarida" necesitará bajar por la puerta | Irá con su propio modo guionizado (como `exiting`), igual que el arcade; `canMove` no participa. |
| Eliminar `actor` toca 5 llamadas existentes | Cambio mecánico; lo cubre el criterio de consola limpia. |

## Lo que **no** está en esta spec

- Modo asustado y regreso de fantasmas comidos.
- Animación de balanceo en la guarida.
- Cambios en retrasos, velocidades o personalidades.

Cada uno de estos, si llega, va en su propia spec.
