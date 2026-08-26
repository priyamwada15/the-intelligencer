import { IntelligencerScreen } from "@/components/IntelligencerScreen";
import { EDITIONS } from "@/lib/editions";
import { fetchTechNews } from "@/lib/newsdata";
import { buildTodayEdition } from "@/lib/buildEdition";
import type { Edition } from "@/lib/editions";

async function getTodayEdition(): Promise<Edition> {
  const placeholderToday = EDITIONS[0];
  const apiKey = process.env.NEWSDATA_API_KEY;

  if (!apiKey) {
    return placeholderToday;
  }

  try {
    const rawArticles = await fetchTechNews(apiKey);
    const liveEdition = buildTodayEdition(rawArticles);
    if (liveEdition.articles.length === 0) {
      return placeholderToday;
    }
    return liveEdition;
  } catch (error) {
    console.error("NewsData.io fetch failed, falling back to placeholder edition:", error);
    return placeholderToday;
  }
}

export default async function Home() {
  const todayEdition = await getTodayEdition();
  const editions: Edition[] = [todayEdition, ...EDITIONS.slice(1)];

  return <IntelligencerScreen editions={editions} />;
}
