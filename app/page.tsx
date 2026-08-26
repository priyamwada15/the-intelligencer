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
