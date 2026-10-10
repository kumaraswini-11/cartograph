// Error boundaries must be Client Components
"use client";

import { ErrorFallback } from "@/components/error-fallback";

import { fontVariables } from "./fonts";

import "./globals.css";

// Replaces the root layout when it errors, so it must render its own
// <html>/<body>, styles, fonts, and title (metadata exports are not supported here).
// ThemeProvider lives in the root layout, so this screen follows the OS theme
// rather than a stored Light/Dark choice. Accepted for a last-resort screen.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <title>Error · Cartograph</title>
        <main className="flex flex-1 p-4">
          <ErrorFallback digest={error.digest} retry={retry} />
        </main>
      </body>
    </html>
  );
}
