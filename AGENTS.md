# Snake Game

Multi-file vanilla HTML/CSS/JS Snake game rendered on an HTML5 Canvas.

## Run

Open `index.html` directly in a browser.

## Build, Lint, Typecheck, Test

No tooling is configured. This is a zero-dependency static page.

## Game Modes

All modes are selected via a `<select>` dropdown in `index.html` and passed as the `mode` option to `SnakeGame(container, options)`. The game is destroyed and remounted whenever the mode changes. All feature toggles apply identically regardless of mode.

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
- **Self-collision**: Running into your own body does not kill the snake. Instead, the game enters the `ignored` state — the snake freezes, turns magenta (`#c084fc` body, `#e2ccff` head), and waits indefinitely for the player to press a safe direction. If no safe direction exists (all adjacent cells are blocked by walls, boundaries, or the snake's own body), the game ends immediately via `_hasAnySafeMove()`.
- **Head hits food** (regular): The food disappears (poofs) and is replaced at a random **non-enclosed** position. No score, no growth. Guarded by `snake.length < freeTiles` to prevent board-full infinite loops.
- **Head hits bonus food**: No effect — bonus food is enclosure-only.
- **Enclosure eating** (regular food): Flood-fill BFS from the food through non-snake, non-wall cells. In non-wrap mode, if the flood fill cannot reach the grid boundary, the food is enclosed. In wrap mode, the flood fill wraps (modulo), and all connected components of free cells are compared — the food is enclosed if its component is smaller than the largest component (the "outside" region). Eating by enclosure awards 10 pts + bonus score, speed up, and `foodsEaten++`. The snake never grows from eating food — length stays constant at 15 after auto-growth.
- **Enclosure eating** (bonus food): Same flood-fill check. Awards 100 pts, clears bonus timers. Shrink is disabled in constrictor mode. Also checked in `_moveBonusFood()` after each random step.
- **Food placement**: `_placeFood()` rejects positions that are already enclosed (max 100 retries), ensuring food always spawns in the outside region.
- **All Classic rules apply**: Grace period, speed boost, bonus food, walls, wrap, etc. all function identically, except `enableShrinkOnBonusFood` which is ignored and self-collision which enters the `ignored` state instead of warning/game over (grace period toggle has no effect on self-collision). Bonus food moves, expires, and follows the same timing rules — only the eating mechanic (enclosure vs head) differs.

## Togglable Features

All features are controlled via checkboxes in `index.html` and passed as options to `SnakeGame(container, options)`. The game is destroyed and remounted whenever any toggle changes.

### `enableBonusFood` (default: `true`)

Enables the golden diamond bonus food mechanic.

- **Appearance**: A golden diamond (`#FFD700`) rendered on the canvas, distinct from the regular green food (`#7aff7a`).
- **Spawn trigger**: Appears every 15 seconds via a time-based trigger (`enableTimedBonusFood`), but only if no bonus food is already on the board.
- **Placement**: Random grid position, avoiding both snake body and regular food.
- **Movement**: Moves randomly in one of four cardinal directions at intervals of `currentSpeed + 60`ms via `setInterval`. Respects `enableWrap` for boundary behavior.
- **Expiration**: Auto-removes after 5 seconds via `setTimeout`.
- **Points**: Worth 100 points when eaten.
- **When disabled**: No bonus food ever spawns; `_placeBonusFood()` returns early; bonus food rendering, movement, and collision checks are all skipped.

### `enableGracePeriod` (default: `true`)

Enables a 1-second warning/grace period before game over when the snake is about to collide.

- **Trigger**: When `_update()` detects the next head position would hit a wall or the snake's own body.
- **Behavior**: Instead of immediate game over, enters `warning` state:
  - Game loop and bonus food movement timers are cleared.
  - Snake turns red (`#ff6666`) via the draw routine.
  - A 1-second `setTimeout` countdown begins.
  - The player can press any **safe** arrow key (one that does not lead to collision) to escape the warning and resume `playing` state.
  - If the player presses an unsafe direction during warning, it is ignored.
  - If no safe key is pressed within 1 second, `_gameOver()` is called.
- **When disabled**: Collision causes immediate game over with no warning window.
- **Constrictor interaction**: Self-collision in constrictor mode always enters the `ignored` state regardless of the grace period setting. Walls and boundaries still respect the grace period.

### `enableShrinkOnBonusFood` (default: `true`)

Controls whether the snake shrinks when eating bonus food.

- **Behavior**: When bonus food is eaten, the snake's length is halved via `this.snake.splice(Math.ceil(this.snake.length / 2))`, removing the tail half. Any pending `growth` counter is unaffected (the snake will still grow by remaining ticks if `growth > 0`). Note: This option is ignored in constrictor mode — bonus food never shrinks the snake.
- **Dependency**: Only has effect when `enableBonusFood` is also enabled and mode is not `constrictor` (bonus food must exist to be eaten).
- **When disabled**: Eating bonus food still awards 100 points and clears the bonus food, but the snake retains its full length.

### `enableSpeedUp` (default: `true`)

Controls whether the game accelerates as the player eats food.

- **Mechanism**: Each regular food eaten reduces the game loop interval by `SPEED_STEP=2.4`ms.
- **Bounds**: Starts at `BASE_SPEED=135`ms, floors at `MIN_SPEED=50`ms.
- **Implementation**: `clearInterval` on the old game loop, then `setInterval` with the new `currentSpeed`.
- **Cascade effect**: Bonus food movement interval (`currentSpeed + 60`) also shifts when speed changes. Pause/resume recalculates intervals using the current speed.
- **When disabled**: Game runs at a constant `BASE_SPEED=135`ms throughout the entire session.

### `enableScoreBonus` (default: `true`)

Enables a decaying bonus score multiplier displayed in the HUD as `Bonus: N`.

- **Initial value**: Starts at 100 points each game and after each regular food eaten.
- **Decay**: Decreases by 1 point every 200ms (5 points per second) via `setInterval`, bottoming out at 0. The HUD updates live (`Bonus: N`).
- **Application**: When regular food is eaten, if `scoreBonus > 0`, the current bonus value is added to the score **in addition to** the base 10 points.
- **Reset**: After eating regular food, `scoreBonus` resets to 100 and a new decay interval starts.
- **HUD**: Shown as `<span class="bonus">Bonus: 100</span>` in the HUD bar between Score and Time.
- **Pause/resume**: Decay timer is cleared on pause and restarted on resume (remaining decay continues from where it left off, but the value itself is not adjusted for elapsed pause time).
- **When disabled**: No bonus score is ever added; the bonus HUD element still renders but never changes from its initial value display; decay interval never starts.

### `enableWrap` (default: `true`)

Enables wrap-around boundaries — the snake teleports to the opposite edge instead of dying at walls.

- **Head movement**: In `_update()`, the new head position is wrapped using modulo: `x = (x + COLS) % COLS`, `y = (y + ROWS) % ROWS`.
- **Bonus food movement**: In `_moveBonusFood()`, bonus food also wraps when moving randomly.
- **Collision**: Wall collision is effectively disabled. The snake can still die by running into its own body.
- **Grace period interaction**: When `enableWrap` is on, wall collisions never occur, so the grace period only triggers on self-collision.
- **When disabled**: Hitting any of the four walls triggers collision logic (grace period or immediate game over depending on `enableGracePeriod`).

### `enableSpeedBoost` (default: `true`)

Enables a temporary speed boost when the player presses the same direction key as the current movement direction.

- **Mechanism**: When the player presses the same arrow key as the current direction (e.g., pressing Right while already moving Right), the game loop interval is divided by `1.35`, making the snake move ~35% faster.
- **Visual indicator**: Snake head turns goldenrod (`#f0e68c`) via the draw routine.
- **Activation**: `_activateSpeedBoost()` — sets `speedBoostActive = true`, clears and re-sets `gameLoop` with `currentSpeed / 1.35`.
- **Deactivation**: `_deactivateSpeedBoost()` — sets `speedBoostActive = false`, restores `gameLoop` to `currentSpeed`. Triggered when the player changes direction or escapes the warning state.
- **Warning interaction**: The warning timeout window is also shortened by 1.35 when boosting (`700 / 1.35`ms ≈ 519ms).
- **Resume interaction**: On resume, the game loop uses the boosted interval if `speedBoostActive` is true.
- **When disabled**: Pressing the same direction key does nothing special; game runs at constant `currentSpeed` regardless of repeated keypresses.

### `enableInputBuffer` (default: `true`)

Enables queuing rapid direction inputs so they aren't lost between game ticks.

- **Mechanism**: An `inputBuffer` array holds up to 2 queued directions.
- **Processing** (`_update`): Each tick, the buffer is shifted — the first valid (non-opposite) direction is committed to `this.direction`. This allows rapid sequences like Right→Up to execute across consecutive ticks even if pressed faster than the game loop.
- **Guards**: Opposite directions and duplicates are rejected. Buffer is capped at 2 entries.
- **Grace period**: During warning state, `graceDirection` is used as the reference direction for buffer processing.
- **When disabled**: Classic behavior — `nextDirection` is set directly on keypress; only the last keypress before a tick takes effect; no buffering.

### `enableTimedBonusFood` (default: `true`)

Replaces the food-count-based bonus food spawn with a time-based trigger.

- **Mechanism**: A `setInterval` fires every 15 000 ms. If no bonus food is currently on the board, `_placeBonusFood()` is called.
- **Dependency**: Requires `enableBonusFood` to also be enabled; otherwise does nothing.
- **Replacement behavior**: When this option is on, the `foodsEaten % 5 === 0` trigger in `_update()` is bypassed entirely — bonus food spawns *only* from the 15-second timer.
- **Pause/resume**: Timer is cleared on pause (via `_clearAllTimers()`) and restarted fresh on resume via `_startBonusFoodTimer()`.
- **When disabled**: Bonus food spawns via the original food-count mechanic (every 5 regular foods eaten).

### `enableWalls` (default: `true`)

Enables static walls arranged as a hollow square ring with openings in the center of each side.

- **Layout**: Four L-shaped wall segments forming a 14×14 square area (cols 3–16, rows 3–16) with 2-cell-wide gaps at the center of each side. Total 44 wall cells.
- **Appearance**: Dark gray blocks (`#555`) with lighter top/left edges (`#777`) and darker bottom/right edges (`#333`) for a 3D beveled look.
- **Collision**: Walls are always solid regardless of `enableWrap`. Hitting a wall triggers the same collision logic as hitting a boundary or self (grace period if `enableGracePeriod` is on, otherwise immediate game over).
- **Food placement**: Both regular food and bonus food avoid spawning on wall cells.
- **Bonus food movement**: Bonus food will not move onto a wall cell during its random walk.
- **Warning escape**: Directions leading into a wall are rejected as unsafe during the grace period.
- **When disabled**: No walls are rendered or checked; the arena is fully open (subject to `enableWrap` for boundary behavior).

## Architecture

- **Files**:
  - `index.html` — markup, mode selector, feature toggles, and game mounting logic
  - `snake.js` — `SnakeGame` class
  - `snake.css` — styles
- **Class-based**: `SnakeGame` class with `constructor(container, options)`, `init()`, `destroy()`, `_buildDOM()`, `_bindEvents()`
- **Options**: `mode` (`'classic'`, `'timeTrial'`, or `'constrictor'`), `enableBonusFood`, `enableGracePeriod`, `enableShrinkOnBonusFood`, `enableSpeedUp`, `enableScoreBonus`, `enableWrap`, `enableSpeedBoost`, `enableInputBuffer`, `enableTimedBonusFood`, `enableWalls` — toggled via UI; game remounts on change
- **Canvas**: 400×400px, grid size `GRID=20`, columns/rows computed from canvas dimensions
- **HUD**: Score display + bonus score + timer (`Time: M:SS`)
- **State machine**: `waiting` → `playing` → `warning`/`ignored` → `over` (space restarts to `waiting`); pause/resume via canvas focus/blur
- **Game loop**: `setInterval(() => this._update(), currentSpeed)` — speed increases per food eaten: `BASE_SPEED=135` → `MIN_SPEED=50`, step `SPEED_STEP=2.4`
- **Input**: `nextDirection` buffers input; committed to `direction` on each tick to prevent double-input bugs
- **Warning state**: 1-second grace period before game over when about to collide; player can dodge with a safe arrow key (grace period only active when `enableGracePeriod` is on)
- **Snake data**: array of `{x, y}` — `unshift` head, `pop` tail (skip pop when eating food); eating regular food sets `growth = 2`, causing the snake to grow by 2 segments over the next 2 ticks
- **Board-full detection**: `freeTiles` is computed in `init()` as `COLS * ROWS` minus wall count. After each food eaten, `snake.length` is compared against `freeTiles`; if equal or greater, `_gameOver()` is called immediately (bypassing grace period).
- **Food placement**: random grid position, retries if overlapping snake body
- **Bonus food**: golden diamond, appears every 15 seconds, worth 100pts, moves randomly at `(currentSpeed + 60)`ms intervals, expires after 5s; eating it shrinks snake by half via `splice(Math.ceil(length / 2))` (shrinking disabled in constrictor mode)
- **Pause/Resume**: canvas `focus`/`blur` events with a `focus-overlay` div; all timers cleared on pause, restored on resume with remaining time recalculated
- **Reversal guard**: player cannot reverse direction in a single tick
- **Game over overlay**: Semi-transparent dark overlay with "GAME OVER" and "Score: X" drawn on canvas when `state === 'over'`
- **Timer display**: `_updateTimerDisplay()` handles both Classic (count-up) and Time Trial (count-down from 2 minutes) modes
