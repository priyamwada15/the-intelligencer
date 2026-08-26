import { IntelligencerScreen } from "@/components/IntelligencerScreen";
import { EDITIONS } from "@/lib/editions";
import { shouldUseLiveData } from "@/lib/liveMode";
import { toDisplayEdition } from "@/lib/buildEdition";
import { listRecentEditionDateKeys, readEdition } from "@/lib/blobStorage";
import type { Edition } from "@/lib/editions";
import type { StoredEdition } from "@/lib/buildEdition";

// This page's data path (@vercel/blob's list()/fetch()) carries no
// `next: { revalidate }` hint the way Phase 3's single fetch did, so without
// an explicit route-level revalidate, Next would prerender "/" once at build
// time and never refresh it. 5 minutes keeps live data from going stale for
// long after a scheduled refresh writes a new edition.
export const revalidate = 300;

async function getLiveEditions(blobToken: string): Promise<Edition[]> {
  try {
    const dateKeys = await listRecentEditionDateKeys(blobToken);
    if (dateKeys.length === 0) {
      return [EDITIONS[0]];
    }

    const now = new Date();
    const results = await Promise.allSettled(dateKeys.map((dateKey) => readEdition(dateKey, blobToken)));
    // Use allSettled (not all) so one rejected read can't take down every
    // other perfectly good day's edition — readEdition itself shouldn't
    // throw, but this is a second layer of defense against a future change
    // that reintroduces one.
    const editions = results
      .filter((result): result is PromiseFulfilledResult<StoredEdition | null> => result.status === "fulfilled")
      .map((result) => result.value)
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
