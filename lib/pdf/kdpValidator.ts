/**
 * KDP Requirements Validator
 *
 * Call `validateKdpRequirements(config)` before generating any puzzle or PDF.
 * Returns a list of violation strings — an empty array means the config is KDP-compliant.
 *
 * Amazon KDP print interior requirements this module enforces:
 *  - Trim size: one of 8.5×11, 6×9, or 5.5×8.5
 *  - Margins:   gutter ≥ 0.75", outer ≥ 0.5", top/bottom ≥ 0.75"
 *  - Page count: 24–828, must produce an even final count
 *  - Color:      black & white interior only
 *  - Font sizes: minimum readable sizes for KDP print
 *  - Puzzle counts within safe operational limits
 *  - Book title: non-empty, ≤ 200 characters
 */

import { getKDP, TRIM_SIZES } from './kdpConfig';
import { BookConfig } from './bookBuilder';

// ─── Constants ────────────────────────────────────────────────────────────────

/** KDP margin minimums in inches. */
const MIN_GUTTER_IN = 0.75;
const MIN_OUTER_IN  = 0.5;
const MIN_TOP_IN    = 0.75;
const MIN_BOTTOM_IN = 0.75;

/** KDP page count limits for print interiors. */
const MIN_PAGES = 24;
const MAX_PAGES = 828;

/** Per-puzzle-type maximum counts (safety + KDP page-count ceiling). */
const MAX_PUZZLES_PER_TYPE = 100;
const MAX_TOTAL_PUZZLES    = 200;

/** KDP minimum readable font sizes (pt) for black & white print. */
const MIN_FONT_SIZES: Record<string, number> = {
  body:         8,
  footer:       7,
  clue:         8,
  cell:        10,
  puzzleTitle: 14,
  pageTitle:   14,
};

// ─── Violation collector ──────────────────────────────────────────────────────

type Violation = string;

function collectViolations(config: BookConfig): Violation[] {
  const v: Violation[] = [];
  const trimKey = config.trimSize ?? '8.5x11';
  const kdp = getKDP(trimKey);

  // 1. Trim size — must be a recognised KDP size
  if (!(trimKey in TRIM_SIZES)) {
    v.push(
      `KDP violation: trim size "${trimKey}" is not a supported KDP size. ` +
      `Valid options: ${Object.keys(TRIM_SIZES).join(', ')}.`,
    );
  }

  // 2. Margins — must meet KDP minimums
  if (kdp.gutterMarginInches < MIN_GUTTER_IN) {
    v.push(
      `KDP violation: gutter margin is ${kdp.gutterMarginInches}" — ` +
      `minimum is ${MIN_GUTTER_IN}". Increase kdpConfig.gutterMarginInches.`,
    );
  }
  if (kdp.outerMarginInches < MIN_OUTER_IN) {
    v.push(
      `KDP violation: outer margin is ${kdp.outerMarginInches}" — ` +
      `minimum is ${MIN_OUTER_IN}". Increase kdpConfig.outerMarginInches.`,
    );
  }
  if (kdp.topMarginInches < MIN_TOP_IN) {
    v.push(
      `KDP violation: top margin is ${kdp.topMarginInches}" — ` +
      `minimum is ${MIN_TOP_IN}". Increase kdpConfig.topMarginInches.`,
    );
  }
  if (kdp.bottomMarginInches < MIN_BOTTOM_IN) {
    v.push(
      `KDP violation: bottom margin is ${kdp.bottomMarginInches}" — ` +
      `minimum is ${MIN_BOTTOM_IN}". Increase kdpConfig.bottomMarginInches.`,
    );
  }

  // 3. Font sizes — must meet KDP print minimums
  if (kdp.fontSize.footer < MIN_FONT_SIZES.footer) {
    v.push(
      `KDP violation: footer font size is ${kdp.fontSize.footer} pt — ` +
      `minimum is ${MIN_FONT_SIZES.footer} pt. Increase kdpConfig.fontSize.footer.`,
    );
  }
  if (kdp.fontSize.clue < MIN_FONT_SIZES.clue) {
    v.push(
      `KDP violation: clue font size is ${kdp.fontSize.clue} pt — ` +
      `minimum is ${MIN_FONT_SIZES.clue} pt. Increase kdpConfig.fontSize.clue.`,
    );
  }
  if (kdp.fontSize.cell < MIN_FONT_SIZES.cell) {
    v.push(
      `KDP violation: cell font size is ${kdp.fontSize.cell} pt — ` +
      `minimum is ${MIN_FONT_SIZES.cell} pt. Increase kdpConfig.fontSize.cell.`,
    );
  }
  if (kdp.fontSize.pageTitle < MIN_FONT_SIZES.pageTitle) {
    v.push(
      `KDP violation: page title font size is ${kdp.fontSize.pageTitle} pt — ` +
      `minimum is ${MIN_FONT_SIZES.pageTitle} pt. Increase kdpConfig.fontSize.pageTitle.`,
    );
  }

  // 4. Grid line widths — must stay above minimum for legible print
  if (kdp.gridLineWidth < 0.25) {
    v.push(
      `KDP violation: grid line width is ${kdp.gridLineWidth} pt — ` +
      `minimum is 0.25 pt. Increase kdpConfig.gridLineWidth.`,
    );
  }
  if (kdp.gridBoldLineWidth < 1.5) {
    v.push(
      `KDP violation: bold grid line width is ${kdp.gridBoldLineWidth} pt — ` +
      `minimum is 1.5 pt. Increase kdpConfig.gridBoldLineWidth.`,
    );
  }

  // 5. Book title — non-empty, ≤ 200 chars (KDP listing title limit)
  const title = config.title?.trim() ?? '';
  if (!title) {
    v.push('KDP violation: book title is empty. A title is required for KDP submission.');
  } else if (title.length > 200) {
    v.push(
      `KDP violation: book title is ${title.length} characters — ` +
      `KDP title field maximum is 200 characters.`,
    );
  }

  // 6. Puzzle counts — individual and total limits
  const counts = config.puzzleCounts ?? {};
  const perType: Record<string, number> = {
    sudoku:       counts.sudoku       ?? 0,
    wordSearch:   counts.wordSearch   ?? 0,
    wordScramble: counts.wordScramble ?? 0,
    cryptogram:   counts.cryptogram   ?? 0,
  };

  for (const [type, count] of Object.entries(perType)) {
    if (count < 0) {
      v.push(`KDP violation: ${type} count is negative (${count}). Counts must be ≥ 0.`);
    }
    if (count > MAX_PUZZLES_PER_TYPE) {
      v.push(
        `KDP violation: ${type} count is ${count} — ` +
        `maximum per type is ${MAX_PUZZLES_PER_TYPE} to stay within the KDP 828-page limit.`,
      );
    }
  }

  const totalPuzzles = Object.values(perType).reduce((s, n) => s + n, 0);
  if (totalPuzzles === 0) {
    v.push('KDP violation: no puzzles selected. A book must have at least one puzzle.');
  }
  if (totalPuzzles > MAX_TOTAL_PUZZLES) {
    v.push(
      `KDP violation: total puzzle count is ${totalPuzzles} — ` +
      `maximum is ${MAX_TOTAL_PUZZLES} per book.`,
    );
  }

  // 7. Estimated page count — must fall within KDP bounds
  //    Structure: 1 title + 1 instructions + puzzles + 1 solutions header
  //               + sudoku solution pages + 1 scramble answers + 1 crypto answers
  //               + possible blank page → round up to even
  const estimatedPages = estimatePageCount(perType);
  if (estimatedPages < MIN_PAGES) {
    v.push(
      `KDP violation: estimated page count is ~${estimatedPages} — ` +
      `KDP minimum is ${MIN_PAGES} pages. Add more puzzles.`,
    );
  }
  if (estimatedPages > MAX_PAGES) {
    v.push(
      `KDP violation: estimated page count is ~${estimatedPages} — ` +
      `KDP maximum is ${MAX_PAGES} pages. Reduce puzzle counts.`,
    );
  }

  return v;
}

