/**
 * Word Search Puzzle Generator
 * Places themed words in a letter grid in 8 directions.
 * Difficulty controls grid size:
 *   Easy:   12×12
 *   Normal: 15×15
 *   Hard:   18×18
 */

export type WordSearchDifficulty = 'easy' | 'normal' | 'hard';

export interface WordSearchPuzzle {
  grid: string[][];
  words: string[];       // words to find (uppercase)
  placed: string[];      // words actually placed (some may not fit)
  theme: string;
  difficulty: WordSearchDifficulty;
  rows: number;
  cols: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRID_SIZES: Record<WordSearchDifficulty, number> = {
  easy: 12,
  normal: 15,
  hard: 18,
};

// 8 directions: [rowDelta, colDelta]
const DIRECTIONS: [number, number][] = [
  [0, 1],   // right
  [0, -1],  // left
  [1, 0],   // down
  [-1, 0],  // up
  [1, 1],   // down-right
  [1, -1],  // down-left
  [-1, 1],  // up-right
  [-1, -1], // up-left
];

// Hard mode excludes reverse/diagonal directions
const DIRECTIONS_EASY: [number, number][] = [
  [0, 1],   // right
  [1, 0],   // down
  [1, 1],   // down-right
];

function randomChar(): string {
  return String.fromCharCode(65 + Math.floor(Math.random() * 26));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function canPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
): boolean {
  const size = grid.length;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (grid[r][c] !== '' && grid[r][c] !== word[i]) return false;
  }
  return true;
}

function placeWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
): void {
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateWordSearch(
  wordList: string[],
  theme: string,
  difficulty: WordSearchDifficulty = 'normal',
  maxWords = 18,
): WordSearchPuzzle {
  const size = GRID_SIZES[difficulty];
  const dirs = difficulty === 'easy' ? DIRECTIONS_EASY : DIRECTIONS;

  // Create empty grid
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));

  const words = shuffle(wordList)
    .map(w => w.toUpperCase().replace(/\s/g, ''))
    .filter(w => w.length >= 3 && w.length <= size)
    .slice(0, maxWords);

  const placed: string[] = [];

  for (const word of words) {
    let success = false;
    const attempts = 200;
    for (let attempt = 0; attempt < attempts && !success; attempt++) {
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
      if (canPlace(grid, word, row, col, dr, dc)) {
        placeWord(grid, word, row, col, dr, dc);
        placed.push(word);
        success = true;
      }
    }
  }

  // Fill empty cells with random letters
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') grid[r][c] = randomChar();
    }
  }

  return { grid, words: placed, placed, theme, difficulty, rows: size, cols: size };
}
