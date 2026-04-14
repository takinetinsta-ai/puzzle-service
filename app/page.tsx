'use client';

import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Theme = 'nature' | 'travel' | 'food' | 'sports' | 'history' | 'science'
  | '90s' | '2000s' | 'music' | 'space' | 'movies';
type Difficulty = 'easy' | 'normal' | 'hard';
type TrimSize = '8.5x11' | '6x9' | '5.5x8.5';

interface PuzzleCounts {
  sudoku: number;
  wordSearch: number;
  wordScramble: number;
  cryptogram: number;
}

const THEMES: { id: Theme; label: string; emoji: string; desc: string }[] = [
  { id: 'nature',  label: 'Nature',  emoji: '🌿', desc: 'Forests, glaciers & ecosystems' },
  { id: 'travel',  label: 'Travel',  emoji: '✈️', desc: 'Destinations & adventures' },
  { id: 'food',    label: 'Food',    emoji: '🍕', desc: 'Cuisine from around the world' },
  { id: 'sports',  label: 'Sports',  emoji: '⚽', desc: 'Athletics & competitions' },
  { id: 'history', label: 'History', emoji: '📜', desc: 'Ancient & modern events' },
  { id: 'science', label: 'Science', emoji: '🔬', desc: 'Physics, biology & more' },
  { id: '90s',     label: '90s',     emoji: '📼', desc: 'Nostalgia from the nineties' },
  { id: '2000s',   label: '2000s',   emoji: '💿', desc: 'The digital decade' },
  { id: 'music',   label: 'Music',   emoji: '🎵', desc: 'Melodies, genres & artists' },
  { id: 'space',   label: 'Space',   emoji: '🚀', desc: 'Galaxies, stars & cosmos' },
  { id: 'movies',  label: 'Movies',  emoji: '🎬', desc: 'Cinema, genres & classics' },
];

const TRIM_SIZES: { id: TrimSize; label: string; desc: string }[] = [
  { id: '8.5x11',  label: '8.5" × 11"',  desc: 'Large (most popular)' },
  { id: '6x9',     label: '6" × 9"',     desc: 'Standard book' },
  { id: '5.5x8.5', label: '5.5" × 8.5"', desc: 'Digest size' },
];

const PUZZLE_TYPES: { id: keyof PuzzleCounts; name: string; desc: string; emoji: string }[] = [
  { id: 'sudoku',      name: 'Sudoku',      desc: 'Classic 9×9 number grid',             emoji: '🔢' },
  { id: 'wordSearch',  name: 'Word Search', desc: 'Find hidden words in a letter grid',  emoji: '🔍' },
  { id: 'wordScramble',name: 'Word Scramble',desc: 'Unscramble themed words',            emoji: '🔤' },
  { id: 'cryptogram',  name: 'Cryptogram',  desc: 'Decode the hidden quote',             emoji: '🔐' },
];

