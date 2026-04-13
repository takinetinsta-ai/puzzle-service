/**
 * Sudoku Puzzle Generator
 * Generates a valid 9×9 Sudoku puzzle and its complete solution.
 * Difficulty is controlled by clue count:
 *   Easy:   36–45 clues
 *   Normal: 28–35 clues
 *   Hard:   22–27 clues
 */

export type SudokuDifficulty = 'easy' | 'normal' | 'hard';

export interface SudokuPuzzle {
  puzzle: (number | null)[][];   // null = empty cell
  solution: number[][];
  difficulty: SudokuDifficulty;
}

// ─── Core solver helpers ──────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emptyGrid(): number[][] {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function isValid(grid: number[][], row: number, col: number, num: number): boolean {
  // Row check
  if (grid[row].includes(num)) return false;
  // Column check
  if (grid.some(r => r[col] === num)) return false;
  // 3×3 box check
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

function fillGrid(grid: number[][]): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

/**
 * Counts solutions (stops early at 2 to detect uniqueness).
 */
function countSolutions(grid: (number | null)[][], limit = 2): number {
  let count = 0;
  const g = grid.map(row => [...row]);

  function solve(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (g[row][col] === null || g[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            const cell = g[row][col];
            g[row][col] = num;
            if (isValidFull(g, row, col, num)) {
              if (solve()) {
                if (count >= limit) return true;
              }
            }
            g[row][col] = cell;
          }
          return false;
        }
      }
    }
    count++;
    return count >= limit;
  }

  solve();
  return count;
}

function isValidFull(grid: (number | null)[][], row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (c !== col && grid[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (r !== row && grid[r][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && grid[r][c] === num) return false;
    }
  }
  return true;
}

// ─── Difficulty settings ──────────────────────────────────────────────────────

const CLUE_COUNTS: Record<SudokuDifficulty, number> = {
  easy:   42,
  normal: 32,
  hard:   25,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateSudoku(difficulty: SudokuDifficulty = 'normal'): SudokuPuzzle {
  // 1. Generate a complete solution
  const solution = emptyGrid();
  fillGrid(solution);

  // 2. Remove cells to reach target clue count
  const targetClues = CLUE_COUNTS[difficulty];
  const puzzle: (number | null)[][] = solution.map(row => [...row] as (number | null)[]);

  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
  );

  let cluesRemaining = 81;

  for (const [row, col] of positions) {
    if (cluesRemaining <= targetClues) break;
    const backup = puzzle[row][col];
    puzzle[row][col] = null;
    // Only remove if still has unique solution
    if (countSolutions(puzzle) !== 1) {
      puzzle[row][col] = backup;
    } else {
      cluesRemaining--;
    }
  }

  return { puzzle, solution, difficulty };
}
