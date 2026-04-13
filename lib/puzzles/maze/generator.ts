/**
 * Maze Puzzle Generator
 * Uses iterative backtracking (depth-first search) to carve a perfect maze.
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
  solution: [number, number][];
  difficulty: MazeDifficulty;
  theme: string;
}

const GRID_SIZES: Record<MazeDifficulty, number> = {
  easy:   10,
  normal: 14,
  hard:   18,
};

// Inline direction data — avoids any module-level const lookup issues
// Each entry: [wallKey, oppositeWall, rowDelta, colDelta]
type DirEntry = ['top' | 'right' | 'bottom' | 'left', 'top' | 'right' | 'bottom' | 'left', number, number];

const DIRS: DirEntry[] = [
  ['top',    'bottom',  -1,  0],
  ['bottom', 'top',      1,  0],
  ['left',   'right',    0, -1],
  ['right',  'left',     0,  1],
];

function makeGrid(size: number): MazeCell[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      walls: { top: true, right: true, bottom: true, left: true },
      visited: false,
    })),
  );
}

function shuffleDirs(): DirEntry[] {
  const a: DirEntry[] = [
    ['top',    'bottom',  -1,  0],
    ['bottom', 'top',      1,  0],
    ['left',   'right',    0, -1],
    ['right',  'left',     0,  1],
  ];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// ─── Iterative DFS carver (avoids recursion depth limits) ─────────────────────

function carve(grid: MazeCell[][], size: number): void {
  const stack: [number, number][] = [[0, 0]];
  grid[0][0].visited = true;

  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    const row = top[0];
    const col = top[1];

    const dirs = shuffleDirs();
    let moved = false;

    for (let d = 0; d < dirs.length; d++) {
      const dir   = dirs[d][0];
      const opp   = dirs[d][1];
      const dr    = dirs[d][2];
      const dc    = dirs[d][3];
      const nr    = row + dr;
      const nc    = col + dc;

      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !grid[nr][nc].visited) {
        grid[row][col].walls[dir] = false;
        grid[nr][nc].walls[opp]   = false;
        grid[nr][nc].visited       = true;
        stack.push([nr, nc]);
        moved = true;
        break;
      }
    }

    if (!moved) stack.pop();
  }
}

// ─── BFS solution finder ──────────────────────────────────────────────────────

function findSolution(grid: MazeCell[][], size: number): [number, number][] {
  const queue: [number, number][] = [[0, 0]];
  const prev = new Map<string, [number, number] | null>();
  prev.set('0,0', null);

  const endR = size - 1;
  const endC = size - 1;

  outer: while (queue.length > 0) {
    const cur = queue.shift()!;
    const r = cur[0];
    const c = cur[1];

    if (r === endR && c === endC) break outer;

    const cell = grid[r][c];
    for (let d = 0; d < DIRS.length; d++) {
      const dir = DIRS[d][0];
      const dr  = DIRS[d][2];
      const dc  = DIRS[d][3];
      if (!cell.walls[dir]) {
        const nr  = r + dr;
        const nc  = c + dc;
        const key = nr + ',' + nc;
        if (!prev.has(key)) {
          prev.set(key, [r, c]);
          queue.push([nr, nc]);
        }
      }
    }
  }

  // Reconstruct path from end back to start
  const path: [number, number][] = [];
  let node: [number, number] | null | undefined = [endR, endC];
  while (node != null) {
    path.unshift(node);
    node = prev.get(node[0] + ',' + node[1]);
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

  carve(grid, size);

  // Open entrance and exit
  grid[0][0].walls.top                   = false;
  grid[size - 1][size - 1].walls.bottom  = false;

  const solution = findSolution(grid, size);

  return { grid, rows: size, cols: size, solution, difficulty, theme };
}
