import { describe, it, expect } from "vitest";
import { resolveSwipeDirection } from "./swipe";

describe("resolveSwipeDirection", () => {
  it("returns null when the drag is under the threshold in either direction", () => {
    expect(resolveSwipeDirection(40)).toBeNull();
    expect(resolveSwipeDirection(-40)).toBeNull();
    expect(resolveSwipeDirection(0)).toBeNull();
  });

  it("returns 'next' for a leftward drag past the default threshold", () => {
    expect(resolveSwipeDirection(-120)).toBe("next");
  });

  it("returns 'prev' for a rightward drag past the default threshold", () => {
    expect(resolveSwipeDirection(120)).toBe("prev");
  });

  it("respects a custom threshold", () => {
    expect(resolveSwipeDirection(50, 100)).toBeNull();
    expect(resolveSwipeDirection(150, 100)).toBe("prev");
    expect(resolveSwipeDirection(-150, 100)).toBe("next");
  });

  it("treats the threshold as exclusive (exactly-at-threshold does not commit)", () => {
    expect(resolveSwipeDirection(80)).toBeNull();
    expect(resolveSwipeDirection(-80)).toBeNull();
  });
});
