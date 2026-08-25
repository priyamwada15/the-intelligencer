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
