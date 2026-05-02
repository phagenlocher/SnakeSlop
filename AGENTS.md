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
- **Game over**: Triggered by collision (wall, boundary, or self). No time limit.
- **Final score**: Displayed on the canvas overlay ("GAME OVER" + "Score: X") and in the message text below.

### `timeTrial`

Race against the clock.

- **Timer**: Counts down from `2:00` in the HUD as `Time: M:SS`.
- **Game over**: Triggered when the timer reaches `0:00` OR by collision (same as Classic).
- **Final score**: Displayed on the canvas overlay ("GAME OVER" + "Score: X") and in the message text below.
- **All Classic rules apply**: Grace period, speed boost, bonus food, walls, wrap, etc. all function identically.

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

### `enableShrinkOnBonusFood` (default: `true`)

Controls whether the snake shrinks when eating bonus food.

- **Behavior**: When bonus food is eaten, the snake's length is halved via `this.snake.splice(Math.ceil(this.snake.length / 2))`, removing the tail half. Any pending `growth` counter is unaffected (the snake will still grow by remaining ticks if `growth > 0`).
- **Dependency**: Only has effect when `enableBonusFood` is also enabled (bonus food must exist to be eaten).
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
  - `snake.js` — `SnakeGame` class (~450 lines)
  - `snake.css` — styles (~96 lines)
- **Class-based**: `SnakeGame` class with `constructor(container, options)`, `init()`, `destroy()`, `_buildDOM()`, `_bindEvents()`
- **Options**: `mode` (`'classic'` or `'timeTrial'`), `enableBonusFood`, `enableGracePeriod`, `enableShrinkOnBonusFood`, `enableSpeedUp`, `enableScoreBonus`, `enableWrap`, `enableSpeedBoost`, `enableInputBuffer`, `enableTimedBonusFood`, `enableWalls` — toggled via UI; game remounts on change
- **Canvas**: 400×400px, grid size `GRID=20`, columns/rows computed from canvas dimensions
- **HUD**: Score display + bonus score + timer (`Time: M:SS`)
- **State machine**: `waiting` → `playing` → `warning` → `over` (space restarts to `waiting`); pause/resume via canvas focus/blur
- **Game loop**: `setInterval(() => this._update(), currentSpeed)` — speed increases per food eaten: `BASE_SPEED=135` → `MIN_SPEED=50`, step `SPEED_STEP=2.4`
- **Input**: `nextDirection` buffers input; committed to `direction` on each tick to prevent double-input bugs
- **Warning state**: 1-second grace period before game over when about to collide; player can dodge with a safe arrow key (grace period only active when `enableGracePeriod` is on)
- **Snake data**: array of `{x, y}` — `unshift` head, `pop` tail (skip pop when eating food); eating regular food sets `growth = 2`, causing the snake to grow by 2 segments over the next 2 ticks
- **Food placement**: random grid position, retries if overlapping snake body
- **Bonus food**: golden diamond, appears every 15 seconds, worth 100pts, moves randomly at `(currentSpeed + 60)`ms intervals, expires after 5s; eating it shrinks snake by half via `splice(Math.ceil(length / 2))`
- **Pause/Resume**: canvas `focus`/`blur` events with a `focus-overlay` div; all timers cleared on pause, restored on resume with remaining time recalculated
- **Reversal guard**: player cannot reverse direction in a single tick
- **Game over overlay**: Semi-transparent dark overlay with "GAME OVER" and "Score: X" drawn on canvas when `state === 'over'`
- **Timer display**: `_updateTimerDisplay()` handles both Classic (count-up) and Time Trial (count-down from 2 minutes) modes
