import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { putMock, listMock, delMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
  listMock: vi.fn(),
  delMock: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: putMock,
  list: listMock,
  del: delMock,
}));

import {
  getEasternDateKey,
  getEasternHour,
  isScheduledRefreshHour,
  isForceRunAllowed,
  writeEdition,
  listRecentEditionDateKeys,
  readEdition,
  pruneOldEditions,
} from "./blobStorage";

describe("getEasternDateKey", () => {
  it("returns the America/New_York calendar date, not the UTC date, late at night", () => {
    // 9pm EDT on Aug 26 is 1am UTC on Aug 27.
    const lateNightUtc = new Date("2026-08-27T01:00:00Z");
    expect(getEasternDateKey(lateNightUtc)).toBe("2026-08-26");
  });

  it("matches the UTC date when well within the day for both zones", () => {
    const midday = new Date("2026-08-26T16:00:00Z");
    expect(getEasternDateKey(midday)).toBe("2026-08-26");
  });
});

describe("getEasternHour", () => {
  it("converts a UTC time to the correct Eastern hour during EDT (UTC-4)", () => {
    // 19:00 UTC in August (EDT) is 15:00 (3pm) Eastern.
    expect(getEasternHour(new Date("2026-08-26T19:00:00Z"))).toBe(15);
  });

  it("converts a UTC time to the correct Eastern hour during EST (UTC-5)", () => {
    // 20:00 UTC in January (EST) is 15:00 (3pm) Eastern.
    expect(getEasternHour(new Date("2026-01-26T20:00:00Z"))).toBe(15);
  });

  it("normalizes ICU's '24' midnight quirk to 0", () => {
    // 04:00 UTC on Aug 27 in EDT (UTC-4) is 00:00 (midnight) Eastern on Aug
    // 27. Intl's hour12: false formatting for midnight can return "24"
    // instead of "0" for some locales/ICU versions; the % 24 in
    // getEasternHour normalizes that back to 0. This case exercises that
    // normalization directly, not just the 3pm cases above.
    expect(getEasternHour(new Date("2026-08-27T04:00:00Z"))).toBe(0);
  });
});

describe("isScheduledRefreshHour", () => {
  it("is true for 8, 15, and 21, and the hour immediately after each", () => {
    expect(isScheduledRefreshHour(8)).toBe(true);
    expect(isScheduledRefreshHour(9)).toBe(true);
    expect(isScheduledRefreshHour(15)).toBe(true);
    expect(isScheduledRefreshHour(16)).toBe(true);
    expect(isScheduledRefreshHour(21)).toBe(true);
    expect(isScheduledRefreshHour(22)).toBe(true);
  });

  it("is false for hours outside the widened windows", () => {
    expect(isScheduledRefreshHour(10)).toBe(false);
    expect(isScheduledRefreshHour(12)).toBe(false);
    expect(isScheduledRefreshHour(17)).toBe(false);
    expect(isScheduledRefreshHour(23)).toBe(false);
    expect(isScheduledRefreshHour(0)).toBe(false);
  });
});

describe("isForceRunAllowed", () => {
  it("is true when force=true and not in production", () => {
    expect(isForceRunAllowed("development", "true")).toBe(true);
  });

  it("is false when force=true but in production", () => {
    expect(isForceRunAllowed("production", "true")).toBe(false);
  });

  it("is false when force is missing or any other value, even outside production", () => {
    expect(isForceRunAllowed("development", null)).toBe(false);
    expect(isForceRunAllowed("development", "false")).toBe(false);
    expect(isForceRunAllowed("development", "1")).toBe(false);
  });
});

function makeBlob(dateKey: string) {
  return {
    url: `https://example-blob.vercel-storage.com/editions/${dateKey}.json`,
    pathname: `editions/${dateKey}.json`,
  };
}

describe("writeEdition", () => {
  beforeEach(() => {
    putMock.mockReset();
  });

  it("writes to a stable path with no random suffix, so repeated writes overwrite", async () => {
    await writeEdition({ dateKey: "2026-08-26", articles: [] }, "test-token");
    expect(putMock).toHaveBeenCalledWith(
      "editions/2026-08-26.json",
      JSON.stringify({ dateKey: "2026-08-26", articles: [] }),
      expect.objectContaining({ addRandomSuffix: false, allowOverwrite: true, token: "test-token" }),
    );
  });
});

