# Game Modes

Three modes selected via dropdown. All feature toggles apply identically across all modes.

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
- **Bonus food**: Always enabled (toggle is forced on). Eating bonus food adds **up to +8 seconds**, capped at the original 2:00 limit.
- **Game over**: Time expiry OR any classic collision OR board full.
- **Eating**: Identical to Classic (head-collision based).
- All classic features (grace period, speed boost, walls, wrap, wormholes) function identically.


