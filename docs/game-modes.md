# Game Modes

Four modes selected via dropdown. All feature toggles apply identically across all modes.

## Classic (`mode: 'classic'`)

The standard Snake experience.

- **Timer**: Counts up from `0:00`.
- **Game over**: Wall collision, boundary hit, or self-collision. Also triggers when snake fills all playable tiles.
- **Eating**: Head hits food tile — awards 10 pts + score bonus, grows snake by 1 segment, speeds up.

## Time Trial (`mode: 'timeTrial'`)

Race against a 2-minute countdown.

- **Timer**: Counts down from `2:00`. Reaching `0:00` triggers game over.
- **Game over**: Time expiry OR any classic collision OR board full.
- **Eating**: Identical to Classic (head-collision based).
- All classic features (grace period, speed boost, bonus food, walls, wrap, wormholes) function identically.

## Time Seeker (`mode: 'timeSeeker'`)

A variant of Time Trial where bonus food extends the clock.

- **Timer**: Counts down from `2:00`. Reaching `0:00` triggers game over.
- **Bonus food**: Always enabled (toggle is forced on). Eating bonus food adds **up to +10 seconds**, capped at the original 2:00 limit.
- **Game over**: Time expiry OR any classic collision OR board full.
- **Eating**: Identical to Classic (head-collision based).
- All classic features (grace period, speed boost, walls, wrap, wormholes) function identically.

## Constrictor (`mode: 'constrictor'`)

Food is eaten by enclosure, not head collision.

- **Timer**: Counts up from `0:00` (same as Classic).
- **Auto-growth**: Snake starts at length 1. `startGrowth = 14` auto-grows to length 15 over the first 14 ticks without eating.
- **Self-collision**: Does NOT kill the snake. Enters `ignored` state instead — snake freezes (turns magenta) until a safe direction is pressed. No safe direction = immediate game over.
- **Head hits regular food**: Food disappears (poofs) and respawns elsewhere. No score, no growth, no speed up.
- **Enclosure eating (regular food)**: Flood-fill BFS from food through non-snake, non-wall cells. If the food's connected component cannot reach the boundary (non-wrap) or is smaller than the largest component (wrap), the food is enclosed. Awards 10 pts + score bonus + speed up + growth.
- **Enclosure eating (bonus food)**: Same flood-fill check. Awards 100 pts. Optionally shrinks snake (halved, min length 15).
- **Head hits bonus food**: No effect — bonus food is enclosure-only.
- **Food placement**: Rejects enclosed positions (max 200 retries), ensuring food spawns in the outside region.
