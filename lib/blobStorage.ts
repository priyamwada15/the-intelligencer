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
  // Accept each target hour plus the hour immediately after it, since
  // scheduled GitHub Actions runs are frequently delayed 10-30+ minutes (or
  // more) past their configured time. A late-delivered trigger that lands in
  // the following hour would otherwise be silently skipped and that whole
  // refresh window lost. Writes are idempotent same-date overwrites, so
  // accepting the extra hour is safe even if both the on-time and delayed
  // triggers happen to land in a scheduled hour.
  return (
    hour === 8 ||
    hour === 9 ||
    hour === 15 ||
    hour === 16 ||
    hour === 21 ||
    hour === 22
  );
}

export function isForceRunAllowed(nodeEnv: string | undefined, forceParam: string | null): boolean {
  return nodeEnv !== "production" && forceParam === "true";
}

// GitHub Actions' schedule trigger has been observed drifting far past the
// hour(+1) tolerance above -- sometimes by several hours, and the drift can
// compound run over run rather than self-correcting. If every trigger for a
// whole day lands outside the accepted window, the old hour-only gate would
// skip every one of them and that day would never get an edition at all.
// This gate only enforces the hour window once today already has *some*
// edition (to avoid redundant NewsData/Gemini calls on an off-hour retry);
// if today has nothing yet, any trigger -- on-hour or not -- is let through
// so the day is never silently left without a refresh.
export function shouldSkipRefresh(
  hour: number,
  forceRun: boolean,
  editionExistsForToday: boolean,
): boolean {
  if (forceRun) return false;
  if (!editionExistsForToday) return false;
  return !isScheduledRefreshHour(hour);
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
    allowOverwrite: true,
    // @vercel/blob defaults cacheControlMaxAge to one month. Because this
    // path is stable (addRandomSuffix: false), same-day overwrites at
    // 3pm/9pm could otherwise be hidden behind a month-long CDN cache. 60
    // seconds is the minimum @vercel/blob allows.
    cacheControlMaxAge: 60,
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

function isStoredEditionShape(value: unknown): value is StoredEdition {
  if (typeof value !== "object" || value === null) return false;
  const edition = value as Record<string, unknown>;
  return typeof edition.dateKey === "string" && Array.isArray(edition.articles);
}

export async function readEdition(dateKey: string, token: string): Promise<StoredEdition | null> {
  const blobs = await listEditionBlobs(token);
  const match = blobs.find((blob) => blob.dateKey === dateKey);
  if (!match) return null;

  // A single bad day (network failure, malformed JSON, or an unexpected
  // shape) must never throw out of here — callers read multiple dates in
  // parallel, and one throw would otherwise take down every other good day
  // along with it.
  try {
    const response = await fetch(match.url);
    if (!response.ok) return null;
    const parsed: unknown = await response.json();
    return isStoredEditionShape(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function pruneOldEditions(token: string): Promise<void> {
  const blobs = await listEditionBlobs(token);
  if (blobs.length <= PRUNE_TRIGGER_COUNT) return;

  const toDelete = blobs.slice(PRUNE_RETAIN_COUNT).map((blob) => blob.url);
  await del(toDelete, { token });
}
