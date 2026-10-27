import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastContainer } from "react-toastify";
import * as carsApi from "../../api/cars";
import * as lookupsApi from "../../api/lookups";
import type { Car } from "../../api/types";
import CarList from "../CarList";

vi.mock("../../utils/download", () => ({ downloadBlob: vi.fn() }));

// VirtualCarGrid uses useWindowVirtualizer which needs a real viewport to measure rows.
// jsdom provides a zero-height window, so the virtualizer renders nothing. Replace it with
// a simple passthrough so CarList tests can actually see rendered car cards.
vi.mock("../VirtualCarGrid", () => ({
  default: ({
    items,
    getKey,
    renderItem,
  }: {
    items: unknown[];
    getKey: (item: unknown) => number;
    renderItem: (item: unknown) => React.ReactNode;
  }) => (
    <>
      {items.map((item) => (
        <div key={getKey(item)}>{renderItem(item)}</div>
      ))}
    </>
  ),
}));

const SAMPLE_CAR: Car = {
  id: 1,
  name: "Custom Camaro",
  manufacturerId: 1,
  manufacturerName: "Hot Wheels",
  seriesId: null,
  seriesName: null,
  vehicleTypeId: null,
  vehicleTypeName: null,
  colorId: null,
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
  catalogUrl: null,
  photo: null,
  photos: [],
  tags: [],
  sets: [],
};

function renderCarList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/collection/vehicles"]}>
        <Routes>
          <Route path="/collection/vehicles" element={<CarList />} />
          <Route path="/collection/vehicles/:id" element={<div>Car page</div>} />
        </Routes>
        <ToastContainer />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("CarList", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders cars returned by the API", async () => {
    vi.spyOn(carsApi, "listCars").mockResolvedValue([SAMPLE_CAR]);
    vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([{ id: 1, name: "Hot Wheels" }]);
    vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listColors").mockResolvedValue([]);
    renderCarList();

    expect(await screen.findByText("Custom Camaro")).toBeInTheDocument();
  });

  it("shows an empty state when there are no cars", async () => {
    vi.spyOn(carsApi, "listCars").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listColors").mockResolvedValue([]);
    renderCarList();

    expect(await screen.findByText("No vehicles found.")).toBeInTheDocument();
  });

  it("shows the Wishlisted badge and quantity, no delete button, and opens the car on click", async () => {
    vi.spyOn(carsApi, "listCars").mockResolvedValue([
      { ...SAMPLE_CAR, status: "wishlist", quantity: 3 },
    ]);
    vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listColors").mockResolvedValue([]);
    const user = userEvent.setup();
    renderCarList();

    await screen.findByText("Custom Camaro");
    // The heart badge (top-left) and the bare quantity, no "×" (bottom-left).
    expect(screen.getByLabelText("Wishlisted")).toBeInTheDocument();
    expect(screen.queryByLabelText("Owned")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Quantity")).toHaveTextContent(/^3$/);
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    // Added by hand, so it carries the Custom chip.
    expect(screen.getByText("Custom")).toBeInTheDocument();

    await user.click(screen.getByText("Custom Camaro"));
    await waitFor(() => expect(screen.getByText("Car page")).toBeInTheDocument());
  });

  it("leaves the Custom chip off vehicles matched to the wiki", async () => {
    vi.spyOn(carsApi, "listCars").mockResolvedValue([
      { ...SAMPLE_CAR, catalogSource: "hotwheels", catalogTitle: "Custom Camaro" },
    ]);
    vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listColors").mockResolvedValue([]);
    renderCarList();

    await screen.findByText("Custom Camaro");
    expect(screen.queryByText("Custom")).not.toBeInTheDocument();
  });
});
