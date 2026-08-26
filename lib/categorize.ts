import type { CategoryId } from "@/lib/categories";

// Checked in this order; the first list with a match wins. Order reflects
// which signals are rarer/more specific (funding, policy, research) versus
// more generic (models, products) — an article mentioning both "model" and
// "funding round" is more usefully filed under FUNDING. This is a heuristic,
// not a guarantee of correctness; see docs/decision-log.md.
const CATEGORY_KEYWORDS: Array<[Exclude<CategoryId, "INDUSTRY">, string[]]> = [
  ["FUNDING", ["funding", "raises", "raised", "valuation", "ipo", "series a", "series b", "series c", "revenue", "investment", "venture"]],
  ["POLICY", ["regulation", "regulator", "law", "policy", "lawsuit", "ban", "government", "senate", "congress", "legislation"]],
  ["RESEARCH", ["research", "study", "paper", "safety", "arxiv", "scientist"]],
  ["MODELS", ["model", "llm", "gpt", "gemini", "claude", "llama", "benchmark", "parameter"]],
  ["PRODUCTS", ["launch", "release", "unveil", "feature", "app", "tool", "hardware", "device"]],
];

export function categorizeArticle(title: string, description: string | null): CategoryId {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return category;
    }
  }
  return "INDUSTRY";
}
