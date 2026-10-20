import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as lookupsApi from "../../api/lookups";
import * as tagsApi from "../../api/tags";
import AddCarPage, { type AddCarLocationState } from "../AddCarPage";

const prefillState: AddCarLocationState = {
  prefill: {
    name: "Pass'n Gasser",
    manufacturer: "Hot Wheels",
    catalogSource: "hotwheels",
    catalogTitle: "Pass'n Gasser",
  },
};

const CastingPage = () => {
  const location = useLocation();
  return <div>Casting page {location.search}</div>;
};

function renderAddCar(state?: AddCarLocationState) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: "/collection/vehicles/add", state }]}>
        <Routes>
          <Route path="/collection/vehicles/add" element={<AddCarPage />} />
          <Route path="/collection/vehicles/add/catalog" element={<CastingPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AddCarPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listColors").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listSeries").mockResolvedValue([]);
    vi.spyOn(tagsApi, "listTags").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the wiki catalog tab selected while showing a version picked from the catalog", () => {
    renderAddCar(prefillState);

    expect(screen.getByRole("radio", { name: "From wiki catalog" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Manually" })).not.toBeChecked();
    expect(screen.getByLabelText(/^name/i)).toHaveValue("Pass'n Gasser");
    expect(screen.queryByLabelText(/search by name or toy number/i)).not.toBeInTheDocument();
  });

  it("goes back to the casting's versions from the pre-filled form", async () => {
    sessionStorage.setItem("addCar.catalogQuery", "gasser");
    const user = userEvent.setup();
    renderAddCar(prefillState);

    await user.click(screen.getByRole("button", { name: /back to versions/i }));

    expect(
      screen.getByText(
        `Casting page ?${new URLSearchParams({ source: "hotwheels", title: "Pass'n Gasser", q: "gasser" })}`
      )
    ).toBeInTheDocument();
  });

  it("shows a blank form when switching to Manually after a catalog pick", async () => {
    const user = userEvent.setup();
    renderAddCar(prefillState);

    await user.click(screen.getByRole("radio", { name: "Manually" }));

    expect(screen.getByLabelText(/^name/i)).toHaveValue("");
  });

  it("shows the catalog search without a pre-filled version", () => {
    renderAddCar();

    expect(screen.getByRole("radio", { name: "From wiki catalog" })).toBeChecked();
    expect(screen.getByLabelText(/search by name or toy number/i)).toBeInTheDocument();
  });
});
