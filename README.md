# Snake Demo

A vanilla HTML/CSS/JS Snake game designed as a **teaching tool for game design**. Each feature lives behind a toggle, so you can turn mechanics on and off to see how they affect gameplay.

Open `index.html` in any browser to play. 

## Game Modes

| Mode | Description |
|---|---|
| Classic | Standard Snake. Timer counts up, no time limit. Game over on collision or when the board is completely filled. |
| Time Trial | Race against the clock. Timer counts down from 2:00. Game over when time runs out, on collision, or when the board is completely filled. All Classic rules apply. |

## Togglable Features

Checkboxes in the UI control which mechanics are active. The game is destroyed and remounted whenever a toggle changes.

| Feature | Default | What it does |
|---|---|---|
| Bonus Food | On | A golden diamond appears every 15 seconds. Worth 100 points, moves around, expires after 5 seconds. |
| Grace Period | On | When about to collide, the snake turns red and you have 1 second to dodge with a safe direction key. |
| Shrink on Bonus Food | On | Eating bonus food cuts the snake's length in half. (Only matters if bonus food is enabled.) |
| Speed Up | On | The game speeds up by 2.4 ms per food eaten (starts at 135 ms, floors at 50 ms). |
| Score Bonus | On | A decaying bonus score (starts at 100, drops by 5/s) that adds extra points when you eat regular food. |
| Wrap Around | On | Snake teleports to the opposite wall instead of dying at boundaries. |
| Speed Boost | On | Pressing the same direction key again makes the snake ~35% faster while held. |
| Input Buffer | On | Queues up to 2 rapid directional inputs so they aren't lost between ticks. |
| Timed Bonus Food | On | Bonus food spawns every 15 seconds instead of every 5 foods eaten. |
| Static Walls | On | A hollow square ring of walls with openings in the center of each side. Always solid, even with wrap around. |

## License

Public domain (CC0). See [LICENSE](LICENSE).
