import type { Car, CarSet, CarStatus } from "../api/types";
import { castingDisplayName, normalizeToyNumber } from "./catalog";

// What the collection already holds for one search result: Owned wins over Wishlisted, and
// the quantity is summed over the entries with that status. `id` opens the first of them.
export interface Holding {
  id: number;
  status: CarStatus;
  quantity: number;
}

export interface CollectionIndex {
  // Exact items: a car version by its toy number, a set by its wiki page.
  carByToyNumber: Map<string, Holding>;
  setByCatalogTitle: Map<string, Holding>;
  // Related items: any version of a casting, any car from a series, any car by name (the
  // first vehicle with that name, so a wiki set's cars can be linked to it).
  castingTitles: Set<string>;
  seriesNames: Set<string>;
  carIdByName: Map<string, number>;
}

const key = (value: string) => value.trim().toLowerCase();

function addHolding(
  map: Map<string, Holding>,
  mapKey: string,
  item: { id: number; status: CarStatus; quantity: number }
) {
  const existing = map.get(mapKey);
  if (!existing || (existing.status === "wishlist" && item.status === "owned")) {
    map.set(mapKey, { id: item.id, status: item.status, quantity: item.quantity });
  } else if (existing.status === item.status) {
    existing.quantity += item.quantity;
  }
}

function addName(index: CollectionIndex, name: string, id: number) {
  if (!index.carIdByName.has(key(name))) index.carIdByName.set(key(name), id);
}

export function buildCollectionIndex(cars: Car[], sets: CarSet[]): CollectionIndex {
  const index: CollectionIndex = {
    carByToyNumber: new Map(),
    setByCatalogTitle: new Map(),
    castingTitles: new Set(),
    seriesNames: new Set(),
    carIdByName: new Map(),
  };
  for (const car of cars) {
    const toyNumber = normalizeToyNumber(car.castNumber ?? "");
    if (toyNumber) addHolding(index.carByToyNumber, toyNumber, car);
    if (car.catalogTitle) {
      index.castingTitles.add(key(car.catalogTitle));
      addName(index, castingDisplayName(car.catalogTitle), car.id);
    }
    if (car.seriesName) index.seriesNames.add(key(car.seriesName));
    addName(index, car.name, car.id);
  }
  for (const set of sets) {
    if (set.catalogTitle) addHolding(index.setByCatalogTitle, key(set.catalogTitle), set);
  }
  return index;
}

export function holdingForToyNumbers(
  index: CollectionIndex,
  toyNumbers: string[]
): Holding | undefined {
  return toyNumbers
    .map((toyNumber) => index.carByToyNumber.get(normalizeToyNumber(toyNumber)))
    .find(Boolean);
}

export function holdingForSet(index: CollectionIndex, catalogTitle: string): Holding | undefined {
  return index.setByCatalogTitle.get(key(catalogTitle));
}

export const hasCasting = (index: CollectionIndex, title: string) =>
  index.castingTitles.has(key(title));
export const hasSeries = (index: CollectionIndex, series: string | null) =>
  Boolean(series) && index.seriesNames.has(key(series!));
export const hasCarNamed = (index: CollectionIndex, name: string) =>
  index.carIdByName.has(key(name));

// The collection's vehicles matching a wiki set's cars by name, for pre-linking a new set.
export function vehicleIdsNamed(index: CollectionIndex, names: string[]): number[] {
  const ids = names
    .map((name) => index.carIdByName.get(key(name)))
    .filter((id): id is number => id !== undefined);
  return [...new Set(ids)];
}
