# Phase 1: Scaffold + Static Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a new Next.js (App Router) + Tailwind CSS v4 app, wire in the design tokens pulled from Figma (colors, spacing, type scale), and render the single Intelligencer card screen as static markup with one hardcoded article — no interactivity yet (no swipe, no filtering, no date nav). This is Phase 1 of a multi-phase rebuild; later phases add interactivity, PWA/offline, and the real news backend on top of this foundation.

**Architecture:** A fresh Next.js App Router project at `intelligencer/`, sibling to the existing `ai-intelligencer/` (untouched, still live) and `canopy-editorial/` (throwaway prototype, not used further). Server Components only in this phase — no client-side state until Phase 2. Design tokens live in `app/globals.css` via Tailwind v4's CSS-first `@theme`, sourced from `canopy-editorial/figma-reference/variables.json` and the type scale agreed in chat.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS v4, `next/font/google` (Sora + Figtree), `lucide-react` (the Figma file's icon layers are literally named `lucide/arrow-left` etc., so this is the exact icon set the design already assumes), Vitest for the one pure-logic unit test in this phase.

## Global Constraints

- Figma file `Key5ZbWG5JqKK7gfBRZRvq`, node `57:48` ("Intelligencer Screen") is the design source of truth — match its values exactly, not approximations.
- Color and spacing tokens come from the Figma variable library already pulled into `canopy-editorial/figma-reference/variables.json`. Type tokens come from the scale agreed in chat (not yet in Figma as real variables).
- Filter chip color rule: accent fill (`background/accent`, `#c8d984`) is an **active-state-only** treatment — inactive chips are plain text, no fill, no border.
- Product voice: neutral, no editorial voice beyond categorization. Placeholder copy in this phase must be the real sample article text already used elsewhere in this project (not lorem ipsum, not invented copy).
- App name is final: **The Intelligencer**.
- Mobile-only viewport for now (design frame is 430px wide, `max-width: 560px`).
- Do not modify `ai-intelligencer/` or `canopy-editorial/` — this is a new, independent app directory.

---

## File Structure

```
intelligencer/
  package.json
  next.config.ts
  tsconfig.json
  postcss.config.mjs
  vitest.config.ts
  app/
    layout.tsx              # fonts, metadata, <html>/<body>
    page.tsx                # renders <IntelligencerScreen article={placeholderArticle} />
    globals.css             # Tailwind import + @theme design tokens
  lib/
    categories.ts           # category metadata + getCategoryStyle() pure function
    categories.test.ts      # Vitest unit test for getCategoryStyle()
  data/
    placeholder-article.ts  # one hardcoded article (real sample copy, not lorem ipsum)
  components/
    Header.tsx
    EditionDateBar.tsx       # static display only in this phase
    FilterChips.tsx          # static "Models" active, rest inactive
    StoryCard.tsx            # Main card + two rotated stacked cards behind it
    IntelligencerScreen.tsx  # composes all of the above + swipe-hint footer text
```

---

### Task 1: Scaffold the Next.js app

**Files:**
- Create: `intelligencer/package.json`, `intelligencer/tsconfig.json`, `intelligencer/next.config.ts`, `intelligencer/postcss.config.mjs`, `intelligencer/app/layout.tsx`, `intelligencer/app/page.tsx`, `intelligencer/app/globals.css` (placeholder content, replaced in Task 2)
- Test: none (scaffolding only — verified by dev server boot in Step 4)

**Interfaces:**
- Produces: a running Next.js dev server at `http://localhost:3000` serving a blank page. Later tasks replace `app/page.tsx`'s contents.

- [ ] **Step 1: Create the app with the Next.js CLI**

Run from the `intelligencer/` directory:

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint --turbopack --use-npm
```

When prompted, accept defaults. This generates `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, and `.gitignore`.

- [ ] **Step 2: Install the two extra dependencies this plan needs**

```bash
npm install lucide-react
npm install -D vitest @vitejs/plugin-react jsdom
```

- [ ] **Step 3: Initialize git and make the first commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind and TypeScript"
```

- [ ] **Step 4: Verify the dev server boots**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000`, default Next.js starter page loads with no console errors.

Stop the server (Ctrl+C) before continuing to the next task.

---

### Task 2: Design tokens

**Files:**
- Modify: `intelligencer/app/globals.css`
- Modify: `intelligencer/app/layout.tsx`