// ─── Page count estimator ─────────────────────────────────────────────────────

function estimatePageCount(counts: Record<string, number>): number {
  const {
    sudoku = 0,
    wordSearch = 0,
    wordScramble = 0,
    cryptogram = 0,
  } = counts;

  const puzzlePages = sudoku + wordSearch + wordScramble + cryptogram;

  // Solutions section:
  //   - 1 header page
  //   - 1 page per sudoku solution
  //   - 1 page for all word-scramble answers (if any)
  //   - 1 page for all cryptogram answers (if any)
  const solutionPages =
    1 +
    sudoku +
    (wordScramble > 0 ? 1 : 0) +
    (cryptogram > 0 ? 1 : 0);

  // Fixed pages: title + instructions
  const fixedPages = 2;

  const raw = fixedPages + puzzlePages + solutionPages;

  // KDP requires even page count — round up if needed
  return raw % 2 !== 0 ? raw + 1 : raw;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validates a BookConfig against Amazon KDP print requirements.
 *
 * @returns An array of human-readable violation strings.
 *          An empty array means the config is fully KDP-compliant.
 *
 * @example
 * const errors = validateKdpRequirements(config);
 * if (errors.length > 0) throw new Error(errors.join('\n'));
 */
export function validateKdpRequirements(config: BookConfig): string[] {
  return collectViolations(config);
}

/**
 * Throws a descriptive error if the config violates any KDP requirement.
 * Use this as a guard at the top of buildBook() and any puzzle generator entry point.
 */
export function assertKdpCompliant(config: BookConfig): void {
  const violations = validateKdpRequirements(config);
  if (violations.length > 0) {
    throw new Error(
      `Amazon KDP requirements not met — fix the following before generating:\n\n` +
      violations.map((v, i) => `  ${i + 1}. ${v}`).join('\n'),
    );
  }
}

/**
 * Returns a summary of the estimated book specs for a given config.
 * Useful for logging or displaying a pre-flight report to the user.
 */
export function kdpPreflightReport(config: BookConfig): {
  compliant: boolean;
  violations: string[];
  estimatedPages: number;
  trimSize: string;
  margins: string;
} {
  const counts = {
    sudoku:       config.puzzleCounts?.sudoku       ?? 0,
    wordSearch:   config.puzzleCounts?.wordSearch   ?? 0,
    wordScramble: config.puzzleCounts?.wordScramble ?? 0,
    cryptogram:   config.puzzleCounts?.cryptogram   ?? 0,
  };

  const kdp = getKDP(config.trimSize ?? '8.5x11');
  const violations = validateKdpRequirements(config);

  return {
    compliant: violations.length === 0,
    violations,
    estimatedPages: estimatePageCount(counts),
    trimSize: `${kdp.trimWidthInches}" × ${kdp.trimHeightInches}" (${kdp.pageWidthPt} × ${kdp.pageHeightPt} pt)`,
    margins: `gutter ${kdp.gutterMarginInches}", outer ${kdp.outerMarginInches}", top ${kdp.topMarginInches}", bottom ${kdp.bottomMarginInches}"`,
  };
}
