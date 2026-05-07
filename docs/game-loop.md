# Game Loop & Timing

The game loop uses a `requestAnimationFrame`-based loop with a decoupled physics accumulator.

## Tick Pipeline (`_update`)

Each physics tick executes in this order:

1. **Process input** — `commitDirection()` consumes the oldest buffered direction or applies `nextDirection`
2. **Resolve head** — computes new head position, applies wrap, checks wormhole teleport
3. **Process collision** — checks wall/boundary/self; routes to warning, ignored, or game over
4. **Advance snake** — `unshift` new head at front
5. **Mode-specific logic** — classic/time-trial food eating + growth, or constrictor enclosure checks + auto-growth

If collision handling changes state away from `playing`, the remaining steps in the pipeline are skipped.

## Scheduling

`_runLoop(now)` is the `requestAnimationFrame` callback. Each frame:

1. Guards: returns immediately if state is not `playing`
2. Schedules the next rAF callback
3. Computes `delta = now - _lastFrameTime` and `targetInterval` (adjusted for speed boost)
4. If `delta >= targetInterval`: runs `_update()` and applies sync compensation (`_lastFrameTime = now - (delta % targetInterval)`)
5. Always calls `_draw()` — rendering runs at the display's native refresh rate

`_startLoop(now)` initializes `_lastFrameTime` and starts the rAF chain. `_stopLoop()` cancels it via `cancelAnimationFrame`.

## Speed Management (`SpeedManager`)

- **Base speed**: 135ms tick interval
- **Minimum speed**: 50ms (fastest)
- **Rate step**: 0.2

Formula: `currentSpeed = max(MIN_SPEED, 1000 / (1000/BASE_SPEED + RATE_STEP × foodsEaten))`

Each regular food eaten triggers `onFoodEaten()` which recalculates `currentSpeed`. The rAF accumulator reads `currentSpeed` on each frame, so speed changes take effect immediately without needing to restart the loop. When `enableSpeedUp` is disabled, speed stays at 135ms.

## Pause / Resume

Canvas `focus`/`blur` events trigger pause and resume:

- **Pause** (`_pauseGame()`): Stops the rAF loop and clears all timers. If in `warning` state, saves remaining warning time. Shows pause overlay. rAF also auto-pauses in background tabs as an additional safety net.
- **Resume** (`_resumeGame()`): Restores per-state timers:
  - `playing`: Starts the rAF loop, timer interval display, bonus food and wormhole timers
  - `warning`: Reschedules warning countdown with remaining time, restarts timer display
  - `ignored`: Restarts timer display, bonus food, and wormhole timers

Bonus food movement interval and score bonus decay resume with their remaining state (not reset).

## Timer Display

A 1-second interval updates the HUD timer display:

- **Classic/Constrictor**: Counts up from `0:00` as `M:SS`
- **Time Trial**: Counts down from `2:00` as `M:SS`; triggers game over at `0:00`
