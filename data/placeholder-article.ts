import type { CategoryId } from "@/lib/categories";

export type Article = {
  category: CategoryId;
  headline: string;
  summary: string;
  source: string;
  timestamp: string;
  url: string;
};

export const placeholderArticle: Article = {
  category: "MODELS",
  headline: "Open-source models are moving from demos to dependable tools",
  summary:
    "Community-built models are becoming easier to run, tune, and put into everyday products. The shift is less about one breakthrough release and more about a growing ecosystem of smaller, capable systems that can be inspected and adapted.",
  source: "The Verge",
  timestamp: "18 min ago",
  url: "https://www.theverge.com/2025/3/31/24399076/open-source-ai-models",
};
