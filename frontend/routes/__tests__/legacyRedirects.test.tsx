import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegacyCollectionCarsRedirect, LegacyPublicCarsRedirect } from "../../router";

const Where = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
};

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/collection/cars/*" element={<LegacyCollectionCarsRedirect />} />
        <Route path="/public/:token/cars" element={<LegacyPublicCarsRedirect />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("v1.3.0 car links", () => {
  it.each([
    ["/collection/cars", "/collection/vehicles"],
    ["/collection/cars/12/edit", "/collection/vehicles/12/edit"],
    [
      "/collection/cars/add/catalog?source=hotwheels&q=hyw18",
      "/collection/vehicles/add/catalog?source=hotwheels&q=hyw18",
    ],
    ["/public/abc123/cars", "/public/abc123/vehicles"],
  ])("%s redirects to %s", (from, to) => {
    renderAt(from);

    expect(screen.getByTestId("where")).toHaveTextContent(to);
  });
});