type AppState = 'idle' | 'generating' | 'success' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  // Form state
  const [title, setTitle]         = useState('My Puzzle Book Vol. 1');
  const [theme, setTheme]         = useState<Theme>('nature');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [trimSize, setTrimSize]   = useState<TrimSize>('8.5x11');
  const [enabled, setEnabled]     = useState<Record<keyof PuzzleCounts, boolean>>({
    sudoku: true, wordSearch: true, wordScramble: true, cryptogram: false,
  });
  const [counts, setCounts] = useState<PuzzleCounts>({
    sudoku: 20, wordSearch: 15, wordScramble: 15, cryptogram: 10,
  });

  // UI state
  const [appState, setAppState]   = useState<AppState>('idle');
  const [error, setError]         = useState('');
  const [errorStack, setErrorStack] = useState('');
  const [violations, setViolations] = useState<string[]>([]);
  const [downloadUrl, setDownloadUrl]   = useState('');
  const [downloadName, setDownloadName] = useState('');

  // ─── Computed ────────────────────────────────────────────────────────────────

  const totalPuzzles = Object.entries(counts).reduce(
    (sum, [key, val]) => sum + (enabled[key as keyof PuzzleCounts] ? val : 0),
    0,
  );

  const activePuzzleCounts = Object.fromEntries(
    Object.entries(counts).map(([key, val]) => [key, enabled[key as keyof PuzzleCounts] ? val : 0]),
  ) as PuzzleCounts;

  // Estimate final page count using same formula as kdpValidator
  const activeSudoku       = enabled.sudoku       ? counts.sudoku       : 0;
  const activeWordScramble = enabled.wordScramble ? counts.wordScramble : 0;
  const activeCryptogram   = enabled.cryptogram   ? counts.cryptogram   : 0;
  const solutionPages = 1 + activeSudoku
    + (activeWordScramble > 0 ? 1 : 0)
    + (activeCryptogram   > 0 ? 1 : 0);
  const rawPages       = 2 + totalPuzzles + solutionPages;
  const estimatedPages = rawPages % 2 !== 0 ? rawPages + 1 : rawPages;
  const belowMinPages  = estimatedPages < 24;

  // ─── Auto-fill ───────────────────────────────────────────────────────────────

  // Page cost per puzzle type:
  //   sudoku:      1 puzzle page + 1 solution page = 2
  //   wordSearch:  1 puzzle page only              = 1
  //   wordScramble/cryptogram: 1 puzzle page + shared 1-page solution block = 1
  //     (the shared solution page is a fixed cost already counted in solutionPages)
  const PAGE_COST: Record<keyof PuzzleCounts, number> = {
    sudoku: 2, wordSearch: 1, wordScramble: 1, cryptogram: 1,
  };

  function estimatePages(c: PuzzleCounts): number {
    const total = Object.values(c).reduce((s, n) => s + n, 0);
    const sol = 1 + c.sudoku
      + (c.wordScramble > 0 ? 1 : 0)
      + (c.cryptogram   > 0 ? 1 : 0);
    const raw = 2 + total + sol;
    return raw % 2 !== 0 ? raw + 1 : raw;
  }

  function handleAutoFill() {
    const activeTypes = (Object.keys(enabled) as (keyof PuzzleCounts)[]).filter(k => enabled[k]);
    if (activeTypes.length === 0) return;

    const TARGET = 100;
    // Start from scratch with 1 of each enabled type
    const next: PuzzleCounts = { sudoku: 0, wordSearch: 0, wordScramble: 0, cryptogram: 0 };
    for (const k of activeTypes) next[k] = 1;

    // Add puzzles one at a time to the cheapest type until we reach the target
    for (let guard = 0; guard < 10_000; guard++) {
      const pages = estimatePages(next);
      if (pages >= TARGET) break;

      // Pick the enabled type with the lowest page-cost-per-puzzle
      let best = activeTypes[0];
      for (const k of activeTypes) {
        if (PAGE_COST[k] < PAGE_COST[best]) best = k;
        else if (PAGE_COST[k] === PAGE_COST[best] && next[k] < next[best]) best = k;
      }
      if (next[best] >= 100) break;
      next[best]++;
    }

    // Clamp all to max 100
    for (const k of activeTypes) next[k] = Math.min(100, next[k]);
    setCounts(next);
  }

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function togglePuzzle(id: keyof PuzzleCounts) {
    setEnabled(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function changeCount(id: keyof PuzzleCounts, delta: number) {
    setCounts(prev => ({ ...prev, [id]: Math.max(1, Math.min(100, prev[id] + delta)) }));
  }

  async function handleGenerate() {
    if (totalPuzzles === 0) {
      setError('Select at least one puzzle type.');
      return;
    }

    setAppState('generating');
    setError('');
    setErrorStack('');
    setViolations([]);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          theme,
          difficulty,
          trimSize,
          puzzleCounts: activePuzzleCounts,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        if (body.violations?.length) setViolations(body.violations);
        if (body.stack) setErrorStack(body.stack);
        throw new Error(body.error || 'Unknown error');
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1]
        ?? 'puzzle_book.pdf';

      // Trigger download immediately
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadUrl(url);
      setDownloadName(filename);
      setAppState('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
      setAppState('error');
    }
  }

  function handleReset() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setAppState('idle');
    setError('');
    setViolations([]);
    setDownloadUrl('');
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">📚</div>
        <div className="header-text">
          <h1>Puzzle Book Generator</h1>
          <p>Create KDP-ready adult puzzle books in seconds</p>
        </div>
        <span className="header-badge">KDP Ready</span>
      </header>

      <main className="main-content">
        {/* Step 1: Book Settings */}
        <div className="config-section">
          <div className="section-header">
            <div className="step-badge">1</div>
            <h2>Book Settings</h2>
          </div>
          <div className="card">
            <div className="form-group">
              <label className="form-label" htmlFor="book-title">Book Title</label>
              <input
                id="book-title"
                className="form-input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="My Puzzle Book Vol. 1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Difficulty Level</label>
              <div className="pill-group">
                {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    className={`pill ${difficulty === d ? 'active' : ''}`}
                    onClick={() => setDifficulty(d)}
                  >
                    {d === 'easy' ? '😊 Easy' : d === 'normal' ? '🧠 Normal' : '🔥 Hard'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Trim Size</label>
              <div className="pill-group">
                {TRIM_SIZES.map(ts => (
                  <button
                    key={ts.id}
                    className={`pill ${trimSize === ts.id ? 'active' : ''}`}
                    onClick={() => setTrimSize(ts.id)}
                  >
                    {ts.label}
                    <span style={{ fontSize: 10, display: 'block', opacity: 0.7 }}>{ts.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="info-box" style={{ marginTop: 16 }}>
              <strong>Interior:</strong> Black &amp; white &nbsp;|&nbsp;
              <strong>Format:</strong> KDP-print-ready PDF
            </div>
          </div>
        </div>

        {/* Step 2: Theme */}
        <div className="config-section">
          <div className="section-header">
            <div className="step-badge">2</div>
            <h2>Choose a Theme</h2>
          </div>
          <div className="card">
            <div className="theme-grid">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  className={`theme-card ${theme === t.id ? 'active' : ''}`}
                  onClick={() => setTheme(t.id)}
                >
                  <span className="theme-emoji">{t.emoji}</span>
                  <span className="theme-name">{t.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 3: Puzzle Mix */}
        <div className="config-section">
          <div className="section-header">
            <div className="step-badge">3</div>
            <h2>Puzzle Mix</h2>
            <button
              className="autofill-btn"
              onClick={handleAutoFill}
              title="Auto-distribute puzzles to reach ~100 pages"
            >
              📄 Auto-fill to 100 pages
            </button>
          </div>
          <div className="card">
            <div className="puzzle-grid">
              {PUZZLE_TYPES.map(pt => (
                <div key={pt.id} className={`puzzle-row ${enabled[pt.id] ? 'enabled' : ''}`}>
                  <button
                    className={`puzzle-toggle ${enabled[pt.id] ? 'on' : ''}`}
                    onClick={() => togglePuzzle(pt.id)}
                    aria-label={`Toggle ${pt.name}`}
                  />
                  <span style={{ fontSize: 20 }}>{pt.emoji}</span>
                  <div className="puzzle-info">
                    <div className="puzzle-name">{pt.name}</div>
                    <div className="puzzle-desc">{pt.desc}</div>
                  </div>
                  <div className="puzzle-count-control" style={{ opacity: enabled[pt.id] ? 1 : 0.3 }}>
                    <button
                      className="count-btn"
                      onClick={() => changeCount(pt.id, -5)}
                      disabled={!enabled[pt.id] || counts[pt.id] <= 1}
                    >−</button>
                    <span className="count-value">{counts[pt.id]}</span>
                    <button
                      className="count-btn"
                      onClick={() => changeCount(pt.id, 5)}
                      disabled={!enabled[pt.id] || counts[pt.id] >= 100}
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary & Generate */}
        <div className="config-section">
          <div className="section-header">
            <div className="step-badge">4</div>
            <h2>Generate Your Book</h2>
          </div>

          {/* Summary bar */}
          <div className="summary-bar">
            <div className="summary-item">
              <span className="summary-label">Title</span>
              <span className="summary-value">{title || '—'}</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-item">
              <span className="summary-label">Theme</span>
              <span className="summary-value">{theme}</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-item">
              <span className="summary-label">Difficulty</span>
              <span className="summary-value">{difficulty}</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-item">
              <span className="summary-label">Trim</span>
              <span className="summary-value">{trimSize}</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-item">
              <span className="summary-label">Types</span>
              <span className="summary-value">
                {Object.entries(enabled).filter(([, v]) => v).length} selected
              </span>
            </div>
            <div className="total-puzzles">{totalPuzzles} Puzzles</div>
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span className="summary-label">Est. pages:</span>
              <span className="summary-value" style={{ color: belowMinPages ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                {estimatedPages}
              </span>
              {belowMinPages && (
                <span style={{ fontSize: 12, color: 'var(--accent-red)' }}>
                  — KDP minimum is 24, add more puzzles
                </span>
              )}
            </div>
          </div>

          {/* Generate button */}
          {appState === 'idle' || appState === 'error' ? (
            <>
              <button
                id="generate-btn"
                className="generate-btn"
                onClick={handleGenerate}
                disabled={!title.trim() || totalPuzzles === 0 || belowMinPages}
              >
                <span>⚡ Generate PDF Book</span>
              </button>
              {error && (
                <div className="error-card">
                  <span className="error-icon">⚠️</span>
                  <div>
                    <span className="error-text">{error}</span>
                    {violations.length > 0 && (
                      <ul className="error-violations">
                        {violations.map((v, i) => <li key={i}>{v}</li>)}
                      </ul>
                    )}
                    {errorStack && (
                      <pre style={{ fontSize: 10, marginTop: 8, whiteSpace: 'pre-wrap', color: '#555' }}>{errorStack}</pre>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : appState === 'generating' ? (
            <div className="progress-card">
              <div className="spinner" />
              <div className="progress-text">Generating your puzzle book…</div>
              <div className="progress-sub">
                Building {totalPuzzles} puzzles with solutions. This may take a moment.
              </div>
            </div>
          ) : (
            <div className="success-card">
              <div className="success-icon">🎉</div>
              <div className="success-title">Your Puzzle Book is Ready!</div>
              <div className="success-sub">
                {totalPuzzles} puzzles + full solutions section — KDP-ready PDF
              </div>
              <a
                href={downloadUrl}
                download={downloadName}
                className="download-btn"
                id="download-btn"
              >
                ⬇️ Download PDF
              </a>
              <button className="reset-btn" onClick={handleReset}>
                ← Create another book
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
