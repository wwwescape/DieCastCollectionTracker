import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as carsApi from "../../api/cars";
import * as catalogApi from "../../api/catalog";
import type { CatalogCasting } from "../../api/catalog";
import CatalogVersionPicker from "../CatalogVersionPicker";

const CASTING: CatalogCasting = {
  source: "hotwheels",
  title: "Nissan Skyline GT-R (BNR34)",
  url: "https://hotwheels.fandom.com/wiki/Nissan_Skyline_GT-R_(BNR34)",
  manufacturer: "Hot Wheels",
  imageUrl: null,
  versions: [
    {
      collectorNumber: "007/240",
      year: 2010,
      series: "2010 New Models",
      seriesNumber: "7/44",
      color: "Metalflake Grey",
      tampo: null,
      toyNumbers: ["R0922"],
      notes: null,
      photoUrl: null,
      thumbnailUrl: null,
    },
    {
      collectorNumber: "158/250",
      year: 2013,
      series: "HW Showroom",
      seriesNumber: null,
      color: "Red",
      tampo: null,
      toyNumbers: ["X1786"],
      notes: null,
      photoUrl: null,
      thumbnailUrl: null,
    },
    {
      collectorNumber: "199/250",
      year: 2026,
      series: "HW J-Imports",
      seriesNumber: "10/10",
      color: "Yellow",
      tampo: null,
      toyNumbers: ["JPD52"],
      notes: null,
      photoUrl: null,
      thumbnailUrl: null,
    },
  ],
};

function renderPicker(onPick = vi.fn(), query?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CatalogVersionPicker
        source="hotwheels"
        title={CASTING.title}
        query={query}
        pickLabel="Add this version"
        onPick={onPick}
      />
    </QueryClientProvider>
  );
  return onPick;
}

describe("CatalogVersionPicker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists the toy-number match first and flags versions already in the collection", async () => {
    vi.spyOn(catalogApi, "getCatalogCasting").mockResolvedValue(CASTING);
    vi.spyOn(carsApi, "listCars").mockResolvedValue([
      { castNumber: "jpd52" } as unknown as Awaited<ReturnType<typeof carsApi.listCars>>[number],
    ]);
    renderPicker(vi.fn(), "x1786");

    const titles = await screen.findAllByText(/^\d{4} · /);
    expect(titles.map((node) => node.textContent)).toEqual([
      "2013 · Red",
      "2026 · Yellow",
      "2010 · Metalflake Grey",
    ]);
    expect(screen.getByText("Matches your search")).toBeInTheDocument();
    expect(await screen.findByText("In collection")).toBeInTheDocument();
  });

  it("hands the picked version back", async () => {
    vi.spyOn(catalogApi, "getCatalogCasting").mockResolvedValue(CASTING);
    vi.spyOn(carsApi, "listCars").mockResolvedValue([]);
    const user = userEvent.setup();
    const onPick = renderPicker();

    const card = (await screen.findByText("2010 · Metalflake Grey")).closest(
      ".MuiCard-root"
    ) as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "Add this version" }));

    expect(onPick).toHaveBeenCalledWith(CASTING, CASTING.versions[0]);
  });
});
