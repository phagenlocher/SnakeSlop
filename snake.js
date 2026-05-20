/*
SnakeSlop - A Snake game with togglable features to demonstrate game design. Renders on an HTML5 Canvas. Supports classic, time-trial, and constrictor modes with 12 togglable feature flags.
Written in 2026 by Philipp Hagenlocher <me@philipphagenlocher.de>
This software was written with the assistance of AI.

To the extent possible under law, the author(s) have dedicated all copyright and related and neighboring rights to this software to the public domain worldwide. This software is distributed without any warranty.

You should have received a copy of the CC0 Public Domain Dedication along with this software. If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.
*/

'use strict';

/**
 * A 2D point on the grid.
 *
 * @typedef {{x: number, y: number}} Point
 */

/**
 * A flat colors object holding all color properties needed by tile renderers.
 *
 * @typedef {{body: string, head: string, eye: string, bg: string, wallBody: string, wallEdgeLight: string, wallEdgeDark: string, food: string, foodBonus: string, wormholeEntry: string, wormholeExit: string, overlay: string, overlayText: string}} Colors
 */

/**
 * A tile renderer callback.
 *
 * @callback TileRenderer
 * @param {CanvasRenderingContext2D} ctx
 * @param {Colors} colors
 */

/**
 * A collision breakdown.
 *
 * @typedef {{wall: boolean, boundary: boolean, self: boolean}} CollisionResult
 */

/** @type {Point[]} 44 hand-crafted wall cells forming a hollow square ring. */
const WALLS = [
  { x: 3, y: 3 },
  { x: 4, y: 3 },
  { x: 5, y: 3 },
  { x: 6, y: 3 },
  { x: 7, y: 3 },
  { x: 8, y: 3 },
  { x: 3, y: 4 },
  { x: 3, y: 5 },
  { x: 3, y: 6 },
  { x: 3, y: 7 },
  { x: 3, y: 8 },
  { x: 11, y: 3 },
  { x: 12, y: 3 },
  { x: 13, y: 3 },
  { x: 14, y: 3 },
  { x: 15, y: 3 },
  { x: 16, y: 3 },
  { x: 16, y: 4 },
  { x: 16, y: 5 },
  { x: 16, y: 6 },
  { x: 16, y: 7 },
  { x: 16, y: 8 },
  { x: 3, y: 11 },
  { x: 3, y: 12 },
  { x: 3, y: 13 },
  { x: 3, y: 14 },
  { x: 3, y: 15 },
  { x: 3, y: 16 },
  { x: 4, y: 16 },
  { x: 5, y: 16 },
  { x: 6, y: 16 },
  { x: 7, y: 16 },
  { x: 8, y: 16 },
  { x: 11, y: 16 },
  { x: 12, y: 16 },
  { x: 13, y: 16 },
  { x: 14, y: 16 },
  { x: 15, y: 16 },
  { x: 16, y: 16 },
  { x: 16, y: 11 },
  { x: 16, y: 12 },
  { x: 16, y: 13 },
  { x: 16, y: 14 },
  { x: 16, y: 15 },
];

/**
 * Creates a string key for a grid cell.
 *
 * @param {number} x Grid column.
 * @param {number} y Grid row.
 * @returns {string} The string key.
 */
function key(x, y) {
  return `${x},${y}`;
}

/** @type {string} Classic mode — no time limit, standard snake experience. */
const MODE_CLASSIC = 'classic';
/** @type {string} Time-trial mode — 2-minute countdown. */
const MODE_TIME_TRIAL = 'timeTrial';
/** @type {string} Constrictor mode — food eaten by enclosure. */
const MODE_CONSTRICTOR = 'constrictor';

/** @enum {string} Game state constants. */
const STATE = Object.freeze({
  WAITING: 'waiting',
  PLAYING: 'playing',
  WARNING: 'warning',
  IGNORED: 'ignored',
  UNFOCUSED: 'unfocused',
  OVER: 'over',
});

/** @type {{[key: string]: string[]}} Valid transitions for each state. */
const STATE_TRANSITIONS = Object.freeze({
  [STATE.WAITING]: [STATE.PLAYING],
  [STATE.PLAYING]: [STATE.WARNING, STATE.IGNORED, STATE.OVER, STATE.UNFOCUSED],
  [STATE.WARNING]: [STATE.PLAYING, STATE.OVER, STATE.UNFOCUSED],
  [STATE.IGNORED]: [STATE.PLAYING, STATE.UNFOCUSED],
  [STATE.UNFOCUSED]: [STATE.PLAYING, STATE.WARNING, STATE.IGNORED],
  [STATE.OVER]: [STATE.WAITING],
});

/** @type {object} Default colors. */
const THEME_DEFAULT = {
  bg: '#0d1a0d',
  wallBody: '#555555',
  wallEdgeLight: '#777777',
  wallEdgeDark: '#333333',
  food: '#ff4444',
  foodBonus: '#ffd700',
  wormholeEntry: '#003a00',
  wormholeExit: '#e8e8e8',
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayText: '#ffffff',
  paletteNormal: { body: '#4a7a4a', head: '#8ad88a', eye: '#0d1a0d' },
  paletteWarning: { body: '#ff6666', head: '#ffaaaa', eye: '#4a0000' },
  paletteIgnored: { body: '#c084fc', head: '#e2ccff', eye: '#4a0060' },
  paletteBoost: { body: '#4a7a4a', head: '#f0e68c', eye: '#0d1a0d' },
};

/** @type {object} Bang Wong colorblind-friendly theme (doi:10.1038/nmeth.1618). */
const THEME_COLORBLIND = {
  bg: '#000000',
  wallBody: '#0072b2',
  wallEdgeLight: '#56b4e9',
  wallEdgeDark: '#00305a',
  food: '#e69f00',
  foodBonus: '#f0e442',
  wormholeEntry: '#cc79a7',
  wormholeExit: '#e69f00',
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayText: '#ffffff',
  paletteNormal: { body: '#009e73', head: '#56b4e9', eye: '#000000' },
  paletteWarning: { body: '#d55e00', head: '#e69f00', eye: '#000000' },
  paletteIgnored: { body: '#cc79a7', head: '#56b4e9', eye: '#000000' },
  paletteBoost: { body: '#009e73', head: '#f0e442', eye: '#000000' },
};
/** @constant {number} Wormhole spawn interval in ms. */
const WORMHOLE_SPAWN_INTERVAL_MS = 30_000;
/** @constant {number} Wormhole lifetime in ms. */
const WORMHOLE_LIFETIME_MS = 15_000;
/** @constant {number} Minimum Manhattan distance between wormhole entry and exit. */
const WORMHOLE_MIN_DISTANCE = 5;
/** @constant {number} Minimum free tiles required to spawn wormholes. */
const WORMHOLE_MIN_FREE_TILES = 10;
/** @constant {number} Speed boost divisor factor (1.35 = ~35% faster). */
const SPEED_BOOST_FACTOR = 1.35;
/** Warning and grace period timeout in ms. @constant {number} */
const WARNING_TIMEOUT_MS = 700;
/** @constant {number} Bonus food lifetime before auto-removal in ms. */
const BONUS_FOOD_LIFETIME_MS = 5000;
/** @constant {number} Bonus food spawn interval in ms (timed mode). */
const BONUS_FOOD_SPAWN_INTERVAL_MS = 15_000;
/** @constant {number} Score bonus decay interval in ms. */
const SCORE_BONUS_DECAY_INTERVAL_MS = 200;

/** @constant {string} Focus overlay placeholder text. */
const MSG_CLICK_OR_TAP_TO_FOCUS = 'Click or tap to focus';
/** @constant {string} Initial instruction shown before the game starts. */
const MSG_PRESS_ARROW_KEY_TO_START = 'Press any arrow key to start';
/** @constant {string} Prompt displayed after game reset. */
const MSG_USE_ARROW_KEYS_TO_START = 'Use arrow keys or tap to start';
/** Game over overlay heading drawn on the canvas. @constant {string} */
const MSG_GAME_OVER_OVERLAY = 'GAME OVER';
/** Game over instruction below the canvas. @constant {string} */
const MSG_GAME_OVER_RESTART = 'Game Over! Press Space or tap to restart';
/** @constant {string} Constrictor ignored-state prompt. */
const MSG_SNAKE_STUCK = 'Snake stuck \u2014 press a safe direction';
/** @constant {string} Pause overlay text shown on blur. */
const MSG_PAUSED_RESUME = 'Paused \u2014 Click or tap to resume';

/**
 * Computes the grid direction from point a to point b.
 * If wrap is enabled and the distance exceeds 1 cell (e.g. snake wraps around),
 * the direction is flipped so it remains a cardinal direction.
 *
 * @param {Point} a Starting point.
 * @param {Point} b Target point.
 * @param {boolean} enableWrap Whether wrap-around boundaries are active.
 * @returns {Point} Cardinal direction vector (dx, dy).
 */
function dirBetween(a, b, enableWrap) {
  const d = { x: b.x - a.x, y: b.y - a.y };
  if (enableWrap) {
    if (Math.abs(d.x) > 1) d.x = -Math.sign(d.x);
    if (Math.abs(d.y) > 1) d.y = -Math.sign(d.y);
  }
  return d;
}

/** @type {{[key: string]: string}} Maps direction offsets ("dx,dy") to cardinal names. */
const DIR_KEY = {
  '0,-1': 'Up',
  '0,1': 'Down',
  '-1,0': 'Left',
  '1,0': 'Right',
};

/** @type {{[key: string]: string}} Maps incoming→outgoing direction pairs to corner tile keys. */
const CORNER_MAP = {
  'Right->Down': 'cornerRD',
  'Up->Right': 'cornerLD',
  'Left->Down': 'cornerLD',
  'Up->Left': 'cornerRD',
  'Right->Up': 'cornerRU',
  'Down->Right': 'cornerLU',
  'Left->Up': 'cornerLU',
  'Down->Left': 'cornerRU',
};

