import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "../../api/auth";
import SettingsPage from "../SettingsPage";

function renderSettings() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/settings"]}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.spyOn(authApi, "isAuthenticated").mockReturnValue(true);
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({ id: 1, username: "eric" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the account, display and data sections with the Lookups sub-nav", async () => {
    renderSettings();

    expect(await screen.findByText("eric")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Dark mode" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "High contrast" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Blue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Lookups" })).toHaveAttribute(
      "href",
      "/settings/lookups"
    );
  });

  it("logs out and goes to the login page", async () => {
    const logoutSpy = vi.spyOn(authApi, "logout").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(logoutSpy).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("Login page")).toBeInTheDocument());
  });
});
