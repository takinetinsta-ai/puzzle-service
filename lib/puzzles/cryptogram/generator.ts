/**
 * Cryptogram Puzzle Generator
 * Encodes a themed quote or phrase using a random substitution cipher.
 * Difficulty controls how many letters are pre-revealed as hints:
 *   Easy:   5 letters revealed
 *   Normal: 3 letters revealed
 *   Hard:   1 letter revealed
 */

export type CryptogramDifficulty = 'easy' | 'normal' | 'hard';

export interface CryptogramPuzzle {
  encoded: string;         // The encrypted text shown to solver
  decoded: string;         // The original plaintext (for solution page)
  key: Record<string, string>;  // cipher[PLAINTEXT] = ENCODED
  reverseKey: Record<string, string>;  // reverseKey[ENCODED] = PLAINTEXT
  hints: Record<string, string>;       // pre-revealed: encoded -> plaintext
  theme: string;
  difficulty: CryptogramDifficulty;
}

export interface QuoteEntry {
  text: string;
  author?: string;
}

// ─── Cipher generation ────────────────────────────────────────────────────────

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function generateCipher(): Record<string, string> {
  const shuffled = [...ALPHABET];
  // Fisher-Yates shuffle, ensuring no letter maps to itself
  for (let i = shuffled.length - 1; i > 0; i--) {
    let j: number;
    do {
      j = Math.floor(Math.random() * (i + 1));
    } while (j === i && i !== 0);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Build cipher map — ensure no fixed points
  const cipher: Record<string, string> = {};
  ALPHABET.forEach((letter, i) => {
    cipher[letter] = shuffled[i] === letter
      ? shuffled[(i + 1) % 26]
      : shuffled[i];
  });
  return cipher;
}

function encode(text: string, cipher: Record<string, string>): string {
  return text
    .toUpperCase()
    .split('')
    .map(ch => cipher[ch] ?? ch)
    .join('');
}

// ─── Difficulty settings ──────────────────────────────────────────────────────

const REVEALED_COUNT: Record<CryptogramDifficulty, number> = {
  easy:   5,
  normal: 3,
  hard:   1,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateCryptogram(
  quotes: QuoteEntry[],
  theme: string,
  difficulty: CryptogramDifficulty = 'normal',
): CryptogramPuzzle {
  // Pick a random quote
  const entry = quotes[Math.floor(Math.random() * quotes.length)];
  const plainText = entry.author
    ? `${entry.text} — ${entry.author}`
    : entry.text;

  // Generate cipher
  const key = generateCipher();
  const reverseKey: Record<string, string> = {};
  Object.entries(key).forEach(([plain, enc]) => {
    reverseKey[enc] = plain;
  });

  // Encode
  const encoded = encode(plainText, key);

  // Select hint letters (most frequent letters in the text)
  const revealCount = REVEALED_COUNT[difficulty];
  const letterFreq = new Map<string, number>();
  plainText.toUpperCase().split('').forEach(ch => {
    if (ALPHABET.includes(ch)) {
      letterFreq.set(ch, (letterFreq.get(ch) ?? 0) + 1);
    }
  });

  const sortedLetters = [...letterFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([letter]) => letter)
    .slice(0, revealCount);

  const hints: Record<string, string> = {};
  sortedLetters.forEach(plain => {
    const enc = key[plain];
    hints[enc] = plain;
  });

  return {
    encoded,
    decoded: plainText.toUpperCase(),
    key,
    reverseKey,
    hints,
    theme,
    difficulty,
  };
}
