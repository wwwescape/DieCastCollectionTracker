// Client-side search, filter and sort for the Series and Manufacturers pages, whose lists are
// small enough to arrive whole (the Vehicles and Sets lists filter on the server instead).

export type ContentsFilter = "vehicles" | "sets";
export const CONTENTS_OPTIONS: ContentsFilter[] = ["vehicles", "sets"];

interface Counts {
  carCount: number;
  setCount: number;
}

// One filter field: nothing picked keeps everything; otherwise keep items matching any picked
// value, or — with Exclude — items matching none of them.
export function keep<T>(value: T, picked: T[], exclude: boolean): boolean {
  if (!picked.length) return true;
  return picked.includes(value) !== exclude;
}

export function keepContents(item: Counts, picked: ContentsFilter[], exclude: boolean): boolean {
  if (!picked.length) return true;
  const has = picked.some((kind) => (kind === "vehicles" ? item.carCount > 0 : item.setCount > 0));
  return has !== exclude;
}

export function matchesSearch(text: string, ...fields: (string | number | null | undefined)[]) {
  const query = text.trim().toLowerCase();
  if (!query) return true;
  return fields.some(
    (field) => field !== null && field !== undefined && String(field).toLowerCase().includes(query)
  );
}

export const BROWSE_SORTS = [
  "name_asc",
  "name_desc",
  "vehicles_desc",
  "sets_desc",
  "year_desc",
  "year_asc",
] as const;
export type BrowseSort = (typeof BROWSE_SORTS)[number];

// Empty years sort last either way; ties fall back to the name.
export function browseCompare(sort: BrowseSort) {
  return (
    a: Counts & { name: string; year?: number | null },
    b: Counts & { name: string; year?: number | null }
  ) => {
    const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
    switch (sort) {
      case "name_desc":
        return -byName;
      case "vehicles_desc":
        return b.carCount - a.carCount || byName;
      case "sets_desc":
        return b.setCount - a.setCount || byName;
      case "year_desc":
      case "year_asc": {
        const ay = a.year ?? null;
        const by = b.year ?? null;
        if (ay === by) return byName;
        if (ay === null) return 1;
        if (by === null) return -1;
        return sort === "year_desc" ? by - ay : ay - by;
      }
      default:
        return byName;
    }
  };
}

// Sort choices for Series (with year) and Manufacturers (without).
export function browseSortOptions(t: (key: string) => string, withYear: boolean) {
  return [
    { value: "name_asc", label: t("listSort.nameAsc") },
    { value: "name_desc", label: t("listSort.nameDesc") },
    { value: "vehicles_desc", label: t("browse.sort.mostVehicles") },
    { value: "sets_desc", label: t("browse.sort.mostSets") },
    ...(withYear
      ? [
          { value: "year_desc", label: t("listSort.yearDesc") },
          { value: "year_asc", label: t("listSort.yearAsc") },
        ]
      : []),
  ];
}
