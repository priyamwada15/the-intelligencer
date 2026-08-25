import { Header } from "./Header";
import { EditionDateBar } from "./EditionDateBar";
import { FilterChips } from "./FilterChips";
import { StoryCard } from "./StoryCard";
import type { Article } from "@/lib/article";
import type { CategoryFilter } from "@/lib/categories";

export function IntelligencerScreen({
  article,
  date,
  activeCategory,
  index,
  total,
}: {
  article: Article;
  date: string;
  activeCategory: CategoryFilter;
  index: number;
  total: number;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-[560px] overflow-x-hidden pb-10 pt-12">
      <Header />
      <EditionDateBar date={date} />
      <FilterChips activeCategory={activeCategory} />
      <StoryCard article={article} index={index} total={total} />
      <p className="pt-5 text-center text-micro tracking-[0.2px] text-text-muted">
        swipe to read more stories
      </p>
    </main>
  );
}