**Interfaces:**
- Consumes: color/spacing values from `canopy-editorial/figma-reference/variables.json`; type scale from chat (see table below).
- Produces: Tailwind utility classes usable by every later component:
  - Colors: `bg-bg-primary`, `bg-surface-card`, `bg-accent`, `bg-accent-subtle`, `bg-lime-100`, `text-text-primary`, `text-text-accent`, `text-text-secondary`, `text-text-body`, `text-green-300`, `border-border-subtle`, `border-border-black`
  - Fonts: `font-sora`, `font-figtree`
  - Tailwind's *default* spacing scale is used as-is for the space tokens (see note below) — no custom spacing utilities are produced by this task.

**Note on spacing:** Tailwind's default spacing scale is 4px-based (`1.5` = 6px, `2` = 8px, `3` = 12px, `4` = 16px, `5` = 20px, `6` = 24px), which matches the Figma `space/1-5` through `space/6` tokens exactly. No custom spacing theme is needed — use `p-6`, `gap-2`, etc. directly in every later task.

- [ ] **Step 1: Replace `app/globals.css` with the token theme**

```css
@import "tailwindcss";

@theme {
  --color-bg-primary: #fafafa;
  --color-surface-card: #fbfaf4;
  --color-accent: #c8d984;
  --color-accent-subtle: #dbe3ca;
  --color-lime-100: #eef2e2;

  --color-text-primary: #263a2f;
  --color-text-accent: #3e624c;
  --color-text-secondary: #69786c;
  --color-text-body: #526258;
  --color-green-300: #8a9b8e;

  --color-border-subtle: #dbe3ca;
  --color-border-black: #00000014;
}

@theme inline {
  --font-sora: var(--font-sora);
  --font-figtree: var(--font-figtree);
}

body {
  background: var(--color-bg-primary);
}
```

- [ ] **Step 2: Load Sora and Figtree via `next/font/google` in the layout**

Replace the contents of `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Sora, Figtree } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-sora",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "The Intelligencer",
  description: "A considered daily briefing on AI news.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${figtree.variable} font-sora antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify the tokens compile**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: no build errors in the terminal; page background renders as `#fafafa` (visually a very light warm gray, not pure white) — confirm with the browser's element inspector on `<body>`.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: wire Figma design tokens into Tailwind theme"
```

---

### Task 3: Category data and the one pure-logic unit in this phase

**Files:**
- Create: `intelligencer/lib/categories.ts`
- Create: `intelligencer/lib/categories.test.ts`
- Create: `intelligencer/vitest.config.ts`
- Modify: `intelligencer/package.json` (add `"test": "vitest run"` script)

**Interfaces:**
- Produces:
  - `type CategoryId = "MODELS" | "PRODUCTS" | "FUNDING" | "INDUSTRY" | "POLICY" | "RESEARCH"`
  - `CATEGORIES: { id: CategoryId; label: string; icon: LucideIcon }[]` (order matches the Figma "Tags" row: Models, Products, Funding, Industry, Policy, Research)
  - `getCategoryStyle(categoryId: CategoryId, isActive: boolean): { chipClass: string; badgeClass: string }` — pure function, no side effects. `chipClass` styles a filter-row chip; `badgeClass` styles the small in-card category badge (which is always filled, regardless of the filter row's active state, per the Figma card).

- [ ] **Step 1: Write the failing test**

Create `intelligencer/lib/categories.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getCategoryStyle, CATEGORIES } from "./categories";

describe("getCategoryStyle", () => {
  it("gives the active chip an accent background and primary text", () => {
    const style = getCategoryStyle("MODELS", true);
    expect(style.chipClass).toContain("bg-accent");
    expect(style.chipClass).toContain("text-text-primary");
  });

  it("gives an inactive chip no background fill and secondary text", () => {
    const style = getCategoryStyle("MODELS", false);
    expect(style.chipClass).not.toContain("bg-accent");
    expect(style.chipClass).toContain("text-text-secondary");
  });

  it("always fills the in-card badge with accent, regardless of active state", () => {
    const active = getCategoryStyle("MODELS", true);
    const inactive = getCategoryStyle("MODELS", false);
    expect(active.badgeClass).toContain("bg-accent");
    expect(inactive.badgeClass).toContain("bg-accent");
  });
});

