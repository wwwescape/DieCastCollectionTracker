import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits the entered credentials and navigates to / on success", async () => {
    const loginSpy = vi.spyOn(authApi, "login").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLogin();

    // MUI renders the required-field asterisk as part of the label's text content
    // ("Username *"), so an exact-match getByLabelText("Username") never matches.
    await user.type(screen.getByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(loginSpy).toHaveBeenCalledWith("admin", "secret");
    await waitFor(() => expect(screen.getByText("Home page")).toBeInTheDocument());
  });

  it("shows an error alert when login fails", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(new Error("Invalid credentials"));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid username or password.")).toBeInTheDocument();
  });
});
