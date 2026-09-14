import { describe, it, expect } from "vitest";
import { isPoliticalContent } from "./politicalFilter";

describe("isPoliticalContent", () => {
  it("matches a title naming a prominent political figure", () => {
    expect(isPoliticalContent("Trump signs executive order on AI", "")).toBe(true);
  });

  it("matches a description mentioning an election even when the title doesn't", () => {
    expect(isPoliticalContent("Tech roundup", "The candidate's AI-generated ad went viral before the election.")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isPoliticalContent("THE PRESIDENT announced new policy", "")).toBe(true);
  });

  it("matches a political-institution phrase", () => {
    expect(isPoliticalContent("White House unveils AI strategy", "")).toBe(true);
  });

  it("returns false for AI industry regulation news naming no political figure", () => {
    expect(isPoliticalContent("EU AI Act enforcement begins", "Regulators outline compliance deadlines for AI companies.")).toBe(false);
  });

  it("returns false for ordinary AI news", () => {
    expect(isPoliticalContent("OpenAI releases a new model", "The model outperforms prior benchmarks.")).toBe(false);
  });

  it("handles a null description without throwing", () => {
    expect(isPoliticalContent("Biden meets with tech leaders", null)).toBe(true);
    expect(isPoliticalContent("A new AI chip launches", null)).toBe(false);
  });

  it("does not match unrelated words that merely contain a political figure's surname", () => {
    expect(isPoliticalContent("Trumpington startup raises funding", "")).toBe(false);
  });
});
