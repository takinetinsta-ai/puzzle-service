/**
 * Crossword Puzzle Generator
 * Uses a backtracking algorithm to place words on a grid.
 * Words are placed horizontally or vertically, sharing letters where possible.
 * 
 * Input: list of { word, clue } pairs (from themed wordlist)
 * Output: grid, numbered cells, across/down clues
 */

export type CrosswordDifficulty = 'easy' | 'normal' | 'hard';

export interface ClueEntry {
  word: string;
  clue: string;
}

export interface CrosswordClue {
  number: number;
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
}

export interface CrosswordCell {
  letter: string | null;   // null = black/empty cell
  number?: number;          // clue number if this is the start of an answer
}

export interface CrosswordPuzzle {
  grid: CrosswordCell[][];
  acrossClues: CrosswordClue[];
  downClues: CrosswordClue[];
  rows: number;
  cols: number;
  theme: string;
  difficulty: CrosswordDifficulty;
}

// ─── Grid size by difficulty ──────────────────────────────────────────────────

const GRID_SIZES: Record<CrosswordDifficulty, number> = {
  easy:   11,
  normal: 13,
  hard:   15,
};

// ─── Placement engine ─────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Placement {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
}

function canPlace(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dir: 'across' | 'down',
  size: number,
): boolean {
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;

  // Check the cell before start is empty (boundary)
  const preR = row - dr;
  const preC = col - dc;
  if (preR >= 0 && preC >= 0 && grid[preR][preC] !== null) return false;

  // Check the cell after end is empty (boundary)
  const endR = row + dr * word.length;
  const endC = col + dc * word.length;
  if (endR < size && endC < size && grid[endR][endC] !== null) return false;

  let intersects = false;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r >= size || c >= size) return false;

    const existing = grid[r][c];
    if (existing === null) {
      // Check perpendicular neighbors — don't allow adjacency without intersection
      const perpR = r + dc; // perpendicular
      const perpC = c + dr;
      const perpR2 = r - dc;
      const perpC2 = c - dr;
      const hasNeighbor =
        (perpR < size && perpR >= 0 && perpC < size && perpC >= 0 && grid[perpR][perpC] !== null) ||
        (perpR2 < size && perpR2 >= 0 && perpC2 < size && perpC2 >= 0 && grid[perpR2][perpC2] !== null);
      if (hasNeighbor) return false;
    } else if (existing === word[i]) {
      intersects = true;
    } else {
      return false;
    }
  }

  return intersects;
}

function applyPlacement(
  grid: (string | null)[][],
  placement: Placement,
): void {
  const dr = placement.direction === 'down' ? 1 : 0;
  const dc = placement.direction === 'across' ? 1 : 0;
  for (let i = 0; i < placement.word.length; i++) {
    grid[placement.row + dr * i][placement.col + dc * i] = placement.word[i];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateCrossword(
  clueEntries: ClueEntry[],
  theme: string,
  difficulty: CrosswordDifficulty = 'normal',
): CrosswordPuzzle {
  const size = GRID_SIZES[difficulty];
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  const entries = shuffle(clueEntries)
    .map(e => ({ ...e, word: e.word.toUpperCase().replace(/\s/g, '') }))
    .filter(e => e.word.length >= 3 && e.word.length <= size);

  const placements: Placement[] = [];

  // Place first word in the center horizontally
  if (entries.length === 0) {
    return emptyPuzzle(theme, difficulty, size);
  }

  const first = entries[0];
  const startCol = Math.floor((size - first.word.length) / 2);
  const startRow = Math.floor(size / 2);
  for (let i = 0; i < first.word.length; i++) {
    grid[startRow][startCol + i] = first.word[i];
  }
  placements.push({ word: first.word, clue: first.clue, row: startRow, col: startCol, direction: 'across' });

  // Try to place remaining words
  for (let ei = 1; ei < entries.length; ei++) {
    const { word, clue } = entries[ei];
    let placed = false;

    for (const dir of shuffle(['across', 'down'] as ('across' | 'down')[])) {
      for (let row = 0; row < size && !placed; row++) {
        for (let col = 0; col < size && !placed; col++) {
          if (canPlace(grid, word, row, col, dir, size)) {
            applyPlacement(grid, { word, clue, row, col, direction: dir });
            placements.push({ word, clue, row, col, direction: dir });
            placed = true;
          }
        }
      }
    }
  }

  // Build output grid with CrosswordCell type
  const cellGrid: CrosswordCell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ letter: null })),
  );

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cellGrid[r][c] = { letter: grid[r][c] };
    }
  }

  // Number cells and build clue lists
  let clueNumber = 1;
  const acrossClues: CrosswordClue[] = [];
  const downClues: CrosswordClue[] = [];

  for (const pl of placements) {
    const existing =
      acrossClues.find(c => c.row === pl.row && c.col === pl.col) ||
      downClues.find(c => c.row === pl.row && c.col === pl.col);

    const num = existing ? existing.number : clueNumber++;

    if (!existing) {
      cellGrid[pl.row][pl.col].number = num;
    }

    const clueList: CrosswordClue = {
      number: num,
      word: pl.word,
      clue: pl.clue,
      row: pl.row,
      col: pl.col,
      direction: pl.direction,
    };

    if (pl.direction === 'across') acrossClues.push(clueList);
    else downClues.push(clueList);
  }

  acrossClues.sort((a, b) => a.number - b.number);
  downClues.sort((a, b) => a.number - b.number);

  return {
    grid: cellGrid,
    acrossClues,
    downClues,
    rows: size,
    cols: size,
    theme,
    difficulty,
  };
}

function emptyPuzzle(theme: string, difficulty: CrosswordDifficulty, size: number): CrosswordPuzzle {
  return {
    grid: Array.from({ length: size }, () => Array(size).fill({ letter: null })),
    acrossClues: [],
    downClues: [],
    rows: size,
    cols: size,
    theme,
    difficulty,
  };
}
