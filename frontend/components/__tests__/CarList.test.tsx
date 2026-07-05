import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
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
  default: ({ items, getKey, renderItem }: {
    items: unknown[];
    getKey: (item: unknown) => number;
    renderItem: (item: unknown) => React.ReactNode;
  }) => <>{items.map((item) => <div key={getKey(item)}>{renderItem(item)}</div>)}</>,
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
  photo: null,
  photos: [],
  tags: [],
};

function renderCarList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CarList />
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

    expect(await screen.findByText("No cars found.")).toBeInTheDocument();
  });

  it("hides the car immediately and shows undo toast when Delete is clicked", async () => {
    vi.spyOn(carsApi, "listCars").mockResolvedValue([SAMPLE_CAR]);
    vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([{ id: 1, name: "Hot Wheels" }]);
    vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listColors").mockResolvedValue([]);
    vi.spyOn(carsApi, "deleteCar").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderCarList();

    await screen.findByText("Custom Camaro");
    await user.click(screen.getByRole("button", { name: "Delete Custom Camaro" }));

    // Car is hidden optimistically before the timer fires
    expect(screen.queryByText("Custom Camaro")).not.toBeInTheDocument();
    // Undo button is present in the toast
    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
  });

  it("restores the car when Undo is clicked in the toast", async () => {
    vi.spyOn(carsApi, "listCars").mockResolvedValue([SAMPLE_CAR]);
    vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([{ id: 1, name: "Hot Wheels" }]);
    vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listColors").mockResolvedValue([]);
    const deleteSpy = vi.spyOn(carsApi, "deleteCar").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderCarList();

    await screen.findByText("Custom Camaro");
    await user.click(screen.getByRole("button", { name: "Delete Custom Camaro" }));
    await user.click(screen.getByRole("button", { name: /undo/i }));

    // Car is visible again
    await waitFor(() => expect(screen.getByText("Custom Camaro")).toBeInTheDocument());
    // deleteCar was never called (undo fired before the 5s grace period)
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
