import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { activeDestination, isPathWithin } from "../destinations";
import NavDrawer from "../NavDrawer";

describe("destinations", () => {
  it("matches a section and everything under it, but '/' only exactly", () => {
    expect(isPathWithin("/collection/cars/3/edit", "/collection/cars")).toBe(true);
    expect(isPathWithin("/collection/carsx", "/collection/cars")).toBe(false);
    expect(isPathWithin("/settings", "/")).toBe(false);
    expect(isPathWithin("/", "/")).toBe(true);
  });

  it("picks the top-level destination for nested pages", () => {
    expect(activeDestination("/collection/sets/add/catalog")?.labelKey).toBe("nav.collection");
    expect(activeDestination("/")?.labelKey).toBe("nav.dashboard");
    expect(activeDestination("/settings")?.labelKey).toBe("nav.settings");
  });
});

describe("NavDrawer", () => {
  function renderAt(path: string) {
    render(
      <MemoryRouter initialEntries={[path]}>
        <NavDrawer />
      </MemoryRouter>
    );
  }

  it("highlights the sub-item you're in rather than its section", () => {
    renderAt("/collection/sets/4/edit");

    expect(screen.getByRole("link", { name: "Sets" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Collection" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Cars" })).not.toHaveAttribute("aria-current");
  });

  it("highlights the section itself on its overview page", () => {
    renderAt("/collection");

    expect(screen.getByRole("link", { name: "Collection" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
