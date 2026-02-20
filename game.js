/**
 * Pac-Man — Game Shell
 * Basic canvas setup and requestAnimationFrame loop.
 * Maze class renders the classic 28x31 grid.
 */

// --- Constants ---
const TILE_SIZE = 24;
const COLS = 28;
const ROWS = 31;
const CANVAS_WIDTH = COLS * TILE_SIZE;  // 672
const CANVAS_HEIGHT = ROWS * TILE_SIZE; // 744

// Tile values: 0 = path, 1 = wall, 2 = dot, 3 = power pellet, 4 = ghost door
const TILE_PATH = 0;
const TILE_WALL = 1;
const TILE_DOT = 2;
const TILE_POWER = 3;
const TILE_GHOST_DOOR = 4;

// Pac-Man constants
const PAC_START_ROW = 23;
const PAC_START_COL = 14;
const DOT_SCORE = 10;
const PAC_SPEED = 120; // pixels per second

// Ghost constants
const GHOST_SPEED = 90;  // slightly slower than Pac-Man
const GHOST_HOUSE_ROW = 11;
const GHOST_HOUSE_COL = 13;
const FRIGHTENED_DURATION_MS = 8000;
const GHOST_EAT_SCORE = 200;
const MAX_LIVES = 3;

// Tunnel rows (path at col 0 and COLS-1); wrapping left/right only on these rows
const TUNNEL_ROWS = [8, 14, 20];
function isTunnelRow(row) {
  return row >= 0 && row < ROWS && TUNNEL_ROWS.indexOf(row) !== -1;
}

// Game states
const STATE_TITLE = 'title';
const STATE_READY = 'ready';
const STATE_PLAYING = 'playing';
const STATE_GAME_OVER = 'game_over';

// --- Canvas setup ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Ensure canvas matches our grid dimensions (never change — game logic depends on this)
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

/** Reserve space below canvas for HUD (score/lives) and gap so scoreboard stays visible */
const HUD_RESERVE_PX = 88;

/**
 * Applies responsive scale so the game fits on screen with ~5% margin.
 * Uses CSS transform on the canvas only; canvas internal resolution is unchanged.
 * Height accounts for HUD so the scoreboard is never pushed off-screen.
 */
function applyScale() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scaleW = w / CANVAS_WIDTH;
  const scaleH = (h - HUD_RESERVE_PX) / CANVAS_HEIGHT;
  const scale = Math.min(scaleW, scaleH, 1) * 0.95;
  const wrapper = document.getElementById('canvas-wrapper');
  if (!wrapper) return;
  wrapper.style.width = (CANVAS_WIDTH * scale) + 'px';
  wrapper.style.height = (CANVAS_HEIGHT * scale) + 'px';
  canvas.style.transform = 'scale(' + scale + ')';
  canvas.style.transformOrigin = '0 0';
}
applyScale();
window.addEventListener('resize', applyScale);

// --- Maze Class ---
/**
 * Holds the classic 28x31 Pac-Man maze grid and renders it.
 * Walls, dots, power pellets. Power pellets pulse via sin wave.
 */
class Maze {
  constructor() {
    // Classic Pac-Man maze layout. maze[row][col]
    // 0=path, 1=wall, 2=dot, 3=power pellet, 4=ghost door
    this.grid = this.createClassicMaze();
  }

  /**
   * Restores the maze grid to the initial layout (all dots and power pellets back).
   * Call this when doing a full game reset.
   */
  reset() {
    this.grid = this.createClassicMaze();
  }

