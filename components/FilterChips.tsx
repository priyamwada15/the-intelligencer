"use client";

import { motion } from "motion/react";
import { CATEGORIES, getCategoryStyle, type CategoryFilter } from "@/lib/categories";

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
  activeCategory,
  onSelect,
}: {
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
      {CATEGORIES.map((category) => (
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
