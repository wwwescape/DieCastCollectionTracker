import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as lookupsApi from "../../api/lookups";
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
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm(onSubmit);

    // MUI renders the required-field asterisk as part of the label's text content
    // ("Name *"), so an exact-match getByLabelText("Name") never matches.
    await user.type(screen.getByLabelText(/^name/i), "  Custom Camaro  ");
    await user.type(screen.getByLabelText(/manufacturer/i), "Hot Wheels");
    await user.click(screen.getByRole("button", { name: "Add Car" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Custom Camaro", manufacturer: "Hot Wheels", status: "owned", quantity: 1 })
    );
  });
});
