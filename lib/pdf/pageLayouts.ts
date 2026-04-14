/**
 * PDF Page Renderers for each puzzle type.
 * Each renderer accepts a KDPConfig so the correct trim size is used.
 */

import PDFDocument from 'pdfkit';
import { KDPConfig } from './kdpConfig';
import { SudokuPuzzle } from '../puzzles/sudoku/generator';
import { WordSearchPuzzle } from '../puzzles/wordSearch/generator';
import { WordScramblePuzzle } from '../puzzles/wordScramble/generator';
import { CryptogramPuzzle } from '../puzzles/cryptogram/generator';

type Doc = InstanceType<typeof PDFDocument>;

// ─── Shared helpers ───────────────────────────────────────────────────────────

function drawPageFooter(doc: Doc, kdp: KDPConfig, puzzleNumber: number, pageNumber: number, isOdd: boolean): void {
  const x = isOdd ? kdp.contentXOdd : kdp.contentXEven;
  const y = kdp.pageHeightPt - kdp.pt(kdp.bottomMarginInches) + 12;
  const w = kdp.contentWidthPt;
  doc.fontSize(kdp.fontSize.footer).font(kdp.fonts.body).fillColor('#333333')
    .text(`Puzzle #${puzzleNumber}`, x, y, { width: w / 2, align: 'left' })
    .text(`${pageNumber}`, x + w / 2, y, { width: w / 2, align: 'right' });
}

function drawPageTitle(doc: Doc, kdp: KDPConfig, title: string, subtitle: string, isOdd: boolean): void {
  const x = isOdd ? kdp.contentXOdd : kdp.contentXEven;
  const y = kdp.contentY;
  const w = kdp.contentWidthPt;
  doc.fontSize(kdp.fontSize.pageTitle).font(kdp.fonts.title).fillColor('#000000').text(title, x, y, { width: w, align: 'center' });
  doc.fontSize(kdp.fontSize.puzzleNumber).font(kdp.fonts.body).fillColor('#555555').text(subtitle, x, y + 24, { width: w, align: 'center' });
}

// ─── Sudoku ───────────────────────────────────────────────────────────────────

export function renderSudokuPage(doc: Doc, kdp: KDPConfig, puzzle: SudokuPuzzle, puzzleNumber: number, pageNumber: number, isOdd: boolean): void {
  const x0 = isOdd ? kdp.contentXOdd : kdp.contentXEven;
  const w  = kdp.contentWidthPt;

  drawPageTitle(doc, kdp, `SUDOKU — ${puzzle.difficulty.toUpperCase()}`, `Puzzle #${puzzleNumber}`, isOdd);

  const gridSize = Math.min(w * 0.85, kdp.pt(6.2));
  const cellSize = gridSize / 9;
  const gridX = x0 + (w - gridSize) / 2;
  const gridY = kdp.contentY + kdp.pt(0.8);

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cx = gridX + c * cellSize;
      const cy = gridY + r * cellSize;
      const val = puzzle.puzzle[r][c];
      if (val !== null) doc.rect(cx, cy, cellSize, cellSize).fill('#f0f0f0').stroke();
      doc.rect(cx, cy, cellSize, cellSize).lineWidth(kdp.gridLineWidth).stroke('#999999');
      if (val !== null) {
        doc.fontSize(kdp.fontSize.cell).font(kdp.fonts.title).fillColor('#000000')
          .text(String(val), cx, cy + cellSize / 2 - kdp.fontSize.cell / 2, { width: cellSize, align: 'center' });
      }
    }
  }

  doc.lineWidth(kdp.gridBoldLineWidth).strokeColor('#000000');
  for (let box = 0; box <= 3; box++) {
    const lx = gridX + box * cellSize * 3;
    const ly = gridY + box * cellSize * 3;
    doc.moveTo(lx, gridY).lineTo(lx, gridY + gridSize).stroke();
    doc.moveTo(gridX, ly).lineTo(gridX + gridSize, ly).stroke();
  }

  doc.fontSize(kdp.fontSize.small).font(kdp.fonts.body).fillColor('#555555')
    .text('Fill every row, column, and 3×3 box with digits 1–9. Each digit appears exactly once.', x0, gridY + gridSize + 12, { width: w, align: 'center' });

  drawPageFooter(doc, kdp, puzzleNumber, pageNumber, isOdd);
}

