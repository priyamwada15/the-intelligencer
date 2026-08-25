import { Leaf } from "lucide-react";
import { CATEGORIES, getCategoryStyle, type CategoryFilter } from "@/lib/categories";

export function FilterChips({
  activeCategory,
}: {
  activeCategory: CategoryFilter;
}) {
  const { chipClass: allChipClass } = getCategoryStyle(
    "ALL",
    activeCategory === "ALL",
  );

  return (
    <nav
      aria-label="Filter stories by category"
      className="flex gap-2 overflow-x-auto px-6 py-6"
    >
      <button
        type="button"
        className={`flex h-[30px] shrink-0 items-center gap-1.5 rounded-md px-4 text-label ${allChipClass}`}
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
            className={`flex h-[30px] shrink-0 items-center gap-1.5 rounded-md px-3 text-label ${chipClass}`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
            {category.label}
          </button>
        );
      })}
    </nav>
  );
}
