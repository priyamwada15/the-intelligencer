import { describe, it, expect } from "vitest";
import { parseNewsDataResponse } from "./newsdata";

const validArticle = {
  article_id: "abc123",
  title: "A sample AI headline",
  link: "https://example.com/article",
  description: "A short description.",
  pubDate: "2026-08-26 05:48:53",
  source_id: "example",
  source_name: "Example News",
  category: ["technology"],
  language: "english",
};

describe("parseNewsDataResponse", () => {
  it("returns the results array on a valid success response", () => {
    const result = parseNewsDataResponse({
      status: "success",
      totalResults: 1,
      results: [validArticle],
    });
    expect(result).toEqual([validArticle]);
  });

  it("returns an empty array when results is empty", () => {
    const result = parseNewsDataResponse({ status: "success", totalResults: 0, results: [] });
    expect(result).toEqual([]);
  });

  it("throws when status is 'error'", () => {
    expect(() =>
      parseNewsDataResponse({ status: "error", results: [] }),
    ).toThrow();
  });

  it("throws when results is missing", () => {
    expect(() => parseNewsDataResponse({ status: "success" })).toThrow();
  });

  it("throws when results is not an array", () => {
    expect(() =>
      parseNewsDataResponse({ status: "success", results: "not-an-array" }),
    ).toThrow();
  });

  it("throws when given a non-object", () => {
    expect(() => parseNewsDataResponse(null)).toThrow();
    expect(() => parseNewsDataResponse("a string")).toThrow();
    expect(() => parseNewsDataResponse(42)).toThrow();
  });
});
