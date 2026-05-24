# Collision

`CollisionResolver` detects wall, boundary, and self-collisions and routes them through grace period or game over logic.

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

## Safe Move Checking

`isDirSafe()` checks whether moving in a given direction from the snake's head would avoid all three collision types. Both respect wrap when enabled.

## Board-Full Detection

After eating food, `snake.length` is compared against `freeTiles` (total cells minus wall count). If the snake fills all playable tiles, game over triggers immediately — bypassing grace period.
