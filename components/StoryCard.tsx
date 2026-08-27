"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react";
import { ExternalLink } from "lucide-react";
import { CATEGORIES, getCategoryStyle } from "@/lib/categories";
import { resolveSwipeDirection, SWIPE_THRESHOLD_PX, SWIPE_VELOCITY_THRESHOLD, type SwipeDirection } from "@/lib/swipe";
import type { Article } from "@/lib/article";

export const CARD_RADIUS = "rounded-[26px_26px_34px_24px]";

// How far a card travels off-screen on exit / starts from on entry.
const OFF_SCREEN_X = 380;
// Degrees of rotation at the edge of the drag range, matching the old
// dragX / 20 mapping (roughly ±15deg at a ~300px drag).
const ROTATE_RANGE_DEG = 15;
const ROTATE_RANGE_PX = 300;

const cardVariants = {
  enter: (direction: SwipeDirection | null) => ({
    x: direction === "next" ? OFF_SCREEN_X : direction === "prev" ? -OFF_SCREEN_X : 0,
    opacity: 0,
    scale: 0.96,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: SwipeDirection | null) => ({
    x: direction === "next" ? -OFF_SCREEN_X : direction === "prev" ? OFF_SCREEN_X : 0,
    opacity: 0,
    scale: 0.96,
  }),
};

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

  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-ROTATE_RANGE_PX, ROTATE_RANGE_PX], [-ROTATE_RANGE_DEG, ROTATE_RANGE_DEG]);
  const articleRef = useRef<HTMLElement>(null);

  // Report this card's real (border-box) height whenever it changes, so the
  // stack wrapper can animate to it explicitly — Motion's own `layout`
  // FLIP-based sizing didn't pick up the height change until the outgoing
  // card had fully unmounted, producing an abrupt snap instead of a smooth
  // resize (see docs/decision-log.md).
  useEffect(() => {
    const el = articleRef.current;
    if (!el || !onHeightChange) return;
    const report = () => onHeightChange(el.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeightChange]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    // Let taps on the footer link (or its icon) pass through untouched — starting
    // the drag gesture from here would intercept the pointer and the anchor would
    // never see its click. See docs/decision-log.md's Phase 2 entry for the
    // original setPointerCapture version of this bug.
    if ((event.target as Element).closest("a")) return;
    dragControls.start(event);
  };

  const handleDragEnd = (
    _event: PointerEvent | MouseEvent | TouchEvent,
    info: PanInfo,
  ) => {
    const resolved = resolveSwipeDirection(
      info.offset.x,
      SWIPE_THRESHOLD_PX,
      info.velocity.x,
      SWIPE_VELOCITY_THRESHOLD,
    );
    if (resolved) onSwipe(resolved);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") onSwipe("prev");
    if (event.key === "ArrowRight") onSwipe("next");
  };

  return (
    <motion.article
      ref={articleRef}
      tabIndex={0}
      role="group"
      aria-roledescription="story card"
      aria-label={`Story ${index + 1} of ${total}: ${article.headline}`}
      custom={direction}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
      drag="x"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      style={{
        x,
        rotate,
        touchAction: "pan-y",
        paddingTop: "var(--pad-card-top)",
        paddingBottom: "var(--pad-card-bottom)",
      }}
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
    </motion.article>
  );
}
