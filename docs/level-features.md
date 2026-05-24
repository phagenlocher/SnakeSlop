# Level Features

## Walls (`enableWalls`)

44 static wall cells forming a hollow square ring (columns 3–16, rows 3–16) with 2-cell-wide gaps at the center of each side.

- **Visual**: 3D beveled blocks (`#555` body, `#777` top/left, `#333` bottom/right). Rendered via pre-rendered tile.
- **Collision**: Always solid — hitting a wall triggers collision logic regardless of wrap setting. Grace period applies if enabled.
- **Placement**: Both regular and bonus food avoid wall cells. Bonus food won't move onto walls.
- **Board capacity**: Wall count (44) is subtracted from `freeTiles`, reducing the maximum snake length.

When disabled, no walls are rendered, checked, or subtracted from capacity.

## Wormholes (`enableWormholes`)

Teleport entry/exit pair that appears periodically.

- **Spawn**: Every 30 seconds, if no wormhole pair exists and more than 10 free tiles remain. Entry (dark green) and exit (off-white) are placed at random valid positions at least 5 cells apart (Manhattan distance).
- **Lifetime**: Auto-despawns after 15 seconds, or immediately when the snake enters the entry cell.
- **Teleport**: Snake head stepping onto the entry cell instantly appears at the exit, continuing in the same direction. Both wormholes are consumed.
- **Collision**: If the exit cell is occupied by the snake's body, normal collision rules apply (grace period or game over).
- **Placement**: Entry and exit avoid snake body, food, bonus food, and wall cells. Regular and bonus food also avoid wormhole entry cells (but may spawn on exit cells).

When disabled, no wormholes spawn; rendering, timers, and teleport checks are skipped.

## Wrap Boundaries (`enableWrap`)

When enabled, the snake teleports to the opposite edge instead of dying at boundaries.

- **Head movement**: Position wraps via modulo: `x = (x + COLS) % COLS`, `y = (y + ROWS) % ROWS`
- **Bonus food movement**: Also wraps when moving randomly
- **Drawing**: `_getSegmentTileKey()` uses wrap-aware direction computation for correct segment shapes across wraps

When disabled, hitting any grid edge triggers collision logic.
