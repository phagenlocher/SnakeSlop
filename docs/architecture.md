# Architecture

The entire game lives in a single file (`snake.js`) separated into two layers:

## Class Hierarchy

**`SnakeGame`** — the core engine class. It owns all game state and delegates specialized responsibilities to manager classes. It manages DOM construction, event binding, the game loop, drawing, and the tick pipeline.

**Manager classes** — each encapsulates one concern:

| Manager             | Responsibility                                                                   |
| ------------------- | -------------------------------------------------------------------------------- |
| `TimerManager`      | Named timers (intervals & timeouts) with clear-by-name semantics and bulk clear  |
| `SnakeBody`         | Ordered segment array with O(1) position lookup set                              |
| `WallsManager`      | Static wall grid, collision queries, wall-set access                             |
| `BoundaryManager`   | Wrap vs. solid boundaries, coordinate wrapping, wrap-aware direction computation |
| `WormholesManager`  | Teleport pair spawning, lifetime, and rendering                                  |
| `BonusFoodManager`  | Golden diamond spawn, random movement, collision, and eating                     |
| `ScoreBonusManager` | Decaying bonus multiplier (99→0) and HUD display                                |
| `SpeedManager`      | Tick-rate acceleration from food eaten (no longer restarts the loop)             |
| `InputManager`      | Direction buffering, speed boost, instant movement, touch/swipe                  |
| `CollisionResolver` | Collision detection, grace period routing                 |

## Dependency Injection

Managers receive their dependencies at construction via plain objects. The game passes callbacks (e.g., `snakeHas`, `wrap`, `getState`) rather than direct references, keeping managers decoupled from the main class internals.

## File Structure

| File             | Purpose                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `index.html`     | Page markup, mode selector, feature toggles (checkboxes), game mounting, localStorage persistence |
| `snake.js`       | All game logic — constants, managers, `SnakeGame` class                                           |
| `snake-game.css` | Canvas, HUD, overlay, message, and responsive layout styles                                       |
| `snake-ui.css`   | Page shell, mode selector, toggle checkbox grid, responsive controls                              |
