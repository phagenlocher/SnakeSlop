# Collision

`CollisionResolver` detects wall, boundary, and self-collisions and routes them through grace period, ignored state, or game over logic.

## Collision Types

| Type     | Condition                                                                      |
| -------- | ------------------------------------------------------------------------------ |
| Wall     | Head position matches a wall cell (walls are always solid, regardless of wrap) |
| Boundary | Head position is outside the 20×20 grid (no-op when wrap is enabled)           |
| Self     | Head position overlaps any snake body segment                                  |

## Grace Period (`enableGracePeriod`)

When a collision is detected and grace period is enabled:

1. Game loop and bonus-food movement timers are cleared
2. Snake turns red (warning palette)
3. A 700ms countdown starts (shortened to ~519ms if speed boost is active)
4. During this window, pressing a safe arrow key escapes the warning and resumes `playing`
5. Unsafe directions are ignored
6. If the timeout expires, game over is triggered

When disabled, any collision triggers immediate game over.

## Constrictor Self-Collision (Ignored State)

In constrictor mode, self-collision routes to the `ignored` state instead of triggering warning or game over:

1. Snake freezes and turns magenta (ignored palette)
2. The rAF loop is stopped and all timers (bonus food, score decay) are cleared
3. The prompt "Snake stuck — press a safe direction" appears
4. If a safe direction exists and the player presses it, the game resumes
5. If **no** safe direction exists (all four adjacent cells are blocked), game over is triggered immediately via `hasAnySafeMove()`

Grace period has no effect on self-collision in constrictor mode.

## Safe Move Checking

`isDirSafe()` checks whether moving in a given direction from the snake's head would avoid all three collision types. `hasAnySafeMove()` checks all four cardinal directions and returns `true` if at least one is clear. Both respect wrap when enabled.

## Board-Full Detection

After eating food, `snake.length` is compared against `freeTiles` (total cells minus wall count). If the snake fills all playable tiles, game over triggers immediately — bypassing grace period and ignored state.
