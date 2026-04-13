'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="app-container">
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="error-card" style={{ flexDirection: 'column', maxWidth: 480, textAlign: 'center', padding: '40px 32px' }}>
          <span className="error-icon" style={{ fontSize: 48, marginBottom: 16 }}>⚠️</span>
          <p className="error-text" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </p>
          <p className="error-text" style={{ fontSize: 13, opacity: 0.75, marginBottom: 24 }}>
            {error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={reset}
            className="generate-btn"
            style={{ width: 'auto', padding: '12px 28px', fontSize: 15 }}
          >
            <span>Try again</span>
          </button>
        </div>
      </div>
    </div>
  );
}
