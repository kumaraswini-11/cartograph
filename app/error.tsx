// Error boundaries must be Client Components
"use client";

import { useEffect } from "react";

import { ErrorFallback } from "@/components/error-fallback";

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 p-4">
      <ErrorFallback digest={error.digest} retry={retry} />
    </main>
  );
}