describe("CATEGORIES", () => {
  it("lists all six categories in Figma tag order", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([
      "MODELS",
      "PRODUCTS",
      "FUNDING",
      "INDUSTRY",
      "POLICY",
      "RESEARCH",
    ]);
  });
});
```

- [ ] **Step 2: Create the Vitest config**

Create `intelligencer/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
  },
});
```

Add to `intelligencer/package.json` scripts block:

```json
"test": "vitest run"
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './categories'` (the file doesn't exist yet).

- [ ] **Step 4: Write the implementation**

Create `intelligencer/lib/categories.ts`:

```ts
import {
  Sprout,
  PackageOpen,
  WalletCards,
  Network,
  Scale,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";

export type CategoryId =
  | "MODELS"
  | "PRODUCTS"
  | "FUNDING"
  | "INDUSTRY"
  | "POLICY"
  | "RESEARCH";

export type Category = {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
};

export const CATEGORIES: Category[] = [
  { id: "MODELS", label: "Models", icon: Sprout },
  { id: "PRODUCTS", label: "Products", icon: PackageOpen },
  { id: "FUNDING", label: "Funding", icon: WalletCards },
  { id: "INDUSTRY", label: "Industry", icon: Network },
  { id: "POLICY", label: "Policy", icon: Scale },
  { id: "RESEARCH", label: "Research", icon: FlaskConical },
];

export function getCategoryStyle(
  categoryId: CategoryId,
  isActive: boolean,
): { chipClass: string; badgeClass: string } {
  const chipClass = isActive
    ? "bg-accent text-text-primary"
    : "bg-transparent text-text-secondary";

  // The in-card category badge (e.g. the "Models" pill inside the story
  // card itself) is always filled — only the filter-row chips distinguish
  // active vs. inactive. categoryId is accepted for a future per-category
  // accent variant; every category currently shares the same accent fill.
  void categoryId;
  const badgeClass = "bg-accent text-text-primary";

  return { chipClass, badgeClass };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all 4 assertions green.

- [ ] **Step 6: Commit**

```bash
git add lib/categories.ts lib/categories.test.ts vitest.config.ts package.json
git commit -m "feat: add category data and getCategoryStyle with unit tests"
```

---

### Task 4: Placeholder article data

**Files:**
- Create: `intelligencer/data/placeholder-article.ts`

**Interfaces:**
- Produces: `type Article = { category: CategoryId; headline: string; summary: string; source: string; timestamp: string; url: string }` and `placeholderArticle: Article`.

- [ ] **Step 1: Create the data file**

Create `intelligencer/data/placeholder-article.ts`:

```ts
import type { CategoryId } from "@/lib/categories";

export type Article = {
  category: CategoryId;
  headline: string;
  summary: string;
  source: string;
  timestamp: string;
  url: string;
};

export const placeholderArticle: Article = {
  category: "MODELS",
  headline: "Open-source models are moving from demos to dependable tools",
  summary:
    "Community-built models are becoming easier to run, tune, and put into everyday products. The shift is less about one breakthrough release and more about a growing ecosystem of smaller, capable systems that can be inspected and adapted.",
  source: "The Verge",
  timestamp: "18 min ago",
  url: "https://www.theverge.com/2025/3/31/24399076/open-source-ai-models",
};
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add data/placeholder-article.ts
git commit -m "feat: add placeholder article data"
```

---

### Task 5: Header and edition date bar (static)

**Files:**
- Create: `intelligencer/components/Header.tsx`
- Create: `intelligencer/components/EditionDateBar.tsx`

**Interfaces:**
- Produces: `<Header />` (no props) and `<EditionDateBar date="Thursday, August 20" />` (static display, buttons are non-functional in this phase — `type="button"` with no `onClick`, styled at full opacity, real interactivity arrives in Phase 2).

- [ ] **Step 1: Create the Header component**

Create `intelligencer/components/Header.tsx`:

```tsx
export function Header() {
  return (
    <header className="flex items-center justify-center px-6 pb-8 pt-3">
      <h1 className="text-center text-[32px] font-bold uppercase leading-10 tracking-[-1.155px] text-text-primary">
        The Intelligencer
      </h1>
    </header>
  );
}
```

- [ ] **Step 2: Create the EditionDateBar component**

Create `intelligencer/components/EditionDateBar.tsx`. The 32×32 visual button matches Figma exactly; the `p-3` wrapper around it expands the actual tap target to 44×44 per iOS Human Interface Guidelines without changing what's visible — a deliberate reconciliation between pixel-accurate Figma fidelity and HIG touch-target minimums, worth calling out in the decision log.

```tsx
import { ArrowLeft, ArrowRight } from "lucide-react";

function DateNavButton({ direction }: { direction: "prev" | "next" }) {
  const Icon = direction === "prev" ? ArrowLeft : ArrowRight;
  const label = direction === "prev" ? "Previous day" : "Next day";
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-100">
        <Icon className="h-4 w-4 text-text-accent" strokeWidth={1.5} />
      </span>
    </button>
  );
}

export function EditionDateBar({ date }: { date: string }) {
  return (
    <div className="flex items-center px-6 py-4">
      <DateNavButton direction="prev" />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-lg text-text-primary">{date}</p>
      </div>
      <DateNavButton direction="next" />
    </div>
  );
}
```

- [ ] **Step 3: Wire both into `app/page.tsx` temporarily to visually check them**

Replace `intelligencer/app/page.tsx` contents:

```tsx
import { Header } from "@/components/Header";
import { EditionDateBar } from "@/components/EditionDateBar";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-[560px] pb-10 pt-12">
      <Header />
      <EditionDateBar date="Thursday, August 20" />
    </main>
  );
}
```

- [ ] **Step 4: Visually verify against the Figma reference**

Run: `npm run dev`, open `http://localhost:3000` in a browser resized to 430px wide (or use the browser devtools device toolbar).
Expected: title reads "THE INTELLIGENCER" centered, uppercase, dark green, matching `canopy-editorial/figma-reference/intelligencer-screen.png`'s header. Date row shows two lime circular buttons with dark-green arrows flanking centered date text.

- [ ] **Step 5: Commit**

```bash
git add components/Header.tsx components/EditionDateBar.tsx app/page.tsx
git commit -m "feat: add static Header and EditionDateBar components"
```

---

### Task 6: Filter chips (static)

**Files:**
- Create: `intelligencer/components/FilterChips.tsx`
- Modify: `intelligencer/app/page.tsx`

**Interfaces:**
- Consumes: `CATEGORIES`, `getCategoryStyle` from `@/lib/categories` (Task 3).
- Produces: `<FilterChips activeCategory="ALL" | CategoryId />` — static in this phase (no click handling; Phase 2 adds `useState` and wires clicks).

- [ ] **Step 1: Create the FilterChips component**

Create `intelligencer/components/FilterChips.tsx`:

```tsx
import { Leaf } from "lucide-react";
import { CATEGORIES, getCategoryStyle, type CategoryId } from "@/lib/categories";

export function FilterChips({
  activeCategory,
}: {
  activeCategory: "ALL" | CategoryId;
}) {
  const allStyle =
    activeCategory === "ALL"
      ? "bg-accent text-text-primary"
      : "bg-transparent text-text-secondary";

  return (
    <nav
      aria-label="Filter stories by category"
      className="flex gap-2 overflow-x-auto px-6 py-6"
    >
      <button
        type="button"
        className={`flex h-[30px] shrink-0 items-center gap-1.5 rounded-md px-4 text-sm ${allStyle}`}
      >
        <Leaf className="h-3.5 w-3.5" strokeWidth={1.8} />
        All
      </button>
      {CATEGORIES.map((category) => {
        const { chipClass } = getCategoryStyle(
          category.id,
          activeCategory === category.id,
        );
        const Icon = category.icon;
        return (
          <button
            key={category.id}
            type="button"
            className={`flex h-[30px] shrink-0 items-center gap-1.5 rounded-md px-3 text-sm ${chipClass}`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
            {category.label}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Wire it into `app/page.tsx`**

Update `intelligencer/app/page.tsx`:

```tsx
import { Header } from "@/components/Header";
import { EditionDateBar } from "@/components/EditionDateBar";
import { FilterChips } from "@/components/FilterChips";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-[560px] pb-10 pt-12">
      <Header />
      <EditionDateBar date="Thursday, August 20" />
      <FilterChips activeCategory="MODELS" />
    </main>
  );
}
```

- [ ] **Step 3: Visually verify**

Run: `npm run dev`, check at 430px width.
Expected: "All" chip is plain text (not filled, since `activeCategory="MODELS"` in this test wiring), "Models" chip is lime-filled with dark text, remaining four chips (Products, Funding, Industry, Policy, Research) are plain text with no fill — matching the Figma screenshot's Tags row exactly. Row scrolls horizontally if it overflows the viewport.

- [ ] **Step 4: Commit**

```bash
git add components/FilterChips.tsx app/page.tsx
git commit -m "feat: add static FilterChips component"
```

---

### Task 7: Story card (main + stacked cards)

**Files:**
- Create: `intelligencer/components/StoryCard.tsx`
- Modify: `intelligencer/app/page.tsx`

**Interfaces:**
- Consumes: `Article` type and `getCategoryStyle` (badge fill), `CATEGORIES` (to look up the icon for the article's category).
- Produces: `<StoryCard article={Article} index={number} total={number} />` — fully static, no swipe/gesture handling (Phase 2).

- [ ] **Step 1: Create the StoryCard component**

Create `intelligencer/components/StoryCard.tsx`:

```tsx
import { ExternalLink } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import type { Article } from "@/data/placeholder-article";

