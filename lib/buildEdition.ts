import type { NewsDataArticle } from "@/lib/newsdata";
import { isAiRelevant } from "@/lib/relevance";
import { categorizeArticle } from "@/lib/categorize";
import type { CategoryId } from "@/lib/categories";
import type { Edition } from "@/lib/editions";

const MAX_ARTICLES = 6;
// NewsData.io's `description` field is sometimes a short teaser and
// sometimes the entire article body (observed directly: a press release
// came through in full, thousands of characters). Cap it to roughly a
// 4-sentence excerpt regardless of what the source sends. Matches the
// AI summary's own target length (see summarize.ts's STYLE_GUIDE) so a
// raw-description fallback card reads the same length as an AI one.
const MAX_SUMMARY_LENGTH = 480;

export function truncateSummary(text: string, maxLength: number = MAX_SUMMARY_LENGTH): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  return `${cut.trimEnd()}…`;
}

export type StoredArticle = {
  category: CategoryId;
  headline: string;
  summary: string;
  source: string;
  pubDate: string;
  url: string;
};

export type StoredEdition = {
  dateKey: string;
  articles: StoredArticle[];
};

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

export function formatEditionDateFromKey(dateKey: string): string {
  const noonUtc = new Date(`${dateKey}T12:00:00Z`);
  return noonUtc.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function buildStoredEdition(rawArticles: NewsDataArticle[], dateKey: string): StoredEdition {
  const articles: StoredArticle[] = rawArticles
    .filter((raw) => isAiRelevant(raw.title, raw.description))
    .slice(0, MAX_ARTICLES)
    .map((raw) => ({
      category: categorizeArticle(raw.title, raw.description),
      headline: raw.title,
      summary: raw.description ? truncateSummary(raw.description) : "",
      source: raw.source_name,
      pubDate: raw.pubDate,
      url: raw.link,
    }));

  return { dateKey, articles };
}

export function shouldPersistEdition(edition: StoredEdition): boolean {
  return edition.articles.length > 0;
}

export function toDisplayEdition(stored: StoredEdition, now: Date = new Date()): Edition {
  return {
    date: formatEditionDateFromKey(stored.dateKey),
    articles: stored.articles.map((article) => ({
      category: article.category,
      headline: article.headline,
      summary: article.summary,
      source: article.source,
      timestamp: formatRelativeTime(article.pubDate, now),
      url: article.url,
    })),
  };
}
