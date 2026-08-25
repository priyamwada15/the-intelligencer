import { describe, it, expect } from "vitest";
import { EDITIONS, filterArticles, clampIndex } from "./editions";

describe("EDITIONS", () => {
  it("has three editions in newest-first order", () => {
    expect(EDITIONS.map((e) => e.date)).toEqual([
      "Thursday, August 20",
      "Wednesday, August 19",
      "Tuesday, August 18",
    ]);
  });

  it("every article belongs to one of the six known categories", () => {
    const validCategories = new Set([
      "MODELS",
      "PRODUCTS",
      "FUNDING",
      "INDUSTRY",
      "POLICY",
      "RESEARCH",
    ]);
    for (const edition of EDITIONS) {
      for (const article of edition.articles) {
        expect(validCategories.has(article.category)).toBe(true);
      }
    }
  });
});

describe("filterArticles", () => {
  const edition = EDITIONS[0];

  it("returns every article when the filter is ALL", () => {
    expect(filterArticles(edition, "ALL")).toEqual(edition.articles);
  });

  it("returns only articles matching the given category", () => {
    const result = filterArticles(edition, "MODELS");
    expect(result.length).toBeGreaterThan(0);
    for (const article of result) {
      expect(article.category).toBe("MODELS");
    }
  });

  it("returns an empty array when no article matches", () => {
    // Tuesday's edition (EDITIONS[2]) has no FUNDING article in the sample data.
    expect(filterArticles(EDITIONS[2], "FUNDING")).toEqual([]);
  });
});

describe("clampIndex", () => {
  it("clamps a negative index to 0", () => {
    expect(clampIndex(-3, 5)).toBe(0);
  });

  it("clamps an index past the end to the last valid index", () => {
    expect(clampIndex(10, 5)).toBe(4);
  });

  it("leaves an in-range index unchanged", () => {
    expect(clampIndex(2, 5)).toBe(2);
  });

  it("returns 0 for a zero-length list", () => {
    expect(clampIndex(0, 0)).toBe(0);
    expect(clampIndex(3, 0)).toBe(0);
  });
});
