# Snake Game

Multi-file vanilla HTML/CSS/JS Snake game rendered on an HTML5 Canvas. Features 3 game modes (Classic, Time Trial, Constrictor) and 12 togglable feature flags.

## Run

Open `index.html` directly in a browser.

## Lint

`npm run lint` — runs ESLint against `snake.js`.

## Architecture Documentation

Detailed documentation for each aspect of the codebase lives in `docs/`:

| Document                                     | Covers                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| [architecture](docs/architecture.md)         | Code organization, manager classes, dependency injection, file structure    |
| [state-machine](docs/state-machine.md)       | Five game states, validated transitions, lifecycle from init to game over   |
| [game-modes](docs/game-modes.md)             | Classic, Time Trial, and Constrictor mode behavior differences              |
| [rendering](docs/rendering.md)               | Pre-rendered tile system, color themes, responsive canvas sizing            |
| [input](docs/input.md)                       | Keyboard, touch/swipe, input buffering, speed boost, instant movement       |
| [collision](docs/collision.md)               | Wall/boundary/self collision, grace period, constrictor ignored state       |
| [game-loop](docs/game-loop.md)               | Tick pipeline, recursive timeout scheduling, speed management, pause/resume |
| [food-and-scoring](docs/food-and-scoring.md) | Regular food, bonus food, enclosure eating, score bonus decay, HUD          |
| [level-features](docs/level-features.md)     | Walls, wormholes, wrap boundaries                                           |
| [feature-toggles](docs/feature-toggles.md)   | All 12 boolean flags, their effects, defaults, and dependencies             |
