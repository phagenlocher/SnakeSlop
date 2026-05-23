# Feature Toggles

All 13 toggles are controlled via checkboxes, persisted to `localStorage` under key `snake-game-settings`. The game is destroyed and remounted whenever a toggle changes. All default to `true` except `enableColorblindMode` and `enableFaultFilter`.

| Toggle                    | Default | Effect                                                                                        |
| ------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `enableBonusFood`         | `true`  | Enables golden diamond bonus food (spawning, movement, rendering, eating)                     |
| `enableTimedBonusFood`    | `true`  | Spawns bonus food every 15 seconds instead of every 5 foods eaten. Requires `enableBonusFood` |
| `enableShrinkOnBonusFood` | `true`  | Halves snake length when bonus food is eaten. Requires `enableBonusFood`                      |
| `enableScoreBonus`        | `true`  | Enables decaying bonus multiplier (100→0) in HUD and score calculation                        |
| `enableGracePeriod`       | `true`  | 700ms warning window before game over on collision, with safe-direction escape                |
| `enableWrap`              | `true`  | Snake wraps around grid edges instead of dying at boundaries                                  |
| `enableSpeedUp`           | `true`  | Tick rate accelerates with each food eaten (135ms → 50ms floor)                               |
| `enableSpeedBoost`        | `true`  | Same-direction keypress multiplies speed by 1.35                                              |
| `enableInputBuffer`       | `true`  | Queues up to 2 rapid direction inputs so none are lost between ticks                          |
| `enableFaultFilter`       | `false` | Filters out direction inputs that would immediately cause wall, boundary, or self collision   |
| `enableInstantMovement`   | `true`  | Snake moves immediately on valid keypress instead of waiting for next tick                    |
| `enableWalls`             | `true`  | Renders 44 wall cells as a hollow square ring with collision                                  |
| `enableWormholes`         | `true`  | Spawns teleport entry/exit pairs every 30 seconds                                             |
| `enableColorblindMode`    | `false` | Uses Bang Wong colorblind-friendly palette for all visuals and UI                             |

## Dependencies

- `enableTimedBonusFood` and `enableShrinkOnBonusFood` depend on `enableBonusFood` being enabled
- `enableWrap` overrides boundary collision (walls remain solid)
- `enableGracePeriod` has no effect on constrictor self-collision (which always enters `ignored`)
- `enableInputBuffer` and `enableInstantMovement` compose naturally — buffer provides validation, instant moves consume buffer entries
- `enableFaultFilter` composes with `enableInputBuffer` (filters buffered directions at commit time) and with `enableInstantMovement` (prevents instant tick from committing an unsafe direction)
