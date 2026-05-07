# Food & Scoring

## Regular Food

A red circle placed at a random valid grid position. Avoids snake body, wall cells, and (in constrictor mode) enclosed regions (max 200 retries, falls back to any free tile).

### Eating (Classic / Time Trial)

Head collides with food: awards 10 pts + current score bonus value, increments `foodsEaten`, sets `growth = 1` (snake grows by 1 next tick). Triggers speed recalculation and bonus food spawn check.

### Eating (Constrictor)

Head hitting food has no effect — it just disappears and respawns. Only **enclosure** eating counts: see [Game Modes](game-modes.md) for the flood-fill algorithm.

## Bonus Food

A golden diamond managed by `BonusFoodManager`.

### Spawn

Two modes:

- **Timed** (`enableTimedBonusFood`): A 15-second interval spawns bonus food if none is on the board
- **Count-based**: Appears every 5 regular foods eaten (`foodsEaten % 5 === 0`)

### Behavior

- Moves one step in a random cardinal direction every `currentSpeed + 60`ms
- Respects wrap boundaries; won't move onto wall cells
- Auto-expires after 5 seconds
- In constrictor mode: checks if its position is enclosed each move step

### Eating

- **Classic / Time Trial**: Head collision awards 100 pts and optionally halves snake length (`enableShrinkOnBonusFood`)
- **Constrictor**: Enclosure-based eating awards 100 pts and optionally halves snake length (capped at minimum 15)

When shrink is enabled, `SnakeBody.splice()` removes the tail half of segments. Growth counter is unaffected.

## Score Bonus (`ScoreBonusManager`)

A decaying multiplier displayed as "Bonus: N" in the HUD:

- Starts at 100
- Decays by 1 every 200ms (5 points/second) to a floor of 0
- When regular food is eaten, the current bonus is added to the score, then resets to 100
- Decay timer pauses/resumes with the game

When `enableScoreBonus` is disabled, no bonus is added and the HUD element is not rendered.

## HUD

The HUD bar displays:

- **Score**: Running total, updated on each food eaten
- **Bonus** (optional): Current decaying bonus value
- **Time**: `M:SS` format, counting up (classic/constrictor) or down (time trial)

On small screens (< 510px), the HUD stacks vertically below the canvas.
