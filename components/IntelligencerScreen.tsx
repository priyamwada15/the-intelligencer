import { Header } from "./Header";
import { EditionDateBar } from "./EditionDateBar";
import { FilterChips } from "./FilterChips";
import { StoryCard } from "./StoryCard";
import type { Article } from "@/data/placeholder-article";
import type { CategoryId } from "@/lib/categories";

export function IntelligencerScreen({
  article,
  date,
  activeCategory,
  index,
  total,
}: {
  article: Article;
  date: string;
  activeCategory: "ALL" | CategoryId;
  index: number;
  total: number;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-[560px] pb-10 pt-12">
      <Header />
      <EditionDateBar date={date} />
      <FilterChips activeCategory={activeCategory} />
      <StoryCard article={article} index={index} total={total} />
      <p className="pt-5 text-center text-[10px] tracking-[0.2px] text-green-300">
        swipe to read more stories
      </p>
    </main>
  );
}
