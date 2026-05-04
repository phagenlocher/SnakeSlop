/*
Snake Demo - A Snake game with togglable features to demonstrate game design
Written in 2026 by Philipp Hagenlocher <me@philipphagenlocher.de>
Portions of this software were written with the assistance of AI.

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

// Modes
const MODE_CLASSIC = 'classic';
const MODE_TIME_TRIAL = 'timeTrial';
const MODE_CONSTRICTOR = 'constrictor';

// Colors
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

// Bitmap helpers
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

// Bitmap palettes { body, head, eye, letter }
const PALETTE_NORMAL = { body: '#4a7a4a', head: '#8ad88a', eye: '#0d1a0d' };
const PALETTE_WARNING = { body: '#ff6666', head: '#ffaaaa', eye: '#4a0000' };
const PALETTE_IGNORED = { body: '#c084fc', head: '#e2ccff', eye: '#4a0060' };
const PALETTE_BOOST = { body: '#4a7a4a', head: '#f0e68c', eye: '#0d1a0d' };

// Bitmap drawing functions — each receives (ctx, palette) on a 25×25 canvas
const BITMAP_DRAWERS = {
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
    this.SPEED_STEP = 1.68;
    this.TIME_LIMIT = 120000;

    this._buildDOM();
    this._bindEvents();
    this.init();
  }

  _buildDOM() {
    this.container.innerHTML = `
      <div class="snake-container">
        <div class="snake-hud">
          <span class="snake-score">Score: 0</span>
          ${this.options.enableScoreBonus ? '<span class="snake-bonus">Bonus: 0</span>' : ''}
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
    this._createBitmaps();
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
    clearInterval(this.gameLoop);
    clearInterval(this.timerInterval);
    clearTimeout(this.warningTimeout);
    clearInterval(this.bonusFoodInterval);
    clearTimeout(this.bonusFoodTimeout);
    clearInterval(this.bonusFoodTimer);
    clearInterval(this.scoreBonusInterval);
    clearInterval(this.wormholeTimer);
    clearTimeout(this.wormholeLifetime);
  }

  init() {
    this.snake = [{ x: 10, y: 10 }];
    this.direction = { x: 0, y: 0 };
    this.nextDirection = { x: 0, y: 0 };
    this.score = 0;
    this.elapsed = 0;
    this.state = 'waiting';
    this.currentSpeed = this.BASE_SPEED;
    this.foodsEaten = 0;
    this.bonusFood = null;
    this.scoreBonus = 100;
    this.wasPaused = false;
    this.speedBoostActive = false;
    this.inputBuffer = [];
    this.graceDirection = { x: 0, y: 0 };
    this.growth = 0;
    this.startGrowth = 0;
    this.warningElapsed = 0;
    this.wormholeEntry = null;
    this.wormholeExit = null;
    this._clearAllTimers();
    this.freeTiles = this.COLS * this.ROWS;
    if (this.options.enableWalls) {
      this.freeTiles -= WALLS.length;
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
      (this.options.enableWalls && WALLS.some((w) => w.x === pos.x && w.y === pos.y)) ||
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
        if (
          !this.snake.some((s) => s.x === x && s.y === y) &&
          !(this.options.enableWalls && WALLS.some((w) => w.x === x && w.y === y))
        ) {
          return { x, y };
        }
      }
    }
    return null;
  }

  _placeWormholes() {
    if (!this.options.enableWormholes) return;
    if (this.freeTiles - this.snake.length <= WORMHOLE_MIN_FREE_TILES) return;
    let entry, exit;
    do {
      entry = { x: Math.floor(Math.random() * this.COLS), y: Math.floor(Math.random() * this.ROWS) };
    } while (
      this.snake.some((s) => s.x === entry.x && s.y === entry.y) ||
      (this.food && this.food.x === entry.x && this.food.y === entry.y) ||
      (this.bonusFood && this.bonusFood.x === entry.x && this.bonusFood.y === entry.y) ||
      (this.options.enableWalls && WALLS.some((w) => w.x === entry.x && w.y === entry.y))
    );
    do {
      exit = { x: Math.floor(Math.random() * this.COLS), y: Math.floor(Math.random() * this.ROWS) };
    } while (
      (exit.x === entry.x && exit.y === entry.y) ||
      this.snake.some((s) => s.x === exit.x && s.y === exit.y) ||
      (this.food && this.food.x === exit.x && this.food.y === exit.y) ||
      (this.bonusFood && this.bonusFood.x === exit.x && this.bonusFood.y === exit.y) ||
      (this.options.enableWalls && WALLS.some((w) => w.x === exit.x && w.y === exit.y)) ||
      Math.abs(exit.x - entry.x) + Math.abs(exit.y - entry.y) < WORMHOLE_MIN_DISTANCE
    );
    this.wormholeEntry = entry;
    this.wormholeExit = exit;
    clearTimeout(this.wormholeLifetime);
    this.wormholeLifetime = setTimeout(() => {
      this.wormholeEntry = null;
      this.wormholeExit = null;
      this._draw();
    }, WORMHOLE_LIFETIME_MS);
  }

  _placeBonusFood() {
    if (!this.options.enableBonusFood) {
      return;
    }
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * this.COLS), y: Math.floor(Math.random() * this.ROWS) };
    } while (
      this.snake.some((s) => s.x === pos.x && s.y === pos.y) ||
      (this.food && this.food.x === pos.x && this.food.y === pos.y) ||
      (this.options.enableWalls && WALLS.some((w) => w.x === pos.x && w.y === pos.y))
    );
    this.bonusFood = pos;
    this.bonusFoodInterval = setInterval(() => this._moveBonusFood(), this.currentSpeed + 60);
    this.bonusFoodTimeout = setTimeout(() => {
      clearInterval(this.bonusFoodInterval);
      this.bonusFood = null;
    }, BONUS_FOOD_LIFETIME_MS);
  }

  _startBonusFoodTimer() {
    if (!this.options.enableTimedBonusFood || !this.options.enableBonusFood) {
      return;
    }
    clearInterval(this.bonusFoodTimer);
    this.bonusFoodTimer = setInterval(() => {
      if (!this.bonusFood) {
        this._placeBonusFood();
      }
    }, BONUS_FOOD_SPAWN_INTERVAL_MS);
  }

  _startWormholeTimer() {
    if (!this.options.enableWormholes) return;
    clearInterval(this.wormholeTimer);
    this.wormholeTimer = setInterval(() => {
      if (!this.wormholeEntry) {
        this._placeWormholes();
        this._draw();
      }
    }, WORMHOLE_SPAWN_INTERVAL_MS);
  }

  _moveBonusFood() {
    if (!this.bonusFood) {
      return;
    }
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const next = { x: this.bonusFood.x + dir.x, y: this.bonusFood.y + dir.y };
    const obstacleFree = () =>
      !this.snake.some((s) => s.x === next.x && s.y === next.y) &&
      !(this.options.enableWalls && WALLS.some((w) => w.x === next.x && w.y === next.y));
    if (this.options.enableWrap) {
      next.x = (next.x + this.COLS) % this.COLS;
      next.y = (next.y + this.ROWS) % this.ROWS;
      if (obstacleFree()) {
        this.bonusFood = next;
      }
    } else {
      if (next.x >= 0 && next.x < this.COLS && next.y >= 0 && next.y < this.ROWS && obstacleFree()) {
        this.bonusFood = next;
      }
    }
    if (this.options.mode === MODE_CONSTRICTOR && this.bonusFood && this._isFoodEnclosed(this.bonusFood)) {
      this._eatBonusFood();
    }
  }

  _startBonusDecay() {
    clearInterval(this.scoreBonusInterval);
    this.scoreBonusInterval = setInterval(() => {
      this.scoreBonus = Math.max(0, this.scoreBonus - 1);
      this.bonusElement.textContent = `Bonus: ${this.scoreBonus}`;
      if (this.scoreBonus === 0) {
        clearInterval(this.scoreBonusInterval);
      }
    }, SCORE_BONUS_DECAY_INTERVAL_MS);
  }

  _isFoodEnclosed(pos) {
    const key = (x, y) => `${x},${y}`;
    const snakeSet = new Set(this.snake.map((s) => key(s.x, s.y)));
    const wallSet = this.options.enableWalls ? new Set(WALLS.map((w) => key(w.x, w.y))) : new Set();
    const isBlocked = (x, y) => snakeSet.has(key(x, y)) || wallSet.has(key(x, y));
    const wrap = this.options.enableWrap;

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

  _hasAnySafeMove() {
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    for (const dir of dirs) {
      const nextHead = { x: this.snake[0].x + dir.x, y: this.snake[0].y + dir.y };
      if (this.options.enableWrap) {
        nextHead.x = (nextHead.x + this.COLS) % this.COLS;
        nextHead.y = (nextHead.y + this.ROWS) % this.ROWS;
      }
      const hitsWall = this.options.enableWalls && WALLS.some((w) => w.x === nextHead.x && w.y === nextHead.y);
      const hitsBoundary = nextHead.x < 0 || nextHead.x >= this.COLS || nextHead.y < 0 || nextHead.y >= this.ROWS;
      const hitsSelf = this.snake.some((s) => s.x === nextHead.x && s.y === nextHead.y);
      if (!hitsWall && !hitsBoundary && !hitsSelf) {
        return true;
      }
    }
    return false;
  }

  _isDirSafe(dir) {
    const nextHead = { x: this.snake[0].x + dir.x, y: this.snake[0].y + dir.y };
    if (this.options.enableWrap) {
      nextHead.x = (nextHead.x + this.COLS) % this.COLS;
      nextHead.y = (nextHead.y + this.ROWS) % this.ROWS;
    }
    const hitsWall = this.options.enableWalls && WALLS.some((w) => w.x === nextHead.x && w.y === nextHead.y);
    const hitsBoundary = nextHead.x < 0 || nextHead.x >= this.COLS || nextHead.y < 0 || nextHead.y >= this.ROWS;
    const hitsSelf = this.snake.some((s) => s.x === nextHead.x && s.y === nextHead.y);
    return !hitsWall && !hitsBoundary && !hitsSelf;
  }

  _eatRegularFood() {
    let points = 10;
    if (this.options.enableScoreBonus) {
      if (this.scoreBonus > 0) {
        points += this.scoreBonus;
      }
      this.scoreBonus = 100;
      if (this.bonusElement) {
        this.bonusElement.textContent = `Bonus: ${this.scoreBonus}`;
      }
      this._startBonusDecay();
    }
    this.score += points;
    this.scoreElement.textContent = `Score: ${this.score}`;
    this.foodsEaten++;
    this.growth = 1;
    if (this.snake.length >= this.freeTiles) {
      this._gameOver();
      return true;
    }
    if (
      this.options.enableBonusFood &&
      !this.options.enableTimedBonusFood &&
      this.foodsEaten % 5 === 0 &&
      !this.bonusFood
    ) {
      this._placeBonusFood();
    }
    this._placeFood();
    if (this.options.enableSpeedUp && this.currentSpeed > this.MIN_SPEED) {
      this.currentSpeed = Math.max(this.MIN_SPEED, this.currentSpeed - this.SPEED_STEP);
      clearInterval(this.gameLoop);
      this.gameLoop = setInterval(
        () => this._update(),
        this.speedBoostActive ? this.currentSpeed / SPEED_BOOST_FACTOR : this.currentSpeed
      );
    }
    return false;
  }

  _eatBonusFood() {
    this.score += 100;
    this.scoreElement.textContent = `Score: ${this.score}`;
    if (this.options.enableShrinkOnBonusFood) {
      const shrunkLen = Math.ceil(this.snake.length / 2);
      if (this.options.mode !== MODE_CONSTRICTOR || shrunkLen >= 15) {
        this.snake.splice(shrunkLen);
      }
    }
    clearInterval(this.bonusFoodInterval);
    clearTimeout(this.bonusFoodTimeout);
    this.bonusFood = null;
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

    if (this.options.enableWalls) {
      WALLS.forEach((w) => {
        this.ctx.fillStyle = COLOR_WALL_BODY;
        this.ctx.fillRect(w.x * this.CELL_SIZE, w.y * this.CELL_SIZE, this.CELL_SIZE, this.CELL_SIZE);
        this.ctx.fillStyle = COLOR_WALL_EDGE_LIGHT;
        this.ctx.fillRect(w.x * this.CELL_SIZE, w.y * this.CELL_SIZE, this.CELL_SIZE - 1, 1);
        this.ctx.fillRect(w.x * this.CELL_SIZE, w.y * this.CELL_SIZE, 1, this.CELL_SIZE - 1);
        this.ctx.fillStyle = COLOR_WALL_EDGE_DARK;
        this.ctx.fillRect((w.x + 1) * this.CELL_SIZE - 1, w.y * this.CELL_SIZE, 1, this.CELL_SIZE);
        this.ctx.fillRect(w.x * this.CELL_SIZE, (w.y + 1) * this.CELL_SIZE - 1, this.CELL_SIZE, 1);
      });
    }

    if (this.options.enableWormholes && this.wormholeEntry) {
      this.ctx.fillStyle = COLOR_WORMHOLE_ENTRY;
      this.ctx.fillRect(
        this.wormholeEntry.x * this.CELL_SIZE + 1,
        this.wormholeEntry.y * this.CELL_SIZE + 1,
        this.CELL_SIZE - 2,
        this.CELL_SIZE - 2
      );
      this.ctx.fillStyle = COLOR_WORMHOLE_EXIT;
      this.ctx.fillRect(
        this.wormholeExit.x * this.CELL_SIZE + 1,
        this.wormholeExit.y * this.CELL_SIZE + 1,
        this.CELL_SIZE - 2,
        this.CELL_SIZE - 2
      );
    }

    this.snake.forEach((seg, i) => {
      let key = this._getSegmentBitmapKey(i);
      if (i === 0 && this.speedBoostActive) {
        key += '_b';
      } else if (this.state === 'ignored') {
        key += '_i';
      } else if (this.state === 'warning') {
        key += '_w';
      }
      this.ctx.drawImage(
        this.bitmaps[key],
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

    if (this.options.enableBonusFood && this.bonusFood) {
      const cx = this.bonusFood.x * this.CELL_SIZE + this.CELL_SIZE / 2;
      const cy = this.bonusFood.y * this.CELL_SIZE + this.CELL_SIZE / 2;
      const r = 8;
      this.ctx.fillStyle = COLOR_FOOD_BONUS;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - r);
      this.ctx.lineTo(cx + r, cy);
      this.ctx.lineTo(cx, cy + r);
      this.ctx.lineTo(cx - r, cy);
      this.ctx.closePath();
      this.ctx.fill();
    }

    if (this.state === 'over') {
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

  _createBitmaps() {
    const sets = [
      { palette: PALETTE_NORMAL, suffix: '' },
      { palette: PALETTE_WARNING, suffix: '_w' },
      { palette: PALETTE_IGNORED, suffix: '_i' },
    ];

    this.bitmaps = {};

    for (const { palette, suffix } of sets) {
      Object.assign(this.bitmaps, this._createBitmapSet(palette, suffix));
    }

    const boostHeadKeys = ['headUp', 'headDown', 'headLeft', 'headRight'];
    for (const key of boostHeadKeys) {
      this.bitmaps[`${key}_b`] = this._makeBitmap(key, PALETTE_BOOST);
    }
  }

  _createBitmapSet(palette, suffix) {
    const set = {};
    for (const key of Object.keys(BITMAP_DRAWERS)) {
      set[key + suffix] = this._makeBitmap(key, palette);
    }
    return set;
  }

  _makeBitmap(key, palette) {
    const canvas = document.createElement('canvas');
    canvas.width = this.CELL_SIZE + 1;
    canvas.height = this.CELL_SIZE + 1;
    const ctx = canvas.getContext('2d');
    BITMAP_DRAWERS[key](ctx, palette);
    return canvas;
  }

  _getSegmentBitmapKey(i) {
    if (i === 0) {
      const d = this.direction.x === 0 && this.direction.y === 0 ? { x: 1, y: 0 } : this.direction;
      return `head${DIR_KEY[`${d.x},${d.y}`]}`;
    }

    const prev = this.snake[i - 1];
    const curr = this.snake[i];
    const dirIn = dirBetween(prev, curr, this.options.enableWrap);

    if (i === this.snake.length - 1) {
      const key = DIR_KEY[`${dirIn.x},${dirIn.y}`];
      if (key) return `tail${key}`;
      return Math.abs(dirIn.x) >= Math.abs(dirIn.y) ? 'bodyHoriz' : 'bodyVert';
    }

    const next = this.snake[i + 1];
    const dirOut = dirBetween(curr, next, this.options.enableWrap);

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

  _update() {
    if (this.options.enableInputBuffer) {
      const prevDir = { x: this.direction.x, y: this.direction.y };
      let effectiveDir =
        this.graceDirection.x !== 0 || this.graceDirection.y !== 0 ? this.graceDirection : this.direction;

      while (this.inputBuffer.length > 0) {
        const next = this.inputBuffer.shift();
        if (next.x !== -effectiveDir.x || next.y !== -effectiveDir.y) {
          if (this._isDirSafe(next)) {
            effectiveDir = next;
            break;
          }
        }
      }

      this.direction = effectiveDir;
      if (prevDir.x !== this.direction.x || prevDir.y !== this.direction.y) {
        this._deactivateSpeedBoost();
      }

      if (this.graceDirection.x !== 0 || this.graceDirection.y !== 0) {
        this.graceDirection = { x: 0, y: 0 };
      }
    } else {
      this.direction = this.nextDirection;
    }

    const nextHead = { x: this.snake[0].x + this.direction.x, y: this.snake[0].y + this.direction.y };

    if (this.options.enableWrap) {
      nextHead.x = (nextHead.x + this.COLS) % this.COLS;
      nextHead.y = (nextHead.y + this.ROWS) % this.ROWS;
    }

    if (
      this.options.enableWormholes &&
      this.wormholeEntry &&
      nextHead.x === this.wormholeEntry.x &&
      nextHead.y === this.wormholeEntry.y
    ) {
      nextHead.x = this.wormholeExit.x;
      nextHead.y = this.wormholeExit.y;
      if (this.options.enableWrap) {
        nextHead.x = (nextHead.x + this.COLS) % this.COLS;
        nextHead.y = (nextHead.y + this.ROWS) % this.ROWS;
      }
      clearTimeout(this.wormholeLifetime);
      this.wormholeEntry = null;
      this.wormholeExit = null;
    }

    const hitsWall = this.options.enableWalls && WALLS.some((w) => w.x === nextHead.x && w.y === nextHead.y);
    const hitsBoundary = nextHead.x < 0 || nextHead.x >= this.COLS || nextHead.y < 0 || nextHead.y >= this.ROWS;
    const hitsSelf = this.snake.some((s) => s.x === nextHead.x && s.y === nextHead.y);

    if (hitsWall || hitsBoundary || hitsSelf) {
      if (this.options.mode === MODE_CONSTRICTOR && hitsSelf) {
        if (this._hasAnySafeMove()) {
          this._enterIgnored();
        } else {
          this._gameOver();
        }
        return;
      }
      if (this.options.enableGracePeriod) {
        this._enterWarning();
      } else {
        this._gameOver();
      }
      return;
    }

    const head = nextHead;

    this.snake.unshift(head);

    if (this.options.mode === MODE_CONSTRICTOR) {
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
        if (this._eatRegularFood()) {
          return;
        }
      }

      if (this.options.enableBonusFood && this.bonusFood && this._isFoodEnclosed(this.bonusFood)) {
        this._eatBonusFood();
      }
    } else {
      if (head.x === this.food.x && head.y === this.food.y) {
        if (this._eatRegularFood()) {
          return;
        }
      } else {
        if (this.growth > 0) {
          this.growth--;
        } else {
          this.snake.pop();
        }
      }

      if (
        this.options.enableBonusFood &&
        this.bonusFood &&
        head.x === this.bonusFood.x &&
        head.y === this.bonusFood.y
      ) {
        this._eatBonusFood();
      }
    }

    this._draw();
  }

  _enterWarning() {
    clearInterval(this.gameLoop);
    clearInterval(this.bonusFoodInterval);
    this.state = 'warning';
    this.warningStart = Date.now();
    this.warningElapsed = 0;
    this.messageElement.textContent = '';
    this.graceDirection = { x: this.direction.x, y: this.direction.y };
    this._draw();
    clearTimeout(this.warningTimeout);
    this.warningTimeout = setTimeout(
      () => this._gameOver(),
      this.speedBoostActive ? WARNING_TIMEOUT_MS / SPEED_BOOST_FACTOR : WARNING_TIMEOUT_MS
    );
  }

  _enterIgnored() {
    clearInterval(this.gameLoop);
    clearInterval(this.bonusFoodInterval);
    clearTimeout(this.bonusFoodTimeout);
    clearInterval(this.scoreBonusInterval);
    this._deactivateSpeedBoost();
    this.state = 'ignored';
    this.inputBuffer = [];
    this.messageElement.textContent = 'Snake stuck — press a safe direction';
    this._draw();
  }

  _startGame() {
    this.canvas.focus();
    this.state = 'playing';
    this.startTime = Date.now() - this.elapsed;
    this.messageElement.textContent = '';
    if (this.options.mode === MODE_CONSTRICTOR) {
      this.startGrowth = 14;
    }
    this.gameLoop = setInterval(() => this._update(), this.currentSpeed);
    this.timerInterval = setInterval(() => this._updateTimerDisplay(), 1000);
    if (this.options.enableScoreBonus && this.scoreBonus > 0) {
      this._startBonusDecay();
    }
    if (this.options.enableTimedBonusFood) {
      this._startBonusFoodTimer();
    }
    if (this.options.enableWormholes) {
      this._startWormholeTimer();
    }
  }

  _gameOver() {
    this._clearAllTimers();
    this.state = 'over';
    this.messageElement.textContent = 'Game Over! Press Space to restart';
    this._draw();
  }

  _pauseGame() {
    if (this.state !== 'playing' && this.state !== 'warning' && this.state !== 'ignored') {
      return;
    }
    this.wasPaused = true;
    this._clearAllTimers();
    if (this.state === 'warning') {
      this.warningElapsed = Date.now() - this.warningStart;
    }
    this.overlay.textContent = 'Paused — Click to resume';
  }

  _resumeCommonTimers() {
    if (this.options.enableBonusFood && this.bonusFood) {
      this.bonusFoodInterval = setInterval(() => this._moveBonusFood(), this.currentSpeed + 60);
      this.bonusFoodTimeout = setTimeout(() => {
        clearInterval(this.bonusFoodInterval);
        this.bonusFood = null;
      }, BONUS_FOOD_LIFETIME_MS);
    }
    if (this.options.enableScoreBonus && this.scoreBonus > 0) {
      this._startBonusDecay();
    }
  }

  _resumeGame() {
    if (!this.wasPaused) {
      return;
    }
    this.wasPaused = false;
    if (this.state === 'playing') {
      this.startTime = Date.now() - this.elapsed;
      this.gameLoop = setInterval(
        () => this._update(),
        this.speedBoostActive ? this.currentSpeed / SPEED_BOOST_FACTOR : this.currentSpeed
      );
      this.timerInterval = setInterval(() => this._updateTimerDisplay(), 1000);
      this._resumeCommonTimers();
      if (this.options.enableTimedBonusFood) {
        this._startBonusFoodTimer();
      }
      if (this.options.enableWormholes) {
        this._startWormholeTimer();
      }
    } else if (this.state === 'warning') {
      const warningDuration = this.speedBoostActive ? WARNING_TIMEOUT_MS / SPEED_BOOST_FACTOR : WARNING_TIMEOUT_MS;
      this.warningTimeout = setTimeout(() => this._gameOver(), Math.max(0, warningDuration - this.warningElapsed));
      this._resumeCommonTimers();
    } else if (this.state === 'ignored') {
      this._resumeCommonTimers();
      if (this.options.enableTimedBonusFood) {
        this._startBonusFoodTimer();
      }
      if (this.options.enableWormholes) {
        this._startWormholeTimer();
      }
    }
    this.overlay.textContent = 'Click to focus';
  }

  _activateSpeedBoost() {
    if (!this.options.enableSpeedBoost || this.speedBoostActive) {
      return false;
    }
    this.speedBoostActive = true;
    clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => this._update(), this.currentSpeed / SPEED_BOOST_FACTOR);
    return true;
  }

  _deactivateSpeedBoost() {
    if (!this.speedBoostActive) {
      return;
    }
    this.speedBoostActive = false;
    clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => this._update(), this.currentSpeed);
  }

  _handleKeydown(e) {
    if (this.state === 'over' && e.code === 'Space') {
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
    if (!newDir) {
      return;
    }
    e.preventDefault();

    if (this.state === 'waiting') {
      this.nextDirection = newDir;
      this.direction = newDir;
      this._startGame();
      return;
    }

    if (this.state === 'warning') {
      const newHead = { x: this.snake[0].x + newDir.x, y: this.snake[0].y + newDir.y };
      const hitsWall = this.options.enableWalls && WALLS.some((w) => w.x === newHead.x && w.y === newHead.y);
      const hitsBoundary = newHead.x < 0 || newHead.x >= this.COLS || newHead.y < 0 || newHead.y >= this.ROWS;
      const hitsSelf = this.snake.some((s) => s.x === newHead.x && s.y === newHead.y);
      if (hitsWall || hitsBoundary || hitsSelf) {
        return;
      }
      clearTimeout(this.warningTimeout);
      this.direction = newDir;
      this.nextDirection = newDir;
      this.graceDirection = { x: 0, y: 0 };
      this.state = 'playing';
      this.messageElement.textContent = '';
      this.speedBoostActive = false;
      this.gameLoop = setInterval(() => this._update(), this.currentSpeed);
      if (this.options.enableBonusFood && this.bonusFood) {
        this.bonusFoodInterval = setInterval(() => this._moveBonusFood(), this.currentSpeed + 60);
        clearTimeout(this.bonusFoodTimeout);
        this.bonusFoodTimeout = setTimeout(() => {
          clearInterval(this.bonusFoodInterval);
          this.bonusFood = null;
        }, BONUS_FOOD_LIFETIME_MS);
      }
      return;
    }

    if (this.state === 'ignored') {
      const newHead = { x: this.snake[0].x + newDir.x, y: this.snake[0].y + newDir.y };
      if (this.options.enableWrap) {
        newHead.x = (newHead.x + this.COLS) % this.COLS;
        newHead.y = (newHead.y + this.ROWS) % this.ROWS;
      }
      const hitsWall = this.options.enableWalls && WALLS.some((w) => w.x === newHead.x && w.y === newHead.y);
      const hitsBoundary = newHead.x < 0 || newHead.x >= this.COLS || newHead.y < 0 || newHead.y >= this.ROWS;
      const hitsSelf = this.snake.some((s) => s.x === newHead.x && s.y === newHead.y);
      if (hitsWall || hitsBoundary || hitsSelf) {
        return;
      }
      this.inputBuffer = [];
      this.direction = newDir;
      this.nextDirection = newDir;
      this.state = 'playing';
      this.messageElement.textContent = '';
      this.gameLoop = setInterval(() => this._update(), this.currentSpeed);
      this._resumeCommonTimers();
      return;
    }

    if (this.state === 'playing') {
      if (this.options.enableInputBuffer) {
        const ref = this.inputBuffer.length > 0 ? this.inputBuffer[this.inputBuffer.length - 1] : this.direction;
        const isOpposite = newDir.x === -ref.x && newDir.y === -ref.y;
        const isDuplicate = newDir.x === ref.x && newDir.y === ref.y;
        if (!isOpposite && !isDuplicate && this.inputBuffer.length < 2) {
          this.inputBuffer.push(newDir);
        }
      }
      let acceptedInput = false;
      if (newDir.x === this.direction.x && newDir.y === this.direction.y) {
        acceptedInput = this._activateSpeedBoost();
      } else if (newDir.x !== -this.direction.x || newDir.y !== -this.direction.y) {
        if (!this.options.enableInputBuffer) {
          this.nextDirection = newDir;
        }
        this._deactivateSpeedBoost();
        acceptedInput = true;
      } else {
        this._deactivateSpeedBoost();
      }

      if (this.options.enableInstantMovement && acceptedInput && this.state === 'playing') {
        this._update();
        if (this.state === 'playing') {
          clearInterval(this.gameLoop);
          this.gameLoop = setInterval(
            () => this._update(),
            this.speedBoostActive ? this.currentSpeed / SPEED_BOOST_FACTOR : this.currentSpeed
          );
        }
      }
    }
  }
}
