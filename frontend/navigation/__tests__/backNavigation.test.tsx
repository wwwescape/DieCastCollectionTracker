import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as carsApi from "../../api/cars";
import * as catalogApi from "../../api/catalog";
import * as lookupsApi from "../../api/lookups";
import * as setsApi from "../../api/sets";
import * as tagsApi from "../../api/tags";
import type { Car, CarSet } from "../../api/types";
import EditCarPage from "../../components/EditCarPage";
import EditSetPage from "../../components/EditSetPage";
import SetPage from "../../pages/SetPage";
import VehiclePage from "../../pages/VehiclePage";

const CAR = {
  id: 4,
  name: "Backdrafter",
  manufacturerId: 1,
  manufacturerName: "Hot Wheels",
  seriesId: null,
  seriesName: null,
  vehicleTypeName: null,
  colorName: null,
  castNumber: null,
  collectionNumber: null,
  year: 2024,
  status: "owned",
  condition: null,
  quantity: 1,
  purchasePrice: null,
  notes: null,
  catalogSource: "hotwheels",
  catalogTitle: "Backdrafter",
  catalogUrl: null,
  photo: null,
  photos: [],
  tags: [],
  sets: [],
} as unknown as Car;

const SET = {
  id: 6,
  name: "Fire Station",
  manufacturerName: "Hot Wheels",
  seriesName: null,
  setType: "playset",
  toyNumber: null,
  year: null,
  status: "owned",
  condition: null,
  sealed: true,
  quantity: 1,
  purchasePrice: null,
  notes: null,
  photo: null,
  photos: [],
  tags: [],
  vehicles: [],
  contents: [],
  catalogSource: null,
  catalogTitle: null,
  catalogUrl: null,
} as unknown as CarSet;

// The list, then the item's page opened from it — the history a click on a card leaves.
function renderFromList(kind: "vehicles" | "sets", id: number) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const list = `/collection/${kind}`;
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[list, { pathname: `${list}/${id}`, state: { from: list } }]}
        initialIndex={1}
      >
        <Routes>
          <Route path="/collection/vehicles" element={<div>Vehicles list</div>} />
          <Route path="/collection/vehicles/:id" element={<VehiclePage />} />
          <Route path="/collection/vehicles/:id/edit" element={<EditCarPage />} />
          <Route path="/collection/sets" element={<div>Sets list</div>} />
          <Route path="/collection/sets/:id" element={<SetPage />} />
          <Route path="/collection/sets/:id/edit" element={<EditSetPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([{ id: 1, name: "Hot Wheels" }]);
  vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([]);
  vi.spyOn(lookupsApi, "listColors").mockResolvedValue([]);
  vi.spyOn(lookupsApi, "listSeries").mockResolvedValue([]);
  vi.spyOn(tagsApi, "listTags").mockResolvedValue([]);
  vi.spyOn(carsApi, "listCars").mockResolvedValue([CAR]);
  vi.spyOn(carsApi, "getCar").mockResolvedValue(CAR);
  vi.spyOn(carsApi, "updateCar").mockResolvedValue(CAR);
  vi.spyOn(setsApi, "listSets").mockResolvedValue([SET]);
  vi.spyOn(setsApi, "getSet").mockResolvedValue(SET);
  vi.spyOn(setsApi, "updateSet").mockResolvedValue(SET);
  vi.spyOn(catalogApi, "searchCatalog").mockResolvedValue([]);
  vi.spyOn(catalogApi, "searchCatalogSets").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const SLOW_UI = { timeout: 20_000 };

describe("Back after editing", SLOW_UI, () => {
  it("returns to the list after Re-match and save, without reopening the match dialog", async () => {
    const user = userEvent.setup();
    renderFromList("vehicles", 4);

    await user.click(await screen.findByRole("button", { name: "Re-match" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    // The page is aria-hidden until the dialog's close transition finishes.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(await screen.findByRole("button", { name: /save changes/i }));

    // Back on the vehicle's page...
    await user.click(await screen.findByRole("button", { name: "Vehicles" }));
    // ...and Back goes to the list, not to the edit page or its dialog.
    expect(await screen.findByText("Vehicles list")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("returns to the item's page from the edit page's back button, then to the list", async () => {
    const user = userEvent.setup();
    renderFromList("sets", 6);

    await user.click(await screen.findByRole("link", { name: "Edit" }));
    await user.click(await screen.findByRole("button", { name: "Fire Station" }));
    await user.click(await screen.findByRole("button", { name: "Sets" }));

    expect(await screen.findByText("Sets list")).toBeInTheDocument();
  });

  it("offers Match to wiki on a set and opens the set search", async () => {
    const user = userEvent.setup();
    renderFromList("sets", 6);

    await user.click(await screen.findByRole("button", { name: "Match to wiki" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await waitFor(() => expect(catalogApi.searchCatalogSets).toHaveBeenCalled());
  });
});
