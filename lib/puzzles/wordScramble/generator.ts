/**
 * Word Scramble Puzzle Generator
 * Takes a themed word list and scrambles each word's letters.
 * Difficulty controls word length selection:
 *   Easy:   4–5 letter words
 *   Normal: 6–8 letter words
 *   Hard:   9–13 letter words
 */

export type ScrambleDifficulty = 'easy' | 'normal' | 'hard';

export interface WordScramblePuzzle {
  items: ScrambleItem[];
  theme: string;
  difficulty: ScrambleDifficulty;
}

export interface ScrambleItem {
  scrambled: string;
  answer: string;
  hint?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffleString(str: string): string {
  const arr = str.toUpperCase().split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Ensure it's never the same as the original (re-shuffle if identical)
  const result = arr.join('');
  return result === str.toUpperCase() && str.length > 1 ? shuffleString(str) : result;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LENGTH_RANGES: Record<ScrambleDifficulty, [number, number]> = {
  easy:   [4, 5],
  normal: [6, 8],
  hard:   [9, 13],
};

// ─── Public API ───────────────────────────────────────────────────────────────

export interface WordEntry {
  word: string;
  hint?: string;
}

export function generateWordScramble(
  wordList: WordEntry[],
  theme: string,
  difficulty: ScrambleDifficulty = 'normal',
  count = 20,
): WordScramblePuzzle {
  const [minLen, maxLen] = LENGTH_RANGES[difficulty];

  const filtered = wordList.filter(
    ({ word }) => word.length >= minLen && word.length <= maxLen
  );

  const selected = shuffle(filtered).slice(0, count);

  const items: ScrambleItem[] = selected.map(({ word, hint }) => ({
    scrambled: shuffleString(word),
    answer: word.toUpperCase(),
    hint,
  }));

  return { items, theme, difficulty };
}
