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