/** @type {{[key: string]: TileRenderer}} Tile shape drawing functions keyed by shape name. */
const TILE_RENDERERS = {
  headUp(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(0, 0, 26, 26);
    ctx.fillStyle = colors.head;
    ctx.fillRect(3, 3, 20, 20);
    ctx.fillStyle = colors.eye;
    ctx.fillRect(5, 4, 5, 4);
    ctx.fillRect(16, 4, 5, 4);
  },
  headDown(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(0, 0, 26, 26);
    ctx.fillStyle = colors.head;
    ctx.fillRect(3, 3, 20, 20);
    ctx.fillStyle = colors.eye;
    ctx.fillRect(5, 18, 5, 4);
    ctx.fillRect(16, 18, 5, 4);
  },
  headLeft(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(0, 0, 26, 26);
    ctx.fillStyle = colors.head;
    ctx.fillRect(3, 3, 20, 20);
    ctx.fillStyle = colors.eye;
    ctx.fillRect(4, 5, 4, 5);
    ctx.fillRect(4, 16, 4, 5);
  },
  headRight(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(0, 0, 26, 26);
    ctx.fillStyle = colors.head;
    ctx.fillRect(3, 3, 20, 20);
    ctx.fillStyle = colors.eye;
    ctx.fillRect(18, 5, 4, 5);
    ctx.fillRect(18, 16, 4, 5);
  },
  bodyHoriz(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(0, 0, 26, 26);
  },
  bodyVert(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(0, 0, 26, 26);
  },
  tailUp(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(0, 13, 26, 13);
    ctx.beginPath();
    ctx.arc(13, 13, 13, Math.PI, 2 * Math.PI);
    ctx.fill();
  },
  tailDown(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(0, 0, 26, 13);
    ctx.beginPath();
    ctx.arc(13, 13, 13, 0, Math.PI);
    ctx.fill();
  },
  tailLeft(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(13, 0, 13, 26);
    ctx.beginPath();
    ctx.arc(13, 13, 13, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.fill();
  },
  tailRight(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(0, 0, 13, 26);
    ctx.beginPath();
    ctx.arc(13, 13, 13, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
  },
  cornerRD(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(0, 0, 13, 13);
    ctx.fillRect(0, 13, 13, 13);
    ctx.fillRect(13, 13, 13, 13);
    ctx.beginPath();
    ctx.moveTo(13, 13);
    ctx.arc(13, 13, 13, (Math.PI * 3) / 2, 0);
    ctx.closePath();
    ctx.fill();
  },
  cornerLD(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(13, 0, 13, 13);
    ctx.fillRect(0, 13, 13, 13);
    ctx.fillRect(13, 13, 13, 13);
    ctx.beginPath();
    ctx.moveTo(13, 13);
    ctx.arc(13, 13, 13, Math.PI, (Math.PI * 3) / 2);
    ctx.closePath();
    ctx.fill();
  },
  cornerRU(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(0, 0, 13, 13);
    ctx.fillRect(13, 0, 13, 13);
    ctx.fillRect(0, 13, 13, 13);
    ctx.beginPath();
    ctx.moveTo(13, 13);
    ctx.arc(13, 13, 13, 0, Math.PI / 2);
    ctx.closePath();
    ctx.fill();
  },
  cornerLU(ctx, colors) {
    ctx.fillStyle = colors.body;
    ctx.fillRect(0, 0, 13, 13);
    ctx.fillRect(13, 0, 13, 13);
    ctx.fillRect(13, 13, 13, 13);
    ctx.beginPath();
    ctx.moveTo(13, 13);
    ctx.arc(13, 13, 13, Math.PI / 2, Math.PI);
    ctx.closePath();
    ctx.fill();
  },
  wall(ctx, colors) {
    ctx.fillStyle = colors.wallBody;
    ctx.fillRect(0, 0, 26, 26);
    ctx.fillStyle = colors.wallEdgeLight;
    ctx.fillRect(0, 0, 25, 1);
    ctx.fillRect(0, 0, 1, 25);
    ctx.fillStyle = colors.wallEdgeDark;
    ctx.fillRect(25, 0, 1, 26);
    ctx.fillRect(0, 25, 26, 1);
  },
  food(ctx, colors) {
    const cx = 13;
    const cy = 13;
    const r = 10;
    ctx.fillStyle = colors.food;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  },
  bonusFood(ctx, colors) {
    const cx = 13;
    const cy = 13;
    const r = 8;
    ctx.fillStyle = colors.foodBonus;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
  },
  wormholeEntry(ctx, colors) {
    ctx.fillStyle = colors.wormholeEntry;
    ctx.fillRect(1, 1, 23, 23);
  },
  wormholeExit(ctx, colors) {
    ctx.fillStyle = colors.wormholeExit;
    ctx.fillRect(1, 1, 23, 23);
  },
};

/** @constant {Set<string>} Tile keys that are static (not palette-dependent). */
const STATIC_TILE_KEYS = new Set(['wall', 'food', 'bonusFood', 'wormholeEntry', 'wormholeExit']);

/**
 * Manages named timers (intervals and timeouts) with clear-by-name semantics.
 *
 * @classdesc Prevents duplicate timers and provides bulk clear operations.
 */
class TimerManager {
  /**
   *
   */
  constructor() {
    /** @private */ this._timers = {};
  }

  /**
   * Clears an existing timer of the given name if one exists.
   *
   * @private
   * @param {string} name Timer name to clear.
   */
  _clearExisting(name) {
    if (this._timers[name]) {
      const t = this._timers[name];
      if (t.type === 'interval') clearInterval(t.id);
      else clearTimeout(t.id);
      delete this._timers[name];
    }
  }

  /**
   * Registers a named interval. Clears any previous timer with the same name.
   *
   * @param {string} name Unique timer name.
   * @param {Function} fn Callback to invoke on each interval tick.
   * @param {number} ms Interval duration in milliseconds.
   * @returns {number} The interval ID.
   */
  setInterval(name, fn, ms) {
    this._clearExisting(name);
    const id = setInterval(fn, ms);
    this._timers[name] = { id, type: 'interval' };
    return id;
  }

  /**
   * Registers a named timeout. Clears any previous timer with the same name.
   *
   * @param {string} name Unique timer name.
   * @param {Function} fn Callback to invoke after the timeout.
   * @param {number} ms Timeout duration in milliseconds.
   * @returns {number} The timeout ID.
   */
  setTimeout(name, fn, ms) {
    this._clearExisting(name);
    const id = setTimeout(fn, ms);
    this._timers[name] = { id, type: 'timeout' };
    return id;
  }

  /**
   * Clears the named timer if it exists.
   *
   * @param {string} name Timer name to clear.
   */
  clear(name) {
    this._clearExisting(name);
  }

  /** Clears all registered timers. */
  clearAll() {
    for (const name of Object.keys(this._timers)) {
      this.clear(name);
    }
  }
}

/**
 * Encapsulates snake body as an ordered array with an O(1) position lookup set.
 * All mutations keep both representations in sync — callers never touch internals.
 *
 * @classdesc Provides head/tail access, indexed segment access, iteration,
 * and O(1) occupancy checks via has(x, y).
 */
class SnakeBody {
  /**
   * @param {Point[]} points Initial segment list (head at index 0).
   */
  constructor(points) {
    /** @private */
    this._segments = [...points];
    /** @private @type {Set<string>} */
    this._set = this._buildSet();
  }

  /** @returns {number} Number of segments. */
  get length() {
    return this._segments.length;
  }

  /** @returns {Point} Head position. */
  head() {
    return this._segments[0];
  }

  /** @returns {Point} Tail position (last segment). */
  tail() {
    return this._segments.at(-1);
  }

  /**
   * Returns the segment at a given index.
   *
   * @param {number} i Segment index.
   * @returns {Point} The segment at the given index.
   */
  segmentAt(i) {
    return this._segments[i];
  }

  /**
   * Iterates over all segments (head to tail).
   *
   * @param {(seg: Point, i: number) => void} fn Callback invoked for each segment.
   */
  forEach(fn) {
    // eslint-disable-next-line unicorn/no-array-for-each -- this IS a forEach wrapper
    this._segments.forEach(fn);
  }

  /**
   * Prepends a segment at the head.
   *
   * @param {Point} p Segment to add.
   */
  unshift(p) {
    this._segments.unshift(p);
    this._set.add(this._key(p));
  }

  /**
   * Removes and returns the tail segment.
   *
   * @returns {Point|undefined} The removed tail segment or undefined.
   */
  pop() {
    const p = this._segments.pop();
    if (p) this._set.delete(this._key(p));
    return p;
  }

  /**
   * Removes segments from `start` index to end and syncs the set.
   * Mirrors Array.splice(n) with a single argument (cut from n onward).
   *
   * @param {number} start Start index.
   * @returns {Point[]} The removed segments.
   */
  splice(start) {
    const removed = this._segments.splice(start);
    for (const p of removed) this._set.delete(this._key(p));
    return removed;
  }

  /**
   * Replaces all segments with a new array (e.g. on game reset).
   *
   * @param {Point[]} points New segment list.
   */
  reset(points) {
    this._segments = [...points];
    this._set = this._buildSet();
  }

  /**
   * O(1) check whether any segment occupies a grid cell.
   *
   * @param {number} x Grid column.
   * @param {number} y Grid row.
   * @returns {boolean} Whether the cell is occupied.
   */
  has(x, y) {
    return this._set.has(`${x},${y}`);
  }

  /**
   * @param {Point} p A point.
   * @private
   * @returns {string} The string key for the point.
   */
  _key(p) {
    return `${p.x},${p.y}`;
  }

  /**
   * @private
   * @returns {Set<string>} A set of string keys for all segments.
   */
  _buildSet() {
    return new Set(this._segments.map((p) => this._key(p)));
  }
}

/**
 * Manages the static wall layout.
 *
 * @classdesc Handles wall rendering, collision checks, and wall-set queries.
 */
class WallsManager {
  /**
   * @param {{ enabled: boolean }} opts Wall feature flag.
   * @param {boolean} opts.enabled Whether walls are enabled.
   */
  constructor({ enabled }) {
    this._enabled = enabled;
    this._wallSet = new Set(WALLS.map((w) => `${w.x},${w.y}`));
  }

  /** @returns {boolean} Whether walls are enabled. */
  get enabled() {
    return this._enabled;
  }

  /**
   * Checks whether a grid cell contains a wall.
   *
   * @param {number} x Grid column.
   * @param {number} y Grid row.
   * @returns {boolean} Whether a wall is at the given cell.
   */
  isWallAt(x, y) {
    return this.enabled && this._wallSet.has(`${x},${y}`);
  }

  /**
   * Returns the set of wall cell keys (or empty set if disabled).
   *
   * @returns {Set<string>} The set of wall cell keys.
   */
  getWallSet() {
    return this.enabled ? this._wallSet : new Set();
  }

  /** @returns {number} Number of wall cells (44). */
  get count() {
    return WALLS.length;
  }
}

/**
 * Manages boundary behavior (wrap vs. solid walls).
 *
 * @classdesc Handles coordinate wrapping, bounds checking, and wrap-aware
 * direction computation.
 */
class BoundaryManager {
  /**
   * @param {{ wrapEnabled: boolean, cols: number, rows: number }} opts Wrap toggle and grid dimensions.
   */
  constructor({ wrapEnabled, cols, rows }) {
    this._wrapEnabled = wrapEnabled;
    this._cols = cols;
    this._rows = rows;
  }

  /** @returns {boolean} Whether wrap-around boundaries are enabled. */
  get enabled() {
    return this._wrapEnabled;
  }

  /**
   * Wraps a position around the grid when wrap mode is enabled.
   *
   * @param {Point} pos Grid position to wrap.
   * @returns {Point} The (possibly wrapped) position.
   */
  wrap(pos) {
    if (!this._wrapEnabled) return pos;
    pos.x = (pos.x + this._cols) % this._cols;
    pos.y = (pos.y + this._rows) % this._rows;
    return pos;
  }

  /**
   * Checks whether a cell is within the grid boundaries.
   *
   * @param {number} x Grid column.
   * @param {number} y Grid row.
   * @returns {boolean} Whether the cell is within bounds.
   */
  isInBounds(x, y) {
    return x >= 0 && x < this._cols && y >= 0 && y < this._rows;
  }

  /**
   * Computes the wrap-aware direction between two grid positions.
   *
   * @param {Point} a Starting point.
   * @param {Point} b Target point.
   * @returns {Point} Cardinal direction vector.
   */
  dirBetween(a, b) {
    return dirBetween(a, b, this._wrapEnabled);
  }
}

/**
 * Manages wormhole entry/exit teleport pairs.
 *
 * @classdesc Handles wormhole spawning, lifetime timers, teleportation, and
 * rendering. Entry cells are dark green, exit cells are off-white.
 */
class WormholesManager {
  /**
   * @param {{
   *   enabled: boolean,
   *   cols: number, rows: number,
   *   freeTileCount: () => number,
   *   isOccupied: (x: number, y: number) => boolean,
   *   wrap: (p: Point) => Point,
   *   timers: TimerManager,
   *   onDraw: () => void,
   * }} opts Feature flag, grid dimensions, spatial queries, wrapping, timer service, and draw callback.
   */
  constructor({ enabled, cols, rows, freeTileCount, isOccupied, wrap, timers, onDraw }) {
    this._enabled = enabled;
    this._cols = cols;
    this._rows = rows;
    this._freeTileCount = freeTileCount;
    this._isOccupied = isOccupied;
    this._wrap = wrap;
    this._timers = timers;
    this._onDraw = onDraw;
    /** @type {Point|null} Wormhole entry cell. */
    this.entry = null;
    /** @type {Point|null} Wormhole exit cell. */
    this.exit = null;
  }

  /**
   * Attempts to spawn a wormhole pair at random valid positions.
   * Entry and exit are placed at least WORMHOLE_MIN_DISTANCE apart (Manhattan).
   * Won't spawn if fewer than WORMHOLE_MIN_FREE_TILES free tiles remain.
   */
  trySpawn() {
    if (!this._enabled) return;
    if (this._freeTileCount() <= WORMHOLE_MIN_FREE_TILES) return;
    let entry, exit;
    do {
      entry = { x: Math.floor(Math.random() * this._cols), y: Math.floor(Math.random() * this._rows) };
    } while (this._isOccupied(entry.x, entry.y));
    do {
      exit = { x: Math.floor(Math.random() * this._cols), y: Math.floor(Math.random() * this._rows) };
    } while (
      (exit.x === entry.x && exit.y === entry.y) ||
      this._isOccupied(exit.x, exit.y) ||
      Math.abs(exit.x - entry.x) + Math.abs(exit.y - entry.y) < WORMHOLE_MIN_DISTANCE
    );
    this.entry = entry;
    this.exit = exit;
    this._timers.setTimeout(
      'wormholeLifetime',
      () => {
        this.entry = null;
        this.exit = null;
        this._onDraw();
      },
      WORMHOLE_LIFETIME_MS
    );
  }

  /**
   * If the head is on the wormhole entry, teleports it to the exit and
   * consumes both wormholes.
   *
   * @param {Point} head The snake's head position.
   * @returns {boolean} Whether a teleport occurred.
   */
  tryTeleport(head) {
    if (!this._enabled || !this.entry) return false;
    if (head.x === this.entry.x && head.y === this.entry.y) {
      head.x = this.exit.x;
      head.y = this.exit.y;
      this._wrap(head);
      this._timers.clear('wormholeLifetime');
      this.entry = null;
      this.exit = null;
      return true;
    }
    return false;
  }

  /** Starts the periodic wormhole spawn interval (every 30s). */
  startTimers() {
    if (!this._enabled) return;
    this._timers.setInterval(
      'wormholeTimer',
      () => {
        if (!this.entry) {
          this.trySpawn();
          this._onDraw();
        }
      },
      WORMHOLE_SPAWN_INTERVAL_MS
    );
  }
}

/**
 * Manages bonus food spawning, movement, collision, eating, and rendering.
 *
 * @classdesc Handles the golden diamond bonus food that appears on a timer,
 * moves randomly, and can be eaten by the snake head (classic/time-trial) or
 * by enclosure (constrictor).
 */
class BonusFoodManager {
  /**
   * @param {{
   *   enabled: boolean, timed: boolean, canShrink: boolean, isConstrictor: boolean,
   *   cols: number, rows: number,
   *   snakeHas: (x: number, y: number) => boolean,
   *   snakeLength: () => number,
   *   isWallAt: (x: number, y: number) => boolean,
   *   getFoodPos: () => Point | null,
   *   wrapEnabled: boolean, wrap: (p: Point) => Point,
   *   isInBounds: (x: number, y: number) => boolean,
   *   timers: TimerManager,
   *   getCurrentSpeed: () => number,
   *   isFoodEnclosed: (p: Point) => boolean,
   *   isWormholeEntryAt: (x: number, y: number) => boolean,
   *   onEatCallback: () => void,
   * }} opts Feature flags, grid dimensions, spatial queries, wrapping, timer service, and eat callback.
   */
  constructor({
    enabled,
    timed,
    canShrink,
    isConstrictor,
    cols,
    rows,
    snakeHas,
    snakeLength,
    isWallAt,
    getFoodPos,
    wrapEnabled,
    wrap,
    isInBounds,
    timers,
    getCurrentSpeed,
    isFoodEnclosed,
    isWormholeEntryAt,
    onEatCallback,
  }) {
    this._enabled = enabled;
    this._timed = timed;
    this._canShrink = canShrink;
    this._isConstrictor = isConstrictor;
    this._cols = cols;
    this._rows = rows;
    this._snakeHas = snakeHas;
    this._snakeLength = snakeLength;
    this._isWallAt = isWallAt;
    this._getFoodPos = getFoodPos;
    this._wrapEnabled = wrapEnabled;
    this._wrap = wrap;
    this._isInBounds = isInBounds;
    this._timers = timers;
    this._getCurrentSpeed = getCurrentSpeed;
    this._isFoodEnclosed = isFoodEnclosed;
    this._isWormholeEntryAt = isWormholeEntryAt;
    this._onEatCallback = onEatCallback;
    /** @type {Point|null} Current bonus food position. */
    this.pos = null;
  }

  /** @returns {boolean} Whether bonus food is currently on the board. */
  get active() {
    return this.pos !== null;
  }

  /**
   * Checks whether a cell matches the bonus food position.
   *
   * @param {number} x Grid column.
   * @param {number} y Grid row.
   * @returns {boolean} Whether the cell matches the bonus food position.
   */
  isAt(x, y) {
    return this.pos !== null && this.pos.x === x && this.pos.y === y;
  }

  /**
   * Places bonus food at a random valid position and starts its movement and
   * lifetime timers.
   */
  place() {
    if (!this._enabled) return;
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * this._cols), y: Math.floor(Math.random() * this._rows) };
    } while (
      this._snakeHas(pos.x, pos.y) ||
      (this._getFoodPos() && this._getFoodPos().x === pos.x && this._getFoodPos().y === pos.y) ||
      this._isWallAt(pos.x, pos.y) ||
      this._isWormholeEntryAt(pos.x, pos.y)
    );
    this.pos = pos;
    this._timers.setInterval('bonusFoodInterval', () => this._move(), this._getCurrentSpeed() + 60);
    this._timers.setTimeout(
      'bonusFoodTimeout',
      () => {
        this._timers.clear('bonusFoodInterval');
        this.pos = null;
      },
      BONUS_FOOD_LIFETIME_MS
    );
  }

  /**
   * Moves bonus food one step in a random cardinal direction.
   * Respects wrap boundaries and wall obstacles.
   * In constrictor mode, checks if the new position is enclosed and eats it.
   *
   * @private
   */
  _move() {
    if (!this.pos) return;
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const next = { x: this.pos.x + dir.x, y: this.pos.y + dir.y };
    const obstacleFree = () =>
      !this._snakeHas(next.x, next.y) && !this._isWallAt(next.x, next.y) && !this._isWormholeEntryAt(next.x, next.y);
    if (this._wrapEnabled) {
      this._wrap(next);
      if (obstacleFree()) {
        this.pos = next;
      }
    } else {
      if (this._isInBounds(next.x, next.y) && obstacleFree()) {
        this.pos = next;
      }
    }
    if (this._isConstrictor && this.pos && this._isFoodEnclosed(this.pos)) {
      this._onEatCallback();
    }
  }

  /**
   * Checks whether the snake head is on the bonus food.
   *
   * @param {Point} head The snake's head position.
   * @returns {boolean} Whether the snake head is on the bonus food.
   */
  isHeadCollision(head) {
    return this._enabled && this.active && head.x === this.pos.x && head.y === this.pos.y;
  }

  /**
   * Checks whether the bonus food is enclosed by the snake.
   *
   * @returns {boolean} Whether the bonus food is enclosed.
   */
  isEnclosed() {
    return this._enabled && this.active && this._isFoodEnclosed(this.pos);
  }

  /**
   * Handles bonus food consumption. Returns points awarded and optional shrink amount.
   * The caller (SnakeGame) applies the shrink to the snake.
   *
   * @returns {{ points: number, shrinkBy: number }} Points awarded and optional shrink amount.
   */
  onEat() {
    if (this._canShrink) {
      const shrunkLen = Math.ceil(this._snakeLength() / 2);
      if (!this._isConstrictor || shrunkLen >= 15) {
        this._timers.clear('bonusFoodInterval');
        this._timers.clear('bonusFoodTimeout');
        this.pos = null;
        return { points: 100, shrinkBy: shrunkLen };
      }
    }
    this._timers.clear('bonusFoodInterval');
    this._timers.clear('bonusFoodTimeout');
    this.pos = null;
    return { points: 100, shrinkBy: 0 };
  }

  /**
   * Spawns bonus food on every 5th food eaten (non-timed mode).
   *
   * @param {number} foodsEaten Total regular foods eaten.
   */
  trySpawnOnCount(foodsEaten) {
    if (!this._enabled || this._timed) return;
    if (foodsEaten > 0 && foodsEaten % 5 === 0 && !this.active) {
      this.place();
    }
  }

  /** Starts the timed bonus-food spawn interval (every 15s). */
  startTimers() {
    if (!this._enabled || !this._timed) return;
    this._timers.setInterval(
      'bonusFoodTimer',
      () => {
        if (!this.active) this.place();
      },
      BONUS_FOOD_SPAWN_INTERVAL_MS
    );
  }

  /** Resumes movement and lifetime timers for an active bonus food after unpause. */
  resumeMovementTimers() {
    if (!this._enabled || !this.active) return;
    this._timers.setInterval('bonusFoodInterval', () => this._move(), this._getCurrentSpeed() + 60);
    this._timers.setTimeout(
      'bonusFoodTimeout',
      () => {
        this._timers.clear('bonusFoodInterval');
        this.pos = null;
      },
      BONUS_FOOD_LIFETIME_MS
    );
  }

  /** Clears only the bonus food movement interval. */
  clearMovementInterval() {
    this._timers.clear('bonusFoodInterval');
  }

  /** Clears both the bonus food movement interval and lifetime timeout. */
  clearMovementTimers() {
    this._timers.clear('bonusFoodInterval');
    this._timers.clear('bonusFoodTimeout');
  }

  /** Clears all bonus-food-related timers (spawn + movement + lifetime). */
  clearAllTimers() {
    this._timers.clear('bonusFoodTimer');
    this.clearMovementTimers();
  }
}

