import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as carsApi from "../../api/cars";
import * as lookupsApi from "../../api/lookups";
import * as setsApi from "../../api/sets";
import type { Car, CarSet } from "../../api/types";
import SeriesListPage from "../SeriesListPage";
import SeriesPage from "../SeriesPage";

const CAR = {
  id: 7,
  name: "Backdrafter",
  manufacturerName: "Hot Wheels",
  status: "owned",
  quantity: 1,
  photo: null,
  condition: null,
  seriesName: "HW City",
} as Car;
const SET = {
  id: 3,
  name: "Downtown Fire Station Spinout",
  manufacturerName: "Hot Wheels",
  status: "owned",
  setType: "playset",
  sealed: true,
  quantity: 1,
  contents: [],
  photo: null,
  year: 2018,
} as unknown as CarSet;

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/collection/series" element={<SeriesListPage />} />
          <Route path="/collection/series/:id" element={<SeriesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SeriesListPage", () => {
  it("shows each series with its counts, and opens one with its vehicles and sets", async () => {
    vi.spyOn(lookupsApi, "listSeriesOverview").mockResolvedValue([
      {
        id: 5,
        name: "HW City",
        manufacturerId: 1,
        manufacturerName: "Hot Wheels",
        carCount: 1,
        setCount: 1,
      },
      {
        id: 6,
        name: "Treasure Hunt",
        manufacturerId: null,
        manufacturerName: null,
        carCount: 0,
        setCount: 0,
      },
    ]);
    const listCars = vi.spyOn(carsApi, "listCars").mockResolvedValue([CAR]);
    const listSets = vi.spyOn(setsApi, "listSets").mockResolvedValue([SET]);
    const user = userEvent.setup();
    renderAt("/collection/series");

    expect(await screen.findByText("1 vehicle · 1 set")).toBeInTheDocument();
    expect(screen.getByText("0 vehicles · 0 sets")).toBeInTheDocument();
    await user.click(screen.getByText("HW City"));

    expect(await screen.findByRole("heading", { name: "HW City" })).toBeInTheDocument();
    expect(await screen.findByText("Backdrafter")).toBeInTheDocument();
    expect(screen.getByText("Downtown Fire Station Spinout")).toBeInTheDocument();
    expect(listCars.mock.calls.at(-1)?.[0]).toEqual({ seriesId: 5 });
    expect(listSets.mock.calls.at(-1)?.[0]).toEqual({ seriesId: 5 });
  });
});
