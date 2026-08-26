"use client";

import { useEffect } from "react";
import { useDialKit } from "dialkit";

/**
 * Dev-only panel (DialKit hides itself in production builds by default)
 * for live-tweaking the app's type scale. Each slider writes straight to
 * the CSS custom property that token compiles to in app/globals.css, so
 * every element using e.g. `text-display` updates together, live.
 *
 * Sizes found here should be copied back into app/globals.css's `@theme`
 * block once settled — this panel doesn't persist them anywhere but
 * localStorage (via `persist: true`), it's a tuning tool, not storage.
 */
export function DevTypeScaleDials() {
  const sizes = useDialKit(
    "Type scale",
    {
      display: [36, 10, 48],
      title: [32, 10, 48],
      heading: [18, 8, 32],
      body: [16, 8, 24],
      label: [14, 8, 20],
      labelSm: [12, 8, 18],
      caption: [12, 8, 18],
      micro: [10, 6, 16],
    },
    { id: "type-scale", persist: true },
  );

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--text-display", `${sizes.display}px`);
    root.setProperty("--text-title", `${sizes.title}px`);
    root.setProperty("--text-heading", `${sizes.heading}px`);
    root.setProperty("--text-body", `${sizes.body}px`);
    root.setProperty("--text-label", `${sizes.label}px`);
    root.setProperty("--text-label-sm", `${sizes.labelSm}px`);
    root.setProperty("--text-caption", `${sizes.caption}px`);
    root.setProperty("--text-micro", `${sizes.micro}px`);
  }, [
    sizes.display,
    sizes.title,
    sizes.heading,
    sizes.body,
    sizes.label,
    sizes.labelSm,
    sizes.caption,
    sizes.micro,
  ]);

  return null;
}