/**
 * Manages the decaying bonus score displayed inline with the score (e.g. "Score: 123+99").
 *
 * @classdesc Starts at 100, decays by 1 every 200ms to 0. Resets to 100
 * after each regular food is eaten. The current bonus value is appended to the
 * score display.
 */
class ScoreBonusManager {
  /**
   * @param {{ enabled: boolean, timers: TimerManager, getScoreElement: () => HTMLElement | null, getScore: () => number, onScoreUpdate: () => void }} opts Feature flag, timer service, score accessors, and update callback.
   */
  constructor({ enabled, timers, getScoreElement, getScore, onScoreUpdate }) {
    this._enabled = enabled;
    this._timers = timers;
    this._getScoreElement = getScoreElement;
    this._getScore = getScore;
    this._onScoreUpdate = onScoreUpdate;
    /** @type {number} Current bonus value (0-100). */
    this.value = 100;
  }

  /**
   * Returns the suffix to append to the score display.
   *
   * @returns {string} e.g. "+99" or empty string.
   */
  getScoreSuffix() {
    if (!this._enabled || this.value <= 0) return '';
    return `+${this.value}`;
  }

  /**
   * Called when regular food is eaten. Applies the current bonus to the score,
   * resets the bonus value, and restarts the decay timer.
   *
   * @returns {number} Bonus points to add.
   */
  onFoodEaten() {
    if (!this._enabled) return 0;
    const bonus = Math.max(this.value, 0);
    this.value = 100;
    this._onScoreUpdate();
    this.startDecay();
    return bonus;
  }

