# Phase 4: Multi-Day Real History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder "yesterday" and "two days ago" editions with real, persisted history, refreshed automatically three times a day (8am/3pm/9pm ET) via a scheduled job that fetches from NewsData.io and writes to Vercel Blob storage, keyed by calendar date. Because each date's blob is never touched again once the day rolls over, the archive of past days accumulates with no separate "archiving" step. This phase builds the pipeline only — real multi-day history cannot exist until the app is deployed and the scheduler has run across several real days; that deployment and flipping `NEWS_LIVE_MODE` are separate, later steps.

**Architecture:** A new protected route, `app/api/cron/refresh-edition/route.ts`, does the actual work (fetch → filter/categorize via Phase 3's existing `lib/relevance.ts`/`lib/categorize.ts` → write to Blob → prune old blobs). It's triggered by a GitHub Actions scheduled workflow (not Vercel's own Cron Jobs, which are limited to once/day on the Hobby plan) doing an authenticated `curl`. `app/page.tsx` reads the most recent 7 dated blobs from storage when `NEWS_LIVE_MODE=true`; otherwise it's unchanged from Phase 3. `lib/buildEdition.ts`'s single build-and-format function splits into a build step (`buildStoredEdition`, saved to storage with raw `pubDate`s) and a display-formatting step (`toDisplayEdition`, computed at render time) so relative timestamps never go stale in storage.

**Tech Stack:** Same as Phases 1-3 (Next.js 16 App Router, Tailwind v4, TypeScript, Vitest), plus `@vercel/blob` (new dependency) for storage and a GitHub Actions workflow for scheduling.

## Global Constraints

- **CRITICAL SAFETY INSTRUCTION: never read, open, or print the contents of `.env.local` for any reason**, in any task. It holds live secrets (`NEWSDATA_API_KEY`, and by the end of this phase `BLOB_READ_WRITE_TOKEN` and `CRON_SECRET`). A prior phase had a subagent read this file "to verify contents" and leak a fragment of a real key into its own report — do not repeat this. If you need to know whether a variable is *set* (not its value), ask the user or check `.env.local.example` for the variable's name only.
- **Setup required before Task 3's manual verification can run:** a Vercel Blob store must exist, with its `BLOB_READ_WRITE_TOKEN` added to `.env.local`, and a `CRON_SECRET` value (any random string) also added to `.env.local`. This is an external prerequisite the user provisions, same as `NEWSDATA_API_KEY` in Phase 3 — no task in this plan can complete it.
- **Storage:** one JSON blob per date, `editions/YYYY-MM-DD.json`, where the date key is the **America/New_York calendar date**, not UTC (the 9pm ET run is already past midnight UTC). `addRandomSuffix: false` so repeated writes for the same date overwrite instead of accumulating duplicates.
- **Overwrite semantics:** every refresh does a full rebuild of *today's* blob (fetch → filter → categorize → replace). Never merge with an earlier run's articles from the same day.
- **Never persist emptiness:** if a refresh finds zero AI-relevant articles, skip the write entirely — do not replace a populated edition with an empty one. The app must always have some content to show.
- **Retention:** after every successful write, prune: if more than 14 dated blobs exist, delete the oldest down to 7. The read path additionally windows to the most recent 7 regardless of how many exist.
- **Scheduling source of truth is the route's own wall-clock check**, not the trigger's timing — the route only proceeds if the real current America/New_York hour is 8, 15, or 21, so it doesn't matter exactly when GitHub Actions happens to invoke it.
- **`NEWS_LIVE_MODE`'s meaning is unchanged from Phase 3:** it gates what `app/page.tsx` shows to visitors. It does **not** gate the cron route — the cron always runs on its schedule regardless of the flag, so real history is already accumulating by the time the flag gets flipped. This was an explicit user decision.
- Categorization/relevance logic itself is unchanged from Phase 3 — this phase only changes when/how editions get built and where they're stored, not what counts as AI-relevant or how categories are assigned.
- Single source of truth per concept (recurring finding in every prior phase's final review): no task re-derives logic another task/module already owns.
- Do not modify `ai-intelligencer/` or `canopy-editorial/`, or anything outside `intelligencer/`.
- **Explicitly out of scope for this phase:** deploying to Vercel, pushing this repo to GitHub, flipping `NEWS_LIVE_MODE` to `true` permanently, and backfilling history for dates before this pipeline existed. The GitHub Actions workflow file is written but cannot actually run anywhere until the repo has a GitHub remote — that's fine, it's still correct to write it now.

---

## File Structure

```
intelligencer/
  lib/
    buildEdition.ts            # REWRITE: StoredArticle/StoredEdition types, buildStoredEdition(), shouldPersistEdition(), toDisplayEdition(), formatEditionDateFromKey(). formatRelativeTime() unchanged. Deletes buildTodayEdition() and the old Date-based formatEditionDate().
    buildEdition.test.ts       # REWRITE to match
    blobStorage.ts             # NEW: getEasternDateKey(), getEasternHour(), isScheduledRefreshHour(), writeEdition(), listRecentEditionDateKeys(), readEdition(), pruneOldEditions()
    blobStorage.test.ts        # NEW
  app/
    api/
      cron/
        refresh-edition/
          route.ts             # NEW: POST handler — auth, hour-gate, fetch+build+write+prune, never-hard-crash-into-empty
    page.tsx                   # MODIFY: read from blob storage (today + up to 6 past days) when NEWS_LIVE_MODE=true; unchanged placeholder path otherwise
  .github/
    workflows/
      refresh-edition.yml      # NEW: 6 UTC cron schedules (DST-paired) + manual dispatch, authenticated curl to the route
  .env.local.example            # MODIFY: document BLOB_READ_WRITE_TOKEN and CRON_SECRET
  README.md                     # MODIFY: extend "Environment variables" section
  package.json                  # MODIFY: add @vercel/blob dependency
```

---

### Task 1: Split edition building into storage and display steps

**Files:**
- Modify: `lib/buildEdition.ts`
- Modify: `lib/buildEdition.test.ts`

**Interfaces:**
- Consumes: `NewsDataArticle` (`lib/newsdata.ts`), `isAiRelevant` (`lib/relevance.ts`), `categorizeArticle` (`lib/categorize.ts`), `CategoryId` (`lib/categories.ts`), `Edition` (`lib/editions.ts`).
- Produces: `StoredArticle`, `StoredEdition` types; `buildStoredEdition(rawArticles, dateKey): StoredEdition`; `shouldPersistEdition(edition): boolean`; `toDisplayEdition(stored, now?): Edition`; `formatEditionDateFromKey(dateKey): string`; `formatRelativeTime(pubDate, now?): string` (unchanged signature, kept). Task 2 and Task 3 import `StoredEdition`, `buildStoredEdition`, and `shouldPersistEdition`. Task 4 imports `toDisplayEdition`.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `lib/buildEdition.test.ts` with:

```typescript
import { describe, it, expect } from "vitest";
import {
  formatRelativeTime,
  formatEditionDateFromKey,
  buildStoredEdition,
  shouldPersistEdition,
  toDisplayEdition,
} from "./buildEdition";
import type { NewsDataArticle } from "./newsdata";

describe("formatRelativeTime", () => {
  const now = new Date("2026-08-26T12:00:00Z");

  it("formats minutes ago", () => {
    expect(formatRelativeTime("2026-08-26 11:45:00", now)).toBe("15 min ago");
  });

  it("formats hours ago", () => {
    expect(formatRelativeTime("2026-08-26 09:00:00", now)).toBe("3 hr ago");
  });

  it("formats days ago", () => {
    expect(formatRelativeTime("2026-08-24 12:00:00", now)).toBe("2 days ago");
  });

  it("formats exactly one day ago without a trailing 's'", () => {
    expect(formatRelativeTime("2026-08-25 12:00:00", now)).toBe("1 day ago");
  });

  it("formats under a minute as 'just now'", () => {
    expect(formatRelativeTime("2026-08-26 11:59:45", now)).toBe("just now");
  });
});

describe("formatEditionDateFromKey", () => {
  it("formats a date key as a weekday/month/day string with no year", () => {
    expect(formatEditionDateFromKey("2026-08-26")).toBe("Wednesday, August 26");
  });

  it("matches the placeholder editions' date format shape", () => {
    expect(formatEditionDateFromKey("2026-01-05")).toMatch(/^[A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}$/);
  });
});

function makeArticle(overrides: Partial<NewsDataArticle>): NewsDataArticle {
  return {
    article_id: "id",
    title: "OpenAI announces new model",
    link: "https://example.com",
    description: "A description mentioning AI.",
    pubDate: "2026-08-26 11:00:00",
    source_id: "example",
    source_name: "Example News",
    category: ["technology"],
    language: "english",
    ...overrides,
  };
}

describe("buildStoredEdition", () => {
  it("filters out articles that aren't AI-relevant", () => {
    const edition = buildStoredEdition(
      [makeArticle({ title: "Local bakery wins award", description: "The bakery has been open for 30 years." })],
      "2026-08-26",
    );
    expect(edition.articles).toHaveLength(0);
  });

  it("maps a relevant article to a StoredArticle with a categorized category and the raw pubDate", () => {
    const edition = buildStoredEdition([makeArticle({})], "2026-08-26");
    expect(edition.articles).toHaveLength(1);
    const article = edition.articles[0];
    expect(article.headline).toBe("OpenAI announces new model");
    expect(article.source).toBe("Example News");
    expect(article.url).toBe("https://example.com");
    expect(article.pubDate).toBe("2026-08-26 11:00:00");
    expect(article.category).toBe("MODELS");
  });

  it("caps the result at 6 articles", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeArticle({ article_id: String(i), title: `OpenAI story number ${i}` }),
    );
    const edition = buildStoredEdition(many, "2026-08-26");
    expect(edition.articles).toHaveLength(6);
  });

  it("returns an edition with an empty articles array, never throws, on empty input", () => {
    expect(() => buildStoredEdition([], "2026-08-26")).not.toThrow();
    expect(buildStoredEdition([], "2026-08-26").articles).toEqual([]);
  });

  it("carries the given dateKey through unchanged", () => {
    expect(buildStoredEdition([], "2026-08-26").dateKey).toBe("2026-08-26");
  });
});

describe("shouldPersistEdition", () => {
  it("returns false for an edition with no articles", () => {
    expect(shouldPersistEdition({ dateKey: "2026-08-26", articles: [] })).toBe(false);
  });

  it("returns true for an edition with at least one article", () => {
    const edition = buildStoredEdition([makeArticle({})], "2026-08-26");
    expect(shouldPersistEdition(edition)).toBe(true);
  });
});

describe("toDisplayEdition", () => {
  const now = new Date("2026-08-26T12:00:00Z");

  it("formats the date from the dateKey and computes each article's relative timestamp at call time", () => {
    const stored = {
      dateKey: "2026-08-26",
      articles: [
        {
          category: "MODELS" as const,
          headline: "OpenAI announces new model",
          summary: "A description.",
          source: "Example News",
          pubDate: "2026-08-26 11:00:00",
          url: "https://example.com",
        },
      ],
    };
    const display = toDisplayEdition(stored, now);
    expect(display.date).toBe("Wednesday, August 26");
    expect(display.articles).toHaveLength(1);
    expect(display.articles[0].timestamp).toBe("1 hr ago");
    expect(display.articles[0].headline).toBe("OpenAI announces new model");
  });

  it("recomputes a different timestamp when given a different 'now', proving it isn't baked in at build time", () => {
    const stored = {
      dateKey: "2026-08-26",
      articles: [
        {
          category: "MODELS" as const,
          headline: "Headline",
          summary: "Summary.",
          source: "Source",
          pubDate: "2026-08-26 11:00:00",
          url: "https://example.com",
        },
      ],
    };
    const laterNow = new Date("2026-08-26T15:00:00Z");
    expect(toDisplayEdition(stored, laterNow).articles[0].timestamp).toBe("4 hr ago");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- buildEdition`
Expected: FAIL — `formatEditionDateFromKey`, `buildStoredEdition`, `shouldPersistEdition`, and `toDisplayEdition` are not exported yet.

- [ ] **Step 3: Rewrite the implementation**

Replace the full contents of `lib/buildEdition.ts` with:

```typescript
import type { NewsDataArticle } from "@/lib/newsdata";
import { isAiRelevant } from "@/lib/relevance";
import { categorizeArticle } from "@/lib/categorize";
import type { CategoryId } from "@/lib/categories";
import type { Edition } from "@/lib/editions";

const MAX_ARTICLES = 6;

export type StoredArticle = {
  category: CategoryId;
  headline: string;
  summary: string;
  source: string;
  pubDate: string;
  url: string;
};

export type StoredEdition = {
  dateKey: string;
  articles: StoredArticle[];
};

export function formatRelativeTime(pubDate: string, now: Date = new Date()): string {
  const published = new Date(`${pubDate.replace(" ", "T")}Z`);
  const diffMs = now.getTime() - published.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;

  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

export function formatEditionDateFromKey(dateKey: string): string {
  const noonUtc = new Date(`${dateKey}T12:00:00Z`);
  return noonUtc.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function buildStoredEdition(rawArticles: NewsDataArticle[], dateKey: string): StoredEdition {
  const articles: StoredArticle[] = rawArticles
    .filter((raw) => isAiRelevant(raw.title, raw.description))
    .slice(0, MAX_ARTICLES)
    .map((raw) => ({
      category: categorizeArticle(raw.title, raw.description),
      headline: raw.title,
      summary: raw.description ?? "",
      source: raw.source_name,
      pubDate: raw.pubDate,
      url: raw.link,
    }));

  return { dateKey, articles };
}

export function shouldPersistEdition(edition: StoredEdition): boolean {
  return edition.articles.length > 0;
}

export function toDisplayEdition(stored: StoredEdition, now: Date = new Date()): Edition {
  return {
    date: formatEditionDateFromKey(stored.dateKey),
    articles: stored.articles.map((article) => ({
      category: article.category,
      headline: article.headline,
      summary: article.summary,
      source: article.source,
      timestamp: formatRelativeTime(article.pubDate, now),
      url: article.url,
    })),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- buildEdition`
Expected: PASS, all cases.

- [ ] **Step 5: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors. (`app/page.tsx` still imports the now-deleted `buildTodayEdition` at this point in the plan — Task 4 fixes that. If this step fails only on `app/page.tsx`, that's expected and will be resolved by Task 4; do not fix it here.)

- [ ] **Step 6: Commit**

```bash
git add lib/buildEdition.ts lib/buildEdition.test.ts
git commit -m "refactor: split edition building into storage and display steps"
```

---

### Task 2: Vercel Blob storage layer with America/New_York time helpers

**Files:**
- Create: `lib/blobStorage.ts`
- Create: `lib/blobStorage.test.ts`
- Modify: `package.json` (add `@vercel/blob`)
- Modify: `.env.local.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: `StoredEdition` (from `lib/buildEdition.ts`, Task 1).
- Produces: `getEasternDateKey(now?)`, `getEasternHour(now?)`, `isScheduledRefreshHour(hour)`, `writeEdition(edition, token)`, `listRecentEditionDateKeys(token, limit?)`, `readEdition(dateKey, token)`, `pruneOldEditions(token)`. Task 3 (the cron route) imports all of these. Task 4 (`page.tsx`) imports `listRecentEditionDateKeys` and `readEdition`.

- [ ] **Step 1: Install the dependency**

Run: `npm install @vercel/blob`
Expected: `package.json` and `package-lock.json` both updated; a `@vercel/blob` entry appears in `dependencies`.

- [ ] **Step 2: Write the failing tests**

Create `lib/blobStorage.test.ts`:

```typescript
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
      expect.objectContaining({ addRandomSuffix: false, token: "test-token" }),
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- blobStorage`
Expected: FAIL — `lib/blobStorage.ts` doesn't exist yet.

- [ ] **Step 4: Write the implementation**

Create `lib/blobStorage.ts`:

```typescript
import { put, list, del } from "@vercel/blob";
import type { StoredEdition } from "@/lib/buildEdition";

const EDITION_PREFIX = "editions/";
const DEFAULT_HISTORY_LIMIT = 7;
const PRUNE_TRIGGER_COUNT = 14;
const PRUNE_RETAIN_COUNT = 7;

type EditionBlob = {
  url: string;
  pathname: string;
  dateKey: string;
};

export function getEasternDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getEasternHour(now: Date = new Date()): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  }).format(now);
  return parseInt(formatted, 10) % 24;
}

export function isScheduledRefreshHour(hour: number): boolean {
  return hour === 8 || hour === 15 || hour === 21;
}

function blobPathForDate(dateKey: string): string {
  return `${EDITION_PREFIX}${dateKey}.json`;
}

function dateKeyFromPathname(pathname: string): string | null {
  const match = pathname.match(/^editions\/(\d{4}-\d{2}-\d{2})\.json$/);
  return match ? match[1] : null;
}

async function listEditionBlobs(token: string): Promise<EditionBlob[]> {
  const { blobs } = await list({ prefix: EDITION_PREFIX, token });
  const dated: EditionBlob[] = [];
  for (const blob of blobs) {
    const dateKey = dateKeyFromPathname(blob.pathname);
    if (dateKey) {
      dated.push({ url: blob.url, pathname: blob.pathname, dateKey });
    }
  }
  return dated.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
}

export async function writeEdition(edition: StoredEdition, token: string): Promise<void> {
  await put(blobPathForDate(edition.dateKey), JSON.stringify(edition), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    token,
  });
}

