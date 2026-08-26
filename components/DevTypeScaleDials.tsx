"use client";

import { useEffect, useRef } from "react";
import { useDialKitController } from "dialkit";
import type { TypeScaleValues } from "@/app/api/dial-sync/route";

const SYNC_ENDPOINT = "/api/dial-sync";

const DEFAULTS: Record<keyof TypeScaleValues, [number, number, number]> = {
  display: [28, 10, 48],
  title: [36, 10, 48],
  heading: [16, 8, 32],
  body: [15, 8, 24],
  label: [12, 8, 20],
  labelSm: [12, 8, 18],
  caption: [10, 8, 18],
  micro: [10, 6, 16],
};

function applyCssVars(values: TypeScaleValues) {
  const root = document.documentElement.style;
  root.setProperty("--text-display", `${values.display}px`);
  root.setProperty("--text-title", `${values.title}px`);
  root.setProperty("--text-heading", `${values.heading}px`);
  root.setProperty("--text-body", `${values.body}px`);
  root.setProperty("--text-label", `${values.label}px`);
  root.setProperty("--text-label-sm", `${values.labelSm}px`);
  root.setProperty("--text-caption", `${values.caption}px`);
  root.setProperty("--text-micro", `${values.micro}px`);
}

/**
 * Dev-only panel (DialKit hides itself in production builds by default)
 * for live-tweaking the app's type scale. Each slider writes straight to
 * the CSS custom property that token compiles to in app/globals.css, so
 * every element using e.g. `text-display` updates together, live — and
 * broadcasts over SSE (app/api/dial-sync) so every other device viewing
 * the app on the same network (e.g. a phone) updates too, automatically.
 *
 * A "Reset to defaults" action button lives in the panel itself and
 * discards any changes, local and synced.
 *
 * Sizes found here should be copied back into app/globals.css's `@theme`
 * block once settled — this panel doesn't persist them anywhere but
 * localStorage (via `persist: true`) and this dev server's memory, it's a
 * tuning tool, not storage.
 */
export function DevTypeScaleDials() {
  const dial = useDialKitController(
    "Type scale",
    {
      ...DEFAULTS,
      reset: { type: "action", label: "Reset to defaults" },
    },
    {
      id: "type-scale",
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
  // from another device unconditionally. (Skipping this when the
  // incoming values already matched `dialRef.current.values` was tried
  // and removed: that comparison races against React's render/effect
  // cycle when two messages arrive close together — `dialRef` may not
  // yet reflect the first message's update when the second one is
  // checked, causing the second update to be wrongly treated as a
  // no-op and dropped. Always applying is a harmless redundant
  // `setValues` call at worst, never a lost update.)
  useEffect(() => {
    const source = new EventSource(SYNC_ENDPOINT);
    source.onmessage = (event) => {
      let remoteValues: TypeScaleValues;
      try {
        remoteValues = JSON.parse(event.data) as TypeScaleValues;
      } catch {
        return;
      }
      isApplyingRemoteRef.current = true;
      dialRef.current.setValues(remoteValues);
    };
    return () => source.close();
  }, []);

  // Destructured up front so the effect below can list exactly these
  // primitives as its dependencies without also touching `dial.values`
  // (the object) inside the effect body.
  const { display, title, heading, body, label, labelSm, caption, micro } = dial.values;

  // Apply CSS vars on every value change, and broadcast local edits
  // (but not ones we just received) to every other connected device.
  useEffect(() => {
    const values: TypeScaleValues = { display, title, heading, body, label, labelSm, caption, micro };
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
  }, [display, title, heading, body, label, labelSm, caption, micro]);

  return null;
}
