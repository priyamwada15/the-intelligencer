import { IllustratedState } from "@/components/IllustratedState";

// Shown automatically by Next.js while app/page.tsx's async Server
// Component is fetching (the initial edition data), via React Suspense.
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] items-center justify-center overflow-x-hidden">
      <IllustratedState message="Give the vines a second to catch up." />
    </main>
  );
}
