import Image from "next/image";
import crtTerminalForest from "@/public/crt-terminal-forest.avif";

// Shared across the empty-filter, loading and error states — same
// illustration each time, distinguished only by the message. Sits directly
// on the screen (not inside a card), since none of these states have any
// content to put a card around.
export function IllustratedState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <Image src={crtTerminalForest} alt="" className="h-auto w-40 select-none" priority={false} />
      <p className="text-body text-text-secondary">{message}</p>
    </div>
  );
}
