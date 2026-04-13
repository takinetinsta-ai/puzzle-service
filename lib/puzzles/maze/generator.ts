/**
 * Maze Puzzle Generator
 * Uses recursive backtracking (depth-first search) to carve a perfect maze.
 * Every maze has exactly one solution path from top-left to bottom-right.
 *
 * Difficulty controls grid size:
 *   Easy:   10×10
 *   Normal: 14×14
 *   Hard:   18×18
 */

export type MazeDifficulty = 'easy' | 'normal' | 'hard';

export interface MazeCell {
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

export interface MazePuzzle {
  grid: MazeCell[][];
  rows: number;
  cols: number;
  solution: [number, number][];   // ordered list of [row, col] from start to end
  difficulty: MazeDifficulty;
  theme: string;
}

const GRID_SIZES: Record<MazeDifficulty, number> = {
  easy:   10,
  normal: 14,
  hard:   18,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGrid(size: number): MazeCell[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      walls: { top: true, right: true, bottom: true, left: true },
      visited: false,
    })),
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Direction = 'top' | 'right' | 'bottom' | 'left';

const OPPOSITE: Record<Direction, Direction> = {
  top: 'bottom', bottom: 'top', left: 'right', right: 'left',
};

const DELTAS: Record<Direction, [number, number]> = {
  top:    [-1,  0],
  bottom: [ 1,  0],
  left:   [ 0, -1],
  right:  [ 0,  1],
};

// ─── Recursive backtracking carver ───────────────────────────────────────────

function carve(grid: MazeCell[][], row: number, col: number): void {
  grid[row][col].visited = true;

  for (const dir of shuffle(['top', 'right', 'bottom', 'left'] as Direction[])) {
    const [dr, dc] = DELTAS[dir];
    const nr = row + dr;
    const nc = col + dc;

    if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length && !grid[nr][nc].visited) {
      grid[row][col].walls[dir] = false;
      grid[nr][nc].walls[OPPOSITE[dir]] = false;
      carve(grid, nr, nc);
    }
  }
}

// ─── BFS solution finder ──────────────────────────────────────────────────────

function findSolution(grid: MazeCell[][], size: number): [number, number][] {
  const start: [number, number] = [0, 0];
  const end: [number, number] = [size - 1, size - 1];

  const queue: [number, number][] = [start];
  const prev = new Map<string, [number, number] | null>();
  prev.set('0,0', null);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r === end[0] && c === end[1]) break;

    const cell = grid[r][c];
    for (const dir of ['top', 'right', 'bottom', 'left'] as Direction[]) {
      if (!cell.walls[dir]) {
        const [dr, dc] = DELTAS[dir];
        const nr = r + dr;
        const nc = c + dc;
        const key = `${nr},${nc}`;
        if (!prev.has(key)) {
          prev.set(key, [r, c]);
          queue.push([nr, nc]);
        }
      }
    }
  }

  // Reconstruct path
  const path: [number, number][] = [];
  let cur: [number, number] | null = end;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev.get(`${cur[0]},${cur[1]}`) ?? null;
  }
  return path;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateMaze(
  theme: string,
  difficulty: MazeDifficulty = 'normal',
): MazePuzzle {
  const size = GRID_SIZES[difficulty];
  const grid = makeGrid(size);

  // Carve from top-left
  carve(grid, 0, 0);

  // Open entrance (top of [0,0]) and exit (bottom of [size-1][size-1])
  grid[0][0].walls.top = false;
  grid[size - 1][size - 1].walls.bottom = false;

  const solution = findSolution(grid, size);

  return { grid, rows: size, cols: size, solution, difficulty, theme };
}
