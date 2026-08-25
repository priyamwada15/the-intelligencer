export type CategoryId =
  | "MODELS"
  | "PRODUCTS"
  | "FUNDING"
  | "INDUSTRY"
  | "POLICY"
  | "RESEARCH";

export type CategoryFilter = "ALL" | CategoryId;

export type Category = {
  id: CategoryId;
  label: string;
};

export const CATEGORIES: Category[] = [
  { id: "MODELS", label: "Models" },
  { id: "PRODUCTS", label: "Products" },
  { id: "FUNDING", label: "Funding" },
  { id: "INDUSTRY", label: "Industry" },
  { id: "POLICY", label: "Policy" },
  { id: "RESEARCH", label: "Research" },
];

export function getCategoryStyle(
  categoryId: CategoryFilter,
  isActive: boolean,
): { chipClass: string; badgeClass: string } {
  const chipClass = isActive
    ? "bg-accent text-text-primary"
    : "bg-transparent text-text-secondary";

  // The in-card category badge (e.g. the "Models" pill inside the story
  // card itself) is always filled — only the filter-row chips distinguish
  // active vs. inactive. categoryId is accepted for a future per-category
  // accent variant (and to allow the "All" chip to share this function);
  // every category currently shares the same accent fill.
  void categoryId;
  const badgeClass = "bg-accent text-text-primary";

  return { chipClass, badgeClass };
}
