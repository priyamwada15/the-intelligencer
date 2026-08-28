import { describe, it, expect, vi, afterEach } from "vitest";
import { summarizeArticle, applyAiSummaries } from "./summarize";
import type { StoredEdition } from "./buildEdition";

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
      ...response,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("summarizeArticle", () => {
  it("returns the trimmed summary text from a successful response", async () => {
    mockFetchOnce({
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "  A tidy two-sentence summary.  " }] } }],
      }),
    });

    const result = await summarizeArticle({ title: "Title", description: "Description" }, "fake-key");
    expect(result).toBe("A tidy two-sentence summary.");
  });

  it("throws when the response is not ok", async () => {
    mockFetchOnce({ ok: false, status: 429, text: async () => "rate limited" });

    await expect(summarizeArticle({ title: "Title", description: "Description" }, "fake-key")).rejects.toThrow(
      /Gemini request failed/,
    );
  });

  it("throws when the response has no candidate text", async () => {
    mockFetchOnce({ json: async () => ({ candidates: [] }) });

    await expect(summarizeArticle({ title: "Title", description: "Description" }, "fake-key")).rejects.toThrow(
      /no summary text/,
    );
  });
});

describe("applyAiSummaries", () => {
  const edition: StoredEdition = {
    dateKey: "2026-08-26",
    articles: [
      {
        category: "MODELS",
        headline: "OpenAI announces new model",
        summary: "The old truncated fallback summary.",
        source: "Example News",
        pubDate: "2026-08-26 11:00:00",
        url: "https://example.com/a",
      },
      {
        category: "INDUSTRY",
        headline: "Logistics company lays off 200 workers",
        summary: "The old truncated fallback summary.",
        source: "Example News",
        pubDate: "2026-08-26 11:00:00",
        url: "https://example.com/b",
      },
    ],
  };

  it("replaces an article's summary with the AI-generated one on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: "AI-written summary." }] } }] }),
      }),
    );

    const result = await applyAiSummaries(edition, "fake-key");
    expect(result.articles[0].summary).toBe("AI-written summary.");
    expect(result.articles[1].summary).toBe("AI-written summary.");
  });

  it("keeps the original summary for an article whose AI call fails, without affecting the others", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        callCount += 1;
        if (callCount === 1) {
          throw new Error("network error");
        }
        return {
          ok: true,
          json: async () => ({ candidates: [{ content: { parts: [{ text: "Second article's AI summary." }] } }] }),
        };
      }),
    );

    const result = await applyAiSummaries(edition, "fake-key");
    const failed = result.articles.find((a) => a.url === "https://example.com/a");
    const succeeded = result.articles.find((a) => a.url === "https://example.com/b");
    expect(failed?.summary).toBe("The old truncated fallback summary.");
    expect(succeeded?.summary).toBe("Second article's AI summary.");
  });

  it("does not mutate the input edition", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: "AI summary." }] } }] }),
      }),
    );

    await applyAiSummaries(edition, "fake-key");
    expect(edition.articles[0].summary).toBe("The old truncated fallback summary.");
  });
});
