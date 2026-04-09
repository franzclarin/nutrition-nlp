'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="text-sm text-muted">
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.digest && (
          <p className="text-xs text-muted font-mono">ID: {error.digest}</p>
        )}
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
      </div>
    </div>
  );
}