describe("listRecentEditionDateKeys", () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it("returns date keys sorted newest first", async () => {
    listMock.mockResolvedValue({
      blobs: [makeBlob("2026-08-24"), makeBlob("2026-08-26"), makeBlob("2026-08-25")],
    });
    expect(await listRecentEditionDateKeys("test-token")).toEqual([
      "2026-08-26",
      "2026-08-25",
      "2026-08-24",
    ]);
  });

  it("ignores blobs that don't match the editions/YYYY-MM-DD.json pattern", async () => {
    listMock.mockResolvedValue({
      blobs: [makeBlob("2026-08-26"), { url: "https://example.com/other.json", pathname: "other.json" }],
    });
    expect(await listRecentEditionDateKeys("test-token")).toEqual(["2026-08-26"]);
  });

  it("caps the result at the given limit", async () => {
    const dateKeys = ["2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23"];
    listMock.mockResolvedValue({ blobs: dateKeys.map(makeBlob) });
    expect(await listRecentEditionDateKeys("test-token", 2)).toEqual(["2026-08-23", "2026-08-22"]);
  });
});

describe("readEdition", () => {
  beforeEach(() => {
    listMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no blob matches the given date", async () => {
    listMock.mockResolvedValue({ blobs: [] });
    expect(await readEdition("2026-08-26", "test-token")).toBeNull();
  });

  it("fetches and parses the matching blob's content", async () => {
    const stored = { dateKey: "2026-08-26", articles: [] };
    listMock.mockResolvedValue({ blobs: [makeBlob("2026-08-26")] });
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => stored } as Response);
    expect(await readEdition("2026-08-26", "test-token")).toEqual(stored);
  });

  it("returns null when the blob fetch fails", async () => {
    listMock.mockResolvedValue({ blobs: [makeBlob("2026-08-26")] });
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    expect(await readEdition("2026-08-26", "test-token")).toBeNull();
  });

  it("returns null instead of throwing when the fetch itself rejects (network failure)", async () => {
    listMock.mockResolvedValue({ blobs: [makeBlob("2026-08-26")] });
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    await expect(readEdition("2026-08-26", "test-token")).resolves.toBeNull();
  });

  it("returns null instead of throwing when the response body isn't valid JSON", async () => {
    listMock.mockResolvedValue({ blobs: [makeBlob("2026-08-26")] });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    } as unknown as Response);
    await expect(readEdition("2026-08-26", "test-token")).resolves.toBeNull();
  });

  it("returns null when the parsed JSON doesn't match the StoredEdition shape", async () => {
    listMock.mockResolvedValue({ blobs: [makeBlob("2026-08-26")] });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ dateKey: "2026-08-26", articles: "not-an-array" }),
    } as Response);
    expect(await readEdition("2026-08-26", "test-token")).toBeNull();
  });
});

describe("pruneOldEditions", () => {
  beforeEach(() => {
    listMock.mockReset();
    delMock.mockReset();
  });

  it("does nothing when 14 or fewer dated blobs exist", async () => {
    const dateKeys = Array.from({ length: 14 }, (_, i) => `2026-08-${String(i + 1).padStart(2, "0")}`);
    listMock.mockResolvedValue({ blobs: dateKeys.map(makeBlob) });
    await pruneOldEditions("test-token");
    expect(delMock).not.toHaveBeenCalled();
  });

  it("prunes down to 7 once more than 14 exist, keeping the newest 7", async () => {
    const dateKeys = Array.from({ length: 15 }, (_, i) => `2026-08-${String(i + 1).padStart(2, "0")}`);
    listMock.mockResolvedValue({ blobs: dateKeys.map(makeBlob) });
    await pruneOldEditions("test-token");
    expect(delMock).toHaveBeenCalledTimes(1);
    const deletedUrls = delMock.mock.calls[0][0] as string[];
    // Dates sort newest-first, so the 8 oldest of the 15 (2026-08-01 through
    // 2026-08-08) are exactly the ones that should be deleted. Asserting the
    // exact set (not just the count and that the newest survives) would
    // catch an off-by-one or a wrong-direction slice.
    const expectedDeletedUrls = dateKeys.slice(0, 8).map((dateKey) => makeBlob(dateKey).url);
    expect([...deletedUrls].sort()).toEqual([...expectedDeletedUrls].sort());
  });
});