  /** Starts the bonus decay interval (decrements by 1 every 200ms). */
  startDecay() {
    if (!this._enabled) return;
    this._timers.setInterval(
      'scoreBonusInterval',
      () => {
        this.value = Math.max(0, this.value - 1);
        this._onScoreUpdate();
        if (this.value === 0) this._timers.clear('scoreBonusInterval');
      },
      SCORE_BONUS_DECAY_INTERVAL_MS
    );
  }

  /** Clears the score bonus decay interval. */
  clearTimers() {
    this._timers.clear('scoreBonusInterval');
  }

  /** Restarts the decay interval after unpause, if the bonus value is still > 0. */
  resumeDecay() {
    if (this._enabled && this.value > 0) this.startDecay();
  }
}

/**
 * Manages game-speed acceleration when food is eaten.
 *
 * @classdesc Each regular food eaten reduces the tick interval by a minor
 * amount, making the snake move faster. Does nothing when enableSpeedUp is off.
 */
class SpeedManager {
  /**
   * @param {{ enabled: boolean, baseSpeed: number, minSpeed: number, rateStep: number }} opts Feature flag and speed tuning parameters.
   */
  constructor({ enabled, baseSpeed, minSpeed, rateStep }) {
    this._enabled = enabled;
    this._baseSpeed = baseSpeed;
    this._minSpeed = minSpeed;
    this._rateStep = rateStep;
    /** @type {number} Current game loop interval in ms. */
    this.currentSpeed = baseSpeed;
  }

  /**
   * Called after eating regular food. Recalculates `currentSpeed` and
   * restarts the game loop with the new interval.
   *
   * @param {number} foodsEaten Total regular foods eaten.
   */
  onFoodEaten(foodsEaten) {
    if (!this._enabled) return;
    const baseTickRate = 1000 / this._baseSpeed;
    const tickRate = baseTickRate + this._rateStep * foodsEaten;
    this.currentSpeed = Math.max(this._minSpeed, 1000 / tickRate);
  }

  /** No-op: the rAF-based game loop reads currentSpeed on each frame. */
  restartGameLoop() {}
}

/**
 * Manages direction input buffering, speed boost, and instant movement.
 *
 * @classdesc Provides input queueing (up to 2 buffered directions), same-key
 * speed boost activation, and instant-move-on-keypress behavior.
 */
class InputManager {
  /**
   * @param {{
   *   enableBuffer: boolean,
   *   enableBoost: boolean,
   *   enableInstant: boolean,
   *   isDirSafe: (dir: Point) => boolean,
   *   getState: () => string,
   *   onUpdate: () => void,
   *   resetLoopTimer: () => void,
   *   onDirection: (dir: Point) => void,
   *   onRestart: () => void,
   * }} opts Feature toggles, direction safety check, state accessor, and callbacks.
   */
  constructor({
    enableBuffer,
    enableBoost,
    enableInstant,
    isDirSafe,
    getState,
    onUpdate,
    resetLoopTimer,
    onDirection,
    onRestart,
  }) {
    this._enableBuffer = enableBuffer;
    this._enableBoost = enableBoost;
    this._enableInstant = enableInstant;
    this._isDirSafe = isDirSafe;
    this._getState = getState;
    this._onUpdate = onUpdate;
    this._resetLoopTimer = resetLoopTimer;
    this._onDirection = onDirection;
    this._onRestart = onRestart;
    /** @type {Point[]} Buffered direction inputs (max 2). */
    this.buffer = [];
    /** @type {boolean} Whether speed boost is currently active. */
    this.speedBoostActive = false;
    /** @type {Point} Current movement direction. */
    this.direction = { x: 0, y: 0 };
    /** @type {Point} Next direction to apply (non-buffered mode). */
    this.nextDirection = { x: 0, y: 0 };
    /** @type {Point} Direction committed during grace period for rendering. */
    this.graceDirection = { x: 0, y: 0 };
  }

  /**
   * Attaches keyboard and touch event listeners to the given DOM elements.
   *
   * @param {HTMLCanvasElement} canvas The game canvas element.
   * @param {HTMLElement} wrapper The game wrapper element for touch listeners.
   */
  bind(canvas, wrapper) {
    this._canvas = canvas;
    this._wrapper = wrapper;

    this._boundKeydown = this._onKeydown.bind(this);
    this._boundCanvasTap = this._onCanvasTap.bind(this);

    this._canvas.addEventListener('keydown', this._boundKeydown);
    this._canvas.addEventListener('click', this._boundCanvasTap);
    this._canvas.addEventListener('touchend', this._boundCanvasTap, { passive: false });
  }

  /**
   * Removes all keyboard and touch event listeners.
   */
  destroy() {
    if (this._canvas) {
      this._canvas.removeEventListener('keydown', this._boundKeydown);
      this._canvas.removeEventListener('click', this._boundCanvasTap);
      this._canvas.removeEventListener('touchend', this._boundCanvasTap);
    }
  }

  /**
   * Handles keyboard keydown events. Maps arrow keys to directions and
   * Space (in OVER state) to restart.
   *
   * @private
   * @param {KeyboardEvent} e The keyboard event.
   */
  _onKeydown(e) {
    if (this._getState() === STATE.OVER && e.code === 'Space') {
      this._onRestart();
      return;
    }

    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON' || e.target.isContentEditable) {
      return;
    }

    const keyMap = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };

    const newDir = keyMap[e.key];
    if (!newDir) return;
    e.preventDefault();

    this._onDirection(newDir);
  }

  /**
   * Handles canvas click/tap events. Restarts the game when in the OVER state,
   * providing a mobile-friendly alternative to the spacebar.
   *
   * @private
   */
  /**
   * Minimum pixel distance from canvas center a tap must be to register as a direction input.
   *
   * @private
   * @returns {number} The minimum tap distance from center.
    return 20;
  }

  /**
   * Handles canvas click/tap events. Determines direction based on which side
   * of the canvas was tapped relative to center. For diagonal taps, the axis
   * with the larger absolute offset from center wins. Restarts the game when
   * in the OVER state.
   *
   * @private
   * @param {TouchEvent|MouseEvent} e The touch or mouse event.
   */
  _onCanvasTap(e) {
    const state = this._getState();
    if (state === STATE.UNFOCUSED) return;

    if (state === STATE.OVER) {
      this._onRestart();
      return;
    }

    e.preventDefault();

    const touch = e.changedTouches ? e.changedTouches[0] : e;
    const rect = this._canvas.getBoundingClientRect();

    const tapX = (touch.clientX - rect.left) * (this._canvas.width / rect.width);
    const tapY = (touch.clientY - rect.top) * (this._canvas.height / rect.height);

    const centerX = this._canvas.width / 2;
    const centerY = this._canvas.height / 2;

    const dx = tapX - centerX;
    const dy = tapY - centerY;

    if (Math.abs(dx) < InputManager.TOUCH_TAP_THRESHOLD && Math.abs(dy) < InputManager.TOUCH_TAP_THRESHOLD) return;

    const dir = Math.abs(dx) > Math.abs(dy) ? { x: dx > 0 ? 1 : -1, y: 0 } : { x: 0, y: dy > 0 ? 1 : -1 };

    this._onDirection(dir);
  }

  /**
   * Commits the oldest valid buffered direction as the current direction.
   * Skips opposite and duplicate directions. Deactivates boost on direction change.
   */
  commitDirection() {
    if (this._enableBuffer) {
      const prevDir = { x: this.direction.x, y: this.direction.y };
      let effectiveDir =
        this.graceDirection.x !== 0 || this.graceDirection.y !== 0
          ? { x: this.graceDirection.x, y: this.graceDirection.y }
          : { x: this.direction.x, y: this.direction.y };

      while (this.buffer.length > 0) {
        const next = this.buffer[0];
        const isOpposite = next.x === -effectiveDir.x && next.y === -effectiveDir.y;
        const isSame = next.x === effectiveDir.x && next.y === effectiveDir.y;
        if (isOpposite || isSame) {
          this.buffer.shift();
          continue;
        }
        if (this._isDirSafe(next)) {
          this.buffer.shift();
          effectiveDir = next;
          break;
        }
        break;
      }

      this.direction = effectiveDir;
      if (prevDir.x !== this.direction.x || prevDir.y !== this.direction.y) {
        this._deactivateBoost();
      }
      if (this.graceDirection.x !== 0 || this.graceDirection.y !== 0) {
        this.graceDirection = { x: 0, y: 0 };
      }
    } else {
      this.direction = this.nextDirection;
    }
  }

  /**
   * Handles a direction input while in the PLAYING state.
   * Buffers the input, activates/deactivates speed boost, and triggers
   * instant movement if enabled.
   *
   * @param {Point} dir The direction from the arrow key.
   * @returns {boolean} Whether the input was accepted (led to a move or boost).
   */
  handlePlayingInput(dir) {
    if (this._enableBuffer) {
      const ref = this.buffer.length > 0 ? this.buffer.at(-1) : this.direction;
      const isOpposite = dir.x === -ref.x && dir.y === -ref.y;
      const isDuplicate = dir.x === ref.x && dir.y === ref.y;
      if (!isOpposite && !isDuplicate && this.buffer.length < 2) {
        this.buffer.push(dir);
      }
    }
    let accepted = false;
    if (dir.x === this.direction.x && dir.y === this.direction.y) {
      const wasActive = this.speedBoostActive;
      this._activateBoost();
      accepted = this._enableBoost && !wasActive;
    } else if (dir.x !== -this.direction.x || dir.y !== -this.direction.y) {
      if (!this._enableBuffer) {
        this.nextDirection = dir;
      }
      this._deactivateBoost();
      accepted = true;
    } else {
      this._deactivateBoost();
    }

    if (accepted && this._getState() === STATE.PLAYING && this._enableInstant) {
      this._onUpdate();
      if (this._getState() === STATE.PLAYING) {
        this._resetLoopTimer();
      }
    }
    return accepted;
  }

  /**
   * Activates the speed boost state.
   *
   * @private
   */
  _activateBoost() {
    if (!this._enableBoost || this.speedBoostActive) return;
    this.speedBoostActive = true;
  }

  /**
   * Deactivates the speed boost state.
   *
   * @private
   */
  _deactivateBoost() {
    if (!this.speedBoostActive) return;
    this.speedBoostActive = false;
  }

  /** Resets the speed boost to inactive. */
  resetBoost() {
    this.speedBoostActive = false;
  }

  /** Empties the input buffer. */
  clearBuffer() {
    this.buffer = [];
  }
}

