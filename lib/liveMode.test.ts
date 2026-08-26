import { describe, it, expect } from "vitest";
import { shouldUseLiveData } from "./liveMode";

describe("shouldUseLiveData", () => {
  it("returns false when there is no API key, regardless of the flag", () => {
    expect(shouldUseLiveData(undefined, "true")).toBe(false);
    expect(shouldUseLiveData("", "true")).toBe(false);
  });

  it("returns false when a key is present but the flag is not 'true'", () => {
    expect(shouldUseLiveData("a-real-key", undefined)).toBe(false);
    expect(shouldUseLiveData("a-real-key", "false")).toBe(false);
    expect(shouldUseLiveData("a-real-key", "TRUE")).toBe(false);
    expect(shouldUseLiveData("a-real-key", "1")).toBe(false);
  });

  it("returns true only when both a key is present and the flag is exactly 'true'", () => {
    expect(shouldUseLiveData("a-real-key", "true")).toBe(true);
  });
});
