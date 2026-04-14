import { NextRequest, NextResponse } from 'next/server';
import { buildBook, BookConfig, TrimSize } from '@/lib/pdf/bookBuilder';
import { kdpPreflightReport } from '@/lib/pdf/kdpValidator';

export const runtime = 'nodejs';
export const maxDuration = 120;

const VALID_THEMES = ['nature', 'travel', 'food', 'sports', 'history', 'science',
  '90s', '2000s', 'music', 'space', 'movies'] as const;
const VALID_DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
const VALID_TRIM_SIZES   = ['8.5x11', '6x9', '5.5x8.5'] as const;

type Theme      = (typeof VALID_THEMES)[number];
type Difficulty = (typeof VALID_DIFFICULTIES)[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, theme, difficulty, trimSize, puzzleCounts } = body;

    // ── Structural validation ─────────────────────────────────────────────────
    if (!title || !theme || !difficulty || !puzzleCounts) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!(VALID_THEMES as readonly string[]).includes(theme)) {
      return NextResponse.json(
        { error: `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}` },
        { status: 400 },
      );
    }

    if (!(VALID_DIFFICULTIES as readonly string[]).includes(difficulty)) {
      return NextResponse.json(
        { error: `Invalid difficulty. Must be one of: ${VALID_DIFFICULTIES.join(', ')}` },
        { status: 400 },
      );
    }

    if (trimSize && !(VALID_TRIM_SIZES as readonly string[]).includes(trimSize)) {
      return NextResponse.json(
        { error: `Invalid trim size. Must be one of: ${VALID_TRIM_SIZES.join(', ')}` },
        { status: 400 },
      );
    }

    // ── Per-count type validation ─────────────────────────────────────────────
    const PUZZLE_KEYS = ['sudoku', 'wordSearch', 'wordScramble', 'cryptogram'] as const;
    for (const key of PUZZLE_KEYS) {
      const raw = puzzleCounts[key];
      if (raw !== undefined && raw !== null) {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0) {
          return NextResponse.json(
            { error: `Invalid value for puzzleCounts.${key}: must be a non-negative integer` },
            { status: 400 },
          );
        }
      }
    }

    // ── Build typed config ────────────────────────────────────────────────────
    const config: BookConfig = {
      title:    String(title).trim(),
      theme:    theme as Theme,
      difficulty: difficulty as Difficulty,
      trimSize: (trimSize as TrimSize) ?? '8.5x11',
      puzzleCounts: {
        sudoku:       Number(puzzleCounts.sudoku)       || 0,
        wordSearch:   Number(puzzleCounts.wordSearch)   || 0,
        wordScramble: Number(puzzleCounts.wordScramble) || 0,
        cryptogram:   Number(puzzleCounts.cryptogram)   || 0,
      },
    };

    // ── KDP preflight ─────────────────────────────────────────────────────────
    const preflight = kdpPreflightReport(config);
    if (!preflight.compliant) {
      return NextResponse.json(
        { error: 'Amazon KDP requirements not met', violations: preflight.violations },
        { status: 422 },
      );
    }

    // ── Generate PDF ──────────────────────────────────────────────────────────
    const pdfBuffer = await buildBook(config);

    const sanitized = config.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase().replace(/^_+|_+$/g, '');
    const safeTitle = sanitized || 'puzzle_book';
    const filename  = `${safeTitle}_${config.theme}_${config.difficulty}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('Book generation error:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate book. Please try again.';
    const stack = err instanceof Error ? err.stack : '';
    const isKdpError = message.startsWith('Amazon KDP requirements not met');
    return NextResponse.json({ error: message, stack }, { status: isKdpError ? 422 : 500 });
  }
}
