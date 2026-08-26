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
