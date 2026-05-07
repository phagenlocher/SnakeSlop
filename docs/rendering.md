# Rendering

Rendering uses pre-rendered off-screen canvas tiles drawn via `drawImage()` each frame.

## Tile System

At construction, all tiles are rendered once at a fixed **26×26 pixel** resolution and stored in `this.tiles`. Each frame, tiles are drawn onto the main canvas scaled to the current `CELL_SIZE` via `drawImage()`. Default bilinear filtering produces smooth scaling at all sizes.

### Tile Shapes

19 drawing functions in `TILE_RENDERERS`:

| Category | Shapes                                                                            |
| -------- | --------------------------------------------------------------------------------- |
| Heads    | `headUp`, `headDown`, `headLeft`, `headRight` — body fill + head inset + two eyes |
| Bodies   | `bodyHoriz`, `bodyVert` — solid fill                                              |
| Tails    | `tailUp`, `tailDown`, `tailLeft`, `tailRight` — semicircle or arc                 |
| Corners  | `cornerRD`, `cornerLD`, `cornerRU`, `cornerLU` — arc-based rounded turns          |
| Static   | `wall`, `food`, `bonusFood`, `wormholeEntry`, `wormholeExit`                      |

### Palettes

Each tile shape is rendered with multiple palettes for different visual states:

| Suffix | Palette                         | When Used                              |
| ------ | ------------------------------- | -------------------------------------- |
| (none) | `paletteNormal` (green)         | `playing` state                        |
| `_w`   | `paletteWarning` (red)          | `warning` / grace period               |
| `_i`   | `paletteIgnored` (magenta)      | `ignored` / constrictor self-collision |
| `_b`   | `paletteBoost` (goldenrod head) | Speed boost active (head tiles only)   |

This produces ~51 total tiles: 14 snake shapes × 3 full palettes (42) + 4 boost heads + 5 static tiles.

### Segment Tile Selection

`_getSegmentTileKey(i)` determines the shape for each segment:

- **Head** (`i === 0`): Direction-mapped head shape
- **Tail** (`i === length - 1`): Direction from previous segment → tail shape
- **Body**: Compared incoming and outgoing directions — straight (`bodyHoriz`/`bodyVert`) or corner (`cornerLD`, etc.)

## Color Themes

Two themes, selected at construction:

- **`THEME_DEFAULT`**: Dark background (`#0d1a0d`), green snake, red food, golden bonus food, gray walls
- **`THEME_COLORBLIND`**: Bang Wong colorblind-friendly palette (black background, bluish-green body, orange food, yellow bonus)

The active theme is bound to `this.colors` and threaded through tile creation and drawing.

## Responsive Canvas Sizing

The canvas is not fixed at 500×500. A `ResizeObserver` on the container triggers `_resizeCanvas()`:

- Computes available width
- Derives `CELL_SIZE = max(10, floor(availableWidth / COLS))`
- Sets canvas to `CELL_SIZE × 20`
- Recreates all tiles and redraws

## Drawing Order

Each frame:

1. Fill background
2. Draw walls (all 44 cells)
3. Draw wormhole entry and exit (if present)
4. Draw snake segments (head to tail, with palette suffix applied)
5. Draw regular food
6. Draw bonus food (if present)
7. Draw game-over overlay (if `over` state)
