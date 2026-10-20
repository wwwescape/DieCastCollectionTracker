import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import i18next from "../index";
import DashboardPage from "../../pages/DashboardPage";

describe("language switching", () => {
  afterEach(async () => {
    await act(() => i18next.changeLanguage("en"));
  });

  it.each([
    ["es", "Bienvenido a DieCastCollectionTracker"],
    ["fr", "Bienvenue dans DieCastCollectionTracker"],
    ["pt", "Bem-vindo ao DieCastCollectionTracker"],
  ])("renders the UI in %s", async (language, welcome) => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading")).toHaveTextContent("Welcome to DieCastCollectionTracker");

    await act(() => i18next.changeLanguage(language));

    expect(screen.getByRole("heading")).toHaveTextContent(welcome);
  });
});
