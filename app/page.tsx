import { Header } from "@/components/Header";
import { EditionDateBar } from "@/components/EditionDateBar";
import { FilterChips } from "@/components/FilterChips";
import { StoryCard } from "@/components/StoryCard";
import { placeholderArticle } from "@/data/placeholder-article";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-[560px] pb-10 pt-12">
      <Header />
      <EditionDateBar date="Thursday, August 20" />
      <FilterChips activeCategory="MODELS" />
      <StoryCard article={placeholderArticle} index={0} total={3} />
      <p className="pt-5 text-center text-[10px] tracking-[0.2px] text-green-300">
        swipe to read more stories
      </p>
    </main>
  );
}
