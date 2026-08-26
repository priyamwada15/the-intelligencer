import { describe, it, expect } from "vitest";
import { isAiRelevant } from "./relevance";

describe("isAiRelevant", () => {
  it("matches a title mentioning a well-known AI company", () => {
    expect(isAiRelevant("OpenAI releases a new tool", "")).toBe(true);
  });

  it("matches a description even when the title doesn't mention AI", () => {
    expect(isAiRelevant("Big tech earnings roundup", "Anthropic's revenue tripled this quarter.")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isAiRelevant("A NEW machine learning MODEL", "")).toBe(true);
  });

  it("returns false when neither title nor description mentions AI", () => {
    expect(isAiRelevant("Local bakery wins award", "The bakery has been open for 30 years.")).toBe(false);
  });

  it("handles a null description without throwing", () => {
    expect(isAiRelevant("A chatbot for customer service", null)).toBe(true);
    expect(isAiRelevant("A new bridge opens downtown", null)).toBe(false);
  });
});
