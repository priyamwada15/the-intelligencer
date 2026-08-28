"use client";

import { ExternalLink } from "lucide-react";
import { CATEGORIES, getCategoryStyle } from "@/lib/categories";
import type { SwipeDirection } from "@/lib/swipe";
import type { Article } from "@/lib/article";
import { SwipeableCard, CARD_RADIUS } from "./SwipeableCard";

// Renders just the animated card itself — the surrounding stack wrapper and
// decorative "cards behind" layers are owned by IntelligencerScreen, since
// they must stay mounted once (not duplicated per outgoing/incoming card)
// for AnimatePresence's two simultaneous card instances to stack correctly.
export function StoryCard({
  article,
  index,
  total,
  direction,
  onSwipe,
  onHeightChange,
}: {
  article: Article;
  index: number;
  total: number;
  direction: SwipeDirection | null;
  onSwipe: (direction: SwipeDirection) => void;
  onHeightChange?: (height: number) => void;
}) {
  const category = CATEGORIES.find((c) => c.id === article.category);
  const { badgeClass } = getCategoryStyle(article.category, true);

  return (
    <SwipeableCard
      ariaLabel={`Story ${index + 1} of ${total}: ${article.headline}`}
      direction={direction}
      onSwipe={onSwipe}
      onHeightChange={onHeightChange}
      className={`relative z-[2] col-start-1 row-start-1 flex cursor-grab select-none flex-col gap-6 self-start border-[0.8px] border-border-black bg-surface-card px-6 shadow-[0px_12px_30px_rgba(38,58,47,0.09),0px_2px_4px_rgba(38,58,47,0.05)] outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-text-accent ${CARD_RADIUS}`}
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

      <footer className="flex items-end justify-between gap-4 opacity-80">
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
    </SwipeableCard>
  );
}