/**
 * Detects and resolves collisions.
 *
 * @classdesc Checks wall, boundary, and self-collisions and routes them
 * through the grace period, constrictor ignored state, or game over logic.
 */
class CollisionResolver {
  /**
   * @param {{
   *   graceEnabled: boolean,
   *   isConstrictor: boolean,
   *   isWallAt: (x: number, y: number) => boolean,
   *   snakeHas: (x: number, y: number) => boolean,
   *   snakeHead: () => Point,
   *   wrap: (p: Point) => Point,
   *   cols: number,
   *   rows: number,
   *   onEnterWarning: () => void,
   *   onEnterIgnored: () => void,
   *   onGameOver: () => void,
   * }} opts Feature flags, spatial queries, wrapping, grid dimensions, and collision callbacks.
   */
  constructor({
    graceEnabled,
    isConstrictor,
    isWallAt,
    snakeHas,
    snakeHead,
    wrap,
    cols,
    rows,
    onEnterWarning,
    onEnterIgnored,
    onGameOver,
  }) {
    this._graceEnabled = graceEnabled;
    this._isConstrictor = isConstrictor;
    this._isWallAt = isWallAt;
    this._snakeHas = snakeHas;
    this._snakeHead = snakeHead;
    this._wrap = wrap;
    this._cols = cols;
    this._rows = rows;
    this._onEnterWarning = onEnterWarning;
    this._onEnterIgnored = onEnterIgnored;
    this._onGameOver = onGameOver;
  }

  /**
   * Checks all collision types at a position.
   *
   * @param {Point} pos The position to check.
   * @returns {CollisionResult} Object with wall, boundary, and self flags.
   */
  getCollision(pos) {
    return {
      wall: this._isWallAt(pos.x, pos.y),
      boundary: pos.x < 0 || pos.x >= this._cols || pos.y < 0 || pos.y >= this._rows,
      self: this._snakeHas(pos.x, pos.y),
    };
  }

