import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as catalogApi from "../../api/catalog";
import * as lookupsApi from "../../api/lookups";
import * as setsApi from "../../api/sets";
import type { CatalogSet } from "../../api/catalog";
import CatalogSetPage from "../../pages/CatalogSetPage";
import { catalogSetToFormValues } from "../../utils/catalog";
import AddSetPage, { type AddSetLocationState } from "../AddSetPage";
import SetForm from "../SetForm";

const FIRE_STATION: CatalogSet = {
  source: "hotwheels",
  title: "Fire Station (1996)",
  url: "https://hotwheels.fandom.com/wiki/Fire_Station_(1996)",
  manufacturer: "Hot Wheels",
  imageUrl: "https://static.wikia.nocookie.net/hotwheels/images/fire.png/revision/latest",
  setType: "playset",
  toyNumber: "16219",
  year: 1996,
  cars: [
    { name: "Fire Truck", color: "Red", photoUrl: null, thumbnailUrl: null },
    { name: "Rescue Duty", color: null, photoUrl: null, thumbnailUrl: null },
  ],
};

function withProviders(
  ui: React.ReactNode,
  entries: Parameters<typeof MemoryRouter>[0]["initialEntries"]
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

const LocationProbe = () => {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
};

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([]);
  vi.spyOn(setsApi, "listSets").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("catalogSetToFormValues", () => {
  it("drops the year suffix from the name and lists one car per line", () => {
    expect(catalogSetToFormValues(FIRE_STATION)).toMatchObject({
      name: "Fire Station",
      manufacturer: "Hot Wheels",
      setType: "playset",
      toyNumber: "16219",
      year: "1996",
      contents: "Fire Truck (Red)\nRescue Duty",
      catalogSource: "hotwheels",
      catalogTitle: "Fire Station (1996)",
    });
  });
});

describe("SetForm", () => {
  it("submits contents as a trimmed list without blank lines", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    withProviders(<SetForm submitLabel="Add Set" onSubmit={onSubmit} />, ["/"]);

    await user.type(screen.getByLabelText(/^name/i), "Action Garage");
    await user.type(screen.getByLabelText(/manufacturer/i), "Matchbox");
    await user.type(screen.getByLabelText(/vehicles included/i), " Jeep {enter}{enter}Land Rover ");
    await user.click(screen.getByRole("checkbox", { name: "Still sealed" }));
    await user.click(screen.getByRole("button", { name: "Add Set" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Action Garage",
        manufacturer: "Matchbox",
        setType: "playset",
        sealed: false,
        contents: ["Jeep", "Land Rover"],
      })
    );
  });
});

describe("AddSetPage", () => {
  const prefillState: AddSetLocationState = { prefill: catalogSetToFormValues(FIRE_STATION) };

  function renderAddSet(state?: AddSetLocationState) {
    withProviders(
      <Routes>
        <Route path="/collection/sets/add" element={<AddSetPage />} />
        <Route path="/collection/sets/add/catalog" element={<LocationProbe />} />
      </Routes>,
      [{ pathname: "/collection/sets/add", state }]
    );
  }

  it("shows a set picked on the wiki on the catalog tab, pre-filled", () => {
    renderAddSet(prefillState);

    expect(screen.getByRole("radio", { name: "From wiki catalog" })).toBeChecked();
    expect(screen.getByLabelText(/^name/i)).toHaveValue("Fire Station");
    expect(screen.getByLabelText(/toy number/i)).toHaveValue("16219");
  });

  it("goes back to the set's wiki page", async () => {
    const user = userEvent.setup();
    renderAddSet(prefillState);

    await user.click(screen.getByRole("button", { name: /back to set/i }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      `/collection/sets/add/catalog?${new URLSearchParams({ source: "hotwheels", title: FIRE_STATION.title })}`
    );
  });

  it("opens the wiki search, and a blank form under Manually", async () => {
    const user = userEvent.setup();
    renderAddSet();

    expect(screen.getByLabelText(/search by set name or toy number/i)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Manually" }));
    expect(screen.getByLabelText(/^name/i)).toHaveValue("");
  });
});

describe("CatalogSetPage", () => {
  it("lists the set's cars and adds it with the wiki photo copied", async () => {
    vi.spyOn(catalogApi, "getCatalogSet").mockResolvedValue(FIRE_STATION);
    const importSpy = vi
      .spyOn(catalogApi, "importWikiImage")
      .mockResolvedValue("/uploads/car-images/fire.jpg");
    const user = userEvent.setup();
    withProviders(
      <Routes>
        <Route path="/collection/sets/add/catalog" element={<CatalogSetPage />} />
        <Route path="/collection/sets/add" element={<AddSetPage />} />
      </Routes>,
      [
        `/collection/sets/add/catalog?${new URLSearchParams({ source: "hotwheels", title: FIRE_STATION.title })}`,
      ]
    );

    expect(await screen.findByText("Rescue Duty")).toBeInTheDocument();
    expect(screen.getByText(/Toy # 16219/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add this set" }));

    expect(importSpy.mock.calls[0]?.[0]).toBe(FIRE_STATION.imageUrl);
    await waitFor(() => expect(screen.getByLabelText(/^name/i)).toHaveValue("Fire Station"));
    expect(screen.getByAltText("Set photo preview")).toBeInTheDocument();
  });
});