const CARD_RADIUS = "rounded-[26px_26px_34px_24px]";

export function StoryCard({
  article,
  index,
  total,
}: {
  article: Article;
  index: number;
  total: number;
}) {
  const category = CATEGORIES.find((c) => c.id === article.category);
  const Icon = category?.icon;

  return (
    <div className="relative isolate min-h-[455px] px-6">
      {/* Two static rotated cards behind the main card, matching Figma's "Other" layers */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-6 top-0 h-[445px] rotate-[5.3deg] border-[0.8px] border-border-subtle bg-accent-subtle ${CARD_RADIUS}`}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-x-6 top-0 h-[445px] -rotate-[4.5deg] border-[0.8px] border-border-subtle bg-accent ${CARD_RADIUS}`}
      />

      <article
        className={`relative z-[2] flex min-h-[455px] flex-col gap-6 border-[0.8px] border-border-black bg-surface-card p-6 shadow-[0px_12px_30px_rgba(38,58,47,0.09),0px_2px_4px_rgba(38,58,47,0.05)] ${CARD_RADIUS}`}
      >
        <div className="flex items-center justify-between">
          <span className="flex h-[27px] items-center gap-1.5 rounded-md bg-accent px-4 text-xs text-text-primary">
            {Icon ? <Icon className="h-3.5 w-3.5" strokeWidth={1.8} /> : null}
            {category?.label ?? article.category}
          </span>
          <span className="text-[10px] text-text-secondary">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-4xl font-bold leading-[1.2] tracking-[-1.44px] text-text-primary">
            {article.headline}
          </h2>
          <p className="font-figtree text-base font-light leading-[1.45] tracking-[-0.13px] text-text-body">
            {article.summary}
          </p>
        </div>

        <footer className="mt-auto flex items-end justify-between gap-4 opacity-80">
          <span className="text-xs text-text-secondary">{article.timestamp}</span>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-text-accent"
          >
            {article.source}
            <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
          </a>
        </footer>
      </article>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `app/page.tsx`**

Update `intelligencer/app/page.tsx`:

```tsx
import { Header } from "@/components/Header";
import { EditionDateBar } from "@/components/EditionDateBar";
import { FilterChips } from "@/components/FilterChips";
import { StoryCard } from "@/components/StoryCard";
import { placeholderArticle } from "@/data/placeholder-article";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-[560px] pb-10 pt-12">
      <Header />
      <EditionDateBar date="Thursday, August 20" />
      <FilterChips activeCategory="MODELS" />
      <StoryCard article={placeholderArticle} index={0} total={3} />
      <p className="pt-5 text-center text-[10px] tracking-[0.2px] text-green-300">
        swipe to read more stories
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Visually verify against the Figma screenshot**

Run: `npm run dev`, view at 430px width.
Expected: matches `canopy-editorial/figma-reference/intelligencer-screen.png` — lime and sage rotated cards peeking out behind the cream main card, "Models" badge top-left, "01 / 03" counter top-right, large bold headline, body paragraph in Figtree, "18 min ago" and "The Verge ↗" in the footer, "swipe to read more stories" centered below in muted green.

- [ ] **Step 4: Commit**

```bash
git add components/StoryCard.tsx app/page.tsx
git commit -m "feat: add static StoryCard with stacked card decoration"
```

---

### Task 8: Compose the full screen and final verification

**Files:**
- Create: `intelligencer/components/IntelligencerScreen.tsx`
- Modify: `intelligencer/app/page.tsx`

**Interfaces:**
- Produces: `<IntelligencerScreen article={Article} date={string} activeCategory={"ALL" | CategoryId} index={number} total={number} />` — the single composed component `app/page.tsx` renders. This is the component Phase 2 converts to a Client Component and adds state to.

- [ ] **Step 1: Create the composed screen component**

Create `intelligencer/components/IntelligencerScreen.tsx`:

```tsx
import { Header } from "./Header";
import { EditionDateBar } from "./EditionDateBar";
import { FilterChips } from "./FilterChips";
import { StoryCard } from "./StoryCard";
import type { Article } from "@/data/placeholder-article";
import type { CategoryId } from "@/lib/categories";

export function IntelligencerScreen({
  article,
  date,
  activeCategory,
  index,
  total,
}: {
  article: Article;
  date: string;
  activeCategory: "ALL" | CategoryId;
  index: number;
  total: number;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-[560px] pb-10 pt-12">
      <Header />
      <EditionDateBar date={date} />
      <FilterChips activeCategory={activeCategory} />
      <StoryCard article={article} index={index} total={total} />
      <p className="pt-5 text-center text-[10px] tracking-[0.2px] text-green-300">
        swipe to read more stories
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Simplify `app/page.tsx` to just compose it**

Replace `intelligencer/app/page.tsx`:

```tsx
import { IntelligencerScreen } from "@/components/IntelligencerScreen";
import { placeholderArticle } from "@/data/placeholder-article";

export default function Home() {
  return (
    <IntelligencerScreen
      article={placeholderArticle}
      date="Thursday, August 20"
      activeCategory="MODELS"
      index={0}
      total={3}
    />
  );
}
```

- [ ] **Step 3: Run the full test suite and type check**

Run: `npm test && npx tsc --noEmit`
Expected: all Vitest tests pass, no TypeScript errors.

- [ ] **Step 4: Final visual verification at mobile viewport**

Run: `npm run dev`, open in a browser resized to 375×812 (iPhone-sized) and separately at 430×932.
Expected: layout holds at both widths, nothing clips or overflows horizontally, screen matches the Figma reference screenshot in structure, color, and type. Take a screenshot and compare side-by-side with `canopy-editorial/figma-reference/intelligencer-screen.png`.

- [ ] **Step 5: Update the decision log**

Create `intelligencer/docs/decision-log.md` if it doesn't exist yet, and add:

```markdown
# Decision Log

## 2026-08-25 — Phase 1: Scaffold + static screen
- Started a new Next.js (App Router) + Tailwind v4 app at `intelligencer/`, independent of the live `ai-intelligencer/` app and the `canopy-editorial/` throwaway prototype.
- Figma variables (color + spacing) adopted directly as Tailwind theme tokens. Tailwind's default spacing scale turned out to match the Figma space/* tokens exactly (both are 4px-based), so no custom spacing scale was needed.
- Type tokens (Sora/Figtree sizes, weights, tracking) are not yet real Figma variables — derived from the CSS Figma exported and applied as Tailwind utility values directly. Candidate for backporting into Figma as text styles later.
- Figma's icon layers are literally named `lucide/arrow-left` etc., confirming Lucide as the intended icon set — used `lucide-react` directly instead of hand-drawn icons.
- The 32×32 date-nav buttons are visually pixel-accurate to Figma, but wrapped in a 44×44 tap target to meet iOS HIG's minimum touch-target size without changing the visible design — first concrete "iOS-quality" decision for the portfolio narrative.
- This phase is fully static: no swipe, no working filters, no working date nav. That's Phase 2.
```

- [ ] **Step 6: Commit**

```bash
git add components/IntelligencerScreen.tsx app/page.tsx docs/decision-log.md
git commit -m "feat: compose IntelligencerScreen; Phase 1 complete"
```

---

## Self-Review Notes

- **Spec coverage:** Header ✅ (Task 5), edition date display ✅ (Task 5), six category filter chips with active-only accent fill ✅ (Task 3 + 6), story card matching Figma's Main + two stacked "Other" layers ✅ (Task 7), swipe hint copy ✅ (Task 8), design tokens (color + spacing + type) ✅ (Task 2), Lucide icons matching Figma's layer names ✅ (Task 3, 5, 6, 7), placeholder content using real sample copy rather than lorem ipsum ✅ (Task 4), decision log started ✅ (Task 8). Explicitly out of scope for this phase and deferred to later phases: swipe gesture, working filter/date-nav clicks, PWA/offline, real news API, empty/loading/all-caught-up states — none of these are silently skipped, they're named exclusions.
- **Placeholder scan:** no TBD/TODO markers; every step has runnable code.
- **Type consistency:** `Article` type defined once in `data/placeholder-article.ts` and imported everywhere else; `CategoryId` defined once in `lib/categories.ts` and imported by `data/placeholder-article.ts`, `components/FilterChips.tsx`, and `components/IntelligencerScreen.tsx` — no duplicate/renamed type definitions across tasks.
