/*
Snake Demo - A Snake game with togglable features to demonstrate game design. Renders on an HTML5 Canvas. Supports classic, time-trial, and constrictor modes with 12 togglable feature flags.
Written in 2026 by Philipp Hagenlocher <me@philipphagenlocher.de>
This software was written with the assistance of AI.

To the extent possible under law, the author(s) have dedicated all copyright and related and neighboring rights to this software to the public domain worldwide. This software is distributed without any warranty.

You should have received a copy of the CC0 Public Domain Dedication along with this software. If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.
*/
/**
 * A 2D point on the grid.
 * @typedef {{x: number, y: number}} Point
 */

/**
 * A palette of colors for a snake segment.
 * @typedef {{body: string, head: string, eye: string}} Palette
 */

/**
 * A tile renderer callback.
 * @callback TileRenderer
 * @param {CanvasRenderingContext2D} ctx
 * @param {Palette} palette
 */

/**
 * A collision breakdown.
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
  OVER: 'over',
});

/** @type {Object<string, string[]>} Valid transitions for each state. */
const STATE_TRANSITIONS = Object.freeze({
  [STATE.WAITING]: [STATE.PLAYING],
  [STATE.PLAYING]: [STATE.WARNING, STATE.IGNORED, STATE.OVER],
  [STATE.WARNING]: [STATE.PLAYING, STATE.OVER],
  [STATE.IGNORED]: [STATE.PLAYING],
  [STATE.OVER]: [STATE.WAITING],
});

/** @const {string} Background color. */
const COLOR_BG = '#0d1a0d';
/** @const {string} Wall body color. */
const COLOR_WALL_BODY = '#555';
/** @const {string} Wall top/left edge highlight. */
const COLOR_WALL_EDGE_LIGHT = '#777';
/** @const {string} Wall bottom/right edge shadow. */
const COLOR_WALL_EDGE_DARK = '#333';
/** @const {string} Regular food color. */
const COLOR_FOOD = '#7aff7a';
/** @const {string} Bonus food (golden diamond) color. */
const COLOR_FOOD_BONUS = '#ffd700';
/** @const {string} Wormhole entry cell color. */
const COLOR_WORMHOLE_ENTRY = '#003a00';
/** @const {string} Wormhole exit cell color. */
const COLOR_WORMHOLE_EXIT = '#e8e8e8';
/** @const {number} Wormhole spawn interval in ms. */
const WORMHOLE_SPAWN_INTERVAL_MS = 30000;
/** @const {number} Wormhole lifetime in ms. */
const WORMHOLE_LIFETIME_MS = 15000;
/** @const {number} Minimum Manhattan distance between wormhole entry and exit. */
const WORMHOLE_MIN_DISTANCE = 5;
/** @const {number} Minimum free tiles required to spawn wormholes. */
const WORMHOLE_MIN_FREE_TILES = 10;
/** @const {string} Game-over overlay color. */
const COLOR_OVERLAY = 'rgba(0, 0, 0, 0.7)';
/** @const {string} Overlay text color. */
const COLOR_OVERLAY_TEXT = '#fff';
/** @const {number} Speed boost divisor factor (1.35 = ~35% faster). */
const SPEED_BOOST_FACTOR = 1.35;
/** @const {number} Warning/grace period timeout in ms. */
const WARNING_TIMEOUT_MS = 700;
/** @const {number} Bonus food lifetime before auto-removal in ms. */
const BONUS_FOOD_LIFETIME_MS = 5000;
/** @const {number} Bonus food spawn interval in ms (timed mode). */
const BONUS_FOOD_SPAWN_INTERVAL_MS = 15000;
/** @const {number} Score bonus decay interval in ms. */
const SCORE_BONUS_DECAY_INTERVAL_MS = 200;

/**
 * Computes the grid direction from point a to point b.
 * If wrap is enabled and the distance exceeds 1 cell (e.g. snake wraps around),
 * the direction is flipped so it remains a cardinal direction.
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

/** @type {Object<string, string>} Maps direction offsets ("dx,dy") to cardinal names. */
const DIR_KEY = {
  '0,-1': 'Up',
  '0,1': 'Down',
  '-1,0': 'Left',
  '1,0': 'Right',
};

/** @type {Object<string, string>} Maps incoming→outgoing direction pairs to corner tile keys. */
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

/** @type {Palette} Normal playing-state colors. */
const PALETTE_NORMAL = { body: '#4a7a4a', head: '#8ad88a', eye: '#0d1a0d' };
/** @type {Palette} Warning/grace-period colors (red tint). */
const PALETTE_WARNING = { body: '#ff6666', head: '#ffaaaa', eye: '#4a0000' };
/** @type {Palette} Constrictor self-collision ("ignored") colors (magenta tint). */
const PALETTE_IGNORED = { body: '#c084fc', head: '#e2ccff', eye: '#4a0060' };
/** @type {Palette} Speed-boost colors (goldenrod head only, body stays normal). */
const PALETTE_BOOST = { body: '#4a7a4a', head: '#f0e68c', eye: '#0d1a0d' };

