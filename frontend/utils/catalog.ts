import type { CatalogCasting, CatalogSourceId, CatalogVersion } from "../api/catalog";
import type { CarFormValues } from "../components/CarForm";

export const CATALOG_SOURCE_LABELS: Record<CatalogSourceId, string> = {
  hotwheels: "Hot Wheels Wiki",
  matchbox: "Matchbox Wiki",
};

// Wiki titles disambiguate re-tooled castings with a year suffix ("Mazda MX-5 Miata (2025)");
// that's not part of the car's name. Chassis-code suffixes like "(BNR34)" are kept.
export function castingDisplayName(title: string): string {
  return title.replace(/\s*\((19|20)\d{2}\)$/, "");
}

// Fandom serves resized renditions by inserting /scale-to-width-down/N after
// /revision/latest — far lighter than the original for a card-sized preview.
export function wikiImageAtWidth(url: string | null, width: number): string | null {
  if (!url) return null;
  return url.includes("/revision/latest/")
    ? url
    : url.replace("/revision/latest", `/revision/latest/scale-to-width-down/${width}`);
}

export function normalizeToyNumber(value: string): string {
  return value.trim().toUpperCase();
}

export function versionMatchesQuery(version: CatalogVersion, query: string | undefined): boolean {
  const needle = query ? normalizeToyNumber(query) : "";
  return needle.length > 0 && version.toyNumbers.some((toyNumber) => toyNumber === needle);
}

// Maps a wiki release onto the car form. Toy # (the code printed on the card, e.g. HYW18)
// goes to "Toy / cast number" — the one the user searched for, when it's one of several
// regional codes — and the collector number (e.g. 001/250) to "Collection number".
export function versionToFormValues(
  casting: CatalogCasting,
  version: CatalogVersion,
  query?: string
): Partial<CarFormValues> {
  const needle = query ? normalizeToyNumber(query) : "";
  const matchedToyNumber = version.toyNumbers.find((toyNumber) => toyNumber === needle);
  return {
    name: castingDisplayName(casting.title),
    manufacturer: casting.manufacturer,
    series: version.series ?? "",
    color: version.color ?? "",
    castNumber: matchedToyNumber ?? version.toyNumbers[0] ?? "",
    collectionNumber: version.collectorNumber ?? "",
    year: version.year?.toString() ?? "",
    catalogSource: casting.source,
    catalogTitle: casting.title,
  };
}
