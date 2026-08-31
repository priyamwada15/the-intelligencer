import { describe, it, expect, vi, afterEach } from "vitest";
import { summarizeEdition, applyAiSummaries } from "./summarize";
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

function jsonArrayResponse(summaries: string[]) {
  return {
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(summaries) }] } }],
    }),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("summarizeEdition", () => {
  const articles = [
    { title: "OpenAI announces new model", description: "A description mentioning AI." },
    { title: "Logistics company lays off 200 workers", description: "A layoffs story." },
    { title: "Startup raises Series A", description: "A funding story." },
  ];

  it("returns the parsed array of trimmed summaries, in order", async () => {
    mockFetchOnce(jsonArrayResponse(["  First summary.  ", "Second summary.", "Third summary."]));

    const result = await summarizeEdition(articles, "fake-key");
    expect(result).toEqual(["First summary.", "Second summary.", "Third summary."]);
  });

  it("sends exactly one fetch request no matter how many articles are given", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(["A.", "B.", "C."]) }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await summarizeEdition(articles, "fake-key");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the response is not ok", async () => {
    mockFetchOnce({ ok: false, status: 429, text: async () => "rate limited" });

    await expect(summarizeEdition(articles, "fake-key")).rejects.toThrow(/Gemini request failed/);
  });

  it("throws when the response has no candidate text", async () => {
    mockFetchOnce({ json: async () => ({ candidates: [] }) });

    await expect(summarizeEdition(articles, "fake-key")).rejects.toThrow(/no summary text/);
  });

  it("throws when the response text is not valid JSON", async () => {
    mockFetchOnce({
      json: async () => ({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }),
    });

    await expect(summarizeEdition(articles, "fake-key")).rejects.toThrow(/not valid JSON/);
  });

  it("throws when the parsed array length doesn't match the number of articles", async () => {
    mockFetchOnce(jsonArrayResponse(["Only one summary."]));

    await expect(summarizeEdition(articles, "fake-key")).rejects.toThrow(/exactly 3/);
  });
});

describe("applyAiSummaries", () => {
  const edition: StoredEdition = {
    dateKey: "2026-08-26",
    articles: [
      {
        category: "MODELS",
        headline: "OpenAI announces new model",
        summary: "The old truncated fallback summary A.",
        source: "Example News",
        pubDate: "2026-08-26 11:00:00",
        url: "https://example.com/a",
      },
      {
        category: "INDUSTRY",
        headline: "Logistics company lays off 200 workers",
        summary: "The old truncated fallback summary B.",
        source: "Example News",
        pubDate: "2026-08-26 11:00:00",
        url: "https://example.com/b",
      },
    ],
  };

  it("replaces every article's summary with its corresponding AI summary, in order, on success", async () => {
    mockFetchOnce(jsonArrayResponse(["AI summary for A.", "AI summary for B."]));

    const result = await applyAiSummaries(edition, "fake-key");
    expect(result.articles[0].summary).toBe("AI summary for A.");
    expect(result.articles[1].summary).toBe("AI summary for B.");
  });

  it("keeps every article's original fallback summary when the batch call fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const result = await applyAiSummaries(edition, "fake-key");
    expect(result.articles[0].summary).toBe("The old truncated fallback summary A.");
    expect(result.articles[1].summary).toBe("The old truncated fallback summary B.");
  });

  it("sends only one fetch request for an edition with multiple articles", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(["A.", "B."]) }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await applyAiSummaries(edition, "fake-key");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not mutate the input edition", async () => {
    mockFetchOnce(jsonArrayResponse(["AI summary A.", "AI summary B."]));

    await applyAiSummaries(edition, "fake-key");
    expect(edition.articles[0].summary).toBe("The old truncated fallback summary A.");
  });
});
