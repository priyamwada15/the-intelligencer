# The Intelligencer

A daily AI news briefing built as a single-card, swipe-through experience for mobile. You get one story at a time, filtered by category if you want, and the app never rewrites what a source wrote.

I started this project from a Figma exploration comparing three different visual directions before settling on the one here, which I called Canopy Editorial in my own notes. From there I built it in phases on purpose: a static scaffold first, then the swipe and filter interactions against placeholder content, then the real news pipeline last. Each phase has its own plan document, and the reasoning behind the choices lives in `docs/decision-log.md`, which tracks the real thinking better than this file does.

The news comes from NewsData.io, sorted into categories by a keyword-matching rule instead of an LLM call, mostly for cost and predictability. A scheduled job refreshes the current day's edition three times daily and builds up a rolling week of real history once it has been running long enough. None of that live behavior turns on by accident though: a `NEWS_LIVE_MODE` flag has to be set to true explicitly, so holding an API key locally never changes what you see while developing.

The swipe got rebuilt entirely partway through. The first version was a hand-rolled pointer drag that snapped back or swapped content instantly, with no real motion to it. It runs on Motion now, with the outgoing card continuing off screen while the next one slides in, though I reverted one version of that transition after seeing it live and deciding the earlier, plainer one looked better.

This is still local-only. It hasn't been deployed anywhere yet, and `NEWS_LIVE_MODE` stays off until the design and interactions feel finished.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it.

## Environment variables

Copy `.env.local.example` to `.env.local`:
- `NEWSDATA_API_KEY` — a free NewsData.io key (sign up at https://newsdata.io/register). Without one, the app always shows placeholder data for today's edition.
- `NEWS_LIVE_MODE` — must be exactly `true` for the app to actually call the live API, even when a key is present. Defaults to off, so you can hold a key locally while developing without it changing your local data. Set to `true` when you're ready to verify live data end-to-end or before deploying.
- `BLOB_READ_WRITE_TOKEN` — a Vercel Blob store's read-write token (Vercel dashboard → Storage → create a Blob store). Used to read and write stored editions.
- `CRON_SECRET` — any random string. The scheduled refresh job authenticates with this; requests without a matching `Authorization: Bearer` header are rejected.

## GitHub Actions secrets

Once the app is deployed, the scheduled refresh workflow (`.github/workflows/refresh-edition.yml`) needs two repository secrets configured in GitHub (Settings → Secrets and variables → Actions):
- `CRON_SECRET` — must match the `CRON_SECRET` value set in the deployed app's environment (the same variable described above).
- `APP_URL` — the deployed app's base URL, no trailing slash (e.g. `https://your-app.vercel.app`).

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm test` — run the Vitest test suite
- `npm run lint` — run ESLint
