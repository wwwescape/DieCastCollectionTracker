import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastContainer } from "react-toastify";
import * as carsApi from "../../api/cars";
import * as lookupsApi from "../../api/lookups";
import * as setsApi from "../../api/sets";
import * as tagsApi from "../../api/tags";
import type { Car, CarSet } from "../../api/types";
import CarList from "../CarList";
import SetList from "../SetList";

// jsdom has no viewport for the virtualizer; render every card instead.
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

const car = (id: number, name: string): Car =>
  ({
    id,
    name,
    manufacturerId: 1,
    manufacturerName: "Hot Wheels",
    seriesName: null,
    status: "owned",
    condition: null,
    quantity: 1,
    photo: null,
    photos: [],
    tags: [],
    sets: [],
    catalogTitle: null,
  }) as unknown as Car;

const CARS = [car(1, "Skyline"), car(2, "Supra"), car(3, "Camaro")];

function renderPage(page: "vehicles" | "sets" = "vehicles") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/collection/${page}`]}>
        <Routes>
          <Route path="/collection/vehicles" element={<CarList />} />
          <Route path="/collection/sets" element={<SetList />} />
        </Routes>
        <ToastContainer />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Clicks land on the card's name, inside its clickable area (the card root itself isn't).
// These drive dialogs and autocompletes end to end; give them room on a busy test run.
const SLOW_UI = { timeout: 20_000 };

const cardFor = async (name: string) => screen.findByText(name);

describe("Vehicles list toolbar", SLOW_UI, () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.spyOn(carsApi, "listCars").mockResolvedValue(CARS);
    vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([{ id: 1, name: "Hot Wheels" }]);
    vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listColors").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listSeries").mockResolvedValue([]);
    vi.spyOn(tagsApi, "listTags").mockResolvedValue([{ id: 5, name: "JDM", color: null }]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the picked filter values and Exclude, and counts them on the badge", async () => {
    const listSpy = vi.mocked(carsApi.listCars);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Skyline");

    await user.click(screen.getByRole("button", { name: "Filters & sort" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox", { name: "Status" }));
    await user.click(await screen.findByRole("option", { name: "Wishlisted" }));
    await user.click(within(dialog).getByRole("combobox", { name: "Tags" }));
    await user.click(await screen.findByRole("option", { name: "JDM" }));
    const statusExclude = within(dialog).getAllByRole("checkbox", { name: "Exclude" })[0];
    await user.click(statusExclude);

    await waitFor(() =>
      expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: ["wishlist"],
          statusExclude: true,
          tagId: [5],
          tagExclude: false,
          sort: "name",
          order: "asc",
        })
      )
    );
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    // The page stays aria-hidden until the dialog's exit transition ends.
    expect(
      within(await screen.findByRole("button", { name: "Filters & sort" })).getByText("2")
    ).toBeInTheDocument();
  });

  it("remembers the search and filters for the session", async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();
    await screen.findByText("Skyline");
    await user.type(screen.getByRole("textbox", { name: "Search" }), "sky");
    unmount();

    renderPage();
    expect(await screen.findByRole("textbox", { name: "Search" })).toHaveValue("sky");
  });

  it("sets the status of every selected vehicle in one request", async () => {
    const bulkSpy = vi.spyOn(carsApi, "bulkEditCars").mockResolvedValue({ count: 2 });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Select vehicles" }));
    await user.click(await cardFor("Skyline"));
    await user.click(await cardFor("Camaro"));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "More bulk actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Set status" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Applies to 2 selected items.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Wishlisted" }));
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(bulkSpy).toHaveBeenCalledTimes(1));
    expect(bulkSpy.mock.calls[0][0]).toEqual({ ids: [1, 3], status: "wishlist" });
    expect(await screen.findByText("Updated 2 items.")).toBeInTheDocument();
    // Selection mode ends once the change is applied.
    expect(await screen.findByRole("button", { name: "Select vehicles" })).toBeInTheDocument();
  });

  it("clears the condition when 'Not specified' is applied", async () => {
    const bulkSpy = vi.spyOn(carsApi, "bulkEditCars").mockResolvedValue({ count: 1 });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Select vehicles" }));
    await user.click(await cardFor("Supra"));
    await user.click(screen.getByRole("button", { name: "More bulk actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Set condition" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Apply" })
    );

    // TanStack Query passes its own context as a second argument; check the first.
    await waitFor(() => expect(bulkSpy).toHaveBeenCalledTimes(1));
    expect(bulkSpy.mock.calls[0][0]).toEqual({ ids: [2], condition: null });
  });

  it("adds a ticked tag and a brand-new one to the selection", async () => {
    vi.spyOn(tagsApi, "getTagCoverage").mockResolvedValue([
      { id: 5, name: "JDM", color: null, count: 1 },
    ]);
    const bulkSpy = vi.spyOn(carsApi, "bulkEditCars").mockResolvedValue({ count: 2 });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Select vehicles" }));
    await user.click(screen.getByRole("button", { name: "Select all" }));
    await user.click(screen.getByRole("button", { name: "More bulk actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Tags" }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("1 of 3")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("checkbox", { name: "JDM" }));
    await user.type(within(dialog).getByPlaceholderText("New tag name"), "Keepers{Enter}");
    await user.click(within(dialog).getByRole("button", { name: "Add tags" }));

    // TanStack Query passes its own context as a second argument; check the first.
    await waitFor(() => expect(bulkSpy).toHaveBeenCalledTimes(1));
    expect(bulkSpy.mock.calls[0][0]).toEqual({ ids: [1, 2, 3], addTags: ["JDM", "Keepers"] });
  });

  it("removes the selection after confirming", async () => {
    const deleteSpy = vi.spyOn(carsApi, "bulkDeleteCars").mockResolvedValue({ count: 1 });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Select vehicles" }));
    await user.click(await cardFor("Camaro"));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Remove 1 item?")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    // TanStack Query passes its own context as a second argument; check the first.
    await waitFor(() => expect(deleteSpy).toHaveBeenCalledTimes(1));
    expect(deleteSpy.mock.calls[0][0]).toEqual([3]);
  });
});

describe("Sets list toolbar", SLOW_UI, () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listSeries").mockResolvedValue([]);
    vi.spyOn(tagsApi, "listTags").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("filters by type and sealed state, and bulk-edits sets", async () => {
    const listSpy = vi.spyOn(setsApi, "listSets").mockResolvedValue([
      {
        id: 7,
        name: "Fire Station",
        manufacturerName: "Hot Wheels",
        year: 2020,
        status: "owned",
        photo: null,
        setType: "playset",
        contents: [],
        sealed: true,
        quantity: 1,
        catalogTitle: null,
      } as unknown as CarSet,
    ]);
    const bulkSpy = vi.spyOn(setsApi, "bulkEditSets").mockResolvedValue({ count: 1 });
    const user = userEvent.setup();
    renderPage("sets");
    await screen.findByText("Fire Station");

    await user.click(screen.getByRole("button", { name: "Filters & sort" }));
    const filters = await screen.findByRole("dialog");
    await user.click(within(filters).getByRole("combobox", { name: "Type" }));
    await user.click(await screen.findByRole("option", { name: "Track set" }));
    await user.click(within(filters).getByRole("combobox", { name: "Sealed" }));
    await user.click(await screen.findByRole("option", { name: "Opened" }));
    await waitFor(() =>
      expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ setType: ["track_set"], sealed: ["opened"] })
      )
    );
    await user.click(within(filters).getByRole("button", { name: "Clear filters" }));
    await user.click(within(filters).getByRole("button", { name: "Close" }));

    await user.click(await screen.findByRole("button", { name: "Select sets" }));
    await user.click(await cardFor("Fire Station"));
    await user.click(screen.getByRole("button", { name: "More bulk actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Set series" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("combobox", { name: "Series" }), "City Sets");
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));

    // TanStack Query passes its own context as a second argument; check the first.
    await waitFor(() => expect(bulkSpy).toHaveBeenCalledTimes(1));
    expect(bulkSpy.mock.calls[0][0]).toEqual({ ids: [7], series: "City Sets" });
  });
});
