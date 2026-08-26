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
});

describe("isScheduledRefreshHour", () => {
  it("is true for 8, 15, and 21", () => {
    expect(isScheduledRefreshHour(8)).toBe(true);
    expect(isScheduledRefreshHour(15)).toBe(true);
    expect(isScheduledRefreshHour(21)).toBe(true);
  });

  it("is false for any other hour", () => {
    expect(isScheduledRefreshHour(9)).toBe(false);
    expect(isScheduledRefreshHour(0)).toBe(false);
    expect(isScheduledRefreshHour(22)).toBe(false);
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
    expect(deletedUrls).toHaveLength(8);
    expect(deletedUrls).not.toEqual(expect.arrayContaining([makeBlob("2026-08-15").url]));
  });
});
