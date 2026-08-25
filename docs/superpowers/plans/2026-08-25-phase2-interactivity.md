# Phase 2: Interactivity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the static Phase 1 screen fully interactive, client-side, against placeholder data: horizontal drag-to-swipe between story cards (Tinder-style), working category filter chips, and working date navigation across a small multi-day placeholder dataset. No real news API yet (that's a later phase) — this phase proves the interaction model.

**Architecture:** `IntelligencerScreen` becomes the single Client Component boundary (`"use client"`) holding all state (`dateIndex`, `activeCategory`, `cardIndex`). It composes the same four presentational components as Phase 1, now wired with callback props instead of static display. Two new pure-logic modules (`lib/swipe.ts`, `lib/editions.ts`) carry the only real logic in this phase and are the only things unit-tested — the same "thin components, tested pure functions" shape the Phase 1 final review asked for.

**Tech Stack:** Same as Phase 1 (Next.js 16 App Router, Tailwind v4, TypeScript, `lucide-react`, Vitest). No new dependencies — swipe is hand-rolled with native Pointer Events, not a gesture library, since the interaction is a single horizontal drag-with-threshold, not complex multi-touch.

## Global Constraints

- Figma file `Key5ZbWG5JqKK7gfBRZRvq` node `57:48` remains the visual source of truth — this phase adds behavior, not new visual design. No new colors, spacing, or type treatments; reuse the tokens from Phase 1.
- Interaction spec (from the product discussion this plan is built on): single card at a time; swipe is horizontal and works in either direction; no full detail screen — "Read source" opens the article in a new tab (`target="_blank"`), matching Phase 1; no need to persist/remember the last-read card across sessions for this MVP.
- Category chips: filter chips are plain text except the active one, which gets `bg-accent` fill (established in Phase 1) — that visual rule does not change, only click behavior is added.
- Tags and the in-card category badge have no icons (established in the two most recent fixes on top of Phase 1) — do not reintroduce icons anywhere in this phase.
- Voice: neutral, no editorial judgment beyond categorization — this phase adds no new copy except one minimal fallback line for an empty filtered list (see Task 6), which must stay neutral and factual, not stylized.
- Placeholder data only — the multi-day dataset added in this phase (Task 2) is explicitly throwaway, to be replaced wholesale when the real news API lands in a later phase. Do not over-invest in its structure beyond what this phase's interactions need.
- Do not build empty/loading/"all caught up" state *designs* in this phase — those are an explicitly separate, later phase. Task 6's empty-filter fallback is a minimal safety net (plain text, no new visual design) so the app doesn't break when a filter matches zero articles, not a preview of that later design work.
- Do not modify `ai-intelligencer/` or `canopy-editorial/`, or anything outside `intelligencer/`.
- Single source of truth per concept: don't duplicate filtering/clamping logic inline in a component when a tested pure function already exists for it (this was a specific finding in the Phase 1 final review — this plan is structured to avoid repeating it).

---

## File Structure

```
intelligencer/
  lib/
    swipe.ts                # NEW: resolveSwipeDirection(deltaX, thresholdPx) -> "prev" | "next" | null
    swipe.test.ts           # NEW
    editions.ts             # NEW: EDITIONS data + filterArticles() + clampIndex() pure helpers
    editions.test.ts        # NEW
  data/
    placeholder-article.ts  # DELETED in Task 6 — superseded by lib/editions.ts
  components/
    FilterChips.tsx         # MODIFY: add onSelect callback + aria-pressed
    EditionDateBar.tsx      # MODIFY: add onPrev/onNext callbacks + disabled states
    StoryCard.tsx           # MODIFY: add pointer-drag + keyboard swipe, onSwipe callback
    IntelligencerScreen.tsx # MODIFY: "use client", owns all state, no more prop-drilled article/date
  app/
    page.tsx                # MODIFY: simplified to `<IntelligencerScreen />`, no props
```

---

### Task 1: Pure swipe-direction resolver

