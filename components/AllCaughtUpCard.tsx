"use client";

import type { SwipeDirection } from "@/lib/swipe";
import { SwipeableCard, CARD_RADIUS } from "./SwipeableCard";

// Shown once you've swiped past the last real story — takes over the front
// position with the same accent fill as the static decorative card behind
// it, so reaching the end reads as "you've worked through the whole stack
// down to the card that was underneath it" rather than a generic empty
// state. Swiping back (prev) returns to the last real story.
export function AllCaughtUpCard({
  direction,
  onSwipe,
  onHeightChange,
}: {
  direction: SwipeDirection | null;
  onSwipe: (direction: SwipeDirection) => void;
  onHeightChange?: (height: number) => void;
}) {
  return (
    <SwipeableCard
      ariaLabel="All caught up"
      direction={direction}
      onSwipe={onSwipe}
      onHeightChange={onHeightChange}
      className={`relative z-[2] col-start-1 row-start-1 flex min-h-[200px] cursor-grab select-none items-center justify-center self-start border-[0.8px] border-border-black bg-accent px-6 text-center shadow-[0px_12px_30px_rgba(38,58,47,0.09),0px_2px_4px_rgba(38,58,47,0.05)] outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-text-accent ${CARD_RADIUS}`}
    >
      <p className="text-heading font-bold text-text-primary">You&apos;re all caught up, go touch some grass now.</p>
    </SwipeableCard>
  );
}