/** @type {Object<string, TileRenderer>} Tile shape drawing functions keyed by shape name. */
const TILE_RENDERERS = {
  headUp(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(0, 0, 26, 26);
    ctx.fillStyle = p.head;
    ctx.fillRect(1, 1, 24, 24);
    ctx.fillStyle = p.eye;
    ctx.fillRect(5, 2, 5, 4);
    ctx.fillRect(16, 2, 5, 4);
  },
  headDown(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(0, 0, 26, 26);
    ctx.fillStyle = p.head;
    ctx.fillRect(1, 1, 24, 24);
    ctx.fillStyle = p.eye;
    ctx.fillRect(5, 20, 5, 4);
    ctx.fillRect(16, 20, 5, 4);
  },
  headLeft(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(0, 0, 26, 26);
    ctx.fillStyle = p.head;
    ctx.fillRect(1, 1, 24, 24);
    ctx.fillStyle = p.eye;
    ctx.fillRect(2, 5, 4, 5);
    ctx.fillRect(2, 16, 4, 5);
  },
  headRight(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(0, 0, 26, 26);
    ctx.fillStyle = p.head;
    ctx.fillRect(1, 1, 24, 24);
    ctx.fillStyle = p.eye;
    ctx.fillRect(20, 5, 4, 5);
    ctx.fillRect(20, 16, 4, 5);
  },
  bodyHoriz(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(0, 0, 26, 26);
  },
  bodyVert(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(0, 0, 26, 26);
  },
  tailUp(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(0, 13, 26, 13);
    ctx.beginPath();
    ctx.arc(13, 13, 13, Math.PI, 2 * Math.PI);
    ctx.fill();
  },
  tailDown(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(0, 0, 26, 13);
    ctx.beginPath();
    ctx.arc(13, 13, 13, 0, Math.PI);
    ctx.fill();
  },
  tailLeft(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(13, 0, 13, 26);
    ctx.beginPath();
    ctx.arc(13, 13, 13, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.fill();
  },
  tailRight(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(0, 0, 13, 26);
    ctx.beginPath();
    ctx.arc(13, 13, 13, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
  },
  cornerRD(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(0, 0, 13, 13);
    ctx.fillRect(0, 13, 13, 13);
    ctx.fillRect(13, 13, 13, 13);
    ctx.beginPath();
    ctx.moveTo(13, 13);
    ctx.arc(13, 13, 13, (Math.PI * 3) / 2, 0);
    ctx.closePath();
    ctx.fill();
  },
  cornerLD(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(13, 0, 13, 13);
    ctx.fillRect(0, 13, 13, 13);
    ctx.fillRect(13, 13, 13, 13);
    ctx.beginPath();
    ctx.moveTo(13, 13);
    ctx.arc(13, 13, 13, Math.PI, (Math.PI * 3) / 2);
    ctx.closePath();
    ctx.fill();
  },
  cornerRU(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(0, 0, 13, 13);
    ctx.fillRect(13, 0, 13, 13);
    ctx.fillRect(0, 13, 13, 13);
    ctx.beginPath();
    ctx.moveTo(13, 13);
    ctx.arc(13, 13, 13, 0, Math.PI / 2);
    ctx.closePath();
    ctx.fill();
  },
  cornerLU(ctx, p) {
    ctx.fillStyle = p.body;
    ctx.fillRect(0, 0, 13, 13);
    ctx.fillRect(13, 0, 13, 13);
    ctx.fillRect(13, 13, 13, 13);
    ctx.beginPath();
    ctx.moveTo(13, 13);
    ctx.arc(13, 13, 13, Math.PI / 2, Math.PI);
    ctx.closePath();
    ctx.fill();
  },
};

/**
 * Manages named timers (intervals and timeouts) with clear-by-name semantics.
 * @classdesc Prevents duplicate timers and provides bulk clear operations.
 */
class TimerManager {
  constructor() {
    /** @private */ this._timers = {};
  }

  /**
   * Clears an existing timer of the given name if one exists.
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
 * Manages the static wall layout.
 * @classdesc Handles wall rendering, collision checks, and wall-set queries.
 */
class WallsManager {
  /**
   * @param {SnakeGame} game The owning game instance.
   */
  constructor(game) {
    this.game = game;
    this._wallSet = new Set(WALLS.map((w) => `${w.x},${w.y}`));
  }

  /** @returns {boolean} Whether walls are enabled. */
  get enabled() {
    return this.game.options.enableWalls;
  }

  /**
   * Checks whether a grid cell contains a wall.
   * @param {number} x Grid column.
   * @param {number} y Grid row.
   * @returns {boolean}
   */
  isWallAt(x, y) {
    return this.enabled && this._wallSet.has(`${x},${y}`);
  }

  /**
   * Returns the set of wall cell keys (or empty set if disabled).
   * @returns {Set<string>}
   */
  getWallSet() {
    return this.enabled ? this._wallSet : new Set();
  }

  /** @returns {number} Number of wall cells (44). */
  get count() {
    return WALLS.length;
  }

  /**
   * Draws all walls onto the canvas with a 3D beveled appearance.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cellSize Pixel size of each grid cell.
   */
  draw(ctx, cellSize) {
    if (!this.enabled) return;
    WALLS.forEach((w) => {
      ctx.fillStyle = COLOR_WALL_BODY;
      ctx.fillRect(w.x * cellSize, w.y * cellSize, cellSize, cellSize);
      ctx.fillStyle = COLOR_WALL_EDGE_LIGHT;
      ctx.fillRect(w.x * cellSize, w.y * cellSize, cellSize - 1, 1);
      ctx.fillRect(w.x * cellSize, w.y * cellSize, 1, cellSize - 1);
      ctx.fillStyle = COLOR_WALL_EDGE_DARK;
      ctx.fillRect((w.x + 1) * cellSize - 1, w.y * cellSize, 1, cellSize);
      ctx.fillRect(w.x * cellSize, (w.y + 1) * cellSize - 1, cellSize, 1);
    });
  }
}

/**
 * Manages boundary behavior (wrap vs. solid walls).
 * @classdesc Handles coordinate wrapping, bounds checking, and wrap-aware
 * direction computation.
 */
class BoundaryManager {
  /**
   * @param {SnakeGame} game The owning game instance.
   */
  constructor(game) {
    this.game = game;
  }

  /** @returns {boolean} Whether wrap-around boundaries are enabled. */
  get enabled() {
    return this.game.options.enableWrap;
  }

  /**
   * Wraps a position around the grid when wrap mode is enabled.
   * @param {Point} pos Grid position to wrap.
   * @returns {Point} The (possibly wrapped) position.
   */
  wrap(pos) {
    if (!this.enabled) return pos;
    pos.x = (pos.x + this.game.COLS) % this.game.COLS;
    pos.y = (pos.y + this.game.ROWS) % this.game.ROWS;
    return pos;
  }

  /**
   * Checks whether a cell is within the grid boundaries.
   * @param {number} x Grid column.
   * @param {number} y Grid row.
   * @returns {boolean}
   */
  isInBounds(x, y) {
    return x >= 0 && x < this.game.COLS && y >= 0 && y < this.game.ROWS;
  }

  /**
   * Computes the wrap-aware direction between two grid positions.
   * @param {Point} a Starting point.
   * @param {Point} b Target point.
   * @returns {Point} Cardinal direction vector.
   */
  dirBetween(a, b) {
    return dirBetween(a, b, this.enabled);
  }
}

/**
 * Manages wormhole entry/exit teleport pairs.
 * @classdesc Handles wormhole spawning, lifetime timers, teleportation, and
 * rendering. Entry cells are dark green, exit cells are off-white.
 */
class WormholesManager {
  /**
   * @param {SnakeGame} game The owning game instance.
   */
  constructor(game) {
    this.game = game;
    /** @type {Point|null} Wormhole entry cell. */
    this.entry = null;
    /** @type {Point|null} Wormhole exit cell. */
    this.exit = null;
  }

  /** @returns {boolean} Whether wormholes are enabled. */
  get enabled() {
    return this.game.options.enableWormholes;
  }

  /**
   * Attempts to spawn a wormhole pair at random valid positions.
   * Entry and exit are placed at least WORMHOLE_MIN_DISTANCE apart (Manhattan).
   * Won't spawn if fewer than WORMHOLE_MIN_FREE_TILES free tiles remain.
   */
  trySpawn() {
    if (!this.enabled) return;
    if (this.game.freeTiles - this.game.snake.length <= WORMHOLE_MIN_FREE_TILES) return;
    let entry, exit;
    do {
      entry = { x: Math.floor(Math.random() * this.game.COLS), y: Math.floor(Math.random() * this.game.ROWS) };
    } while (
      this.game.snake.some((s) => s.x === entry.x && s.y === entry.y) ||
      (this.game.food && this.game.food.x === entry.x && this.game.food.y === entry.y) ||
      this.game.bonusFood.isAt(entry.x, entry.y) ||
      this.game.walls.isWallAt(entry.x, entry.y)
    );
    do {
      exit = { x: Math.floor(Math.random() * this.game.COLS), y: Math.floor(Math.random() * this.game.ROWS) };
    } while (
      (exit.x === entry.x && exit.y === entry.y) ||
      this.game.snake.some((s) => s.x === exit.x && s.y === exit.y) ||
      (this.game.food && this.game.food.x === exit.x && this.game.food.y === exit.y) ||
      this.game.bonusFood.isAt(exit.x, exit.y) ||
      this.game.walls.isWallAt(exit.x, exit.y) ||
      Math.abs(exit.x - entry.x) + Math.abs(exit.y - entry.y) < WORMHOLE_MIN_DISTANCE
    );
    this.entry = entry;
    this.exit = exit;
    this.game.timers.setTimeout(
      'wormholeLifetime',
      () => {
        this.entry = null;
        this.exit = null;
        this.game._draw();
      },
      WORMHOLE_LIFETIME_MS
    );
  }

  /**
   * If the head is on the wormhole entry, teleports it to the exit and
   * consumes both wormholes.
   * @param {Point} head The snake's head position.
   * @returns {boolean} Whether a teleport occurred.
   */
  tryTeleport(head) {
    if (!this.enabled || !this.entry) return false;
    if (head.x === this.entry.x && head.y === this.entry.y) {
      head.x = this.exit.x;
      head.y = this.exit.y;
      this.game.boundary.wrap(head);
      this.game.timers.clear('wormholeLifetime');
      this.entry = null;
      this.exit = null;
      return true;
    }
    return false;
  }

  /**
   * Draws the wormhole entry (dark green) and exit (off-white) cells.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cellSize Pixel size of each grid cell.
   */
  draw(ctx, cellSize) {
    if (!this.enabled || !this.entry) return;
    ctx.fillStyle = COLOR_WORMHOLE_ENTRY;
    ctx.fillRect(this.entry.x * cellSize + 1, this.entry.y * cellSize + 1, cellSize - 2, cellSize - 2);
    ctx.fillStyle = COLOR_WORMHOLE_EXIT;
    ctx.fillRect(this.exit.x * cellSize + 1, this.exit.y * cellSize + 1, cellSize - 2, cellSize - 2);
  }

  /** Starts the periodic wormhole spawn interval (every 30s). */
  startTimers() {
    if (!this.enabled) return;
    this.game.timers.setInterval(
      'wormholeTimer',
      () => {
        if (!this.entry) {
          this.trySpawn();
          this.game._draw();
        }
      },
      WORMHOLE_SPAWN_INTERVAL_MS
    );
  }
}

/**
 * Manages bonus food spawning, movement, collision, eating, and rendering.
 * @classdesc Handles the golden diamond bonus food that appears on a timer,
 * moves randomly, and can be eaten by the snake head (classic/time-trial) or
 * by enclosure (constrictor).
 */
class BonusFoodManager {
  /**
   * @param {SnakeGame} game The owning game instance.
   */
  constructor(game) {
    this.game = game;
    /** @type {Point|null} Current bonus food position. */
    this.pos = null;
  }

  /** @returns {boolean} Whether bonus food is enabled. */
  get enabled() {
    return this.game.options.enableBonusFood;
  }
  /** @returns {boolean} Whether timed spawn (every 15s) is enabled. */
  get timed() {
    return this.game.options.enableTimedBonusFood;
  }
  /** @returns {boolean} Whether eating bonus food shrinks the snake. */
  get canShrink() {
    return this.game.options.enableShrinkOnBonusFood;
  }
  /** @returns {boolean} Whether bonus food is currently on the board. */
  get active() {
    return this.pos !== null;
  }

  /**
   * Checks whether a cell matches the bonus food position.
   * @param {number} x Grid column.
   * @param {number} y Grid row.
   * @returns {boolean}
   */
  isAt(x, y) {
    return this.pos !== null && this.pos.x === x && this.pos.y === y;
  }

  /**
   * Places bonus food at a random valid position and starts its movement and
   * lifetime timers.
   */
  place() {
    if (!this.enabled) return;
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * this.game.COLS), y: Math.floor(Math.random() * this.game.ROWS) };
    } while (
      this.game.snake.some((s) => s.x === pos.x && s.y === pos.y) ||
      (this.game.food && this.game.food.x === pos.x && this.game.food.y === pos.y) ||
      this.game.walls.isWallAt(pos.x, pos.y)
    );
    this.pos = pos;
    this.game.timers.setInterval('bonusFoodInterval', () => this._move(), this.game.currentSpeed + 60);
    this.game.timers.setTimeout(
      'bonusFoodTimeout',
      () => {
        this.game.timers.clear('bonusFoodInterval');
        this.pos = null;
      },
      BONUS_FOOD_LIFETIME_MS
    );
  }

  /**
   * Moves bonus food one step in a random cardinal direction.
   * Respects wrap boundaries and wall obstacles.
   * In constrictor mode, checks if the new position is enclosed and eats it.
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
      !this.game.snake.some((s) => s.x === next.x && s.y === next.y) && !this.game.walls.isWallAt(next.x, next.y);
    if (this.game.boundary.enabled) {
      this.game.boundary.wrap(next);
      if (obstacleFree()) {
        this.pos = next;
      }
    } else {
      if (this.game.boundary.isInBounds(next.x, next.y) && obstacleFree()) {
        this.pos = next;
      }
    }
    if (this.game.options.mode === MODE_CONSTRICTOR && this.pos && this.game._isFoodEnclosed(this.pos)) {
      this.game._eatBonusFood();
    }
  }

  /**
   * Checks whether the snake head is on the bonus food.
   * @param {Point} head The snake's head position.
   * @returns {boolean}
   */
  isHeadCollision(head) {
    return this.enabled && this.active && head.x === this.pos.x && head.y === this.pos.y;
  }

  /**
   * Checks whether the bonus food is enclosed by the snake.
   * @returns {boolean}
   */
  isEnclosed() {
    return this.enabled && this.active && this.game._isFoodEnclosed(this.pos);
  }

  /**
   * Handles bonus food consumption. Shrinks the snake if enabled, clears bonus
   * food timers, and removes the bonus food from the board.
   * @returns {number} Points awarded (100).
   */
  onEat() {
    if (this.canShrink) {
      const shrunkLen = Math.ceil(this.game.snake.length / 2);
      if (this.game.options.mode !== MODE_CONSTRICTOR || shrunkLen >= 15) {
        this.game.snake.splice(shrunkLen);
      }
    }
    this.game.timers.clear('bonusFoodInterval');
    this.game.timers.clear('bonusFoodTimeout');
    this.pos = null;
    return 100;
  }

  /**
   * Draws the bonus food as a golden diamond shape.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cellSize Pixel size of each grid cell.
   */
  draw(ctx, cellSize) {
    if (!this.enabled || !this.pos) return;
    const cx = this.pos.x * cellSize + cellSize / 2;
    const cy = this.pos.y * cellSize + cellSize / 2;
    const r = 8;
    ctx.fillStyle = COLOR_FOOD_BONUS;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Spawns bonus food on every 5th food eaten (non-timed mode).
   * @param {number} foodsEaten Total regular foods eaten.
   */
  trySpawnOnCount(foodsEaten) {
    if (!this.enabled || this.timed) return;
    if (foodsEaten % 5 === 0 && !this.active) {
      this.place();
    }
  }

  /** Starts the timed bonus-food spawn interval (every 15s). */
  startTimers() {
    if (!this.enabled || !this.timed) return;
    this.game.timers.setInterval(
      'bonusFoodTimer',
      () => {
        if (!this.active) this.place();
      },
      BONUS_FOOD_SPAWN_INTERVAL_MS
    );
  }

  /** Resumes movement and lifetime timers for an active bonus food after unpause. */
  resumeMovementTimers() {
    if (!this.enabled || !this.active) return;
    this.game.timers.setInterval('bonusFoodInterval', () => this._move(), this.game.currentSpeed + 60);
    this.game.timers.setTimeout(
      'bonusFoodTimeout',
      () => {
        this.game.timers.clear('bonusFoodInterval');
        this.pos = null;
      },
      BONUS_FOOD_LIFETIME_MS
    );
  }

  /** Clears only the bonus food movement interval. */
  clearMovementInterval() {
    this.game.timers.clear('bonusFoodInterval');
  }

  /** Clears both the bonus food movement interval and lifetime timeout. */
  clearMovementTimers() {
    this.game.timers.clear('bonusFoodInterval');
    this.game.timers.clear('bonusFoodTimeout');
  }

  /** Clears all bonus-food-related timers (spawn + movement + lifetime). */
  clearAllTimers() {
    this.game.timers.clear('bonusFoodTimer');
    this.clearMovementTimers();
  }
}

/**
 * Manages the decaying bonus score multiplier displayed as "Bonus: N" in the HUD.
 * @classdesc Starts at 100, decays by 1 every 200ms to 0. Resets to 100
 * after each regular food is eaten. The current bonus value is added to the
 * score when food is eaten.
 */
class ScoreBonusManager {
  /**
   * @param {SnakeGame} game The owning game instance.
   */
  constructor(game) {
    this.game = game;
    /** @type {number} Current bonus value (0-100). */
    this.value = 100;
  }

  /** @returns {boolean} Whether the score bonus feature is enabled. */
  get enabled() {
    return this.game.options.enableScoreBonus;
  }

  /**
   * Generates the HUD HTML fragment for the bonus display.
   * @returns {string} HTML string, empty if disabled.
   */
  getHUDHtml() {
    return this.enabled ? '<span class="snake-bonus">Bonus: 0</span>' : '';
  }

  /**
   * Called when regular food is eaten. Applies the current bonus to the score,
   * resets the bonus value, and restarts the decay timer.
   * @returns {number} Bonus points to add.
   */
  onFoodEaten() {
    if (!this.enabled) return 0;
    const bonus = this.value > 0 ? this.value : 0;
    this.value = 100;
    if (this.game.bonusElement) {
      this.game.bonusElement.textContent = `Bonus: ${this.value}`;
    }
    this.startDecay();
    return bonus;
  }

  /** Starts the bonus decay interval (decrements by 1 every 200ms). */
  startDecay() {
    if (!this.enabled) return;
    this.game.timers.setInterval(
      'scoreBonusInterval',
      () => {
        this.value = Math.max(0, this.value - 1);
        this.game.bonusElement.textContent = `Bonus: ${this.value}`;
        if (this.value === 0) this.game.timers.clear('scoreBonusInterval');
      },
      SCORE_BONUS_DECAY_INTERVAL_MS
    );
  }

  /** Clears the score bonus decay interval. */
  clearTimers() {
    this.game.timers.clear('scoreBonusInterval');
  }

  /** Restarts the decay interval after unpause, if the bonus value is still > 0. */
  resumeDecay() {
    if (this.enabled && this.value > 0) this.startDecay();
  }
}

/**
 * Manages game-speed acceleration when food is eaten.
 * @classdesc Each regular food eaten reduces the tick interval by a minor
 * amount, making the snake move faster. Does nothing when enableSpeedUp is off.
 */
class SpeedManager {
  /**
   * @param {SnakeGame} game The owning game instance.
   */
  constructor(game) {
    this.game = game;
  }

  /** @returns {boolean} Whether speed-up is enabled. */
  get enabled() {
    return this.game.options.enableSpeedUp;
  }

  /**
   * Called after eating regular food. Recalculates `currentSpeed` and
   * restarts the game loop with the new interval.
   */
  onFoodEaten() {
    if (!this.enabled) return;
    const baseTickRate = 1000 / this.game.BASE_SPEED;
    const tickRate = baseTickRate + this.game.RATE_STEP * this.game.foodsEaten;
    this.game.currentSpeed = Math.max(this.game.MIN_SPEED, 1000 / tickRate);
    this.restartGameLoop();
  }

  /** Clears the current game loop and schedules the next tick. */
  restartGameLoop() {
    this.game.timers.clear('gameLoop');
    this.game._scheduleNextTick();
  }
}

/**
 * Manages direction input buffering, speed boost, and instant movement.
 * @classdesc Provides input queueing (up to 2 buffered directions), same-key
 * speed boost activation, and instant-move-on-keypress behavior.
 */
class InputManager {
  /**
   * @param {SnakeGame} game The owning game instance.
   */
  constructor(game) {
    this.game = game;
    /** @type {Point[]} Buffered direction inputs (max 2). */
    this.buffer = [];
    /** @type {boolean} Whether speed boost is currently active. */
    this.speedBoostActive = false;
  }

  /** @returns {boolean} Whether input buffering is enabled. */
  get enableBuffer() {
    return this.game.options.enableInputBuffer;
  }
  /** @returns {boolean} Whether speed boost is enabled. */
  get enableBoost() {
    return this.game.options.enableSpeedBoost;
  }
  /** @returns {boolean} Whether instant movement is enabled. */
  get enableInstant() {
    return this.game.options.enableInstantMovement;
  }

  /**
   * Commits the oldest valid buffered direction as the current direction.
   * Skips opposite and duplicate directions. Deactivates boost on direction change.
   */
  commitDirection() {
    if (this.enableBuffer) {
      const prevDir = { x: this.game.direction.x, y: this.game.direction.y };
      let effectiveDir =
        this.game.graceDirection.x !== 0 || this.game.graceDirection.y !== 0
          ? { x: this.game.graceDirection.x, y: this.game.graceDirection.y }
          : { x: this.game.direction.x, y: this.game.direction.y };

      while (this.buffer.length > 0) {
        const next = this.buffer[0];
        const isOpposite = next.x === -effectiveDir.x && next.y === -effectiveDir.y;
        const isSame = next.x === effectiveDir.x && next.y === effectiveDir.y;
        if (isOpposite || isSame) {
          this.buffer.shift();
          continue;
        }
        if (this.game.collision.isDirSafe(next)) {
          this.buffer.shift();
          effectiveDir = next;
          break;
        }
        break;
      }

      this.game.direction = effectiveDir;
      if (prevDir.x !== this.game.direction.x || prevDir.y !== this.game.direction.y) {
        this._deactivateBoost();
      }
      if (this.game.graceDirection.x !== 0 || this.game.graceDirection.y !== 0) {
        this.game.graceDirection = { x: 0, y: 0 };
      }
    } else {
      this.game.direction = this.game.nextDirection;
    }
  }

  /**
   * Handles a direction input while in the PLAYING state.
   * Buffers the input, activates/deactivates speed boost, and triggers
   * instant movement if enabled.
   * @param {Point} dir The direction from the arrow key.
   * @returns {boolean} Whether the input was accepted (led to a move or boost).
   */
  handlePlayingInput(dir) {
    if (this.enableBuffer) {
      const ref = this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : this.game.direction;
      const isOpposite = dir.x === -ref.x && dir.y === -ref.y;
      const isDuplicate = dir.x === ref.x && dir.y === ref.y;
      if (!isOpposite && !isDuplicate && this.buffer.length < 2) {
        this.buffer.push(dir);
      }
    }
    let accepted = false;
    if (dir.x === this.game.direction.x && dir.y === this.game.direction.y) {
      const wasActive = this.speedBoostActive;
      this._activateBoost();
      accepted = this.enableBoost && !wasActive;
    } else if (dir.x !== -this.game.direction.x || dir.y !== -this.game.direction.y) {
      if (!this.enableBuffer) {
        this.game.nextDirection = dir;
      }
      this._deactivateBoost();
      accepted = true;
    } else {
      this._deactivateBoost();
    }

    if (this.enableInstant && accepted && this.game.state === STATE.PLAYING) {
      this.game._update();
      if (this.game.state === STATE.PLAYING) {
        this.game._scheduleNextTick();
      }
    }
    return accepted;
  }

  /**
   * Activates the speed boost state.
   * @private
   */
  _activateBoost() {
    if (!this.enableBoost || this.speedBoostActive) return;
    this.speedBoostActive = true;
  }

  /**
   * Deactivates the speed boost state.
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
 * @classdesc Checks wall, boundary, and self-collisions and routes them
 * through the grace period, constrictor ignored state, or game over logic.
 */
class CollisionResolver {
  /**
   * @param {SnakeGame} game The owning game instance.
   */
  constructor(game) {
    this.game = game;
  }

  /** @returns {boolean} Whether the grace period is enabled. */
  get graceEnabled() {
    return this.game.options.enableGracePeriod;
  }

  /**
   * Checks all collision types at a position.
   * @param {Point} pos The position to check.
   * @returns {CollisionResult}
   */
  getCollision(pos) {
    return {
      wall: this.game.walls.isWallAt(pos.x, pos.y),
      boundary: pos.x < 0 || pos.x >= this.game.COLS || pos.y < 0 || pos.y >= this.game.ROWS,
      self: this.game.snake.some((s) => s.x === pos.x && s.y === pos.y),
    };
  }

  /**
   * Checks whether the snake has any safe move from its current head position.
   * @returns {boolean}
   */
  hasAnySafeMove() {
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    for (const dir of dirs) {
      const pos = this.game.boundary.wrap({ x: this.game.snake[0].x + dir.x, y: this.game.snake[0].y + dir.y });
      const c = this.getCollision(pos);
      if (!c.wall && !c.boundary && !c.self) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks whether moving in a given direction from the head is safe.
   * @param {Point} dir Direction vector.
   * @returns {boolean} True if no wall, boundary, or self collision.
   */
  isDirSafe(dir) {
    const pos = this.game.boundary.wrap({ x: this.game.snake[0].x + dir.x, y: this.game.snake[0].y + dir.y });
    const c = this.getCollision(pos);
    return !c.wall && !c.boundary && !c.self;
  }

  /**
   * Resolves collision for the next head position. Routes to warning (grace
   * period), ignored (constrictor self-collision), or immediate game over.
   * @param {Point} nextHead The next head position to check.
   * @returns {boolean} True if a collision was detected and handled.
   */
  resolve(nextHead) {
    const { wall, boundary, self } = this.getCollision(nextHead);
    if (wall || boundary || self) {
      if (this.game.options.mode === MODE_CONSTRICTOR && self) {
        if (this.hasAnySafeMove()) {
          this.game._enterIgnored();
        } else {
          this.game._gameOver();
        }
        return true;
      }
      if (this.graceEnabled) {
        this.game._enterWarning();
      } else {
        this.game._gameOver();
      }
      return true;
    }
    return false;
  }
}

/**
 * Core Snake game engine.
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
   * @param {Object} [options={}] Feature toggles and mode selector.
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
   */
  constructor(container, options = {}) {
    this.container = container;
    /** @type {Object} Resolved options with defaults applied. */
    this.options = {
      mode: options.mode || MODE_CLASSIC,
      enableBonusFood: options.enableBonusFood !== undefined ? options.enableBonusFood : true,
      enableGracePeriod: options.enableGracePeriod !== undefined ? options.enableGracePeriod : true,
      enableShrinkOnBonusFood: options.enableShrinkOnBonusFood !== undefined ? options.enableShrinkOnBonusFood : true,
      enableSpeedUp: options.enableSpeedUp !== undefined ? options.enableSpeedUp : true,
      enableScoreBonus: options.enableScoreBonus !== undefined ? options.enableScoreBonus : true,
      enableWrap: options.enableWrap !== undefined ? options.enableWrap : true,
      enableSpeedBoost: options.enableSpeedBoost !== undefined ? options.enableSpeedBoost : true,
      enableInputBuffer: options.enableInputBuffer !== undefined ? options.enableInputBuffer : true,
      enableInstantMovement: options.enableInstantMovement !== undefined ? options.enableInstantMovement : true,
      enableTimedBonusFood: options.enableTimedBonusFood !== undefined ? options.enableTimedBonusFood : true,
      enableWalls: options.enableWalls !== undefined ? options.enableWalls : true,
      enableWormholes: options.enableWormholes !== undefined ? options.enableWormholes : true,
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
    this.TIME_LIMIT = 120000;

    /** @type {WallsManager} */
    this.walls = new WallsManager(this);
    /** @type {BoundaryManager} */
    this.boundary = new BoundaryManager(this);
    /** @type {WormholesManager} */
    this.wormholes = new WormholesManager(this);
    /** @type {BonusFoodManager} */
    this.bonusFood = new BonusFoodManager(this);
    /** @type {ScoreBonusManager} */
    this.scoreBonus = new ScoreBonusManager(this);
    /** @type {InputManager} */
    this.input = new InputManager(this);
    /** @type {SpeedManager} */
    this.speed = new SpeedManager(this);
    /** @type {CollisionResolver} */
    this.collision = new CollisionResolver(this);

    this._buildDOM();
    this._bindEvents();
    this.init();
  }

  /**
   * Builds the DOM structure inside the container element.
   * Creates HUD (score, bonus, timer), canvas wrapper, and message elements.
   * @private
   */
  _buildDOM() {
    this.container.innerHTML = `
      <div class="snake-container">
        <div class="snake-hud">
          <span class="snake-score">Score: 0</span>
          ${this.scoreBonus.getHUDHtml()}
          <span class="snake-timer">Time: 0:00</span>
        </div>
        <div class="snake-game-wrapper"><canvas class="snake-canvas" width="500" height="500" tabindex="0"></canvas><div class="snake-focus-overlay">Click to focus</div></div>
        <div class="snake-message">Press any arrow key to start</div>
      </div>
    `;

    this.canvas = this.container.querySelector('.snake-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.scoreElement = this.container.querySelector('.snake-score');
    this.timerElement = this.container.querySelector('.snake-timer');
    this.bonusElement = this.container.querySelector('.snake-bonus');
    this.messageElement = this.container.querySelector('.snake-message');
    this.overlay = this.container.querySelector('.snake-focus-overlay');
    this.CELL_SIZE = this.canvas.width / this.COLS;
    this._createTiles();
  }

  /**
   * Binds canvas keydown, focus, and blur event listeners.
   * @private
   */
  _bindEvents() {
    this._onKeydown = this._handleKeydown.bind(this);
    this._onFocus = () => {
      this.overlay.classList.add('snake-hidden');
      this._resumeGame();
    };
    this._onBlur = () => {
      this.overlay.classList.remove('snake-hidden');
      this._pauseGame();
    };
    this._onClick = () => this.canvas.focus();

    this.canvas.addEventListener('keydown', this._onKeydown);
    this.canvas.addEventListener('focus', this._onFocus);
    this.canvas.addEventListener('blur', this._onBlur);
    this.overlay.addEventListener('click', this._onClick);
  }

  /**
   * Removes event listeners and clears all timers. Call before re-mounting.
   */
  destroy() {
    this.canvas.removeEventListener('keydown', this._onKeydown);
    this.canvas.removeEventListener('focus', this._onFocus);
    this.canvas.removeEventListener('blur', this._onBlur);
    this.overlay.removeEventListener('click', this._onClick);
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
    /** @type {Point[]} Snake body segments (head is index 0). */
    this.snake = [{ x: 10, y: 10 }];
    /** @type {Point} Current movement direction. */
    this.direction = { x: 0, y: 0 };
    /** @type {Point} Next direction to apply (non-buffered mode). */
    this.nextDirection = { x: 0, y: 0 };
    /** @type {number} Current score. */
    this.score = 0;
    this.elapsed = 0;
    this._transitionTo(STATE.WAITING);
    this.currentSpeed = this.BASE_SPEED;
    this.foodsEaten = 0;
    this.scoreBonus.value = 100;
    this.wasPaused = false;
    this.input.speedBoostActive = false;
    this.input.buffer = [];
    this.graceDirection = { x: 0, y: 0 };
    this.growth = 0;
    this.startGrowth = 0;
    this.warningElapsed = 0;
    this.wormholes.entry = null;
    this.wormholes.exit = null;
    this.timers = new TimerManager();
    this.freeTiles = this.COLS * this.ROWS;
    if (this.walls.enabled) {
      this.freeTiles -= this.walls.count;
    }
    this.scoreElement.textContent = 'Score: 0';
    this.timerElement.textContent = this.options.mode === MODE_TIME_TRIAL ? 'Time: 2:00' : 'Time: 0:00';
    if (this.bonusElement) {
      this.bonusElement.textContent = 'Bonus: 100';
    }
    this.messageElement.textContent = 'Press any arrow key to start';
    this.overlay.textContent = 'Click to focus';
    this._placeFood();
    this._draw();
  }

  /**
   * Places regular food at a random valid position (not on snake, wall, or
   * enclosed region in constrictor mode).
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
      this.snake.some((s) => s.x === pos.x && s.y === pos.y) ||
      this.walls.isWallAt(pos.x, pos.y) ||
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
   * @private
   * @returns {Point|null} A free cell, or null if the board is full.
   */
  _findAnyFreeTile() {
    for (let y = 0; y < this.ROWS; y++) {
      for (let x = 0; x < this.COLS; x++) {
        if (!this.snake.some((s) => s.x === x && s.y === y) && !this.walls.isWallAt(x, y)) {
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
   * @private
   * @param {Point} pos The position to check.
   * @returns {boolean} True if the position is enclosed.
   */
  _isFoodEnclosed(pos) {
    const key = (x, y) => `${x},${y}`;
    const snakeSet = new Set(this.snake.map((s) => key(s.x, s.y)));
    const wallSet = this.walls.getWallSet();
    const isBlocked = (x, y) => snakeSet.has(key(x, y)) || wallSet.has(key(x, y));
    const wrap = this.boundary.enabled;

    const floodSize = (sx, sy, visited) => {
      let size = 0;
      const q = [{ x: sx, y: sy }];
      visited.add(key(sx, sy));
      while (q.length) {
        const { x, y } = q.shift();
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
   * @private
   */
  _eatRegularFood() {
    const points = 10 + this.scoreBonus.onFoodEaten();
    this.score += points;
    this.scoreElement.textContent = `Score: ${this.score}`;
    this.foodsEaten++;
    this.growth = 1;
    if (this.snake.length >= this.freeTiles) {
      this._gameOver();
      return;
    }
    this.bonusFood.trySpawnOnCount(this.foodsEaten);
    this._placeFood();
    this.speed.onFoodEaten();
  }

  /**
   * Consumes the bonus food. Awards points, handles shrink, and clears
   * the bonus food from the board.
   * @private
   */
  _eatBonusFood() {
    this.score += this.bonusFood.onEat();
    this.scoreElement.textContent = `Score: ${this.score}`;
  }

  /**
   * Updates the HUD timer display. In time-trial mode, checks for time expiry.
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
   * @private
   */
  _draw() {
    this.ctx.fillStyle = COLOR_BG;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.walls.draw(this.ctx, this.CELL_SIZE);
    this.wormholes.draw(this.ctx, this.CELL_SIZE);

    this.snake.forEach((seg, i) => {
      let key = this._getSegmentTileKey(i);
      if (i === 0 && this.input.speedBoostActive) {
        key += '_b';
      } else if (this.state === STATE.IGNORED) {
        key += '_i';
      } else if (this.state === STATE.WARNING) {
        key += '_w';
      }
      this.ctx.drawImage(
        this.tiles[key],
        seg.x * this.CELL_SIZE,
        seg.y * this.CELL_SIZE,
        this.CELL_SIZE,
        this.CELL_SIZE
      );
    });

    this.ctx.fillStyle = COLOR_FOOD;
    this.ctx.fillRect(
      this.food.x * this.CELL_SIZE + 1,
      this.food.y * this.CELL_SIZE + 1,
      this.CELL_SIZE - 2,
      this.CELL_SIZE - 2
    );

    this.bonusFood.draw(this.ctx, this.CELL_SIZE);

    if (this.state === STATE.OVER) {
      this.ctx.fillStyle = COLOR_OVERLAY;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = COLOR_OVERLAY_TEXT;
      this.ctx.font = 'bold 32px Courier New';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 20);
      this.ctx.font = '24px Courier New';
      this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
    }
  }

  /**
   * Creates all pre-rendered off-screen canvas tiles (46 total: 3 full
   * palette sets × 14 shapes + 4 boost head tiles).
   * @private
   */
  _createTiles() {
    const sets = [
      { palette: PALETTE_NORMAL, suffix: '' },
      { palette: PALETTE_WARNING, suffix: '_w' },
      { palette: PALETTE_IGNORED, suffix: '_i' },
    ];

    this.tiles = {};

    for (const { palette, suffix } of sets) {
      Object.assign(this.tiles, this._createTileSet(palette, suffix));
    }

    const boostHeadKeys = ['headUp', 'headDown', 'headLeft', 'headRight'];
    for (const key of boostHeadKeys) {
      this.tiles[`${key}_b`] = this._makeTile(key, PALETTE_BOOST);
    }
  }

  /**
   * Creates a set of tiles for a given palette and suffix.
   * @private
   * @param {Palette} palette The palette to render with.
   * @param {string} suffix Key suffix (e.g. '', '_w', '_i').
   * @returns {Object<string, HTMLCanvasElement>}
   */
  _createTileSet(palette, suffix) {
    const set = {};
    for (const key of Object.keys(TILE_RENDERERS)) {
      set[key + suffix] = this._makeTile(key, palette);
    }
    return set;
  }

  /**
   * Creates a single off-screen canvas tile and draws the given renderer on it.
   * @private
   * @param {string} key Tile shape key (e.g. 'headUp', 'bodyHoriz').
   * @param {Palette} palette The palette to render with.
   * @returns {HTMLCanvasElement}
   */
  _makeTile(key, palette) {
    const canvas = document.createElement('canvas');
    canvas.width = this.CELL_SIZE + 1;
    canvas.height = this.CELL_SIZE + 1;
    const ctx = canvas.getContext('2d');
    TILE_RENDERERS[key](ctx, palette);
    return canvas;
  }

  /**
   * Determines which tile shape key to use for the segment at index i.
   * Returns keys like 'headUp', 'bodyHoriz', 'tailDown', 'cornerRD', etc.
   * @private
   * @param {number} i Segment index in the snake array.
   * @returns {string} Tile key (without palette suffix).
   */
  _getSegmentTileKey(i) {
    if (i === 0) {
      const d = this.direction.x === 0 && this.direction.y === 0 ? { x: 1, y: 0 } : this.direction;
      return `head${DIR_KEY[`${d.x},${d.y}`]}`;
    }

    const prev = this.snake[i - 1];
    const curr = this.snake[i];
    const dirIn = this.boundary.dirBetween(prev, curr);

    if (i === this.snake.length - 1) {
      const key = DIR_KEY[`${dirIn.x},${dirIn.y}`];
      if (key) return `tail${key}`;
      return Math.abs(dirIn.x) >= Math.abs(dirIn.y) ? 'bodyHoriz' : 'bodyVert';
    }

    const next = this.snake[i + 1];
    const dirOut = this.boundary.dirBetween(curr, next);

    const inCardinal = DIR_KEY[`${dirIn.x},${dirIn.y}`] !== undefined;
    const outCardinal = DIR_KEY[`${dirOut.x},${dirOut.y}`] !== undefined;

    if (!inCardinal || !outCardinal) {
      return Math.abs(dirIn.x) >= Math.abs(dirIn.y) ? 'bodyHoriz' : 'bodyVert';
    }

    if (dirIn.x === dirOut.x && dirIn.y === dirOut.y) {
      return dirIn.x !== 0 ? 'bodyHoriz' : 'bodyVert';
    }

    const inName = DIR_KEY[`${dirIn.x},${dirIn.y}`];
    const outName = DIR_KEY[`${dirOut.x},${dirOut.y}`];
    return CORNER_MAP[`${inName}->${outName}`];
  }

  /**
   * Commits the next buffered direction as the current direction.
   * @private
   */
  _processInput() {
    this.input.commitDirection();
  }

  /**
   * Calculates the next head position, applies wrapping, and checks wormholes.
   * @private
   * @returns {Point} The resolved next head position.
   */
  _resolveNextHead() {
    const nextHead = { x: this.snake[0].x + this.direction.x, y: this.snake[0].y + this.direction.y };
    this.boundary.wrap(nextHead);
    this.wormholes.tryTeleport(nextHead);
    return nextHead;
  }

  /**
   * Resolves collision for the next head position.
   * @private
   * @param {Point} nextHead
   * @returns {boolean} True if a collision occurred (state was changed).
   */
  _processCollision(nextHead) {
    return this.collision.resolve(nextHead);
  }

  /**
   * Processes a single turn in constrictor mode: handles head-food poofing,
   * auto-growth, growth, enclosure-based eating of regular and bonus food.
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
    if (this.state === STATE.OVER) return;
    this._draw();
  }

  /**
   * Schedules the next game tick via a recursive setTimeout.
   * Adjusts the delay for speed boost if active.
   * @private
   */
  _scheduleNextTick() {
    const delay = this.input.speedBoostActive ? this.currentSpeed / SPEED_BOOST_FACTOR : this.currentSpeed;
    this.timers.setTimeout(
      'gameLoop',
      () => {
        this._update();
        if (this.state === STATE.PLAYING) {
          this._scheduleNextTick();
        }
      },
      delay
    );
  }

  /**
   * Transitions to a new game state. Logs a warning if the transition is
   * not in STATE_TRANSITIONS, but always applies the new state.
   * @private
   * @param {string} newState One of the STATE constants.
   */
  _transitionTo(newState) {
    if (this.state === newState) return;
    const valid = STATE_TRANSITIONS[this.state];
    if (valid && !valid.includes(newState)) {
      console.warn(`Invalid state transition: ${this.state} -> ${newState}`);
    }
    this.state = newState;
  }

  /**
   * Enters the warning (grace period) state. Clears the game loop, stores
   * the offending direction, and starts a 700ms countdown (shorter if
   * speed boost is active).
   * @private
   */
  _enterWarning() {
    this.timers.clear('gameLoop');
    this.bonusFood.clearMovementInterval();
    this._transitionTo(STATE.WARNING);
    this.warningStart = Date.now();
    this.warningElapsed = 0;
    this.messageElement.textContent = '';
    this.graceDirection = { x: this.direction.x, y: this.direction.y };
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
   * @private
   */
  _enterIgnored() {
    this.timers.clear('gameLoop');
    this.bonusFood.clearAllTimers();
    this.scoreBonus.clearTimers();
    this.input.resetBoost();
    this._transitionTo(STATE.IGNORED);
    this.input.clearBuffer();
    this.messageElement.textContent = 'Snake stuck \u2014 press a safe direction';
    this._draw();
  }

  /**
   * Starts the game from the WAITING state. Transitions to PLAYING, records
   * the start time, starts the game loop and all periodic timers.
   * In constrictor mode, sets auto-growth (14 ticks).
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
    this.speed.restartGameLoop();
    this.timers.setInterval('timerInterval', () => this._updateTimerDisplay(), 1000);
    this.scoreBonus.resumeDecay();
    this.bonusFood.startTimers();
    this.wormholes.startTimers();
  }

  /**
   * Ends the game: clears all timers, transitions to OVER, shows the
   * game-over overlay, and displays "Press Space to restart".
   * @private
   */
  _gameOver() {
    this._clearAllTimers();
    this._transitionTo(STATE.OVER);
    this.messageElement.textContent = 'Game Over! Press Space to restart';
    this._draw();
  }

  /**
   * Pauses the game on canvas blur. Clears all timers and stores the
   * remaining warning elapsed time if in the WARNING state.
   * @private
   */
  _pauseGame() {
    if (this.state !== STATE.PLAYING && this.state !== STATE.WARNING && this.state !== STATE.IGNORED) return;
    this.wasPaused = true;
    this._clearAllTimers();
    if (this.state === STATE.WARNING) {
      this.warningElapsed = Date.now() - this.warningStart;
    }
    this.overlay.textContent = 'Paused \u2014 Click to resume';
  }

  /**
   * Resumes the game after pause (canvas focus). Restores timers for the
   * current state (PLAYING, WARNING, or IGNORED).
   * @private
   */
  _resumeGame() {
    if (!this.wasPaused) return;
    this.wasPaused = false;
    if (this.state === STATE.PLAYING) {
      this.startTime = Date.now() - this.elapsed;
      this.speed.restartGameLoop();
      this.timers.setInterval('timerInterval', () => this._updateTimerDisplay(), 1000);
      this._resumeCommonTimers();
      this.bonusFood.startTimers();
      this.wormholes.startTimers();
    } else if (this.state === STATE.WARNING) {
      const warningDuration = this.input.speedBoostActive
        ? WARNING_TIMEOUT_MS / SPEED_BOOST_FACTOR
        : WARNING_TIMEOUT_MS;
      this.timers.setTimeout(
        'warningTimeout',
        () => this._gameOver(),
        Math.max(0, warningDuration - this.warningElapsed)
      );
      this._resumeCommonTimers();
    } else if (this.state === STATE.IGNORED) {
      this._resumeCommonTimers();
      this.bonusFood.startTimers();
      this.wormholes.startTimers();
    }
    this.overlay.textContent = 'Click to focus';
  }

  /**
   * Resumes bonus food movement and score bonus decay timers (shared across
   * several resume paths).
   * @private
   */
  _resumeCommonTimers() {
    this.bonusFood.resumeMovementTimers();
    this.scoreBonus.resumeDecay();
  }

  /**
   * Handles keyboard input. Routes to state-specific handlers.
   * @private
   * @param {KeyboardEvent} e
   */
  _handleKeydown(e) {
    if (this.state === STATE.OVER && e.code === 'Space') {
      this.init();
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

    switch (this.state) {
      case STATE.WAITING:
        this._handleInputWaiting(newDir);
        break;
      case STATE.WARNING:
        this._handleInputWarning(newDir);
        break;
      case STATE.IGNORED:
        this._handleInputIgnored(newDir);
        break;
      case STATE.PLAYING:
        this._handleInputPlaying(newDir);
        break;
    }
  }

  /**
   * Handles input in WAITING state: sets direction and starts the game.
   * @private
   * @param {Point} dir
   */
  _handleInputWaiting(dir) {
    this.nextDirection = dir;
    this.direction = dir;
    this._startGame();
  }

  /**
   * Handles input in WARNING state: checks if the direction avoids collision,
   * and if so, escapes the warning and resumes play.
   * @private
   * @param {Point} dir
   */
  _handleInputWarning(dir) {
    const newHead = this.boundary.wrap({ x: this.snake[0].x + dir.x, y: this.snake[0].y + dir.y });
    const c = this.collision.getCollision(newHead);
    if (c.wall || c.boundary || c.self) return;
    this.timers.clear('warningTimeout');
    this.direction = dir;
    this.nextDirection = dir;
    this.graceDirection = { x: 0, y: 0 };
    this._transitionTo(STATE.PLAYING);
    this.messageElement.textContent = '';
    this.input.resetBoost();
    this._scheduleNextTick();
    this.bonusFood.resumeMovementTimers();
  }

  /**
   * Handles input in IGNORED state: checks if the direction avoids collision,
   * and if so, escapes the ignored state and resumes play.
   * @private
   * @param {Point} dir
   */
  _handleInputIgnored(dir) {
    const newHead = this.boundary.wrap({ x: this.snake[0].x + dir.x, y: this.snake[0].y + dir.y });
    const c = this.collision.getCollision(newHead);
    if (c.wall || c.boundary || c.self) return;
    this.input.clearBuffer();
    this.direction = dir;
    this.nextDirection = dir;
    this._transitionTo(STATE.PLAYING);
    this.messageElement.textContent = '';
    this._scheduleNextTick();
    this._resumeCommonTimers();
  }

  /**
   * Handles input in PLAYING state via the InputManager.
   * @private
   * @param {Point} dir
   */
  _handleInputPlaying(dir) {
    this.input.handlePlayingInput(dir);
  }
}