**Files:**
- Create: `lib/swipe.ts`
- Test: `lib/swipe.test.ts`

**Interfaces:**
- Produces: `export type SwipeDirection = "prev" | "next";` and `export function resolveSwipeDirection(deltaX: number, thresholdPx?: number): SwipeDirection | null` (default threshold 80px). Positive `deltaX` (dragged right) resolves to `"prev"`; negative (dragged left) resolves to `"next"`; anything under the threshold resolves to `null` (no swipe committed). This is the only piece of swipe logic in the app — `StoryCard` (Task 5) calls it, never re-implements the threshold check inline.

- [ ] **Step 1: Write the failing test**

Create `lib/swipe.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveSwipeDirection } from "./swipe";

describe("resolveSwipeDirection", () => {
  it("returns null when the drag is under the threshold in either direction", () => {
    expect(resolveSwipeDirection(40)).toBeNull();
    expect(resolveSwipeDirection(-40)).toBeNull();
    expect(resolveSwipeDirection(0)).toBeNull();
  });

  it("returns 'next' for a leftward drag past the default threshold", () => {
    expect(resolveSwipeDirection(-120)).toBe("next");
  });

  it("returns 'prev' for a rightward drag past the default threshold", () => {
    expect(resolveSwipeDirection(120)).toBe("prev");
  });

  it("respects a custom threshold", () => {
    expect(resolveSwipeDirection(50, 100)).toBeNull();
    expect(resolveSwipeDirection(150, 100)).toBe("prev");
    expect(resolveSwipeDirection(-150, 100)).toBe("next");
  });

  it("treats the threshold as exclusive (exactly-at-threshold does not commit)", () => {
    expect(resolveSwipeDirection(80)).toBeNull();
    expect(resolveSwipeDirection(-80)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- swipe`
Expected: FAIL — `Cannot find module './swipe'`.

- [ ] **Step 3: Write the implementation**

Create `lib/swipe.ts`:

```ts
export type SwipeDirection = "prev" | "next";

const DEFAULT_THRESHOLD_PX = 80;

export function resolveSwipeDirection(
  deltaX: number,
  thresholdPx: number = DEFAULT_THRESHOLD_PX,
): SwipeDirection | null {
  if (Math.abs(deltaX) <= thresholdPx) return null;
  return deltaX < 0 ? "next" : "prev";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- swipe`
Expected: PASS — all 5 assertions green.

- [ ] **Step 5: Commit**

```bash
git add lib/swipe.ts lib/swipe.test.ts
git commit -m "feat: add pure swipe-direction resolver with unit tests"
```

---

### Task 2: Placeholder multi-day edition data + pure filter/clamp helpers

**Files:**
- Create: `lib/editions.ts`
- Test: `lib/editions.test.ts`

