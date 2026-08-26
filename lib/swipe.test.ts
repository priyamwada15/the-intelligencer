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

  it("commits on a fast flick even when the distance is under the threshold", () => {
    expect(resolveSwipeDirection(20, 80, -600)).toBe("next");
    expect(resolveSwipeDirection(-20, 80, 600)).toBe("prev");
  });

  it("ignores velocity under its threshold when distance is also under the threshold", () => {
    expect(resolveSwipeDirection(20, 80, -100)).toBeNull();
  });

  it("distance past threshold wins even if velocity direction disagrees", () => {
    expect(resolveSwipeDirection(-120, 80, 50)).toBe("next");
  });

  it("respects a custom velocity threshold", () => {
    expect(resolveSwipeDirection(20, 80, -300, 1000)).toBeNull();
    expect(resolveSwipeDirection(20, 80, -300, 200)).toBe("next");
  });
});
