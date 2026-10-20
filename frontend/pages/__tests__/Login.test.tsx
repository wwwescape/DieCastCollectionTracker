import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "../../api/auth";
import Login from "../Login";

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Login", () => {
  beforeEach(() => {
    vi.spyOn(authApi, "fetchSetupStatus").mockResolvedValue({ setupRequired: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits the entered credentials and navigates to / on success", async () => {
    const loginSpy = vi.spyOn(authApi, "login").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLogin();

    // MUI renders the required-field asterisk as part of the label's text content
    // ("Username *"), so an exact-match getByLabelText("Username") never matches.
    await user.type(await screen.findByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(loginSpy).toHaveBeenCalledWith("admin", "secret");
    await waitFor(() => expect(screen.getByText("Home page")).toBeInTheDocument());
  });

  it("shows an error alert when login fails", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(new Error("Invalid credentials"));
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid username or password.")).toBeInTheDocument();
  });

  it("shows the create-admin form when no account exists and signs in on submit", async () => {
    vi.spyOn(authApi, "fetchSetupStatus").mockResolvedValue({ setupRequired: true });
    const setupSpy = vi.spyOn(authApi, "setupAdmin").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/^password/i), "a-strong-password");
    await user.type(screen.getByLabelText(/confirm password/i), "a-strong-password");
    await user.click(screen.getByRole("button", { name: /create admin account/i }));

    expect(setupSpy).toHaveBeenCalledWith("admin", "a-strong-password");
    await waitFor(() => expect(screen.getByText("Home page")).toBeInTheDocument());
  });

  it("blocks create-admin submit while the passwords don't match", async () => {
    vi.spyOn(authApi, "fetchSetupStatus").mockResolvedValue({ setupRequired: true });
    const setupSpy = vi.spyOn(authApi, "setupAdmin").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/^password/i), "a-strong-password");
    await user.type(screen.getByLabelText(/confirm password/i), "something-else");

    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create admin account/i })).toBeDisabled();
    expect(setupSpy).not.toHaveBeenCalled();
  });
});
