/*
Snake Demo - A Snake game with togglable features to demonstrate game design
Written in 2026 by Philipp Hagenlocher <me@philipphagenlocher.de>
This software was written with the assistance of AI.

To the extent possible under law, the author(s) have dedicated all copyright and related and neighboring rights to this software to the public domain worldwide. This software is distributed without any warranty.

You should have received a copy of the CC0 Public Domain Dedication along with this software. If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.
*/
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

const MODE_CLASSIC = 'classic';
const MODE_TIME_TRIAL = 'timeTrial';
const MODE_CONSTRICTOR = 'constrictor';

const STATE = Object.freeze({
  WAITING: 'waiting',
  PLAYING: 'playing',
  WARNING: 'warning',
  IGNORED: 'ignored',
  OVER: 'over',
});

const STATE_TRANSITIONS = Object.freeze({
  [STATE.WAITING]: [STATE.PLAYING],
  [STATE.PLAYING]: [STATE.WARNING, STATE.IGNORED, STATE.OVER],
  [STATE.WARNING]: [STATE.PLAYING, STATE.OVER],
  [STATE.IGNORED]: [STATE.PLAYING],
  [STATE.OVER]: [STATE.WAITING],
});

const COLOR_BG = '#0d1a0d';
const COLOR_WALL_BODY = '#555';
const COLOR_WALL_EDGE_LIGHT = '#777';
const COLOR_WALL_EDGE_DARK = '#333';
const COLOR_FOOD = '#7aff7a';
const COLOR_FOOD_BONUS = '#ffd700';
const COLOR_WORMHOLE_ENTRY = '#003a00';
const COLOR_WORMHOLE_EXIT = '#e8e8e8';
const WORMHOLE_SPAWN_INTERVAL_MS = 30000;
const WORMHOLE_LIFETIME_MS = 15000;
const WORMHOLE_MIN_DISTANCE = 5;
const WORMHOLE_MIN_FREE_TILES = 10;
const COLOR_OVERLAY = 'rgba(0, 0, 0, 0.7)';
const COLOR_OVERLAY_TEXT = '#fff';

const SPEED_BOOST_FACTOR = 1.35;
const WARNING_TIMEOUT_MS = 700;
const BONUS_FOOD_LIFETIME_MS = 5000;
const BONUS_FOOD_SPAWN_INTERVAL_MS = 15000;
const SCORE_BONUS_DECAY_INTERVAL_MS = 200;

function dirBetween(a, b, enableWrap) {
  const d = { x: b.x - a.x, y: b.y - a.y };
  if (enableWrap) {
    if (Math.abs(d.x) > 1) d.x = -Math.sign(d.x);
    if (Math.abs(d.y) > 1) d.y = -Math.sign(d.y);
  }
  return d;
}

const DIR_KEY = {
  '0,-1': 'Up',
  '0,1': 'Down',
  '-1,0': 'Left',
  '1,0': 'Right',
};

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

const PALETTE_NORMAL = { body: '#4a7a4a', head: '#8ad88a', eye: '#0d1a0d' };
const PALETTE_WARNING = { body: '#ff6666', head: '#ffaaaa', eye: '#4a0000' };
const PALETTE_IGNORED = { body: '#c084fc', head: '#e2ccff', eye: '#4a0060' };
const PALETTE_BOOST = { body: '#4a7a4a', head: '#f0e68c', eye: '#0d1a0d' };

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

class TimerManager {
  constructor() {
    this._timers = {};
  }

  _clearExisting(name) {
    if (this._timers[name]) {
      const t = this._timers[name];
      if (t.type === 'interval') clearInterval(t.id);
      else clearTimeout(t.id);
      delete this._timers[name];
    }
  }

  setInterval(name, fn, ms) {
    this._clearExisting(name);
    const id = setInterval(fn, ms);
    this._timers[name] = { id, type: 'interval' };
    return id;
  }

  setTimeout(name, fn, ms) {
    this._clearExisting(name);
    const id = setTimeout(fn, ms);
    this._timers[name] = { id, type: 'timeout' };
    return id;
  }

  clear(name) {
    this._clearExisting(name);
  }

  clearAll() {
    for (const name of Object.keys(this._timers)) {
      this.clear(name);
    }
  }
}

// ─── WallsManager: enableWalls ──────────────────────────────────────────────

class WallsManager {
  constructor(game) {
    this.game = game;
    this._wallSet = new Set(WALLS.map((w) => `${w.x},${w.y}`));
  }

  get enabled() {
    return this.game.options.enableWalls;
  }

  isWallAt(x, y) {
    return this.enabled && this._wallSet.has(`${x},${y}`);
  }

  getWallSet() {
    return this.enabled ? this._wallSet : new Set();
  }

  get count() {
    return WALLS.length;
  }

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

// ─── BoundaryManager: enableWrap ────────────────────────────────────────────

class BoundaryManager {
  constructor(game) {
    this.game = game;
  }

