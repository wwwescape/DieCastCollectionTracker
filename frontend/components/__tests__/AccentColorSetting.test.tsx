import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorModeProvider } from "../../theme/ColorModeProvider";
import { buildM3Scheme } from "../../theme/m3Colors";
import AccentColorSetting from "../AccentColorSetting";

const STORAGE_KEY = "dct.accentColor";

function renderSetting() {
  return render(
    <ColorModeProvider>
      <AccentColorSetting />
    </ColorModeProvider>
  );
}

// jsdom here has no usable localStorage, so give the provider a small in-memory one.
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => Array.from(items.keys())[index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

const themeColorMeta = () => document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;

describe("AccentColorSetting", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#1F67D8";
    document.head.appendChild(meta);
  });

  afterEach(() => {
    themeColorMeta()?.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("names every swatch and marks the default blue as selected", () => {
    renderSetting();

    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Racing red" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByLabelText("Custom color", { selector: "input" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset color" })).not.toBeInTheDocument();
  });

  it("applies and remembers a preset, and updates the browser theme color", () => {
    renderSetting();

    fireEvent.click(screen.getByRole("button", { name: "Teal" }));

    expect(screen.getByRole("button", { name: "Teal" })).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("#00897b");
    expect(themeColorMeta().content).toBe("#00897b");
  });

  it("resets to the default, which isn't stored", () => {
    localStorage.setItem(STORAGE_KEY, "#e10600");
    renderSetting();
    expect(screen.getByRole("button", { name: "Racing red" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset color" }));

    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("falls back to the default for an invalid stored value", () => {
    localStorage.setItem(STORAGE_KEY, "not-a-color");
    renderSetting();

    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "true");
  });

  it("applies a custom color once the picker settles", () => {
    vi.useFakeTimers();
    renderSetting();

    fireEvent.change(screen.getByLabelText("Custom color", { selector: "input" }), {
      target: { value: "#123456" },
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe("#123456");
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("buildM3Scheme", () => {
  it("uses the logo blue as light-mode primary with the default accent", () => {
    expect(buildM3Scheme("light", "normal").primary).toBe("#1F67D8");
  });

  it("keeps generated tones for dark mode, high contrast and other accents", () => {
    expect(buildM3Scheme("dark", "normal").primary).not.toBe("#1F67D8");
    expect(buildM3Scheme("light", "high").primary).not.toBe("#1F67D8");
    expect(buildM3Scheme("light", "normal", "#00897b").primary).not.toBe("#00897b");
  });
});
