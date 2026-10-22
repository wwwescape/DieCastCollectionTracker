import { describe, expect, it } from "vitest";
import type { Car, CarSet } from "../../api/types";
import {
  buildCollectionIndex,
  hasCarNamed,
  hasCasting,
  hasSeries,
  holdingForSet,
  holdingForPackCar,
  holdingForVersion,
  vehicleIdsNamed,
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
    expect(holdingForVersion(index, "Car", ["XXX99", "hyw18"])).toEqual({
      id: 2,
      status: "owned",
      quantity: 3,
    });
    expect(holdingForVersion(index, "Car", ["NOPE1"])).toBeUndefined();
  });

  it("only counts a multi-pack's shared toy number for the car's own casting", () => {
    const packIndex = buildCollectionIndex(
      [
        car({
          id: 89,
          name: "Ferrari F40 Competizione",
          castNumber: "JKG16",
          catalogTitle: "Ferrari F40 Competizione",
        }),
        car({ id: 90, name: "Mazda MX-5 Miata", castNumber: "HYW18" }),
      ],
      []
    );

    // Same 5-pack toy number, different car: not owned.
    expect(holdingForVersion(packIndex, "Ferrari 12Cilindri", ["JKG16", "JLN12"])).toBeUndefined();
    expect(holdingForVersion(packIndex, "Ferrari F40 Competizione", ["JKG16"])).toMatchObject({
      id: 89,
    });
    // A hand-entered car matches its casting by name, ignoring the wiki's year suffix.
    expect(holdingForVersion(packIndex, "Mazda MX-5 Miata (2025)", ["HYW18"])).toMatchObject({
      id: 90,
    });
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

  it("finds vehicle ids by name or wiki casting, once each", () => {
    expect(vehicleIdsNamed(index, ["BONE SHAKER", "Bone Shaker", "Car", "Nope"])).toEqual([4, 1]);
  });

  it("tells apart cars in one pack that share a casting and toy number, by name", () => {
    const packIndex = buildCollectionIndex(
      [
        car({
          id: 30,
          name: "Scuderia Ferrari HP",
          castNumber: "jmm24",
          catalogTitle: "Formula 1 (2025)",
        }),
      ],
      []
    );

    expect(holdingForPackCar(packIndex, "Scuderia Ferrari HP", ["JMM24"])).toMatchObject({
      id: 30,
    });
    expect(holdingForPackCar(packIndex, "McLaren Formula 1 Team", ["JMM24"])).toBeUndefined();
    // An alternate pack toy number still finds it.
    expect(holdingForPackCar(packIndex, "scuderia ferrari hp", ["JGF58", "JMM24"])).toMatchObject({
      id: 30,
    });
  });
});
