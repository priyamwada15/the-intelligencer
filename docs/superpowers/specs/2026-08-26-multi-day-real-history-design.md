# Multi-Day Real History — Design Spec

## Goal

Replace the placeholder "yesterday" and "two days ago" editions with real, persisted
history. A scheduled job refreshes *today's* edition three times a day and, because
each date's data is never touched again once the calendar day rolls over, the
archive of past days accumulates automatically with no separate "archiving" step.

This phase builds the pipeline only. Real multi-day history cannot exist until the
app is deployed and the scheduler has actually run across several real days — that
deployment and the `NEWS_LIVE_MODE` flip are separate, later steps, not part of this
phase.

## Non-goals

- Deploying `intelligencer` to Vercel.
- Pushing this repo to GitHub (required for the scheduler to actually run, but not
  done in this phase).
- Flipping `NEWS_LIVE_MODE` to `true`.
- Backfilling history for dates before this pipeline existed.
- Merging/deduplicating articles across the three daily refreshes — each refresh is
  a full rebuild that replaces the previous one for that date.

## Architecture

```
GitHub Actions (6 UTC cron schedules)
        │  authenticated POST (Bearer CRON_SECRET)
        ▼
app/api/cron/refresh-edition/route.ts
        │  1. checks it's actually 8am/3pm/9pm America/New_York (else no-ops)
        │  2. fetches NewsData.io, filters + categorizes (existing logic)
        │  3. writes editions/<dateKey>.json to Vercel Blob (overwrite)
        │  4. prunes storage back to 7 dates once it exceeds 14
        ▼
Vercel Blob (editions/YYYY-MM-DD.json, one blob per America/New_York calendar date)
        ▲
        │  list + read, most recent 7 dates
app/page.tsx  (only when NEWS_LIVE_MODE=true; otherwise unchanged placeholder path)
```

Triggering is external (GitHub Actions), not Vercel's own Cron Jobs, because Vercel
Hobby limits cron to once/day with no guaranteed time — insufficient for three
fixed daily times. This was an explicit user decision after that constraint was
surfaced.

## Storage scheme

- One JSON blob per date: `editions/YYYY-MM-DD.json`.
- The date key is the **America/New_York calendar date** at the moment of the
  refresh, not UTC — otherwise the 9pm ET run (which is already past midnight UTC)
  would file under the wrong day.
- Every refresh (8am/3pm/9pm) does a **full rebuild and overwrite** of today's blob:
  fetch → filter → categorize → replace the whole file. No merging with earlier
  runs that day.
- This is what makes "yesterday's history = its 9pm edition" fall out for free:
  nothing writes to a date's blob again once the calendar date has moved on.
- **Retention:** after each successful write, the route lists all stored dates. If
  there are more than 14, it deletes the oldest down to 7. This is a self-sustaining
  batch-cleanup rule (grow to 14, prune to 7, repeat) rather than a strict
  always-exactly-7 cutoff, per explicit user request to keep the store lean without
  pruning on every single write.
- **Read-time window:** regardless of how many blobs exist, `page.tsx` only ever
  reads the most recent 7 dates.

## Scheduling

GitHub Actions cron (like Vercel's) only supports fixed UTC times, and America/New_York
shifts by an hour twice a year. The workflow declares **6 UTC schedules** — one pair
per target ET time, covering both EDT and EST:

| Target ET time | EDT (UTC-4) | EST (UTC-5) |
|---|---|---|
| 8:00am | `0 12 * * *` | `0 13 * * *` |
| 3:00pm | `0 19 * * *` | `0 20 * * *` |
| 9:00pm | `0 1 * * *` (next day) | `0 2 * * *` (next day) |

The route itself re-checks the actual current New York hour via
`Intl.DateTimeFormat` and only proceeds if it's exactly 8, 15, or 21; otherwise it
responds `{ skipped: true }` and does nothing. Whichever schedule in each pair
doesn't match the current season is a harmless no-op — this self-corrects across
DST transitions with no manual schedule edits, and also makes the route idempotent
against being triggered an extra time by mistake.

Auth: a `CRON_SECRET` bearer token, stored as a GitHub Actions repository secret,
checked the same way the old `ai-intelligencer/api/cron.js` did it.

## Data model changes

Today's `Article.timestamp` is a pre-formatted relative-time string ("18 min ago"),
baked in once at fetch time. That breaks once an edition can sit in storage for
hours (or forever, once archived) before someone views it — the string goes stale
and is wrong forever. Fix: store the raw `pubDate`, and compute the relative-time
label at **render time** in `page.tsx`, not at build/write time.

This splits `lib/buildEdition.ts`'s current single `buildTodayEdition` (which both
builds *and* formats for display in one step) into two responsibilities:

