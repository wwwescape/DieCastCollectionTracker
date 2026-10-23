import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as carsApi from "../../api/cars";
import * as lookupsApi from "../../api/lookups";
import * as setsApi from "../../api/sets";
import * as tagsApi from "../../api/tags";
import type { Car, CarSet } from "../../api/types";
import EditCarPage from "../EditCarPage";
import EditSetPage from "../EditSetPage";

const CAR = {
  id: 4,
  name: "Backdrafter",
  manufacturerName: "Hot Wheels",
  seriesName: null,
  vehicleTypeName: null,
  colorName: null,
  castNumber: null,
  collectionNumber: null,
  year: null,
  status: "owned",
  condition: null,
  quantity: 1,
  purchasePrice: null,
  notes: null,
  catalogSource: null,
  catalogTitle: null,
  photo: null,
  photos: [],
  tags: [],
  sets: [],
} as unknown as Car;

const SET = {
  id: 6,
  name: "Fire Station",
  manufacturerName: "Hot Wheels",
  setType: "playset",
  toyNumber: null,
  year: null,
  status: "owned",
  sealed: true,
  quantity: 1,
  purchasePrice: null,
  notes: null,
  photo: null,
  photos: [],
  tags: [],
  vehicles: [],
  seriesName: null,
  condition: null,
  contents: [],
  catalogSource: null,
  catalogTitle: null,
  catalogUrl: null,
} as unknown as CarSet;

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/collection/vehicles/:id/edit" element={<EditCarPage />} />
          <Route path="/collection/sets/:id/edit" element={<EditSetPage />} />
          <Route path="/collection/vehicles" element={<div>Cars list</div>} />
          <Route path="/collection/sets" element={<div>Sets list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([]);
  vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([]);
  vi.spyOn(lookupsApi, "listColors").mockResolvedValue([]);
  vi.spyOn(lookupsApi, "listSeries").mockResolvedValue([]);
  vi.spyOn(tagsApi, "listTags").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("deleting from the edit pages", () => {
  it("deletes a car after confirming and goes back to the list", async () => {
    vi.spyOn(carsApi, "getCar").mockResolvedValue(CAR);
    const deleteSpy = vi.spyOn(carsApi, "deleteCar").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAt("/collection/vehicles/4/edit");

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete this vehicle?")).toBeInTheDocument();
    expect(deleteSpy).not.toHaveBeenCalled();
    await user.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);

    expect(deleteSpy.mock.calls[0]?.[0]).toBe(4);
    await waitFor(() => expect(screen.getByText("Cars list")).toBeInTheDocument());
  });

  it("keeps the set when the confirmation is cancelled", async () => {
    vi.spyOn(setsApi, "getSet").mockResolvedValue(SET);
    const deleteSpy = vi.spyOn(setsApi, "deleteSet").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAt("/collection/sets/6/edit");

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleteSpy).not.toHaveBeenCalled();
    // The page is aria-hidden until the dialog's close transition finishes.
    await waitFor(() => expect(screen.getByRole("heading", { name: "Edit" })).toBeInTheDocument());
  });
});
