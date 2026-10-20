import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as carsApi from "../../api/cars";
import * as lookupsApi from "../../api/lookups";
import * as setsApi from "../../api/sets";
import type { Car, CarSet } from "../../api/types";
import { manufacturerLogo } from "../../utils/manufacturerLogos";
import ManufacturerPage from "../ManufacturerPage";
import ManufacturersPage from "../ManufacturersPage";

const CAR = {
  id: 7,
  name: "Backdrafter",
  manufacturerName: "Hot Wheels",
  status: "owned",
  quantity: 1,
  photo: null,
  condition: null,
  seriesName: null,
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
          <Route path="/collection/manufacturers" element={<ManufacturersPage />} />
          <Route path="/collection/manufacturers/:id" element={<ManufacturerPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("manufacturerLogo", () => {
  it("matches bundled logos by name, ignoring case and punctuation", () => {
    expect(manufacturerLogo("Hot Wheels")).toBe("/manufacturers/hot-wheels.png");
    expect(manufacturerLogo("HOTWHEELS")).toBe("/manufacturers/hot-wheels.png");
    expect(manufacturerLogo("Majorette")).toBe("/manufacturers/majorette.png");
    expect(manufacturerLogo("Greenlight")).toBeNull();
  });
});

describe("ManufacturersPage", () => {
  it("shows each manufacturer with its logo or name and counts, and opens one", async () => {
    vi.spyOn(lookupsApi, "listManufacturerOverview").mockResolvedValue([
      { id: 1, name: "Hot Wheels", carCount: 1, setCount: 1 },
      { id: 2, name: "Greenlight", carCount: 2, setCount: 0 },
    ]);
    vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([{ id: 1, name: "Hot Wheels" }]);
    const listCars = vi.spyOn(carsApi, "listCars").mockResolvedValue([CAR]);
    const listSets = vi.spyOn(setsApi, "listSets").mockResolvedValue([SET]);
    const user = userEvent.setup();
    renderAt("/collection/manufacturers");

    expect(await screen.findByAltText("Hot Wheels")).toHaveAttribute(
      "src",
      "/manufacturers/hot-wheels.png"
    );
    expect(screen.getByText("1 vehicle · 1 set")).toBeInTheDocument();
    expect(screen.getByText("2 vehicles · 0 sets")).toBeInTheDocument();
    // No bundled logo: the name stands in, on the plate and as the card title.
    expect(screen.getAllByText("Greenlight")).toHaveLength(2);

    await user.click(screen.getByText("1 vehicle · 1 set"));

    expect(await screen.findByText("Backdrafter")).toBeInTheDocument();
    expect(screen.getByText("Downtown Fire Station Spinout")).toBeInTheDocument();
    expect(listCars.mock.calls.at(-1)?.[0]).toEqual({ manufacturerId: 1 });
    expect(listSets.mock.calls.at(-1)?.[0]).toEqual({ manufacturerId: 1 });
    // View-only cards here: no delete buttons.
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });
});
