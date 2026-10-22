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
  // Exact items: a car version by casting + toy number, a set by its wiki page. The casting
  // is part of the key because a multi-pack's toy number is printed on the box and shared by
  // every car in it (e.g. all five cars in a Ferrari 5-Pack are JKG16), so a toy number on
  // its own would mark the whole pack as owned once any one car from it is added.
  carByVersion: Map<string, Holding>;
  setByCatalogTitle: Map<string, Holding>;
  // Related items: any version of a casting, any car from a series, any car by name (the
  // first vehicle with that name, so a wiki set's cars can be linked to it).
  castingTitles: Set<string>;
  seriesNames: Set<string>;
  carIdByName: Map<string, number>;
}

const key = (value: string) => value.trim().toLowerCase();
const versionKey = (casting: string, toyNumber: string) =>
  `${key(casting)}|${normalizeToyNumber(toyNumber)}`;

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
    carByVersion: new Map(),
    setByCatalogTitle: new Map(),
    castingTitles: new Set(),
    seriesNames: new Set(),
    carIdByName: new Map(),
  };
  for (const car of cars) {
    const toyNumber = normalizeToyNumber(car.castNumber ?? "");
    // A wiki-matched car belongs to its casting page; a hand-entered one only has its name.
    if (toyNumber)
      addHolding(index.carByVersion, versionKey(car.catalogTitle ?? car.name, toyNumber), car);
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

// The collection's entry for one release of a wiki casting: a car matched to that casting
// page, or a hand-entered car named like it (with or without the wiki's year suffix), that
// carries one of the release's toy numbers.
export function holdingForVersion(
  index: CollectionIndex,
  castingTitle: string,
  toyNumbers: string[]
): Holding | undefined {
  const castings = [...new Set([castingTitle, castingDisplayName(castingTitle)])];
  return castings
    .flatMap((casting) =>
      toyNumbers.map((toyNumber) => index.carByVersion.get(versionKey(casting, toyNumber)))
    )
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
