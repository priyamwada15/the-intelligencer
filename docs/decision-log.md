# Decision Log

## 2026-08-25 — Phase 1: Scaffold + static screen
- Started a new Next.js (App Router) + Tailwind v4 app at `intelligencer/`, independent of the live `ai-intelligencer/` app and the `canopy-editorial/` throwaway prototype.
- Figma variables (color + spacing) adopted directly as Tailwind theme tokens. Tailwind's default spacing scale turned out to match the Figma space/* tokens exactly (both are 4px-based), so no custom spacing scale was needed.
- Type tokens (Sora/Figtree sizes, weights, tracking) are not yet real Figma variables — derived from the CSS Figma exported and applied as Tailwind utility values directly. Candidate for backporting into Figma as text styles later.
- Figma's icon layers are literally named `lucide/arrow-left` etc., confirming Lucide as the intended icon set — used `lucide-react` directly instead of hand-drawn icons.
- The 32×32 date-nav buttons are visually pixel-accurate to Figma, but wrapped in a 44×44 tap target to meet iOS HIG's minimum touch-target size without changing the visible design — first concrete "iOS-quality" decision for the portfolio narrative.
- This phase is fully static: no swipe, no working filters, no working date nav. That's Phase 2.
