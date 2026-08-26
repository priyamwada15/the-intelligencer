import type { NewsDataArticle } from "@/lib/newsdata";
import { isAiRelevant } from "@/lib/relevance";
import { categorizeArticle } from "@/lib/categorize";
import type { Article } from "@/lib/article";
import type { Edition } from "@/lib/editions";

const MAX_ARTICLES = 6;

export function formatRelativeTime(pubDate: string, now: Date = new Date()): string {
  const published = new Date(`${pubDate.replace(" ", "T")}Z`);
  const diffMs = now.getTime() - published.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;

  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

function formatEditionDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function buildTodayEdition(rawArticles: NewsDataArticle[], now: Date = new Date()): Edition {
  const articles: Article[] = rawArticles
    .filter((raw) => isAiRelevant(raw.title, raw.description))
    .slice(0, MAX_ARTICLES)
    .map((raw) => ({
      category: categorizeArticle(raw.title, raw.description),
      headline: raw.title,
      summary: raw.description ?? "",
      source: raw.source_name,
      timestamp: formatRelativeTime(raw.pubDate, now),
      url: raw.link,
    }));

  return {
    date: formatEditionDate(now),
    articles,
  };
}
