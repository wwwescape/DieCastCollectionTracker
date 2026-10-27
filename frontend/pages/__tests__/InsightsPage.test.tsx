import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "../../api/auth";
import * as carsApi from "../../api/cars";
import * as dashboardApi from "../../api/dashboard";
import * as setsApi from "../../api/sets";
import type { Car } from "../../api/types";
import InsightsPage from "../InsightsPage";
import OverviewPage from "../OverviewPage";

const car = (id: number, overrides: Partial<Car> = {}): Car =>
  ({
    id,
    name: `Car ${id}`,
    manufacturerId: 1,
    manufacturerName: "Hot Wheels",
    seriesId: 7,
    seriesName: "HW Exotics",
    vehicleTypeName: null,
    castNumber: "ABC12",
    collectionNumber: null,
    colorName: null,
    year: 2024,
    status: "owned",
    condition: "mint_in_box",
    quantity: 1,
    photo: "/uploads/x.jpg",
    photos: [],
    tags: [],
    sets: [],
    catalogTitle: "Car",
    ...overrides,
  }) as unknown as Car;

const CARS = [
  car(1),
  car(2, { photo: null, quantity: 2 }),
  car(3, { status: "wishlist", condition: null, catalogTitle: null, castNumber: null }),
];

const STATS = {
  totalCars: 12,
  totalQuantity: 15,
  ownedCount: 10,
  wishlistCount: 2,
  totalSets: 3,
  setsOwned: 2,
  collectionValue: 1234.5,
  byManufacturer: [],
  byVehicleType: [],
  recentlyAdded: [],
};

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/collection/vehicles" element={<div>Vehicles list</div>} />
          <Route path="/collection/vehicles/add" element={<div>Add vehicle page</div>} />
          <Route path="/collection/sets/add" element={<div>Add set page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const USER = { id: 1, username: "admin", currency: "USD", overviewLayout: null };

beforeEach(() => {
  vi.spyOn(authApi, "isAuthenticated").mockReturnValue(true);
  vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(USER);
  vi.spyOn(dashboardApi, "getDashboardStats").mockResolvedValue(STATS);
  vi.spyOn(carsApi, "listCars").mockResolvedValue(CARS);
  vi.spyOn(setsApi, "listSets").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("InsightsPage", () => {
  it("shows the headline stats and the breakdowns", async () => {
    renderAt("/insights");

    expect(await screen.findByText("Total vehicles")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Insights" })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("$1,235")).toBeInTheDocument();

    const series = (await screen.findByRole("heading", { name: "Top series" })).parentElement!
      .parentElement!;
    expect(await within(series).findByRole("link", { name: /HW Exotics/ })).toHaveAttribute(
      "href",
      "/collection/series/7"
    );
  });
});

describe("OverviewPage", () => {
  it("counts the collection and what needs attention", async () => {
    renderAt("/");

    // Three vehicles, three pieces owned (1 + 2).
    expect(await screen.findByText("3 pieces owned")).toBeInTheDocument();
    const missingPhoto = screen.getByText("Missing photo").closest("button")!;
    expect(within(missingPhoto).getByText("1")).toBeInTheDocument();
  });

  it("opens the add flows from Quick add", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.click(await screen.findByRole("button", { name: /add a set/i }));
    expect(await screen.findByText("Add set page")).toBeInTheDocument();
  });

  it("opens the Vehicles list from a Needs attention tile", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.click((await screen.findByText("No toy number")).closest("button")!);
    expect(await screen.findByText("Vehicles list")).toBeInTheDocument();
  });

  it("follows the saved layout: order, and hidden sections left out", async () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
      ...USER,
      overviewLayout: [
        { key: "needsAttention", hidden: false },
        { key: "stats", hidden: false },
        { key: "quickAdd", hidden: true },
        { key: "recentlyAdded", hidden: false },
        { key: "wishlist", hidden: false },
      ],
    });
    renderAt("/");

    expect(await screen.findByText("Missing photo")).toBeInTheDocument();
    // The account loads after the first render, which shows the default layout.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /add a set/i })).not.toBeInTheDocument()
    );
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings.indexOf("Needs attention")).toBeLessThan(headings.indexOf("Summary tiles"));
  });

  it("hides a section and saves the layout from Customize", async () => {
    const save = vi
      .spyOn(authApi, "updatePreferences")
      .mockImplementation(async (preferences) => ({
        ...USER,
        overviewLayout: preferences.overviewLayout ?? null,
      }));
    const user = userEvent.setup();
    renderAt("/");

    await user.click(await screen.findByRole("button", { name: "Customize" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("checkbox", { name: "Show Quick add" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(save).toHaveBeenCalled());
    const saved = save.mock.calls[0][0].overviewLayout!;
    expect(saved.find((section) => section.key === "quickAdd")?.hidden).toBe(true);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /add a set/i })).not.toBeInTheDocument()
    );
  });
});
