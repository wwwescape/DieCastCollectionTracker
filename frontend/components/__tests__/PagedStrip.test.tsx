import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import PagedStrip from "../PagedStrip";

describe("PagedStrip", () => {
  it("pages the row with < and > beside the title's own links", () => {
    render(
      <MemoryRouter>
        <PagedStrip
          title="Wishlist"
          action={<a href="/wishlist">View all</a>}
          items={[
            { key: 1, to: "/collection/vehicles/1", photo: null, title: "Bone Shaker" },
            { key: 2, to: "/collection/vehicles/2", photo: null, title: "Twin Mill" },
          ]}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Wishlist" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toBeInTheDocument();
    // At the start of the row there's nothing before it to page back to.
    expect(screen.getByRole("button", { name: "Scroll previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Scroll next" })).toBeInTheDocument();
    expect(screen.getByText("Twin Mill")).toBeInTheDocument();
  });
});
