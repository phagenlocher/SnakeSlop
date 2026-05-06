# Snake Game

Multi-file vanilla HTML/CSS/JS Snake game rendered on an HTML5 Canvas.

## Run

Open `index.html` directly in a browser.

## Build, Lint, Typecheck, Test

- **Lint**: `npm run lint` — runs ESLint (`eslint.config.js`) against `snake.js`.
- **Build / Test / Typecheck**: no tooling configured. This remains a zero-build static page.

## Game Modes

All modes are selected via a `<select>` dropdown in `index.html` and passed as the `mode` option to `SnakeGame(container, options)`. The game is destroyed and remounted whenever the mode changes. All feature toggles apply identically regardless of mode. Settings are persisted to `localStorage` under key `snake-game-settings`.

### `classic` (default)

The standard Snake experience.

- **Timer**: Counts up from `0:00` in the HUD as `Time: M:SS`.
- **Game over**: Triggered by collision (wall, boundary, or self) or when the snake completely fills the playable area. No time limit.
- **Final score**: Displayed on the canvas overlay ("GAME OVER" + "Score: X") and in the message text below.

### `timeTrial`

Race against the clock.

- **Timer**: Counts down from `2:00` in the HUD as `Time: M:SS`.
- **Game over**: Triggered when the timer reaches `0:00` OR by collision (same as Classic) OR when the snake completely fills the playable area.
- **Final score**: Displayed on the canvas overlay ("GAME OVER" + "Score: X") and in the message text below.
- **All Classic rules apply**: Grace period, speed boost, bonus food, walls, wrap, etc. all function identically.

### `constrictor`

Food is eaten by enclosure, not head collision.

