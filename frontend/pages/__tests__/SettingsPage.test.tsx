import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
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
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
      id: 1,
      username: "eric",
      currency: "USD",
      overviewLayout: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the account, display and data sections with the Lookups sub-nav", async () => {
    renderSettings();

    expect(await screen.findByText("eric")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Dark mode" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "High contrast" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Blue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "General" })).toHaveAttribute("aria-current", "page");
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

  describe("Change password", () => {
    const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
      renderSettings();
      await user.click(await screen.findByRole("button", { name: "Change password" }));
      return screen.findByRole("dialog");
    };

    it("changes the password once the new one is long enough and confirmed", async () => {
      const changeSpy = vi.spyOn(authApi, "changePassword").mockResolvedValue(undefined);
      const user = userEvent.setup();
      const dialog = await openDialog(user);
      const submit = within(dialog).getByRole("button", { name: "Change password" });

      await user.type(within(dialog).getByLabelText(/^current password/i), "old-password");
      await user.type(within(dialog).getByLabelText(/^new password/i), "short");
      expect(submit).toBeDisabled();
      await user.clear(within(dialog).getByLabelText(/^new password/i));
      await user.type(within(dialog).getByLabelText(/^new password/i), "brand-new-password");
      await user.type(within(dialog).getByLabelText(/^confirm new password/i), "brand-new-passwor");
      expect(within(dialog).getByText("The passwords don't match.")).toBeInTheDocument();
      expect(submit).toBeDisabled();
      await user.type(within(dialog).getByLabelText(/^confirm new password/i), "d");
      await user.click(submit);

      expect(changeSpy.mock.calls[0]?.slice(0, 2)).toEqual(["old-password", "brand-new-password"]);
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("says so when the current password is wrong", async () => {
      vi.spyOn(authApi, "changePassword").mockRejectedValue(
        new AxiosError("Bad Request", "ERR_BAD_REQUEST", undefined, undefined, {
          status: 400,
          statusText: "Bad Request",
          data: {},
          headers: {},
          config: { headers: new AxiosHeaders() },
        })
      );
      const user = userEvent.setup();
      const dialog = await openDialog(user);

      await user.type(within(dialog).getByLabelText(/^current password/i), "not-it");
      await user.type(within(dialog).getByLabelText(/^new password/i), "brand-new-password");
      await user.type(
        within(dialog).getByLabelText(/^confirm new password/i),
        "brand-new-password"
      );
      await user.click(within(dialog).getByRole("button", { name: "Change password" }));

      expect(
        await within(dialog).findByText("The current password is incorrect.")
      ).toBeInTheDocument();
    });
  });
});
