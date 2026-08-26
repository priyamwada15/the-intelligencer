import type { CategoryId } from "@/lib/categories";

// Checked in this order; the first list with a match wins. Order reflects
// which signals are rarer/more specific (funding, policy, research) versus
// more generic (models, products) — an article mentioning both "model" and
// "funding round" is more usefully filed under FUNDING. This is a heuristic,
// not a guarantee of correctness; see docs/decision-log.md.
//
// Each category's keywords are split into:
// - phrases: multi-word or otherwise unambiguous strings, safe to match as
//   plain substrings (also lets inflected forms like "launches" or "raised"
//   still match "launch"/"raised").
// - words: short/ambiguous single words that would false-positive as
//   substrings of unrelated words (e.g. bare "ban" inside "urban", "law"
//   inside "flawed", "app" inside "happened") — these are matched with a
//   \b word-boundary regex instead.
type CategoryKeywords = {
  phrases: string[];
  words: string[];
};

const CATEGORY_KEYWORDS: Array<[Exclude<CategoryId, "INDUSTRY">, CategoryKeywords]> = [
  [
    "FUNDING",
    {
      phrases: ["funding", "raises", "raised", "valuation", "series a", "series b", "series c", "revenue", "investment", "venture"],
      words: ["ipo"],
    },
  ],
  [
    "POLICY",
    {
      phrases: ["regulation", "regulator", "policy", "lawsuit", "government", "senate", "congress", "legislation"],
      words: ["law", "ban"],
    },
  ],
  [
    "RESEARCH",
    {
      phrases: ["research", "study", "paper", "safety", "arxiv", "scientist"],
      words: [],
    },
  ],
  [
    "MODELS",
    {
      phrases: ["model", "benchmark", "parameter"],
      words: ["llm", "gpt", "claude", "gemini", "llama"],
    },
  ],
  [
    "PRODUCTS",
    {
      phrases: ["launch", "release", "unveil", "feature", "tool", "hardware", "device"],
      words: ["app"],
    },
  ],
];

function matchesKeywords(haystack: string, keywords: CategoryKeywords): boolean {
  if (keywords.phrases.some((keyword) => haystack.includes(keyword))) {
    return true;
  }
  return keywords.words.some((keyword) => new RegExp(`\\b${keyword}\\b`).test(haystack));
}

export function categorizeArticle(title: string, description: string | null): CategoryId {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (matchesKeywords(haystack, keywords)) {
      return category;
    }
  }
  return "INDUSTRY";
}
