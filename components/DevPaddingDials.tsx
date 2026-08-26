"use client";

import { useEffect, useRef } from "react";
import { useDialKitController } from "dialkit";
import type { PaddingValues } from "@/app/api/padding-sync/route";

const SYNC_ENDPOINT = "/api/padding-sync";

type Range = [number, number, number];

const DEFAULTS: {
  screen: { top: Range; bottom: Range };
  header: { top: Range; bottom: Range };
  dateBar: { top: Range; bottom: Range };
  filters: { top: Range; bottom: Range };
  card: { top: Range; bottom: Range };
} = {
  screen: { top: [24, 0, 96], bottom: [40, 0, 96] },
  header: { top: [12, 0, 64], bottom: [16, 0, 64] },
  dateBar: { top: [16, 0, 48], bottom: [8, 0, 48] },
  filters: { top: [8, 0, 48], bottom: [48, 0, 48] },
  card: { top: [24, 0, 64], bottom: [24, 0, 64] },
};

function toRemoteShape(values: PaddingValues) {
  return {
    screen: { top: values.screenTop, bottom: values.screenBottom },
    header: { top: values.headerTop, bottom: values.headerBottom },
    dateBar: { top: values.dateBarTop, bottom: values.dateBarBottom },
    filters: { top: values.filtersTop, bottom: values.filtersBottom },
    card: { top: values.cardTop, bottom: values.cardBottom },
  };
}

function applyCssVars(values: PaddingValues) {
  const root = document.documentElement.style;
  root.setProperty("--pad-screen-top", `${values.screenTop}px`);
  root.setProperty("--pad-screen-bottom", `${values.screenBottom}px`);
  root.setProperty("--pad-header-top", `${values.headerTop}px`);
  root.setProperty("--pad-header-bottom", `${values.headerBottom}px`);
  root.setProperty("--pad-datebar-top", `${values.dateBarTop}px`);
  root.setProperty("--pad-datebar-bottom", `${values.dateBarBottom}px`);
  root.setProperty("--pad-filters-top", `${values.filtersTop}px`);
  root.setProperty("--pad-filters-bottom", `${values.filtersBottom}px`);
  root.setProperty("--pad-card-top", `${values.cardTop}px`);
  root.setProperty("--pad-card-bottom", `${values.cardBottom}px`);
}

/**
 * Dev-only panel (DialKit hides itself in production builds by default)
 * for live-tweaking vertical spacing on the five main layout sections:
 * the screen's outer top/bottom padding, the masthead, the date bar, the
 * filter row, and the story card. Deliberately top/bottom only — no
 * horizontal padding controls, per the current tuning pass's scope.
 *
 * Each slider writes to a CSS custom property that the corresponding
 * component reads via an inline style (see components/Header.tsx,
 * EditionDateBar.tsx, FilterChips.tsx, StoryCard.tsx, and
 * IntelligencerScreen.tsx's <main>), and broadcasts over SSE
 * (app/api/padding-sync) so every other device viewing the app on the
 * same network updates too, automatically.
 *
 * A "Reset to defaults" action button lives in the panel itself.
 *
 * Values found here should be copied back into app/globals.css's
 * `:root` block once settled — this panel doesn't persist them anywhere
 * but localStorage (via `persist: true`) and this dev server's memory,
 * it's a tuning tool, not storage.
 */
export function DevPaddingDials() {
  const dial = useDialKitController(
    "Padding",
    {
      ...DEFAULTS,
      reset: { type: "action", label: "Reset to defaults" },
    },
    {
      id: "padding",
      persist: true,
      onAction: (path) => {
        if (path === "reset") {
          dialRef.current.resetValues();
        }
      },
    },
  );

  // Always-fresh ref so the mount-once SSE effect below never needs `dial`
  // in its dependency array (its identity isn't guaranteed stable).
  const dialRef = useRef(dial);
  useEffect(() => {
    dialRef.current = dial;
  });

  // Track whether the current `dial.values` change originated from a
  // remote SSE message, so the broadcast effect doesn't echo it straight
  // back to the server (which would just bounce it to every other client
  // again, forever).
  const isApplyingRemoteRef = useRef(false);

  // Subscribe once to the sync channel; apply every value that arrives
  // from another device unconditionally (see components/DevTypeScaleDials'
  // git history for why a "skip if already equal" check on receipt was
  // tried and removed — it races against React's render/effect cycle).
  useEffect(() => {
    const source = new EventSource(SYNC_ENDPOINT);
    source.onmessage = (event) => {
      let remoteValues: PaddingValues;
      try {
        remoteValues = JSON.parse(event.data) as PaddingValues;
      } catch {
        return;
      }
      isApplyingRemoteRef.current = true;
      dialRef.current.setValues(toRemoteShape(remoteValues));
    };
    return () => source.close();
  }, []);

  // Destructured up front so the effect below can list exactly these
  // primitives as its dependencies without also touching `dial.values`
  // (the object) inside the effect body.
  const {
    screen: { top: screenTop, bottom: screenBottom },
    header: { top: headerTop, bottom: headerBottom },
    dateBar: { top: dateBarTop, bottom: dateBarBottom },
    filters: { top: filtersTop, bottom: filtersBottom },
    card: { top: cardTop, bottom: cardBottom },
  } = dial.values;

  // Apply CSS vars on every value change, and broadcast local edits
  // (but not ones we just received) to every other connected device.
  useEffect(() => {
    const values: PaddingValues = {
      screenTop,
      screenBottom,
      headerTop,
      headerBottom,
      dateBarTop,
      dateBarBottom,
      filtersTop,
      filtersBottom,
      cardTop,
      cardBottom,
    };
    applyCssVars(values);

    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      return;
    }

    fetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).catch(() => {
      // Best-effort — a dropped sync POST just means other devices
      // won't see this particular change; it's still applied locally.
    });
  }, [
    screenTop,
    screenBottom,
    headerTop,
    headerBottom,
    dateBarTop,
    dateBarBottom,
    filtersTop,
    filtersBottom,
    cardTop,
    cardBottom,
  ]);

  return null;
}
