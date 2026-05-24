# Input Handling

All input flows through `InputManager`, which supports keyboard, touch/tap, buffering, speed boost, and instant movement.

## Keyboard

Arrow keys map to cardinal directions. Space restarts from the `over` state. Input is ignored when focus is on form elements (`<input>`, `<select>`, etc.).

## Touch / Tap

Touch events on the canvas detect taps. The canvas is divided into four directional zones relative to its center. Tapping on the left, right, top, or bottom half sets the corresponding direction. When a tap is diagonal (not clearly in one half), the axis with the larger absolute distance from center determines the direction — e.g., a tap in the top-right quadrant that is farther right than up results in a right direction. Taps very close to the center (within 20px) are ignored. The same tap also restarts the game when in the game over state.

## State-Based Routing

Input is routed based on game state:

- **`waiting`**: Sets direction and starts the game
- **`playing`**: Delegates to `InputManager.handlePlayingInput()` for buffering/boost/instant logic
- **`warning`**: Checks if the direction avoids collision; if safe, escapes the warning and resumes
- **`unfocused`**: All direction input is ignored (no-op). Tap/click on the overlay triggers resume.
- **`over`**: Space/tap restarts

## Input Buffer (`enableInputBuffer`)

Up to 2 direction inputs can be queued. Each tick, `commitDirection()` shifts the oldest valid entry — skipping opposite and duplicate directions. This prevents rapid key sequences (e.g., Right→Up) from being lost between ticks.

When disabled, direction is set directly on each keypress with no queuing.

## Speed Boost (`enableSpeedBoost`)

Pressing the same arrow key as the current direction activates a 1.35× speed multiplier. The snake head renders with a goldenrod palette. Changing direction deactivates the boost. Boost also shortens the warning grace period timeout by the same factor.

## Fault Filter (`enableFaultFilter`)

When enabled, direction inputs that would cause an immediate wall, boundary, or self collision are silently ignored. Works in both buffered and unbuffered modes. In buffered mode, unsafe buffered directions are skipped during `commitDirection()`. In unbuffered mode, the rejected direction is discarded immediately so it won't be applied on a later tick. Default is `true`.

## Instant Movement (`enableInstantMovement`)

When enabled, a valid direction keypress triggers an immediate `_update()` call, and the rAF loop's accumulator is reset. This makes the snake move instantly rather than waiting for the next tick. Opposite-direction presses are ignored entirely.

When both buffering and instant movement are enabled, each keypress pushes to the buffer then triggers an immediate tick that consumes one buffer entry.
