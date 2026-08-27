import { describe, it, expect } from "vitest";
import {
  EDITIONS,
  filterArticles,
  clampIndex,
  canGoToOlderEdition,
  canGoToNewerEdition,
  sortCategoriesByAvailability,
} from "./editions";
import type { Article } from "./article";

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

describe("canGoToOlderEdition", () => {
  it("returns true when there are older editions left", () => {
    expect(canGoToOlderEdition(0, 3)).toBe(true);
    expect(canGoToOlderEdition(1, 3)).toBe(true);
  });

  it("returns false at the oldest edition", () => {
    expect(canGoToOlderEdition(2, 3)).toBe(false);
  });
});

describe("canGoToNewerEdition", () => {
  it("returns true when not on the newest edition", () => {
    expect(canGoToNewerEdition(1)).toBe(true);
    expect(canGoToNewerEdition(2)).toBe(true);
  });

  it("returns false at the newest edition (index 0)", () => {
    expect(canGoToNewerEdition(0)).toBe(false);
  });
});

describe("sortCategoriesByAvailability", () => {
  function makeArticle(category: Article["category"]): Article {
    return {
      category,
      headline: "headline",
      summary: "summary",
      source: "source",
      timestamp: "just now",
      url: `https://example.com/${category}`,
    };
  }

  const categories = [
    { id: "MODELS" as const, label: "Models" },
    { id: "PRODUCTS" as const, label: "Products" },
    { id: "FUNDING" as const, label: "Funding" },
    { id: "INDUSTRY" as const, label: "Industry" },
  ];

  it("puts categories with at least one article first, in their original relative order", () => {
    const articles = [makeArticle("FUNDING"), makeArticle("MODELS")];
    const result = sortCategoriesByAvailability(categories, articles);
    expect(result.map((c) => c.id)).toEqual(["MODELS", "FUNDING", "PRODUCTS", "INDUSTRY"]);
  });

  it("keeps categories with no articles at the end, in their original relative order", () => {
    const articles = [makeArticle("INDUSTRY")];
    const result = sortCategoriesByAvailability(categories, articles);
    expect(result.map((c) => c.id)).toEqual(["INDUSTRY", "MODELS", "PRODUCTS", "FUNDING"]);
  });

  it("leaves order unchanged when every category has articles", () => {
    const articles = categories.map((c) => makeArticle(c.id));
    expect(sortCategoriesByAvailability(categories, articles).map((c) => c.id)).toEqual(
      categories.map((c) => c.id),
    );
  });

  it("leaves order unchanged when no category has articles", () => {
    expect(sortCategoriesByAvailability(categories, []).map((c) => c.id)).toEqual(
      categories.map((c) => c.id),
    );
  });

  it("does not mutate the input array", () => {
    const original = [...categories];
    sortCategoriesByAvailability(categories, [makeArticle("INDUSTRY")]);
    expect(categories).toEqual(original);
  });
});
