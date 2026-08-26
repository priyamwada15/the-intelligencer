"use client";

import { useState } from "react";
import { Header } from "./Header";
import { EditionDateBar } from "./EditionDateBar";
import { FilterChips } from "./FilterChips";
import { StoryCard } from "./StoryCard";
import { EDITIONS, filterArticles, clampIndex, canGoToOlderEdition, canGoToNewerEdition } from "@/lib/editions";
import type { CategoryFilter } from "@/lib/categories";
import type { SwipeDirection } from "@/lib/swipe";

export function IntelligencerScreen() {
  const [dateIndex, setDateIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [cardIndex, setCardIndex] = useState(0);

  const edition = EDITIONS[dateIndex];
  const articles = filterArticles(edition, activeCategory);
  const safeIndex = clampIndex(cardIndex, articles.length);
  const activeArticle = articles[safeIndex];

  const handleSelectCategory = (category: CategoryFilter) => {
    setActiveCategory(category);
    setCardIndex(0);
  };

  const handlePrevDate = () => {
    setDateIndex((current) => clampIndex(current + 1, EDITIONS.length));
    setActiveCategory("ALL");
    setCardIndex(0);
  };

  const handleNextDate = () => {
    setDateIndex((current) => clampIndex(current - 1, EDITIONS.length));
    setActiveCategory("ALL");
    setCardIndex(0);
  };

  const handleSwipe = (direction: SwipeDirection) => {
    setCardIndex(clampIndex(direction === "next" ? safeIndex + 1 : safeIndex - 1, articles.length));
  };

  return (
    <main className="mx-auto min-h-screen max-w-[560px] overflow-x-hidden pb-10 pt-12">
      <Header />
      <EditionDateBar
        date={edition.date}
        onPrev={handlePrevDate}
        onNext={handleNextDate}
        prevDisabled={!canGoToOlderEdition(dateIndex, EDITIONS.length)}
        nextDisabled={!canGoToNewerEdition(dateIndex)}
      />
      <FilterChips activeCategory={activeCategory} onSelect={handleSelectCategory} />
      {activeArticle ? (
        <StoryCard
          article={activeArticle}
          index={safeIndex}
          total={articles.length}
          onSwipe={handleSwipe}
        />
      ) : (
        <p className="px-6 py-16 text-center text-body text-text-secondary">
          No stories in this category for this edition.
        </p>
      )}
      <p className="pt-5 text-center text-micro tracking-[0.2px] text-text-muted">
        swipe to read more stories
      </p>
    </main>
  );
}