export async function listRecentEditionDateKeys(
  token: string,
  limit: number = DEFAULT_HISTORY_LIMIT,
): Promise<string[]> {
  const blobs = await listEditionBlobs(token);
  return blobs.slice(0, limit).map((blob) => blob.dateKey);
}

export async function readEdition(dateKey: string, token: string): Promise<StoredEdition | null> {
  const blobs = await listEditionBlobs(token);
  const match = blobs.find((blob) => blob.dateKey === dateKey);
  if (!match) return null;

  const response = await fetch(match.url);
  if (!response.ok) return null;
  return (await response.json()) as StoredEdition;
}

export async function pruneOldEditions(token: string): Promise<void> {
  const blobs = await listEditionBlobs(token);
  if (blobs.length <= PRUNE_TRIGGER_COUNT) return;

  const toDelete = blobs.slice(PRUNE_RETAIN_COUNT).map((blob) => blob.url);
  await del(toDelete, { token });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- blobStorage`
Expected: PASS, all cases.

- [ ] **Step 6: Document the new environment variables**

In `.env.local.example`, append:

```
# Vercel Blob store's read-write token. Create a Blob store in the Vercel
# dashboard (Storage tab) and copy its token here. Used both by the cron
# route to write editions and by app/page.tsx to read them back.
BLOB_READ_WRITE_TOKEN=

# Any random string. Must match the Authorization: Bearer header the
# scheduler sends to /api/cron/refresh-edition — this is what stops anyone
# else from triggering a refresh (and burning NewsData.io credits) by
# guessing the URL.
CRON_SECRET=
```

In `README.md`, extend the existing "Environment variables" section by adding two new bullets after the `NEWS_LIVE_MODE` line:
- `BLOB_READ_WRITE_TOKEN` — a Vercel Blob store's read-write token (Vercel dashboard → Storage → create a Blob store). Used to read and write stored editions.
- `CRON_SECRET` — any random string. The scheduled refresh job authenticates with this; requests without a matching `Authorization: Bearer` header are rejected.

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/blobStorage.ts lib/blobStorage.test.ts package.json package-lock.json .env.local.example README.md
git commit -m "feat: add Vercel Blob storage layer for multi-day editions"
```

---

### Task 3: Cron route — fetch, build, write, prune

**Files:**
- Create: `app/api/cron/refresh-edition/route.ts`

**Interfaces:**
- Consumes: `fetchTechNews` (`lib/newsdata.ts`), `buildStoredEdition`/`shouldPersistEdition` (`lib/buildEdition.ts`, Task 1), `getEasternDateKey`/`getEasternHour`/`isScheduledRefreshHour`/`writeEdition`/`pruneOldEditions` (`lib/blobStorage.ts`, Task 2).
- Produces: a `POST` endpoint at `/api/cron/refresh-edition`. Task 5's GitHub Actions workflow calls it. No other module imports from this file — routes are leaves.

This task has no automated test of the route itself (it's a thin orchestration of already-unit-tested pieces plus header parsing — consistent with how Phase 3 verified `app/page.tsx`'s integration manually rather than mocking the whole request lifecycle). It's verified manually in this task's Step 2.

- [ ] **Step 1: Write the route**

Create `app/api/cron/refresh-edition/route.ts`:

```typescript
import { fetchTechNews } from "@/lib/newsdata";
import { buildStoredEdition, shouldPersistEdition } from "@/lib/buildEdition";
import {
  getEasternDateKey,
  getEasternHour,
  isScheduledRefreshHour,
  writeEdition,
  pruneOldEditions,
} from "@/lib/blobStorage";

export async function POST(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const hour = getEasternHour();
  const forceRun =
    process.env.NODE_ENV !== "production" && new URL(request.url).searchParams.get("force") === "true";

  if (!isScheduledRefreshHour(hour) && !forceRun) {
    return Response.json({ skipped: true, reason: `hour ${hour} is not a scheduled refresh time` });
  }

  const apiKey = process.env.NEWSDATA_API_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!apiKey || !blobToken) {
    return new Response("Missing NEWSDATA_API_KEY or BLOB_READ_WRITE_TOKEN", { status: 500 });
  }

  try {
    const dateKey = getEasternDateKey();
    const rawArticles = await fetchTechNews(apiKey);
    const edition = buildStoredEdition(rawArticles, dateKey);

    if (!shouldPersistEdition(edition)) {
      return Response.json({ ok: true, dateKey, articleCount: 0, persisted: false });
    }

    await writeEdition(edition, blobToken);
    await pruneOldEditions(blobToken);

    return Response.json({ ok: true, dateKey, articleCount: edition.articles.length, persisted: true });
  } catch (error) {
    console.error("refresh-edition failed:", error);
    return new Response("Internal error", { status: 500 });
  }
}
```

- [ ] **Step 2: Manual verification**

Do NOT read `.env.local` directly — ask the user to confirm these three values are present if you need to know whether they're set: `NEWSDATA_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`. This step requires all three.

Start the dev server (`npm run dev`), then run each of the following, substituting the real `CRON_SECRET` value (ask the user for it, or have them run the curl themselves if they'd rather not share it with you):

1. Missing auth — expect `401`:
   ```bash
   curl -i -X POST http://localhost:3000/api/cron/refresh-edition
   ```
2. Wrong auth — expect `401`:
   ```bash
   curl -i -X POST -H "Authorization: Bearer wrong-secret" http://localhost:3000/api/cron/refresh-edition
   ```
3. Correct auth, no `force` — expect `200` with `{"skipped":true,...}` unless it happens to genuinely be 8am/3pm/9pm Eastern right now:
   ```bash
   curl -i -X POST -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/refresh-edition
   ```
4. Correct auth with `force=true` — expect `200` with `{"ok":true,"dateKey":"...","articleCount":N,"persisted":true}` (or `persisted:false` if NewsData.io genuinely has nothing new right now — that's also a valid, correct result):
   ```bash
   curl -i -X POST -H "Authorization: Bearer <CRON_SECRET>" "http://localhost:3000/api/cron/refresh-edition?force=true"
   ```
   Note: `lib/newsdata.ts`'s `fetchTechNews` caches its NewsData.io call for an hour (`next: { revalidate: 3600 }`). Repeating this exact curl within the same hour may return the same cached result — that's expected and doesn't indicate a bug; it doesn't affect the real schedule since scheduled runs are hours apart.

Confirm all four match expectations before moving on.

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/refresh-edition/route.ts
git commit -m "feat: add scheduled edition-refresh API route"
```

---

### Task 4: Read stored editions in `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `EDITIONS` (`lib/editions.ts`), `shouldUseLiveData` (`lib/liveMode.ts`), `toDisplayEdition` (`lib/buildEdition.ts`, Task 1), `listRecentEditionDateKeys`/`readEdition` (`lib/blobStorage.ts`, Task 2).
- Produces: the page's default export, unchanged shape — still renders `<IntelligencerScreen editions={editions} />`.

- [ ] **Step 1: Rewrite the page**

Replace the full contents of `app/page.tsx` with:

```typescript
import { IntelligencerScreen } from "@/components/IntelligencerScreen";
import { EDITIONS } from "@/lib/editions";
import { shouldUseLiveData } from "@/lib/liveMode";
import { toDisplayEdition } from "@/lib/buildEdition";
import { listRecentEditionDateKeys, readEdition } from "@/lib/blobStorage";
import type { Edition } from "@/lib/editions";
import type { StoredEdition } from "@/lib/buildEdition";

async function getLiveEditions(blobToken: string): Promise<Edition[]> {
  try {
    const dateKeys = await listRecentEditionDateKeys(blobToken);
    if (dateKeys.length === 0) {
      return [EDITIONS[0]];
    }

    const now = new Date();
    const stored = await Promise.all(dateKeys.map((dateKey) => readEdition(dateKey, blobToken)));
    const editions = stored
      .filter((edition): edition is StoredEdition => edition !== null)
      .map((edition) => toDisplayEdition(edition, now));

    return editions.length > 0 ? editions : [EDITIONS[0]];
  } catch (error) {
    console.error("Failed to load stored editions, falling back to placeholder:", error);
    return [EDITIONS[0]];
  }
}

export default async function Home() {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const useLiveData = shouldUseLiveData(process.env.NEWSDATA_API_KEY, process.env.NEWS_LIVE_MODE);

  const editions: Edition[] = useLiveData && blobToken ? await getLiveEditions(blobToken) : EDITIONS;

  return <IntelligencerScreen editions={editions} />;
}
```

- [ ] **Step 2: Type-check, lint, and run the full test suite**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: no errors, all tests pass (this is also the point where Task 1's Step 5 caveat about `app/page.tsx` resolves).

- [ ] **Step 3: Manual regression check (live mode off — must be unaffected)**

Do NOT edit `.env.local` for this step. Run `npm run dev` and confirm the app looks and behaves exactly as before this phase: the 3-entry placeholder set, swipe/filter/date-nav all working. This confirms the default local-dev experience is untouched.

- [ ] **Step 4: Manual verification (live mode on — requires Task 3's manual verification to have already written at least one real edition to storage)**

Ask the user to temporarily set `NEWS_LIVE_MODE=true` in `.env.local` (do not do this yourself without asking, and do not read the file — ask them to make the edit and confirm when it's done), then restart the dev server. Confirm:
1. The page shows a real fetched edition (today's date, real headlines) instead of the placeholder Thursday edition.
2. If more than one date exists in storage by this point, date navigation moves between them; if only today exists, the prev-day arrow is disabled (matches `canGoToOlderEdition`'s existing behavior for a length-1 list).
3. Filtering and swipe still work against the real data.

Afterward, ask the user to set `NEWS_LIVE_MODE` back to `false` — going live permanently is a separate, later phase, not a side effect of verifying this one.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: read multi-day edition history from Blob storage"
```

---

### Task 5: GitHub Actions scheduler

**Files:**
- Create: `.github/workflows/refresh-edition.yml`

**Interfaces:** none — this file has no code dependents; it only depends on the deployed route's URL and the `CRON_SECRET`/`APP_URL` secrets existing once the repo is on GitHub and deployed (out of scope for this phase, per Global Constraints).

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/refresh-edition.yml`:

```yaml
name: Refresh edition

on:
  schedule:
    # 8:00am ET — EDT (UTC-4) and EST (UTC-5) pair
    - cron: "0 12 * * *"
    - cron: "0 13 * * *"
    # 3:00pm ET — EDT and EST pair
    - cron: "0 19 * * *"
    - cron: "0 20 * * *"
    # 9:00pm ET — EDT and EST pair (falls after midnight UTC)
    - cron: "0 1 * * *"
    - cron: "0 2 * * *"
  workflow_dispatch: {}

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Call refresh-edition endpoint
        run: |
          curl --fail --show-error \
            -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.APP_URL }}/api/cron/refresh-edition"
```

Each of the 6 schedules fires once a day; only the one matching the current DST season will actually pass the route's internal hour check (see `lib/blobStorage.ts`'s `isScheduledRefreshHour`) and do real work — the other fires a harmless `{skipped: true}` no-op. `--fail` makes the Action fail loudly on a real error (401/500) without false-failing on an expected skip, since skips return `200`. `workflow_dispatch` lets the user manually trigger a run from GitHub's UI once this is deployed, useful for one-off testing.

- [ ] **Step 2: Validate the YAML syntax**

Run: `npx js-yaml .github/workflows/refresh-edition.yml`
Expected: prints the parsed structure with no error. (If `js-yaml` isn't available via `npx` in this environment, visually re-check indentation instead — this file cannot be exercised end-to-end until the repo has a GitHub remote, per Global Constraints, so syntax validation is the only check available now.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/refresh-edition.yml
git commit -m "ci: add scheduled edition-refresh workflow"
```

---

### Task 6: Full regression pass and decision log

**Files:**
- Modify: `docs/decision-log.md`

**Interfaces:** none — verification and documentation only.

- [ ] **Step 1: Full automated check**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: no errors, all tests pass (should already be true from each task's own verification — this is the final confirmation across the whole branch).

- [ ] **Step 2: Production build check**

Run: `npm run build`
Expected: builds successfully; the route table includes `/api/cron/refresh-edition` as a dynamic route alongside the existing static `/`.

- [ ] **Step 3: Update the decision log**

Append to `docs/decision-log.md`:

```markdown
## 2026-08-26 — Phase 4: Multi-day real history
- Storage is Vercel Blob, one JSON blob per America/New_York calendar date (`editions/YYYY-MM-DD.json`). Investigated the old `ai-intelligencer/api/cron.js` pattern first, expecting to mirror it — found it was actually incomplete: it wrote to Blob but `api/news.js` never read that data back, so there was no working read path to copy. Designed the read path from scratch instead, reusing only the storage choice.
- Refreshes run three times a day (8am/3pm/9pm ET) rather than once, per explicit user request, so "today" stays current through the day and the 9pm run's output becomes that date's permanent history once the day rolls over — no separate archiving step needed, since nothing writes to a date's blob again after the calendar date moves on.
- Triggering is a GitHub Actions scheduled workflow calling a protected API route, not Vercel's own Cron Jobs — Vercel Hobby limits cron to once/day with no guaranteed time, which can't hit three fixed daily times. This is a real constraint discovered while designing this phase, not a stylistic choice.
- Both GitHub Actions and Vercel Cron only support fixed UTC schedules, and America/New_York shifts by an hour twice a year. Solved by declaring 6 UTC schedules (one pair per target ET time, covering EDT and EST) and having the route itself re-check the real current Eastern hour before doing any work — whichever schedule in each pair doesn't match the season is a harmless no-op. This self-corrects across DST transitions with no manual schedule maintenance.
- A refresh that finds zero AI-relevant articles skips the write entirely rather than overwriting a populated edition with an empty one (`shouldPersistEdition`) — the app must always have some content to show, per explicit user requirement.
- Retention is a batch rule, not a strict cutoff: once more than 14 dated blobs exist, prune down to 7. The read path additionally windows to the most recent 7 regardless. This was an explicit user refinement over a simpler "always keep exactly 7" design, to avoid pruning logic running on every single write.
- Split `lib/buildEdition.ts`'s single build-and-format function into `buildStoredEdition` (raw articles → storage shape, keeping the raw `pubDate`) and `toDisplayEdition` (storage shape → display shape, computing relative-time labels at render time). This fixes a staleness bug that Phase 3's design didn't need to consider: a baked-in "18 min ago" string is fine for data fetched fresh on every page load, but becomes permanently wrong once an edition can sit in storage for hours or be viewed as archived history.
- This phase builds the pipeline only, per explicit user scoping decision. Real multi-day history cannot exist until the app is deployed and the workflow has run across several real days — that deployment, pushing to GitHub, and flipping `NEWS_LIVE_MODE` permanently are separate, later steps. The GitHub Actions workflow file is written and syntax-checked but not exercised end-to-end in this phase.
- `NEWS_LIVE_MODE` keeps its Phase 3 meaning exactly (gates what visitors see) but no longer gates the cron job itself — the cron always runs, so real history is already accumulating by the time the flag eventually gets flipped, rather than starting from zero on day one of going live. Explicit user decision.
```

- [ ] **Step 4: Commit**

```bash
git add docs/decision-log.md
git commit -m "docs: record Phase 4 multi-day history decisions"
```

---

## Self-Review Notes

- **Spec coverage:** Vercel Blob storage keyed by America/New_York calendar date ✅ Task 2; full-rebuild-overwrite semantics with no cross-run merging ✅ Task 1/3 (`buildStoredEdition` always rebuilds from scratch, called fresh each run); never-overwrite-with-emptiness ✅ Task 1 (`shouldPersistEdition`) + Task 3 (route checks it before writing); 14→7 batch retention ✅ Task 2 (`pruneOldEditions`); 7-day read window ✅ Task 2 (`listRecentEditionDateKeys` default limit) + Task 4; DST-safe 6-schedule GitHub Actions trigger with route-side hour re-check ✅ Task 2 (`isScheduledRefreshHour`/`getEasternHour`) + Task 5; `CRON_SECRET` bearer auth ✅ Task 3; `force=true` dev-only bypass ✅ Task 3; timestamp-staleness fix (raw `pubDate` stored, relative time computed at render) ✅ Task 1; `NEWS_LIVE_MODE` gates the read path only, cron always runs ✅ Task 3 (no flag check in the route) + Task 4; graceful fallback to placeholder on any storage failure ✅ Task 4. Explicitly out of scope and named as such in Global Constraints and the decision log: deployment, GitHub push, flipping `NEWS_LIVE_MODE` permanently, backfilling pre-pipeline history — none silently skipped.
- **Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code; `.env.local.example`'s new entries are intentionally empty (that's the point of an example file).
- **Type consistency:** `StoredArticle`/`StoredEdition` defined once in `lib/buildEdition.ts` (Task 1) and imported by name (never redefined) in `lib/blobStorage.ts` (Task 2), the cron route (Task 3), and `app/page.tsx` (Task 4). `Edition` (from Phase 1/3) is reused as-is by `toDisplayEdition`'s return type — not redefined. Function names match exactly everywhere they're referenced across tasks: `buildStoredEdition`, `shouldPersistEdition`, `toDisplayEdition`, `formatEditionDateFromKey`, `getEasternDateKey`, `getEasternHour`, `isScheduledRefreshHour`, `writeEdition`, `listRecentEditionDateKeys`, `readEdition`, `pruneOldEditions` — checked against every task that consumes them.
- **Global-constraints self-check:** the "never persist emptiness" constraint is enforced in exactly one place (the cron route's `shouldPersistEdition` check before `writeEdition`), not duplicated. The "cron always runs regardless of `NEWS_LIVE_MODE`" constraint holds structurally — the route file never imports `shouldUseLiveData` or reads `NEWS_LIVE_MODE` at all. The "America/New_York, not UTC" constraint is centralized in `lib/blobStorage.ts`'s two time helpers; no other file computes a date or hour independently. The CRITICAL SAFETY INSTRUCTION about `.env.local` is repeated inline in Task 3 and Task 4's manual-verification steps, not just stated once at the top, since those are the exact tasks where a subagent would otherwise be tempted to open the file to "check" a value.
