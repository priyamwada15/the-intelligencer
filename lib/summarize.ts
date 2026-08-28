import { truncateSummary } from "./buildEdition";
import type { StoredArticle, StoredEdition } from "./buildEdition";

// Free-tier Gemini model. If Google renames/retires this, swap the string —
// nothing else here depends on the exact model id.
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Voice guide for the AI-rewritten summary, decided with the user directly:
// light-touch solarpunk word choice (not forced metaphor), strictly
// restates only what's in the source (no added claims/context), and steps
// back to a plain neutral tone for grim news rather than applying playful
// language uniformly by category (a layoffs story can land in the same
// "INDUSTRY" bucket as a cheerful adoption story — the tone call has to be
// content-based, not category-based).
const STYLE_GUIDE = `You are writing a short summary for an AI news briefing app called The Intelligencer, styled around a solarpunk theme (nature reclaiming technology, hopeful and grounded).

Rules:
- Write exactly 2 sentences, plain English, under 220 characters total.
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

export async function summarizeArticle(
  article: { title: string; description: string | null },
  apiKey: string,
): Promise<string> {
  const prompt = `${STYLE_GUIDE}\n\nTitle: ${article.title}\nDescription: ${article.description ?? "(none provided)"}`;

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 120 },
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
  return text.trim();
}

// Best-effort enhancement layer applied after buildStoredEdition: each
// article already has a safe truncated summary (see buildEdition.ts), so a
// failed or slow Gemini call for one article just leaves that one on the
// existing fallback rather than failing the whole edition.
export async function applyAiSummaries(edition: StoredEdition, apiKey: string): Promise<StoredEdition> {
  const articles = await Promise.all(
    edition.articles.map(async (article): Promise<StoredArticle> => {
      try {
        const aiSummary = await summarizeArticle(
          { title: article.headline, description: article.summary || null },
          apiKey,
        );
        return { ...article, summary: truncateSummary(aiSummary) };
      } catch (error) {
        console.error(`AI summary failed for "${article.headline}", keeping fallback summary:`, error);
        return article;
      }
    }),
  );

  return { ...edition, articles };
}
