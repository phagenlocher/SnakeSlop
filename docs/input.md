# Input Handling

All input flows through `InputManager`, which supports keyboard, touch/swipe, buffering, speed boost, and instant movement.

## Keyboard

Arrow keys map to cardinal directions. Space restarts from the `over` state. Input is ignored when focus is on form elements (`<input>`, `<select>`, etc.).

## Touch / Swipe

Touch events on the game wrapper detect swipes with a 30px threshold. The dominant axis (horizontal or vertical) determines the direction. Page scrolling is prevented during gameplay.

## State-Based Routing

Input is routed based on game state:

- **`waiting`**: Sets direction and starts the game
- **`playing`**: Delegates to `InputManager.handlePlayingInput()` for buffering/boost/instant logic
- **`warning`**: Checks if the direction avoids collision; if safe, escapes the warning and resumes
- **`ignored`**: Same safety check; if safe, escapes the ignored state and resumes
- **`over`**: Space/tap restarts

## Input Buffer (`enableInputBuffer`)

Up to 2 direction inputs can be queued. Each tick, `commitDirection()` shifts the oldest valid entry — skipping opposite and duplicate directions. This prevents rapid key sequences (e.g., Right→Up) from being lost between ticks.

When disabled, direction is set directly on each keypress with no queuing.

## Speed Boost (`enableSpeedBoost`)

Pressing the same arrow key as the current direction activates a 1.35× speed multiplier. The snake head renders with a goldenrod palette. Changing direction deactivates the boost. Boost also shortens the warning grace period timeout by the same factor.

## Instant Movement (`enableInstantMovement`)

When enabled, a valid direction keypress triggers an immediate `_update()` call, and the rAF loop's accumulator is reset. This makes the snake move instantly rather than waiting for the next tick. Opposite-direction presses are ignored entirely.

When both buffering and instant movement are enabled, each keypress pushes to the buffer then triggers an immediate tick that consumes one buffer entry.
