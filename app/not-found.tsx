import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="app-container">
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📚</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Page not found</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>
            The page you are looking for does not exist.
          </p>
          <Link href="/" className="generate-btn" style={{ display: 'inline-flex', width: 'auto', padding: '12px 28px', fontSize: 15, textDecoration: 'none' }}>
            <span>← Back to generator</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