- **`StoredArticle`/`StoredEdition`** (new types) — what gets written to Blob.
  `StoredArticle` is `Article` with `pubDate: string` (raw NewsData value) in place
  of `timestamp: string`. `StoredEdition` is `{ dateKey: string; articles:
  StoredArticle[] }`.
- **`buildStoredEdition(rawArticles, dateKey): StoredEdition`** — replaces
  `buildTodayEdition`. Same filter/categorize/slice logic, no timestamp formatting.
- **`toDisplayEdition(stored: StoredEdition, now?: Date): Edition`** — new. Maps a
  `StoredEdition` to the existing display `Edition` type, computing
  `formatRelativeTime(pubDate, now)` per article at call time.
- **`formatEditionDateFromKey(dateKey: string): string`** — replaces the current
  `formatEditionDate(date: Date)`, which hardcodes `timeZone: "UTC"`. Renders a
  `YYYY-MM-DD` key (already the correct America/New_York calendar date) as
  `"Wednesday, August 26"` by parsing it at noon UTC and formatting in UTC — this
  avoids re-introducing a timezone conversion for a value that's already the
  correct calendar date.
- `formatRelativeTime` (existing) is unchanged and reused by `toDisplayEdition`.

`buildTodayEdition` and the old `formatEditionDate(date: Date)` are deleted — both
are fully superseded by the above, and nothing else references them.

## Storage I/O (new: `lib/blobStorage.ts`)

Wraps `@vercel/blob` (`put`, `list`, `del`) plus the America/New_York time helpers
the scheduling logic depends on:

- `getEasternDateKey(now?: Date): string` — today's date as `YYYY-MM-DD` in
  America/New_York, via `Intl.DateTimeFormat("en-CA", { timeZone:
  "America/New_York", ... }).formatToParts(now)`.
- `getEasternHour(now?: Date): number` — the current hour (0–23) in
  America/New_York.
- `isScheduledRefreshHour(hour: number): boolean` — `hour === 8 || hour === 15 ||
  hour === 21`.
- `writeEdition(edition: StoredEdition, token: string): Promise<void>` — `put()`
  to `editions/<dateKey>.json` with `addRandomSuffix: false` so repeated writes for
  the same date overwrite rather than accumulate duplicate blobs.
- `listRecentEditionDateKeys(token: string, limit = 7): Promise<string[]>` — lists
  blobs under the `editions/` prefix, extracts date keys from pathnames, sorts
  descending (newest first), returns the top `limit`.
- `readEdition(dateKey: string, token: string): Promise<StoredEdition | null>` —
  finds the matching blob and fetches/parses its JSON content; `null` if not found.
- `pruneOldEditions(token: string): Promise<void>` — if more than 14 dated blobs
  exist, deletes the oldest down to 7.

These are the four operations the cron route and `page.tsx` both need; no other
module should import `@vercel/blob` directly.

## Cron route (`app/api/cron/refresh-edition/route.ts`)

`POST` only. Flow:

