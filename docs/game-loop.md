# Game Loop & Timing

The game loop uses a recursive `setTimeout` pattern managed through `TimerManager`.

## Tick Pipeline (`_update`)

Each tick executes in this order:

1. **Process input** — `commitDirection()` consumes the oldest buffered direction or applies `nextDirection`
2. **Resolve head** — computes new head position, applies wrap, checks wormhole teleport
3. **Process collision** — checks wall/boundary/self; routes to warning, ignored, or game over
4. **Advance snake** — `unshift` new head at front
5. **Mode-specific logic** — classic/time-trial food eating + growth, or constrictor enclosure checks + auto-growth
6. **Draw** — renders the full frame

If collision handling changes state away from `playing`, the remaining steps in the pipeline are skipped.

## Scheduling

`_scheduleNextTick()` computes the delay (adjusted by speed boost if active) and sets a named `'gameLoop'` timeout. The timeout callback calls `_update()`, then reschedules if state is still `playing`.

## Speed Management (`SpeedManager`)

- **Base speed**: 135ms interval
- **Minimum speed**: 50ms (fastest)
- **Rate step**: 0.2

Formula: `currentSpeed = max(MIN_SPEED, 1000 / (1000/BASE_SPEED + RATE_STEP × foodsEaten))`

Each regular food eaten triggers `onFoodEaten()` which recalculates and restarts the game loop with the new interval. When `enableSpeedUp` is disabled, speed stays at 135ms.

## Pause / Resume

Canvas `focus`/`blur` events trigger pause and resume:

- **Pause** (`_pauseGame()`): Clears all timers. If in `warning` state, saves remaining warning time. Shows pause overlay.
- **Resume** (`_resumeGame()`): Restores per-state timers:
  - `playing`: Restarts game loop, timer interval display, bonus food and wormhole timers
  - `warning`: Reschedules warning countdown with remaining time, restarts timer display
  - `ignored`: Restarts timer display, bonus food, and wormhole timers

Bonus food movement interval and score bonus decay resume with their remaining state (not reset).

## Timer Display

A 1-second interval updates the HUD timer display:

- **Classic/Constrictor**: Counts up from `0:00` as `M:SS`
- **Time Trial**: Counts down from `2:00` as `M:SS`; triggers game over at `0:00`
