import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as carsApi from "../../api/cars";
import * as catalogApi from "../../api/catalog";
import * as setsApi from "../../api/sets";
import type { CatalogPack } from "../../api/catalog";
import type { Car } from "../../api/types";
import CatalogPackPage from "../CatalogPackPage";

const PACK: CatalogPack = {
  source: "hotwheels",
  title: "Formula One 10-Pack",
  url: "https://hotwheels.fandom.com/wiki/Formula_One_10-Pack",
  manufacturer: "Hot Wheels",
  imageUrl: null,
  packLabel: "10-Pack",
  toyNumbers: ["JMM24"],
  year: 2026,
  cars: [
    {
      name: "McLaren Formula 1 Team",
      color: "Anthracite",
      photoUrl:
        "https://static.wikia.nocookie.net/hotwheels/images/a/aa/McLaren.jpg/revision/latest",
      thumbnailUrl: null,
      castingTitle: "Formula 1 (2025)",
    },
    {
      name: "Scuderia Ferrari HP",
      color: "Rosso Corsa",
      photoUrl: null,
      thumbnailUrl: null,
      castingTitle: "Formula 1 (2025)",
    },
    { name: "Future Car", color: "White", photoUrl: null, thumbnailUrl: null, castingTitle: null },
  ],
};

const OWNED_FERRARI = {
  id: 7,
  name: "Scuderia Ferrari HP",
  castNumber: "JMM24",
  status: "owned",
  quantity: 1,
  seriesName: "Formula One 10-Pack",
  catalogTitle: "Formula 1 (2025)",
} as unknown as Car;

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[
          "/collection/vehicles/add/pack?source=hotwheels&title=Formula+One+10-Pack&q=JMM24",
        ]}
      >
        <Routes>
          <Route path="/collection/vehicles/add/pack" element={<CatalogPackPage />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
        <ToastContainer />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const cardFor = async (name: string) =>
  (await screen.findByText(name)).closest(".item-card") as HTMLElement;

describe("CatalogPackPage", () => {
  beforeEach(() => {
    vi.spyOn(catalogApi, "getCatalogPack").mockResolvedValue(PACK);
    vi.spyOn(setsApi, "listSets").mockResolvedValue([]);
    vi.spyOn(carsApi, "listCars").mockResolvedValue([OWNED_FERRARI]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ticks every car except the ones already in the collection", async () => {
    renderPage();

    const mclaren = await cardFor("McLaren Formula 1 Team");
    const ferrari = await cardFor("Scuderia Ferrari HP");
    await waitFor(() => expect(within(ferrari).getByText("Owned")).toBeInTheDocument());

    expect(within(mclaren).getByRole("checkbox", { name: "Add" })).toBeChecked();
    expect(within(ferrari).getByRole("checkbox", { name: "Add" })).not.toBeChecked();
    expect(within(ferrari).getByRole("button", { name: "View in collection" })).toBeInTheDocument();
    expect(screen.getByText("2 of 3 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add 2 vehicles" })).toBeEnabled();
  });

  it("adds the ticked cars in one go, with the pack as series and its toy number", async () => {
    const bulkSpy = vi
      .spyOn(carsApi, "createCarsBulk")
      .mockResolvedValue({ cars: [{} as Car, {} as Car], photosFailed: 0 });
    const user = userEvent.setup();
    renderPage();

    await cardFor("Future Car");
    await user.click(screen.getByRole("button", { name: "Wishlisted" }));
    await user.click(await screen.findByRole("button", { name: "Add 2 vehicles" }));

    await waitFor(() => expect(bulkSpy).toHaveBeenCalledTimes(1));
    const items = bulkSpy.mock.calls[0][0];
    expect(items.map((item) => item.name)).toEqual(["McLaren Formula 1 Team", "Future Car"]);
    expect(items[0]).toMatchObject({
      manufacturer: "Hot Wheels",
      series: "Formula One 10-Pack",
      color: "Anthracite",
      castNumber: "JMM24",
      year: 2026,
      status: "wishlist",
      catalogSource: "hotwheels",
      catalogTitle: "Formula 1 (2025)",
      wikiPhotoUrl: PACK.cars[0].photoUrl,
    });
    // No casting page linked on the wiki: added as a hand-entered car.
    expect(items[1]).toMatchObject({ catalogSource: null, catalogTitle: null, wikiPhotoUrl: null });
    expect(await screen.findByTestId("location")).toHaveTextContent("/collection/vehicles");
    expect(
      await screen.findByText("Added 2 vehicles from Formula One 10-Pack.")
    ).toBeInTheDocument();
  });

  it("lets the selection be changed before adding", async () => {
    const user = userEvent.setup();
    renderPage();

    const mclaren = await cardFor("McLaren Formula 1 Team");
    await user.click(within(mclaren).getByRole("checkbox", { name: "Add" }));
    expect(await screen.findByRole("button", { name: "Add 1 vehicle" })).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "1 of 3 selected" }));
    expect(screen.getByRole("button", { name: "Add 3 vehicles" })).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "3 of 3 selected" }));
    expect(screen.getByRole("button", { name: "Add 0 vehicles" })).toBeDisabled();
  });
});
