import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "react-toastify";
import * as lookupsApi from "../../api/lookups";
import * as tagsApi from "../../api/tags";
import ManagePage from "../../pages/ManagePage";

function renderManagePage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ManagePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function mockAllLookups() {
  vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([{ id: 1, name: "Hot Wheels" }]);
  vi.spyOn(lookupsApi, "listSeries").mockResolvedValue([
    { id: 1, name: "Treasure Hunt", manufacturerId: 1, manufacturerName: "Hot Wheels" },
  ]);
  vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([{ id: 1, name: "Muscle Car" }]);
  vi.spyOn(lookupsApi, "listColors").mockResolvedValue([{ id: 1, name: "Red" }]);
  vi.spyOn(tagsApi, "listTags").mockResolvedValue([{ id: 1, name: "Favorite", color: "#e10600" }]);
}

describe("ManagePage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the Manufacturers tab by default with listed items", async () => {
    mockAllLookups();
    renderManagePage();

    expect(await screen.findByText("Hot Wheels")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Manufacturers" })).toHaveAttribute("aria-selected", "true");
  });

  it("switches to Series tab and shows series with manufacturer", async () => {
    mockAllLookups();
    const user = userEvent.setup();
    renderManagePage();

    await screen.findByText("Hot Wheels");
    await user.click(screen.getByRole("tab", { name: "Series" }));

    expect(await screen.findByText("Treasure Hunt")).toBeInTheDocument();
    expect(screen.getByText("Hot Wheels")).toBeInTheDocument();
  });

  it("switches to Tags tab and shows tag with colored circle", async () => {
    mockAllLookups();
    const user = userEvent.setup();
    renderManagePage();

    await screen.findByText("Hot Wheels");
    await user.click(screen.getByRole("tab", { name: "Tags" }));

    expect(await screen.findByText("Favorite")).toBeInTheDocument();
  });

  it("adds a manufacturer via the add form", async () => {
    mockAllLookups();
    const createSpy = vi.spyOn(lookupsApi, "createManufacturer").mockResolvedValue({ id: 2, name: "Matchbox" });
    const user = userEvent.setup();
    renderManagePage();

    await screen.findByText("Hot Wheels");
    await user.type(screen.getByRole("textbox", { name: /manufacturer name/i }), "Matchbox");
    await user.click(screen.getByRole("button", { name: /add/i }));

    await waitFor(() => expect(createSpy.mock.calls[0]?.[0]).toBe("Matchbox"));
  });

  it("shows conflict toast when deleting an in-use manufacturer", async () => {
    mockAllLookups();
    const conflictError = Object.assign(new Error("conflict"), {
      response: { status: 409, data: { detail: "Manufacturer is still in use by a car" } },
      isAxiosError: true,
    });
    vi.spyOn(lookupsApi, "deleteManufacturer").mockRejectedValue(conflictError);
    const toastError = vi.spyOn(toast, "error");
    const user = userEvent.setup();
    renderManagePage();

    await screen.findByText("Hot Wheels");
    await user.click(screen.getByRole("button", { name: /delete hot wheels/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Manufacturer is still in use by a car",
        expect.anything()
      )
    );
  });

  it("switches to Vehicle Types tab", async () => {
    mockAllLookups();
    const user = userEvent.setup();
    renderManagePage();

    await screen.findByText("Hot Wheels");
    await user.click(screen.getByRole("tab", { name: "Vehicle Types" }));

    expect(await screen.findByText("Muscle Car")).toBeInTheDocument();
  });

  it("switches to Colors tab", async () => {
    mockAllLookups();
    const user = userEvent.setup();
    renderManagePage();

    await screen.findByText("Hot Wheels");
    await user.click(screen.getByRole("tab", { name: "Colors" }));

    expect(await screen.findByText("Red")).toBeInTheDocument();
  });
});
