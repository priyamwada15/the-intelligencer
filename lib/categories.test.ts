import { describe, it, expect } from "vitest";
import { getCategoryStyle, CATEGORIES } from "./categories";

describe("getCategoryStyle", () => {
  it("gives the active chip an accent background and primary text", () => {
    const style = getCategoryStyle("MODELS", true);
    expect(style.chipClass).toContain("bg-accent");
    expect(style.chipClass).toContain("text-text-primary");
  });

  it("gives an inactive chip no background fill and secondary text", () => {
    const style = getCategoryStyle("MODELS", false);
    expect(style.chipClass).not.toContain("bg-accent");
    expect(style.chipClass).toContain("text-text-secondary");
  });

  it("always fills the in-card badge with accent, regardless of active state", () => {
    const active = getCategoryStyle("MODELS", true);
    const inactive = getCategoryStyle("MODELS", false);
    expect(active.badgeClass).toContain("bg-accent");
    expect(inactive.badgeClass).toContain("bg-accent");
  });
});

describe("CATEGORIES", () => {
  it("lists all six categories in Figma tag order", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([
      "MODELS",
      "PRODUCTS",
      "FUNDING",
      "INDUSTRY",
      "POLICY",
      "RESEARCH",
    ]);
  });
});
