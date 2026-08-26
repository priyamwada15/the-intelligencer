import { describe, it, expect } from "vitest";
import { categorizeArticle } from "./categorize";

describe("categorizeArticle", () => {
  it("categorizes a funding headline as FUNDING", () => {
    expect(categorizeArticle("Startup raises $50M Series B", "")).toBe("FUNDING");
  });

  it("categorizes a policy headline as POLICY", () => {
    expect(categorizeArticle("Senate advances AI regulation bill", "")).toBe("POLICY");
  });

  it("categorizes a research headline as RESEARCH", () => {
    expect(categorizeArticle("New research paper studies model safety", "")).toBe("RESEARCH");
  });

  it("categorizes a model-release headline as MODELS", () => {
    expect(categorizeArticle("New LLM sets a benchmark record", "")).toBe("MODELS");
  });

  it("categorizes a product-launch headline as PRODUCTS", () => {
    expect(categorizeArticle("Company launches new AI-powered app", "")).toBe("PRODUCTS");
  });

  it("falls back to INDUSTRY when nothing matches", () => {
    expect(categorizeArticle("Company hires new CEO", "")).toBe("INDUSTRY");
  });

  it("checks the description as well as the title", () => {
    expect(categorizeArticle("Big announcement today", "The company raised a new funding round.")).toBe("FUNDING");
  });

  it("prioritizes FUNDING over MODELS when both match", () => {
    expect(categorizeArticle("Model startup raises funding round", "")).toBe("FUNDING");
  });
});
