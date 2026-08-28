"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue } from "motion/react";
import { Header } from "./Header";
import { EditionDateBar } from "./EditionDateBar";
import { FilterChips } from "./FilterChips";
import { StoryCard } from "./StoryCard";
import { AllCaughtUpCard } from "./AllCaughtUpCard";
import { IllustratedState } from "./IllustratedState";
import { CARD_RADIUS } from "./SwipeableCard";
import {
  filterArticles,
  clampIndex,
  canGoToOlderEdition,
  canGoToNewerEdition,
  sortCategoriesByAvailability,
} from "@/lib/editions";
import type { Edition } from "@/lib/editions";
import { CATEGORIES } from "@/lib/categories";
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
  const hasArticles = articles.length > 0;
  // One extra slot past the last real article (clampIndex's upper bound is
  // exclusive, so passing articles.length + 1 allows the index to reach
  // exactly articles.length) — that slot is the "all caught up" end card,
  // not a real article.
  const safeIndex = hasArticles ? clampIndex(cardIndex, articles.length + 1) : 0;
  const isAtEnd = hasArticles && safeIndex === articles.length;
  const activeArticle = hasArticles && !isAtEnd ? articles[safeIndex] : undefined;
  // Categories with a story in this edition sort first; empty ones sink to
  // the end instead of sitting ahead of categories that actually have
  // something to show.
  const sortedCategories = sortCategoriesByAvailability(CATEGORIES, edition.articles);

  const handleSelectCategory = (category: CategoryFilter) => {
    setActiveCategory(category);
    setCardIndex(0);
    setSwipeDirection(null);
  };

  const handleSelectDate = (index: number) => {
    setDateIndex(index);
    setActiveCategory("ALL");
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
    // Functional update, not a value computed from the `safeIndex` closure:
    // during the drag/exit overlap, both the outgoing and incoming card
    // instances are mounted, each with an onSwipe closure from its own
    // render. If a swipe lands on the about-to-unmount one, a
    // closure-captured safeIndex would be stale and could silently no-op
    // or miscompute. Reading the true latest cardIndex here avoids that
    // regardless of which instance the event actually fired on.
    setCardIndex((current) => {
      const currentSafe = clampIndex(current, articles.length + 1);
      return clampIndex(direction === "next" ? currentSafe + 1 : currentSafe - 1, articles.length + 1);
    });
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
          dateOptions={editions.map((e) => e.date)}
          activeDateIndex={dateIndex}
          onSelectDate={handleSelectDate}
          onPrev={handlePrevDate}
          onNext={handleNextDate}
          prevDisabled={!canGoToOlderEdition(dateIndex, editions.length)}
          nextDisabled={!canGoToNewerEdition(dateIndex)}
        />
      </motion.div>
      <motion.div variants={sectionVariants}>
        <FilterChips
          categories={sortedCategories}
          activeCategory={activeCategory}
          onSelect={handleSelectCategory}
        />
      </motion.div>
      {hasArticles ? (
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
            {isAtEnd ? (
              <AllCaughtUpCard
                key="all-caught-up"
                direction={swipeDirection}
                onSwipe={handleSwipe}
                onHeightChange={handleHeightChange}
              />
            ) : (
              <StoryCard
                key={activeArticle!.url}
                article={activeArticle!}
                index={safeIndex}
                total={articles.length}
                direction={swipeDirection}
                onSwipe={handleSwipe}
                onHeightChange={handleHeightChange}
              />
            )}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div variants={sectionVariants}>
          <IllustratedState message="Quiet corner of the forest today." />
        </motion.div>
      )}
      {hasArticles && !isAtEnd && (
        <motion.p
          variants={sectionVariants}
          className="pt-5 text-center text-micro tracking-[0.2px] text-text-muted"
        >
          swipe to read more stories
        </motion.p>
      )}
    </motion.main>
  );
}
