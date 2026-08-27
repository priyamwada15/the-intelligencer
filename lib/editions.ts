import type { Article } from "@/lib/article";
import type { CategoryFilter, CategoryId } from "@/lib/categories";

export type Edition = {
  date: string;
  articles: Article[];
};

export const EDITIONS: Edition[] = [
  {
    date: "Thursday, August 20",
    articles: [
      {
        category: "MODELS",
        headline: "Open-source models are moving from demos to dependable tools",
        summary:
          "Community-built models are becoming easier to run, tune, and put into everyday products. The shift is less about one breakthrough release and more about a growing ecosystem of smaller, capable systems that can be inspected and adapted.",
        source: "The Verge",
        timestamp: "18 min ago",
        url: "https://www.theverge.com/2025/3/31/24399076/open-source-ai-models",
      },
      {
        category: "RESEARCH",
        headline: "A new benchmark asks whether AI can explain its own uncertainty",
        summary:
          "Researchers are testing models on whether their confidence tracks their actual accuracy. The work may give teams a clearer way to decide when a model should answer, ask for help, or stay quiet.",
        source: "Nature",
        timestamp: "42 min ago",
        url: "https://www.nature.com/",
      },
      {
        category: "PRODUCTS",
        headline: "Small teams are building slower, more legible AI products",
        summary:
          "A group of new tools puts controls, source context, and clear hand-offs next to their generated output. The pattern points toward AI being used as a visible part of a workflow rather than a hidden replacement for it.",
        source: "Wired",
        timestamp: "1 hr ago",
        url: "https://www.wired.com/",
      },
    ],
  },
  {
    date: "Wednesday, August 19",
    articles: [
      {
        category: "FUNDING",
        headline: "AI infrastructure spending is spreading beyond the largest labs",
        summary:
          "New investments are reaching regional providers and specialized compute companies. Analysts say the pattern could broaden access, though energy demand and long-term utilization remain open questions.",
        source: "Financial Times",
        timestamp: "Yesterday",
        url: "https://www.ft.com/",
      },
      {
        category: "POLICY",
        headline: "Regulators are narrowing in on how training data is documented",
        summary:
          "Policy proposals in several markets focus on disclosure and record-keeping rather than a single definition of acceptable training data. Companies are preparing for more detailed reporting requirements.",
        source: "Reuters",
        timestamp: "Yesterday",
        url: "https://www.reuters.com/technology/",
      },
    ],
  },
  {
    date: "Tuesday, August 18",
    articles: [
      {
        category: "INDUSTRY",
        headline: "The AI hiring market is making room for translators and operators",
        summary:
          "Recent roles show companies looking for people who can connect model capabilities to specific domains. The demand suggests implementation and judgment are becoming as important as model access.",
        source: "The Information",
        timestamp: "2 days ago",
        url: "https://www.theinformation.com/",
      },
      {
        category: "MODELS",
        headline: "Smaller language models are finding a place beside the frontier",
        summary:
          "Teams are choosing compact models for tasks where speed, cost, or local control matters more than maximum benchmark scores. The approach is producing more varied model stacks inside a single product.",
        source: "MIT Technology Review",
        timestamp: "2 days ago",
        url: "https://www.technologyreview.com/",
      },
    ],
  },
];

export function filterArticles(edition: Edition, category: CategoryFilter): Article[] {
  return category === "ALL"
    ? edition.articles
    : edition.articles.filter((article) => article.category === category);
}

export function clampIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

export function canGoToOlderEdition(dateIndex: number, editionsLength: number): boolean {
  return dateIndex < editionsLength - 1;
}

export function canGoToNewerEdition(dateIndex: number): boolean {
  return dateIndex > 0;
}

// Categories with at least one article in this edition sort first (in their
// existing relative order); categories with none sort to the end (also in
// their existing relative order) instead of sitting first with an empty
// filter result. Generic over T so the real Category objects (id + label)
// pass straight through untouched.
export function sortCategoriesByAvailability<T extends { id: CategoryId }>(
  categories: T[],
  articles: Article[],
): T[] {
  const availableIds = new Set(articles.map((article) => article.category));
  const withArticles = categories.filter((category) => availableIds.has(category.id));
  const withoutArticles = categories.filter((category) => !availableIds.has(category.id));
  return [...withArticles, ...withoutArticles];
}
