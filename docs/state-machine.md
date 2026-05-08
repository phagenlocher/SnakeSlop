# State Machine

The game follows a six-state lifecycle with strictly validated transitions.

## States

| State     | Meaning                                                                         |
| --------- | ------------------------------------------------------------------------------- |
| `waiting` | Game ready, snake rendered at center, awaiting first arrow key press            |
| `playing` | Game loop active, snake moving, all timers running                              |
| `warning` | Grace period — snake about to collide, 700ms window to dodge                    |
| `ignored` | Constrictor mode only — self-collision frozen state, waiting for safe direction |
| `paused`  | Canvas lost focus — all timers stopped, overlay displayed, click/key to resume  |
| `over`    | Game ended — overlay displayed, timers cleared, Space/tap to restart            |

## Valid Transitions

- **waiting** → `playing` (arrow key pressed)
- **playing** → `warning` (collision detected, grace period enabled)
- **playing** → `ignored` (constrictor self-collision with safe moves remaining)
- **playing** → `paused` (canvas loses focus)
- **playing** → `over` (collision, no grace period, or board full, or time-trial time up)
- **warning** → `playing` (safe direction pressed within 700ms)
- **warning** → `paused` (canvas loses focus)
- **warning** → `over` (timeout expires without safe input)
- **ignored** → `playing` (safe direction pressed)
- **ignored** → `paused` (canvas loses focus)
- **paused** → `playing` / `warning` / `ignored` (canvas gains focus, click, or direction key — restores the state it was paused from)
- **over** → `waiting` (Space/tap restarts via `init()`)

Transitions that don't match these paths log a warning and are rejected.

## Lifecycle

1. **Construction** — `SnakeGame` builds DOM, binds events, creates managers, calls `init()`
2. **`init()`** — Sets state to `waiting`, resets all mutable state (snake, score, timers, food, growth), draws initial frame
3. **First input** — Arrow key in `waiting` triggers `_startGame()`: transitions to `playing`, starts the rAF loop and all periodic timers
4. **Each tick** — `_update()` runs the pipeline: process input → compute head → check collision → advance snake → mode logic. Rendering (`_draw()`) is decoupled and runs every rAF frame at the display refresh rate.
5. **Game over** — `_gameOver()` stops the rAF loop, clears all timers, transitions to `over`, draws overlay
6. **Pause/Resume** — Canvas blur transitions to `paused` (stores the current state), clears all timers. Focus/click/key restores the previous state and restarts all timers.
7. **Destroy** — `destroy()` removes event listeners, disconnects ResizeObserver, stops the rAF loop, clears timers. Used before remounting when toggles change.
