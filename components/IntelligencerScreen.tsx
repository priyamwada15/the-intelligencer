"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue } from "motion/react";
import { Header } from "./Header";
import { EditionDateBar } from "./EditionDateBar";
import { FilterChips } from "./FilterChips";
import { StoryCard, CARD_RADIUS } from "./StoryCard";
import { filterArticles, clampIndex, canGoToOlderEdition, canGoToNewerEdition } from "@/lib/editions";
import type { Edition } from "@/lib/editions";
import type { CategoryFilter } from "@/lib/categories";
import type { SwipeDirection } from "@/lib/swipe";

// Page-load entrance: each section rises/fades in shortly after the one
// before it, so the page reads as assembling itself in a considered order
// rather than popping in all at once. Runs once per mount only — later
// content changes (swipe, filter, date-nav) are handled by their own
// transitions, not this one.
const pageVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] as const } },
};

export function IntelligencerScreen({ editions }: { editions: Edition[] }) {
  const [dateIndex, setDateIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [cardIndex, setCardIndex] = useState(0);
  // Direction of the most recent transition — drives which way the outgoing
  // card exits and the incoming card enters. Reset to null (a plain fade, no
  // horizontal slide) for date/category changes, which aren't directional.
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection | null>(null);

  // The stack wrapper's height, driven explicitly from the current card's
  // real measured height (see StoryCard's onHeightChange) rather than CSS
  // auto-sizing, so it can animate smoothly to a differently-sized card
  // instead of snapping the instant the outgoing card unmounts.
  const stackHeight = useMotionValue<number | "auto">("auto");
  const hasMeasuredHeight = useRef(false);
  const handleHeightChange = useCallback(
    (height: number) => {
      if (!hasMeasuredHeight.current) {
        hasMeasuredHeight.current = true;
        stackHeight.set(height);
        return;
      }
      animate(stackHeight, height, { type: "spring", duration: 0.35, bounce: 0 });
    },
    [stackHeight],
  );

  const edition = editions[dateIndex];
  const articles = filterArticles(edition, activeCategory);
  const safeIndex = clampIndex(cardIndex, articles.length);
  const activeArticle = articles[safeIndex];

  const handleSelectCategory = (category: CategoryFilter) => {
    setActiveCategory(category);
    setCardIndex(0);
    setSwipeDirection(null);
  };

  const handlePrevDate = () => {
    setDateIndex((current) => clampIndex(current + 1, editions.length));
    setActiveCategory("ALL");
    setCardIndex(0);
    setSwipeDirection(null);
  };

  const handleNextDate = () => {
    setDateIndex((current) => clampIndex(current - 1, editions.length));
    setActiveCategory("ALL");
    setCardIndex(0);
    setSwipeDirection(null);
  };

  const handleSwipe = (direction: SwipeDirection) => {
    setSwipeDirection(direction);
    setCardIndex(clampIndex(direction === "next" ? safeIndex + 1 : safeIndex - 1, articles.length));
  };

  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={pageVariants}
      // min-h-dvh (not min-h-screen/100vh) so the page matches the actual
      // visible viewport on mobile, not the tallest-possible one — 100vh
      // otherwise leaves a phantom scroll gap under a mobile browser's
      // collapsible address bar even when no content is being clipped.
      // min-height (not height) still lets the page grow and scroll on the
      // rare edition where content genuinely exceeds the viewport.
      className="mx-auto min-h-dvh max-w-[560px] overflow-x-hidden"
      style={{ paddingTop: "var(--pad-screen-top)", paddingBottom: "var(--pad-screen-bottom)" }}
    >
      <motion.div variants={sectionVariants}>
        <Header />
      </motion.div>
      <motion.div variants={sectionVariants}>
        <EditionDateBar
          date={edition.date}
          onPrev={handlePrevDate}
          onNext={handleNextDate}
          prevDisabled={!canGoToOlderEdition(dateIndex, editions.length)}
          nextDisabled={!canGoToNewerEdition(dateIndex)}
        />
      </motion.div>
      <motion.div variants={sectionVariants}>
        <FilterChips activeCategory={activeCategory} onSelect={handleSelectCategory} />
      </motion.div>
      {activeArticle ? (
        <motion.div variants={sectionVariants} style={{ height: stackHeight }} className="relative isolate grid px-6">
          {/* Two static rotated cards behind the main card, matching Figma's
              "Other" layers. Kept outside AnimatePresence: they're a stable
              backdrop for whichever card is on top, not tied to a specific
              article, so they must not be duplicated per outgoing/incoming
              card the way the article itself is. The wrapper's height is
              driven explicitly (see stackHeight above) so it animates
              smoothly to a differently-sized card. */}
          <div
            aria-hidden="true"
            className={`absolute inset-x-6 inset-y-0 rotate-[5.3deg] border-[0.8px] border-border-subtle bg-accent-subtle ${CARD_RADIUS}`}
          />
          <div
            aria-hidden="true"
            className={`absolute inset-x-6 inset-y-0 -rotate-[4.5deg] border-[0.8px] border-border-subtle bg-accent ${CARD_RADIUS}`}
          />
          <AnimatePresence mode="popLayout" initial={false} custom={swipeDirection}>
            <StoryCard
              key={activeArticle.url}
              article={activeArticle}
              index={safeIndex}
              total={articles.length}
              direction={swipeDirection}
              onSwipe={handleSwipe}
              onHeightChange={handleHeightChange}
            />
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.p
          variants={sectionVariants}
          className="px-6 py-16 text-center text-body text-text-secondary"
        >
          No stories in this category for this edition.
        </motion.p>
      )}
      <motion.p
        variants={sectionVariants}
        className="pt-5 text-center text-micro tracking-[0.2px] text-text-muted"
      >
        swipe to read more stories
      </motion.p>
    </motion.main>
  );
}
