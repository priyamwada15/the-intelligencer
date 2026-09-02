import { truncateSummary } from "./buildEdition";
import type { StoredArticle, StoredEdition } from "./buildEdition";

// Free-tier Gemini model. If Google renames/retires this, swap the string —
// nothing else here depends on the exact model id. gemini-2.5-flash-lite was
// retired for this account ("no longer available to new users", confirmed
// via a live 404 from Gemini's own API on 2026-09-02); gemini-3.5-flash-lite
// is Google's own named replacement and was verified working directly
// against the production API key before switching.
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Voice guide for the AI-rewritten summary, decided with the user directly:
// light-touch solarpunk word choice (not forced metaphor), strictly
// restates only what's in the source (no added claims/context), and steps
// back to a plain neutral tone for grim news rather than applying playful
// language uniformly by category (a layoffs story can land in the same
// "INDUSTRY" bucket as a cheerful adoption story — the tone call has to be
// content-based, not category-based).
const STYLE_GUIDE = `You are writing short summaries for an AI news briefing app called The Intelligencer, styled around a solarpunk theme (nature reclaiming technology, hopeful and grounded).

Rules:
- Write exactly 4 sentences per summary, plain English, under 480 characters total.
- Use ONLY facts present in the title and description below. Never add outside claims, context, speculation, or opinion not present in the source.
- Voice: light, warm, occasionally playful word choice (e.g. "rolled out", "unveiled", "took root") — but do not force a metaphor into every sentence, and do not use exclamation points.
- Exception: if the story involves layoffs, deaths, injuries, lawsuits, harm, security incidents, or other serious/grim outcomes, drop all playful language and write in a plain, neutral, respectful tone instead.
- Third person. No first-person commentary. No emoji.
- Output ONLY the summary text, nothing else — no quotes, no preamble.

Additional voice rules:
- No em dashes. Use a comma, a colon, or a new sentence instead.
- No Oxford comma.
- No hedging qualifiers ("somewhat," "fairly," "arguably," "to some extent").
- No throat-clearing openers ("So," "Well," "In today's AI-driven world," etc.).
- No performed enthusiasm or puffery adjectives ("vibrant," "cutting-edge," "game-changing").
- No corrective negation or contrasting pairs ("not X, it's Y," "cheap but effective").
- Never use these words: leverage, foster, delve/delve into, realm, testament to, landscape,
  vibrant, multifaceted, comprehensive, pivotal, enduring, seamlessly, robust, underscore,
  genuinely, really, truly, actually.
- Prefer verbs over their noun forms ("decide" not "make a decision," "launch" not "conduct a launch").`;

export type SummarizableArticle = { title: string; description: string | null };

function buildBatchPrompt(articles: SummarizableArticle[]): string {
  const articlesBlock = articles
    .map(
      (article, index) =>
        `${index + 1}. Title: ${article.title}\n   Description: ${article.description ?? "(none provided)"}`,
    )
    .join("\n\n");

  return `${STYLE_GUIDE}

You will summarize ${articles.length} articles below. Write one summary per article, using ONLY facts from that specific article's own title/description — never mix facts between articles.

Return ONLY a JSON array of exactly ${articles.length} strings, one summary per article, in the same order as listed below. No markdown code fences, no numbering, no other text.

Articles:
${articlesBlock}`;
}

function parseBatchSummaries(text: string, expectedCount: number): string[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini batch response was not valid JSON");
  }

  if (!Array.isArray(parsed) || parsed.length !== expectedCount || !parsed.every((s) => typeof s === "string")) {
    throw new Error(`Gemini batch response did not contain exactly ${expectedCount} summary strings`);
  }

  return parsed.map((summary) => summary.trim());
}

// One Gemini call for the whole edition instead of one per article: keeps
// rate-limit exposure to a single request and means every card in a day's
// edition went through the same pass — either all get the AI rewrite or
// (on any failure) all keep their existing fallback, never a silent mix.
export async function summarizeEdition(articles: SummarizableArticle[], apiKey: string): Promise<string[]> {
  const prompt = buildBatchPrompt(articles);

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 220 * articles.length },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Gemini returned no summary text");
  }

  return parseBatchSummaries(text, articles.length);
}

// Best-effort enhancement layer applied after buildStoredEdition: every
// article already has a safe truncated summary (see buildEdition.ts), so a
// failed or malformed batch call leaves the whole edition on its existing
// fallback rather than throwing.
export async function applyAiSummaries(edition: StoredEdition, apiKey: string): Promise<StoredEdition> {
  try {
    const summaries = await summarizeEdition(
      edition.articles.map((article) => ({ title: article.headline, description: article.summary || null })),
      apiKey,
    );

    const articles: StoredArticle[] = edition.articles.map((article, index) => ({
      ...article,
      summary: truncateSummary(summaries[index]),
    }));

    return { ...edition, articles };
  } catch (error) {
    console.error("AI batch summary failed, keeping fallback summaries for the whole edition:", error);
    return edition;
  }
}
