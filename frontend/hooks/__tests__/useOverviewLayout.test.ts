import { describe, expect, it } from "vitest";
import { DEFAULT_OVERVIEW_LAYOUT, resolveOverviewLayout } from "../useOverviewLayout";

describe("resolveOverviewLayout", () => {
  it("uses the default layout until one is saved", () => {
    expect(resolveOverviewLayout(null)).toEqual(DEFAULT_OVERVIEW_LAYOUT);
    expect(resolveOverviewLayout([])).toEqual(DEFAULT_OVERVIEW_LAYOUT);
  });

  it("keeps the saved order and hidden sections", () => {
    const layout = resolveOverviewLayout([
      { key: "needsAttention", hidden: false },
      { key: "stats", hidden: true },
      { key: "quickAdd", hidden: false },
      { key: "recentlyAdded", hidden: false },
      { key: "wishlist", hidden: false },
    ]);

    expect(layout.map((section) => section.key)).toEqual([
      "needsAttention",
      "stats",
      "quickAdd",
      "recentlyAdded",
      "wishlist",
    ]);
    expect(layout[1].hidden).toBe(true);
  });

  it("drops unknown and repeated keys, and slots missing sections back into their default place", () => {
    const layout = resolveOverviewLayout([
      { key: "wishlist", hidden: false },
      { key: "fromANewerVersion", hidden: false },
      { key: "stats", hidden: false },
      { key: "wishlist", hidden: true },
    ]);

    // quickAdd and recentlyAdded follow stats by default; needsAttention follows wishlist.
    expect(layout.map((section) => section.key)).toEqual([
      "wishlist",
      "needsAttention",
      "stats",
      "quickAdd",
      "recentlyAdded",
    ]);
    expect(layout[0].hidden).toBe(false);
  });
});