  get enabled() {
    return this.game.options.enableWrap;
  }

  wrap(pos) {
    if (!this.enabled) return pos;
    pos.x = (pos.x + this.game.COLS) % this.game.COLS;
    pos.y = (pos.y + this.game.ROWS) % this.game.ROWS;
    return pos;
  }

  isInBounds(x, y) {
    return x >= 0 && x < this.game.COLS && y >= 0 && y < this.game.ROWS;
  }

  dirBetween(a, b) {
    return dirBetween(a, b, this.enabled);
  }
}

// ─── WormholesManager: enableWormholes ──────────────────────────────────────

class WormholesManager {
  constructor(game) {
    this.game = game;
    this.entry = null;
    this.exit = null;
  }

  get enabled() {
    return this.game.options.enableWormholes;
  }

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

  draw(ctx, cellSize) {
    if (!this.enabled || !this.entry) return;
    ctx.fillStyle = COLOR_WORMHOLE_ENTRY;
    ctx.fillRect(this.entry.x * cellSize + 1, this.entry.y * cellSize + 1, cellSize - 2, cellSize - 2);
    ctx.fillStyle = COLOR_WORMHOLE_EXIT;
    ctx.fillRect(this.exit.x * cellSize + 1, this.exit.y * cellSize + 1, cellSize - 2, cellSize - 2);
  }

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

// ─── BonusFoodManager: enableBonusFood + enableTimedBonusFood + enableShrinkOnBonusFood ──

class BonusFoodManager {
  constructor(game) {
    this.game = game;
    this.pos = null;
  }

  get enabled() {
    return this.game.options.enableBonusFood;
  }
  get timed() {
    return this.game.options.enableTimedBonusFood;
  }
  get canShrink() {
    return this.game.options.enableShrinkOnBonusFood;
  }
  get active() {
    return this.pos !== null;
  }

  isAt(x, y) {
    return this.pos !== null && this.pos.x === x && this.pos.y === y;
  }

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

  isHeadCollision(head) {
    return this.enabled && this.active && head.x === this.pos.x && head.y === this.pos.y;
  }

  isEnclosed() {
    return this.enabled && this.active && this.game._isFoodEnclosed(this.pos);
  }

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

  trySpawnOnCount(foodsEaten) {
    if (!this.enabled || this.timed) return;
    if (foodsEaten % 5 === 0 && !this.active) {
      this.place();
    }
  }

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

  clearMovementInterval() {
    this.game.timers.clear('bonusFoodInterval');
  }

  clearMovementTimers() {
    this.game.timers.clear('bonusFoodInterval');
    this.game.timers.clear('bonusFoodTimeout');
  }

  clearAllTimers() {
    this.game.timers.clear('bonusFoodTimer');
    this.clearMovementTimers();
  }
}

// ─── ScoreBonusManager: enableScoreBonus ────────────────────────────────────

class ScoreBonusManager {
  constructor(game) {
    this.game = game;
    this.value = 100;
  }

  get enabled() {
    return this.game.options.enableScoreBonus;
  }

  getHUDHtml() {
    return this.enabled ? '<span class="snake-bonus">Bonus: 0</span>' : '';
  }

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

  clearTimers() {
    this.game.timers.clear('scoreBonusInterval');
  }

  resumeDecay() {
    if (this.enabled && this.value > 0) this.startDecay();
  }
}

// ─── SpeedManager: enableSpeedUp ────────────────────────────────────────────

class SpeedManager {
  constructor(game) {
    this.game = game;
  }

  get enabled() {
    return this.game.options.enableSpeedUp;
  }

  onFoodEaten() {
    if (!this.enabled) return;
    const baseTickRate = 1000 / this.game.BASE_SPEED;
    const tickRate = baseTickRate + this.game.RATE_STEP * this.game.foodsEaten;
    this.game.currentSpeed = Math.max(this.game.MIN_SPEED, 1000 / tickRate);
    this.restartGameLoop();
  }

  restartGameLoop() {
    this.game.timers.clear('gameLoop');
    this.game._scheduleNextTick();
  }
}

// ─── InputManager: enableInputBuffer + enableInstantMovement + enableSpeedBoost ──

class InputManager {
  constructor(game) {
    this.game = game;
    this.buffer = [];
    this.speedBoostActive = false;
  }

  get enableBuffer() {
    return this.game.options.enableInputBuffer;
  }
  get enableBoost() {
    return this.game.options.enableSpeedBoost;
  }
  get enableInstant() {
    return this.game.options.enableInstantMovement;
  }

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

  _activateBoost() {
    if (!this.enableBoost || this.speedBoostActive) return;
    this.speedBoostActive = true;
  }

  _deactivateBoost() {
    if (!this.speedBoostActive) return;
    this.speedBoostActive = false;
  }

