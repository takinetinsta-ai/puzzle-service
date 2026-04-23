/**
 * Book Builder — Assembles a complete KDP-compliant puzzle book PDF.
 *
 * Sequence:
 *   1. Title page
 *   2. Puzzle pages (mixed types, ordered by type groups)
 *   3. Solutions section (all answer keys)
 *   4. Blank page if total count is odd (KDP requires even page count)
 */

import PDFDocument from 'pdfkit';
import { getKDP, KDPConfig } from './kdpConfig';
import {
  renderSudokuPage,
  renderSudokuSolutionsPage,
  renderWordSearchPage,
  renderWordSearchSolutionsPage,
  renderWordScramblePairPage,
  renderCryptogramPage,
} from './pageLayouts';
import { SudokuPuzzle, generateSudoku, SudokuDifficulty } from '../puzzles/sudoku/generator';
import { WordSearchPuzzle, generateWordSearch, WordSearchDifficulty } from '../puzzles/wordSearch/generator';
import { WordScramblePuzzle, generateWordScramble, ScrambleDifficulty, WordEntry } from '../puzzles/wordScramble/generator';
import { CryptogramPuzzle, generateCryptogram, CryptogramDifficulty, QuoteEntry } from '../puzzles/cryptogram/generator';
import { loadThemeData } from '../data/themeLoader';
import { assertKdpCompliant } from './kdpValidator';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'normal' | 'hard';
export type Theme = 'nature' | 'travel' | 'food' | 'sports' | 'history' | 'science'
  | '90s' | '2000s' | 'music' | 'space' | 'movies';
export type TrimSize = '8.5x11' | '6x9' | '5.5x8.5';

export interface BookConfig {
  title: string;
  theme: Theme;
  difficulty: Difficulty;
  trimSize?: TrimSize;
  puzzleCounts: {
    sudoku?: number;
    wordSearch?: number;
    wordScramble?: number;
    cryptogram?: number;
  };
}

// ─── Title Page ───────────────────────────────────────────────────────────────

function drawTitlePage(doc: InstanceType<typeof PDFDocument>, kdp: KDPConfig, config: BookConfig): void {
  const cx = kdp.pageWidthPt / 2;
  const cy = kdp.pageHeightPt / 2;

  // Outer border
  doc
    .rect(kdp.pt(0.4), kdp.pt(0.4), kdp.pageWidthPt - kdp.pt(0.8), kdp.pageHeightPt - kdp.pt(0.8))
    .lineWidth(2)
    .stroke('#000000');

  // Inner border
  doc
    .rect(kdp.pt(0.5), kdp.pt(0.5), kdp.pageWidthPt - kdp.pt(1), kdp.pageHeightPt - kdp.pt(1))
    .lineWidth(0.5)
    .stroke('#555555');

  // Title
  doc
    .fontSize(32)
    .font(kdp.fonts.title)
    .fillColor('#000000')
    .text(config.title, 0, cy - kdp.pt(1.5), { width: kdp.pageWidthPt, align: 'center' });

  // Decorative line
  doc
    .moveTo(cx - kdp.pt(2), cy - kdp.pt(0.7))
    .lineTo(cx + kdp.pt(2), cy - kdp.pt(0.7))
    .lineWidth(1)
    .stroke('#000000');

  // Subtitle
  doc
    .fontSize(14)
    .font(kdp.fonts.body)
    .fillColor('#333333')
    .text(`${config.theme.toUpperCase()} THEME — ${config.difficulty.toUpperCase()}`, 0, cy - kdp.pt(0.5), {
      width: kdp.pageWidthPt,
      align: 'center',
    });

  // Puzzle type list
  const types = Object.entries(config.puzzleCounts)
    .filter(([, count]) => count && count > 0)
    .map(([type, count]) => `${count} ${type.replace(/([A-Z])/g, ' $1').trim()} Puzzles`)
    .join('  •  ');

  doc
    .fontSize(11)
    .font(kdp.fonts.body)
    .fillColor('#555555')
    .text(types, 0, cy + kdp.pt(0.1), { width: kdp.pageWidthPt, align: 'center' });

  // Footer note
  doc
    .fontSize(9)
    .font(kdp.fonts.body)
    .fillColor('#777777')
    .text('Solutions provided in the back of this book', 0, kdp.pageHeightPt - kdp.pt(1.2), {
      width: kdp.pageWidthPt,
      align: 'center',
    });
}

// ─── Main Book Builder ────────────────────────────────────────────────────────

