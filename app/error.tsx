"use client";

import { useEffect } from "react";
import { IllustratedState } from "@/components/IllustratedState";

// Next.js's error boundary convention — catches an unhandled exception
// during rendering. app/page.tsx's own data-fetch failures are handled
// separately and never throw (they fall back to placeholder data), so in
// normal operation this only ever fires for a genuine, unexpected bug, not
// as a replacement for that graceful degradation.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-center justify-center overflow-x-hidden">
      <IllustratedState message="The forest ate the connection." />
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-accent px-4 py-2 text-label text-text-primary"
      >
        Try again
      </button>
    </main>
  );
}
