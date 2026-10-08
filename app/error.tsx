// Error boundaries must be Client Components
"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // TODO: forward to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      {error.digest && (
        <p className="font-mono text-sm text-zinc-500">
          Reference: {error.digest}
        </p>
      )}
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-full bg-foreground px-5 py-2 text-background"
      >
        Try again
      </button>
    </main>
  );
}
