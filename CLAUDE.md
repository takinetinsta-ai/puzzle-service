@AGENTS.md

# Puzzle Book Generator — AI Agent Instructions

## MANDATORY: Amazon KDP Compliance Check

**Before creating, modifying, or rendering ANY puzzle or PDF page, verify the output will meet every KDP requirement listed below.** If a proposed change would violate any requirement, refuse it and explain which rule is broken.

---

## Amazon KDP Print Book Requirements

### 1. Trim Size & Page Dimensions
- **Interior trim size: 8.5" × 11"** (most popular for adult puzzle books)
- PDF page size must be **exactly** `612 pt × 792 pt` (8.5 × 72 = 612, 11 × 72 = 792)
- Source of truth: `lib/pdf/kdpConfig.ts` → `KDP.pageWidthPt` / `KDP.pageHeightPt`
- Do **not** resize, rescale, or add bleed beyond the trim boundary — black & white interior books have **no bleed**

### 2. Margins (No-Bleed Black & White Interior)
| Side | Minimum | Project setting |
|------|---------|-----------------|
| Gutter (binding side) | 0.75" | `KDP.gutterMarginInches = 0.75` |
| Outer edge | 0.5" min (0.625 used) | `KDP.outerMarginInches = 0.625` |
| Top | 0.75" | `KDP.topMarginInches = 0.75` |
| Bottom | 0.75" | `KDP.bottomMarginInches = 0.75` |

- **Never** place text, grid lines, or puzzle content inside these margins
- Mirrored margins are correctly implemented — odd pages use gutter on the left, even pages on the right. Maintain this.

### 3. Page Count Rules
- **Minimum page count: 24 pages**
- **Maximum page count: 828 pages**
- Page count **must be even** (KDP rejects odd page counts) — enforced at the end of `buildBook()` with a blank page; do not remove this logic
- Book structure: Title (p.1) + Instructions (p.2) + Puzzle pages + Solutions section + optional blank page

### 4. Interior Color Mode
- **Black & white only** — no CMYK or RGB color content
- All text, grid lines, and puzzle elements must use `#000000`, `#333333`, `#555555`, `#777777`, `#999999`, or `#cccccc`
- Do **not** introduce colored fills, backgrounds, or images that are not grayscale

### 5. PDF Specification
- PDF must be **PDF/A-compliant** or standard PDF — no encryption, no password protection, no JavaScript
- Fonts must be **embedded** — PDFKit embeds Helvetica, Courier automatically; do not use external font files without verifying embedding
- **No crop marks, registration marks, or printer's marks** inside the trim area
- Resolution for any raster images: minimum **300 DPI**

### 6. File Size
- Maximum upload: **5 GB** (not a practical concern for text-only puzzle PDFs)
- Aim to keep file size reasonable; avoid embedding large bitmap images

### 7. Puzzle Content Constraints (Print Readability)
These are derived from KDP's minimum readable print requirements:

| Element | Minimum size | Project setting |
|---------|-------------|-----------------|
| Body text / clue text | 8 pt | `KDP.fontSize.clue = 10` |
| Footer text | 7 pt min | `KDP.fontSize.footer = 9` |
| Grid cell numbers | 10 pt min | `KDP.fontSize.cell = 16` |
| Puzzle title | 14 pt min | `KDP.fontSize.pageTitle = 18` |

- Grid line widths: thin lines ≥ 0.25 pt, bold dividers ≥ 1.5 pt
  - Project uses `KDP.gridLineWidth = 0.5` and `KDP.gridBoldLineWidth = 2.0` — do not reduce these

### 8. Puzzle-Type Specific Rules

**Sudoku**
- Grid must be exactly 9×9
- Unique solution required (enforced by `countSolutions()` in generator — do not remove this check)
- Clue count ranges must stay within difficulty bounds:
  - Easy: 36–45 clues | Normal: 28–35 clues | Hard: 22–27 clues

**Word Search**
- Grid must be large enough that all words fit; minimum 10×10 recommended
- All characters must be uppercase Latin letters A–Z (no accented characters — print rendering issues)

**Crossword**
- All cells must be within the content area — never exceed `KDP.contentWidthPt` or `KDP.contentHeightPt`
- Clue text wraps within column width; verify with `doc.heightOfString()` before rendering

**Word Scramble / Cryptogram**
- Answer lines must have clear visual separation from puzzle text
- Solution sections must appear only in the Solutions section (back of book), never on the puzzle page itself

### 9. Book Metadata
- PDF `Title` and `Subject` metadata must be populated (done in `buildBook()` via PDFKit `info` option)
- Do not include personally identifiable information in metadata

---

## Pre-Creation Checklist

Run through this checklist mentally before writing any puzzle generation or PDF rendering code:

- [ ] Page dimensions are exactly 612 × 792 pt
- [ ] No content is placed inside the margin zones
- [ ] Color values are grayscale only (hex `#xxxxxx` where R=G=B, or black/white)
- [ ] All font sizes are at or above the minimums in the table above
- [ ] Grid lines are at or above minimum stroke widths
- [ ] Puzzle has a unique, valid solution
- [ ] Page count will remain even after adding the new puzzle pages
- [ ] No encryption, JS, or external resources are embedded in the PDF

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `lib/pdf/kdpConfig.ts` | All KDP dimension and typography constants — always import from here, never hardcode measurements |
| `lib/pdf/bookBuilder.ts` | Orchestrates the full PDF; maintains page count parity |
| `lib/pdf/pageLayouts.ts` | Per-puzzle-type page renderers |
| `lib/puzzles/*/generator.ts` | Puzzle generation logic; difficulty + validation live here |
| `app/api/generate/route.ts` | API endpoint; validates user input before calling `buildBook()` |

---

## What NOT to Change Without a KDP Review

- Trim size constants in `kdpConfig.ts`
- Margin values in `kdpConfig.ts` (any reduction risks content in the gutter)
- The even-page enforcement block at the end of `buildBook()`
- The `countSolutions()` uniqueness check in the Sudoku generator
- Font embedding approach (PDFKit built-in fonts only unless verified)
