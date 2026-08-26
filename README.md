# The Intelligencer

A considered daily briefing on AI news — a Next.js + Tailwind CSS static screen design, built as a portfolio project.

This is Phase 1: a static scaffold. The masthead, date bar, category filter chips, and a single story card are all in place and pixel-matched to the Figma design, but nothing is interactive yet (no swipe, no working filters, no working date navigation). See `docs/decision-log.md` for the reasoning behind key decisions.

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

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm test` — run the Vitest test suite
- `npm run lint` — run ESLint
