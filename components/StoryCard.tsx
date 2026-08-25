import { ExternalLink } from "lucide-react";
import { CATEGORIES, getCategoryStyle } from "@/lib/categories";
import type { Article } from "@/lib/article";

const CARD_RADIUS = "rounded-[26px_26px_34px_24px]";

export function StoryCard({
  article,
  index,
  total,
}: {
  article: Article;
  index: number;
  total: number;
}) {
  const category = CATEGORIES.find((c) => c.id === article.category);
  const { badgeClass } = getCategoryStyle(article.category, true);

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
        className={`relative z-[2] flex min-h-[455px] flex-col gap-6 border-[0.8px] border-border-black bg-surface-card p-6 shadow-[0px_12px_30px_rgba(38,58,47,0.09),0px_2px_4px_rgba(38,58,47,0.05)] ${CARD_RADIUS}`}
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
          <h2 className="text-display font-bold text-text-primary">
            {article.headline}
          </h2>
          <p className="font-figtree text-body font-light text-text-body">
            {article.summary}
          </p>
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
