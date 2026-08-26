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

  it("does not match 'ai' as a bare substring inside ordinary words", () => {
    expect(isAiRelevant("The mayor said the plan will move forward", "")).toBe(false);
    expect(isAiRelevant("Retail sales dipped slightly this month", "")).toBe(false);
    expect(isAiRelevant("The storm hit the coast again this week", "")).toBe(false);
    expect(isAiRelevant("Startup raises new funding round", "")).toBe(false);
  });

  it("still matches 'ai' at hyphen and apostrophe word boundaries", () => {
    expect(isAiRelevant("This is an AI-powered assistant", "")).toBe(true);
    expect(isAiRelevant("The startup touted AI's potential", "")).toBe(true);
  });
});
