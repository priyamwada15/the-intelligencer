import type { CategoryId } from "@/lib/categories";

export type Article = {
  category: CategoryId;
  headline: string;
  summary: string;
  source: string;
  timestamp: string;
  url: string;
};
