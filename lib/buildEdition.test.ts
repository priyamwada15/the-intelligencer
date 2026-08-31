import { describe, it, expect } from "vitest";
import {
  formatRelativeTime,
  formatEditionDateFromKey,
  buildStoredEdition,
  shouldPersistEdition,
  toDisplayEdition,
  truncateSummary,
} from "./buildEdition";
import type { NewsDataArticle } from "./newsdata";

describe("formatRelativeTime", () => {
  const now = new Date("2026-08-26T12:00:00Z");

  it("formats minutes ago", () => {
    expect(formatRelativeTime("2026-08-26 11:45:00", now)).toBe("15 min ago");
  });

  it("formats hours ago", () => {
    expect(formatRelativeTime("2026-08-26 09:00:00", now)).toBe("3 hr ago");
  });

  it("formats days ago", () => {
    expect(formatRelativeTime("2026-08-24 12:00:00", now)).toBe("2 days ago");
  });

  it("formats exactly one day ago without a trailing 's'", () => {
    expect(formatRelativeTime("2026-08-25 12:00:00", now)).toBe("1 day ago");
  });

  it("formats under a minute as 'just now'", () => {
    expect(formatRelativeTime("2026-08-26 11:59:45", now)).toBe("just now");
  });
});

describe("formatEditionDateFromKey", () => {
  it("formats a date key as a weekday/month/day string with no year", () => {
    expect(formatEditionDateFromKey("2026-08-26")).toBe("Wednesday, August 26");
  });

  it("matches the placeholder editions' date format shape", () => {
    expect(formatEditionDateFromKey("2026-01-05")).toMatch(/^[A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}$/);
  });
});

describe("truncateSummary", () => {
  it("leaves text at or under the max length unchanged", () => {
    expect(truncateSummary("Short summary.", 280)).toBe("Short summary.");
  });

  it("truncates text over the max length at a word boundary, with an ellipsis", () => {
    const long = "word ".repeat(100).trim(); // 100 words, well over 280 chars
    const result = truncateSummary(long, 280);
    expect(result.length).toBeLessThanOrEqual(281); // 280 + the ellipsis char
    expect(result.endsWith("…")).toBe(true);
    expect(result.endsWith(" …")).toBe(false); // no trailing space before the ellipsis
  });

  it("never cuts a word in half", () => {
    const text = "a".repeat(275) + " nextword " + "b".repeat(50);
    const result = truncateSummary(text, 280);
    // The cut should land at the space, not mid-"nextword"
    expect(result).toBe(`${"a".repeat(275)}…`);
  });

  it("defaults to the module's own max length when none is given", () => {
    const long = "x".repeat(700);
    const result = truncateSummary(long);
    expect(result.length).toBeGreaterThan(281); // proves the default is longer than the old 280-char cap
    expect(result.length).toBeLessThanOrEqual(481);
  });
});

function makeArticle(overrides: Partial<NewsDataArticle>): NewsDataArticle {
  return {
    article_id: "id",
    title: "OpenAI announces new model",
    link: "https://example.com",
    description: "A description mentioning AI.",
    pubDate: "2026-08-26 11:00:00",
    source_id: "example",
    source_name: "Example News",
    category: ["technology"],
    language: "english",
    ...overrides,
  };
}

describe("buildStoredEdition", () => {
  it("filters out articles that aren't AI-relevant", () => {
    const edition = buildStoredEdition(
      [makeArticle({ title: "Local bakery wins award", description: "The bakery has been open for 30 years." })],
      "2026-08-26",
    );
    expect(edition.articles).toHaveLength(0);
  });

  it("maps a relevant article to a StoredArticle with a categorized category and the raw pubDate", () => {
    const edition = buildStoredEdition([makeArticle({})], "2026-08-26");
    expect(edition.articles).toHaveLength(1);
    const article = edition.articles[0];
    expect(article.headline).toBe("OpenAI announces new model");
    expect(article.source).toBe("Example News");
    expect(article.url).toBe("https://example.com");
    expect(article.pubDate).toBe("2026-08-26 11:00:00");
    expect(article.category).toBe("MODELS");
  });

  it("caps the result at 6 articles", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeArticle({ article_id: String(i), title: `OpenAI story number ${i}` }),
    );
    const edition = buildStoredEdition(many, "2026-08-26");
    expect(edition.articles).toHaveLength(6);
  });

  it("returns an edition with an empty articles array, never throws, on empty input", () => {
    expect(() => buildStoredEdition([], "2026-08-26")).not.toThrow();
    expect(buildStoredEdition([], "2026-08-26").articles).toEqual([]);
  });

  it("carries the given dateKey through unchanged", () => {
    expect(buildStoredEdition([], "2026-08-26").dateKey).toBe("2026-08-26");
  });
});

describe("shouldPersistEdition", () => {
  it("returns false for an edition with no articles", () => {
    expect(shouldPersistEdition({ dateKey: "2026-08-26", articles: [] })).toBe(false);
  });

  it("returns true for an edition with at least one article", () => {
    const edition = buildStoredEdition([makeArticle({})], "2026-08-26");
    expect(shouldPersistEdition(edition)).toBe(true);
  });
});

describe("toDisplayEdition", () => {
  const now = new Date("2026-08-26T12:00:00Z");

  it("formats the date from the dateKey and computes each article's relative timestamp at call time", () => {
    const stored = {
      dateKey: "2026-08-26",
      articles: [
        {
          category: "MODELS" as const,
          headline: "OpenAI announces new model",
          summary: "A description.",
          source: "Example News",
          pubDate: "2026-08-26 11:00:00",
          url: "https://example.com",
        },
      ],
    };
    const display = toDisplayEdition(stored, now);
    expect(display.date).toBe("Wednesday, August 26");
    expect(display.articles).toHaveLength(1);
    expect(display.articles[0].timestamp).toBe("1 hr ago");
    expect(display.articles[0].headline).toBe("OpenAI announces new model");
  });

  it("recomputes a different timestamp when given a different 'now', proving it isn't baked in at build time", () => {
    const stored = {
      dateKey: "2026-08-26",
      articles: [
        {
          category: "MODELS" as const,
          headline: "Headline",
          summary: "Summary.",
          source: "Source",
          pubDate: "2026-08-26 11:00:00",
          url: "https://example.com",
        },
      ],
    };
    const laterNow = new Date("2026-08-26T15:00:00Z");
    expect(toDisplayEdition(stored, laterNow).articles[0].timestamp).toBe("4 hr ago");
  });
});