  /**
   * Checks whether the snake has any safe move from its current head position.
   *
   * @returns {boolean} Whether any safe move exists.
   */
  hasAnySafeMove() {
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    const head = this._snakeHead();
    for (const dir of dirs) {
      const pos = this._wrap({ x: head.x + dir.x, y: head.y + dir.y });
      const c = this.getCollision(pos);
      if (!c.wall && !c.boundary && !c.self) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks whether moving in a given direction from the head is safe.
   *
   * @param {Point} dir Direction vector.
   * @returns {boolean} True if no wall, boundary, or self collision.
   */
  isDirSafe(dir) {
    const head = this._snakeHead();
    const pos = this._wrap({ x: head.x + dir.x, y: head.y + dir.y });
    const c = this.getCollision(pos);
    return !c.wall && !c.boundary && !c.self;
  }

  /**
   * Resolves collision for the next head position. Routes to warning (grace
   * period), ignored (constrictor self-collision), or immediate game over.
   *
   * @param {Point} nextHead The next head position to check.
   * @returns {boolean} True if a collision was detected and handled.
   */
  resolve(nextHead) {
    const { wall, boundary, self } = this.getCollision(nextHead);
    if (wall || boundary || self) {
      if (this._isConstrictor && self) {
        if (this.hasAnySafeMove()) {
          this._onEnterIgnored();
        } else {
          this._onGameOver();
        }
        return true;
      }
      if (this._graceEnabled) {
        this._onEnterWarning();
      } else {
        this._onGameOver();
      }
      return true;
    }
    return false;
  }
}

/**
 * Core Snake game engine.
 *
 * @classdesc Manages the game canvas, snake state, food placement, input
 * handling, collision resolution, tile rendering, and all game lifecycle.
 * Uses delegated managers for walls, boundaries, wormholes, bonus food,
 * score bonus, speed, input, and collision.
 *
 * @example
 * const game = new SnakeGame(document.getElementById('game'), {
 *   mode: 'classic',
 *   enableWrap: true,
 * });
 */
// eslint-disable-next-line no-unused-vars -- accessed from index.html
class SnakeGame {
  /**
   * @param {HTMLElement} container The DOM element to mount the game into.
   * @param {object} [options={}] Feature toggles and mode selector.
   * @param {string} [options.mode='classic'] Game mode: 'classic', 'timeTrial', or 'constrictor'.
   * @param {boolean} [options.enableBonusFood=true] Enable golden diamond bonus food.
   * @param {boolean} [options.enableGracePeriod=true] Enable 1-second warning before collision.
   * @param {boolean} [options.enableShrinkOnBonusFood=true] Halve snake length on bonus food.
   * @param {boolean} [options.enableSpeedUp=true] Accelerate after each food eaten.
   * @param {boolean} [options.enableScoreBonus=true] Enable decaying bonus score multiplier.
   * @param {boolean} [options.enableWrap=true] Enable wrap-around boundaries.
   * @param {boolean} [options.enableSpeedBoost=true] Same-direction keypress boosts speed.
   * @param {boolean} [options.enableInputBuffer=true] Buffer up to 2 rapid inputs.
   * @param {boolean} [options.enableInstantMovement=true] Move immediately on keypress.
   * @param {boolean} [options.enableTimedBonusFood=true] Spawn bonus food every 15s.
   * @param {boolean} [options.enableWalls=true] Enable wall ring inside arena.
   * @param {boolean} [options.enableWormholes=true] Enable wormhole teleport pairs.
   * @param {boolean} [options.enableColorblindMode=false] Use Bang Wong colorblind-friendly palette.
   */
  constructor(container, options = {}) {
    this.container = container;
    /** @type {object} Resolved options with defaults applied. */
    this.options = {
      mode: options.mode || MODE_CLASSIC,
      enableBonusFood: options.enableBonusFood === undefined ? true : options.enableBonusFood,
      enableGracePeriod: options.enableGracePeriod === undefined ? true : options.enableGracePeriod,
      enableShrinkOnBonusFood: options.enableShrinkOnBonusFood === undefined ? true : options.enableShrinkOnBonusFood,
      enableSpeedUp: options.enableSpeedUp === undefined ? true : options.enableSpeedUp,
      enableScoreBonus: options.enableScoreBonus === undefined ? true : options.enableScoreBonus,
      enableWrap: options.enableWrap === undefined ? true : options.enableWrap,
      enableSpeedBoost: options.enableSpeedBoost === undefined ? true : options.enableSpeedBoost,
      enableInputBuffer: options.enableInputBuffer === undefined ? true : options.enableInputBuffer,
      enableInstantMovement: options.enableInstantMovement === undefined ? true : options.enableInstantMovement,
      enableTimedBonusFood: options.enableTimedBonusFood === undefined ? true : options.enableTimedBonusFood,
      enableWalls: options.enableWalls === undefined ? true : options.enableWalls,
      enableWormholes: options.enableWormholes === undefined ? true : options.enableWormholes,
      enableColorblindMode: options.enableColorblindMode === undefined ? false : options.enableColorblindMode,
    };

    /** @type {number} Number of grid columns. */
    this.COLS = 20;
    /** @type {number} Number of grid rows. */
    this.ROWS = 20;
    /** @type {number} Base game loop interval in ms. */
    this.BASE_SPEED = 135;
    /** @type {number} Minimum game loop interval in ms (fastest speed). */
    this.MIN_SPEED = 50;
    /** @type {number} Rate step used for speed-up calculation. */
    this.RATE_STEP = 0.2;
    /** @type {number} Time-trial countdown duration in ms (2 minutes). */
    this.TIME_LIMIT = 120_000;
    /** @type {object} Active color theme (THEME_DEFAULT or THEME_COLORBLIND). */
    this.colors = this.options.enableColorblindMode ? THEME_COLORBLIND : THEME_DEFAULT;

    /** @type {WallsManager} */
    this.walls = new WallsManager({ enabled: this.options.enableWalls });
    /** @type {BoundaryManager} */
    this.boundary = new BoundaryManager({ wrapEnabled: this.options.enableWrap, cols: this.COLS, rows: this.ROWS });

    /** @type {TimerManager} */
    this.timers = new TimerManager();

    /** @private */ this._rafId = undefined;
    /** @private */ this._lastFrameTime = 0;

    /** @type {WormholesManager} */
    this.wormholes = new WormholesManager({
      enabled: this.options.enableWormholes,
      cols: this.COLS,
      rows: this.ROWS,
      freeTileCount: () => this.freeTiles - this.snake.length,
      isOccupied: (x, y) =>
        this.snake.has(x, y) ||
        (this.food && this.food.x === x && this.food.y === y) ||
        this.bonusFood.isAt(x, y) ||
        this.walls.isWallAt(x, y),
      wrap: (p) => this.boundary.wrap(p),
      timers: this.timers,
      onDraw: () => this._draw(),
    });
    /** @type {BonusFoodManager} */
    this.bonusFood = new BonusFoodManager({
      enabled: this.options.enableBonusFood,
      timed: this.options.enableTimedBonusFood,
      canShrink: this.options.enableShrinkOnBonusFood,
      isConstrictor: this.options.mode === MODE_CONSTRICTOR,
      cols: this.COLS,
      rows: this.ROWS,
      snakeHas: (x, y) => this.snake.has(x, y),
      snakeLength: () => this.snake.length,
      isWallAt: (x, y) => this.walls.isWallAt(x, y),
      getFoodPos: () => this.food,
      wrapEnabled: this.options.enableWrap,
      wrap: (p) => this.boundary.wrap(p),
      isInBounds: (x, y) => this.boundary.isInBounds(x, y),
      timers: this.timers,
      getCurrentSpeed: () => this.speed.currentSpeed,
      isFoodEnclosed: (p) => this._isFoodEnclosed(p),
      isWormholeEntryAt: (x, y) =>
        this.wormholes.entry !== null && this.wormholes.entry.x === x && this.wormholes.entry.y === y,
      onEatCallback: () => this._eatBonusFood(),
    });
    /** @type {ScoreBonusManager} */
    this.scoreBonus = new ScoreBonusManager({
      enabled: this.options.enableScoreBonus,
      timers: this.timers,
      getScoreElement: () => this.scoreElement,
      getScore: () => this.score,
      onScoreUpdate: () => this._updateScoreDisplay(),
    });
    /** @type {InputManager} */
    this.input = new InputManager({
      enableBuffer: this.options.enableInputBuffer,
      enableBoost: this.options.enableSpeedBoost,
      enableInstant: this.options.enableInstantMovement,
      isDirSafe: (dir) => this.collision.isDirSafe(dir),
      getState: () => this.state,
      onUpdate: () => this._update(),
      resetLoopTimer: () => {
        this._lastFrameTime = performance.now();
      },
      onDirection: (dir) => this._handleDirectionInput(dir),
      onRestart: () => this.init(),
    });
    /** @type {SpeedManager} */
    this.speed = new SpeedManager({
      enabled: this.options.enableSpeedUp,
      baseSpeed: this.BASE_SPEED,
      minSpeed: this.MIN_SPEED,
      rateStep: this.RATE_STEP,
    });
    /** @type {CollisionResolver} */
    this.collision = new CollisionResolver({
      graceEnabled: this.options.enableGracePeriod,
      isConstrictor: this.options.mode === MODE_CONSTRICTOR,
      isWallAt: (x, y) => this.walls.isWallAt(x, y),
      snakeHas: (x, y) => this.snake.has(x, y),
      snakeHead: () => this.snake.head(),
      wrap: (p) => this.boundary.wrap(p),
      cols: this.COLS,
      rows: this.ROWS,
      onEnterWarning: () => this._enterWarning(),
      onEnterIgnored: () => this._enterIgnored(),
      onGameOver: () => this._gameOver(),
    });

    this._buildDOM();
    this.input.bind(this.canvas, this.container.querySelector('.snake-game-wrapper'));
    this._bindEvents();
    this.init();
  }

  /**
   * Builds the DOM structure inside the container element.
   * Creates HUD (score, bonus, timer), canvas wrapper, and message elements.
   *
   * @private
   */
  _buildDOM() {
    this.container.innerHTML = `
      <div class="snake-container">
        <div class="snake-hud">
          <span class="snake-score">Score: 0</span>
          <span class="snake-timer">Time: 0:00</span>
        </div>
        <div class="snake-game-wrapper"><canvas class="snake-canvas" tabindex="0"></canvas><div class="snake-focus-overlay">${MSG_CLICK_OR_TAP_TO_FOCUS}</div></div>
        <div class="snake-message">${MSG_PRESS_ARROW_KEY_TO_START}</div>
      </div>
    `;

    this.canvas = this.container.querySelector('.snake-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.scoreElement = this.container.querySelector('.snake-score');
    this.timerElement = this.container.querySelector('.snake-timer');
    this.messageElement = this.container.querySelector('.snake-message');
    this.overlay = this.container.querySelector('.snake-focus-overlay');
    this.wrapper = this.container.querySelector('.snake-game-wrapper');
    this.canvas.width = 500;
    this.canvas.height = 500;
    this.CELL_SIZE = 25;
    this._createTiles();
  }

  /**
   * Computes the canvas pixel size from available width, sets CELL_SIZE,
   * recreates tiles, and redraws.
   *
   * @private
   */
  _resizeCanvas() {
    const containerEl = this.container.querySelector('.snake-container');
    const availableWidth = containerEl ? containerEl.clientWidth : this.wrapper.parentElement.clientWidth;
    if (availableWidth < 20) return;
    const cellSize = Math.max(10, Math.floor(availableWidth / this.COLS));
    const canvasSize = cellSize * this.COLS;
    if (canvasSize === this.canvas.width && cellSize === this.CELL_SIZE) return;
    this.canvas.width = canvasSize;
    this.canvas.height = canvasSize;
    this.CELL_SIZE = cellSize;
    this._createTiles();
    if (this.snake) this._draw();
  }

  /**
   * Binds focus, blur, overlay-click, visibility change, outside-click, and resize event listeners.
   *
   * @private
   */
  _bindEvents() {
    this._onFocus = () => {
      this.overlay.classList.add('snake-hidden');
      if (this.state === STATE.UNFOCUSED) {
        this._exitUnfocused();
      }
    };
    this._onBlur = () => {
      this._enterUnfocused();
    };
    this._onVisibilityChange = () => {
      if (document.hidden) {
        this._enterUnfocused();
      } else if (this.state === STATE.UNFOCUSED) {
        this._exitUnfocused();
      }
    };
    this._onOutsideTouch = (e) => {
      if (this.state === STATE.UNFOCUSED) return;
      const target = e.target;
      if (!this.wrapper.contains(target)) {
        this._enterUnfocused();
      }
    };
    this._onClick = () => {
      if (this.state === STATE.OVER) {
        this.init();
      } else if (this.state === STATE.UNFOCUSED) {
        this._exitUnfocused();
      } else {
        this.canvas.focus();
      }
    };

    this.canvas.addEventListener('focus', this._onFocus);
    this.canvas.addEventListener('blur', this._onBlur);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    document.addEventListener('touchstart', this._onOutsideTouch, { passive: true });
    document.addEventListener('mousedown', this._onOutsideTouch);
    this.overlay.addEventListener('click', this._onClick);
    this._resizeObserver = new ResizeObserver(() => this._resizeCanvas());
    this._resizeObserver.observe(this.container);
    requestAnimationFrame(() => this._resizeCanvas());
  }

  /**
   * Removes event listeners, disconnects the resize observer, and clears all
   * timers. Call before re-mounting.
   */
  destroy() {
    this.canvas.removeEventListener('focus', this._onFocus);
    this.canvas.removeEventListener('blur', this._onBlur);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    document.removeEventListener('touchstart', this._onOutsideTouch);
    document.removeEventListener('mousedown', this._onOutsideTouch);
    this.overlay.removeEventListener('click', this._onClick);
    this._resizeObserver.disconnect();
    this.input.destroy();
    this._stopLoop();
    this._clearAllTimers();
  }

  /** @private */
  _clearAllTimers() {
    this.timers.clearAll();
  }

  /**
   * Initializes or resets all game state to a fresh "waiting" state.
   * Resets snake position, score, timers, food, and redraws the canvas.
   */
  init() {
    /** @type {SnakeBody} Snake body segments (head is index 0). */
    this.snake = new SnakeBody([{ x: 10, y: 10 }]);
    this.score = 0;
    this.elapsed = 0;
    this._transitionTo(STATE.WAITING);
    this.speed.currentSpeed = this.BASE_SPEED;
    this.foodsEaten = 0;
    this.scoreBonus.value = 100;
    this.wasPaused = false;
    this._previousState = null;
    this.input.speedBoostActive = false;
    this.input.buffer = [];
    this.input.direction = { x: 0, y: 0 };
    this.input.nextDirection = { x: 0, y: 0 };
    this.input.graceDirection = { x: 0, y: 0 };
    this.growth = 0;
    this.startGrowth = 0;
    this.warningElapsed = 0;
    this.wormholes.entry = null;
    this.wormholes.exit = null;
    this.bonusFood.pos = null;
    this._stopLoop();
    this.timers.clearAll();
    this.freeTiles = this.COLS * this.ROWS;
    if (this.walls.enabled) {
      this.freeTiles -= this.walls.count;
    }
    this.scoreElement.textContent = 'Score: 0';
    this.timerElement.textContent = this.options.mode === MODE_TIME_TRIAL ? 'Time: 2:00' : 'Time: 0:00';
    this.messageElement.textContent = MSG_USE_ARROW_KEYS_TO_START;
    this.overlay.textContent = MSG_CLICK_OR_TAP_TO_FOCUS;
    this._placeFood();
    this._draw();
  }

  /**
   * Places regular food at a random valid position (not on snake, wall, or
   * enclosed region in constrictor mode).
   *
   * @private
   */
  _placeFood() {
    const isConstrictor = this.options.mode === MODE_CONSTRICTOR;
    let pos;
    let tries = 0;
    const maxTries = 200;
    do {
      pos = { x: Math.floor(Math.random() * this.COLS), y: Math.floor(Math.random() * this.ROWS) };
      tries++;
    } while (
      this.snake.has(pos.x, pos.y) ||
      this.walls.isWallAt(pos.x, pos.y) ||
      (this.wormholes.entry && pos.x === this.wormholes.entry.x && pos.y === this.wormholes.entry.y) ||
      (isConstrictor && tries < maxTries && this._isFoodEnclosed(pos))
    );
    if (isConstrictor && this._isFoodEnclosed(pos)) {
      const fallback = this._findAnyFreeTile();
      if (fallback) {
        pos = fallback;
      }
    }
    /** @type {Point} Regular food position. */
    this.food = pos;
  }

  /**
   * Finds the first grid cell that is not occupied by snake or walls.
   *
   * @private
   * @returns {Point|null} A free cell, or null if the board is full.
   */
  _findAnyFreeTile() {
    for (let y = 0; y < this.ROWS; y++) {
      for (let x = 0; x < this.COLS; x++) {
        if (
          !this.snake.has(x, y) &&
          !this.walls.isWallAt(x, y) &&
          !(this.wormholes.entry && x === this.wormholes.entry.x && y === this.wormholes.entry.y)
        ) {
          return { x, y };
        }
      }
    }
    return null;
  }

  /**
   * Determines whether a grid position is enclosed by the snake using BFS
   * flood fill. In non-wrap mode, a region is enclosed if it cannot reach the
   * grid boundary. In wrap mode, the food's connected component is compared
   * against the largest other connected component.
   *
   * @private
   * @param {Point} pos The position to check.
   * @returns {boolean} True if the position is enclosed.
   */
  _isFoodEnclosed(pos) {
    const wallSet = this.walls.getWallSet();
    const isBlocked = (x, y) => this.snake.has(x, y) || wallSet.has(key(x, y));
    const wrap = this.boundary.enabled;

    const floodSize = (sx, sy, visited) => {
      let size = 0;
      const q = [{ x: sx, y: sy }];
      let head = 0;
      visited.add(key(sx, sy));
      while (head < q.length) {
        const { x, y } = q[head++];
        size++;
        for (const [dx, dy] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ]) {
          let nx = x + dx,
            ny = y + dy;
          if (wrap) {
            nx = (nx + this.COLS) % this.COLS;
            ny = (ny + this.ROWS) % this.ROWS;
          } else if (nx < 0 || nx >= this.COLS || ny < 0 || ny >= this.ROWS) {
            continue;
          }
          const k = key(nx, ny);
          if (visited.has(k) || isBlocked(nx, ny)) {
            continue;
          }
          visited.add(k);
          q.push({ x: nx, y: ny });
        }
      }
      return size;
    };

    const visited = new Set();
    const foodSize = floodSize(pos.x, pos.y, visited);

    if (!wrap) {
      for (const k of visited) {
        const [xs, ys] = k.split(',');
        if (+xs === 0 || +xs === this.COLS - 1 || +ys === 0 || +ys === this.ROWS - 1) {
          return false;
        }
      }
      return true;
    }

    let largestOther = 0;
    for (let y = 0; y < this.ROWS; y++) {
      for (let x = 0; x < this.COLS; x++) {
        const k = key(x, y);
        if (visited.has(k) || isBlocked(x, y)) {
          continue;
        }
        const sz = floodSize(x, y, visited);
        if (sz > largestOther) {
          largestOther = sz;
        }
      }
    }
    return foodSize < largestOther;
  }

  /**
   * Consumes the regular food: awards 10 pts + score bonus, increments
   * foodsEaten, sets growth, triggers board-full check, and places new food.
   *
   * @private
   */
  _eatRegularFood() {
    const points = 10 + this.scoreBonus.onFoodEaten();
    this.score += points;
    this._updateScoreDisplay();
    this.foodsEaten++;
    this.growth = 1;
    if (this.snake.length >= this.freeTiles) {
      this._gameOver();
      return;
    }
    this.bonusFood.trySpawnOnCount(this.foodsEaten);
    this._placeFood();
    this.speed.onFoodEaten(this.foodsEaten);
  }

  /**
   * Consumes the bonus food. Awards points, handles shrink, and clears
   * the bonus food from the board.
   *
   * @private
   */
  _eatBonusFood() {
    const result = this.bonusFood.onEat();
    this.score += result.points;
    this._updateScoreDisplay();
    if (result.shrinkBy > 0) {
      this.snake.splice(result.shrinkBy);
    }
  }

  /**
   * Updates the HUD score display, appending the bonus suffix if active.
   *
   * @private
   */
  _updateScoreDisplay() {
    this.scoreElement.textContent = `Score: ${this.score}${this.scoreBonus.getScoreSuffix()}`;
  }

  /**
   * Updates the HUD timer display. In time-trial mode, checks for time expiry.
   *
   * @private
   */
  _updateTimerDisplay() {
    this.elapsed = Date.now() - this.startTime;
    if (this.options.mode === MODE_TIME_TRIAL) {
      const remaining = Math.max(0, this.TIME_LIMIT - this.elapsed);
      const secs = Math.floor(remaining / 1000);
      this.timerElement.textContent = `Time: ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
      if (remaining <= 0) {
        this._gameOver();
      }
    } else {
      const secs = Math.floor(this.elapsed / 1000);
      this.timerElement.textContent = `Time: ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    }
  }

  /**
   * Renders the full frame: background, walls, wormholes, snake (via
   * pre-rendered tiles), food, bonus food, and game-over overlay.
   *
   * @private
   */
  _draw() {
    this.ctx.fillStyle = this.colors.bg;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.walls.enabled) {
      for (const w of WALLS) {
        this.ctx.drawImage(this.tiles.wall, w.x * this.CELL_SIZE, w.y * this.CELL_SIZE, this.CELL_SIZE, this.CELL_SIZE);
      }
    }

    if (this.wormholes._enabled && this.wormholes.entry) {
      this.ctx.drawImage(
        this.tiles.wormholeEntry,
        this.wormholes.entry.x * this.CELL_SIZE,
        this.wormholes.entry.y * this.CELL_SIZE,
        this.CELL_SIZE,
        this.CELL_SIZE
      );
      this.ctx.drawImage(
        this.tiles.wormholeExit,
        this.wormholes.exit.x * this.CELL_SIZE,
        this.wormholes.exit.y * this.CELL_SIZE,
        this.CELL_SIZE,
        this.CELL_SIZE
      );
    }

    // eslint-disable-next-line unicorn/no-array-for-each -- SnakeBody#forEach, not Array#forEach
    this.snake.forEach((seg, i) => {
      let key = this._getSegmentTileKey(i);
      if (this.state === STATE.IGNORED) {
        key += '_i';
      } else if (this.state === STATE.WARNING) {
        key += '_w';
      } else if (i === 0 && this.input.speedBoostActive) {
        key += '_b';
      }
      this.ctx.drawImage(
        this.tiles[key],
        seg.x * this.CELL_SIZE,
        seg.y * this.CELL_SIZE,
        this.CELL_SIZE,
        this.CELL_SIZE
      );
    });

    this.ctx.drawImage(
      this.tiles.food,
      this.food.x * this.CELL_SIZE,
      this.food.y * this.CELL_SIZE,
      this.CELL_SIZE,
      this.CELL_SIZE
    );

    if (this.bonusFood._enabled && this.bonusFood.pos) {
      this.ctx.drawImage(
        this.tiles.bonusFood,
        this.bonusFood.pos.x * this.CELL_SIZE,
        this.bonusFood.pos.y * this.CELL_SIZE,
        this.CELL_SIZE,
        this.CELL_SIZE
      );
    }

    if (this.state === STATE.OVER) {
      this.ctx.fillStyle = this.colors.overlay;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = this.colors.overlayText;
      this.ctx.font = `bold ${Math.max(16, Math.round(this.CELL_SIZE * 1.28))}px ${getComputedStyle(this.canvas).fontFamily}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(MSG_GAME_OVER_OVERLAY, this.canvas.width / 2, this.canvas.height / 2 - 20);
      this.ctx.font = `${Math.max(12, Math.round(this.CELL_SIZE * 0.96))}px ${getComputedStyle(this.canvas).fontFamily}`;
      this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
    }
  }

  /**
   * Creates all pre-rendered off-screen canvas tiles (46 total: 3 full
   * palette sets × 14 shapes + 4 boost head tiles).
   *
   * @private
   */
  _createTiles() {
    const sets = [
      { palette: this.colors.paletteNormal, suffix: '' },
      { palette: this.colors.paletteWarning, suffix: '_w' },
      { palette: this.colors.paletteIgnored, suffix: '_i' },
    ];

    this.tiles = {};

    for (const { palette, suffix } of sets) {
      Object.assign(this.tiles, this._createTileSet(palette, suffix));
    }

    const boostHeadKeys = ['headUp', 'headDown', 'headLeft', 'headRight'];
    for (const key of boostHeadKeys) {
      this.tiles[`${key}_b`] = this._makeTile(key, { ...this.colors, ...this.colors.paletteBoost });
    }

    for (const key of STATIC_TILE_KEYS) {
      this.tiles[key] = this._makeTile(key, { ...this.colors, ...this.colors.paletteNormal });
    }
  }

  /**
   * Creates a set of tiles for a given palette and suffix.
   *
   * @private
   * @param {Colors} palette Palette with body/head/eye properties.
   * @param {string} suffix Key suffix (e.g. '', '_w', '_i').
   * @returns {{[key: string]: HTMLCanvasElement}} Map of tile keys to canvases.
   */
  _createTileSet(palette, suffix) {
    const set = {};
    const colors = { ...this.colors, ...palette };
    for (const key of Object.keys(TILE_RENDERERS)) {
      if (STATIC_TILE_KEYS.has(key)) continue;
      set[key + suffix] = this._makeTile(key, colors);
    }
    return set;
  }

  /**
   * Creates a single off-screen canvas tile and draws the given renderer on it.
   *
   * @private
   * @param {string} key Tile shape key (e.g. 'headUp', 'bodyHoriz').
   * @param {Colors} colors Colors object holding all needed properties.
   * @returns {HTMLCanvasElement} The off-screen canvas tile.
   */
  _makeTile(key, colors) {
    const canvas = document.createElement('canvas');
    canvas.width = 26;
    canvas.height = 26;
    const ctx = canvas.getContext('2d');
    TILE_RENDERERS[key](ctx, colors);
    return canvas;
  }

  /**
   * Determines which tile shape key to use for the segment at index i.
   * Returns keys like 'headUp', 'bodyHoriz', 'tailDown', 'cornerRD', etc.
   *
   * @private
   * @param {number} i Segment index in the snake array.
   * @returns {string} Tile key (without palette suffix).
   */
  _getSegmentTileKey(i) {
    if (i === 0) {
      const d = this.input.direction.x === 0 && this.input.direction.y === 0 ? { x: 1, y: 0 } : this.input.direction;
      return `head${DIR_KEY[`${d.x},${d.y}`]}`;
    }

    const prev = this.snake.segmentAt(i - 1);
    const curr = this.snake.segmentAt(i);
    const dirIn = this.boundary.dirBetween(prev, curr);

    if (i === this.snake.length - 1) {
      const key = DIR_KEY[`${dirIn.x},${dirIn.y}`];
      if (key) return `tail${key}`;
      return Math.abs(dirIn.x) >= Math.abs(dirIn.y) ? 'bodyHoriz' : 'bodyVert';
    }

    const next = this.snake.segmentAt(i + 1);
    const dirOut = this.boundary.dirBetween(curr, next);

    const inCardinal = DIR_KEY[`${dirIn.x},${dirIn.y}`] !== undefined;
    const outCardinal = DIR_KEY[`${dirOut.x},${dirOut.y}`] !== undefined;

    if (!inCardinal || !outCardinal) {
      return Math.abs(dirIn.x) >= Math.abs(dirIn.y) ? 'bodyHoriz' : 'bodyVert';
    }

    if (dirIn.x === dirOut.x && dirIn.y === dirOut.y) {
      return dirIn.x === 0 ? 'bodyVert' : 'bodyHoriz';
    }

    const inName = DIR_KEY[`${dirIn.x},${dirIn.y}`];
    const outName = DIR_KEY[`${dirOut.x},${dirOut.y}`];
    return CORNER_MAP[`${inName}->${outName}`];
  }

  /**
   * Commits the next buffered direction as the current direction.
   *
   * @private
   */
  _processInput() {
    this.input.commitDirection();
  }

  /**
   * Calculates the next head position, applies wrapping, and checks wormholes.
   *
   * @private
   * @returns {Point} The resolved next head position.
   */
  _resolveNextHead() {
    const nextHead = {
      x: this.snake.head().x + this.input.direction.x,
      y: this.snake.head().y + this.input.direction.y,
    };
    this.boundary.wrap(nextHead);
    this.wormholes.tryTeleport(nextHead);
    return nextHead;
  }

  /**
   * Resolves collision for the next head position.
   *
   * @private
   * @param {Point} nextHead The next head position.
   * @returns {boolean} True if a collision occurred (state was changed).
   */
  _processCollision(nextHead) {
    return this.collision.resolve(nextHead);
  }

  /**
   * Processes a single turn in constrictor mode: handles head-food poofing,
   * auto-growth, growth, enclosure-based eating of regular and bonus food.
   *
   * @private
   * @param {Point} head The current head position.
   */
  _processConstrictorTurn(head) {
    if (head.x === this.food.x && head.y === this.food.y) {
      if (this.snake.length >= this.freeTiles) {
        this._gameOver();
        return;
      }
      this._placeFood();
    }

    if (this.startGrowth > 0) {
      this.startGrowth--;
    } else if (this.growth > 0) {
      this.growth--;
    } else {
      this.snake.pop();
    }

    if (this._isFoodEnclosed(this.food)) {
      this._eatRegularFood();
      if (this.state === STATE.OVER) return;
    }

    if (this.bonusFood.isEnclosed()) {
      this._eatBonusFood();
    }
  }

  /**
   * Processes a single turn in classic/time-trial modes: handles regular food
   * eating, growth, tail popping, and bonus food head collision.
   *
   * @private
   * @param {Point} head The current head position.
   */
  _processClassicTurn(head) {
    if (head.x === this.food.x && head.y === this.food.y) {
      this._eatRegularFood();
      if (this.state === STATE.OVER) return;
    } else {
      if (this.growth > 0) {
        this.growth--;
      } else {
        this.snake.pop();
      }
    }

    if (this.bonusFood.isHeadCollision(head)) {
      this._eatBonusFood();
    }
  }

  /**
   * Main game tick: processes input, resolves head position, checks collision,
   * advances the snake, handles mode-specific turn logic, and redraws.
   *
   * @private
   */
  _update() {
    this._processInput();
    const nextHead = this._resolveNextHead();
    if (this._processCollision(nextHead)) {
      return;
    }
    this.snake.unshift(nextHead);
    if (this.options.mode === MODE_CONSTRICTOR) {
      this._processConstrictorTurn(nextHead);
    } else {
      this._processClassicTurn(nextHead);
    }
  }

  /**
   * rAF callback. Runs physics when the accumulator reaches the target
   * interval, then always renders at the display refresh rate.
   *
   * @private
   * @param {number} now High-resolution timestamp from requestAnimationFrame.
   */
  _runLoop(now) {
    if (this.state !== STATE.PLAYING) return;
    this._rafId = requestAnimationFrame((t) => this._runLoop(t));
    const delta = now - this._lastFrameTime;
    const targetInterval = this.input.speedBoostActive
      ? this.speed.currentSpeed / SPEED_BOOST_FACTOR
      : this.speed.currentSpeed;
    if (delta >= targetInterval) {
      this._update();
      this._lastFrameTime = now - (delta % targetInterval);
    }
    this._draw();
  }

  /**
   * Starts the rAF-based game loop.
   *
   * @private
   * @param {number} [now] Optional initial timestamp (defaults to performance.now()).
   */
  _startLoop(now) {
    this._lastFrameTime = now || performance.now();
    this._rafId = requestAnimationFrame((t) => this._runLoop(t));
  }

  /**
   * Stops the rAF-based game loop.
   *
   * @private
   */
  _stopLoop() {
    if (this._rafId !== undefined) {
      cancelAnimationFrame(this._rafId);
      this._rafId = undefined;
    }
  }

  /**
   * Transitions to a new game state. Logs a warning if the transition is
   * not in STATE_TRANSITIONS, but always applies the new state.
   *
   * @private
   * @param {string} newState One of the STATE constants.
   */
  _transitionTo(newState) {
    if (this.state === newState) return;
    const valid = STATE_TRANSITIONS[this.state];
    if (valid && !valid.includes(newState)) {
      // Invalid state transition: ${this.state} -> ${newState}
      return;
    }
    this.state = newState;
  }

  /**
   * Enters the warning (grace period) state. Clears the game loop, stores
   * the offending direction, and starts a 700ms countdown (shorter if
   * speed boost is active).
   *
   * @private
   */
  _enterWarning() {
    this._stopLoop();
    this.bonusFood.clearMovementInterval();
    this._transitionTo(STATE.WARNING);
    this.warningStart = Date.now();
    this.warningElapsed = 0;
    this.messageElement.textContent = '';
    this.input.graceDirection = { x: this.input.direction.x, y: this.input.direction.y };
    this._draw();
    this.timers.setTimeout(
      'warningTimeout',
      () => this._gameOver(),
      this.input.speedBoostActive ? WARNING_TIMEOUT_MS / SPEED_BOOST_FACTOR : WARNING_TIMEOUT_MS
    );
  }

  /**
   * Enters the ignored state (constrictor self-collision). Clears the game
   * loop and all bonus-food timers, displays a prompt, and waits for a
   * safe direction input.
   *
   * @private
   */
  _enterIgnored() {
    this._stopLoop();
    this.bonusFood.clearAllTimers();
    this.scoreBonus.clearTimers();
    this.input.resetBoost();
    this._transitionTo(STATE.IGNORED);
    this.input.clearBuffer();
    this.messageElement.textContent = MSG_SNAKE_STUCK;
    this._draw();
  }

  /**
   * Starts the game from the WAITING state. Transitions to PLAYING, records
   * the start time, starts the game loop and all periodic timers.
   * In constrictor mode, sets auto-growth (14 ticks).
   *
   * @private
   */
  _startGame() {
    this.canvas.focus();
    this._transitionTo(STATE.PLAYING);
    this.startTime = Date.now() - this.elapsed;
    this.messageElement.textContent = '';
    if (this.options.mode === MODE_CONSTRICTOR) {
      this.startGrowth = 14;
    }
    this._startLoop(performance.now());
    this.timers.setInterval('timerInterval', () => this._updateTimerDisplay(), 1000);
    this.scoreBonus.resumeDecay();
    this.bonusFood.startTimers();
    this.wormholes.startTimers();
  }

  /**
   * Ends the game: clears all timers, transitions to OVER, shows the
   * game-over overlay, and displays "Press Space to restart".
   *
   * @private
   */
  _gameOver() {
    this._stopLoop();
    this._clearAllTimers();
    this._transitionTo(STATE.OVER);
    this.messageElement.textContent = MSG_GAME_OVER_RESTART;
    this._draw();
  }

  /**
   * Pauses the game on canvas blur. Clears all timers and stores the
   * remaining warning elapsed time if in the WARNING state.
   *
   * @private
   */
  _pauseGame() {
    if (this.state !== STATE.PLAYING && this.state !== STATE.WARNING && this.state !== STATE.IGNORED) return;
    this.wasPaused = true;
    this._stopLoop();
    this._clearAllTimers();
    if (this.state === STATE.WARNING) {
      this.warningElapsed = Date.now() - this.warningStart;
    }
    this.overlay.textContent = MSG_PAUSED_RESUME;
  }

  /**
   * Resumes the game after pause (canvas focus). Restores timers for the
   * current state (PLAYING, WARNING, or IGNORED).
   *
   * @private
   */
  _resumeGame() {
    if (!this.wasPaused) return;
    this.wasPaused = false;
    switch (this.state) {
      case STATE.PLAYING: {
        this.startTime = Date.now() - this.elapsed;
        this._startLoop(performance.now());
        this.timers.setInterval('timerInterval', () => this._updateTimerDisplay(), 1000);
        this._resumeCommonTimers();
        this.bonusFood.startTimers();
        this.wormholes.startTimers();

        break;
      }
      case STATE.WARNING: {
        const warningDuration = this.input.speedBoostActive
          ? WARNING_TIMEOUT_MS / SPEED_BOOST_FACTOR
          : WARNING_TIMEOUT_MS;
        this.timers.setTimeout(
          'warningTimeout',
          () => this._gameOver(),
          Math.max(0, warningDuration - this.warningElapsed)
        );
        this.timers.setInterval('timerInterval', () => this._updateTimerDisplay(), 1000);
        this._resumeCommonTimers();

        break;
      }
      case STATE.IGNORED: {
        this.timers.setInterval('timerInterval', () => this._updateTimerDisplay(), 1000);
        this._resumeCommonTimers();
        this.bonusFood.startTimers();
        this.wormholes.startTimers();

        break;
      }
      // No default
    }
    this.overlay.textContent = MSG_CLICK_OR_TAP_TO_FOCUS;
  }

  /**
   * Resumes bonus food movement and score bonus decay timers (shared across
   * several resume paths).
   *
   * @private
   */
  _resumeCommonTimers() {
    this.bonusFood.resumeMovementTimers();
    this.scoreBonus.resumeDecay();
  }

  /**
   * Enters the unfocused state. Stores the current state, stops all activity,
   * and shows the pause overlay.
   *
   * @private
   */
  _enterUnfocused() {
    if (this.state !== STATE.PLAYING && this.state !== STATE.WARNING && this.state !== STATE.IGNORED) return;
    this._previousState = this.state;
    this._transitionTo(STATE.UNFOCUSED);
    this._stopLoop();
    this._clearAllTimers();
    if (this._previousState === STATE.WARNING) {
      this.warningElapsed = Date.now() - this.warningStart;
    }
    this.overlay.textContent = MSG_PAUSED_RESUME;
    this.overlay.classList.remove('snake-hidden');
  }

  /**
   * Exits the unfocused state. Restores the previous state and resumes all
   * timers and the game loop.
   *
   * @private
   */
  _exitUnfocused() {
    if (this.state !== STATE.UNFOCUSED || !this._previousState) return;
    const restoredState = this._previousState;
    this._previousState = null;
    this.overlay.classList.add('snake-hidden');
    this._transitionTo(restoredState);
    switch (restoredState) {
      case STATE.PLAYING: {
        this.startTime = Date.now() - this.elapsed;
        this._startLoop(performance.now());
        this.timers.setInterval('timerInterval', () => this._updateTimerDisplay(), 1000);
        this._resumeCommonTimers();
        this.bonusFood.startTimers();
        this.wormholes.startTimers();

        break;
      }
      case STATE.WARNING: {
        const warningDuration = this.input.speedBoostActive
          ? WARNING_TIMEOUT_MS / SPEED_BOOST_FACTOR
          : WARNING_TIMEOUT_MS;
        this.timers.setTimeout(
          'warningTimeout',
          () => this._gameOver(),
          Math.max(0, warningDuration - this.warningElapsed)
        );
        this.timers.setInterval('timerInterval', () => this._updateTimerDisplay(), 1000);
        this._resumeCommonTimers();

        break;
      }
      case STATE.IGNORED: {
        this.timers.setInterval('timerInterval', () => this._updateTimerDisplay(), 1000);
        this._resumeCommonTimers();
        this.bonusFood.startTimers();
        this.wormholes.startTimers();

        break;
      }
      // No default
    }
    this.canvas.focus();
    this.overlay.textContent = MSG_CLICK_OR_TAP_TO_FOCUS;
  }

  /**
   * Routes a cardinal direction input (from keyboard or tap) to the
   * appropriate state-specific handler.
   *
   * @private
   * @param {Point} dir The direction input.
   */
  _handleDirectionInput(dir) {
    switch (this.state) {
      case STATE.WAITING: {
        this._handleInputWaiting(dir);
        break;
      }
      case STATE.WARNING: {
        this._handleInputWarning(dir);
        break;
      }
      case STATE.IGNORED: {
        this._handleInputIgnored(dir);
        break;
      }
      case STATE.PLAYING: {
        this._handleInputPlaying(dir);
        break;
      }
      case STATE.UNFOCUSED: {
        break;
      }
      default: {
        break;
      }
    }
  }

  /**
   * Handles input in WAITING state: sets direction and starts the game.
   *
   * @private
   * @param {Point} dir The direction input.
   */
  _handleInputWaiting(dir) {
    this.input.nextDirection = dir;
    this.input.direction = dir;
    this._startGame();
  }

  /**
   * Handles input in WARNING state: checks if the direction avoids collision,
   * and if so, escapes the warning and resumes play.
   *
   * @private
   * @param {Point} dir The direction input.
   */
  _handleInputWarning(dir) {
    const newHead = this.boundary.wrap({ x: this.snake.head().x + dir.x, y: this.snake.head().y + dir.y });
    const c = this.collision.getCollision(newHead);
    if (c.wall || c.boundary || c.self) return;
    this.timers.clear('warningTimeout');
    this.input.direction = dir;
    this.input.nextDirection = dir;
    this.input.graceDirection = { x: 0, y: 0 };
    this._transitionTo(STATE.PLAYING);
    this.messageElement.textContent = '';
    this.input.resetBoost();
    this._startLoop(performance.now());
    this.bonusFood.resumeMovementTimers();
  }

  /**
   * Handles input in IGNORED state: checks if the direction avoids collision,
   * and if so, escapes the ignored state and resumes play.
   *
   * @private
   * @param {Point} dir The direction input.
   */
  _handleInputIgnored(dir) {
    const newHead = this.boundary.wrap({ x: this.snake.head().x + dir.x, y: this.snake.head().y + dir.y });
    const c = this.collision.getCollision(newHead);
    if (c.wall || c.boundary || c.self) return;
    this.input.clearBuffer();
    this.input.direction = dir;
    this.input.nextDirection = dir;
    this._transitionTo(STATE.PLAYING);
    this.messageElement.textContent = '';
    this._startLoop(performance.now());
    this._resumeCommonTimers();
  }

  /**
   * Handles input in PLAYING state via the InputManager.
   *
   * @private
   * @param {Point} dir The direction input.
   */
  _handleInputPlaying(dir) {
    this.input.handlePlayingInput(dir);
  }
}
