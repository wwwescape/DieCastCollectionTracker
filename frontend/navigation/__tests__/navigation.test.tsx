import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { activeDestination, isPathWithin } from "../destinations";
import Sidebar from "../Sidebar";

vi.mock("../../hooks/useCars", () => ({ useCarList: () => ({ data: [{ id: 1 }, { id: 2 }] }) }));
vi.mock("../../hooks/useSets", () => ({ useSetList: () => ({ data: [{ id: 1 }] }) }));
vi.mock("../../hooks/useVersion", () => ({
  useVersion: () => ({ data: { currentVersion: "1.8.0" } }),
}));

describe("destinations", () => {
  it("matches a section and everything under it, but '/' only exactly", () => {
    expect(isPathWithin("/collection/vehicles/3/edit", "/collection/vehicles")).toBe(true);
    expect(isPathWithin("/collection/vehiclesx", "/collection/vehicles")).toBe(false);
    expect(isPathWithin("/settings", "/")).toBe(false);
    expect(isPathWithin("/", "/")).toBe(true);
  });

  it("picks the destination for nested pages", () => {
    expect(activeDestination("/collection/sets/add/catalog")?.labelKey).toBe("nav.sets");
    expect(activeDestination("/")?.labelKey).toBe("nav.overview");
    expect(activeDestination("/settings/lookups")?.labelKey).toBe("nav.settings");
  });
});

describe("Sidebar", () => {
  function renderAt(path: string) {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <Sidebar />
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  it("highlights the section you're in and shows its sub-pages", () => {
    renderAt("/collection/sets/4/edit");

    expect(screen.getByRole("link", { name: /^Sets/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /^Vehicles/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Add set" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("link", { name: "Add vehicle" })).not.toBeInTheDocument();
  });

  it("highlights a sub-page instead of its parent", () => {
    renderAt("/collection/vehicles/add/catalog");

    expect(screen.getByRole("link", { name: "Add vehicle" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: /^Vehicles/ })).not.toHaveAttribute("aria-current");
  });

  it("shows collection counts and the version", () => {
    renderAt("/");

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Vehicles 2" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sets 1" })).toBeInTheDocument();
    expect(screen.getByText("v1.8.0")).toBeInTheDocument();
  });
});
