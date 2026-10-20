import { describe, expect, it } from "vitest";
import type { Car, CarSet } from "../../api/types";
import {
  buildCollectionIndex,
  hasCarNamed,
  hasCasting,
  hasSeries,
  holdingForSet,
  holdingForToyNumbers,
} from "../collectionIndex";

const car = (overrides: Partial<Car>) =>
  ({
    id: 1,
    name: "Car",
    castNumber: null,
    status: "owned",
    quantity: 1,
    seriesName: null,
    catalogTitle: null,
    ...overrides,
  }) as Car;

describe("buildCollectionIndex", () => {
  const index = buildCollectionIndex(
    [
      car({ id: 1, castNumber: "hyw18", status: "wishlist", quantity: 2 }),
      car({ id: 2, castNumber: "HYW18", status: "owned", quantity: 1 }),
      car({ id: 3, castNumber: "HYW18", status: "owned", quantity: 2 }),
      car({
        id: 4,
        name: "Bone Shaker",
        seriesName: "Hot Wheels Monster Trucks Glow in The Dark Collection",
        catalogTitle: "Bone Shaker (Monster Truck)",
      }),
    ],
    [
      {
        id: 8,
        catalogTitle: "Downtown Fire Station Spinout",
        status: "wishlist",
        quantity: 1,
      } as CarSet,
    ]
  );

  it("prefers owned entries and sums their quantity, case-insensitively by toy number", () => {
    expect(holdingForToyNumbers(index, ["XXX99", "hyw18"])).toEqual({
      id: 2,
      status: "owned",
      quantity: 3,
    });
    expect(holdingForToyNumbers(index, ["NOPE1"])).toBeUndefined();
  });

  it("finds sets by their wiki page", () => {
    expect(holdingForSet(index, "downtown fire station spinout")).toEqual({
      id: 8,
      status: "wishlist",
      quantity: 1,
    });
  });

  it("knows related castings, series and car names", () => {
    expect(hasCasting(index, "Bone Shaker (Monster Truck)")).toBe(true);
    expect(hasSeries(index, "hot wheels monster trucks glow in the dark collection")).toBe(true);
    expect(hasSeries(index, null)).toBe(false);
    expect(hasCarNamed(index, "bone shaker")).toBe(true);
    expect(hasCarNamed(index, "Rodger Dodger")).toBe(false);
  });
});
