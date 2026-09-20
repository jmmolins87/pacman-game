# AGENTS.md

## Ejecución y verificación

- No hay build, bundler, `package.json`, lint ni tests: JS/HTML/CSS puro. No inventar comandos npm.
- Ejecutar: abrir `src/index.html` en el navegador (scripts `<script>` clásicos, sin módulos ni fetch; funciona con `file://`).
- Verificar: manual en navegador; la consola debe quedar sin errores.

## Arquitectura

- Sin módulos ES: los archivos se comunican por globals y el orden de carga en `src/index.html` importa: `maze.js` → `game.js` → `render.js` → `main.js`.
  - `maze.js`: define `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`.
  - `game.js`: define `createGame`, `update`, `DIRS` (depende de los globals de maze.js).
  - `render.js`: define `draw` (usa `DIRS` de game.js).
  - `main.js`: bucle de juego, teclado y overlays; consume todo lo anterior.
- Un archivo JS nuevo debe añadirse como `<script>` en `index.html` en la posición correcta según sus dependencias.

## Reglas del grid

- Valores de celda: `0` vacío, `1` pared, `2` dot, `3` puerta de la pen, `4` power pellet. La puerta (`3`) bloquea a todos los actores en `canMove`; los fantasmas solo la cruzan mediante rutas guionizadas que no consultan paredes: salida (`moveExiting`) y regreso del comido (`'entering'` via `moveEntering`).
- `MAZE` es pristino e inmutable: `createGame()` lo copia a `game.grid`, que es lo único que se muta (dots comidos). Render usa `game.grid`, nunca `MAZE`.
- Laberinto 28x31; el túnel es la fila 14 (wrap horizontal al salir por un borde).

## Workflow: Spec Driven Development

Este repo existe para practicar este enfoque; es el flujo esperado para cualquier feature no trivial. Skills en `.agents/skills/` (lock en `skills-lock.json`).

- `/spec` diseña la spec sin escribir código y la guarda en `specs/NN-slug.md` (numeración secuencial, dos dígitos). Estructura de referencia: `.agents/skills/spec/template.md`.
- Solo el humano cambia el estado de una spec a `Approved`/`Aprobado`; el agente nunca lo hace.
- `/spec-impl` implementa una spec aprobada: crea branch `spec-NN-slug`, avanza paso a paso con pausas para revisar diffs y nunca commitea salvo pedido explícito.
- Config de branches en `specs/.spec-config.yml` (`AutoCreateBranch`, default `true`).
- Una spec nueva debe seguir el idioma y las convenciones de las existentes en `specs/`.

## Convenciones de código

- Todo en español: comentarios, textos de UI y specs.
- Estilo del repo (difiere de defaults tipo prettier): comillas simples y espacios dentro de paréntesis — `foo( arg )`, `if ( x )`. Mantenerlo al editar.
