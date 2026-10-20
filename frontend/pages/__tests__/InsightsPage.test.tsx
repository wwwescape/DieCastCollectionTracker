import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as dashboardApi from "../../api/dashboard";
import CollectionPage from "../CollectionPage";
import DashboardPage from "../DashboardPage";
import InsightsPage from "../InsightsPage";

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/collection/vehicles/add" element={<div>Add vehicle page</div>} />
          <Route path="/collection/sets/add" element={<div>Add set page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("InsightsPage", () => {
  it("shows the vehicle and set stats", async () => {
    vi.spyOn(dashboardApi, "getDashboardStats").mockResolvedValue({
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
    });
    renderAt("/insights");

    expect(await screen.findByText("Total Vehicles")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Insights" })).toBeInTheDocument();
    expect(screen.getByText("Sets Owned")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Collection Value")).toBeInTheDocument();
    expect(screen.getByText("$1,235")).toBeInTheDocument();
  });
});

describe("CollectionPage", () => {
  it("offers Add Vehicle and Add Set instead of stats", async () => {
    const getStats = vi.spyOn(dashboardApi, "getDashboardStats");
    const user = userEvent.setup();
    renderAt("/collection");

    expect(screen.queryByText("Total Vehicles")).not.toBeInTheDocument();
    expect(getStats).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Vehicles" })).toHaveAttribute(
      "href",
      "/collection/vehicles"
    );

    await user.click(screen.getByRole("button", { name: /add vehicle/i }));
    expect(await screen.findByText("Add vehicle page")).toBeInTheDocument();
  });

  it("goes to Add Set", async () => {
    const user = userEvent.setup();
    renderAt("/collection");

    await user.click(screen.getByRole("button", { name: /add set/i }));

    expect(await screen.findByText("Add set page")).toBeInTheDocument();
  });
});

describe("DashboardPage", () => {
  it("only welcomes the user for now", () => {
    render(<DashboardPage />);

    expect(
      screen.getByRole("heading", { name: "Welcome to DieCastCollectionTracker" })
    ).toBeInTheDocument();
  });
});
