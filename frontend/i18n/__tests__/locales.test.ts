import { describe, expect, it } from "vitest";
import en from "../../locales/en/translation.json";
import es from "../../locales/es/translation.json";
import fr from "../../locales/fr/translation.json";
import pt from "../../locales/pt/translation.json";

type Bundle = { [key: string]: string | Bundle };

function keys(bundle: Bundle, prefix = ""): string[] {
  return Object.entries(bundle).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : keys(value, `${prefix}${key}.`)
  );
}

function placeholders(bundle: Bundle): Record<string, string[]> {
  const flat: Record<string, string[]> = {};
  const walk = (node: Bundle, prefix: string) => {
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "string") {
        flat[`${prefix}${key}`] = (value.match(/\{\{\w+\}\}|<\w+>/g) ?? []).sort();
      } else {
        walk(value, `${prefix}${key}.`);
      }
    }
  };
  walk(bundle, "");
  return flat;
}

describe.each([
  ["es", es],
  ["fr", fr],
  ["pt", pt],
])("%s translation", (_language, bundle) => {
  it("has exactly the English keys", () => {
    expect(keys(bundle as Bundle).sort()).toEqual(keys(en as Bundle).sort());
  });

  it("keeps every {{placeholder}} and <tag> from English", () => {
    expect(placeholders(bundle as Bundle)).toEqual(placeholders(en as Bundle));
  });
});
