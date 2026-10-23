import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import i18next from "../index";
import Sidebar from "../../navigation/Sidebar";

vi.mock("../../hooks/useCars", () => ({ useCarList: () => ({ data: [] }) }));
vi.mock("../../hooks/useSets", () => ({ useSetList: () => ({ data: [] }) }));
vi.mock("../../hooks/useVersion", () => ({ useVersion: () => ({ data: undefined }) }));

describe("language switching", () => {
  afterEach(async () => {
    await act(() => i18next.changeLanguage("en"));
  });

  it.each([
    ["es", "Configuración"],
    ["fr", "Paramètres"],
    ["pt", "Definições"],
  ])("renders the UI in %s", async (language, settings) => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();

    await act(() => i18next.changeLanguage(language));

    expect(screen.getByRole("link", { name: settings })).toBeInTheDocument();
  });
});
