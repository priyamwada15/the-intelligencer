import { describe, it, expect } from "vitest";
import { formatRelativeTime, buildTodayEdition } from "./buildEdition";
import type { NewsDataArticle } from "./newsdata";
import { EDITIONS } from "./editions";

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

describe("buildTodayEdition", () => {
  const now = new Date("2026-08-26T12:00:00Z");

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

  it("filters out articles that aren't AI-relevant", () => {
    const edition = buildTodayEdition(
      [makeArticle({ title: "Local bakery wins award", description: "The bakery has been open for 30 years." })],
      now,
    );
    expect(edition.articles).toHaveLength(0);
  });

  it("maps a relevant article to the Article shape with a categorized category and relative timestamp", () => {
    const edition = buildTodayEdition([makeArticle({})], now);
    expect(edition.articles).toHaveLength(1);
    const article = edition.articles[0];
    expect(article.headline).toBe("OpenAI announces new model");
    expect(article.source).toBe("Example News");
    expect(article.url).toBe("https://example.com");
    expect(article.timestamp).toBe("1 hr ago");
    expect(article.category).toBe("MODELS");
  });

  it("caps the result at 6 articles", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeArticle({ article_id: String(i), title: `OpenAI story number ${i}` }),
    );
    const edition = buildTodayEdition(many, now);
    expect(edition.articles).toHaveLength(6);
  });

  it("returns an edition with an empty articles array, never throws, on empty input", () => {
    expect(() => buildTodayEdition([], now)).not.toThrow();
    expect(buildTodayEdition([], now).articles).toEqual([]);
  });

  it("formats the edition date from the given time without a year", () => {
    const edition = buildTodayEdition([], now);
    expect(edition.date).toBe("Wednesday, August 26");
  });

  it("matches the same date format shape as the placeholder editions in lib/editions.ts", () => {
    const edition = buildTodayEdition([], now);
    const dateFormatShape = /^[A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}$/;
    expect(edition.date).toMatch(dateFormatShape);
    expect(EDITIONS[0].date).toMatch(dateFormatShape);
  });
});
