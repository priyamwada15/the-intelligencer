"use client";

import { motion } from "motion/react";
import { getCategoryStyle, type Category, type CategoryFilter } from "@/lib/categories";

// A shared layoutId across every chip's pill: only the active chip ever
// renders one, so Motion sees it move from wherever it used to be to its
// new chip and animates that position/size change smoothly — the sliding
// highlight effect, rather than each chip fading its own fill in and out
// independently.
const PILL_LAYOUT_ID = "active-filter-pill";

function Chip({
  categoryId,
  label,
  isActive,
  onClick,
  paddingClassName,
}: {
  categoryId: CategoryFilter;
  label: string;
  isActive: boolean;
  onClick: () => void;
  paddingClassName: string;
}) {
  const { chipClass } = getCategoryStyle(categoryId, isActive);

  return (
    // A plain button, not motion.button with `layout` — reordering the
    // whole chip list (which only happens when switching dates, since sort
    // order depends on that edition's articles) looked chaotic animated,
    // several chips all sliding past each other at once. The new order
    // should just appear, the way the rest of the page's content does when
    // an edition changes. The pill's own layoutId slide (for switching
    // filters within one edition, where nothing reorders) is unaffected.
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`relative flex h-[30px] shrink-0 items-center rounded-md text-label transition-colors duration-200 ${chipClass} ${paddingClassName}`}
    >
      {isActive && (
        <motion.span
          layoutId={PILL_LAYOUT_ID}
          className="absolute inset-0 z-0 rounded-md bg-accent"
          transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}

export function FilterChips({
  categories,
  activeCategory,
  onSelect,
}: {
  categories: Category[];
  activeCategory: CategoryFilter;
  onSelect: (category: CategoryFilter) => void;
}) {
  return (
    <nav
      aria-label="Filter stories by category"
      className="scrollbar-hide flex gap-2 overflow-x-auto px-6"
      style={{ paddingTop: "var(--pad-filters-top)", paddingBottom: "var(--pad-filters-bottom)" }}
    >
      <Chip
        categoryId="ALL"
        label="All"
        isActive={activeCategory === "ALL"}
        onClick={() => onSelect("ALL")}
        paddingClassName="px-4"
      />
      {categories.map((category) => (
        <Chip
          key={category.id}
          categoryId={category.id}
          label={category.label}
          isActive={activeCategory === category.id}
          onClick={() => onSelect(category.id)}
          paddingClassName="px-3"
        />
      ))}
    </nav>
  );
}