  /**
   * Returns the classic 28x31 Pac-Man maze as a 2D array.
   */
  createClassicMaze() {
    return [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
      [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
      [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
      [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
      [0,0,0,0,0,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,0,0,0,0,0],
      [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
      [1,2,2,2,2,2,2,0,0,0,1,1,1,4,4,1,1,1,0,0,0,2,2,2,2,2,2,1],
      [1,2,1,1,1,1,2,1,1,0,1,4,4,4,4,4,4,1,0,1,1,2,1,1,1,1,2,1],
      [1,2,2,2,1,1,2,1,1,0,1,4,4,4,4,4,4,1,0,1,1,2,1,1,2,2,2,1],
      [1,1,1,2,1,1,2,1,1,0,1,4,4,4,4,4,4,1,0,1,1,2,1,1,2,1,1,1],
      [0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0],
      [1,1,1,2,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,2,1,1,1],
      [1,2,2,2,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,2,2,2,1],
      [1,2,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1],
      [0,0,0,0,0,1,2,1,1,2,2,2,2,2,2,2,2,2,2,1,1,2,1,0,0,0,0,0],
      [1,1,1,1,1,1,2,1,1,2,1,1,1,4,4,1,1,1,2,1,1,2,1,1,1,1,1,1],
      [1,2,2,2,2,2,2,2,2,2,1,1,1,4,4,1,1,1,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,1,1,2,1,1,1,1,1,0,0,0,0,1,1,1,1,1,2,1,1,1,1,2,1],
      [1,2,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,2,1],
      [1,3,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,3,1],
      [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
  }

  /**
   * Draws a single wall tile with navy fill and blue neon glow.
   */
  drawWall(col, row) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#4a4aff';
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.restore();
  }

  /**
   * Draws a small white dot centered in the tile.
   */
  drawDot(col, row) {
    const cx = col * TILE_SIZE + TILE_SIZE / 2;
    const cy = row * TILE_SIZE + TILE_SIZE / 2;
    ctx.fillStyle = '#ffffff55';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draws a larger gold power pellet that pulses using a sin wave.
   */
  drawPowerPellet(col, row, time) {
    const cx = col * TILE_SIZE + TILE_SIZE / 2;
    const cy = row * TILE_SIZE + TILE_SIZE / 2;
    // Pulse radius nearly fills tile; sin wave for animation
    const pulse = (TILE_SIZE / 2 - 2) + Math.sin(time / 120) * 1;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draws the ghost house door (treat as walkable, no dot — just visual marker).
   * Rendered as a thin horizontal bar so entities can pass through.
   */
  drawGhostDoor(col, row) {
    ctx.fillStyle = '#6272a4';
    ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE + TILE_SIZE / 2 - 2, TILE_SIZE, 4);
  }

  /**
   * Renders the entire maze. Called each frame.
   * @param {number} time - Current timestamp (from performance.now) for power pellet pulse.
   */
  draw(time) {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tile = this.grid[row][col];
        switch (tile) {
          case TILE_WALL:
            this.drawWall(col, row);
            break;
          case TILE_DOT:
            this.drawDot(col, row);
            break;
          case TILE_POWER:
            this.drawPowerPellet(col, row, time);
            break;
          case TILE_GHOST_DOOR:
            this.drawGhostDoor(col, row);
            break;
          case TILE_PATH:
          default:
            // Paths are empty (background shows through)
            break;
        }
      }
    }
  }
}

// --- PacMan Class ---
/**
 * Pac-Man player. Moves tile-by-tile, eats dots, blocked by walls.
 * Gold circle with animated mouth and glow.
 */
class PacMan {
  constructor(maze) {
    this.maze = maze;
    this.gridRow = PAC_START_ROW;
    this.gridCol = PAC_START_COL;
    // Pixel position (center of Pac-Man) for smooth movement
    this.pixelX = PAC_START_COL * TILE_SIZE + TILE_SIZE / 2;
    this.pixelY = PAC_START_ROW * TILE_SIZE + TILE_SIZE / 2;
    // Direction: 0=right, 1=down, 2=left, 3=up
    this.direction = 0;
    this.nextDirection = 0;
    // Target tile we are moving toward (null when idle at tile center)
    this.targetCol = null;
    this.targetRow = null;
  }

  /**
   * Returns true if the given tile is walkable (not a wall).
   * Tunnel wrap: col -1 allowed from (0, tunnelRow), col COLS allowed from (COLS-1, tunnelRow).
   */
  canMoveTo(col, row) {
    if (row < 0 || row >= ROWS) return false;
    if (col === -1) return isTunnelRow(row) && this.gridCol === 0;
    if (col === COLS) return isTunnelRow(row) && this.gridCol === COLS - 1;
    if (col < 0 || col >= COLS) return false;
    return this.maze.grid[row][col] !== TILE_WALL;
  }

  /**
   * Direction to delta (col, row). 0=right, 1=down, 2=left, 3=up.
   */
  getDirectionDelta(dir) {
    const deltas = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    return deltas[dir];
  }

  /**
   * Sets the desired movement direction from arrow key input.
   */
  setNextDirection(dir) {
    this.nextDirection = dir;
  }

  /**
   * Updates position. Moves toward target tile, eats dots and power pellets, applies queued direction.
   * @param {number} deltaTime - Time since last frame in seconds.
   * @returns {{ pointsEarned: number, powerPelletEaten: boolean }}
   */
  update(deltaTime) {
    let pointsEarned = 0;
    let powerPelletEaten = false;

    // If we have no target, try to apply next direction
    if (this.targetCol === null && this.targetRow === null) {
      const [dCol, dRow] = this.getDirectionDelta(this.nextDirection);
      const nextCol = this.gridCol + dCol;
      const nextRow = this.gridRow + dRow;
      if (this.canMoveTo(nextCol, nextRow)) {
        this.direction = this.nextDirection;
        this.targetCol = nextCol;
        this.targetRow = nextRow;
      } else {
        // Try current direction if next not valid
        const [cdCol, cdRow] = this.getDirectionDelta(this.direction);
        const cNextCol = this.gridCol + cdCol;
        const cNextRow = this.gridRow + cdRow;
        if (this.canMoveTo(cNextCol, cNextRow)) {
          this.targetCol = cNextCol;
          this.targetRow = cNextRow;
        }
      }
    }

    // Move toward target (compute target pixel after possibly setting a new target above)
    if (this.targetCol !== null && this.targetRow !== null) {
      const targetCenterX = this.targetCol === -1 ? -TILE_SIZE / 2 : this.targetCol === COLS ? COLS * TILE_SIZE + TILE_SIZE / 2 : this.targetCol * TILE_SIZE + TILE_SIZE / 2;
      const targetCenterY = this.targetRow * TILE_SIZE + TILE_SIZE / 2;
      const moveDist = PAC_SPEED * deltaTime;
      const dx = targetCenterX - this.pixelX;
      const dy = targetCenterY - this.pixelY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= moveDist) {
        // Arrived at target — apply tunnel wrap so gridCol stays in [0, COLS-1]
        let arrivedCol = this.targetCol;
        let arrivedRow = this.targetRow;
        if (this.targetCol === -1) {
          arrivedCol = COLS - 1;
          this.pixelX = arrivedCol * TILE_SIZE + TILE_SIZE / 2;
        } else if (this.targetCol === COLS) {
          arrivedCol = 0;
          this.pixelX = TILE_SIZE / 2;
        } else {
          this.pixelX = this.targetCol * TILE_SIZE + TILE_SIZE / 2;
        }
        this.pixelY = this.targetRow * TILE_SIZE + TILE_SIZE / 2;
        this.gridCol = arrivedCol;
        this.gridRow = arrivedRow;
        this.targetCol = null;
        this.targetRow = null;

        // Eat dot or power pellet if present (at wrapped tile)
        const tile = this.maze.grid[this.gridRow][this.gridCol];
        if (tile === TILE_DOT) {
          this.maze.grid[this.gridRow][this.gridCol] = TILE_PATH;
          pointsEarned = DOT_SCORE;
        } else if (tile === TILE_POWER) {
          this.maze.grid[this.gridRow][this.gridCol] = TILE_PATH;
          powerPelletEaten = true;
        }
      } else {
        this.pixelX += (dx / dist) * moveDist;
        this.pixelY += (dy / dist) * moveDist;
      }
    }

    return { pointsEarned, powerPelletEaten };
  }

  /**
   * Draws Pac-Man as a gold circle with animated mouth and glow.
   * @param {number} time - Current timestamp for mouth animation.
   */
  draw(time) {
    ctx.save();

    // Reset any lingering context state from maze drawing
    ctx.shadowBlur = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // When in tunnel (off-screen left/right), wrap draw X so character stays visible
    let drawX = this.pixelX;
    if (drawX < 0) drawX += CANVAS_WIDTH;
    else if (drawX >= CANVAS_WIDTH) drawX -= CANVAS_WIDTH;
    ctx.translate(drawX, this.pixelY);

    // Direction in radians: 0=right, 1=down, 2=left, 3=up
    const dirAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    ctx.rotate(dirAngles[this.direction]);

    // Gold glow — bold, chunky look per reference
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffd700';

    ctx.fillStyle = '#ffd700';
    // Nearly fill the tile: solid, chunky circle (0.9 so body looks bold, not small)
    const radius = TILE_SIZE * 0.55;

    // Mouth: clean wedge that opens to ~45° at widest, closes to a small slit. Smooth sin-wave animation.
    const t = (typeof time === 'number' && !isNaN(time)) ? time : 0;
    const mouthOpenRad = (45 * Math.PI) / 180;   // 45° at widest (clearly visible)
    const mouthShutRad = (6 * Math.PI) / 180;    // nearly shut for smooth close
    // Cycle ~every 400ms so open/close is clearly visible at game speed (t in ms)
    const mouthAngle = mouthShutRad + (mouthOpenRad - mouthShutRad) * (0.5 + 0.5 * Math.sin(t / 65));
    const startAngle = mouthAngle / 2;
    const endAngle = Math.PI * 2 - mouthAngle / 2;

    // counterclockwise = false so we draw the large body arc (clockwise from start to end), not the small mouth wedge
    ctx.beginPath();
    ctx.arc(0, 0, radius, startAngle, endAngle, false);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

// --- Ghost Class ---
/**
 * Ghost (Blinky). Moves tile-by-tile, chooses direction at intersections
 * to move closest to Pac-Man. Circle with flat bottom and two bumps, eyes with pupils.
 */
/** Ghost personality: 'blinky' chase + fast, 'pinky' cut-off, 'inky' random, 'clyde' chase or flee */
class Ghost {
  constructor(maze, color, startRow, startCol, personality = 'blinky') {
    this.maze = maze;
    this.color = color;
    this.personality = personality;
    this.homeRow = startRow;
    this.homeCol = startCol;
    this.gridRow = startRow;
    this.gridCol = startCol;
    this.pixelX = startCol * TILE_SIZE + TILE_SIZE / 2;
    this.pixelY = startRow * TILE_SIZE + TILE_SIZE / 2;
    this.direction = 0;  // 0=right, 1=down, 2=left, 3=up
    this.targetCol = null;
    this.targetRow = null;
    // Blinky is 10% faster; others use base GHOST_SPEED
    this.speedMultiplier = personality === 'blinky' ? 1.1 : 1;
  }

  /** Resets ghost to ghost house. */
  resetToHouse() {
    this.gridRow = this.homeRow;
    this.gridCol = this.homeCol;
    this.pixelX = this.homeCol * TILE_SIZE + TILE_SIZE / 2;
    this.pixelY = this.homeRow * TILE_SIZE + TILE_SIZE / 2;
    this.targetCol = null;
    this.targetRow = null;
  }

  /**
   * Returns true if the tile is walkable (not a wall).
   * Tunnel wrap: col -1 allowed from (0, tunnelRow), col COLS allowed from (COLS-1, tunnelRow).
   */
  canMoveTo(col, row) {
    if (row < 0 || row >= ROWS) return false;
    if (col === -1) {
      const mazeWrapOk = row >= 0 && row < ROWS && this.maze.grid[row] && this.maze.grid[row][COLS - 1] !== TILE_WALL;
      return this.gridCol === 0 && mazeWrapOk;
    }
    if (col === COLS) {
      const rowOk = row >= 0 && row < ROWS && this.maze.grid[row];
      const mazeWrapOk = rowOk && this.maze.grid[row][0] !== TILE_WALL;
      return this.gridCol === COLS - 1 && mazeWrapOk;
    }
    if (col < 0 || col >= COLS) return false;
    return this.maze.grid[row][col] !== TILE_WALL;
  }

  /**
   * Direction to delta (col, row). 0=right, 1=down, 2=left, 3=up.
   */
  getDirectionDelta(dir) {
    const deltas = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    return deltas[dir];
  }

  /**
   * Manhattan distance from (col, row) to (targetCol, targetRow).
   * For tunnel wrap, use effective col: -1 -> COLS-1, COLS -> 0.
   */
  distanceTo(col, row, targetCol, targetRow) {
    const effCol = col === -1 ? COLS - 1 : col === COLS ? 0 : col;
    return Math.abs(effCol - targetCol) + Math.abs(row - targetRow);
  }

  /**
   * At an intersection, pick direction: when frightened (or Inky) use random;
   * else chase the given target. Never reverse (no 180° turn).
   */
  chooseDirection(targetCol, targetRow, frightened) {
    const reverseDirs = [2, 3, 0, 1];
    const currentReverse = reverseDirs[this.direction];
    const options = [];

    for (let dir = 0; dir < 4; dir++) {
      if (dir === currentReverse) continue;
      const [dCol, dRow] = this.getDirectionDelta(dir);
      const nextCol = this.gridCol + dCol;
      const nextRow = this.gridRow + dRow;
      if (!this.canMoveTo(nextCol, nextRow)) continue;
      options.push({ dir, dist: this.distanceTo(nextCol, nextRow, targetCol, targetRow) });
    }

    if (options.length === 0) return this.direction;
    // Frightened or Inky: pick random valid direction
    if (frightened || this.personality === 'inky') return options[Math.floor(Math.random() * options.length)].dir;
    // Chase: pick direction that minimizes distance to target
    let best = options[0];
    for (let i = 1; i < options.length; i++) {
      if (options[i].dist < best.dist) best = options[i];
    }
    return best.dir;
  }

  /**
   * Updates position. When reaching a tile center, chooses next direction based on personality.
   * pacmanCol, pacmanRow, pacmanDirection (0–3) used to compute each ghost's target.
   */
  update(deltaTime, pacmanCol, pacmanRow, pacmanDirection, frightened) {
    if (this.targetCol === null && this.targetRow === null) {
      // Compute this ghost's chase target from personality
      let targetCol = pacmanCol;
      let targetRow = pacmanRow;
      if (!frightened) {
        if (this.personality === 'pinky') {
          // Target 4 tiles ahead of Pac-Man in his facing direction (cut him off)
          const [dCol, dRow] = this.getDirectionDelta(pacmanDirection);
          targetCol = Math.max(0, Math.min(COLS - 1, pacmanCol + 4 * dCol));
          targetRow = Math.max(0, Math.min(ROWS - 1, pacmanRow + 4 * dRow));
        } else if (this.personality === 'clyde') {
          const dist = this.distanceTo(this.gridCol, this.gridRow, pacmanCol, pacmanRow);
          if (dist <= 8) {
            // Within 8 tiles: run toward bottom-left corner (erratic)
            targetCol = 0;
            targetRow = ROWS - 1;
          }
          // else keep target = Pac-Man (chase)
        }
        // Blinky and Inky: targetCol/targetRow already Pac-Man; Inky ignores it (random in chooseDirection)
      }
      this.direction = this.chooseDirection(targetCol, targetRow, frightened);
      const [dCol, dRow] = this.getDirectionDelta(this.direction);
      const nextCol = this.gridCol + dCol;
      const nextRow = this.gridRow + dRow;
      if (this.canMoveTo(nextCol, nextRow)) {
        this.targetCol = nextCol;
        this.targetRow = nextRow;
      }
    }

    if (this.targetCol !== null && this.targetRow !== null) {
      const targetCenterX = this.targetCol === -1 ? -TILE_SIZE / 2 : this.targetCol === COLS ? COLS * TILE_SIZE + TILE_SIZE / 2 : this.targetCol * TILE_SIZE + TILE_SIZE / 2;
      const targetCenterY = this.targetRow * TILE_SIZE + TILE_SIZE / 2;
      const moveDist = GHOST_SPEED * this.speedMultiplier * deltaTime;
      const dx = targetCenterX - this.pixelX;
      const dy = targetCenterY - this.pixelY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= moveDist) {
        // Arrived — apply tunnel wrap so gridCol stays in [0, COLS-1]
        if (this.targetCol === -1) {
          this.gridCol = COLS - 1;
          this.pixelX = this.gridCol * TILE_SIZE + TILE_SIZE / 2;
        } else if (this.targetCol === COLS) {
          this.gridCol = 0;
          this.pixelX = TILE_SIZE / 2;
        } else {
          this.pixelX = this.targetCol * TILE_SIZE + TILE_SIZE / 2;
          this.gridCol = this.targetCol;
        }
        this.pixelY = this.targetRow * TILE_SIZE + TILE_SIZE / 2;
        this.gridRow = this.targetRow;
        this.targetCol = null;
        this.targetRow = null;
      } else {
        this.pixelX += (dx / dist) * moveDist;
        this.pixelY += (dy / dist) * moveDist;
      }
    }
  }

  /**
   * Draws ghost: semicircle top, straight sides, wavy bottom with 3 V notches.
   * When frightened uses dark blue. White oval eyes with small dark blue pupils.
   */
  draw(frightened) {
    ctx.save();

    ctx.shadowBlur = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // When in tunnel (off-screen left/right), wrap draw X so ghost stays visible
    let drawX = this.pixelX;
    if (drawX < 0) drawX += CANVAS_WIDTH;
    else if (drawX >= CANVAS_WIDTH) drawX -= CANVAS_WIDTH;
    ctx.translate(drawX, this.pixelY);

    const bodyColor = frightened ? '#6272a4' : this.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = bodyColor;

    const r = TILE_SIZE / 2 - 2;
    const skirtY = r * 0.55;
    const vDepth = r * 0.18;

    // Body: start bottom left, line up left, semicircle across top, line down right, three V notches along bottom
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-r, skirtY);                           // bottom left
    ctx.lineTo(-r, 0);                                // straight up left side
    ctx.arc(0, 0, r, Math.PI, 0);                    // semicircle across top (left to right)
    ctx.lineTo(r, skirtY);                            // straight down right side
    ctx.lineTo(r * 0.5, skirtY + vDepth);             // first V: point down
    ctx.lineTo(r * 0.33, skirtY);                     // back up
    ctx.lineTo(0, skirtY + vDepth);                   // second V: point down
    ctx.lineTo(-r * 0.33, skirtY);                    // back up
    ctx.lineTo(-r * 0.5, skirtY + vDepth);            // third V: point down
    ctx.lineTo(-r, skirtY);                           // back to bottom left
    ctx.closePath();
    ctx.fill();

    // Two white oval eyes in the upper half
    const eyeX = r * 0.32;
    const eyeY = -r * 0.28;
    const eyeW = r * 0.22;
    const eyeH = r * 0.14;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-eyeX, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeX, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Small dark blue pupils (offset by movement direction)
    const dirAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const look = dirAngles[this.direction];
    const pupilOff = r * 0.08;
    const px = Math.cos(look) * pupilOff;
    const py = Math.sin(look) * pupilOff;

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(-eyeX + px, eyeY + py, r * 0.08, 0, Math.PI * 2);
    ctx.arc(eyeX + px, eyeY + py, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// --- Game state ---
const maze = new Maze();
const pacman = new PacMan(maze);
const ghosts = [
  new Ghost(maze, '#ff4560', GHOST_HOUSE_ROW, 13, 'blinky'),   // Red: chases directly, 10% faster
  new Ghost(maze, '#ffb8ff', GHOST_HOUSE_ROW, 14, 'pinky'),    // Pink: targets 4 tiles ahead of Pac-Man
  new Ghost(maze, '#50fa7b', GHOST_HOUSE_ROW, 15, 'inky'),     // Green: random at each intersection
  new Ghost(maze, '#ffb86c', 12, 13, 'clyde')                 // Orange: chase when far, flee to corner when close
];
let score = 0;
let lives = MAX_LIVES;
let lastTimestamp = 0;
let gameState = STATE_TITLE;
let frightenedUntil = 0;
/** When we entered READY state (timestamp). Used to wait 2 seconds before PLAYING. */
let readyStartTime = 0;

/**
 * Clears the canvas and fills with the dark background color.
 */
function clearCanvas() {
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/** Resets Pac-Man to start position. */
function resetPacman() {
  pacman.gridRow = PAC_START_ROW;
  pacman.gridCol = PAC_START_COL;
  pacman.pixelX = PAC_START_COL * TILE_SIZE + TILE_SIZE / 2;
  pacman.pixelY = PAC_START_ROW * TILE_SIZE + TILE_SIZE / 2;
  pacman.direction = 0;
  pacman.nextDirection = 0;
  pacman.targetCol = null;
  pacman.targetRow = null;
}

/**
 * Full game reset: restore maze dots, score 0, lives 3, Pac-Man and ghosts to start.
 * Used when restarting after Game Over. Does not change game state (caller sets READY).
 */
function fullReset() {
  maze.reset();
  score = 0;
  lives = MAX_LIVES;
  frightenedUntil = 0;
  resetPacman();
  for (let i = 0; i < ghosts.length; i++) {
    ghosts[i].resetToHouse();
  }
  const scoreEl = document.getElementById('score-value');
  if (scoreEl) scoreEl.textContent = '0';
  const livesEl = document.getElementById('lives-value');
  if (livesEl) livesEl.textContent = String(MAX_LIVES);
}

/** Returns true if any ghost is frightened (global timer). */
function isFrightened() {
  return Date.now() < frightenedUntil;
}

/**
 * Draws title screen: "Kaya's Pac-Man Game" in gold, "Press any key to start" blinking.
 */
function drawTitleScreen(timestamp) {
  clearCanvas();
  ctx.save();
  ctx.font = 'bold 36px Orbitron, monospace';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("Kaya's Pac-Man Game", canvas.width / 2, canvas.height / 2 - 30);

  ctx.font = '18px Orbitron, monospace';
  ctx.fillStyle = '#ffffff';
  const blink = Math.floor(timestamp / 500) % 2 === 0;
  if (blink) {
    ctx.fillText('Press any key to start', canvas.width / 2, canvas.height / 2 + 30);
  }
  ctx.restore();
}

/**
 * Draws game over screen: "GAME OVER" and final score.
 */
function drawGameOverScreen() {
  clearCanvas();
  ctx.save();
  ctx.font = 'bold 36px Orbitron, monospace';
  ctx.fillStyle = '#ff4560';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);

  ctx.font = '24px Orbitron, monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 30);
  ctx.restore();
}

/**
 * Main game loop. Called once per frame via requestAnimationFrame.
 */
function gameLoop(timestamp) {
  const deltaTime = lastTimestamp === 0 ? 1 / 60 : (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  if (gameState === STATE_TITLE) {
    drawTitleScreen(timestamp);
    requestAnimationFrame(gameLoop);
    return;
  }

  if (gameState === STATE_GAME_OVER) {
    drawGameOverScreen();
    requestAnimationFrame(gameLoop);
    return;
  }

  // READY: show maze, Pac-Man and ghosts at start positions, "READY!" overlay; after 2s go to PLAYING
  if (gameState === STATE_READY) {
    clearCanvas();
    maze.draw(timestamp);
    pacman.draw(typeof timestamp === 'number' ? timestamp : performance.now());
    for (let i = 0; i < ghosts.length; i++) ghosts[i].draw(false);

    ctx.save();
    ctx.font = '18px Orbitron, monospace';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('READY!', canvas.width / 2, canvas.height / 2);
    ctx.restore();

    if (timestamp - readyStartTime >= 2000) {
      gameState = STATE_PLAYING;
    }
    requestAnimationFrame(gameLoop);
    return;
  }

  clearCanvas();
  maze.draw(timestamp);

  const updateResult = pacman.update(deltaTime);
  score += updateResult.pointsEarned;

  if (updateResult.powerPelletEaten) {
    frightenedUntil = Date.now() + FRIGHTENED_DURATION_MS;
  }

  const frightened = isFrightened();
  for (let i = 0; i < ghosts.length; i++) {
    const g = ghosts[i];
    if (pacman.gridCol === g.gridCol && pacman.gridRow === g.gridRow) {
      if (frightened) {
        score += GHOST_EAT_SCORE;
        g.resetToHouse();
      } else {
        lives--;
        const livesEl = document.getElementById('lives-value');
        if (livesEl) livesEl.textContent = lives;
        resetPacman();
        if (lives <= 0) {
          gameState = STATE_GAME_OVER;
          if (livesEl) livesEl.textContent = '0';
        }
        break;
      }
    }
  }

  const scoreEl = document.getElementById('score-value');
  if (scoreEl) scoreEl.textContent = score;
  const livesEl = document.getElementById('lives-value');
  if (livesEl) livesEl.textContent = lives;

  pacman.draw(typeof timestamp === 'number' ? timestamp : performance.now());

  for (let i = 0; i < ghosts.length; i++) {
    ghosts[i].update(deltaTime, pacman.gridCol, pacman.gridRow, pacman.direction, frightened);
    ghosts[i].draw(frightened);
  }

  requestAnimationFrame(gameLoop);
}

// --- Keyboard input ---
document.addEventListener('keydown', (e) => {
  if (gameState === STATE_TITLE) {
    e.preventDefault();
    gameState = STATE_READY;
    readyStartTime = performance.now();
    return;
  }
  // After Game Over, any key fully resets the game and goes to READY
  if (gameState === STATE_GAME_OVER) {
    e.preventDefault();
    fullReset();
    gameState = STATE_READY;
    readyStartTime = performance.now();
    return;
  }
  if (gameState !== STATE_PLAYING) return;
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    pacman.setNextDirection(0);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    pacman.setNextDirection(1);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    pacman.setNextDirection(2);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    pacman.setNextDirection(3);
  }
});

// --- Touch input (swipe on canvas + tap to start/restart) ---
const SWIPE_THRESHOLD_PX = 30;
let touchStartX = null;
let touchStartY = null;

canvas.addEventListener('touchstart', (e) => {
  // Title or Game Over: tap to start or restart (same as keydown)
  if (gameState === STATE_TITLE) {
    e.preventDefault();
    gameState = STATE_READY;
    readyStartTime = performance.now();
    return;
  }
  if (gameState === STATE_GAME_OVER) {
    e.preventDefault();
    fullReset();
    gameState = STATE_READY;
    readyStartTime = performance.now();
    return;
  }
  if (gameState !== STATE_PLAYING || !e.touches.length) return;
  e.preventDefault();
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  if (touchStartX === null || touchStartY === null || !e.changedTouches.length) return;
  if (gameState !== STATE_PLAYING) {
    touchStartX = null;
    touchStartY = null;
    return;
  }
  e.preventDefault();
  const endX = e.changedTouches[0].clientX;
  const endY = e.changedTouches[0].clientY;
  const dx = endX - touchStartX;
  const dy = endY - touchStartY;
  touchStartX = null;
  touchStartY = null;

  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < SWIPE_THRESHOLD_PX) return;

  // Dominant axis: horizontal vs vertical; direction 0=right, 1=down, 2=left, 3=up
  if (Math.abs(dx) > Math.abs(dy)) {
    pacman.setNextDirection(dx > 0 ? 0 : 2);
  } else {
    pacman.setNextDirection(dy > 0 ? 1 : 3);
  }
}, { passive: false });

canvas.addEventListener('touchcancel', () => {
  touchStartX = null;
  touchStartY = null;
});

// --- Start the game loop ---
requestAnimationFrame(gameLoop);