export function renderSudokuSolution(doc: Doc, kdp: KDPConfig, puzzle: SudokuPuzzle, puzzleNumber: number, pageNumber: number, isOdd: boolean): void {
  const x0 = isOdd ? kdp.contentXOdd : kdp.contentXEven;
  const w  = kdp.contentWidthPt;

  drawPageTitle(doc, kdp, `SUDOKU SOLUTION — #${puzzleNumber}`, '', isOdd);

  const gridSize = Math.min(w * 0.75, kdp.pt(5.5));
  const cellSize = gridSize / 9;
  const gridX = x0 + (w - gridSize) / 2;
  const gridY = kdp.contentY + kdp.pt(0.8);

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cx = gridX + c * cellSize;
      const cy = gridY + r * cellSize;
      const val = puzzle.solution[r][c];
      const given = puzzle.puzzle[r][c] !== null;
      doc.rect(cx, cy, cellSize, cellSize).lineWidth(kdp.gridLineWidth).stroke('#aaaaaa');
      doc.fontSize(12).font(given ? kdp.fonts.title : kdp.fonts.body).fillColor(given ? '#000000' : '#666666')
        .text(String(val), cx, cy + cellSize / 2 - 7, { width: cellSize, align: 'center' });
    }
  }

  doc.lineWidth(kdp.gridBoldLineWidth).strokeColor('#000000');
  for (let box = 0; box <= 3; box++) {
    const lx = gridX + box * cellSize * 3;
    const ly = gridY + box * cellSize * 3;
    doc.moveTo(lx, gridY).lineTo(lx, gridY + gridSize).stroke();
    doc.moveTo(gridX, ly).lineTo(gridX + gridSize, ly).stroke();
  }

  drawPageFooter(doc, kdp, puzzleNumber, pageNumber, isOdd);
}

// ─── Word Search ──────────────────────────────────────────────────────────────

export function renderWordSearchPage(doc: Doc, kdp: KDPConfig, puzzle: WordSearchPuzzle, puzzleNumber: number, pageNumber: number, isOdd: boolean): void {
  const x0 = isOdd ? kdp.contentXOdd : kdp.contentXEven;
  const w  = kdp.contentWidthPt;

  drawPageTitle(doc, kdp, `WORD SEARCH — ${puzzle.theme.toUpperCase()}`, `${puzzle.difficulty.toUpperCase()} • Puzzle #${puzzleNumber}`, isOdd);

  const gridAreaSize = Math.min(w * 0.9, kdp.pt(5.8));
  const cellSize = gridAreaSize / puzzle.cols;
  const gridX = x0 + (w - gridAreaSize) / 2;
  const gridY = kdp.contentY + kdp.pt(0.7);
  const fontSize = Math.min(14, cellSize * 0.55);

  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const cx = gridX + c * cellSize;
      const cy = gridY + r * cellSize;
      doc.fontSize(fontSize).font(kdp.fonts.monoBold).fillColor('#000000')
        .text(puzzle.grid[r][c], cx, cy + cellSize / 2 - fontSize / 2, { width: cellSize, align: 'center' });
    }
  }

  const wordListY = gridY + gridAreaSize + 16;
  const colW = w / 3;
  const words = [...puzzle.placed].sort();

  doc.fontSize(9).font(kdp.fonts.title).fillColor('#000000').text('FIND THESE WORDS:', x0, wordListY, { width: w });
  words.forEach((word, i) => {
    doc.fontSize(9).font(kdp.fonts.body).fillColor('#333333')
      .text(word, x0 + (i % 3) * colW, wordListY + 14 + Math.floor(i / 3) * 13, { width: colW });
  });

  drawPageFooter(doc, kdp, puzzleNumber, pageNumber, isOdd);
}

// ─── Word Scramble ────────────────────────────────────────────────────────────

