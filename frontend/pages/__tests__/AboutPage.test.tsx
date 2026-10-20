import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as versionApi from "../../api/version";
import UpdateAvailableChip from "../../components/UpdateAvailableChip";
import AboutPage from "../AboutPage";

function renderWithClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const CURRENT = {
  currentVersion: "1.3.0",
  latestVersion: "v1.3.0",
  updateAvailable: false,
  releaseUrl: "https://github.com/wwwescape/DieCastCollectionTracker/releases/tag/v1.3.0",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AboutPage", () => {
  it("shows the version, links and credits without nagging when up to date", async () => {
    vi.spyOn(versionApi, "getVersion").mockResolvedValue(CURRENT);
    renderWithClient(<AboutPage />);

    expect(await screen.findByText("Version 1.3.0")).toBeInTheDocument();
    expect(screen.queryByText("You're on the latest version")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Source code" })).toHaveAttribute(
      "href",
      "https://github.com/wwwescape/DieCastCollectionTracker"
    );
    expect(screen.getByRole("link", { name: "Hot Wheels Wiki" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Matchbox Wiki" })).toBeInTheDocument();
  });

  it("checks GitHub again on demand, bypassing the server cache", async () => {
    const getVersion = vi.spyOn(versionApi, "getVersion").mockResolvedValue(CURRENT);
    const user = userEvent.setup();
    renderWithClient(<AboutPage />);

    await user.click(await screen.findByRole("button", { name: "Check for updates" }));

    expect(await screen.findByText("You're on the latest version")).toBeInTheDocument();
    expect(getVersion.mock.calls.map((call) => call[0])).toEqual([false, true]);
  });

  it("links to a newer release", async () => {
    vi.spyOn(versionApi, "getVersion").mockResolvedValue({
      ...CURRENT,
      latestVersion: "v1.4.0",
      updateAvailable: true,
      releaseUrl: "https://example.com/v1.4.0",
    });
    renderWithClient(<AboutPage />);

    expect(
      await screen.findByRole("link", { name: "A new version is available: v1.4.0" })
    ).toHaveAttribute("href", "https://example.com/v1.4.0");
  });

  it("says when the check couldn't reach GitHub", async () => {
    vi.spyOn(versionApi, "getVersion").mockResolvedValue({
      ...CURRENT,
      latestVersion: null,
      releaseUrl: null,
    });
    const user = userEvent.setup();
    renderWithClient(<AboutPage />);

    await user.click(await screen.findByRole("button", { name: "Check for updates" }));

    expect(
      await screen.findByText("Couldn't check for updates. Try again later.")
    ).toBeInTheDocument();
  });
});

describe("UpdateAvailableChip", () => {
  it("only appears when a newer release exists", async () => {
    vi.spyOn(versionApi, "getVersion").mockResolvedValue({
      ...CURRENT,
      latestVersion: "v1.4.0",
      updateAvailable: true,
    });
    renderWithClient(<UpdateAvailableChip />);

    expect(await screen.findByText("New version available: v1.4.0")).toBeInTheDocument();
  });

  it("stays hidden when up to date", async () => {
    const getVersion = vi.spyOn(versionApi, "getVersion").mockResolvedValue(CURRENT);
    renderWithClient(<UpdateAvailableChip />);

    await waitFor(() => expect(getVersion).toHaveBeenCalled());
    expect(screen.queryByText(/New version available/)).not.toBeInTheDocument();
  });
});
