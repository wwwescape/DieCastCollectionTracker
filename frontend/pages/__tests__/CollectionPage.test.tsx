import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as dashboardApi from "../../api/dashboard";
import CollectionPage from "../CollectionPage";
import DashboardPage from "../DashboardPage";

describe("CollectionPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the car and set stats with the Cars/Sets sub-nav", async () => {
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
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/collection"]}>
          <CollectionPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Total Cars")).toBeInTheDocument();
    expect(screen.getByText("Sets Owned")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Collection Value")).toBeInTheDocument();
    expect(screen.getByText("$1,235")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Cars" })).toHaveAttribute("href", "/collection/cars");
    expect(screen.getByRole("link", { name: "Sets" })).toHaveAttribute("href", "/collection/sets");
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