**Interfaces:**
- Consumes: `Article` from `@/lib/article`, `CategoryFilter` from `@/lib/categories`.
- Produces:
  - `type Edition = { date: string; label: string; articles: Article[] }`
  - `EDITIONS: Edition[]` — 3 editions (Thursday/Wednesday/Tuesday), reusing the same real sample article copy already established earlier in this project's design work (not new invented content).
  - `function filterArticles(edition: Edition, category: CategoryFilter): Article[]` — pure, no side effects.
  - `function clampIndex(index: number, length: number): number` — pure; returns `0` when `length` is `0` (the empty-list case Task 6's UI handles separately).
  - This is the only place filtering/clamping logic lives — `IntelligencerScreen` (Task 6) calls these, never re-derives the filtered list or clamps an index inline.

- [ ] **Step 1: Write the failing tests**

Create `lib/editions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { EDITIONS, filterArticles, clampIndex } from "./editions";

describe("EDITIONS", () => {
  it("has three editions in newest-first order", () => {
    expect(EDITIONS.map((e) => e.date)).toEqual([
      "Thursday, August 20",
      "Wednesday, August 19",
      "Tuesday, August 18",
    ]);
  });

  it("every article belongs to one of the six known categories", () => {
    const validCategories = new Set([
      "MODELS",
      "PRODUCTS",
      "FUNDING",
      "INDUSTRY",
      "POLICY",
      "RESEARCH",
    ]);
    for (const edition of EDITIONS) {
      for (const article of edition.articles) {
        expect(validCategories.has(article.category)).toBe(true);
      }
    }
  });
});

describe("filterArticles", () => {
  const edition = EDITIONS[0];

  it("returns every article when the filter is ALL", () => {
    expect(filterArticles(edition, "ALL")).toEqual(edition.articles);
  });

  it("returns only articles matching the given category", () => {
    const result = filterArticles(edition, "MODELS");
    expect(result.length).toBeGreaterThan(0);
    for (const article of result) {
      expect(article.category).toBe("MODELS");
    }
  });

  it("returns an empty array when no article matches", () => {
    // Tuesday's edition (EDITIONS[2]) has no FUNDING article in the sample data.
    expect(filterArticles(EDITIONS[2], "FUNDING")).toEqual([]);
  });
});

describe("clampIndex", () => {
  it("clamps a negative index to 0", () => {
    expect(clampIndex(-3, 5)).toBe(0);
  });

  it("clamps an index past the end to the last valid index", () => {
    expect(clampIndex(10, 5)).toBe(4);
  });

  it("leaves an in-range index unchanged", () => {
    expect(clampIndex(2, 5)).toBe(2);
  });

  it("returns 0 for a zero-length list", () => {
    expect(clampIndex(0, 0)).toBe(0);
    expect(clampIndex(3, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- editions`
Expected: FAIL — `Cannot find module './editions'`.

- [ ] **Step 3: Write the implementation**

Create `lib/editions.ts`:

```ts
import type { Article } from "@/lib/article";
import type { CategoryFilter } from "@/lib/categories";

export type Edition = {
  date: string;
  label: string;
  articles: Article[];
};

export const EDITIONS: Edition[] = [
  {
    date: "Thursday, August 20",
    label: "Today's edition",
    articles: [
      {
        category: "MODELS",
        headline: "Open-source models are moving from demos to dependable tools",
        summary:
          "Community-built models are becoming easier to run, tune, and put into everyday products. The shift is less about one breakthrough release and more about a growing ecosystem of smaller, capable systems that can be inspected and adapted.",
        source: "The Verge",
        timestamp: "18 min ago",
        url: "https://www.theverge.com/2025/3/31/24399076/open-source-ai-models",
      },
      {
        category: "RESEARCH",
        headline: "A new benchmark asks whether AI can explain its own uncertainty",
        summary:
          "Researchers are testing models on whether their confidence tracks their actual accuracy. The work may give teams a clearer way to decide when a model should answer, ask for help, or stay quiet.",
        source: "Nature",
        timestamp: "42 min ago",
        url: "https://www.nature.com/",
      },
      {
        category: "PRODUCTS",
        headline: "Small teams are building slower, more legible AI products",
        summary:
          "A group of new tools puts controls, source context, and clear hand-offs next to their generated output. The pattern points toward AI being used as a visible part of a workflow rather than a hidden replacement for it.",
        source: "Wired",
        timestamp: "1 hr ago",
        url: "https://www.wired.com/",
      },
    ],
  },
  {
    date: "Wednesday, August 19",
    label: "Yesterday's edition",
    articles: [
      {
        category: "FUNDING",
        headline: "AI infrastructure spending is spreading beyond the largest labs",
        summary:
          "New investments are reaching regional providers and specialized compute companies. Analysts say the pattern could broaden access, though energy demand and long-term utilization remain open questions.",
        source: "Financial Times",
        timestamp: "Yesterday",
        url: "https://www.ft.com/",
      },
      {
        category: "POLICY",
        headline: "Regulators are narrowing in on how training data is documented",
        summary:
          "Policy proposals in several markets focus on disclosure and record-keeping rather than a single definition of acceptable training data. Companies are preparing for more detailed reporting requirements.",
        source: "Reuters",
        timestamp: "Yesterday",
        url: "https://www.reuters.com/technology/",
      },
    ],
  },
  {
    date: "Tuesday, August 18",
    label: "Tuesday's edition",
    articles: [
      {
        category: "INDUSTRY",
        headline: "The AI hiring market is making room for translators and operators",
        summary:
          "Recent roles show companies looking for people who can connect model capabilities to specific domains. The demand suggests implementation and judgment are becoming as important as model access.",
        source: "The Information",
        timestamp: "2 days ago",
        url: "https://www.theinformation.com/",
      },
      {
        category: "MODELS",
        headline: "Smaller language models are finding a place beside the frontier",
        summary:
          "Teams are choosing compact models for tasks where speed, cost, or local control matters more than maximum benchmark scores. The approach is producing more varied model stacks inside a single product.",
        source: "MIT Technology Review",
        timestamp: "2 days ago",
        url: "https://www.technologyreview.com/",
      },
    ],
  },
];

export function filterArticles(edition: Edition, category: CategoryFilter): Article[] {
  return category === "ALL"
    ? edition.articles
    : edition.articles.filter((article) => article.category === category);
}

export function clampIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- editions`
Expected: PASS — all 9 assertions green.

- [ ] **Step 5: Commit**

```bash
git add lib/editions.ts lib/editions.test.ts
git commit -m "feat: add placeholder multi-day editions with pure filter/clamp helpers"
```

---

### Task 3: FilterChips becomes interactive

**Files:**
- Modify: `components/FilterChips.tsx`

**Interfaces:**
- Consumes: no new imports beyond what Task 3 changes below add.
- Produces: `<FilterChips activeCategory={CategoryFilter} onSelect={(category: CategoryFilter) => void} />` — clicking a chip calls `onSelect` with that chip's id (or `"ALL"`). Each chip carries `aria-pressed` reflecting whether it's the active one (addresses the WCAG color-only-state concern noted in the Phase 1 final review, now that there's a real interaction to attach it to).

- [ ] **Step 1: Replace `components/FilterChips.tsx`**

```tsx
import { CATEGORIES, getCategoryStyle, type CategoryFilter } from "@/lib/categories";

export function FilterChips({
  activeCategory,
  onSelect,
}: {
  activeCategory: CategoryFilter;
  onSelect: (category: CategoryFilter) => void;
}) {
  const { chipClass: allChipClass } = getCategoryStyle("ALL", activeCategory === "ALL");

  return (
    <nav
      aria-label="Filter stories by category"
      className="flex gap-2 overflow-x-auto px-6 py-6"
    >
      <button
        type="button"
        aria-pressed={activeCategory === "ALL"}
        onClick={() => onSelect("ALL")}
        className={`flex h-[30px] shrink-0 items-center rounded-md px-4 text-label ${allChipClass}`}
      >
        All
      </button>
      {CATEGORIES.map((category) => {
        const isActive = activeCategory === category.id;
        const { chipClass } = getCategoryStyle(category.id, isActive);
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(category.id)}
            className={`flex h-[30px] shrink-0 items-center rounded-md px-3 text-label ${chipClass}`}
          >
            {category.label}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Verify it still type-checks**

Run: `npx tsc --noEmit`
Expected: errors in `app/page.tsx` and `components/IntelligencerScreen.tsx` about a missing `onSelect` prop — **expected and correct** at this point in the plan, since those are fixed in Task 6. Confirm the *only* errors are about the not-yet-updated call sites, not about `FilterChips.tsx` itself.

- [ ] **Step 3: Commit**

```bash
git add components/FilterChips.tsx
git commit -m "feat: wire FilterChips click handling and aria-pressed"
```

---

### Task 4: EditionDateBar becomes interactive

**Files:**
- Modify: `components/EditionDateBar.tsx`

**Interfaces:**
- Produces: `<EditionDateBar date={string} onPrev={() => void} onNext={() => void} prevDisabled={boolean} nextDisabled={boolean} />`. Native `disabled` attribute is used directly (this is real React/DOM, not a templating engine — no boolean-attribute quirks to work around here).

- [ ] **Step 1: Replace `components/EditionDateBar.tsx`**

```tsx
import { ArrowLeft, ArrowRight } from "lucide-react";

function DateNavButton({
  direction,
  onClick,
  disabled,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = direction === "prev" ? ArrowLeft : ArrowRight;
  const label = direction === "prev" ? "Previous day" : "Next day";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center disabled:opacity-30"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-lime">
        <Icon className="h-4 w-4 text-text-accent" strokeWidth={1.5} />
      </span>
    </button>
  );
}

export function EditionDateBar({
  date,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: {
  date: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
}) {
  return (
    <div className="flex items-center px-6 py-4">
      <DateNavButton direction="prev" onClick={onPrev} disabled={prevDisabled} />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-heading text-text-primary">{date}</p>
      </div>
      <DateNavButton direction="next" onClick={onNext} disabled={nextDisabled} />
    </div>
  );
}
```

- [ ] **Step 2: Verify it still type-checks**

Run: `npx tsc --noEmit`
Expected: errors only in `app/page.tsx` / `IntelligencerScreen.tsx` about missing props (same expected state as Task 3, not yet fixed until Task 6).

- [ ] **Step 3: Commit**

```bash
git add components/EditionDateBar.tsx
git commit -m "feat: wire EditionDateBar prev/next handling and disabled states"
```

---

### Task 5: StoryCard becomes swipeable

**Files:**
- Modify: `components/StoryCard.tsx`

**Interfaces:**
- Consumes: `resolveSwipeDirection`, `type SwipeDirection` from `@/lib/swipe` (Task 1).
- Produces: `<StoryCard article={Article} index={number} total={number} onSwipe={(direction: SwipeDirection) => void} />`. Dragging the card (mouse or touch, via Pointer Events) past an 80px horizontal threshold calls `onSwipe("next")` (dragged left) or `onSwipe("prev")` (dragged right); under the threshold, the card springs back to center. ArrowLeft/ArrowRight keys on the focused card do the same via keyboard, since the design has no visible prev/next buttons for stories (swipe-only) and keyboard parity is needed for anyone who can't perform a drag gesture.

- [ ] **Step 1: Replace `components/StoryCard.tsx`**

```tsx
"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ExternalLink } from "lucide-react";
import { CATEGORIES, getCategoryStyle } from "@/lib/categories";
import { resolveSwipeDirection, type SwipeDirection } from "@/lib/swipe";
import type { Article } from "@/lib/article";

const CARD_RADIUS = "rounded-[26px_26px_34px_24px]";
const SWIPE_THRESHOLD_PX = 80;

export function StoryCard({
  article,
  index,
  total,
  onSwipe,
}: {
  article: Article;
  index: number;
  total: number;
  onSwipe: (direction: SwipeDirection) => void;
}) {
  const category = CATEGORIES.find((c) => c.id === article.category);
  const { badgeClass } = getCategoryStyle(article.category, true);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartX = useRef<number | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    pointerStartX.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (pointerStartX.current === null) return;
    setDragX(event.clientX - pointerStartX.current);
  };

  const commitOrReset = (deltaX: number) => {
    pointerStartX.current = null;
    setIsDragging(false);
    const direction = resolveSwipeDirection(deltaX, SWIPE_THRESHOLD_PX);
    if (direction) {
      onSwipe(direction);
    }
    setDragX(0);
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    if (pointerStartX.current === null) return;
    commitOrReset(event.clientX - pointerStartX.current);
  };

  const handlePointerCancel = () => {
    if (pointerStartX.current === null) return;
    commitOrReset(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") onSwipe("prev");
    if (event.key === "ArrowRight") onSwipe("next");
  };

  return (
    <div className="relative isolate min-h-[455px] px-6">
      {/* Two static rotated cards behind the main card, matching Figma's "Other" layers */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-6 inset-y-0 rotate-[5.3deg] border-[0.8px] border-border-subtle bg-accent-subtle ${CARD_RADIUS}`}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-x-6 inset-y-0 -rotate-[4.5deg] border-[0.8px] border-border-subtle bg-accent ${CARD_RADIUS}`}
      />

      <article
        tabIndex={0}
        role="group"
        aria-roledescription="story card"
        aria-label={`Story ${index + 1} of ${total}: ${article.headline}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        style={{
          transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
          touchAction: "pan-y",
        }}
        className={`relative z-[2] flex min-h-[455px] cursor-grab flex-col gap-6 border-[0.8px] border-border-black bg-surface-card p-6 shadow-[0px_12px_30px_rgba(38,58,47,0.09),0px_2px_4px_rgba(38,58,47,0.05)] outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-text-accent ${CARD_RADIUS}`}
      >
        <div className="flex items-center justify-between">
          <span className={`flex h-[27px] items-center rounded-md px-4 text-label-sm ${badgeClass}`}>
            {category?.label ?? article.category}
          </span>
          <span className="text-micro text-text-secondary">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-display font-bold text-text-primary">{article.headline}</h2>
          <p className="font-figtree text-body font-light text-text-body">{article.summary}</p>
        </div>

        <footer className="mt-auto flex items-end justify-between gap-4 opacity-80">
          <span className="text-caption text-text-secondary">{article.timestamp}</span>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-caption text-text-accent"
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

Note: `"use client"` is added here even though `StoryCard` will only ever be rendered from inside the client boundary established in Task 6 (`IntelligencerScreen`) — being explicit on every file that uses hooks avoids ambiguity about the server/client boundary as the codebase grows.

- [ ] **Step 2: Verify it still type-checks**

Run: `npx tsc --noEmit`
Expected: errors only in `app/page.tsx` / `IntelligencerScreen.tsx` about the now-required `onSwipe` prop (fixed in Task 6).

- [ ] **Step 3: Commit**

```bash
git add components/StoryCard.tsx
git commit -m "feat: add pointer-drag and keyboard swipe to StoryCard"
```

---

### Task 6: Wire IntelligencerScreen as a Client Component; update page.tsx; remove superseded placeholder data

**Files:**
- Modify: `components/IntelligencerScreen.tsx`
- Modify: `app/page.tsx`
- Delete: `data/placeholder-article.ts`

**Interfaces:**
- Consumes: `EDITIONS`, `filterArticles`, `clampIndex` from `@/lib/editions` (Task 2); `type SwipeDirection` from `@/lib/swipe` (Task 1); all four child components' new prop signatures from Tasks 3-5.
- Produces: `<IntelligencerScreen />` — takes **no props**. It owns `dateIndex`, `activeCategory`, `cardIndex` as internal state. This is the last task that changes the public shape of anything in this phase.

- [ ] **Step 1: Replace `components/IntelligencerScreen.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Header } from "./Header";
import { EditionDateBar } from "./EditionDateBar";
import { FilterChips } from "./FilterChips";
import { StoryCard } from "./StoryCard";
import { EDITIONS, filterArticles, clampIndex } from "@/lib/editions";
import type { CategoryFilter } from "@/lib/categories";
import type { SwipeDirection } from "@/lib/swipe";

export function IntelligencerScreen() {
  const [dateIndex, setDateIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [cardIndex, setCardIndex] = useState(0);

  const edition = EDITIONS[dateIndex];
  const articles = filterArticles(edition, activeCategory);
  const safeIndex = clampIndex(cardIndex, articles.length);
  const activeArticle = articles[safeIndex];

  const handleSelectCategory = (category: CategoryFilter) => {
    setActiveCategory(category);
    setCardIndex(0);
  };

  const handlePrevDate = () => {
    setDateIndex((current) => Math.min(EDITIONS.length - 1, current + 1));
    setActiveCategory("ALL");
    setCardIndex(0);
  };

  const handleNextDate = () => {
    setDateIndex((current) => Math.max(0, current - 1));
    setActiveCategory("ALL");
    setCardIndex(0);
  };

  const handleSwipe = (direction: SwipeDirection) => {
    setCardIndex((current) => clampIndex(direction === "next" ? current + 1 : current - 1, articles.length));
  };

  return (
    <main className="mx-auto min-h-screen max-w-[560px] overflow-x-hidden pb-10 pt-12">
      <Header />
      <EditionDateBar
        date={edition.date}
        onPrev={handlePrevDate}
        onNext={handleNextDate}
        prevDisabled={dateIndex === EDITIONS.length - 1}
        nextDisabled={dateIndex === 0}
      />
      <FilterChips activeCategory={activeCategory} onSelect={handleSelectCategory} />
      {activeArticle ? (
        <StoryCard
          article={activeArticle}
          index={safeIndex}
          total={articles.length}
          onSwipe={handleSwipe}
        />
      ) : (
        <p className="px-6 py-16 text-center text-body text-text-secondary">
          No stories in this category for this edition.
        </p>
      )}
      <p className="pt-5 text-center text-micro tracking-[0.2px] text-text-muted">
        swipe to read more stories
      </p>
    </main>
  );
}
```

(The `{activeArticle ? ... : ...}` fallback is a minimal safety net for a filter that matches zero articles — plain text, no icon, no illustration. It is explicitly not the designed empty state from the product roadmap; that is separate, later work.)

- [ ] **Step 2: Replace `app/page.tsx`**

```tsx
import { IntelligencerScreen } from "@/components/IntelligencerScreen";

export default function Home() {
  return <IntelligencerScreen />;
}
```

- [ ] **Step 3: Delete the superseded placeholder data file**

```bash
git rm data/placeholder-article.ts
```

(Its `Article` type re-export is no longer needed by anything — every remaining consumer already imports `Article` from `@/lib/article` directly, established in the Phase 1 final-review fix wave.)

- [ ] **Step 4: Run the full test suite and type check**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all tests pass (should be 4 original + 5 swipe + 9 editions = 18 total), zero type errors, lint clean.

- [ ] **Step 5: Commit**

```bash
git add components/IntelligencerScreen.tsx app/page.tsx
git commit -m "feat: wire IntelligencerScreen as client component with full interactivity"
```

---

### Task 7: Manual verification pass and decision log update

**Files:**
- Modify: `docs/decision-log.md`

**Interfaces:** none — this task is verification and documentation only.

- [ ] **Step 1: Run the dev server and manually verify every interaction**

Run: `npm run dev`, open in a browser at 375×812 and 430×932. Check each of the following and note the result:

1. **Filter chips**: click each of the 7 chips (All + 6 categories) in turn. Confirm the active chip visually fills with accent color, the story card updates to show the first matching article, and the counter (`0X / 0Y`) reflects the filtered count, not the full edition's count.
2. **Category with zero matches**: on Thursday's edition, click a category with no articles (e.g. Industry — check against `lib/editions.ts`'s Thursday list) and confirm the plain-text fallback renders instead of a broken/blank card.
3. **Date navigation**: click the next/previous day arrows. Confirm the date text changes, the category filter resets to "All", the card resets to the first story, and the arrow disables (visually dimmed, unclickable) at both ends of the 3-edition range.
4. **Swipe via mouse drag**: click-and-drag the card left past ~80px and release — confirm it advances to the next story and the counter increments. Drag right past ~80px — confirm it goes back. Drag less than 80px and release — confirm it springs back to the same story.
5. **Swipe boundaries**: on the last story in a filtered list, drag left past the threshold — confirm it does not go out of bounds (stays on the last story, no crash). Same for dragging right past the threshold on the first story.
6. **Keyboard**: click/tab to focus the card (confirm a visible focus ring appears), then press the right and left arrow keys — confirm they move between stories the same way swiping does.
7. **"Read source" still works**: click the source link/external-link icon in the footer **without dragging** — confirm it opens the article URL in a new tab rather than being swallowed by the drag handlers.
8. **No horizontal page overflow**: at both viewport widths, confirm dragging the card never produces a horizontal scrollbar on the page itself (only the card should move, not the page).

If any of these fail, fix before proceeding — do not move to Step 2 with a known-broken interaction.

- [ ] **Step 2: Update the decision log**

Append to `docs/decision-log.md`:

```markdown
## 2026-08-25 — Phase 2: Interactivity
- `IntelligencerScreen` is now the app's single Client Component boundary; all state (date, filter, card position) lives there. The four presentational components (Header, EditionDateBar, FilterChips, StoryCard) stay prop-driven — Header remains a pure Server Component, the other three are implicitly part of the client bundle by virtue of being imported from a `"use client"` module, without needing their own directive (StoryCard got one anyway, explicitly, since it owns hook state).
- Swipe is hand-rolled with native Pointer Events and a single pure function (`lib/swipe.ts`'s `resolveSwipeDirection`) rather than a gesture library — the interaction is a single horizontal drag-with-threshold, which doesn't need a dependency.
- Filtering and index-clamping logic live in `lib/editions.ts` as pure, unit-tested functions rather than inline in the component — a direct response to the Phase 1 final review's finding that untested inline logic in a client component is a recurring risk as the app grows.
- The multi-day placeholder dataset (3 editions, `lib/editions.ts`) is explicitly throwaway scaffolding to exercise date navigation before the real news API lands — it reuses sample copy already established earlier in the project's design work rather than inventing new placeholder content.
- Date navigation resets the category filter and card position; category filtering resets only the card position. This matches the mental model of "date is the outermost scope, category narrows within it."
- A minimal plain-text fallback handles a filter matching zero articles (necessary so the app doesn't crash on a reachable UI state) — this is not the designed empty state from the product roadmap, which remains separate, later work.
- Keyboard (arrow keys) mirrors the swipe gesture since the Figma design has no visible prev/next story buttons — swipe-only interactions need a non-gesture equivalent for anyone who can't perform a drag.
```

- [ ] **Step 3: Commit**

```bash
git add docs/decision-log.md
git commit -m "docs: record Phase 2 interactivity decisions"
```

---

## Self-Review Notes

- **Spec coverage:** swipe (horizontal, either direction, threshold-based) ✅ Task 5; category filtering (functional, resets card position) ✅ Task 3 + 6; date navigation (functional, across placeholder multi-day data, resets filter + card position, disables at boundaries) ✅ Task 4 + 6; "Read source" opens externally, unaffected by drag ✅ Task 5 + verified in Task 7; no full detail screen ✅ (nothing added that resembles one); no read-position persistence ✅ (state is in-memory `useState`, resets on reload — matches "no need to remember for MVP"); neutral voice maintained ✅ (only new copy is the neutral empty-filter fallback line). Explicitly out of scope and named as such: designed empty/loading/all-caught-up states (separate later phase), real news API (separate later phase), any new visual/token changes (none needed this phase).
- **Placeholder scan:** no TBD/TODO markers; every step has runnable code; the empty-filter fallback is real, minimal, working code, not a stub.
- **Type consistency:** `SwipeDirection` defined once in `lib/swipe.ts`, imported by `StoryCard.tsx` and `IntelligencerScreen.tsx`. `Edition`, `filterArticles`, `clampIndex` defined once in `lib/editions.ts`, imported only by `IntelligencerScreen.tsx` (the sole consumer). `CategoryFilter` (from Phase 1) is reused as-is, not redefined. No component redefines a prop type that already exists elsewhere.
