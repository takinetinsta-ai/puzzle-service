/**
 * KDP (Kindle Direct Publishing) configuration constants.
 * Supports three standard trim sizes for puzzle books.
 * All measurements are in inches; pt() converts to PDF points (72 pt = 1 inch).
 */

export type TrimSizeKey = '8.5x11' | '6x9' | '5.5x8.5';

interface TrimSpec {
  widthInches:  number;
  heightInches: number;
  label:        string;
}

export const TRIM_SIZES: Record<TrimSizeKey, TrimSpec> = {
  '8.5x11':  { widthInches: 8.5,  heightInches: 11.0, label: '8.5" × 11" (Large)' },
  '6x9':     { widthInches: 6.0,  heightInches: 9.0,  label: '6" × 9" (Standard)' },
  '5.5x8.5': { widthInches: 5.5,  heightInches: 8.5,  label: '5.5" × 8.5" (Digest)' },
};

function makeKDP(trimKey: TrimSizeKey = '8.5x11') {
  const trim = TRIM_SIZES[trimKey];

  return {
    trimKey,
    trimWidthInches:  trim.widthInches,
    trimHeightInches: trim.heightInches,

    // Margins in inches (KDP minimums for B&W no-bleed interiors)
    gutterMarginInches: 0.75,
    outerMarginInches:  0.625,
    topMarginInches:    0.75,
    bottomMarginInches: 0.75,

    pt(inches: number): number { return inches * 72; },

    get pageWidthPt():    number { return this.trimWidthInches  * 72; },
    get pageHeightPt():   number { return this.trimHeightInches * 72; },
    get contentWidthPt(): number { return (this.trimWidthInches - this.gutterMarginInches - this.outerMarginInches) * 72; },
    get contentHeightPt():number { return (this.trimHeightInches - this.topMarginInches - this.bottomMarginInches) * 72; },

    get contentXOdd():  number { return this.gutterMarginInches * 72; },
    get contentXEven(): number { return this.outerMarginInches  * 72; },
    get contentY():     number { return this.topMarginInches    * 72; },

    fonts: {
      title:    'Helvetica-Bold',
      body:     'Helvetica',
      mono:     'Courier',
      monoBold: 'Courier-Bold',
    },

    fontSize: {
      pageTitle:    18,
      puzzleNumber: 12,
      clue:         10,
      cell:         16,
      small:         8,
      footer:        9,
    },

    gridLineWidth:     0.5,
    gridBoldLineWidth: 2.0,
  } as const;
}

// Default singleton (8.5×11) — used by modules that don't need dynamic sizing
export const KDP = makeKDP('8.5x11');

// Factory for per-request configs
export function getKDP(trimKey: TrimSizeKey = '8.5x11') {
  return makeKDP(trimKey);
}

export type KDPConfig = ReturnType<typeof makeKDP>;
