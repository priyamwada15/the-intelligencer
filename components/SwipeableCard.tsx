"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
  type MotionStyle,
  type PanInfo,
} from "motion/react";
import { resolveSwipeDirection, SWIPE_THRESHOLD_PX, SWIPE_VELOCITY_THRESHOLD, type SwipeDirection } from "@/lib/swipe";

export const CARD_RADIUS = "rounded-[26px_26px_34px_24px]";

// How far a card travels off-screen on exit / starts from on entry.
const OFF_SCREEN_X = 380;
// Degrees of rotation at the edge of the drag range, matching the old
// dragX / 20 mapping (roughly ±15deg at a ~300px drag).
const ROTATE_RANGE_DEG = 15;
const ROTATE_RANGE_PX = 300;

export const cardVariants = {
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

// The generic drag/swipe/height-reporting shell shared by StoryCard and
// AllCaughtUpCard — everything about how a card enters, exits, drags and
// reports its height lives here once; each card only supplies its own
// content and background styling.
export function SwipeableCard({
  ariaLabel,
  direction,
  onSwipe,
  onHeightChange,
  className,
  children,
}: {
  ariaLabel: string;
  direction: SwipeDirection | null;
  onSwipe: (direction: SwipeDirection) => void;
  onHeightChange?: (height: number) => void;
  className: string;
  children: ReactNode;
}) {
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

  const handleDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
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

  const style: MotionStyle = {
    x,
    rotate,
    touchAction: "pan-y",
    paddingTop: "var(--pad-card-top)",
    paddingBottom: "var(--pad-card-bottom)",
  };

  return (
    <motion.article
      ref={articleRef}
      tabIndex={0}
      role="group"
      aria-roledescription="story card"
      aria-label={ariaLabel}
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
      style={style}
      className={className}
    >
      {children}
    </motion.article>
  );
}
