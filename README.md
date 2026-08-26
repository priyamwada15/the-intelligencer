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

Copy `.env.local.example` to `.env.local` and add a free NewsData.io API key (sign up at https://newsdata.io/register) to see real, live AI news for today's edition. Without a key, the app runs fine and falls back to placeholder data — nothing breaks either way.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm test` — run the Vitest test suite
- `npm run lint` — run ESLint