1. Check `Authorization: Bearer ${process.env.CRON_SECRET}`; `401` if missing/wrong.
2. Check `isScheduledRefreshHour(getEasternHour())`; if false, return `{ skipped:
   true, reason }` with `200` (not an error — this is the expected no-op path for
   whichever half of each DST pair doesn't match right now). **Exception:** outside
   production (`process.env.NODE_ENV !== "production"`), a `?force=true` query
   param skips this check, so the full write+prune path can be exercised locally
   on demand instead of only during a real 8am/3pm/9pm ET window. The param has no
   effect in production, so it can't be used to spam writes on a live deployment.
3. Read `NEWSDATA_API_KEY` and `BLOB_READ_WRITE_TOKEN` from env; `500` if either is
   missing (this route only ever runs where both are configured; a missing var is a
   deployment misconfiguration, not a normal runtime condition to fall back from).
4. `fetchTechNews` → `buildStoredEdition(raw, getEasternDateKey())` → `writeEdition`
   → `pruneOldEditions`.
5. On any thrown error during step 4: `console.error` and return `500`. Unlike
   `page.tsx`, this route has no user-facing fallback to protect — a failed refresh
   should be visible (as a failed GitHub Actions run), not silently swallowed.
6. Success: `200` with `{ ok: true, dateKey, articleCount }`.

## Read path (`app/page.tsx`)

- `NEWS_LIVE_MODE` not `true` (checked via the existing `shouldUseLiveData`):
  **unchanged** — returns the static 3-entry `EDITIONS` placeholder array exactly
  as it does today. This phase does not change local dev's default behavior.
- `NEWS_LIVE_MODE=true`: `listRecentEditionDateKeys` → `readEdition` each (in
  parallel) → drop any that came back `null` → `toDisplayEdition` each with a
  single shared `now` → return the resulting array.
  - If storage is unreachable, or comes back with zero usable editions, fall back
    to `[EDITIONS[0]]` (today's placeholder alone) — `console.error`'d, never
    thrown, matching Phase 3's "never hard-fail the page" principle.

## Setup required before implementation

A Vercel Blob store must exist and its `BLOB_READ_WRITE_TOKEN` added to
`.env.local` (same pattern as `NEWSDATA_API_KEY` in Phase 3) before the manual
verification steps in the plan can run. A `CRON_SECRET` value (any random string)
is also needed locally to manually test the route's auth check.

## Testing approach

- Pure logic gets unit tests, same as every prior phase: `getEasternDateKey`,
  `getEasternHour`, `isScheduledRefreshHour`, `formatEditionDateFromKey`,
  `buildStoredEdition`, `toDisplayEdition`.
- `listRecentEditionDateKeys` and `pruneOldEditions`'s sort/threshold logic are
  unit tested against a mocked `@vercel/blob` module (`vi.mock`), not real network
  calls.
- The real fetch → build → write round trip is verified manually: run `next dev`
  locally with a real `NEWSDATA_API_KEY` and `BLOB_READ_WRITE_TOKEN` in
  `.env.local`, and `curl` the route with the right `Authorization` header and
  `?force=true` to exercise the full write+prune path regardless of the real
  current time. The hour-gate's own behavior (skip outside 8/15/21, and that
  `force` has no effect when `NODE_ENV=production`) is covered separately by unit
  tests. This mirrors how Phase 3's live NewsData path was verified without a real
  deployment.
- The GitHub Actions workflow file is written and syntactically valid, but cannot
  actually be exercised until the repo has a GitHub remote — out of scope for this
  phase's verification.

## Files touched

- `lib/buildEdition.ts` — rewritten (see Data model changes above).
- `lib/buildEdition.test.ts` — rewritten to match.
- `lib/blobStorage.ts` — new.
- `lib/blobStorage.test.ts` — new.
- `app/api/cron/refresh-edition/route.ts` — new.
- `app/page.tsx` — rewritten read path.
- `.github/workflows/refresh-edition.yml` — new.
- `.env.local.example` — document `BLOB_READ_WRITE_TOKEN` and `CRON_SECRET`.
- `package.json` — add `@vercel/blob` dependency.
- `docs/decision-log.md` — new Phase 4 entry.