export async function buildBook(config: BookConfig): Promise<Buffer> {
  // Guard: verify all Amazon KDP requirements before generating a single page.
  assertKdpCompliant(config);

  return new Promise(async (resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const kdp = getKDP(config.trimSize ?? '8.5x11');

      const doc = new PDFDocument({
        size: [kdp.pageWidthPt, kdp.pageHeightPt],
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
        info: {
          Title: config.title,
          Author: 'Puzzle Book Generator',
          Subject: `${config.theme} theme puzzle book`,
        },
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Load theme data
      const themeData = await loadThemeData(config.theme);
      const diff = config.difficulty;

      let pageNumber = 1;
      let puzzleNumber = 1;

      // ── Page 1: Title ─────────────────────────────────────────────────────
      drawTitlePage(doc, kdp, config);

      // ── Puzzle pages ──────────────────────────────────────────────────────
      type PuzzleRecord =
        | { type: 'sudoku'; data: SudokuPuzzle }
        | { type: 'wordSearch'; data: WordSearchPuzzle }
        | { type: 'wordScramble'; data: WordScramblePuzzle }
        | { type: 'cryptogram'; data: CryptogramPuzzle };

      const puzzles: PuzzleRecord[] = [];

      // Generate Sudoku
      const sudokuCount = config.puzzleCounts.sudoku ?? 0;
      try {
        for (let i = 0; i < sudokuCount; i++) {
          puzzles.push({ type: 'sudoku', data: generateSudoku(diff as SudokuDifficulty) });
        }
      } catch (e) { throw new Error(`SUDOKU gen failed: ${(e as Error).message}`); }

      // Generate Word Search
      const wsCount = config.puzzleCounts.wordSearch ?? 0;
      try {
        for (let i = 0; i < wsCount; i++) {
          puzzles.push({
            type: 'wordSearch',
            data: generateWordSearch(
              themeData.words.map(w => w.word),
              config.theme,
              diff as WordSearchDifficulty,
            ),
          });
        }
      } catch (e) { throw new Error(`WORDSEARCH gen failed: ${(e as Error).message}`); }

      // Generate Word Scramble
      const scrambleCount = config.puzzleCounts.wordScramble ?? 0;
      try {
        for (let i = 0; i < scrambleCount; i++) {
          puzzles.push({
            type: 'wordScramble',
            data: generateWordScramble(
              themeData.words as WordEntry[],
              config.theme,
              diff as ScrambleDifficulty,
            ),
          });
        }
      } catch (e) { throw new Error(`WORDSCRAMBLE gen failed: ${(e as Error).message}`); }

      // Generate Cryptogram
      const cryptoCount = config.puzzleCounts.cryptogram ?? 0;
      try {
        for (let i = 0; i < cryptoCount; i++) {
          puzzles.push({
            type: 'cryptogram',
            data: generateCryptogram(
              themeData.quotes as QuoteEntry[],
              config.theme,
              diff as CryptogramDifficulty,
            ),
          });
        }
      } catch (e) { throw new Error(`CRYPTOGRAM gen failed: ${(e as Error).message}`); }

      // Render puzzle pages (word scramble rendered 2-per-page)
      let pendingScramble: { data: WordScramblePuzzle; num: number } | null = null;

      for (const puzzle of puzzles) {
        if (puzzle.type === 'wordScramble') {
          if (pendingScramble === null) {
            pendingScramble = { data: puzzle.data, num: puzzleNumber };
          } else {
            doc.addPage();
            pageNumber++;
            renderWordScramblePairPage(doc, kdp, pendingScramble.data, puzzle.data, pendingScramble.num, puzzleNumber, pageNumber, pageNumber % 2 !== 0);
            pendingScramble = null;
          }
          puzzleNumber++;
          continue;
        }

        doc.addPage();
        pageNumber++;
        const isOdd = pageNumber % 2 !== 0;

        switch (puzzle.type) {
          case 'sudoku':
            renderSudokuPage(doc, kdp, puzzle.data, puzzleNumber, pageNumber, isOdd);
            break;
          case 'wordSearch':
            renderWordSearchPage(doc, kdp, puzzle.data, puzzleNumber, pageNumber, isOdd);
            break;
          case 'cryptogram':
            renderCryptogramPage(doc, kdp, puzzle.data, puzzleNumber, pageNumber, isOdd);
            break;
        }
        puzzleNumber++;
      }

      // Flush any remaining unpaired word scramble
      if (pendingScramble !== null) {
        doc.addPage();
        pageNumber++;
        renderWordScramblePairPage(doc, kdp, pendingScramble.data, null, pendingScramble.num, -1, pageNumber, pageNumber % 2 !== 0);
        pendingScramble = null;
      }

      // ── Sudoku solutions (4 per page) ─────────────────────────────────────
      const sudokuItems = puzzles
        .filter(p => p.type === 'sudoku')
        .map((p, i) => ({ puzzle: (p as { type: 'sudoku'; data: SudokuPuzzle }).data, puzzleNumber: i + 1 }));
      for (let i = 0; i < sudokuItems.length; i += 4) {
        const batch = sudokuItems.slice(i, i + 4);
        doc.addPage();
        pageNumber++;
        renderSudokuSolutionsPage(doc, kdp, batch, pageNumber, pageNumber % 2 !== 0);
      }

      // ── Word Search solutions (4 per page) ───────────────────────────────
      const wsPuzzles = puzzles.filter(p => p.type === 'wordSearch') as { type: 'wordSearch'; data: WordSearchPuzzle }[];
      for (let i = 0; i < wsPuzzles.length; i += 4) {
        const batch = wsPuzzles.slice(i, i + 4).map(p => p.data);
        doc.addPage();
        pageNumber++;
        renderWordSearchSolutionsPage(doc, kdp, batch, i + 1, pageNumber, pageNumber % 2 !== 0);
      }

      // ── Word Scramble solutions ───────────────────────────────────────────
      const scramblePuzzles = puzzles.filter(p => p.type === 'wordScramble') as { type: 'wordScramble'; data: WordScramblePuzzle }[];
      if (scramblePuzzles.length > 0) {
        const pageBottom = kdp.pageHeightPt - kdp.pt(1);
        const rowH       = 14; // px per answer row
        const cols       = 3;

        // Helper: start a fresh page and return the new x/y
        const newScramblePage = (): { x: number; y: number } => {
          doc.addPage();
          pageNumber++;
          const x = (pageNumber % 2 !== 0) ? kdp.contentXOdd : kdp.contentXEven;
          return { x, y: kdp.contentY };
        };

        // First page — draw section header
        let { x, y } = newScramblePage();
        doc.fontSize(16).font(kdp.fonts.title).fillColor('#000000')
          .text('WORD SCRAMBLE ANSWERS', x, y, { width: kdp.contentWidthPt, align: 'center' });
        y += kdp.pt(0.55);

        let sNum = 1;
        for (const { data } of scramblePuzzles) {
          const answers = data.items.map((item, i) => `${i + 1}. ${item.answer}`);
          const rows    = Math.ceil(answers.length / cols);
          const blockH  = 16 + rows * rowH; // label + rows + gap

          // If this puzzle block won't fit, start a new page
          if (y + blockH > pageBottom) {
            ({ x, y } = newScramblePage());
          }

          // Puzzle label
          doc.fontSize(10).font(kdp.fonts.title).fillColor('#000000')
            .text(`Puzzle #${sNum++}:`, x, y, { width: kdp.contentWidthPt });
          y += 14;

          // Answers — one row at a time, paginating mid-block if needed
          const colW = kdp.contentWidthPt / cols;
          for (let row = 0; row < rows; row++) {
            if (y + rowH > pageBottom) {
              ({ x, y } = newScramblePage());
            }
            for (let col = 0; col < cols; col++) {
              const idx = row * cols + col;
              if (idx < answers.length) {
                doc.fontSize(9).font(kdp.fonts.body).fillColor('#333333')
                  .text(answers[idx], x + col * colW, y, { width: colW });
              }
            }
            y += rowH;
          }
          y += 10; // gap between puzzles
        }
      }

      // ── Cryptogram solutions ──────────────────────────────────────────────
      const cryptoPuzzles = puzzles.filter(p => p.type === 'cryptogram') as { type: 'cryptogram'; data: CryptogramPuzzle }[];
      if (cryptoPuzzles.length > 0) {
        doc.addPage();
        pageNumber++;
        const x = (pageNumber % 2 !== 0) ? kdp.contentXOdd : kdp.contentXEven;
        const w = kdp.contentWidthPt;
        let y = kdp.contentY;

        doc.fontSize(16).font(kdp.fonts.title).text('CRYPTOGRAM ANSWERS', x, y, { width: w, align: 'center' });
        y += kdp.pt(0.5);

        let cNum = 1;
        for (const { data } of cryptoPuzzles) {
          doc.fontSize(10).font(kdp.fonts.title).fillColor('#000000').text(`Cryptogram #${cNum++}:`, x, y, { width: w });
          y += 14;
          doc.fontSize(9).font(kdp.fonts.body).fillColor('#333333').text(data.decoded, x, y, { width: w });
          y += doc.heightOfString(data.decoded, { width: w }) + 16;
          if (y > kdp.pageHeightPt - kdp.pt(1)) {
            doc.addPage(); pageNumber++; y = kdp.contentY;
          }
        }
      }

      // ── Enforce even page count (KDP requirement) ─────────────────────────
      if (pageNumber % 2 !== 0) {
        doc.addPage();
        pageNumber++;
        // Blank page — intentionally left blank
        const x = (pageNumber % 2 !== 0) ? kdp.contentXOdd : kdp.contentXEven;
        doc
          .fontSize(10)
          .font(kdp.fonts.body)
          .fillColor('#cccccc')
          .text('This page intentionally left blank.', x, kdp.pageHeightPt / 2, {
            width: kdp.contentWidthPt,
            align: 'center',
          });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
