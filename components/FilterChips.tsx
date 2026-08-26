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