export function renderWordScramblePage(doc: Doc, kdp: KDPConfig, puzzle: WordScramblePuzzle, puzzleNumber: number, pageNumber: number, isOdd: boolean): void {
  const x0 = isOdd ? kdp.contentXOdd : kdp.contentXEven;
  const w  = kdp.contentWidthPt;

  drawPageTitle(doc, kdp, `WORD SCRAMBLE — ${puzzle.theme.toUpperCase()}`, `${puzzle.difficulty.toUpperCase()} • Puzzle #${puzzleNumber}`, isOdd);

  const startY = kdp.contentY + kdp.pt(0.8);
  const colW   = w / 2;
  const itemH  = kdp.pt(0.42);

  puzzle.items.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const ix  = x0 + col * colW;
    const iy  = startY + row * itemH;

    doc.fontSize(10).font(kdp.fonts.title).fillColor('#000000').text(`${i + 1}.`, ix, iy, { width: 20 });
    doc.fontSize(14).font(kdp.fonts.monoBold).fillColor('#1a1a1a').text(item.scrambled, ix + 22, iy - 2, { width: colW * 0.55 });
    doc.moveTo(ix + colW * 0.62, iy + 14).lineTo(ix + colW * 0.95, iy + 14).lineWidth(0.5).stroke('#666666');
    if (item.hint) {
      doc.fontSize(7).font(kdp.fonts.body).fillColor('#888888').text(`(${item.hint})`, ix + 22, iy + 16, { width: colW * 0.85 });
    }
  });

  drawPageFooter(doc, kdp, puzzleNumber, pageNumber, isOdd);
}

// ─── Cryptogram ───────────────────────────────────────────────────────────────

export function renderCryptogramPage(doc: Doc, kdp: KDPConfig, puzzle: CryptogramPuzzle, puzzleNumber: number, pageNumber: number, isOdd: boolean): void {
  const x0 = isOdd ? kdp.contentXOdd : kdp.contentXEven;
  const w  = kdp.contentWidthPt;

  drawPageTitle(doc, kdp, `CRYPTOGRAM — ${puzzle.theme.toUpperCase()}`, `${puzzle.difficulty.toUpperCase()} • Puzzle #${puzzleNumber}`, isOdd);

  const instrY = kdp.contentY + kdp.pt(0.75);
  doc.fontSize(9).font(kdp.fonts.body).fillColor('#555555')
    .text('Each letter in the encoded message stands for a different letter. Decode the hidden quote!', x0, instrY, { width: w, align: 'center' });

  const encodedY  = instrY + kdp.pt(0.5);
  const charWidth = 22;
  const lineWidth = Math.floor(w / charWidth);
  const chars = puzzle.encoded.split('');
  let currentX = x0;
  let currentY = encodedY;
  let lineCharCount = 0;

  for (const ch of chars) {
    if (lineCharCount >= lineWidth || ch === '\n') {
      currentX = x0; currentY += kdp.pt(0.45); lineCharCount = 0;
    }
    const isLetter = /[A-Z]/.test(ch);
    if (isLetter) {
      doc.fontSize(12).font(kdp.fonts.monoBold).fillColor('#000000').text(ch, currentX, currentY, { width: charWidth, align: 'center' });
      const hintLetter = puzzle.hints[ch];
      if (hintLetter) {
        doc.fontSize(10).font(kdp.fonts.body).fillColor('#444444').text(hintLetter, currentX, currentY + 14, { width: charWidth, align: 'center' });
      } else {
        doc.moveTo(currentX + 2, currentY + 26).lineTo(currentX + charWidth - 2, currentY + 26).lineWidth(0.5).stroke('#aaaaaa');
      }
    } else if (ch === ' ') {
      currentX += charWidth * 0.4; lineCharCount++; continue;
    } else {
      doc.fontSize(12).font(kdp.fonts.body).fillColor('#555555').text(ch, currentX, currentY, { width: charWidth, align: 'center' });
    }
    currentX += charWidth; lineCharCount++;
  }

  const refY = currentY + kdp.pt(0.9);
  doc.fontSize(9).font(kdp.fonts.title).fillColor('#000000').text('CIPHER REFERENCE:', x0, refY, { width: w });
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const refCellW = w / 26;
  alphabet.forEach((letter, i) => {
    const rx = x0 + i * refCellW;
    const ry = refY + 13;
    doc.fontSize(7).font(kdp.fonts.mono).fillColor('#333333').text(letter, rx, ry, { width: refCellW, align: 'center' });
    doc.moveTo(rx, ry + 10).lineTo(rx + refCellW - 2, ry + 10).lineWidth(0.3).stroke('#bbbbbb');
  });

  drawPageFooter(doc, kdp, puzzleNumber, pageNumber, isOdd);
}

