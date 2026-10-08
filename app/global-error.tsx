"use client"; // Error boundaries must be Client Components

import { fontVariables } from "./fonts";
import "./globals.css";

// Replaces the root layout when it errors, so it must render its own
// <html>/<body>, styles, fonts, and title (metadata exports are not supported here).
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" className={`${fontVariables} antialiased`}>
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <title>Error · Cartograph</title>
        <h2 className="text-2xl font-semibold">Something went wrong</h2>
        {error.digest && (
          <p className="font-mono text-sm text-zinc-500">Reference: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-foreground px-5 py-2 text-background"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
