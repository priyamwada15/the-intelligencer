"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ExternalLink } from "lucide-react";
import { CATEGORIES, getCategoryStyle } from "@/lib/categories";
import { resolveSwipeDirection, type SwipeDirection } from "@/lib/swipe";
import type { Article } from "@/lib/article";

const CARD_RADIUS = "rounded-[26px_26px_34px_24px]";
const SWIPE_THRESHOLD_PX = 80;

export function StoryCard({
  article,
  index,
  total,
  onSwipe,
}: {
  article: Article;
  index: number;
  total: number;
  onSwipe: (direction: SwipeDirection) => void;
}) {
  const category = CATEGORIES.find((c) => c.id === article.category);
  const { badgeClass } = getCategoryStyle(article.category, true);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartX = useRef<number | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    // Let taps on the footer link (or its icon) pass through untouched. Setting
    // pointer capture on the article would retarget the resulting click event to
    // the article itself (this is spec'd/observed Chrome behavior), which bypasses
    // the anchor's default navigation even for a plain tap with no drag.
    if ((event.target as HTMLElement).closest("a")) return;
    pointerStartX.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (pointerStartX.current === null) return;
    setDragX(event.clientX - pointerStartX.current);
  };

  const commitOrReset = (deltaX: number) => {
    pointerStartX.current = null;
    setIsDragging(false);
    const direction = resolveSwipeDirection(deltaX, SWIPE_THRESHOLD_PX);
    if (direction) {
      onSwipe(direction);
    }
    setDragX(0);
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    if (pointerStartX.current === null) return;
    commitOrReset(event.clientX - pointerStartX.current);
  };

  const handlePointerCancel = () => {
    if (pointerStartX.current === null) return;
    commitOrReset(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") onSwipe("prev");
    if (event.key === "ArrowRight") onSwipe("next");
  };

  return (
    <div className="relative isolate min-h-[455px] px-6">
      {/* Two static rotated cards behind the main card, matching Figma's "Other" layers */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-6 inset-y-0 rotate-[5.3deg] border-[0.8px] border-border-subtle bg-accent-subtle ${CARD_RADIUS}`}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-x-6 inset-y-0 -rotate-[4.5deg] border-[0.8px] border-border-subtle bg-accent ${CARD_RADIUS}`}
      />

      <article
        tabIndex={0}
        role="group"
        aria-roledescription="story card"
        aria-label={`Story ${index + 1} of ${total}: ${article.headline}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        style={{
          transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
          touchAction: "pan-y",
        }}
        className={`relative z-[2] flex min-h-[455px] cursor-grab flex-col gap-6 border-[0.8px] border-border-black bg-surface-card p-6 shadow-[0px_12px_30px_rgba(38,58,47,0.09),0px_2px_4px_rgba(38,58,47,0.05)] outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-text-accent ${CARD_RADIUS}`}
      >
        <div className="flex items-center justify-between">
          <span className={`flex h-[27px] items-center rounded-md px-4 text-label-sm ${badgeClass}`}>
            {category?.label ?? article.category}
          </span>
          <span className="text-micro text-text-secondary">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-display font-bold text-text-primary">{article.headline}</h2>
          <p className="font-figtree text-body font-light text-text-body">{article.summary}</p>
        </div>

        <footer className="mt-auto flex items-end justify-between gap-4 opacity-80">
          <span className="text-caption text-text-secondary">{article.timestamp}</span>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-caption text-text-accent"
          >
            {article.source}
            <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
          </a>
        </footer>
      </article>
    </div>
  );
}
