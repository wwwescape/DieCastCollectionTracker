import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as carsApi from "../../api/cars";
import * as catalogApi from "../../api/catalog";
import * as setsApi from "../../api/sets";
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

function renderPicker(
  onPick = vi.fn(),
  query?: string,
  onOpenExisting?: (holding: { id: number }) => void
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CatalogVersionPicker
        source="hotwheels"
        title={CASTING.title}
        query={query}
        pickLabel="Add this version"
        onPick={onPick}
        onOpenExisting={onOpenExisting}
      />
    </QueryClientProvider>
  );
  return onPick;
}

describe("CatalogVersionPicker", () => {
  beforeEach(() => {
    vi.spyOn(setsApi, "listSets").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists the toy-number match first and marks what's already in the collection", async () => {
    vi.spyOn(catalogApi, "getCatalogCasting").mockResolvedValue(CASTING);
    vi.spyOn(carsApi, "listCars").mockResolvedValue([
      {
        id: 9,
        castNumber: "jpd52",
        status: "owned",
        quantity: 3,
        name: "Skyline",
        catalogTitle: "Nissan Skyline GT-R (BNR34)",
        seriesName: "HW Showroom",
      } as unknown as Awaited<ReturnType<typeof carsApi.listCars>>[number],
    ]);
    const onOpenExisting = vi.fn();
    const user = userEvent.setup();
    renderPicker(vi.fn(), "x1786", onOpenExisting);

    const titles = await screen.findAllByText(/^\d{4} · /);
    expect(titles.map((node) => node.textContent)).toEqual([
      "2013 · Red",
      "2026 · Yellow",
      "2010 · Metalflake Grey",
    ]);
    expect(screen.getByText("Matches your search")).toBeInTheDocument();

    // The owned version: status and quantity chips, and "View in collection" instead of adding.
    const owned = (await screen.findByText("2026 · Yellow")).closest(
      ".MuiCard-root"
    ) as HTMLElement;
    expect(within(owned).getByText("Owned")).toBeInTheDocument();
    expect(within(owned).getByLabelText("Quantity")).toHaveTextContent("3");
    await user.click(within(owned).getByRole("button", { name: "View in collection" }));
    expect(onOpenExisting.mock.calls[0]?.[0]).toMatchObject({
      id: 9,
      status: "owned",
      quantity: 3,
    });

    // Not owned, but a car from its series is: only the "related" chip.
    const sameSeries = screen.getByText("2013 · Red").closest(".MuiCard-root") as HTMLElement;
    expect(within(sameSeries).queryByText("Owned")).not.toBeInTheDocument();
    expect(
      within(sameSeries).getByLabelText("You have vehicles from this series")
    ).toBeInTheDocument();
    expect(
      within(sameSeries).getByRole("button", { name: "Add this version" })
    ).toBeInTheDocument();
  });

  it("doesn't treat other cars from the same multi-pack as owned", async () => {
    // A 5-pack's toy number is shared by every car in it; owning the F40 from the pack
    // must not mark this casting's pack version as owned.
    vi.spyOn(catalogApi, "getCatalogCasting").mockResolvedValue(CASTING);
    vi.spyOn(carsApi, "listCars").mockResolvedValue([
      {
        id: 89,
        castNumber: "JPD52",
        status: "owned",
        quantity: 1,
        name: "Ferrari F40 Competizione",
        catalogTitle: "Ferrari F40 Competizione",
        seriesName: null,
      } as unknown as Awaited<ReturnType<typeof carsApi.listCars>>[number],
    ]);
    renderPicker(vi.fn(), undefined, vi.fn());

    const packVersion = (await screen.findByText("2026 · Yellow")).closest(
      ".MuiCard-root"
    ) as HTMLElement;
    expect(within(packVersion).queryByText("Owned")).not.toBeInTheDocument();
    expect(
      within(packVersion).getByRole("button", { name: "Add this version" })
    ).toBeInTheDocument();
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
