import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as lookupsApi from "../../api/lookups";
import * as setsApi from "../../api/sets";
import type { CarSet } from "../../api/types";
import * as tagsApi from "../../api/tags";
import CarForm from "../CarForm";

function renderForm(onSubmit: (input: unknown) => Promise<void>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CarForm submitLabel="Add Car" onSubmit={onSubmit} />
    </QueryClientProvider>
  );
}

describe("CarForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not submit when name or manufacturer is missing", async () => {
    vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listColors").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listSeries").mockResolvedValue([]);
    vi.spyOn(tagsApi, "listTags").mockResolvedValue([]);
    vi.spyOn(setsApi, "listSets").mockResolvedValue([]);
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm(onSubmit);

    await user.click(screen.getByRole("button", { name: "Add Car" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the trimmed form values once name and manufacturer are filled in", async () => {
    vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listColors").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listSeries").mockResolvedValue([]);
    vi.spyOn(tagsApi, "listTags").mockResolvedValue([]);
    vi.spyOn(setsApi, "listSets").mockResolvedValue([]);
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm(onSubmit);

    // MUI renders the required-field asterisk as part of the label's text content
    // ("Name *"), so an exact-match getByLabelText("Name") never matches.
    await user.type(screen.getByLabelText(/^name/i), "  Custom Camaro  ");
    await user.type(screen.getByLabelText(/manufacturer/i), "Hot Wheels");
    await user.click(screen.getByRole("button", { name: "Add Car" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Custom Camaro",
        manufacturer: "Hot Wheels",
        status: "owned",
        quantity: 1,
      })
    );
  });

  it("links the vehicle to sets picked from the collection", async () => {
    vi.spyOn(lookupsApi, "listManufacturers").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listVehicleTypes").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listColors").mockResolvedValue([]);
    vi.spyOn(lookupsApi, "listSeries").mockResolvedValue([]);
    vi.spyOn(tagsApi, "listTags").mockResolvedValue([]);
    vi.spyOn(setsApi, "listSets").mockResolvedValue([
      {
        id: 9,
        name: "Fire Station",
        manufacturerName: "Hot Wheels",
        year: 1996,
        photo: null,
      } as CarSet,
    ]);
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm(onSubmit);

    await user.type(screen.getByLabelText(/^name/i), "Fire Truck");
    await user.type(screen.getByLabelText(/manufacturer/i), "Hot Wheels");
    await user.click(screen.getByLabelText("Linked sets"));
    expect(await screen.findByText("Hot Wheels · 1996")).toBeInTheDocument();
    await user.click(screen.getByText("Fire Station"));
    await user.click(screen.getByRole("button", { name: "Add Car" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ setIds: [9] }));
  }, 15_000);
});
