import {
  Sprout,
  PackageOpen,
  WalletCards,
  Network,
  Scale,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";

export type CategoryId =
  | "MODELS"
  | "PRODUCTS"
  | "FUNDING"
  | "INDUSTRY"
  | "POLICY"
  | "RESEARCH";

export type Category = {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
};

export const CATEGORIES: Category[] = [
  { id: "MODELS", label: "Models", icon: Sprout },
  { id: "PRODUCTS", label: "Products", icon: PackageOpen },
  { id: "FUNDING", label: "Funding", icon: WalletCards },
  { id: "INDUSTRY", label: "Industry", icon: Network },
  { id: "POLICY", label: "Policy", icon: Scale },
  { id: "RESEARCH", label: "Research", icon: FlaskConical },
];

export function getCategoryStyle(
  categoryId: CategoryId,
  isActive: boolean,
): { chipClass: string; badgeClass: string } {
  const chipClass = isActive
    ? "bg-accent text-text-primary"
    : "bg-transparent text-text-secondary";

  // The in-card category badge (e.g. the "Models" pill inside the story
  // card itself) is always filled — only the filter-row chips distinguish
  // active vs. inactive. categoryId is accepted for a future per-category
  // accent variant; every category currently shares the same accent fill.
  void categoryId;
  const badgeClass = "bg-accent text-text-primary";

  return { chipClass, badgeClass };
}
