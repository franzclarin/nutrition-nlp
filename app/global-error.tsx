'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#F7F5F0' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '1.25rem',
              padding: '2rem',
              maxWidth: '28rem',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {error.message || 'A critical error occurred.'}
            </p>
            {error.digest && (
              <p style={{ color: '#9CA3AF', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '1rem' }}>
                ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                background: '#2D6A4F',
                color: '#fff',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '0.625rem 1.25rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
