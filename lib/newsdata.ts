export type NewsDataArticle = {
  article_id: string;
  title: string;
  link: string;
  description: string | null;
  pubDate: string;
  source_id: string;
  source_name: string;
  category: string[];
  language: string;
};

export type NewsDataResponse = {
  status: "success" | "error";
  totalResults: number;
  results: NewsDataArticle[];
};

export function parseNewsDataResponse(json: unknown): NewsDataArticle[] {
  if (typeof json !== "object" || json === null) {
    throw new Error("NewsData.io response was not a JSON object.");
  }
  const body = json as Partial<NewsDataResponse>;
  if (body.status !== "success") {
    throw new Error(`NewsData.io returned a non-success status: ${String(body.status)}`);
  }
  if (!Array.isArray(body.results)) {
    throw new Error("NewsData.io response is missing a 'results' array.");
  }
  return body.results as NewsDataArticle[];
}

// NewsData.io free tier caps the `q` query parameter at 100 characters —
// keep this short. It biases the request toward AI content server-side;
// lib/relevance.ts does a second, local pass to filter out anything that
// slips through (e.g. general "technology" category articles that mention
// none of these terms only in passing, or vice versa).
const AI_QUERY = '"AI" OR "artificial intelligence" OR OpenAI OR Anthropic';

export async function fetchTechNews(apiKey: string): Promise<NewsDataArticle[]> {
  const url = new URL("https://newsdata.io/api/1/latest");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("category", "technology");
  url.searchParams.set("language", "en");
  url.searchParams.set("q", AI_QUERY);

  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`NewsData.io request failed with HTTP ${response.status}`);
  }

  const json = await response.json();
  return parseNewsDataResponse(json);
}