- **Timer**: Counts up from `0:00` in the HUD as `Time: M:SS` (same as Classic).
- **Game over**: Triggered by collision (wall or boundary, with grace period) or when the snake completely fills/has no safe moves in the playable area. Self-collision does NOT cause game over — see below. No time limit.
- **Final score**: Displayed on the canvas overlay ("GAME OVER" + "Score: X") and in the message text below.
- **Auto-growth**: Snake starts at length 1. On game start, `startGrowth = 14` auto-grows the snake to length 15 over the first ~14 ticks (no food required).
- **Self-collision**: Running into your own body does not kill the snake. Instead, the game enters the `ignored` state — the snake freezes, turns magenta (`#c084fc` body, `#e2ccff` head), and waits indefinitely for the player to press a safe direction. If no safe direction exists (all adjacent cells are blocked by walls, boundaries, or the snake's own body), the game ends immediately via `CollisionResolver.hasAnySafeMove()`.
- **Head hits food** (regular): The food disappears (poofs) and is replaced at a random **non-enclosed** position. No score, no growth. Guarded by `snake.length < freeTiles` to prevent board-full infinite loops.
- **Head hits bonus food**: No effect — bonus food is enclosure-only. Eating bonus food by enclosure shrinks the snake (halved, minimum length 15).
- **Enclosure eating** (regular food): Flood-fill BFS from the food through non-snake, non-wall cells. In non-wrap mode, if the flood fill cannot reach the grid boundary, the food is enclosed. In wrap mode, the flood fill wraps (modulo), and all connected components of free cells are compared — the food is enclosed if its component is smaller than the largest component (the "outside" region). Eating by enclosure awards 10 pts + bonus score, speed up, `foodsEaten++`, and grows the snake by 1 segment.
- **Enclosure eating** (bonus food): Same flood-fill check. Awards 100 pts, clears bonus timers, and shrinks the snake (halved, minimum length 15). Also checked in `_moveBonusFood()` after each random step.
- **Food placement**: `_placeFood()` rejects positions that are already enclosed (max 200 retries), ensuring food always spawns in the outside region.
- **All Classic rules apply**: Grace period, speed boost, bonus food, walls, wrap, etc. all function identically, except self-collision which enters the `ignored` state instead of warning/game over (grace period toggle has no effect on self-collision). Bonus food moves, expires, and follows the same timing rules — only the eating mechanic (enclosure vs head) differs.

## Togglable Features

All features are controlled via checkboxes in `index.html` and passed as options to `SnakeGame(container, options)`. The game is destroyed and remounted whenever any toggle changes. All features default to `true` (enabled), **except `enableColorblindMode` which defaults to `false`**.

### Bonuses and Score

#### `enableBonusFood`

Enables the golden diamond bonus food mechanic.

- **Appearance**: A golden diamond (`#FFD700`) rendered on the canvas, distinct from the regular red food (`#ff4444`).
- **Spawn trigger**: Appears every 15 seconds via a time-based trigger (`enableTimedBonusFood`), but only if no bonus food is already on the board.
- **Placement**: Random grid position, avoiding snake body, regular food, and wall cells.
- **Movement**: Moves randomly in one of four cardinal directions at intervals of `currentSpeed + 60`ms via `setInterval`. Respects `enableWrap` for boundary behavior.
- **Expiration**: Auto-removes after 5 seconds via `setTimeout`.
- **Points**: Worth 100 points when eaten.
- **When disabled**: No bonus food ever spawns; `BonusFoodManager.place()` returns early; bonus food rendering, movement, and collision checks are all skipped.

#### `enableTimedBonusFood`

Replaces the food-count-based bonus food spawn with a time-based trigger.

- **Mechanism**: A `setInterval` fires every 15 000 ms. If no bonus food is currently on the board, `BonusFoodManager.place()` is called.
- **Dependency**: Requires `enableBonusFood` to also be enabled; otherwise does nothing.
- **Replacement behavior**: When this option is on, the `foodsEaten % 5 === 0` trigger in `_update()` is bypassed entirely — bonus food spawns _only_ from the 15-second timer.
- **Pause/resume**: Timer is cleared on pause (via `TimerManager.clearAll()`) and restarted fresh on resume via `BonusFoodManager.startTimers()`.
- **When disabled**: Bonus food spawns via the original food-count mechanic (every 5 regular foods eaten).

#### `enableShrinkOnBonusFood`

Controls whether the snake shrinks when eating bonus food.

- **Behavior**: When bonus food is eaten, the snake's length is halved via `SnakeBody.splice(Math.ceil(this.snake.length / 2))`, removing the tail half. Any pending `growth` counter is unaffected. In constrictor mode, shrinking is capped at a minimum length of 15.
- **Dependency**: Only has effect when `enableBonusFood` is also enabled (bonus food must exist to be eaten).
- **When disabled**: Eating bonus food still awards 100 points and clears the bonus food, but the snake retains its full length.

#### `enableScoreBonus`

Enables a decaying bonus score multiplier displayed in the HUD as `Bonus: N`.

- **Initial value**: Starts at 100 points each game and after each regular food eaten.
- **Decay**: Decreases by 1 point every 200ms (5 points per second) via `setInterval`, bottoming out at 0. The HUD updates live (`Bonus: N`).
- **Application**: When regular food is eaten, if the current bonus value > 0, it is added to the score **in addition to** the base 10 points.
- **Reset**: After eating regular food, bonus value resets to 100 and a new decay interval starts.
- **HUD**: Shown as `<span class="snake-bonus">Bonus: 100</span>` in the HUD bar between Score and Time.
- **Pause/resume**: Decay timer is cleared on pause and restarted on resume (remaining decay continues from where it left off, but the value itself is not adjusted for elapsed pause time).
- **When disabled**: No bonus score is ever added; the bonus HUD element is **not rendered at all** (`getHUDHtml()` returns `''`); decay interval never starts.

### Movement and Speed

#### `enableGracePeriod`

Enables a 700ms warning/grace period before game over when the snake is about to collide.

- **Trigger**: When `CollisionResolver.resolve()` detects the next head position would hit a wall or the snake's own body.
- **Behavior**: Instead of immediate game over, enters `warning` state:
  - Game loop and bonus food movement timers are cleared.
  - Snake turns red (`#ff6666`) via the draw routine (PALETTE_WARNING).
  - A 700ms `setTimeout` countdown begins (shortened to `700 / 1.35 ≈ 519ms` when speed boost is active).
  - The player can press any **safe** arrow key (one that does not lead to collision) to escape the warning and resume `playing` state.
  - If the player presses an unsafe direction during warning, it is ignored.
  - If no safe key is pressed within the timeout, `_gameOver()` is called.
- **When disabled**: Collision causes immediate game over with no warning window.
- **Constrictor interaction**: Self-collision in constrictor mode always enters the `ignored` state regardless of the grace period setting. Walls and boundaries still respect the grace period.

#### `enableWrap`

Enables wrap-around boundaries — the snake teleports to the opposite edge instead of dying at walls.

- **Head movement**: In `_resolveNextHead()`, the new head position is wrapped via `BoundaryManager.wrap()` using modulo: `x = (x + COLS) % COLS`, `y = (y + ROWS) % ROWS`.
- **Bonus food movement**: In `BonusFoodManager._move()`, bonus food also wraps when moving randomly.
- **Collision**: Wall collision is effectively disabled. The snake can still die by running into its own body.
- **Grace period interaction**: When `enableWrap` is on, wall collisions never occur, so the grace period only triggers on self-collision.
- **When disabled**: Hitting any of the four walls triggers collision logic (grace period or immediate game over depending on `enableGracePeriod`).

#### `enableSpeedUp`

Controls whether the game accelerates as the player eats food.

- **Mechanism**: Each regular food eaten increases the tick rate: `tickRate = (1000 / BASE_SPEED) + RATE_STEP * foodsEaten`, then `currentSpeed = max(MIN_SPEED, 1000 / tickRate)`. This produces accelerating intervals as food count grows.
- **Bounds**: Starts at `BASE_SPEED=135`ms, floors at `MIN_SPEED=50`ms. `RATE_STEP=0.2`.
- **Implementation**: `SpeedManager.onFoodEaten()` recalculates `currentSpeed` and calls `restartGameLoop()` which clears and reschedules the tick via `setTimeout`.
- **Cascade effect**: Bonus food movement interval (`currentSpeed + 60`) also shifts when speed changes. Pause/resume recalculates intervals using the current speed.
- **When disabled**: Game runs at a constant `BASE_SPEED=135`ms throughout the entire session.

#### `enableSpeedBoost`

Enables a temporary speed boost when the player presses the same direction key as the current movement direction.

- **Mechanism**: When the player presses the same arrow key as the current direction (e.g., pressing Right while already moving Right), the game loop delay is divided by `1.35`, making the snake move ~35% faster.
- **Visual indicator**: Snake head turns goldenrod (`#f0e68c`) via the draw routine (PALETTE_BOOST head tile).
- **Activation**: `InputManager._activateBoost()` — sets `speedBoostActive = true`.
- **Deactivation**: `InputManager._deactivateBoost()` — sets `speedBoostActive = false`. Triggered when the player changes direction or escapes the warning state.
- **Warning interaction**: The warning timeout is also shortened by 1.35 when boosting (`700 / 1.35`ms ≈ 519ms).
- **Resume interaction**: On resume, the game loop uses the boosted interval if `speedBoostActive` is true.
- **When disabled**: Pressing the same direction key does nothing special; game runs at constant `currentSpeed` regardless of repeated keypresses.

### Input Handling

#### `enableInputBuffer`

Enables queuing rapid direction inputs so they aren't lost between game ticks.

- **Mechanism**: An `inputBuffer` array holds up to 2 queued directions.
- **Processing** (`InputManager.commitDirection`): Each tick, the buffer is shifted — the first valid (non-opposite, non-same) direction is committed to `this.direction`. This allows rapid sequences like Right→Up to execute across consecutive ticks even if pressed faster than the game loop.
- **Guards**: Opposite directions and duplicates are rejected. Buffer is capped at 2 entries.
- **Grace period**: During warning state, `graceDirection` is used as the reference direction for buffer processing.
- **When disabled**: Classic behavior — `nextDirection` is set directly on keypress; only the last keypress before a tick takes effect; no buffering.

#### `enableInstantMovement`

Changes how keystrokes are consumed. Instead of waiting for the next tick, the snake moves immediately when a valid arrow key is pressed.

- **Mechanism**: In the `playing` state, after processing a valid direction input, `_update()` is called immediately and the game loop is rescheduled so the next automatic tick fires after a full `currentSpeed` delay.
- **Valid inputs**: Same-direction presses (triggers speed boost if enabled + instant move) and new-direction presses (not opposite to current or buffered direction) trigger instant movement. Opposite-direction presses are ignored entirely — no instant move occurs.
- **Game loop reset**: After each instant move, the `setTimeout` is cleared and rescheduled, preventing rapid double-moves.
- **Input buffer interaction**: When both `enableInputBuffer` and `enableInstantMovement` are enabled, each keypress pushes to the buffer then immediately triggers `_update()`, which consumes one buffer entry. The buffer still provides direction validation and opposite-direction protection.
- **Speed boost interaction**: Same-direction presses activate speed boost normally and trigger an instant move at the boosted speed. The loop reset picks up the boosted interval.
- **Grace period / ignored states**: No effect — instant movement only applies when `state === 'playing'` and the game loop is actively running.
- **When disabled**: Classic behavior — inputs are consumed on the next tick via `_update()`.

### Level Design

#### `enableWalls`

Enables static walls arranged as a hollow square ring with openings in the center of each side.

- **Layout**: Four L-shaped wall segments forming a 14×14 square area (cols 3–16, rows 3–16) with 2-cell-wide gaps at the center of each side. Total 44 wall cells.
- **Appearance**: Dark gray blocks (`#555`) with lighter top/left edges (`#777`) and darker bottom/right edges (`#333`) for a 3D beveled look. Rendered via pre-rendered wall tile.
- **Collision**: Walls are always solid regardless of `enableWrap`. Hitting a wall triggers the same collision logic as hitting a boundary or self (grace period if `enableGracePeriod` is on, otherwise immediate game over).
- **Food placement**: Both regular food and bonus food avoid spawning on wall cells.
- **Bonus food movement**: Bonus food will not move onto a wall cell during its random walk.
- **Warning escape**: Directions leading into a wall are rejected as unsafe during the grace period.
- **When disabled**: No walls are rendered or checked; the arena is fully open (subject to `enableWrap` for boundary behavior).

#### `enableWormholes`

Enables a teleport mechanic with a wormhole entry/exit pair.

- **Spawn trigger**: Every 30 seconds, if no wormhole pair exists, a dark green entry cell and off-white exit cell appear at random valid positions at least 5 cells apart (Manhattan distance). Does NOT spawn if 10 or fewer free tiles remain on the board.
- **Lifetime**: Wormholes auto-despawn after 15 seconds via `setTimeout`, or immediately when the snake enters the entry cell.
- **Placement**: Entry and exit avoid snake body, regular food, bonus food, and wall cells.
- **Teleport**: When the snake's head enters the entry cell, it instantly appears at the exit cell, continuing in the same direction. Both wormholes are consumed and the lifetime timeout is cancelled.
- **Exit cell**: Off-white square (`#e8e8e8`) with no mechanical effect — the snake moves through it freely.
- **Collision**: If the teleport destination (exit cell) is blocked by the snake's body, normal collision rules apply (grace period or game over).
- **Appearance**: `#003a00` (dark green) for entry, `#e8e8e8` (off-white) for exit. Drawn after walls, before snake.
- **Constrictor**: Wormhole cells do not block flood-fill enclosure checks. Teleport fires before constrictor-specific head-food logic.
- **When disabled**: No wormholes ever spawn; rendering, timers, and teleport checks are all skipped.

### Visual

#### `enableColorblindMode`

Applies Bang Wong's colorblind-friendly palette (doi:10.1038/nmeth.1618) across all in-game visuals and UI.

- **Disabled by default** — when off, the standard color scheme is used.
- **Implementation**: A `THEME_COLORBLIND` object (paired with `THEME_DEFAULT` for the standard palette) and four colorblind palettes (`PALETTE_NORMAL_CB`, `PALETTE_WARNING_CB`, `PALETTE_IGNORED_CB`, `PALETTE_BOOST_CB`) are defined. At construction, `this.colors` binds the active theme. `_createTiles()` selects the right palettes; static tile renderers (`wall`, `food`, `bonusFood`, `wormholeEntry`, `wormholeExit`) draw from the active theme via a `theme` parameter threaded through `_makeTile()`. `_draw()` reads background, overlay, and overlay text colors from `this.colors`. CSS overrides are applied via a `snake-colorblind` class toggled on `<body>` in `mountGame()`.
- **Bang Wong color assignments** (doi:10.1038/nmeth.1618):

| Bang Wong Color | Hex       | Game Element                                   |
| --------------- | --------- | ---------------------------------------------- |
| Black           | `#000000` | Canvas background, snake eyes, page background |
| Bluish Green    | `#009E73` | Snake body (normal, speed boost)               |
| Sky Blue        | `#56B4E9` | Snake head (normal, constrictor ignored)       |
| Orange          | `#E69F00` | Regular food, warning head, wormhole exit      |
| Yellow          | `#F0E442` | Bonus food, speed boost head                   |
| Blue            | `#0072B2` | Wall body                                      |
| Vermillion      | `#D55E00` | Warning body                                   |
| Reddish Purple  | `#CC79A7` | Constrictor ignored body, wormhole entry       |

- **UI overrides**: `.snake-colorblind` CSS rules override body background, text color, checkbox accent, mode select, HUD bonus color, canvas background, game wrapper border, and focus overlay color to match the palette.
- **When disabled**: All visuals use the standard/default color theme.

## Tile Rendering System

Snake segments are rendered using pre-rendered off-screen canvas tiles instead of per-frame drawing calls. Non-snake entities (walls, food, bonus food, wormholes) also use pre-rendered tiles.

### Overview

- **Concept**: At game init, 51 off-screen `<canvas>` elements (26×26px each) are created and stored in `this.tiles`. Each frame, the appropriate tile is drawn onto the main canvas via `drawImage()`.
- **Performance**: Reduces per-frame drawing from dozens of `fillRect` calls to a single `drawImage` per segment/entity.

### Color Themes

Two color theme objects define all visual colors — static element colors, palettes for snake segments, and UI colors. At construction, `this.colors` is bound to the active theme. All rendering code reads from `this.colors.*`.

`THEME_DEFAULT`:
| Key | Value | Usage |
| --- | ----- | ----- |
| `bg` | `#0d1a0d` | Canvas background |
| `wallBody` | `#555` | Wall fill |
| `wallEdgeLight` | `#777` | Wall top/left highlight |
| `wallEdgeDark` | `#333` | Wall bottom/right shadow |
| `food` | `#ff4444` | Regular food circle |
| `foodBonus` | `#ffd700` | Bonus food diamond |
| `wormholeEntry` | `#003a00` | Wormhole entry cell |
| `wormholeExit` | `#e8e8e8` | Wormhole exit cell |
| `overlay` | `rgba(0,0,0,0.7)` | Game-over overlay |
| `overlayText` | `#fff` | Overlay text |
| `paletteNormal` | `{ body:#4a7a4a, head:#8ad88a, eye:#0d1a0d }` | Playing |
| `paletteWarning` | `{ body:#ff6666, head:#ffaaaa, eye:#4a0000 }` | Grace period |
| `paletteIgnored` | `{ body:#c084fc, head:#e2ccff, eye:#4a0060 }` | Constrictor ignored |
| `paletteBoost` | `{ body:#4a7a4a, head:#f0e68c, eye:#0d1a0d }` | Speed boost (head only) |

`THEME_COLORBLIND` follows the same structure with Bang Wong colorblind-friendly values (doi:10.1038/nmeth.1618).

### Palettes

Each palette has `body`, `head`, and `eye` properties, accessed via `this.colors.paletteNormal` / `paletteWarning` / `paletteIgnored` / `paletteBoost`. The active palette set is determined by the bound theme. Each pixel value in the palette also includes the blind variant that are used on the off-chance that a common color blindness display is used (see `THEME_COLORBLIND`).

| Palette          | Key    | State                      |
| ---------------- | ------ | -------------------------- |
| `paletteNormal`  | `''`   | Playing                    |
| `paletteWarning` | `'_w'` | Grace period               |
| `paletteIgnored` | `'_i'` | Constrictor self-collision |
| `paletteBoost`   | `'_b'` | Speed boost (head only)    |

### Segment Shapes (`TILE_RENDERERS`)

19 drawing functions, each receiving `(ctx, palette)` for snake shapes or `(ctx, _p, theme)` for static shapes and drawing on a 26×26 canvas:

| Key             | Shape                                              |
| --------------- | -------------------------------------------------- |
| `headUp`        | Head facing up, two eyes near top edge             |
| `headDown`      | Head facing down, two eyes near bottom edge        |
| `headLeft`      | Head facing left, two eyes near left edge          |
| `headRight`     | Head facing right, two eyes near right edge        |
| `bodyHoriz`     | Solid filled rectangle (horizontal segment)        |
| `bodyVert`      | Solid filled rectangle (vertical segment)          |
| `tailUp`        | Rounded tail pointing up (arc-based semicircle)    |
| `tailDown`      | Rounded tail pointing down (arc-based semicircle)  |
| `tailLeft`      | Rounded tail pointing left (arc-based semicircle)  |
| `tailRight`     | Rounded tail pointing right (arc-based semicircle) |
| `cornerRD`      | Right→down corner (arc in top-left quadrant)       |
| `cornerLD`      | Left→down corner (arc in top-right quadrant)       |
| `cornerRU`      | Right→up corner (arc in bottom-left quadrant)      |
| `cornerLU`      | Left→up corner (arc in bottom-right quadrant)      |
| `wall`          | 3D beveled wall block (static tile, uses theme)    |
| `food`          | Red circle (static tile, uses theme)               |
| `bonusFood`     | Golden diamond (static tile, uses theme)           |
| `wormholeEntry` | Dark green filled square (static tile, uses theme) |
| `wormholeExit`  | Off-white filled square (static tile, uses theme)  |

### Tile Creation (`_createTiles`)

Called during `_buildDOM()` and `_resizeCanvas()` (NOT during `init()`). Creates 51 tiles total:

1. **3 full sets** (14 snake shapes × 3 palettes = 42): Normal (`''`), Warning (`'_w'`), Ignored (`'_i'`)
2. **4 boost heads** (head shapes × boost palette = 4): `headUp_b`, `headDown_b`, `headLeft_b`, `headRight_b`
3. **5 static tiles**: `wall`, `food`, `bonusFood`, `wormholeEntry`, `wormholeExit` (rendered with `PALETTE_NORMAL`, not palette-dependent)

Helper methods:

- `_createTileSet(palette, suffix)` — creates 14 tiles for one palette, skipping static keys, returns `{key: canvas}` object
- `_makeTile(key, palette)` — creates a single 26×26 off-screen canvas, calls `TILE_RENDERERS[key](ctx, palette)`, returns the canvas

### Tile Selection at Draw Time (`_draw`)

Walls, wormholes, food, and bonus food are drawn via their static tile keys. For snake segments:

1. `_getSegmentTileKey(i)` determines the base shape key (e.g., `headUp`, `bodyHoriz`, `cornerLD`)
2. State suffix is appended: `_b` (boost head), `_i` (ignored), `_w` (warning), or `''` (normal)
3. `this.ctx.drawImage(this.tiles[key], x, y, CELL_SIZE, CELL_SIZE)` draws the pre-rendered tile

### Segment Key Resolution (`_getSegmentTileKey`)

Determines which shape to use for segment index `i`:

- **Head** (`i === 0`): Uses `this.direction` mapped through `DIR_KEY` → `headUp`/`headDown`/`headLeft`/`headRight`. Falls back to Right if direction is `{0,0}`.
- **Tail** (`i === length - 1`): Uses direction from previous segment → `tailUp`/`tailDown`/`tailLeft`/`tailRight`, or falls back to `bodyHoriz`/`bodyVert`
- **Body** (middle segments): Compares `dirIn` (from previous segment) and `dirOut` (to next segment):
  - Same directional axis → `bodyHoriz` or `bodyVert`
  - Different axes → looked up in `CORNER_MAP` (`cornerLD`, `cornerRD`, `cornerLU`, `cornerRU`)
  - Non-cardinal directions → falls back to `bodyHoriz`/`bodyVert`
- **Wrap-aware**: `BoundaryManager.dirBetween()` uses `enableWrap` option to handle wrap-around adjacency

### Direction & Corner Maps

```js
// Direction offset → name
const DIR_KEY = { '0,-1': 'Up', '0,1': 'Down', '-1,0': 'Left', '1,0': 'Right' };

// Incoming→outgoing direction → corner shape
const CORNER_MAP = {
  'Right->Down': 'cornerRD',
  'Up->Right': 'cornerLD',
  'Left->Down': 'cornerLD',
  'Up->Left': 'cornerRD',
  'Right->Up': 'cornerRU',
  'Down->Right': 'cornerLU',
  'Left->Up': 'cornerLU',
  'Down->Left': 'cornerRU',
};
```

### Adding New Segment Shapes

To add a new shape:

1. Add a drawing function to `TILE_RENDERERS` — receives `(ctx, palette)`, draws on 26×26 canvas
2. If palette-dependent: add the shape key to `_getSegmentTileKey()` logic where appropriate. If static: add to `STATIC_TILE_KEYS` set.
3. No changes needed to `_createTiles()` — it iterates all keys in `TILE_RENDERERS` automatically (palette-dependent shapes via `_createTileSet`, static shapes at top-level).
4. No changes needed to `_draw()` — it uses the key returned by `_getSegmentTileKey()` directly.

## Architecture

- **Files**:
  - `index.html` — markup, mode selector, feature toggles, settings persistence (localStorage), and game mounting logic
  - `snake.js` — `SnakeGame` class plus supporting manager classes
  - `snake-ui.css` — page shell, mode selector, and feature toggle styles
  - `snake-game.css` — game canvas, HUD, overlay, and message styles
- **SnakeGame class** with `constructor(container, options)`, `init()`, `destroy()`, `_buildDOM()`, `_bindEvents()`
- **Manager classes** (all in `snake.js`):
  - `TimerManager` — named timers (intervals and timeouts) with clear-by-name semantics and bulk clear
  - `SnakeBody` — ordered segment array with O(1) position lookup set
  - `WallsManager` — static wall layout, collision checks, wall-set queries
  - `BoundaryManager` — wrap vs. solid boundaries, coordinate wrapping, wrap-aware direction computation
  - `WormholesManager` — wormhole spawn/lifetime timers, teleportation, rendering
  - `BonusFoodManager` — bonus food spawn (timed or count-based), movement, collision, eating
  - `ScoreBonusManager` — decaying bonus multiplier, HUD display
  - `SpeedManager` — game-speed acceleration from food eaten
  - `InputManager` — direction buffering, speed boost, instant movement, touch/swipe input
  - `CollisionResolver` — collision detection, grace period, ignored state routing
- **Options**: `mode` (`'classic'`, `'timeTrial'`, or `'constrictor'`), `enableBonusFood`, `enableGracePeriod`, `enableShrinkOnBonusFood`, `enableSpeedUp`, `enableScoreBonus`, `enableWrap`, `enableSpeedBoost`, `enableInputBuffer`, `enableInstantMovement`, `enableTimedBonusFood`, `enableWalls`, `enableWormholes`, `enableColorblindMode` — toggled via UI; game remounts on change
- **Canvas**: 500×500px, grid size `COLS=20, ROWS=20`, cell size `CELL_SIZE=25`px
- **HUD**: Score display + bonus score + timer (`Time: M:SS`)
- **State machine**: `waiting` → `playing` → `warning`/`ignored` → `over` (Space restarts to `waiting`); transitions validated via `STATE_TRANSITIONS`
- **Game loop**: Recursive `setTimeout` via `_scheduleNextTick()` — each tick calls `_update()` then reschedules if still playing. Interval adjusted for speed boost (`currentSpeed / 1.35` when active).
- **Tick pipeline** (`_update`): `commitDirection` → `resolveNextHead` (compute head position, wrap, wormhole teleport) → `processCollision` (check wall/boundary/self, route to warning/ignored/over) → `unshift` new head → mode-specific turn logic (`_processClassicTurn` or `_processConstrictorTurn`) → `_draw()`
- **Input**: Arrow keys and touch swipes routed through `InputManager`; Space restarts from `over` state
- **Touch support**: Swipe detection with 30px threshold; prevents page scrolling during gameplay
- **Settings persistence**: All toggle states and mode selection saved to `localStorage` under key `snake-game-settings` on every mount; restored from storage on page load
- **Warning state**: 700ms grace period before game over when about to collide; player can dodge with a safe arrow key (grace period only active when `enableGracePeriod` is on)
- **Snake data**: `SnakeBody` instance wrapping an array of `{x, y}` — `unshift` head, `pop` tail (skip pop when eating food). O(1) occupancy checks via `has(x, y)`.
- **Growth**: Eating regular food sets `growth = 1`, causing the snake to grow by 1 segment on the next tick (tail is not popped). In constrictor mode, `startGrowth = 14` provides auto-growth to length 15.
- **Board-full detection**: `freeTiles` is computed in `init()` as `COLS * ROWS` minus wall count. After each food eaten, `snake.length` is compared against `freeTiles`; if equal or greater, `_gameOver()` is called immediately (bypassing grace period).
- **Food placement**: Random grid position; retries if overlapping snake body, walls, or enclosed region (max 200 retries in constrictor mode). Falls back to `_findAnyFreeTile()` if all retries are exhausted.
- **Bonus food**: Golden diamond, appears every 15 seconds (timed mode) or every 5 foods eaten (count mode), worth 100pts, moves randomly at `(currentSpeed + 60)`ms intervals, expires after 5s. Eating bonus food by head (classic/time-trial) or enclosure (constrictor) awards points and optionally shrinks snake by half via `SnakeBody.splice(Math.ceil(length / 2))` (minimum length 15 in constrictor mode).
- **Pause/Resume**: Canvas `focus`/`blur` events with a `snake-focus-overlay` div; all timers cleared on pause, restored on resume with remaining time recalculated. Supports paused recovery in `playing`, `warning`, and `ignored` states.
- **Reversal guard**: Player cannot reverse direction in a single tick. `InputManager.commitDirection()` skips opposite directions in buffer processing.
- **Game over overlay**: Semi-transparent dark overlay with "GAME OVER" (font size `CELL_SIZE * 1.28`, bold Courier New) and "Score: X" (font size `CELL_SIZE * 0.96`, Courier New) drawn on canvas when `state === 'over'`. Message text below canvas reads "Game Over! Press Space or tap to restart".
- **Timer display**: `_updateTimerDisplay()` runs every 1000ms via `setInterval`. In classic/constrictor mode, counts up from 0:00. In time-trial mode, counts down from 2:00 (`TIME_LIMIT = 120000`ms) and triggers game over at 0:00.

## Responsive Canvas Sizing

The canvas is **not** fixed at 500×500px — it resizes to fit the viewport via a `ResizeObserver` and JavaScript pixel-calculation logic. The 20×20 grid is maintained; only the pixel density changes.

### Initialization Flow

1. `_buildDOM()` hardcodes the canvas to 500×500 with `CELL_SIZE = 25` as a safe fallback.
2. `_bindEvents()` creates a `ResizeObserver` on `this.container` (`.snake-game-container`), and queues a `requestAnimationFrame` callback that calls `_resizeCanvas()` after the first paint (when layout is available).
3. The `ResizeObserver` watches `.snake-game-container` (NOT `.snake-game-wrapper`) because the wrapper is `display: inline-block` sized to its canvas child — observing it creates a chicken-and-egg deadlock where the wrapper size is determined by the canvas, not the viewport.

### `_resizeCanvas()` Logic

```
availableWidth = .snake-container.clientWidth
if (availableWidth < 20) return    // guard: layout not yet computed
cellSize = max(10, floor(availableWidth / COLS))
canvasSize = cellSize * COLS
if (canvasSize === canvas.width && cellSize === CELL_SIZE) return  // no-op
canvas.width = canvas.height = canvasSize
CELL_SIZE = cellSize
_createTiles()
if (this.snake) _draw()             // guarded: snake doesn't exist during init
```

### Key Constraints

| Constraint            | Value         | Reason                                     |
| --------------------- | ------------- | ------------------------------------------ |
| `CELL_SIZE` minimum   | 10px          | `Math.max(10, ...)` guard                  |
| Canvas minimum        | 200px         | 10px × 20 cols                             |
| Wrapper minimum       | 210px         | 200px canvas + 5px border × 2 sides        |
| Container `max-width` | 510px         | 500px canvas + 10px border at default size |
| Viewports < 210px     | Layout broken | Canvas physically can't shrink below 200px |

### Practical Minimum

According to StatCounter (April 2026), the narrowest popular mobile width is 360px. The oldest iPhone SE (1st gen) has 320px. No mainstream device has a viewport below 210px. The 10px floor is a code-level safety net, not a real-world concern.

## Variable-Size Tile Rendering

Tiles are pre-rendered off-screen canvases that must render correctly across varying `CELL_SIZE` values (25px default, as low as 10px).

### Architecture

- **Tile canvases**: Always **26×26 pixels** (`_makeTile`). The 19 `TILE_RENDERERS` functions use hardcoded 26px coordinates — tiles are rendered at their native resolution regardless of `CELL_SIZE`.
- **Main canvas draw**: `ctx.drawImage(tile, x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)` — scales the 26×26 tile to `CELL_SIZE × CELL_SIZE` destination pixels with default bilinear filtering. Because tiles are rendered at 26×26 with clean integer coordinates (no internal anti-aliasing), bilinear interpolation at tile boundaries produces smooth results without visible streaks.
- **No `imageSmoothingEnabled` override**: The default `true` (bilinear) is used. It was briefly set to `false` (nearest-neighbor) to work around a separate `ctx.scale()` issue, but that was reversed once the root cause was fixed.

### Why Not `ctx.scale()` Inside Tiles?

A previous approach used `ctx.scale(CELL_SIZE/26, CELL_SIZE/26)` inside `_makeTile()` to proportionally map renderer coordinates to the actual tile size. This caused:

1. **Non-integer coordinates** — `fillRect(3, 3, 20, 20)` scaled to fractional pixels (e.g., at CELL_SIZE=20: `fillRect(2.31, 2.31, 15.38, 15.38)`).
2. **Anti-aliased edges within tiles** — fractional coordinates trigger canvas anti-aliasing.
3. **Visible streaks at seams** — when adjacent tiles are drawn side by side, their anti-aliased edge pixels blend, creating visible lines between cells.

The current approach renders tiles once at 26×26 with clean integer coordinates, then scales the finished tile image via default bilinear filtering. Because the tile content is internally crisp, the bilinear filtering at boundaries blends cleanly between adjacent tiles without visible streaks.

### Tradeoff

At smaller `CELL_SIZE` values, bilinear downscaling from 26px produces smoothly interpolated results. Shapes retain their character but soften slightly — a standard tradeoff for dynamically-sized sprite rendering.

## Responsive Layout (< 510px)

When the viewport width drops below 510px, the CSS media queries restructure the UI to fit:

### `snake-game.css` — HUD and Game Area

- `.snake-container` becomes a **flex column** so `order` can reposition children.
- `.snake-game-wrapper` (`order: 0`) stays on top (canvas first).
- `.snake-hud` (`order: 1`, `flex-direction: column`) moves below the canvas, stacked vertically: Score → Bonus → Time. Font shrinks from 22px to 14px.
- `.snake-message` is hidden (`display: none`) on small screens.

### `snake-ui.css` — Controls and Options

- `.snake-root` gets `width: 100%; padding: 0 12px; box-sizing: border-box` — creates 12px of breathing room on each side.
- `.snake-toggles` switches from fixed 510px to `width: 100%`.
- Toggle grid changes from 2 columns to 1 column.
- All font sizes reduce by ~3-4px.
- Checkboxes shrink to 16px.
- The `<hr>` rule switches from fixed 510px to `width: 100%`.