  resetBoost() {
    this.speedBoostActive = false;
  }

  clearBuffer() {
    this.buffer = [];
  }
}

// ─── CollisionResolver: enableGracePeriod + collision detection ─────────────

class CollisionResolver {
  constructor(game) {
    this.game = game;
  }

  get graceEnabled() {
    return this.game.options.enableGracePeriod;
  }

  getCollision(pos) {
    return {
      wall: this.game.walls.isWallAt(pos.x, pos.y),
      boundary: pos.x < 0 || pos.x >= this.game.COLS || pos.y < 0 || pos.y >= this.game.ROWS,
      self: this.game.snake.some((s) => s.x === pos.x && s.y === pos.y),
    };
  }

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

  isDirSafe(dir) {
    const pos = this.game.boundary.wrap({ x: this.game.snake[0].x + dir.x, y: this.game.snake[0].y + dir.y });
    const c = this.getCollision(pos);
    return !c.wall && !c.boundary && !c.self;
  }

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

// ═══════════════════════════════════════════════════════════════════════════════
// SnakeGame
// ═══════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line no-unused-vars -- accessed from index.html
class SnakeGame {
  constructor(container, options = {}) {
    this.container = container;
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

    this.COLS = 20;
    this.ROWS = 20;
    this.BASE_SPEED = 135;
    this.MIN_SPEED = 50;
    this.RATE_STEP = 0.2;
    this.TIME_LIMIT = 120000;

    this.walls = new WallsManager(this);
    this.boundary = new BoundaryManager(this);
    this.wormholes = new WormholesManager(this);
    this.bonusFood = new BonusFoodManager(this);
    this.scoreBonus = new ScoreBonusManager(this);
    this.input = new InputManager(this);
    this.speed = new SpeedManager(this);
    this.collision = new CollisionResolver(this);

    this._buildDOM();
    this._bindEvents();
    this.init();
  }

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

  destroy() {
    this.canvas.removeEventListener('keydown', this._onKeydown);
    this.canvas.removeEventListener('focus', this._onFocus);
    this.canvas.removeEventListener('blur', this._onBlur);
    this.overlay.removeEventListener('click', this._onClick);
    this._clearAllTimers();
  }

  _clearAllTimers() {
    this.timers.clearAll();
  }

  init() {
    this.snake = [{ x: 10, y: 10 }];
    this.direction = { x: 0, y: 0 };
    this.nextDirection = { x: 0, y: 0 };
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
    this.food = pos;
  }

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

  _eatBonusFood() {
    this.score += this.bonusFood.onEat();
    this.scoreElement.textContent = `Score: ${this.score}`;
  }

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

  _createTileSet(palette, suffix) {
    const set = {};
    for (const key of Object.keys(TILE_RENDERERS)) {
      set[key + suffix] = this._makeTile(key, palette);
    }
    return set;
  }

  _makeTile(key, palette) {
    const canvas = document.createElement('canvas');
    canvas.width = this.CELL_SIZE + 1;
    canvas.height = this.CELL_SIZE + 1;
    const ctx = canvas.getContext('2d');
    TILE_RENDERERS[key](ctx, palette);
    return canvas;
  }

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

  _processInput() {
    this.input.commitDirection();
  }

  _resolveNextHead() {
    const nextHead = { x: this.snake[0].x + this.direction.x, y: this.snake[0].y + this.direction.y };
    this.boundary.wrap(nextHead);
    this.wormholes.tryTeleport(nextHead);
    return nextHead;
  }

  _processCollision(nextHead) {
    return this.collision.resolve(nextHead);
  }

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

  _transitionTo(newState) {
    if (this.state === newState) return;
    const valid = STATE_TRANSITIONS[this.state];
    if (valid && !valid.includes(newState)) {
      console.warn(`Invalid state transition: ${this.state} -> ${newState}`);
    }
    this.state = newState;
  }

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

  _gameOver() {
    this._clearAllTimers();
    this._transitionTo(STATE.OVER);
    this.messageElement.textContent = 'Game Over! Press Space to restart';
    this._draw();
  }

  _pauseGame() {
    if (this.state !== STATE.PLAYING && this.state !== STATE.WARNING && this.state !== STATE.IGNORED) return;
    this.wasPaused = true;
    this._clearAllTimers();
    if (this.state === STATE.WARNING) {
      this.warningElapsed = Date.now() - this.warningStart;
    }
    this.overlay.textContent = 'Paused \u2014 Click to resume';
  }

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

  _resumeCommonTimers() {
    this.bonusFood.resumeMovementTimers();
    this.scoreBonus.resumeDecay();
  }

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

  _handleInputWaiting(dir) {
    this.nextDirection = dir;
    this.direction = dir;
    this._startGame();
  }

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

  _handleInputPlaying(dir) {
    this.input.handlePlayingInput(dir);
  }
}
