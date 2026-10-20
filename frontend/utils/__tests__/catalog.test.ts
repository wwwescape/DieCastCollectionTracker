import { describe, expect, it } from "vitest";
import type { CatalogCasting, CatalogVersion } from "../../api/catalog";
import {
  castingDisplayName,
  versionMatchesQuery,
  versionToFormValues,
  wikiImageAtWidth,
} from "../catalog";

const VERSION: CatalogVersion = {
  collectorNumber: "001/250",
  year: 2025,
  series: "HW Dream Garage",
  seriesNumber: "2/5",
  color: "White",
  tampo: null,
  toyNumbers: ["JBP41", "JBR98"],
  notes: null,
  photoUrl: "https://static.wikia.nocookie.net/hotwheels/images/b/b9/X.jpg/revision/latest?cb=1",
  thumbnailUrl: null,
};

const CASTING: CatalogCasting = {
  source: "hotwheels",
  title: "Mazda MX-5 Miata (2025)",
  url: "https://hotwheels.fandom.com/wiki/Mazda_MX-5_Miata_(2025)",
  manufacturer: "Hot Wheels",
  imageUrl: null,
  versions: [VERSION],
};

describe("catalog utils", () => {
  it("drops only a trailing year disambiguator from casting titles", () => {
    expect(castingDisplayName("Mazda MX-5 Miata (2025)")).toBe("Mazda MX-5 Miata");
    expect(castingDisplayName("Nissan Skyline GT-R (BNR34)")).toBe("Nissan Skyline GT-R (BNR34)");
  });

  it("matches a toy-number query case-insensitively", () => {
    expect(versionMatchesQuery(VERSION, " jbr98 ")).toBe(true);
    expect(versionMatchesQuery(VERSION, "Miata")).toBe(false);
    expect(versionMatchesQuery(VERSION, undefined)).toBe(false);
  });

  it("maps a version onto the car form, preferring the searched toy number", () => {
    expect(versionToFormValues(CASTING, VERSION, "jbr98")).toEqual({
      name: "Mazda MX-5 Miata",
      manufacturer: "Hot Wheels",
      series: "HW Dream Garage",
      color: "White",
      castNumber: "JBR98",
      collectionNumber: "001/250",
      year: "2025",
      catalogSource: "hotwheels",
      catalogTitle: "Mazda MX-5 Miata (2025)",
    });
    expect(versionToFormValues(CASTING, VERSION).castNumber).toBe("JBP41");
  });

  it("requests a resized wiki image rendition", () => {
    expect(wikiImageAtWidth(VERSION.photoUrl, 400)).toBe(
      "https://static.wikia.nocookie.net/hotwheels/images/b/b9/X.jpg/revision/latest/scale-to-width-down/400?cb=1"
    );
    expect(wikiImageAtWidth(null, 400)).toBeNull();
  });
});
