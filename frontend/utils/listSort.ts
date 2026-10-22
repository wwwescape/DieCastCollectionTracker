import type { TFunction } from "i18next";
import type { SortOption } from "../components/CollectionListToolbar";

// Sort choices shared by the Vehicles and Sets lists, as "<field>_<order>" (the backend takes
// them as ?sort=<field>&order=<order>). Empty values sort last either way.
const SORT_KEYS = [
  ["name_asc", "listSort.nameAsc"],
  ["name_desc", "listSort.nameDesc"],
  ["createdAt_desc", "listSort.addedDesc"],
  ["createdAt_asc", "listSort.addedAsc"],
  ["year_desc", "listSort.yearDesc"],
  ["year_asc", "listSort.yearAsc"],
  ["quantity_desc", "listSort.quantityDesc"],
  ["purchasePrice_desc", "listSort.priceDesc"],
  ["purchasePrice_asc", "listSort.priceAsc"],
] as const;

export const DEFAULT_SORT = "name_asc";

export function listSortOptions(t: TFunction): SortOption[] {
  return SORT_KEYS.map(([value, labelKey]) => ({ value, label: t(labelKey) }));
}

export function splitSort(value: string): { sort: string; order: "asc" | "desc" } {
  const [sort, order] = value.split("_");
  return { sort: sort || "name", order: order === "desc" ? "desc" : "asc" };
}
